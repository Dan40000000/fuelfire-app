const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5';
const DEFAULT_CLAUDE_REVIEW_MODEL = 'claude-opus-5';
const DEFAULT_QWEN_BASE_URL = 'https://router.huggingface.co/v1';
const DEFAULT_QWEN_VISION_MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct';
const DEFAULT_QWEN_TEXT_MODEL = 'Qwen/Qwen3-8B';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 800;
const DEFAULT_TIMEOUT_MS = 60000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanEnv(value) {
    return String(value || '')
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .trim();
}

function normalizeBaseUrl(value, fallback) {
    return (cleanEnv(value) || fallback).replace(/\/+$/, '');
}

function isLocalEndpoint(baseUrl) {
    try {
        const url = new URL(baseUrl);
        return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    } catch {
        return false;
    }
}

function collectText(content) {
    if (typeof content === 'string') return content.trim();
    if (!Array.isArray(content)) return '';
    return content
        .map((part) => {
            if (typeof part === 'string') return part;
            if (typeof part?.text === 'string') return part.text;
            if (typeof part?.content === 'string') return part.content;
            return '';
        })
        .map((part) => part.trim())
        .filter(Boolean)
        .join('\n');
}

function buildQwenUserContent({ prompt, image, mimeType }) {
    if (!image) return prompt;
    return [
        {
            type: 'image_url',
            image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${image}`
            }
        },
        { type: 'text', text: prompt }
    ];
}

function buildClaudeUserContent({ prompt, image, mimeType }) {
    if (!image) return prompt;
    return [
        {
            type: 'image',
            source: {
                type: 'base64',
                media_type: mimeType === 'image/jpg' ? 'image/jpeg' : (mimeType || 'image/jpeg'),
                data: image
            }
        },
        { type: 'text', text: prompt }
    ];
}

function withQwenThinkingSwitch(prompt, config, thinking) {
    if (!/qwen/i.test(`${config.provider} ${config.model}`) || /\/(?:no_)?think\b/i.test(prompt)) return prompt;
    return `${prompt}\n\n${thinking ? '/think' : '/no_think'}`;
}

function isResponseFormatError(status, message) {
    return status === 400 && /response_format|json_object|guided_json|structured output/i.test(message);
}

function requestTimeoutMs() {
    const configured = Number(process.env.FOOD_AI_TIMEOUT_MS);
    if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS;
    return Math.max(5000, Math.min(120000, Math.round(configured)));
}

function getClaudeConfig(modality = 'text', tier = 'primary') {
    const model = tier === 'review'
        ? cleanEnv(process.env.FOOD_AI_CLAUDE_REVIEW_MODEL) || DEFAULT_CLAUDE_REVIEW_MODEL
        : cleanEnv(modality === 'vision'
            ? process.env.FOOD_AI_CLAUDE_VISION_MODEL
            : process.env.FOOD_AI_CLAUDE_TEXT_MODEL) || DEFAULT_CLAUDE_MODEL;
    const apiKey = cleanEnv(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY);
    return {
        provider: 'claude',
        baseUrl: ANTHROPIC_BASE_URL,
        apiKey,
        model,
        tier,
        configured: Boolean(apiKey)
    };
}

function getQwenConfig(modality = 'text') {
    const baseUrl = normalizeBaseUrl(process.env.FOOD_AI_BASE_URL, DEFAULT_QWEN_BASE_URL);
    const apiKey = cleanEnv(process.env.FOOD_AI_API_KEY || process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN);
    const model = modality === 'vision'
        ? cleanEnv(process.env.FOOD_AI_VISION_MODEL) || DEFAULT_QWEN_VISION_MODEL
        : cleanEnv(process.env.FOOD_AI_TEXT_MODEL) || DEFAULT_QWEN_TEXT_MODEL;
    return {
        provider: 'qwen',
        baseUrl,
        apiKey,
        model,
        tier: 'fallback',
        configured: Boolean(apiKey) || isLocalEndpoint(baseUrl)
    };
}

export function getFoodAiConfig(modality = 'text', { tier = 'primary' } = {}) {
    const configuredProvider = cleanEnv(process.env.FOOD_AI_PROVIDER).toLowerCase();
    if (configuredProvider === 'qwen') return getQwenConfig(modality);
    return getClaudeConfig(modality, tier);
}

export function getFoodAiFallbackConfig(modality = 'text') {
    const configuredFallback = cleanEnv(process.env.FOOD_AI_FALLBACK_PROVIDER || 'qwen').toLowerCase();
    return configuredFallback === 'qwen' ? getQwenConfig(modality) : null;
}

export function isFoodAiConfigured(modality = 'text') {
    return getFoodAiConfig(modality).configured || Boolean(getFoodAiFallbackConfig(modality)?.configured);
}

function buildProviderRequest(config, { prompt, image, mimeType, maxTokens, temperature, json, thinking }) {
    if (config.provider === 'claude') {
        return {
            endpoint: `${config.baseUrl}/messages`,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': ANTHROPIC_VERSION
            },
            body: {
                model: config.model,
                max_tokens: maxTokens,
                messages: [{
                    role: 'user',
                    content: buildClaudeUserContent({ prompt, image, mimeType })
                }]
            },
            responseFormatEnabled: false
        };
    }

    const body = {
        model: config.model,
        messages: [{
            role: 'user',
            content: buildQwenUserContent({
                prompt: withQwenThinkingSwitch(prompt, config, thinking),
                image,
                mimeType
            })
        }],
        max_tokens: maxTokens,
        temperature
    };
    if (json) body.response_format = { type: 'json_object' };
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    return {
        endpoint: `${config.baseUrl}/chat/completions`,
        headers,
        body,
        responseFormatEnabled: json
    };
}

function providerError(config, status, statusText, errorText) {
    const error = new Error(`Food AI provider ${status}: ${errorText.slice(0, 500) || statusText}`);
    error.status = status;
    error.providerStatus = status;
    error.provider = config.provider;
    error.providerCode = 'FOOD_AI_HTTP_ERROR';
    error.retryable = [408, 429, 500, 502, 503, 504].includes(status);
    return error;
}

async function callConfiguredProvider(config, options) {
    const request = buildProviderRequest(config, options);
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs());
        try {
            const response = await fetch(request.endpoint, {
                method: 'POST',
                headers: request.headers,
                body: JSON.stringify(request.body),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                if (request.responseFormatEnabled && isResponseFormatError(response.status, errorText)) {
                    delete request.body.response_format;
                    request.responseFormatEnabled = false;
                    continue;
                }

                const error = providerError(config, response.status, response.statusText, errorText);
                if (error.retryable && attempt < MAX_RETRIES) {
                    lastError = error;
                    const retryAfter = Number(response.headers.get('retry-after'));
                    const delay = Number.isFinite(retryAfter) && retryAfter > 0
                        ? Math.min(retryAfter * 1000, 65000)
                        : RETRY_BASE_DELAY_MS * attempt;
                    await sleep(delay);
                    continue;
                }
                throw error;
            }

            const data = await response.json();
            if (config.provider === 'claude' && data?.stop_reason === 'max_tokens') {
                if (attempt < MAX_RETRIES) {
                    request.body.max_tokens = Math.min(8192, Math.max(2400, request.body.max_tokens * 2));
                    continue;
                }
                const error = new Error('Claude response was truncated before the food result completed.');
                error.provider = config.provider;
                error.providerCode = 'FOOD_AI_TRUNCATED';
                error.retryable = false;
                throw error;
            }
            const text = config.provider === 'claude'
                ? collectText(data?.content)
                : collectText(data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text);
            if (!text) throw new Error('Food AI provider response missing text content.');

            return {
                text,
                raw: data,
                metadata: {
                    provider: config.provider,
                    model: config.model,
                    tier: config.tier,
                    stopReason: data?.stop_reason || data?.choices?.[0]?.finish_reason || null,
                    thinkingMode: config.provider === 'claude' ? 'adaptive' : (options.thinking ? 'thinking' : 'non-thinking'),
                    tags: options.tags
                }
            };
        } catch (error) {
            const normalizedError = error?.name === 'AbortError'
                ? Object.assign(new Error(`Food AI provider timed out after ${requestTimeoutMs()}ms.`), {
                    provider: config.provider,
                    providerCode: 'FOOD_AI_TIMEOUT',
                    retryable: true
                })
                : error?.status
                    ? error
                    : Object.assign(error instanceof Error ? error : new Error(String(error)), {
                        provider: config.provider,
                        providerCode: 'FOOD_AI_NETWORK_ERROR',
                        retryable: true
                    });
            lastError = normalizedError;
            if (normalizedError.retryable && attempt < MAX_RETRIES) {
                await sleep(RETRY_BASE_DELAY_MS * attempt);
                continue;
            }
            break;
        } finally {
            clearTimeout(timeout);
        }
    }

    throw lastError || new Error('Food AI provider failed after retries.');
}

function canUseDegradedFallback(error) {
    return error?.providerCode === 'FOOD_AI_TIMEOUT'
        || error?.providerCode === 'FOOD_AI_NETWORK_ERROR'
        || [408, 429, 500, 502, 503, 504].includes(Number(error?.providerStatus || error?.status));
}

export async function callFoodAi({
    prompt,
    image = null,
    mimeType = 'image/jpeg',
    modality = image ? 'vision' : 'text',
    maxTokens = 1200,
    temperature = 0,
    json = true,
    thinking = false,
    tags = [],
    tier = 'primary',
    allowDegradedFallback = true
} = {}) {
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Food AI prompt is required.');
    }

    const options = { prompt, image, mimeType, maxTokens, temperature, json, thinking, tags };
    const primary = getFoodAiConfig(modality, { tier });
    const fallback = primary.provider === 'claude' ? getFoodAiFallbackConfig(modality) : null;

    if (!primary.configured) {
        if (!allowDegradedFallback || !fallback?.configured) {
            throw new Error('Food AI provider is not configured.');
        }
        const result = await callConfiguredProvider(fallback, options);
        return {
            ...result,
            metadata: {
                ...result.metadata,
                degraded: true,
                primaryProvider: primary.provider,
                fallbackReason: 'PRIMARY_NOT_CONFIGURED'
            }
        };
    }

    try {
        return await callConfiguredProvider(primary, options);
    } catch (error) {
        if (!allowDegradedFallback || !fallback?.configured || !canUseDegradedFallback(error)) throw error;
        const result = await callConfiguredProvider(fallback, options);
        return {
            ...result,
            metadata: {
                ...result.metadata,
                degraded: true,
                primaryProvider: primary.provider,
                fallbackReason: error.providerCode || `HTTP_${error.providerStatus || error.status || 'UNKNOWN'}`
            }
        };
    }
}

export const foodAiConstants = {
    ANTHROPIC_BASE_URL,
    ANTHROPIC_VERSION,
    DEFAULT_CLAUDE_MODEL,
    DEFAULT_CLAUDE_REVIEW_MODEL,
    DEFAULT_QWEN_BASE_URL,
    DEFAULT_QWEN_VISION_MODEL,
    DEFAULT_QWEN_TEXT_MODEL,
    MAX_RETRIES,
    DEFAULT_TIMEOUT_MS
};
