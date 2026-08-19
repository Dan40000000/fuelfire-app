import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let personalization;

beforeAll(() => {
    personalization = require('../../public/food-personalization.js');
});

const eggs = {
    name: '2x Eggs', quantity: 2, serving: '1 large egg', calories: 140,
    protein: 12, carbs: 0, fiber: 0, netCarbs: 0, fat: 10, sugar: 0,
    baseNutrition: { calories: 70, protein: 6, carbs: 0, fiber: 0, netCarbs: 0, fat: 5, sugar: 0 }
};
const sausage = {
    name: '3x Small Sausage Links', quantity: 3, serving: '1 small link', calories: 170,
    protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1,
    baseNutrition: { calories: 56.67, protein: 3.33, carbs: 0.67, fiber: 0, netCarbs: 0.67, fat: 4.33, sugar: 0.33 }
};

describe('food personalization', () => {
    it('does not trust a one-off visual estimate as saved truth', () => {
        expect(personalization.isMemoryEligible({
            name: 'Pizza', count: 1, source: 'AI visual estimate', sourceType: 'estimate'
        })).toBe(false);
        expect(personalization.isMemoryEligible({
            name: 'Pizza', count: 3, source: 'AI visual estimate', sourceType: 'estimate'
        })).toBe(true);
    });

    it('lets a confirmed correction beat a generic estimate but not a visible label', () => {
        const correction = { name: 'Large Sausage Link', count: 1, correctionCount: 1, memoryAction: 'corrected' };
        expect(personalization.shouldMemoryOverride(
            { name: 'Sausage Link', sourceType: 'estimate', source: 'visual estimate' },
            correction
        )).toBe(true);
        expect(personalization.shouldMemoryOverride(
            { name: 'Sausage Link', labelExtracted: true, dataSource: 'Visible Nutrition Facts label' },
            correction
        )).toBe(false);
    });

    it('rejects a saved small-food match when the new item is explicitly large', () => {
        const small = { name: 'Small Sausage Link', serving: '1 small link', count: 5, sourceType: 'user-saved', fromFoodMemory: true };
        expect(personalization.shouldMemoryOverride(
            { name: 'Large Sausage Link', serving: '1 large thick link', sourceType: 'estimate' },
            small
        )).toBe(false);
    });

    it('saves and resolves a multi-food usual breakfast without an AI call', () => {
        const bundle = personalization.createMealBundle('Dan usual breakfast', [eggs, sausage], 'breakfast', ['eggs and sausage'], '2026-08-19T12:00:00.000Z');
        const match = personalization.findMealBundle('log my usual breakfast', [bundle]);
        const foods = personalization.bundleToFoods(match);

        expect(match.id).toBe(bundle.id);
        expect(foods).toHaveLength(2);
        expect(foods[0]).toMatchObject({ quantity: 2, calories: 70, sourceType: 'user-saved', fromSavedMeal: true });
    });

    it('suggests saving a repeated combination only after three logs', () => {
        let patterns = [];
        let pattern;
        for (let index = 0; index < 3; index += 1) {
            ({ patterns, pattern } = personalization.recordMealPattern(patterns, [eggs, sausage], 'breakfast', `2026-08-1${index + 7}T12:00:00.000Z`));
        }
        expect(personalization.getMealSaveSuggestion(pattern, [], 3)).toMatchObject({ count: 3, suggestedName: 'Usual breakfast' });
        const bundle = personalization.createMealBundle('Usual breakfast', [eggs, sausage], 'breakfast');
        expect(personalization.getMealSaveSuggestion(pattern, [bundle], 3)).toBeNull();
    });

    it('rounds foreground location and strips unrelated data', () => {
        expect(personalization.sanitizeLocationContext({
            latitude: 39.739236,
            longitude: -104.990251,
            accuracyMeters: 31.8,
            restaurant: 'should not pass through'
        })).toEqual({ latitude: 39.739, longitude: -104.99, accuracyMeters: 32 });
    });
});
