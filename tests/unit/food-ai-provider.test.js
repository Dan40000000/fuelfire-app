import { afterEach, describe, expect, it, vi } from 'vitest';
import { callFoodAi, getFoodAiConfig, isFoodAiConfigured } from '../../api/_lib/food-ai-provider.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('food AI provider', () => {
    it('uses the Qwen Hugging Face defaults and requires remote credentials', () => {
        delete process.env.FOOD_AI_BASE_URL;
        delete process.env.FOOD_AI_API_KEY;
        delete process.env.HF_TOKEN;
        delete process.env.HUGGING_FACE_HUB_TOKEN;

        expect(getFoodAiConfig('vision')).toMatchObject({
            provider: 'qwen',
            baseUrl: 'https://router.huggingface.co/v1',
            model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
            configured: false
        });
        expect(isFoodAiConfigured('vision')).toBe(false);
    });

    it('sends OpenAI-compatible multimodal requests without exposing the key in metadata', async () => {
        process.env.FOOD_AI_BASE_URL = 'https://example.test/v1/';
        process.env.FOOD_AI_API_KEY = 'secret-food-key';
        process.env.FOOD_AI_VISION_MODEL = 'qwen-test-vision';
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            choices: [{ message: { content: '{"foods":[]}' } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await callFoodAi({
            prompt: 'Inspect this image',
            image: 'YWJj',
            mimeType: 'image/png',
            modality: 'vision'
        });

        expect(result.text).toBe('{"foods":[]}');
        expect(result.metadata).toEqual(expect.objectContaining({ provider: 'qwen', model: 'qwen-test-vision' }));
        expect(JSON.stringify(result.metadata)).not.toContain('secret-food-key');
        const [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe('https://example.test/v1/chat/completions');
        expect(request.signal).toBeInstanceOf(AbortSignal);
        expect(request.headers.Authorization).toBe('Bearer secret-food-key');
        const body = JSON.parse(request.body);
        expect(body.messages[0].content[0].image_url.url).toBe('data:image/png;base64,YWJj');
        expect(body.messages[0].content[1].text).toContain('/no_think');
        expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('opts into Qwen thinking only when explicitly requested', async () => {
        process.env.FOOD_AI_API_KEY = 'secret-food-key';
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            choices: [{ message: { content: '{"foods":[]}' } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await callFoodAi({
            prompt: 'Perform a deep nutrition lookup',
            modality: 'text',
            thinking: true
        });

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.messages[0].content).toContain('/think');
        expect(result.metadata.thinkingMode).toBe('thinking');
    });

    it('accepts local endpoints without a key and falls back when JSON mode is unsupported', async () => {
        process.env.FOOD_AI_BASE_URL = 'http://127.0.0.1:8080/v1';
        delete process.env.FOOD_AI_API_KEY;
        delete process.env.HF_TOKEN;
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response('response_format unsupported', { status: 400 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                choices: [{ message: { content: [{ type: 'text', text: '{"foods":[{"name":"rice"}]}' }] } }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await callFoodAi({ prompt: 'Parse rice', modality: 'text' });

        expect(result.text).toContain('rice');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).response_format).toBeUndefined();
        expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
    });
});
