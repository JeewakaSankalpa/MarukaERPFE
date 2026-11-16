const DENIED_HOSTS = new Set(['marukaerpfe.onrender.com', '140.245.121.162']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

module.exports = async function mutationSafetySetup() {
    const frontend = parseRequired('MARUKA_WORKFLOW_BASE_URL');
    const api = parseRequired('MARUKA_WORKFLOW_API_URL');

    if (process.env.MARUKA_WORKFLOW_ENVIRONMENT !== 'isolated') {
        throw new Error('Legacy mutation tests require MARUKA_WORKFLOW_ENVIRONMENT=isolated.');
    }
    if (process.env.MARUKA_WORKFLOW_ALLOW_MUTATION !== 'YES_I_ACCEPT_TEST_DATA_MUTATION') {
        throw new Error('Legacy mutation tests require explicit MARUKA_WORKFLOW_ALLOW_MUTATION confirmation.');
    }
    if (process.env.MARUKA_WORKFLOW_CONFIRM_ISOLATED_DATA !== 'YES_I_VERIFIED_THE_DATABASE_IS_ISOLATED') {
        throw new Error('Loopback is not proof of safe data. Confirm the backend database is isolated.');
    }
    for (const target of [frontend, api]) {
        if (DENIED_HOSTS.has(target.hostname.toLowerCase())) throw new Error('Known production target is denied.');
    }
    if (!LOOPBACK_HOSTS.has(frontend.hostname.toLowerCase()) || !LOOPBACK_HOSTS.has(api.hostname.toLowerCase())) {
        throw new Error('Legacy mutation tests are restricted to explicitly verified loopback targets.');
    }
    if (api.origin !== 'http://localhost:8080' && api.origin !== 'http://127.0.0.1:8080') {
        throw new Error('Legacy specs hard-code localhost:8080 and cannot safely target a different API.');
    }
};

function parseRequired(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required before legacy mutation tests can run.`);
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL.`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error(`${name} must be an http(s) URL without embedded credentials.`);
    }
    return parsed;
}
