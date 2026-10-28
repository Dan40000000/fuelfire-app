import crypto from 'crypto';

const SESSION_DOMAIN = 'fuelfire:installation-session:v1';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_TTL_SECONDS = 60 * 60 * 24 * 30;
const MIN_TTL_SECONDS = 5 * 60;

function base64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function fromBase64url(input) {
    const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
    return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function timingSafeEqualString(actual, expected) {
    const a = Buffer.from(String(actual || ''));
    const b = Buffer.from(String(expected || ''));
    if (!a.length || !b.length || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

function getSessionSecret() {
    return String(process.env.FUELFIRE_INSTALLATION_SESSION_SECRET || process.env.AI_ACCESS_TOKEN_SECRET || '').trim();
}

function getTtlSeconds() {
    const parsed = Number(process.env.FUELFIRE_INSTALLATION_SESSION_TTL_SECONDS);
    if (!Number.isFinite(parsed)) return DEFAULT_TTL_SECONDS;
    return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Math.floor(parsed)));
}

function sign(encoded, secret) {
    return crypto.createHmac('sha256', secret)
        .update(`${SESSION_DOMAIN}.${encoded}`)
        .digest('base64url');
}

function generateRevenueCatAppUserId() {
    return `fuelfire_${crypto.randomBytes(24).toString('hex')}`;
}

function issueInstallationSession({ now = Date.now(), rcAppUserId = generateRevenueCatAppUserId() } = {}) {
    if (!/^fuelfire_[a-f0-9]{48}$/.test(rcAppUserId)) {
        throw new Error('Installation sessions must use a server-generated RevenueCat app user ID.');
    }

    const nowSeconds = Math.floor(now / 1000);
    const payload = {
        iss: 'fuelfire',
        aud: 'fuelfire-installation',
        scope: 'revenuecat:binding',
        iat: nowSeconds,
        exp: nowSeconds + getTtlSeconds(),
        jti: crypto.randomBytes(16).toString('hex'),
        rcAppUserId,
    };
    const encoded = base64url(JSON.stringify(payload));
    return {
        token: `${encoded}.${sign(encoded, getSessionSecret())}`,
        rcAppUserId: payload.rcAppUserId,
        expiresAt: payload.exp * 1000,
        payload,
    };
}

export function getInstallationSessionSecretConfigured() {
    return Boolean(getSessionSecret());
}

export function createInstallationSession({ now = Date.now() } = {}) {
    const secret = getSessionSecret();
    if (!secret) {
        throw new Error('FUELFIRE_INSTALLATION_SESSION_SECRET or AI_ACCESS_TOKEN_SECRET must be configured.');
    }
    return issueInstallationSession({ now });
}

export function verifyInstallationSession(token, { now = Date.now() } = {}) {
    const secret = getSessionSecret();
    if (!secret || typeof token !== 'string' || token.length > 4096) return null;

    const [encoded, suppliedSignature, ...extra] = token.split('.');
    if (!encoded || !suppliedSignature || extra.length) return null;
    const expectedSignature = sign(encoded, secret);
    if (!timingSafeEqualString(suppliedSignature, expectedSignature)) return null;

    try {
        const payload = JSON.parse(fromBase64url(encoded));
        const nowSeconds = Math.floor(now / 1000);
        if (payload.iss !== 'fuelfire'
            || payload.aud !== 'fuelfire-installation'
            || payload.scope !== 'revenuecat:binding'
            || !Number.isSafeInteger(payload.iat)
            || !Number.isSafeInteger(payload.exp)
            || payload.exp <= nowSeconds
            || payload.iat > nowSeconds + 60
            || !/^fuelfire_[a-f0-9]{48}$/.test(payload.rcAppUserId)
            || !/^[a-f0-9]{32}$/.test(payload.jti || '')) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export function getInstallationSessionToken(req) {
    const headers = req?.headers || {};
    const read = (name) => headers[name]
        || headers[name.toLowerCase()]
        || Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
        || '';
    const auth = String(Array.isArray(read('authorization')) ? read('authorization')[0] : read('authorization') || '').trim();
    const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    return String(read('x-fuelfire-installation-session') || bearer || req?.body?.installationSessionToken || '').trim();
}

export function resumeInstallationSession(token) {
    return renewInstallationSession(token);
}

export function renewInstallationSession(token, { now = Date.now() } = {}) {
    const payload = verifyInstallationSession(token, { now });
    if (!payload) return null;
    return issueInstallationSession({ now, rcAppUserId: payload.rcAppUserId });
}

export const installationSessionConstants = {
    SESSION_DOMAIN,
    DEFAULT_TTL_SECONDS,
    MAX_TTL_SECONDS,
    MIN_TTL_SECONDS,
};
