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

function rawBodyToBuffer(value) {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string') return Buffer.from(value, 'utf8');
    if (value instanceof Uint8Array) return Buffer.from(value);
    return null;
}

function rawBodyToText(value) {
    const buffer = rawBodyToBuffer(value);
    return buffer ? buffer.toString('utf8') : null;
}

export async function captureRequestRawBody(req, { maxBytes = DEFAULT_BODY_LIMIT_BYTES } = {}) {
    const limit = Number.isFinite(Number(maxBytes)) ? Math.max(1, Number(maxBytes)) : DEFAULT_BODY_LIMIT_BYTES;
    const suppliedRawBody = rawBodyToBuffer(req?.rawBody) || rawBodyToBuffer(req?.body);
    if (suppliedRawBody) {
        if (suppliedRawBody.length > limit) {
            return { ok: false, reason: 'body_too_large', bytes: suppliedRawBody.length, maxBytes: limit };
        }
        return { ok: true, rawBody: suppliedRawBody.toString('utf8'), source: 'provided' };
    }

    if (typeof req?.text === 'function') {
        try {
            const rawBody = await req.text();
            const buffer = rawBodyToBuffer(rawBody);
            if (!buffer) return { ok: false, reason: 'raw_body_unavailable' };
            if (buffer.length > limit) {
                return { ok: false, reason: 'body_too_large', bytes: buffer.length, maxBytes: limit };
            }
            return { ok: true, rawBody: buffer.toString('utf8'), source: 'request_text' };
        } catch {
            return { ok: false, reason: 'raw_body_unavailable' };
        }
    }

    if (!req || typeof req[Symbol.asyncIterator] !== 'function') {
        return { ok: false, reason: 'raw_body_unavailable' };
    }

    const chunks = [];
    let bytes = 0;
    try {
        for await (const chunk of req) {
            const buffer = rawBodyToBuffer(chunk);
            if (!buffer) return { ok: false, reason: 'raw_body_unavailable' };
            bytes += buffer.length;
            if (bytes > limit) {
                return { ok: false, reason: 'body_too_large', bytes, maxBytes: limit };
            }
            chunks.push(buffer);
        }
    } catch {
        return { ok: false, reason: 'raw_body_unavailable' };
    }

    return { ok: true, rawBody: Buffer.concat(chunks).toString('utf8'), source: 'request_stream' };
}

export function getRequestBody(req, rawBody) {
    if (rawBody !== undefined) {
        try {
            const parsed = JSON.parse(String(rawBody));
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }

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

export function getRequestRawBody(req, rawBodyOverride) {
    if (rawBodyOverride !== undefined) return rawBodyToText(rawBodyOverride);
    return rawBodyToText(req?.rawBody) ?? rawBodyToText(req?.body);
}

export function isValidString(value, { min = 1, max = 1000 } = {}) {
    return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

export const requestSecurityConstants = {
    DEFAULT_BODY_LIMIT_BYTES,
};
