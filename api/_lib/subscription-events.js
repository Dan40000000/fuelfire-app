import crypto from 'crypto';
import { getRequestRawBody } from './request-security.js';

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;
const MAX_EVENT_ID_LENGTH = 200;

function headerValue(req, name) {
    const headers = req?.headers || {};
    const value = headers[name]
        || headers[name.toLowerCase()]
        || Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
        || '';
    if (Array.isArray(value)) return value[0] || '';
    return String(value || '').trim();
}

function getWebhookSecret() {
    return String(process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET || process.env.REVENUECAT_WEBHOOK_SECRET || '').trim();
}

function getToleranceSeconds() {
    const parsed = Number(process.env.FUELFIRE_WEBHOOK_TOLERANCE_SECONDS);
    if (!Number.isFinite(parsed)) return DEFAULT_SIGNATURE_TOLERANCE_SECONDS;
    return Math.min(900, Math.max(30, Math.floor(parsed)));
}

function timingSafeHexEqual(actual, expected) {
    const a = Buffer.from(String(actual || ''), 'hex');
    const b = Buffer.from(String(expected || ''), 'hex');
    return a.length === 32 && b.length === 32 && crypto.timingSafeEqual(a, b);
}

export function verifyRevenueCatWebhookSignature(req, { rawBody } = {}) {
    const secret = getWebhookSecret();
    const header = headerValue(req, 'x-revenuecat-webhook-signature')
        || headerValue(req, 'x-fuelfire-event-signature');
    if (!secret || !header) return { valid: false, reason: 'missing_signature_config' };

    const parts = Object.fromEntries(header.split(',').map((part) => {
        const separator = part.indexOf('=');
        return separator === -1
            ? [part.trim(), '']
            : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }));
    const timestamp = Number(parts.t);
    const supplied = parts.v1;
    if (!Number.isSafeInteger(timestamp) || !supplied || Math.abs(Date.now() / 1000 - timestamp) > getToleranceSeconds()) {
        return { valid: false, reason: 'invalid_signature_timestamp' };
    }

    const payload = getRequestRawBody(req, rawBody);
    if (payload === null) return { valid: false, reason: 'raw_body_unavailable' };
    const expected = crypto.createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
    return timingSafeHexEqual(supplied, expected)
        ? { valid: true, source: 'revenuecat', timestamp }
        : { valid: false, reason: 'invalid_signature' };
}

function normalizeText(value, max = 500) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, max);
}

function normalizeInteger(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function normalizeAuthoritativeSubscriptionEvent(body, { source = 'revenuecat' } = {}) {
    const event = body?.event && typeof body.event === 'object' ? body.event : body;
    if (!event || typeof event !== 'object' || Array.isArray(event)) return null;

    const eventId = normalizeText(event.id || body?.eventId, MAX_EVENT_ID_LENGTH);
    const eventType = normalizeText(event.type || body?.eventType, 80).toUpperCase();
    const appUserId = normalizeText(event.app_user_id || body?.appUserId || body?.rcAppUserId, 255);
    const productId = normalizeText(event.product_id || body?.productId, 255);
    if (!eventId || !eventType || !appUserId || !productId) return null;

    const entitlementIds = Array.isArray(event.entitlement_ids)
        ? event.entitlement_ids.map((id) => normalizeText(id, 120)).filter(Boolean).slice(0, 20)
        : event.entitlement_id ? [normalizeText(event.entitlement_id, 120)] : [];

    return {
        eventId,
        eventType,
        appUserId,
        productId,
        entitlementIds,
        transactionId: normalizeText(event.transaction_id || body?.transactionId, 255) || null,
        originalTransactionId: normalizeText(event.original_transaction_id, 255) || null,
        eventTimestampMs: normalizeInteger(event.event_timestamp_ms || body?.eventTimestampMs),
        expirationAtMs: normalizeInteger(event.expiration_at_ms || body?.expirationAtMs),
        environment: normalizeText(event.environment, 40) || null,
        store: normalizeText(event.store, 40) || null,
        apiVersion: normalizeText(body?.api_version, 40) || null,
        source,
        receivedAt: new Date().toISOString(),
    };
}

export const subscriptionEventConstants = {
    DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
    MAX_EVENT_ID_LENGTH,
};
