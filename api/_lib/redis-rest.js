const REDIS_TIMEOUT_MS = 2500;

export function getRedisConfig() {
    const url = String(process.env.FUELFIRE_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim();
    const token = String(process.env.FUELFIRE_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    return { url: url.replace(/\/$/, ''), token };
}

export function parseRedisResult(payload) {
    if (Array.isArray(payload)) return payload[0]?.result;
    return payload?.result;
}

export async function redisCommand({ config = getRedisConfig(), command } = {}) {
    if (!config.url || !config.token) {
        throw new Error('Durable Redis is not configured.');
    }
    if (!Array.isArray(command) || command.length === 0) {
        throw new TypeError('A Redis command is required.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
    try {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Redis REST returned ${response.status}`);
        return parseRedisResult(await response.json());
    } finally {
        clearTimeout(timeout);
    }
}

export const redisConstants = { REDIS_TIMEOUT_MS };
