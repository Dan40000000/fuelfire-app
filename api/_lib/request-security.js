const DEFAULT_BODY_LIMIT_BYTES = 256 * 1024;

function headerValue(req, name) {
    const headers = req?.headers || {};
    const value = headers[name]
        || headers[name.toLowerCase()]
        || Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
        || '';
    if (Array.isArray(value)) return value[0] || '';
    return String(value || '').trim();
}

function bodyByteLength(body) {
    if (body === undefined || body === null) return 0;
    if (Buffer.isBuffer(body)) return body.length;
    if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
    try {
        return Buffer.byteLength(JSON.stringify(body), 'utf8');
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

export function getRequestBodyBytes(req) {
    const rawBody = req?.rawBody;
    if (Buffer.isBuffer(rawBody)) return rawBody.length;
    if (typeof rawBody === 'string') return Buffer.byteLength(rawBody, 'utf8');
    return bodyByteLength(req?.body);
}

export function requireBodyLimit(req, res, maxBytes = DEFAULT_BODY_LIMIT_BYTES) {
    const limit = Number.isFinite(Number(maxBytes)) ? Math.max(1, Number(maxBytes)) : DEFAULT_BODY_LIMIT_BYTES;
    const contentLength = Number(headerValue(req, 'content-length'));
    const bodyBytes = getRequestBodyBytes(req);
    if ((Number.isFinite(contentLength) && contentLength > limit) || bodyBytes > limit) {
        res.status(413).json({
            success: false,
            error: 'Request body is too large.',
            code: 'REQUEST_BODY_TOO_LARGE',
            maxBytes: limit,
        });
        return false;
    }
    return true;
}

export function getRequestBody(req) {
    const body = req?.body;
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

export function requireObjectBody(req, res, maxBytes = DEFAULT_BODY_LIMIT_BYTES) {
    if (!requireBodyLimit(req, res, maxBytes)) return null;
    const body = getRequestBody(req);
    if (!body) {
        res.status(400).json({ success: false, error: 'A JSON object body is required.', code: 'INVALID_JSON_BODY' });
        return null;
    }
    return body;
}

export function getClientIp(req) {
    const direct = req?.socket?.remoteAddress || 'unknown';
    const explicitTrust = String(process.env.FUELFIRE_TRUST_PROXY || '').trim().toLowerCase();
    const trustForwarded = process.env.VERCEL === '1'
        || ['1', 'true', 'yes', 'on'].includes(explicitTrust);
    if (!trustForwarded) return String(direct).length <= 128 ? String(direct) : 'unknown';

    // Vercel documents that it overwrites X-Forwarded-For to prevent spoofing.
    // Other deployments must opt in only when their front proxy is trusted.
    const forwarded = headerValue(req, 'x-forwarded-for').split(',')[0].trim();
    const candidate = forwarded || headerValue(req, 'x-real-ip') || direct;
    return candidate.length <= 128 ? candidate : 'unknown';
}

export function getRequestRawBody(req) {
    if (Buffer.isBuffer(req?.rawBody)) return req.rawBody.toString('utf8');
    if (typeof req?.rawBody === 'string') return req.rawBody;
    try {
        return JSON.stringify(req?.body ?? {});
    } catch {
        return '';
    }
}

export function isValidString(value, { min = 1, max = 1000 } = {}) {
    return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

export const requestSecurityConstants = {
    DEFAULT_BODY_LIMIT_BYTES,
};
