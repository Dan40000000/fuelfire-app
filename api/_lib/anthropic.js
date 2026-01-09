const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620';
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
    const model = getModel();
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
        throw new Error('CLAUDE_API_KEY is not configured.');
    }

    const requestMessages = collectMessages(prompt, messages);

    let lastError;
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

                if (isRetryable && attempt < MAX_RETRIES) {
                    lastError = new Error(errorMessage);
                    const delay = RETRY_BASE_DELAY_MS * attempt;
                    logAttempt({ attempt, tags, message: `retrying in ${delay}ms due to ${response.status}` });
                    await sleep(delay);
                    continue;
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Check if response contains tool use
            const toolUse = data?.content?.find?.((part) => part?.type === 'tool_use');
            const textPart = data?.content?.find?.((part) => part?.text)?.text;

            if (toolUse) {
                // Return both text and tool use information
                return {
                    text: textPart?.trim() || '',
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
                text: textPart.trim(),
                raw: data,
                metadata: {
                    model,
                    apiKey: redactKey(apiKey),
                },
            };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_RETRIES) {
                const delay = RETRY_BASE_DELAY_MS * attempt;
                logAttempt({ attempt, tags, message: `caught ${error.message}. retrying in ${delay}ms` });
                await sleep(delay);
                continue;
            }
            break;
        }
    }

    throw lastError || new Error('Unknown Claude API failure.');
}

export function getClaudeModel() {
    return getModel();
}

export const anthropicConstants = {
    DEFAULT_MODEL,
    ANTHROPIC_VERSION,
    MAX_RETRIES,
};
