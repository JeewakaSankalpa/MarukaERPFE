const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DENIED_HOSTS = new Set(['marukaerpfe.onrender.com', '140.245.121.162']);
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseUrl(name, value) {
    if (!value) throw new Error(`${name} is required.`);
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(`${name} must be a valid http(s) URL.`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`${name} must use http or https.`);
    }
    if (parsed.username || parsed.password) {
        throw new Error(`${name} must not contain credentials.`);
    }
    return parsed;
}

function sanitizedUrl(url) {
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
}

function validateAuditEnvironment(env = process.env) {
    const baseURL = parseUrl('MARUKA_AUDIT_BASE_URL', env.MARUKA_AUDIT_BASE_URL);
    const apiURL = parseUrl('MARUKA_AUDIT_API_URL', env.MARUKA_AUDIT_API_URL);
    const environment = env.MARUKA_AUDIT_ENVIRONMENT;
    const mode = env.MARUKA_AUDIT_MODE;

    if (!['isolated', 'staging'].includes(environment)) {
        throw new Error('MARUKA_AUDIT_ENVIRONMENT must be isolated or staging; production is never accepted.');
    }
    if (mode !== 'read-only') {
        throw new Error('MARUKA_AUDIT_MODE must be read-only for this configuration.');
    }
    if (env.MARUKA_AUDIT_CONFIRM_NON_PRODUCTION !== 'YES_I_CONFIRMED_NON_PRODUCTION') {
        throw new Error('Set MARUKA_AUDIT_CONFIRM_NON_PRODUCTION=YES_I_CONFIRMED_NON_PRODUCTION after verifying both targets.');
    }
    for (const url of [baseURL, apiURL]) {
        if (DENIED_HOSTS.has(normalizeHostname(url.hostname))) {
            throw new Error(`Known production target is denied: ${sanitizedUrl(url)}`);
        }
    }
    if (!LOOPBACK_HOSTS.has(normalizeHostname(apiURL.hostname)) && env.MARUKA_AUDIT_ALLOW_REMOTE_READ_ONLY !== 'YES') {
        throw new Error('A remote API requires MARUKA_AUDIT_ALLOW_REMOTE_READ_ONLY=YES and must still be non-production.');
    }

    return { baseURL, apiURL, environment, mode };
}

function classifyAuditRequest({ method, resourceType, url }, target) {
    const parsed = url instanceof URL ? url : new URL(url);
    if (MUTATING_METHODS.has(method.toUpperCase())) return { allowed: false, reason: 'mutation' };
    if (DENIED_HOSTS.has(normalizeHostname(parsed.hostname))) return { allowed: false, reason: 'known-production-host' };
    if (['fetch', 'xhr'].includes(resourceType) && ![target.baseURL.origin, target.apiURL.origin].includes(parsed.origin)) {
        return { allowed: false, reason: 'unexpected-api-origin' };
    }
    if (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') return { allowed: false, reason: 'websocket' };
    return { allowed: true, reason: null };
}

function normalizeHostname(hostname) {
    return hostname.toLowerCase().replace(/\.$/, '');
}

module.exports = { MUTATING_METHODS, classifyAuditRequest, sanitizedUrl, validateAuditEnvironment };
