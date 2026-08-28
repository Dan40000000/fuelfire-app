import { describe, expect, it } from 'vitest';

import {
    buildHighImpactClarifyingQuestions,
    mergeClarifyingQuestions,
    sanitizeClarifyingQuestions,
} from '../../api/_lib/food-clarifications.js';

describe('food clarification contract', () => {
    const foods = [
        { name: 'Canned tuna', serving: '1 five-ounce can' },
        { name: 'Ritz-style butter crackers', serving: '1 cracker' },
    ];

    it('asks the two high-impact questions for an ambiguous tuna-and-cracker meal', () => {
        expect(buildHighImpactClarifyingQuestions({ query: '', foods })).toEqual([
            expect.objectContaining({ id: 'tuna_packing_liquid', acceptsVoice: true }),
            expect.objectContaining({ id: 'cracker_count', answerType: 'number', acceptsVoice: true }),
        ]);
    });

    it('removes questions once spoken answers are present', () => {
        expect(buildHighImpactClarifyingQuestions({
            query: 'tuna packing liquid: water, cracker count: 10',
            foods,
        })).toEqual([]);
    });

    it('uses readable image evidence and sanitizes model-proposed questions', () => {
        const deterministic = buildHighImpactClarifyingQuestions({
            query: '',
            evidenceText: 'Chunk light tuna in water',
            foods,
        });
        expect(deterministic.map((question) => question.id)).toEqual(['cracker_count']);

        const merged = mergeClarifyingQuestions(deterministic, sanitizeClarifyingQuestions([{
            id: 'cooking-fat',
            question: 'Was any mayonnaise mixed into the tuna?',
            examples: ['No', '1 tablespoon', '2 tablespoons'],
            acceptsVoice: true,
            estimatedCalorieImpact: 100,
        }]));
        expect(merged.map((question) => question.id)).toEqual(['cracker_count', 'cooking_fat']);
    });
});
