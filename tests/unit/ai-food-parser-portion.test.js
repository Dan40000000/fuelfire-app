import { describe, expect, it } from 'vitest';

import {
    applyNutritionPlausibilityValidation,
    applyOfficialNutritionReplacement,
    extractServingQuantityFromQuery,
} from '../../api/ai-food-parser.js';

describe('AI food parser portion reconciliation', () => {
    it.each([
        ['three bananas', { serving: '1 medium banana', name: 'Banana' }, 3],
        ['four eggs', { serving: '1 large egg', name: 'Egg' }, 4],
        ['24 wings', { serving: '1 wing', name: 'Chicken Wing' }, 24],
        ['six dumplings', { serving: '1 dumpling', name: 'Dumpling' }, 6],
        ['4 blueberry muffins', { serving: '2 muffins (81g)', name: 'Blueberry Muffins' }, 2],
        ['4 large blueberry muffins', { serving: '1 large bakery muffin', name: 'Large Blueberry Muffin' }, 4],
        ['6 Johnsonville Vermont Maple Syrup breakfast sausage links', { serving: '3 cooked links (55g)', name: 'Breakfast Sausage Links' }, 2],
        ['2 orders of 10-piece chicken nuggets', { serving: '10 pieces', name: '10-piece Chicken Nuggets' }, 2],
        ['6 pork ribs', { serving: '1 medium cooked pork rib (bone excluded)', name: 'Pork Rib' }, 6],
    ])('extracts the consumed amount from "%s"', (query, reference, expected) => {
        expect(extractServingQuantityFromQuery(query, reference)).toBe(expected);
    });

    it('does not confuse measurements or calorie values with food counts', () => {
        expect(extractServingQuantityFromQuery(
            '4 oz chicken breast',
            { serving: '4 oz chicken breast', name: 'Chicken Breast' },
        )).toBe(1);
        expect(extractServingQuantityFromQuery(
            '500 calorie burger',
            { serving: '1 burger', name: 'Burger' },
        )).toBe(1);
    });

    it('replaces official grouped nutrition and its serving multiplier atomically', () => {
        const replacement = applyOfficialNutritionReplacement(
            {
                name: 'Chicken Nugget', serving: '1 nugget', quantity: 10,
                calories: 41, protein: 2.5, carbs: 2.4, fiber: 0, netCarbs: 2.4, fat: 2.4,
                confidence: 'medium', sourceType: 'estimate',
            },
            {
                name: '10-piece Chicken Nuggets', serving: '10 pieces',
                calories: 410, protein: 25, carbs: 24, fiber: 1, netCarbs: 23, fat: 24, sugar: 0,
                sourceUrl: 'https://example.com/official-nutrition',
            },
            '10-piece chicken nuggets',
        );

        expect(replacement).toMatchObject({
            name: '10-piece Chicken Nuggets', serving: '10 pieces', quantity: 1,
            calories: 410, protein: 25, carbs: 24, fat: 24,
            sourceType: 'official', officiallyVerified: true,
        });
        expect(replacement.calories * replacement.quantity).toBe(410);
    });

    it('keeps two official grouped orders as two groups, not twenty multipliers', () => {
        const replacement = applyOfficialNutritionReplacement(
            { name: 'Chicken Nuggets', serving: '1 nugget', quantity: 20, sourceType: 'estimate' },
            {
                name: '10-piece Chicken Nuggets', serving: '10 pieces',
                calories: 410, protein: 25, carbs: 24, fiber: 1, fat: 24, sugar: 0,
                sourceUrl: 'https://example.com/official-nutrition',
            },
            '2 orders of 10-piece chicken nuggets',
        );

        expect(replacement).toMatchObject({ serving: '10 pieces', quantity: 2, calories: 410 });
        expect(replacement.calories * replacement.quantity).toBe(820);
    });

    it('flags impossible macro math instead of leaving high confidence', () => {
        const result = applyNutritionPlausibilityValidation({
            name: 'Impossible Shake', calories: 100, protein: 80, carbs: 40,
            fiber: 50, netCarbs: 60, fat: 30, confidence: 'high', sourceType: 'estimate',
        });

        expect(result).toMatchObject({ confidence: 'low', needsVerification: true });
        expect(result.nutritionWarnings).toEqual(expect.arrayContaining([
            'fiber-exceeds-carbs',
            'net-carbs-exceed-carbs',
            'macro-calories-exceed-declared-calories',
        ]));
    });

    it('does not downgrade plausible label rounding', () => {
        const result = applyNutritionPlausibilityValidation({
            name: 'Protein Shake', calories: 160, protein: 30, carbs: 6,
            fiber: 1, netCarbs: 5, fat: 2, confidence: 'high', sourceType: 'label',
        });

        expect(result).toMatchObject({ confidence: 'high' });
        expect(result.nutritionWarnings).toBeUndefined();
    });
});
