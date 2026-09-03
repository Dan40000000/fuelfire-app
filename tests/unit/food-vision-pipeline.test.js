import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import foodVisionHandler, { callFoodVision } from '../../api/ai-food-vision.js';
import { getTestAuthHeaders, invokeApi } from '../lib/api-test-utils.js';

describe('food vision evidence pipeline', () => {
    const originalEnv = { ...process.env };
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env.FOOD_AI_PROVIDER = 'qwen';
        process.env.FOOD_AI_BASE_URL = 'http://127.0.0.1:9999/v1';
        process.env.FOOD_AI_VISION_MODEL = 'test-vision';
        process.env.FOOD_AI_TEXT_MODEL = 'test-text';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('resolves visual evidence and nutrition in one high-quality pass', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: JSON.stringify({
                    foods: [{
                        name: 'Blueberry Muffin', visualAmount: 'four standard muffins',
                        visualCount: 4, quantity: 4, serving: '1 standard muffin', calories: 135,
                    }],
                    visibleText: [],
                    calorieRange: { low: 480, high: 620, midpoint: 540 },
                }) } }]
            })
        });

        const result = await callFoodVision({
            image: 'ZmFrZS1pbWFnZQ==',
            mimeType: 'image/jpeg',
            contextHint: 'four standard muffins',
            spatialContext: {
                captureMode: 'arkit-scene-depth',
                lidarAvailable: true,
                sceneDepthAvailable: true,
                centerDistanceMeters: 0.42,
                platePlaneDistanceMeters: 0.47,
                imageResolution: { width: 1920, height: 1440 },
                depthMapResolution: { width: 256, height: 192 },
            },
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const firstBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(firstBody.model).toBe('test-vision');
        expect(firstBody.messages[0].content[0].type).toBe('image_url');
        expect(firstBody.messages[0].content[1].text).toContain('DEVICE DEPTH MEASUREMENTS');
        expect(firstBody.messages[0].content[1].text).toContain('Estimated height above the plate/support plane: 0.05 m');
        expect(firstBody.messages[0].content[1].text).toContain('sum(calories × quantity)');
        expect(result.text).toContain('Blueberry Muffin');
        expect(result.metadata.visionModel).toBe('test-vision');
    });

    it('uses one Opus multimodal pass instead of repeated low-confidence reviews', async () => {
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        const claudeResponse = (payload) => new Response(JSON.stringify({
            content: [{ type: 'text', text: JSON.stringify(payload) }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        global.fetch = vi.fn().mockResolvedValueOnce(claudeResponse({
            foods: [{ name: 'Fried Egg', quantity: 1, serving: '1 large egg', calories: 90, protein: 6, carbs: 1, fat: 7, confidence: 'low' }],
            overallConfidence: 'low',
        }));

        const result = await callFoodVision({
            image: 'ZmFrZS1pbWFnZQ==',
            mimeType: 'image/jpeg',
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const models = global.fetch.mock.calls.map(([, request]) => JSON.parse(request.body).model);
        expect(models).toEqual(['claude-opus-5']);
        const firstBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(firstBody.messages[0].content[0]).toMatchObject({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg' },
        });
        expect(result.metadata).toMatchObject({
            provider: 'claude',
            model: 'claude-opus-5',
            visionModel: 'claude-opus-5',
            reviewModel: 'claude-opus-5',
            degraded: false,
        });
        expect(result.text).toContain('Fried Egg');
    });

    it('returns an AI-first voice-enabled conversation contract for ambiguous photos', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify({
                        foods: [
                            { name: 'Canned tuna', quantity: 1, serving: '1 five-ounce can', calories: 110, protein: 25, carbs: 0, fat: 1, confidence: 'medium' },
                            { name: 'Round butter cracker', quantity: 1, serving: '1 cracker', calories: 16, protein: 0, carbs: 2, fat: 1, confidence: 'medium' },
                        ],
                        assumptions: ['The tuna can appears to be about five ounces.'],
                        calorieRange: { low: 126, high: 360, midpoint: 270 },
                        clarifyingQuestions: [{
                            id: 'tuna_mayonnaise',
                            question: 'Was mayonnaise mixed into the tuna?',
                            examples: ['No', '1 tablespoon', '2 tablespoons'],
                            reason: 'Mayonnaise can materially change calories.',
                            affectedFood: 'Canned tuna',
                            estimatedCalorieImpact: 100,
                            acceptsVoice: true,
                        }],
                    }) } }],
                }),
            });

        const response = await invokeApi(foodVisionHandler, {
            headers: getTestAuthHeaders(),
            body: {
                image: 'ZmFrZS1pbWFnZQ==',
                mimeType: 'image/jpeg',
                forceWebSearch: false,
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            calorieRange: { low: 126, high: 360, midpoint: 270 },
            assumptions: ['The tuna can appears to be about five ounces.'],
        });
        expect(response.body.clarifyingQuestions).toEqual([
            expect.objectContaining({ id: 'tuna_mayonnaise', acceptsVoice: true }),
        ]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('repairs the one-cup popcorn mismatch without starting a generic parser lookup', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: JSON.stringify({
                    foods: [{
                        name: 'Popped popcorn', visualAmount: 'a loose mound covering a small plate',
                        quantity: 1, serving: '1 cup popped', calories: 31,
                        protein: 1, carbs: 6.2, fiber: 1.2, netCarbs: 5, fat: 0, sugar: 0,
                        confidence: 'low', dataSource: 'generic cup reference',
                    }],
                    lookupQuery: 'popped popcorn',
                    overallConfidence: 'low',
                    calorieRange: { low: 90, high: 170, midpoint: 130 },
                }) } }],
            }),
        });

        const response = await invokeApi(foodVisionHandler, {
            headers: getTestAuthHeaders(),
            body: { image: 'ZmFrZS1pbWFnZQ==', mimeType: 'image/jpeg' },
        });

        expect(response.status).toBe(200);
        expect(response.body.foods[0]).toMatchObject({
            serving: '1 cup popped', quantity: 4, portionAdjustedToRange: true,
        });
        expect(response.body.totalCalories).toBe(124);
        expect(response.body.calorieRange).toEqual({ low: 90, high: 170, midpoint: 130 });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});
