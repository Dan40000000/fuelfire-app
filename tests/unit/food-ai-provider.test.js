import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    callFoodAi,
    getFoodAiConfig,
    getFoodAiFallbackConfig,
    isFoodAiConfigured,
} from '../../api/_lib/food-ai-provider.js';

const ORIGINAL_ENV = { ...process.env };

function clearProviderEnv() {
    delete process.env.FOOD_AI_PROVIDER;
    delete process.env.FOOD_AI_FALLBACK_PROVIDER;
    delete process.env.FOOD_AI_BASE_URL;
    delete process.env.FOOD_AI_API_KEY;
    delete process.env.FOOD_AI_VISION_MODEL;
    delete process.env.FOOD_AI_TEXT_MODEL;
    delete process.env.FOOD_AI_CLAUDE_VISION_MODEL;
    delete process.env.FOOD_AI_CLAUDE_TEXT_MODEL;
    delete process.env.FOOD_AI_CLAUDE_REVIEW_MODEL;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.HF_TOKEN;
    delete process.env.HUGGING_FACE_HUB_TOKEN;
}

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('food AI provider', () => {
    it('defaults to Claude Sonnet 5 with Qwen available only as the fallback provider', () => {
        clearProviderEnv();

        expect(getFoodAiConfig('vision')).toMatchObject({
            provider: 'claude',
            baseUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-5',
            configured: false,
        });
        expect(getFoodAiFallbackConfig('vision')).toMatchObject({
            provider: 'qwen',
            baseUrl: 'https://router.huggingface.co/v1',
            model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
            configured: false,
        });
        expect(isFoodAiConfigured('vision')).toBe(false);
    });

    it('sends Claude-native image blocks without exposing the key in metadata', async () => {
        clearProviderEnv();
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'secret-claude-key';
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            model: 'claude-sonnet-5',
            content: [{ type: 'text', text: '{"foods":[]}' }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await callFoodAi({
            prompt: 'Inspect this image',
            image: 'YWJj',
            mimeType: 'image/png',
            modality: 'vision',
        });

        expect(result.text).toBe('{"foods":[]}');
        expect(result.metadata).toMatchObject({
            provider: 'claude',
            model: 'claude-sonnet-5',
            tier: 'primary',
            thinkingMode: 'adaptive',
        });
        expect(JSON.stringify(result.metadata)).not.toContain('secret-claude-key');
        const [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(request.signal).toBeInstanceOf(AbortSignal);
        expect(request.headers['x-api-key']).toBe('secret-claude-key');
        expect(request.headers.Authorization).toBeUndefined();
        const body = JSON.parse(request.body);
        expect(body.model).toBe('claude-sonnet-5');
        expect(body.temperature).toBeUndefined();
        expect(body.response_format).toBeUndefined();
        expect(body.messages[0].content[0]).toEqual({
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: 'YWJj' },
        });
    });

    it('retries a truncated Claude response with a larger output allowance', async () => {
        clearProviderEnv();
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                content: [{ type: 'text', text: '{"foods":[' }],
                stop_reason: 'max_tokens',
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                content: [{ type: 'text', text: '{"foods":[]}' }],
                stop_reason: 'end_turn',
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await callFoodAi({ prompt: 'Return JSON', maxTokens: 1400 });

        expect(result.text).toBe('{"foods":[]}');
        expect(result.metadata.stopReason).toBe('end_turn');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(1400);
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).max_tokens).toBe(2800);
    });

    it('uses Claude Opus 5 only for explicit review-tier calls', async () => {
        clearProviderEnv();
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'secret-claude-key';
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            content: [{ type: 'text', text: '{"foods":[{"name":"egg"}]}' }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await callFoodAi({ prompt: 'Review this result', tier: 'review' });

        expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-opus-5');
        expect(result.metadata).toMatchObject({ provider: 'claude', model: 'claude-opus-5', tier: 'review' });
    });

    it('marks Qwen as degraded when Claude is unavailable', async () => {
        clearProviderEnv();
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'secret-claude-key';
        process.env.FOOD_AI_API_KEY = 'secret-qwen-key';
        process.env.FOOD_AI_BASE_URL = 'https://qwen.test/v1';
        vi.useFakeTimers();
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response('temporary outage', { status: 503 }))
            .mockResolvedValueOnce(new Response('temporary outage', { status: 503 }))
            .mockResolvedValueOnce(new Response('temporary outage', { status: 503 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                choices: [{ message: { content: '{"foods":[{"name":"egg"}]}' } }],
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const resultPromise = callFoodAi({ prompt: 'Parse one egg', modality: 'text' });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(fetchMock.mock.calls[3][0]).toBe('https://qwen.test/v1/chat/completions');
        expect(result.metadata).toMatchObject({
            provider: 'qwen',
            degraded: true,
            primaryProvider: 'claude',
            fallbackReason: 'FOOD_AI_HTTP_ERROR',
        });
    });

    it('does not hide a bad Claude request behind Qwen', async () => {
        clearProviderEnv();
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'secret-claude-key';
        process.env.FOOD_AI_API_KEY = 'secret-qwen-key';
        const fetchMock = vi.fn(async () => new Response('invalid request', { status: 400 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(callFoodAi({ prompt: 'Parse food' })).rejects.toThrow('Food AI provider 400');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('keeps the OpenAI-compatible Qwen path available for rollback and local tests', async () => {
        clearProviderEnv();
        process.env.FOOD_AI_PROVIDER = 'qwen';
        process.env.FOOD_AI_BASE_URL = 'http://127.0.0.1:8080/v1';
        process.env.FOOD_AI_VISION_MODEL = 'qwen-test-vision';
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response('response_format unsupported', { status: 400 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                choices: [{ message: { content: [{ type: 'text', text: '{"foods":[{"name":"rice"}]}' }] } }],
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await callFoodAi({
            prompt: 'Inspect this image',
            image: 'YWJj',
            mimeType: 'image/png',
            modality: 'vision',
        });

        expect(result.text).toContain('rice');
        expect(result.metadata).toMatchObject({ provider: 'qwen', model: 'qwen-test-vision' });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body);
        expect(retryBody.response_format).toBeUndefined();
        expect(retryBody.messages[0].content[0].image_url.url).toBe('data:image/png;base64,YWJj');
        expect(retryBody.messages[0].content[1].text).toContain('/no_think');
    });
});
