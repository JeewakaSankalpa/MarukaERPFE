const { test: base, expect } = require('@playwright/test');
const { classifyAuditRequest, validateAuditEnvironment } = require('./environment');

const test = base.extend({
    auditPage: async ({ page }, use, testInfo) => {
        const target = validateAuditEnvironment();
        const mutationAttempts = [];
        const unexpectedApiTargets = [];
        const pageErrors = [];
        const consoleErrors = [];
        const failedRequests = [];

        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('requestfailed', (request) => {
            failedRequests.push({ url: redactUrl(request.url()), error: request.failure()?.errorText || 'unknown' });
        });

        await page.routeWebSocket(/.*/, (socket) => socket.close());

        await page.route('**/*', async (route) => {
            const request = route.request();
            const method = request.method().toUpperCase();
            const url = new URL(request.url());
            const resourceType = request.resourceType();
            const decision = classifyAuditRequest({ method, resourceType, url }, target);
            if (decision.reason === 'mutation') {
                mutationAttempts.push({ method, url: redactUrl(url.toString()) });
                return route.abort('blockedbyclient');
            }
            if (['unexpected-api-origin', 'known-production-host'].includes(decision.reason)) {
                unexpectedApiTargets.push({ resourceType, url: redactUrl(url.toString()) });
                return route.abort('blockedbyclient');
            }
            if (!decision.allowed) return route.abort('blockedbyclient');
            return route.continue();
        });

        await use(page);

        await testInfo.attach('audit-diagnostics', {
            body: JSON.stringify({ mutationAttempts, unexpectedApiTargets, pageErrors, consoleErrors, failedRequests }, null, 2),
            contentType: 'application/json',
        });
        expect(mutationAttempts, 'Read-only audit attempted a mutating request').toEqual([]);
        expect(unexpectedApiTargets, 'Frontend contacted an API origin other than the validated target').toEqual([]);
        expect(pageErrors, 'Uncaught page errors').toEqual([]);
        const actionableConsoleErrors = consoleErrors.filter((message) => !message.includes('Permissions policy violation: unload is not allowed'));
        expect(actionableConsoleErrors, 'Browser console errors').toEqual([]);
        expect(failedRequests, 'Failed browser requests').toEqual([]);
    },
});

function redactUrl(raw) {
    try {
        const url = new URL(raw);
        url.username = '';
        url.password = '';
        url.search = '';
        url.hash = '';
        return url.toString();
    } catch {
        return '<invalid-url>';
    }
}

module.exports = { test, expect };
