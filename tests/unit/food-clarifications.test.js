import { describe, expect, it } from 'vitest';

import {
    buildHighImpactClarifyingQuestions,
    isPhotoCompletenessQuestion,
    mergeClarifyingQuestions,
    sanitizeClarifyingQuestions,
    selectPhotoClarifyingQuestions,
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

    it('removes photo completeness questions while retaining useful explicit count questions', () => {
        expect(isPhotoCompletenessQuestion({ question: 'Did you eat all of the photographed food?' })).toBe(true);
        expect(isPhotoCompletenessQuestion({ question: 'What fraction of the portion did you eat?' })).toBe(true);
        expect(selectPhotoClarifyingQuestions([
            { id: 'ate_everything', question: 'Ate everything?', estimatedCalorieImpact: 600 },
            { id: 'portion_eaten', question: 'What portion did you eat?', estimatedCalorieImpact: 500 },
        ], { foods: [{ name: 'Breakfast sausage links' }] })).toEqual([]);

        expect(selectPhotoClarifyingQuestions([{
            id: 'cracker_count', question: 'How many crackers did you eat?',
            affectedFood: 'Crackers', answerType: 'number', estimatedCalorieImpact: 80,
        }], { foods: [{ name: 'Crackers', serving: '1 cracker', quantity: 1 }] })).toEqual([
            expect.objectContaining({ id: 'cracker_count', answerType: 'number' }),
        ]);
    });

    it('keeps materially useful patty size and tuna packing questions', () => {
        expect(selectPhotoClarifyingQuestions([
            { id: 'patty_size', question: 'Were the patties 1/4 lb or 1/2 lb?', affectedFood: 'beef patties', estimatedCalorieImpact: 300 },
        ], { foods: [{ name: 'Beef patties' }] })).toEqual([
            expect.objectContaining({ id: 'patty_size' }),
        ]);
        expect(selectPhotoClarifyingQuestions([
            { id: 'tuna_packing_liquid', question: 'Was the tuna packed in water or oil?', affectedFood: 'Canned tuna', estimatedCalorieImpact: 90 },
        ], { foods: [{ name: 'Canned tuna' }] })).toEqual([
            expect.objectContaining({ id: 'tuna_packing_liquid' }),
        ]);
    });

    it('asks one high-impact preparation question for a multi-cup popcorn plate', () => {
        const questions = buildHighImpactClarifyingQuestions({
            photo: true,
            foods: [{ name: 'Popped popcorn', serving: '1 cup popped', quantity: 6 }],
        });
        expect(selectPhotoClarifyingQuestions(questions, {
            foods: [{ name: 'Popped popcorn', serving: '1 cup popped', quantity: 6 }],
        })).toEqual([
            expect.objectContaining({
                id: 'popcorn_preparation',
                acceptsVoice: true,
                estimatedCalorieImpact: 180,
            }),
        ]);

        expect(buildHighImpactClarifyingQuestions({
            photo: true,
            query: 'User note: air-popped',
            foods: [{ name: 'Popped popcorn', serving: '1 cup popped', quantity: 6 }],
        })).toEqual([]);
    });

    it('returns at most one question, ordered by estimated calorie impact, and drops low-impact fat noise', () => {
        const result = selectPhotoClarifyingQuestions([
            { id: 'cooking_spray', question: 'Was a light spray used?', affectedFood: 'eggs', estimatedCalorieImpact: 10 },
            { id: 'cracker_count', question: 'How many crackers did you eat?', affectedFood: 'crackers', estimatedCalorieImpact: 80 },
            { id: 'patty_size', question: 'Were the patties 1/4 lb or 1/2 lb?', affectedFood: 'patties', estimatedCalorieImpact: 300 },
        ], { foods: [{ name: 'crackers' }, { name: 'patties' }] });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('patty_size');
    });

    it('asks for rib species and count when the model guesses beef without user or label evidence', () => {
        const questions = buildHighImpactClarifyingQuestions({
            photo: true,
            foods: [{ name: 'Smoked beef rib meat', serving: 'estimated edible portion' }],
        });

        expect(questions).toEqual([
            expect.objectContaining({
                id: 'rib_details',
                question: 'What kind of ribs are these, and about how many?',
                examples: ['4 pork ribs', '6 pork ribs', '8 pork ribs', '2 beef ribs', 'Not sure'],
                acceptsVoice: true,
            }),
        ]);
    });

    it('requires a count in addition to an explicit rib species', () => {
        const guessedFoods = [{ name: 'Smoked beef rib meat', serving: 'estimated edible portion' }];

        expect(buildHighImpactClarifyingQuestions({
            photo: true,
            query: 'User note: pork ribs',
            foods: guessedFoods,
        })).toEqual([expect.objectContaining({ id: 'rib_details' })]);
        expect(buildHighImpactClarifyingQuestions({
            photo: true,
            query: 'User note: 0 pork ribs',
            foods: guessedFoods,
        })).toEqual([expect.objectContaining({ id: 'rib_details' })]);
        expect(buildHighImpactClarifyingQuestions({
            photo: true,
            query: 'User note: 6 pork ribs',
            foods: guessedFoods,
        })).toEqual([]);
        expect(buildHighImpactClarifyingQuestions({
            photo: true,
            evidenceText: 'Readable package label: 6 beef ribs',
            foods: guessedFoods,
        })).toEqual([]);
    });

    it('keeps rib species and count ahead of lower-impact photo questions', () => {
        const result = selectPhotoClarifyingQuestions([
            { id: 'cooking_oil', question: 'Was oil used?', affectedFood: 'ribs', estimatedCalorieImpact: 500 },
            {
                id: 'rib_details', question: 'What kind of ribs are these, and about how many?',
                affectedFood: 'Ribs', examples: ['4 pork ribs', '6 pork ribs', '8 pork ribs', '2 beef ribs', 'Not sure'], estimatedCalorieImpact: 5,
            },
            { id: 'rib_size', question: 'Were the ribs small or large?', affectedFood: 'ribs', estimatedCalorieImpact: 300 },
        ], { foods: [{ name: 'Smoked beef rib meat' }] });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('rib_details');
    });

    it('does not repeat a rib question when user or label context already supplies species and count', () => {
        const question = {
            id: 'rib_details', question: 'What kind of ribs are these, and about how many?',
            affectedFood: 'Ribs', estimatedCalorieImpact: 700,
        };

        expect(selectPhotoClarifyingQuestions([question], {
            query: 'User note: 6 pork ribs',
            foods: [{ name: 'Smoked beef rib meat' }],
        })).toEqual([]);
        expect(selectPhotoClarifyingQuestions([question], {
            evidenceText: 'Readable package label: 6 beef ribs',
            foods: [{ name: 'Smoked beef rib meat' }],
        })).toEqual([]);
    });
});
