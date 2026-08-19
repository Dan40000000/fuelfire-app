const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const FALLBACK_MODELS = ['claude-sonnet-4-20250514'];
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 750;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getModel() {
    const configuredModel = process.env.CLAUDE_MODEL?.trim();
    if (configuredModel) {
        return configuredModel;
    }
    return DEFAULT_MODEL;
}

function getModelCandidates() {
    const configuredModel = process.env.CLAUDE_MODEL?.trim();
    if (configuredModel) {
        return [configuredModel];
    }
    return [DEFAULT_MODEL, ...FALLBACK_MODELS];
}

function sanitizeApiKey(value) {
    return String(value || '')
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/\\n/g, '')
        .trim();
}

export function getAnthropicApiKey() {
    return sanitizeApiKey(process.env.CLAUDE_API_KEY);
}

function redactKey(key) {
    if (!key) return 'missing';
    if (key.length <= 10) return '***';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function collectMessages(prompt, messages) {
    if (messages?.length) {
        return messages;
    }
    if (!prompt) {
        throw new Error('callClaude requires either messages or a prompt.');
    }
    return [{ role: 'user', content: prompt }];
}

function collectTextContent(content) {
    return (Array.isArray(content) ? content : [])
        .filter((part) => typeof part?.text === 'string' && part.text.trim())
        .map((part) => part.text.trim())
        .join('\n');
}

function logAttempt({ attempt, tags, message }) {
    const prefix = tags?.length ? `[${tags.join('][')}] ` : '';
    console.log(`${prefix}Claude call attempt ${attempt}: ${message}`);
}

export async function callClaude({
    prompt,
    messages,
    maxTokens = 4000,
    temperature,
    system,
    tags,
    tools,
    tool_choice,
} = {}) {
    const apiKey = getAnthropicApiKey();

    if (!apiKey) {
        throw new Error('CLAUDE_API_KEY is not configured.');
    }

    const requestMessages = collectMessages(prompt, messages);
    const modelCandidates = getModelCandidates();

    let lastError;
    for (const model of modelCandidates) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                logAttempt({
                    attempt,
                    tags,
                    message: `model=${model}, tokens=${maxTokens}, promptLength=${prompt ? prompt.length : 'n/a'}`,
                });

                const requestBody = {
                    model,
                    max_tokens: maxTokens,
                    temperature,
                    system,
                    messages: requestMessages,
                };

                // Add tools if provided
                if (tools && tools.length > 0) {
                    requestBody.tools = tools;
                }

                // Add tool_choice if provided
                if (tool_choice) {
                    requestBody.tool_choice = tool_choice;
                }

                const response = await fetch(ANTHROPIC_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': ANTHROPIC_VERSION,
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = `Claude API error ${response.status} ${response.statusText}: ${errorText.substring(0, 400)}`;
                    const isRetryable = [408, 429, 500, 502, 503, 504].includes(response.status);
                    const isModelUnavailable = [400, 404].includes(response.status)
                        && /model|not_found|does not exist|not found/i.test(errorText);

                    if (isModelUnavailable && model !== modelCandidates[modelCandidates.length - 1]) {
                        lastError = new Error(errorMessage);
                        logAttempt({ attempt, tags, message: `model ${model} unavailable, trying fallback model` });
                        break;
                    }

                    if (isRetryable && attempt < MAX_RETRIES) {
                        lastError = new Error(errorMessage);
                        const delay = RETRY_BASE_DELAY_MS * attempt;
                        logAttempt({ attempt, tags, message: `retrying in ${delay}ms due to ${response.status}` });
                        await sleep(delay);
                        continue;
                    }

                    const error = new Error(errorMessage);
                    error.retryable = false;
                    throw error;
                }

                const data = await response.json();

                // Check if response contains tool use
                const toolUse = data?.content?.find?.((part) => part?.type === 'tool_use');
                const textPart = collectTextContent(data?.content);

                if (toolUse) {
                    // Return both text and tool use information
                    return {
                        text: textPart || '',
                        toolUse: toolUse,
                        stopReason: data?.stop_reason,
                        raw: data,
                        metadata: {
                            model,
                            apiKey: redactKey(apiKey),
                        },
                    };
                }

                if (!textPart) {
                    throw new Error('Claude response missing text content.');
                }

                return {
                    text: textPart,
                    raw: data,
                    metadata: {
                        model,
                        apiKey: redactKey(apiKey),
                    },
                };
            } catch (error) {
                lastError = error;
                if (error.retryable !== false && attempt < MAX_RETRIES) {
                    const delay = RETRY_BASE_DELAY_MS * attempt;
                    logAttempt({ attempt, tags, message: `caught ${error.message}. retrying in ${delay}ms` });
                    await sleep(delay);
                    continue;
                }
                break;
            }
        }
    }

    throw lastError || new Error('Unknown Claude API failure.');
}

export function getClaudeModel() {
    return getModel();
}

// Fast model for quick classification tasks (food parsing, image recognition)
// Haiku is 3-5x faster and sufficient for food ID — Sonnet reserved for meal plans/workouts
export function getFastClaudeModel() {
    return process.env.CLAUDE_FAST_MODEL?.trim() || 'claude-haiku-4-5-20251001';
}

export const anthropicConstants = {
    ANTHROPIC_URL,
    DEFAULT_MODEL,
    FALLBACK_MODELS,
    ANTHROPIC_VERSION,
    MAX_RETRIES,
};
