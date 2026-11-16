const { sanitizedUrl, validateAuditEnvironment } = require('./environment');

module.exports = async function globalSetup() {
    const target = validateAuditEnvironment();
    console.log(`[audit] frontend=${sanitizedUrl(target.baseURL)}`);
    console.log(`[audit] api=${sanitizedUrl(target.apiURL)}`);
    console.log(`[audit] environment=${target.environment} mode=${target.mode}`);
};
