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

    it('extracts visual evidence before resolving nutrition', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify({
                        foods: [{ name: 'blueberry muffin', visualAmount: 'four standard muffins' }],
                        visibleText: []
                    }) } }]
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify({
                        foods: [{ name: 'Blueberry Muffin', quantity: 4, serving: '1 standard muffin', calories: 135 }]
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

        expect(global.fetch).toHaveBeenCalledTimes(2);
        const firstBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        const secondBody = JSON.parse(global.fetch.mock.calls[1][1].body);
        expect(firstBody.model).toBe('test-vision');
        expect(firstBody.messages[0].content[0].type).toBe('image_url');
        expect(firstBody.messages[0].content[1].text).toContain('DEVICE DEPTH MEASUREMENTS');
        expect(firstBody.messages[0].content[1].text).toContain('Estimated height above the plate/support plane: 0.05 m');
        expect(secondBody.model).toBe('test-text');
        expect(secondBody.messages[0].content).toContain('blueberry muffin');
        expect(secondBody.messages[0].content).toContain('DEVICE DEPTH MEASUREMENTS');
        expect(result.text).toContain('Blueberry Muffin');
        expect(result.metadata.visionModel).toBe('test-vision');
    });

    it('escalates low-confidence Claude vision and nutrition passes to Opus without using Qwen', async () => {
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        const claudeResponse = (payload) => new Response(JSON.stringify({
            content: [{ type: 'text', text: JSON.stringify(payload) }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        global.fetch = vi.fn()
            .mockResolvedValueOnce(claudeResponse({
                foods: [{ name: 'fried egg', count: 1, confidence: 'low' }],
                overallConfidence: 'low',
            }))
            .mockResolvedValueOnce(claudeResponse({
                foods: [{ name: 'fried egg', count: 1, sizeClass: 'large', confidence: 'medium' }],
                overallConfidence: 'medium',
            }))
            .mockResolvedValueOnce(claudeResponse({
                foods: [{ name: 'Fried Egg', quantity: 1, serving: '1 large egg', calories: 70, confidence: 'low' }],
                overallConfidence: 'low',
            }))
            .mockResolvedValueOnce(claudeResponse({
                foods: [{ name: 'Fried Egg', quantity: 1, serving: '1 large egg', calories: 90, protein: 6, carbs: 1, fat: 7, confidence: 'medium' }],
                overallConfidence: 'medium',
            }));

        const result = await callFoodVision({
            image: 'ZmFrZS1pbWFnZQ==',
            mimeType: 'image/jpeg',
        });

        expect(global.fetch).toHaveBeenCalledTimes(4);
        const models = global.fetch.mock.calls.map(([, request]) => JSON.parse(request.body).model);
        expect(models).toEqual(['claude-sonnet-5', 'claude-opus-5', 'claude-sonnet-5', 'claude-opus-5']);
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
                            { name: 'canned tuna', count: 1, confidence: 'high' },
                            { name: 'round butter crackers', count: 1, confidence: 'medium' },
                        ],
                        visibleText: [],
                    }) } }],
                }),
            })
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
            expect.objectContaining({ id: 'tuna_packing_liquid', acceptsVoice: true }),
            expect.objectContaining({ id: 'cracker_count', acceptsVoice: true }),
            expect.objectContaining({ id: 'tuna_mayonnaise', acceptsVoice: true }),
        ]);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
