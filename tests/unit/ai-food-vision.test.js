import { describe, expect, it } from 'vitest';
import {
    applyPackagedServingMath,
    applyVisibleNutritionLabel,
    calculateTotals,
    deriveHintLookupQueries,
    sanitizeVisionFoods,
} from '../../api/ai-food-vision.js';

describe('AI food vision normalization', () => {
    it('uses visible label values instead of a generic visual estimate', () => {
        const foods = [{
            name: 'Cottage Cheese', quantity: 1, serving: '1/2 cup', calories: 110,
            protein: 13, carbs: 4, fiber: 0, netCarbs: 4, fat: 5, sugar: 3,
            confidence: 'medium', dataSource: 'estimate',
        }];
        const result = applyVisibleNutritionLabel(foods, {
            hasNutritionFacts: true,
            servingSize: '1 container (170g)', servingsPerContainer: 1,
            calories: 160, protein: 14, carbs: 15, fiber: 0, fat: 5, sugar: 11,
        }, 'Daisy cottage cheese, nutrition facts visible');

        expect(result[0]).toMatchObject({
            calories: 160, protein: 14, carbs: 15, netCarbs: 15, fat: 5, sugar: 11,
        });
    });

    it('preserves estimated fields that were unreadable on a partial label', () => {
        const foods = [{
            name: 'Protein Shake', quantity: 1, serving: '1 bottle', calories: 220,
            protein: 30, carbs: 12, fiber: 2, netCarbs: 10, fat: 5, sugar: 7,
            confidence: 'medium', dataSource: 'visual estimate',
        }];
        const result = applyVisibleNutritionLabel(foods, {
            hasNutritionFacts: true,
            servingSize: '1 bottle',
            calories: 190,
            protein: 26,
        }, 'nutrition label visible but partly obscured');

        expect(result[0]).toMatchObject({
            calories: 190,
            protein: 26,
            carbs: 12,
            fiber: 2,
            netCarbs: 10,
            fat: 5,
            sugar: 7,
            labelExtracted: true,
        });
    });

    it('scales a quarter-pizza label to a whole pizza', () => {
        const foods = [{
            name: 'Supreme Pizza', quantity: 1, serving: '1/4 pizza', calories: 310,
            protein: 14, carbs: 31, fiber: 1, netCarbs: 30, fat: 15, sugar: 4,
        }];
        const result = applyPackagedServingMath(foods, 'whole pizza', {});

        expect(result[0].quantity).toBe(4);
        expect(calculateTotals(result)).toMatchObject({ calories: 1240, protein: 56, carbs: 124 });
    });

    it('normalizes vague sausage and popcorn estimates conservatively', () => {
        const result = sanitizeVisionFoods([
            { name: 'Breakfast Sausage Links', serving: '2 large links', quantity: 1, calories: 120, protein: 7, carbs: 1, fat: 9 },
            { name: 'Mixed Popcorn', serving: '6 cups', quantity: 1, calories: 250, protein: 12, carbs: 22, fat: 10 },
        ], 'large thick sausage links and six cups mixed popcorn');

        expect(result).toHaveLength(2);
        expect(result.every((food) => food.calories > 0)).toBe(true);
        expect(result.every((food) => ['high', 'medium', 'low'].includes(food.confidence))).toBe(true);
    });

    it('ranks explicit brand context ahead of generic filename hints', () => {
        const queries = deriveHintLookupQueries(
            'Daisy cottage cheese, 1 container, nutrition label visible',
            'IMG_5526.jpg',
            ['cottage cheese'],
        );

        expect(queries[0].toLowerCase()).toContain('daisy');
    });

    it('does not turn photo instructions into extra food lookup items', () => {
        const queries = deriveHintLookupQueries(
            'one whole Margherita pizza; estimate the entire visible pizza, not one slice',
            'Whole Margherita Pizza.jpg',
        );

        expect(queries[0].toLowerCase()).toBe('one whole margherita pizza');
        expect(queries.every((query) => !query.toLowerCase().includes('estimate the entire'))).toBe(true);
        expect(queries.every((query) => !query.toLowerCase().includes('not one slice'))).toBe(true);
    });
});
