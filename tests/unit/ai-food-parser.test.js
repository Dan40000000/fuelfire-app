import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import foodParserHandler from '../../api/ai-food-parser.js';
import { getTestAuthHeaders, invokeApi } from '../lib/api-test-utils.js';

const ORIGINAL_ENV = { ...process.env };

describe('AI food parser composite meals', () => {
    beforeEach(() => {
        process.env.FOOD_AI_PROVIDER = 'qwen';
        process.env.FOOD_AI_BASE_URL = 'https://food-ai.test/v1';
        process.env.FOOD_AI_API_KEY = 'test-food-key';
        process.env.FOOD_AI_TEXT_MODEL = 'test-food-model';
    });

    it('uses Claude Sonnet first and Claude Opus only to review a low-confidence voice result', async () => {
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        const claudeResponse = (foods, overallConfidence, clarifyingQuestions = []) => new Response(JSON.stringify({
            content: [{ type: 'text', text: JSON.stringify({ foods, overallConfidence, clarifyingQuestions }) }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(claudeResponse([{
                name: 'Roasted Fennel', calories: 55, protein: 2, carbs: 12,
                fiber: 4, netCarbs: 8, fat: 1, sugar: 5,
                serving: '1 cup', quantity: 1, confidence: 'low',
                source: 'initial estimate', sourceType: 'estimate', sourceUrl: null,
            }], 'low'))
            .mockResolvedValueOnce(claudeResponse([{
                name: 'Roasted Fennel', calories: 73, protein: 2, carbs: 13,
                fiber: 5, netCarbs: 8, fat: 3, sugar: 6,
                serving: '1 cup', quantity: 1, confidence: 'medium',
                source: 'reviewed standard reference', sourceType: 'estimate', sourceUrl: null,
            }], 'medium', [{
                id: 'cooking_oil',
                question: 'How much oil was used?',
                examples: ['None', '1 teaspoon'],
                reason: 'Oil changes calories.',
                affectedFood: 'Roasted Fennel',
                estimatedCalorieImpact: 40,
                acceptsVoice: true,
            }]));
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: 'one cup of roasted fennel', source: 'voice', forceWebSearch: false },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'voice-ai-claude-review',
            aiProvider: 'claude',
            aiModel: 'claude-opus-5',
            aiReviewModel: 'claude-opus-5',
            degradedMode: false,
            totalCalories: 73,
        });
        expect(response.body.clarifyingQuestions).toEqual([
            expect.objectContaining({ id: 'cooking_oil', acceptsVoice: true }),
        ]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-sonnet-5');
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe('claude-opus-5');
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('uses AI when only part of a multi-food voice entry has a database match', async () => {
        const providerResponse = (foods, overallConfidence = 'medium') => new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ foods, overallConfidence }) } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(providerResponse([{
                name: 'Grilled Salmon', calories: 350, protein: 39, carbs: 0,
                fiber: 0, netCarbs: 0, fat: 20, sugar: 0,
                serving: '6 oz', quantity: 1, confidence: 'medium',
                source: 'standard nutrition reference', sourceType: 'estimate', sourceUrl: null,
            }]))
            .mockResolvedValueOnce(providerResponse([{
                name: 'Roasted Fennel', calories: 73, protein: 2, carbs: 13,
                fiber: 5, netCarbs: 8, fat: 3, sugar: 6,
                serving: '1 cup', quantity: 1, confidence: 'low',
                source: 'standard nutrition reference', sourceType: 'estimate', sourceUrl: null,
            }], 'low'));
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'I had six ounces of grilled salmon, one cup cooked quinoa, and a cup of roasted fennel',
                source: 'voice',
                forceWebSearch: false,
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'voice-ai-qwen',
            overallConfidence: 'low',
        });
        expect(response.body.foods.map((food) => food.name)).toEqual([
            'Salmon Fillet (4 oz)',
            'Cooked Quinoa (1 cup)',
            'Roasted Fennel',
        ]);
        expect(response.body.foods[1]).toMatchObject({ calories: 222, protein: 8, carbs: 39, fat: 4 });
        expect(response.body.foods[2]).toMatchObject({ calories: 73, protein: 2, carbs: 13, fat: 3 });
        expect(response.body.foods[0]).toMatchObject({ calories: 234, protein: 25, fat: 14, quantity: 1.5 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('uses measured references for a fully covered common meal', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'I had six ounces of grilled salmon, one cup cooked quinoa, and a cup of roasted asparagus',
                source: 'voice',
                forceWebSearch: false,
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'database-composite',
            overallConfidence: 'medium',
            totalCalories: 653,
        });
        expect(response.body.foods).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Salmon Fillet (4 oz)', calories: 234, protein: 25, quantity: 1.5 }),
            expect.objectContaining({ name: 'Cooked Quinoa (1 cup)', calories: 222, protein: 8, quantity: 1 }),
            expect.objectContaining({ name: 'Roasted Asparagus (1 cup)', calories: 80, protein: 4, quantity: 1 }),
        ]));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('resolves a spoken count of generic large eggs locally without a provider key', async () => {
        delete process.env.FOOD_AI_API_KEY;
        delete process.env.HF_TOKEN;
        delete process.env.HUGGING_FACE_HUB_TOKEN;
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: 'four large eggs', source: 'voice' },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'database',
            originalQuery: 'four large eggs',
            normalizedQuery: '4 large eggs',
            totalCalories: 280,
        });
        expect(response.body.foods).toHaveLength(1);
        expect(response.body.foods[0]).toMatchObject({
            name: 'Egg (large)',
            serving: '1 large egg',
            quantity: 4,
            calories: 70,
            protein: 6,
            carbs: 1,
            fat: 5,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('canonicalizes only the adjacent repeated sausage referent in the exact voice repro', async () => {
        delete process.env.FOOD_AI_API_KEY;
        delete process.env.HF_TOKEN;
        delete process.env.HUGGING_FACE_HUB_TOKEN;
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const originalQuery = 'Four large eggs and seven sausage links small sausage links';
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: originalQuery, source: 'voice' },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'database-composite',
            originalQuery,
            normalizedQuery: '4 large eggs and 7 small sausage links',
            totalCalories: 679,
        });
        expect(response.body.foods).toEqual([
            expect.objectContaining({ name: 'Egg (large)', quantity: 4, calories: 70 }),
            expect.objectContaining({ name: 'Small Sausage Link', quantity: 7, calories: 57 }),
        ]);
        expect(response.body.foods.map((food) => food.name)).not.toEqual(expect.arrayContaining([
            'Scrambled Egg (large)',
            'Large Sausage Link',
        ]));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('asks voice-answerable questions before resolving ambiguous tuna and crackers', async () => {
        delete process.env.FOOD_AI_API_KEY;
        delete process.env.HF_TOKEN;
        delete process.env.HUGGING_FACE_HUB_TOKEN;
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const initial = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: 'canned tuna and crackers', source: 'voice' },
        });

        expect(initial.status).toBe(200);
        expect(initial.body.clarifyingQuestions).toEqual([
            expect.objectContaining({ id: 'tuna_packing_liquid', acceptsVoice: true }),
            expect.objectContaining({ id: 'cracker_count', acceptsVoice: true }),
        ]);

        const refined = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'canned tuna in water and 10 crackers',
                source: 'voice',
            },
        });

        expect(refined.status).toBe(200);
        expect(refined.body.clarifyingQuestions).toEqual([]);
        expect(refined.body.foods).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Canned Tuna in Water (5 oz)', calories: 110, quantity: 1 }),
            expect.objectContaining({ name: 'Round Butter Cracker', calories: 16, quantity: 10 }),
        ]));
        expect(refined.body.totalCalories).toBe(270);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('preserves explicit scrambled-egg and large-sausage references for voice counts', async () => {
        delete process.env.FOOD_AI_API_KEY;
        delete process.env.HF_TOKEN;
        delete process.env.HUGGING_FACE_HUB_TOKEN;
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const scrambled = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: 'four large egg scrambled', source: 'voice' },
        });
        const largeSausage = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: 'seven large sausage links', source: 'voice' },
        });

        expect(scrambled.status).toBe(200);
        expect(scrambled.body.foods[0]).toMatchObject({
            name: 'Scrambled Egg (large)', quantity: 4, calories: 91,
        });
        expect(largeSausage.status).toBe(200);
        expect(largeSausage.body.foods[0]).toMatchObject({
            name: 'Large Sausage Link', quantity: 7, calories: 225,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('prefers the complete branded voice alternative over a generic primary transcript', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'sausage links',
                alternatives: ["McDonald's sausage egg McMuffin"],
                source: 'voice',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'database',
            normalizedQuery: "McDonald's Sausage McMuffin with Egg",
            totalCalories: 480,
        });
        expect(response.body.foods[0]).toMatchObject({
            name: "McDonald's Sausage McMuffin with Egg",
            calories: 480,
            protein: 21,
            carbs: 29,
            fat: 31,
            quantity: 1,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(['voice', 'search'])('does not let generic saved sausage shadow a known branded item for %s', async (source) => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: "McDonald's sausage egg McMuffin",
                source,
                foodMemoryHints: [{
                    name: 'Sausage', serving: '1 serving', calories: 170, protein: 10,
                    carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1,
                    source: 'Saved food memory', aliases: ['sausage'],
                }],
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ source: 'database', totalCalories: 480 });
        expect(response.body.foods[0]).toMatchObject({
            name: "McDonald's Sausage McMuffin with Egg",
            calories: 480,
            protein: 21,
            carbs: 29,
            fat: 31,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('applies a typed database quantity exactly once', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: '2 slices of white bread', source: 'search' },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ source: 'database', totalCalories: 160 });
        expect(response.body.foods[0]).toMatchObject({ calories: 80, quantity: 2 });
    });

    it('resolves counted pork ribs as per-rib nutrition and multiplies once', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: { query: '6 pork ribs', source: 'search' },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'database',
            totalCalories: 690,
        });
        expect(response.body.foods).toHaveLength(1);
        expect(response.body.foods[0]).toMatchObject({
            name: 'Pork Rib (medium cooked, bone excluded)',
            serving: '1 medium cooked pork rib (bone excluded)',
            quantity: 6,
            calories: 115,
            protein: 9,
            fat: 8,
            source: 'Generic cooked pork rib estimate',
            sourceType: 'estimate',
            confidence: 'medium',
            needsVerification: true,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('treats conversational dictated totals as totals instead of per-item values', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'I ate 2 chicken breasts 500 calories 60 protein total',
                source: 'search',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ totalCalories: 500, totalProtein: 60 });
        expect(response.body.foods[0]).toMatchObject({ calories: 250, protein: 30, quantity: 2 });
    });

    it('keeps every typed item when separate dictated nutrition facts are supplied', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'Greek yogurt 100 calories 15 protein and granola 200 calories 5 protein',
                source: 'search',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            source: 'user-provided-nutrition-multi',
            totalCalories: 300,
            totalProtein: 20,
        });
        expect(response.body.foods).toHaveLength(2);
        expect(response.body.foods.map((food) => food.name.toLowerCase())).toEqual([
            expect.stringContaining('greek yogurt'),
            'granola',
        ]);
    });

    it('accepts complete user-provided nutrition for an unknown branded item without a provider lookup', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'Chobani Secret Product 170 calories 20 protein 10 carbs 3 fat 5 sugar',
                source: 'search',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ source: 'user-provided-nutrition', totalCalories: 170 });
        expect(response.body.foods[0]).toMatchObject({
            name: 'chobani secret product',
            calories: 170,
            protein: 20,
            carbs: 10,
            fat: 3,
            sugar: 5,
            nutritionBasis: 'user-provided',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('calculates calories from authoritative restaurant macros', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: "McDonald's double cheeseburger with 40 g protein 30 g fat and 20 g carbs",
                source: 'voice',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'user-provided-nutrition',
            totalCalories: 510,
            totalProtein: 40,
            totalCarbs: 20,
            totalFat: 30,
        });
        expect(response.body.foods[0]).toMatchObject({
            calories: 510,
            protein: 40,
            carbs: 20,
            fat: 30,
            nutritionBasis: 'user-provided',
            nutritionEvidence: expect.objectContaining({
                source: 'user-dictated',
                fields: expect.arrayContaining(['calories', 'protein', 'carbs', 'fat']),
            }),
        });
        expect(response.body.foods[0].evidence).toMatch(/user dictated/i);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('normalizes common spoken number words in dictated nutrition facts', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'a protein bar with five hundred calories, forty grams of protein, twenty grams of carbohydrates, and ten grams of fat',
                source: 'voice',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            source: 'user-provided-nutrition',
            totalCalories: 500,
            totalProtein: 40,
            totalCarbs: 20,
            totalFat: 10,
        });
    });

    it('preserves explicit calories and macros while filling missing fields from a database item', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: "McDonald's Big Mac 500 calories 40 grams of protein",
                source: 'search',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'database',
            totalCalories: 500,
            totalProtein: 40,
        });
        expect(response.body.foods[0]).toMatchObject({
            calories: 500,
            protein: 40,
            carbs: 46,
            fat: 34,
            sugar: 9,
            nutritionBasis: 'user-provided',
        });
    });

    it('keeps partial dictated facts when an AI estimate supplies the remaining fields', async () => {
        const providerResponse = new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({
                foods: [{
                    name: "McDonald's Double Cheeseburger",
                    calories: 900,
                    protein: 12,
                    carbs: 80,
                    fiber: 2,
                    fat: 50,
                    sugar: 15,
                    serving: '1 burger',
                    quantity: 1,
                    confidence: 'medium',
                    source: 'AI estimate',
                    sourceType: 'estimate',
                }],
            }) } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ products: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }))
            .mockResolvedValueOnce(providerResponse);
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: "McDonald's double cheeseburger 500 cal 40 g protein",
                source: 'voice',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body.foods[0]).toMatchObject({
            calories: 500,
            protein: 40,
            carbs: 80,
            fat: 50,
            nutritionBasis: 'user-provided',
            needsVerification: true,
        });
        expect(response.body.foods[0].nutritionEvidence.fields).toEqual(['calories', 'protein']);
    });

    it('assigns separate dictated facts to the nearby item in a multi-item entry', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'Greek yogurt 100 cal 15 g protein, granola 200 calories 5 g protein',
                source: 'voice',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'user-provided-nutrition-multi',
            totalCalories: 300,
            totalProtein: 20,
        });
        expect(response.body.foods).toHaveLength(2);
        expect(response.body.foods[0].name.toLowerCase()).toContain('greek yogurt');
        expect(response.body.foods[0]).toMatchObject({ calories: 100, protein: 15 });
        expect(response.body.foods[1]).toMatchObject({ name: 'granola', calories: 200, protein: 5 });
    });

    it('targets the last nearby item when only that item has dictated facts', async () => {
        const providerResponse = new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({
                foods: [
                    { name: 'Greek Yogurt', calories: 130, protein: 17, carbs: 8, fiber: 0, fat: 0, sugar: 7, quantity: 1, confidence: 'medium', source: 'AI estimate', sourceType: 'estimate' },
                    { name: 'Granola', calories: 450, protein: 10, carbs: 60, fiber: 5, fat: 18, sugar: 20, quantity: 1, confidence: 'medium', source: 'AI estimate', sourceType: 'estimate' },
                ],
            }) } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse));

        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'Greek yogurt and granola 200 calories 5 g protein',
                source: 'search',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body.foods[0].name.toLowerCase()).toContain('greek yogurt');
        expect(response.body.foods[0]).toMatchObject({ calories: 130, protein: 17 });
        expect(response.body.foods[1]).toMatchObject({ name: 'Granola', calories: 200, protein: 5, nutritionBasis: 'user-provided' });
    });

    it('zeros non-explicit macros when the user assigns remaining calories to carbs', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: "I did a protein shake with 30 g of protein and it's about 500 cal so however many of the rest of the calories are in carbs",
                source: 'voice',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body.foods[0]).toMatchObject({
            calories: 500,
            protein: 30,
            carbs: 95,
            fiber: 0,
            netCarbs: 95,
            fat: 0,
            sugar: 0,
        });
    });

    it('derives missing fiber from database total carbs and dictated net carbs', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: 'Quest Supreme whole pizza should be 4 net carbs and 760 calories for the whole pizza',
                source: 'voice',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body.foods[0]).toMatchObject({
            calories: 760,
            carbs: 54,
            fiber: 50,
            netCarbs: 4,
            nutritionBasis: 'user-provided',
        });
    });

    it('flags contradictory dictated calories and macros without rewriting either value', async () => {
        const response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: "McDonald's Big Mac 100 calories 40 g protein 30 g carbs 20 g fat",
                source: 'search',
            },
        });

        expect(response.status).toBe(200);
        expect(response.body.foods[0]).toMatchObject({
            calories: 100,
            protein: 40,
            carbs: 30,
            fat: 20,
            needsVerification: true,
            nutritionWarnings: expect.arrayContaining(['user-calories-macro-mismatch']),
        });
    });
});
