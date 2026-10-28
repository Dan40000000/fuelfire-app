import crypto from 'crypto';

const DEFAULT_WINDOW_SECONDS = 60 * 60;
const DEFAULT_SUBJECT_LIMIT = 20;
const DEFAULT_IP_LIMIT = 60;
const MAX_WINDOW_SECONDS = 24 * 60 * 60;
const MAX_LIMIT = 1000;
const REDIS_TIMEOUT_MS = 2500;

let testStore = null;
const localStore = new Map();

function isProductionRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function isTokenGatedTestRuntime(allowMemory) {
    return allowMemory
        && !isProductionRuntime()
        && process.env.NODE_ENV === 'test'
        && Boolean(process.env.FUELFIRE_AI_TEST_TOKEN);
}

function boundedInteger(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

function getRedisConfig() {
    const url = String(process.env.FUELFIRE_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim();
    const token = String(process.env.FUELFIRE_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    return { url: url.replace(/\/$/, ''), token };
}

function getQuotaConfig({ allowMemory = false } = {}) {
    const redis = getRedisConfig();
    const testDefaults = isTokenGatedTestRuntime(allowMemory);
    return {
        redis,
        configured: Boolean(testStore || (redis.url && redis.token) || testDefaults),
        windowSeconds: boundedInteger(process.env.FUELFIRE_QUOTA_WINDOW_SECONDS, testDefaults ? 60 : DEFAULT_WINDOW_SECONDS, 60, MAX_WINDOW_SECONDS),
        subjectLimit: boundedInteger(process.env.FUELFIRE_QUOTA_SUBJECT_LIMIT, testDefaults ? MAX_LIMIT : DEFAULT_SUBJECT_LIMIT, 1, MAX_LIMIT),
        ipLimit: boundedInteger(process.env.FUELFIRE_QUOTA_IP_LIMIT, testDefaults ? MAX_LIMIT : DEFAULT_IP_LIMIT, 1, MAX_LIMIT),
        prefix: String(process.env.FUELFIRE_QUOTA_PREFIX || 'fuelfire:quota:v1').trim() || 'fuelfire:quota:v1',
    };
}

function digest(value) {
    return crypto.createHash('sha256').update(String(value || 'unknown')).digest('hex');
}

function quotaKeys(subject, ip, prefix) {
    return {
        subject: `${prefix}:subject:${digest(subject)}`,
        ip: `${prefix}:ip:${digest(ip)}`,
    };
}

function redisScript() {
    return `
local window_start = ARGV[1]
local cost = tonumber(ARGV[2])
local subject_limit = tonumber(ARGV[3])
local ip_limit = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local function current_count(key, limit)
  local raw = redis.call('GET', key)
  if cost > limit then return -1 end
  if not raw then return 0 end
  local separator = string.find(raw, ':')
  if not separator then return 0 end
  if string.sub(raw, 1, separator - 1) ~= window_start then return 0 end
  local count = tonumber(string.sub(raw, separator + 1)) or 0
  if count + cost > limit then return -1 end
  return count
end

local subject_count = current_count(KEYS[1], subject_limit)
local ip_count = current_count(KEYS[2], ip_limit)
if subject_count < 0 or ip_count < 0 then return 0 end

redis.call('SET', KEYS[1], window_start .. ':' .. (subject_count + cost), 'EX', ttl)
redis.call('SET', KEYS[2], window_start .. ':' .. (ip_count + cost), 'EX', ttl)
return 1
`.trim();
}

function parseRedisResult(payload) {
    if (Array.isArray(payload)) return payload[0]?.result;
    return payload?.result;
}

async function consumeRedis({ config, keys, windowStart, cost }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
    try {
        const response = await fetch(config.redis.url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.redis.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                'EVAL',
                redisScript(),
                '2',
                keys.subject,
                keys.ip,
                String(windowStart),
                String(cost),
                String(config.subjectLimit),
                String(config.ipLimit),
                String(config.windowSeconds + 1),
            ]),
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Quota store returned ${response.status}`);
        const result = parseRedisResult(await response.json());
        if (result === 1 || result === '1') return { allowed: true, store: 'redis' };
        if (result === 0 || result === '0') return { allowed: false, reason: 'quota_exceeded', store: 'redis' };
        throw new Error('Quota store returned an invalid result');
    } finally {
        clearTimeout(timeout);
    }
}

function consumeLocal({ config, keys, windowStart, cost }) {
    const records = [
        [keys.subject, config.subjectLimit],
        [keys.ip, config.ipLimit],
    ];
    const current = records.map(([key]) => {
        const value = localStore.get(key);
        return value?.windowStart === windowStart ? value.count : 0;
    });
    if (current.some((count, index) => count + cost > records[index][1])) {
        return { allowed: false, reason: 'quota_exceeded', store: 'memory' };
    }
    records.forEach(([key], index) => {
        localStore.set(key, { windowStart, count: current[index] + cost });
    });
    return { allowed: true, store: 'memory' };
}

export function setQuotaStoreForTests(store) {
    testStore = store || null;
}

export function resetQuotaStoreForTests() {
    testStore = null;
    localStore.clear();
}

export function getQuotaSettings({ allowMemory = false } = {}) {
    const config = getQuotaConfig({ allowMemory });
    return {
        configured: config.configured,
        durable: Boolean(config.redis.url && config.redis.token),
        windowSeconds: config.windowSeconds,
        subjectLimit: config.subjectLimit,
        ipLimit: config.ipLimit,
    };
}

export async function consumeQuota({ subject, ip, cost = 1, allowMemory = false } = {}) {
    const config = getQuotaConfig({ allowMemory });
    if (!config.configured || (!testStore && !config.redis.url && isProductionRuntime())) {
        return { allowed: false, reason: 'quota_store_unconfigured', configured: false };
    }

    const normalizedCost = boundedInteger(cost, 1, 1, MAX_LIMIT);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(nowSeconds / config.windowSeconds) * config.windowSeconds;
    const keys = quotaKeys(subject || 'anonymous', ip || 'unknown', config.prefix);

    try {
        if (testStore && typeof testStore.consume === 'function') {
            return await testStore.consume({ keys, windowStart, cost: normalizedCost, config });
        }
        if (config.redis.url && config.redis.token) {
            return await consumeRedis({ config, keys, windowStart, cost: normalizedCost });
        }
        return consumeLocal({ config, keys, windowStart, cost: normalizedCost });
    } catch (error) {
        console.error('[fuelfire-quota-store-error]', error.message);
        return { allowed: false, reason: 'quota_store_unavailable', configured: config.configured };
    }
}

export const quotaConstants = {
    DEFAULT_WINDOW_SECONDS,
    DEFAULT_SUBJECT_LIMIT,
    DEFAULT_IP_LIMIT,
    MAX_WINDOW_SECONDS,
    MAX_LIMIT,
};
