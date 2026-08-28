const DEFAULT_BASE_URL = 'https://router.huggingface.co/v1';
const DEFAULT_VISION_MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct';
const DEFAULT_TEXT_MODEL = 'Qwen/Qwen3-8B';
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

function normalizeBaseUrl(value) {
    const configured = cleanEnv(value) || DEFAULT_BASE_URL;
    return configured.replace(/\/+$/, '');
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

function buildUserContent({ prompt, image, mimeType }) {
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

function withQwenThinkingSwitch(prompt, config, thinking) {
    const isQwen = /qwen/i.test(`${config.provider} ${config.model}`);
    if (!isQwen || /\/(?:no_)?think\b/i.test(prompt)) return prompt;
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

export function getFoodAiConfig(modality = 'text') {
    const baseUrl = normalizeBaseUrl(process.env.FOOD_AI_BASE_URL);
    const apiKey = cleanEnv(process.env.FOOD_AI_API_KEY || process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN);
    const model = modality === 'vision'
        ? cleanEnv(process.env.FOOD_AI_VISION_MODEL) || DEFAULT_VISION_MODEL
        : cleanEnv(process.env.FOOD_AI_TEXT_MODEL) || DEFAULT_TEXT_MODEL;

    return {
        provider: cleanEnv(process.env.FOOD_AI_PROVIDER) || 'qwen',
        baseUrl,
        apiKey,
        model,
        configured: Boolean(apiKey) || isLocalEndpoint(baseUrl)
    };
}

export function isFoodAiConfigured(modality = 'text') {
    return getFoodAiConfig(modality).configured;
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
    tags = []
} = {}) {
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Food AI prompt is required.');
    }

    const config = getFoodAiConfig(modality);
    if (!config.configured) {
        throw new Error('FOOD_AI_API_KEY is not configured.');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const requestBody = {
        model: config.model,
        messages: [{
            role: 'user',
            content: buildUserContent({
                prompt: withQwenThinkingSwitch(prompt, config, thinking),
                image,
                mimeType
            })
        }],
        max_tokens: maxTokens,
        temperature
    };
    if (json) requestBody.response_format = { type: 'json_object' };

    const endpoint = `${config.baseUrl}/chat/completions`;
    let lastError;
    let responseFormatEnabled = json;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs());
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                if (responseFormatEnabled && isResponseFormatError(response.status, errorText)) {
                    delete requestBody.response_format;
                    responseFormatEnabled = false;
                    continue;
                }

                const error = new Error(`Food AI provider ${response.status}: ${errorText.slice(0, 500)}`);
                error.status = response.status;
                const retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
                error.providerStatus = response.status;
                error.providerCode = 'FOOD_AI_HTTP_ERROR';
                error.retryable = retryable;
                if (retryable && attempt < MAX_RETRIES) {
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
            const choice = data?.choices?.[0];
            const text = collectText(choice?.message?.content ?? choice?.text);
            if (!text) throw new Error('Food AI provider response missing text content.');

            return {
                text,
                raw: data,
                metadata: {
                    provider: config.provider,
                    model: config.model,
                    thinkingMode: thinking ? 'thinking' : 'non-thinking',
                    tags
                }
            };
        } catch (error) {
            const normalizedError = error?.name === 'AbortError'
                ? Object.assign(new Error(`Food AI provider timed out after ${requestTimeoutMs()}ms.`), {
                    providerCode: 'FOOD_AI_TIMEOUT',
                    retryable: true
                })
                : error;
            lastError = normalizedError;
            if (normalizedError?.status || attempt >= MAX_RETRIES) break;
            await sleep(RETRY_BASE_DELAY_MS * attempt);
        } finally {
            clearTimeout(timeout);
        }
    }

    throw lastError || new Error('Food AI provider failed after retries.');
}

export const foodAiConstants = {
    DEFAULT_BASE_URL,
    DEFAULT_VISION_MODEL,
    DEFAULT_TEXT_MODEL,
    MAX_RETRIES,
    DEFAULT_TIMEOUT_MS
};
