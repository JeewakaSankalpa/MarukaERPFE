const assert = require('node:assert/strict');
const test = require('node:test');
const { classifyAuditRequest, validateAuditEnvironment } = require('./environment');

const safeEnv = {
    MARUKA_AUDIT_BASE_URL: 'http://localhost:3000',
    MARUKA_AUDIT_API_URL: 'http://localhost:8080/api',
    MARUKA_AUDIT_ENVIRONMENT: 'isolated',
    MARUKA_AUDIT_MODE: 'read-only',
    MARUKA_AUDIT_CONFIRM_NON_PRODUCTION: 'YES_I_CONFIRMED_NON_PRODUCTION',
};

test('rejects missing environment', () => {
    assert.throws(() => validateAuditEnvironment({}), /MARUKA_AUDIT_BASE_URL is required/);
});

test('rejects known production host including trailing-dot form', () => {
    assert.throws(() => validateAuditEnvironment({ ...safeEnv, MARUKA_AUDIT_API_URL: 'http://marukaerpfe.onrender.com.:8080/api' }), /Known production target/);
});

test('accepts an explicitly confirmed isolated target', () => {
    assert.equal(validateAuditEnvironment(safeEnv).mode, 'read-only');
});

test('blocks every mutating method', () => {
    const target = validateAuditEnvironment(safeEnv);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        assert.equal(classifyAuditRequest({ method, resourceType: 'fetch', url: 'http://localhost:8080/api/items' }, target).reason, 'mutation');
    }
});

test('blocks traffic to an undeclared API origin', () => {
    const target = validateAuditEnvironment(safeEnv);
    assert.equal(classifyAuditRequest({ method: 'GET', resourceType: 'xhr', url: 'https://example.com/api/items' }, target).reason, 'unexpected-api-origin');
});

test('allows read-only traffic to the validated API origin', () => {
    const target = validateAuditEnvironment(safeEnv);
    assert.equal(classifyAuditRequest({ method: 'GET', resourceType: 'fetch', url: 'http://localhost:8080/api/items' }, target).allowed, true);
});
