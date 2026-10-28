import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isInternalAuthorized, requireAdmin } from './_lib/security.js';
import { requireBodyLimit, getRequestBody } from './_lib/request-security.js';
import { getRedisConfig, redisCommand } from './_lib/redis-rest.js';
import {
    normalizeAuthoritativeSubscriptionEvent,
    verifyRevenueCatWebhookSignature,
} from './_lib/subscription-events.js';

const MAX_EVENTS = 500;
const LEDGER_PREFIX = 'fuelfire:subscriptions:v1';

const APPEND_EVENT_SCRIPT = `
local event_id_key = KEYS[2]
if redis.call('EXISTS', event_id_key) == 1 then return 0 end
redis.call('SET', event_id_key, '1')
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('LTRIM', KEYS[1], 0, tonumber(ARGV[2]) - 1)
return 1
`.trim();

function isProductionRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function isExplicitLocalMode() {
    return !isProductionRuntime()
        && (process.env.FUELFIRE_SUBSCRIPTION_LEDGER_MODE === 'local'
            || (process.env.NODE_ENV === 'test' && Boolean(process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH)));
}

function getLedgerBackend() {
    if (isExplicitLocalMode()) return { kind: 'local' };

    const redis = getRedisConfig();
    if (redis.url && redis.token) return { kind: 'redis', redis };

    return null;
}

function getDataFile() {
    return process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH
        || path.join(process.cwd(), 'api', 'data', 'subscriptions.json');
}

function ensureLocalStore() {
    const dataDir = path.dirname(getDataFile());
    const dataFile = getDataFile();
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]', 'utf-8');
}

function readLocalEvents() {
    ensureLocalStore();
    const raw = fs.readFileSync(getDataFile(), 'utf-8');
    const events = JSON.parse(raw || '[]');
    if (!Array.isArray(events)) throw new Error('Subscription ledger is not an event list.');
    return events;
}

function writeLocalEvents(events) {
    ensureLocalStore();
    const dataFile = getDataFile();
    const temporaryFile = `${dataFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(events, null, 2), 'utf-8');
    fs.renameSync(temporaryFile, dataFile);
}

function ledgerKeys(eventId) {
    const eventHash = crypto.createHash('sha256').update(eventId).digest('hex');
    return {
        events: `${LEDGER_PREFIX}:events`,
        eventId: `${LEDGER_PREFIX}:event:${eventHash}`,
    };
}

async function appendRedisEvent(backend, event) {
    const keys = ledgerKeys(event.eventId);
    const result = await redisCommand({
        config: backend.redis,
        command: [
            'EVAL',
            APPEND_EVENT_SCRIPT,
            '2',
            keys.events,
            keys.eventId,
            JSON.stringify(event),
            String(MAX_EVENTS),
        ],
    });
    if (result === 1 || result === '1') return { duplicate: false };
    if (result === 0 || result === '0') return { duplicate: true };
    throw new Error('Subscription ledger returned an invalid append result.');
}

async function readRedisEvents(backend) {
    const keys = ledgerKeys('latest');
    const result = await redisCommand({
        config: backend.redis,
        command: ['LRANGE', keys.events, '0', String(MAX_EVENTS - 1)],
    });
    if (!Array.isArray(result)) throw new Error('Subscription ledger returned an invalid event list.');
    return result.map((value) => {
        const event = typeof value === 'string' ? JSON.parse(value) : value;
        if (!event || typeof event !== 'object' || Array.isArray(event)) {
            throw new Error('Subscription ledger returned an invalid event.');
        }
        return event;
    });
}

async function readEvents(backend) {
    return backend.kind === 'redis' ? readRedisEvents(backend) : readLocalEvents();
}

async function appendEvent(backend, event) {
    if (backend.kind === 'redis') return appendRedisEvent(backend, event);

    const events = readLocalEvents();
    if (events.some((existing) => existing.eventId === event.eventId)) return { duplicate: true };
    events.unshift(event);
    writeLocalEvents(events.slice(0, MAX_EVENTS));
    return { duplicate: false };
}

function ledgerUnavailable(res) {
    return res.status(503).json({
        success: false,
        error: 'Subscription ledger unavailable.',
        code: 'SUBSCRIPTION_LEDGER_UNAVAILABLE',
    });
}

function administratorSummary(events) {
    const userMap = {};
    events.forEach((evt) => {
        const appUserId = evt.appUserId || 'unknown';
        if (!userMap[appUserId]) {
            userMap[appUserId] = {
                appUserId,
                latestEventType: evt.eventType,
                productId: evt.productId,
                entitlementIds: evt.entitlementIds || [],
                expiresAtMs: evt.expirationAtMs || null,
                updatedAt: evt.receivedAt,
            };
        }
    });
    return Object.values(userMap);
}

export default async function handler(req, res) {
    const method = req.method || req?.httpMethod;

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Fuelfire-Admin-Token, X-Fuelfire-Internal-Token, X-RevenueCat-Webhook-Signature');
        return res.status(200).end();
    }

    if (method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const backend = getLedgerBackend();
        if (!backend) return ledgerUnavailable(res);
        try {
            const events = await readEvents(backend);
            return res.status(200).json({ events, users: administratorSummary(events) });
        } catch (error) {
            console.error('Subscription ledger read failed:', error.message);
            return ledgerUnavailable(res);
        }
    }

    if (method === 'POST') {
        if (!requireBodyLimit(req, res, 128 * 1024)) return;
        const body = getRequestBody(req);
        if (!body) {
            return res.status(400).json({ error: 'A JSON object body is required.', code: 'INVALID_JSON_BODY' });
        }

        const signature = verifyRevenueCatWebhookSignature(req);
        const internal = isInternalAuthorized(req);
        if (!signature.valid && !internal) {
            return res.status(401).json({
                success: false,
                error: 'A verified subscription event is required.',
                code: 'SUBSCRIPTION_EVENT_UNAUTHORIZED',
            });
        }

        const event = normalizeAuthoritativeSubscriptionEvent(body, {
            source: internal && !signature.valid ? 'internal' : signature.source,
        });
        if (!event) {
            return res.status(400).json({
                success: false,
                error: 'Invalid authoritative subscription event.',
                code: 'INVALID_SUBSCRIPTION_EVENT',
            });
        }

        const backend = getLedgerBackend();
        if (!backend) return ledgerUnavailable(res);
        try {
            const result = await appendEvent(backend, event);
            return res.status(200).json({ success: true, duplicate: result.duplicate });
        } catch (error) {
            console.error('Subscription ledger write failed:', error.message);
            return ledgerUnavailable(res);
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
