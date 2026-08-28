#!/usr/bin/env node

import fs from 'fs';
import foodParserHandler from '../api/ai-food-parser.js';
import {
    applyPackagedServingMath,
    deriveHeuristicLookupQuery,
    deriveHintLookupQuery,
    deriveHintLookupQueries,
    derivePostVisionLookupQueries,
    deriveRestaurant,
    applyVisibleNutritionLabel,
    sanitizeVisionFoods,
    shouldPreferHintLookupBeforeVision,
    shouldUseVisionNutritionWithoutParser,
} from '../api/ai-food-vision.js';
import { getTestAuthHeaders, invokeApi, loadEnvFile } from './lib/api-test-utils.js';

loadEnvFile('.env.local');
delete process.env.CLAUDE_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.FOOD_AI_API_KEY;
delete process.env.HF_TOKEN;
delete process.env.HUGGING_FACE_HUB_TOKEN;
delete process.env.FOOD_AI_BASE_URL;

const outputDir = process.env.AI_FOOD_REGRESSION_OUTPUT_DIR || 'output/test-results';
fs.mkdirSync(outputDir, { recursive: true });

const voiceCases = [
    {
        name: 'Voice McDonald Sausage Egg McMuffin',
        query: "McDonald's sausage egg McMuffin",
        expected: { calories: 480, protein: 21, carbs: 29, fat: 31 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.05, fat: 0.05 },
    },
    {
        name: 'Voice McMuffin Explicit Calories',
        query: "McDonald's sausage egg McMuffin 480 calories",
        expected: { calories: 480, protein: 21, carbs: 29, fat: 31 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.05, fat: 0.05 },
    },
    {
        name: 'Voice Calories Only',
        query: 'add three hundred calories',
        expected: { calories: 300, protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01 },
    },
    {
        name: 'Voice Spoken Macros',
        query: 'protein shake two hundred calories thirty grams protein eight carbs two fat',
        expected: { calories: 200, protein: 30, carbs: 8, fat: 2 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
    },
    {
        name: 'Voice Protein Shake Remaining Calories As Carbs',
        query: "I did a protein shake with 30 g of protein and it's about 500 cal so however many of the rest of the calories are in carbs",
        expected: { calories: 500, protein: 30, carbs: 95, fiber: 0, netCarbs: 95, fat: 0, sugar: 0 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedFirstFoodName: 'Protein Shake (generic)',
    },
    {
        name: 'Voice Six Item Food List',
        query: '2 eggs, banana, oatmeal, protein shake, chicken breast, rice',
        expected: { calories: 924, protein: 79, carbs: 109, fat: 19 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
        expectedFoodCount: 6,
        expectedFoodNames: [
            'Egg (large)',
            'Banana (medium)',
            'Oatmeal (1 cup cooked)',
            'Protein Shake (generic)',
            'Grilled Chicken Breast (4 oz)',
            'White Rice (1 cup cooked)',
        ],
    },
    {
        name: 'Voice Rich Transcript Beats Short Alternative',
        query: '2 eggs and banana and oatmeal and protein shake and chicken breast and rice',
        alternatives: ['chicken breast'],
        expected: { calories: 924, protein: 79, carbs: 109, fat: 19 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
        expectedFoodCount: 6,
    },
    {
        name: 'Voice Repeated Foods Preserve Quantity',
        query: '2 eggs and 2 eggs',
        expected: { calories: 280, protein: 24, carbs: 4, fat: 20 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
        expectedFoodCount: 1,
    },
    {
        name: 'Voice Two Ounces Doritos',
        query: '2 oz Doritos',
        expected: { calories: 280, protein: 4, carbs: 36, fat: 14, sugar: 2 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
    {
        name: 'Voice Two Cups Oatmeal',
        query: '2 cups oatmeal',
        expected: { calories: 308, protein: 12, carbs: 54, fiber: 8, netCarbs: 46, fat: 6, sugar: 2 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
    {
        name: 'Voice Usual Food Uses Confirmed Memory Before Generic Database',
        query: 'my usual cottage cheese',
        foodMemoryHints: [{
            name: 'Daisy Cottage Cheese', serving: '1 container (170g)', calories: 160,
            protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11,
            source: 'Saved correction', aliases: ['usual cottage cheese', 'daisy cottage cheese'],
        }],
        expected: { calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedFirstFoodName: 'Daisy Cottage Cheese',
    },
    {
        name: 'Voice Zero Calorie Saved Food Memory',
        query: 'my usual diet soda',
        foodMemoryHints: [{
            name: 'Diet Soda', serving: '1 can', calories: 0,
            protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0, sugar: 0,
            source: 'Saved correction', aliases: ['usual diet soda', 'diet soda'],
        }],
        expected: { calories: 0, protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0, sugar: 0 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedFirstFoodName: 'Diet Soda',
    },
    {
        name: 'Voice Two Chicken Breasts Applies Leading Quantity',
        query: '2 chicken breasts',
        expected: { calories: 280, protein: 52, carbs: 0, fat: 6 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
        expectedFirstFoodName: 'Grilled Chicken Breast (4 oz)',
    },
    {
        name: 'Voice Explicit Nutrition For Multiple Foods Is A Total',
        query: '2 chicken breasts 500 calories 60 protein total',
        expected: { calories: 500, protein: 60 },
        tolerance: { calories: 0.01, protein: 0.01 },
        expectedFirstFoodName: 'Grilled Chicken Breast (4 oz)',
    },
    {
        name: 'Voice Explicit Nutrition Per Item Remains Per Item',
        query: '2 chicken breasts 250 calories 30 protein each',
        expected: { calories: 500, protein: 60 },
        tolerance: { calories: 0.01, protein: 0.01 },
        expectedFirstFoodName: 'Grilled Chicken Breast (4 oz)',
    },
    {
        name: 'Voice Six Cups Popcorn',
        query: 'six cups popcorn',
        expected: { calories: 186, protein: 6, carbs: 36, fiber: 6, netCarbs: 30, fat: 0, sugar: 0 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedFirstFoodName: 'Popcorn (air-popped, 1 cup)',
    },
    {
        name: 'Voice Misheard Sick Cups Pop Corn',
        query: 'sick cups pop corn',
        expected: { calories: 186, protein: 6, carbs: 36, fiber: 6, netCarbs: 30, fat: 0, sugar: 0 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedFirstFoodName: 'Popcorn (air-popped, 1 cup)',
    },
    {
        name: 'Voice Two Large Sausage Links',
        query: '2 large sausage links',
        expected: { calories: 450, protein: 20, carbs: 4, fiber: 0, netCarbs: 4, fat: 40, sugar: 2 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedFirstFoodName: 'Large Sausage Link',
    },
    {
        name: 'Voice Ambiguous Sausage Links Ask Size',
        query: '6 sausage links',
        expected: { calories: 1350, protein: 60, carbs: 12, fiber: 0, netCarbs: 12, fat: 120, sugar: 6 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedClarifyingQuestionIds: ['sausage_size'],
    },
    {
        name: 'Voice Custom Chipotle Bowl Counts Named Ingredients Once',
        query: 'Chipotle bowl with chicken, cilantro-lime white rice, black beans, fajita veggies, fresh tomato salsa, cheese, and romaine lettuce',
        expected: { calories: 680, protein: 51, carbs: 73, fat: 21 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
        expectedFoodCount: 7,
    },
    {
        name: 'Voice Blueberry Muffins Standard Count',
        query: '4 blueberry muffins',
        expected: { calories: 540, protein: 6, carbs: 126, fiber: 2, netCarbs: 124, fat: 2, sugar: 62 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
        expectedClarifyingQuestionIds: ['muffin_size'],
    },
    {
        name: 'Voice Blueberry Muffins Large Count',
        query: '4 large blueberry muffins',
        expected: { calories: 1540, protein: 24, carbs: 220, fiber: 4, netCarbs: 216, fat: 60, sugar: 112 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
    {
        name: 'Voice Quest Misheard Net Carbs',
        query: 'Quest supreme full pizza should be Fournett carbs and 760 cal for the whole pizza',
        expected: { calories: 760, protein: 60, carbs: 54, fiber: 50, netCarbs: 4, fat: 51 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.05 },
    },
    {
        name: 'Voice Quest Heard As Question',
        query: 'question supreme full pizza should be four net carbs and 760 cal for the whole pizza',
        expected: { calories: 760, protein: 60, carbs: 54, fiber: 50, netCarbs: 4, fat: 51 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.05 },
    },
    {
        name: 'Voice Trolli Spelling Drift',
        query: 'Trolley sour bright eggs',
        expected: { calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
    {
        name: 'Text Daisy Cottage Cheese Container Label',
        query: 'Daisy cottage cheese 1 container 170g 160 calories 15 carbs 11 sugar 14 protein',
        expected: { calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
];

const photoFixtureCases = [
    {
        name: 'Photo Fixture Johnsonville Sausage Overestimate',
        fileName: 'johnsonville-vermont-maple-sausage-links.jpg',
        rawVisionFoods: [
            {
                name: '6x Sausage Links',
                calories: 900,
                protein: 72,
                carbs: 6,
                fat: 66,
                serving: '6 links',
                dataSource: 'Johnsonville Vermont Maple Syrup package visible',
                quantity: 1,
                confidence: 'medium',
            },
        ],
        expectedLookupIncludes: ['johnsonville', 'sausage links'],
        expected: { calories: 340, protein: 20, carbs: 4, fiber: 0, netCarbs: 4, fat: 26 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01 },
    },
    {
        name: 'Photo Fixture Two Large Sausage Links Not Small Breakfast',
        fileName: 'two-large-sausage-links.jpg',
        rawVisionFoods: [
            {
                name: 'Breakfast Sausage Links',
                calories: 113,
                protein: 7,
                carbs: 1,
                fat: 9,
                sugar: 1,
                serving: '2 large browned links on plate',
                dataSource: 'Photo shows two thick browned full-size sausage links on a plate',
                quantity: 2,
                confidence: 'low',
            },
        ],
        expectedLookupIncludes: ['large', 'sausage links'],
        forbiddenLookupIncludes: ['small breakfast'],
        expected: { calories: 450, protein: 20, carbs: 4, fiber: 0, netCarbs: 4, fat: 40, sugar: 2 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
    {
        name: 'Photo Fixture Quest Explicit Label Values',
        fileName: 'quest-supreme-pizza-net-carbs.jpg',
        lookupQuery: 'Quest supreme full pizza should be Fournett carbs and 760 cal for the whole pizza',
        rawVisionFoods: [
            {
                name: 'Quest Supreme Full Pizza',
                calories: 760,
                protein: 60,
                carbs: 54,
                fiber: 50,
                netCarbs: 4,
                fat: 51,
                serving: 'whole pizza',
                dataSource: 'front package says 4g net carbs',
                confidence: 'high',
            },
        ],
        expectedLookupIncludes: ['quest', '760', 'net'],
        expected: { calories: 760, protein: 60, carbs: 54, fiber: 50, netCarbs: 4, fat: 51 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.05 },
    },
    {
        name: 'Photo Fixture Quest Brand Is Not Generic Pizza',
        fileName: 'quest-supreme-pizza.jpg',
        lookupQuery: 'Quest Supreme full pizza',
        rawVisionFoods: [
            {
                name: 'Quest Supreme Full Pizza',
                calories: 900,
                protein: 40,
                carbs: 90,
                fat: 35,
                serving: 'whole pizza',
                dataSource: 'Quest branded package front',
                confidence: 'medium',
            },
        ],
        expectedLookupIncludes: ['quest', 'supreme', 'pizza'],
        expected: { calories: 780, protein: 60, carbs: 54, fiber: 36, netCarbs: 18, fat: 51 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01 },
    },
    {
        name: 'Photo Fixture Trolli Package Spelling',
        fileName: 'trolli-sour-brite-eggs.jpg',
        rawVisionFoods: [
            {
                name: 'Trolley Sour Bright Eggs Candy',
                calories: 130,
                protein: 8,
                carbs: 122,
                fat: 0,
                serving: 'package label visible',
                confidence: 'medium',
            },
        ],
        expectedLookupIncludes: ['trolli', 'sour brite eggs'],
        expected: { calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
    {
        name: 'Photo Fixture Kirkland Cauliflower Whole Pizza Label',
        fileName: 'kirkland-signature-supreme-cauliflower-crust-pizza-label.jpg',
        rawVisionFoods: [
            {
                name: 'Kirkland Signature Supreme Cauliflower Crust Pizza',
                calories: 310,
                protein: 14,
                carbs: 31,
                fiber: 1,
                netCarbs: 30,
                fat: 15,
                sugar: 4,
                serving: '1/4 Pizza (138g)',
                dataSource: 'Kirkland package nutrition label',
                quantity: 4,
                confidence: 'high',
            },
        ],
        expectedLookupIncludes: ['kirkland', 'whole', 'pizza'],
        expected: { calories: 1240, protein: 56, carbs: 124, fiber: 4, netCarbs: 120, fat: 60, sugar: 16 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
    {
        name: 'Photo Voice Note Alternatives Rescue Brand Lookup',
        fileName: 'pizza-photo.jpg',
        imageContext: 'question supreme pizza',
        imageContextAlternatives: [
            'Quest supreme whole pizza 760 calories 4 net carbs',
            'Quest Supreme full pizza'
        ],
        rawVisionFoods: [],
        expectedLookupIncludes: ['quest', '760', 'net'],
        expected: { calories: 760, protein: 60, carbs: 54, fiber: 50, netCarbs: 4, fat: 51 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.05 },
    },
    {
        name: 'Photo Structured Voice Context Large Sausage Links',
        fileName: 'plate-sausage-photo.jpg',
        imageContext: 'Photo type: plate-only photo with no visible package label; Portion detail: 2 large thick sausage links',
        rawVisionFoods: [],
        expectedLookupIncludes: ['large', 'sausage links'],
        expected: { calories: 450, protein: 20, carbs: 4, fiber: 0, netCarbs: 4, fat: 40, sugar: 2 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
];

const hintGuardrailCases = [
    {
        name: 'Generic cauliflower pizza comment must not bypass vision',
        imageContext: 'cauliflower pizza',
        alternatives: [],
        expected: false,
    },
    {
        name: 'Explicit nutrition comment can bypass vision',
        imageContext: 'Quest Supreme whole pizza 760 calories 4 net carbs',
        alternatives: [],
        expected: true,
    },
    {
        name: 'Known branded restaurant comment can bypass vision',
        imageContext: "McDonald's Big Mac burger",
        alternatives: [],
        expected: true,
    },
];

const visionSanitizeCases = [
    {
        name: 'Photo Popcorn OCR Garbage Normalization',
        contextText: 'Plate contains popcorn, approximate volume of 6 cups total mixed popcorn on disposable plate.',
        rawVisionFoods: [
            {
                name: '1mg 5526 meal',
                calories: 250,
                protein: 12,
                carbs: 22,
                fiber: 0,
                netCarbs: 22,
                fat: 10,
                sugar: 5,
                serving: '1 serving',
                dataSource: 'Plate contains popcorn, approximate volume of 6 cups total mixed popcorn on disposable plate.',
                quantity: 1,
                confidence: 'low',
            },
        ],
        expectedFirstFoodName: 'Mixed Popcorn',
        expected: { calories: 250, protein: 6, carbs: 37, fiber: 7, netCarbs: 30, fat: 9 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01 },
    },
];

const servingMathCases = [
    {
        name: 'Whole pizza context scales 1/4 pizza label to 4 servings',
        imageContext: 'Photo type: Nutrition Facts label is visible; Portion eaten: whole item or full package was eaten; Portion detail: whole pizza',
        rawVisionFoods: [
            {
                name: 'Kirkland Signature Supreme Cauliflower Crust Pizza',
                calories: 310,
                protein: 14,
                carbs: 31,
                fiber: 1,
                netCarbs: 30,
                fat: 15,
                sugar: 4,
                serving: '1/4 Pizza (138g)',
                dataSource: 'Kirkland package nutrition label',
                quantity: 1,
                confidence: 'high',
            },
        ],
        expectedQuantity: 4,
    },
    {
        name: 'Visible Nutrition Facts override generic food estimate',
        imageContext: 'Photo type: Nutrition Facts label is visible; Portion eaten: use the label serving size',
        visibleLabel: {
            hasNutritionFacts: true,
            brand: 'Daisy',
            product: 'Cottage Cheese with Pineapple',
            servingSize: '1 container (170g)',
            servingsPerContainer: 1,
            calories: 160,
            protein: 14,
            carbs: 15,
            fiber: 0,
            fat: 5,
            sugar: 11,
            rawText: 'Calories 160; Total Fat 5g; Total Carb 15g; Total Sugars 11g; Protein 14g'
        },
        rawVisionFoods: [
            {
                name: 'Cottage Cheese 4%',
                calories: 110,
                protein: 13,
                carbs: 4,
                fat: 5,
                sugar: 3,
                serving: '1/2 cup',
                dataSource: 'generic cottage cheese estimate',
                quantity: 1,
                confidence: 'medium',
            },
        ],
        expectedQuantity: 1,
        expected: { calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01, sugar: 0.01 },
    },
];

const parserHandoffGuardrailCases = [
    {
        name: 'Visible Daisy container label must not be replaced by generic cottage cheese lookup',
        rawVisionFoods: [
            {
                name: 'Daisy Cottage Cheese',
                calories: 160,
                protein: 14,
                carbs: 15,
                fiber: 0,
                netCarbs: 15,
                fat: 5,
                sugar: 11,
                serving: '1 container (170g)',
                dataSource: 'Visible nutrition label',
                quantity: 1,
                confidence: 'high',
            },
        ],
        parsedPayload: {
            lookupQuery: 'Daisy cottage cheese',
            notes: 'Nutrition Facts label visible: 1 serving per container, serving size 1 container.'
        },
        rawVisionText: 'Nutrition Facts Serving size 1 container Calories 160 Total Carb 15g Protein 14g',
        expected: true,
    },
    {
        name: 'Generic prepared food estimate can still use parser lookup',
        rawVisionFoods: [
            {
                name: 'Chicken nuggets',
                calories: 500,
                protein: 20,
                carbs: 30,
                fat: 30,
                serving: 'visible meal',
                quantity: 1,
                confidence: 'medium',
            },
        ],
        parsedPayload: {
            lookupQuery: "McDonald's 10 nuggets",
            notes: 'Restaurant package visible.'
        },
        rawVisionText: 'Chicken nuggets and fries',
        expected: false,
    },
];

const postVisionLookupCases = [
    {
        name: 'User branded context ranks before generic cottage cheese lookup',
        rawVisionFoods: [
            {
                name: 'Cottage Cheese 4%',
                calories: 110,
                protein: 13,
                carbs: 4,
                fat: 5,
                serving: '1/2 cup',
                quantity: 1,
                confidence: 'medium',
            },
        ],
        parsedPayload: {
            lookupQuery: 'cottage cheese',
            restaurantIdentified: null,
        },
        imageContext: 'Daisy cottage cheese',
        expectedFirst: 'Daisy cottage cheese',
    },
    {
        name: 'Generic context does not outrank branded vision lookup',
        rawVisionFoods: [
            {
                name: 'Kirkland Signature Supreme Cauliflower Crust Pizza',
                calories: 310,
                protein: 14,
                carbs: 31,
                fiber: 1,
                fat: 15,
                serving: '1/4 pizza',
                quantity: 1,
                confidence: 'medium',
            },
        ],
        parsedPayload: {
            lookupQuery: 'cauliflower pizza',
            restaurantIdentified: null,
        },
        imageContext: 'cauliflower pizza',
        expectedFirst: 'Kirkland Signature Supreme Cauliflower Crust Pizza',
    },
];

function totalsFromFoods(foods = []) {
    return foods.reduce((totals, food) => {
        const quantity = Number(food.quantity || 1);
        const carbs = Number(food.carbs || 0);
        const fiber = Number(food.fiber || 0);
        const explicitNetCarbs = Number(food.netCarbs);
        totals.calories += Math.round(Number(food.calories || 0) * quantity);
        totals.protein += Math.round(Number(food.protein || 0) * quantity);
        totals.carbs += Math.round(carbs * quantity);
        totals.fiber += Math.round(fiber * quantity);
        totals.netCarbs += Math.round((Number.isFinite(explicitNetCarbs) ? explicitNetCarbs : Math.max(0, carbs - fiber)) * quantity);
        totals.fat += Math.round(Number(food.fat || 0) * quantity);
        totals.sugar += Math.round(Number(food.sugar || 0) * quantity);
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0, sugar: 0 });
}

function percentDiff(expected, actual) {
    if (expected === 0) return actual === 0 ? 0 : 1;
    return Math.abs(actual - expected) / expected;
}

function checkNutrition(expected, actual, tolerance) {
    const checks = {};
    for (const metric of Object.keys(expected)) {
        const diff = percentDiff(expected[metric], actual[metric]);
        checks[metric] = {
            pass: diff <= (tolerance[metric] ?? 0.2),
            expected: expected[metric],
            actual: actual[metric],
            diff: Number((diff * 100).toFixed(1)),
        };
    }
    return checks;
}

function allChecksPassed(checks) {
    return Object.values(checks).every((check) => check.pass);
}

function lookupContainsAll(lookupQuery, terms = []) {
    const lookup = String(lookupQuery || '').toLowerCase();
    return terms.every((term) => lookup.includes(term.toLowerCase()));
}

function lookupContainsAny(lookupQuery, terms = []) {
    const lookup = String(lookupQuery || '').toLowerCase();
    return terms.some((term) => lookup.includes(term.toLowerCase()));
}

async function parseFood(query, source, extraBody = {}) {
    return invokeApi(foodParserHandler, {
        headers: getTestAuthHeaders(),
        body: {
            query,
            source,
            forceWebSearch: false,
            ...extraBody,
        },
    });
}

async function runVoiceCase(testCase) {
    const response = await parseFood(testCase.query, 'voice', {
        alternatives: testCase.alternatives || [],
        foodMemoryHints: testCase.foodMemoryHints || [],
    });
    const totals = totalsFromFoods(response.body?.foods || []);
    const checks = checkNutrition(testCase.expected, totals, testCase.tolerance);
    const clarifyingQuestionIds = (response.body?.clarifyingQuestions || []).map((question) => question.id);
    const missingClarifyingQuestions = Array.isArray(testCase.expectedClarifyingQuestionIds)
        ? testCase.expectedClarifyingQuestionIds.filter((id) => !clarifyingQuestionIds.includes(id))
        : [];
    const clarificationPass = missingClarifyingQuestions.length === 0;
    const firstFoodName = response.body?.foods?.[0]?.name || '';
    const namePass = !testCase.expectedFirstFoodName || firstFoodName === testCase.expectedFirstFoodName;
    const foodNames = (response.body?.foods || []).map((food) => food.name);
    const countPass = !testCase.expectedFoodCount || foodNames.length === testCase.expectedFoodCount;
    const foodNamesPass = !Array.isArray(testCase.expectedFoodNames)
        || testCase.expectedFoodNames.every((name) => foodNames.includes(name));
    const pass = response.status === 200
        && response.body?.success
        && allChecksPassed(checks)
        && clarificationPass
        && namePass
        && countPass
        && foodNamesPass;

    console.log(`${pass ? 'PASS' : 'FAIL'} voice: ${testCase.name} -> ${totals.calories} cal`);
    return {
        type: 'voice',
        name: testCase.name,
        query: testCase.query,
        pass,
        expected: testCase.expected,
        actual: totals,
        checks,
        clarifyingQuestionIds,
        missingClarifyingQuestions,
        foods: response.body?.foods || [],
        responseSource: response.body?.source || null,
        expectedFirstFoodName: testCase.expectedFirstFoodName || null,
        firstFoodName,
        namePass,
        expectedFoodCount: testCase.expectedFoodCount || null,
        actualFoodCount: foodNames.length,
        countPass,
        expectedFoodNames: testCase.expectedFoodNames || null,
        foodNames,
        foodNamesPass,
    };
}

async function runPhotoFixtureCase(testCase) {
    const foods = sanitizeVisionFoods(testCase.rawVisionFoods);
    const restaurant = deriveRestaurant({ restaurantIdentified: testCase.restaurantIdentified || null }, foods);
    const heuristicLookup = deriveHeuristicLookupQuery(foods, restaurant, testCase.lookupQuery || '', testCase.fileName || '');
    const hintLookups = deriveHintLookupQueries(testCase.imageContext || '', testCase.fileName || '', testCase.imageContextAlternatives || []);
    const fallbackHint = deriveHintLookupQuery(testCase.imageContext || '', testCase.fileName || '');
    const lookupCandidates = heuristicLookup
        ? [heuristicLookup]
        : hintLookups.length ? hintLookups : [fallbackHint];

    let selected = null;
    for (const candidate of lookupCandidates) {
        const candidateResponse = await parseFood(candidate, 'photo-fixture-regression');
        const candidateTotals = totalsFromFoods(candidateResponse.body?.foods || []);
        const candidateChecks = checkNutrition(testCase.expected, candidateTotals, testCase.tolerance);
        const candidateLookupPass = lookupContainsAll(candidate, testCase.expectedLookupIncludes || [])
            && !lookupContainsAny(candidate, testCase.forbiddenLookupIncludes || []);
        const candidatePass = candidateResponse.status === 200
            && candidateResponse.body?.success
            && candidateLookupPass
            && allChecksPassed(candidateChecks);

        if (!selected || candidatePass || (candidateResponse.body?.success && !selected.response?.body?.success)) {
            selected = {
                response: candidateResponse,
                lookupQuery: candidate,
                totals: candidateTotals,
                checks: candidateChecks,
                lookupPass: candidateLookupPass,
                pass: candidatePass
            };
        }
        if (candidatePass) break;
    }

    const response = selected?.response || { status: 0, body: {} };
    const lookupQuery = selected?.lookupQuery || '';
    const totals = totalsFromFoods(response.body?.foods || []);
    const checks = selected?.checks || checkNutrition(testCase.expected, totals, testCase.tolerance);
    const lookupPass = selected?.lookupPass ?? (
        lookupContainsAll(lookupQuery, testCase.expectedLookupIncludes || [])
        && !lookupContainsAny(lookupQuery, testCase.forbiddenLookupIncludes || [])
    );
    const pass = selected?.pass ?? (response.status === 200 && response.body?.success && lookupPass && allChecksPassed(checks));

    console.log(`${pass ? 'PASS' : 'FAIL'} photo-fixture: ${testCase.name} -> lookup="${lookupQuery}" -> ${totals.calories} cal`);
    return {
        type: 'photo-fixture',
        name: testCase.name,
        lookupQuery,
        pass,
        lookupPass,
        expected: testCase.expected,
        actual: totals,
        checks,
        rawVisionFoods: testCase.rawVisionFoods,
        sanitizedFoods: foods,
        foods: response.body?.foods || [],
        responseSource: response.body?.source || null,
    };
}

function runHintGuardrailCase(testCase) {
    const actual = shouldPreferHintLookupBeforeVision(testCase.imageContext, testCase.alternatives);
    const pass = actual === testCase.expected;
    console.log(`${pass ? 'PASS' : 'FAIL'} hint-guardrail: ${testCase.name} -> ${actual}`);
    return {
        type: 'hint-guardrail',
        name: testCase.name,
        pass,
        expected: testCase.expected,
        actual,
    };
}

function runVisionSanitizeCase(testCase) {
    const foods = sanitizeVisionFoods(testCase.rawVisionFoods, testCase.contextText || '');
    const totals = totalsFromFoods(foods);
    const checks = checkNutrition(testCase.expected, totals, testCase.tolerance);
    const firstFoodName = foods[0]?.name || '';
    const namePass = !testCase.expectedFirstFoodName || firstFoodName === testCase.expectedFirstFoodName;
    const pass = namePass && allChecksPassed(checks);
    console.log(`${pass ? 'PASS' : 'FAIL'} vision-sanitize: ${testCase.name} -> ${firstFoodName}, ${totals.calories} cal`);
    return {
        type: 'vision-sanitize',
        name: testCase.name,
        pass,
        expected: testCase.expected,
        actual: totals,
        checks,
        expectedFirstFoodName: testCase.expectedFirstFoodName || null,
        firstFoodName,
        namePass,
        foods,
    };
}

function runServingMathCase(testCase) {
    const foods = applyPackagedServingMath(
        applyVisibleNutritionLabel(
            sanitizeVisionFoods(testCase.rawVisionFoods),
            testCase.visibleLabel,
            testCase.imageContext,
            { lookupQuery: testCase.imageContext, notes: '' }
        ),
        testCase.imageContext,
        { lookupQuery: testCase.imageContext, notes: '' }
    );
    const actualQuantity = Number(foods[0]?.quantity || 0);
    const checks = testCase.expected
        ? checkNutrition(testCase.expected, totalsFromFoods(foods), testCase.tolerance)
        : {};
    const pass = actualQuantity === testCase.expectedQuantity
        && (!testCase.expected || allChecksPassed(checks));
    console.log(`${pass ? 'PASS' : 'FAIL'} serving-math: ${testCase.name} -> qty ${actualQuantity}`);
    return {
        type: 'serving-math',
        name: testCase.name,
        pass,
        expectedQuantity: testCase.expectedQuantity,
        actualQuantity,
        checks,
        foods,
    };
}

function runParserHandoffGuardrailCase(testCase) {
    const foods = sanitizeVisionFoods(testCase.rawVisionFoods);
    const actual = shouldUseVisionNutritionWithoutParser(foods, testCase.parsedPayload, testCase.rawVisionText);
    const pass = actual === testCase.expected;
    console.log(`${pass ? 'PASS' : 'FAIL'} parser-handoff: ${testCase.name} -> ${actual}`);
    return {
        type: 'parser-handoff',
        name: testCase.name,
        pass,
        expected: testCase.expected,
        actual,
        foods,
    };
}

function runPostVisionLookupCase(testCase) {
    const foods = sanitizeVisionFoods(testCase.rawVisionFoods);
    const queries = derivePostVisionLookupQueries({
        foods,
        restaurantIdentified: deriveRestaurant(testCase.parsedPayload, foods),
        currentLookupQuery: testCase.parsedPayload?.lookupQuery || '',
        fileNameHint: testCase.fileName || '',
        imageContext: testCase.imageContext || '',
        imageContextAlternatives: testCase.imageContextAlternatives || [],
    });
    const actualFirst = queries[0] || '';
    const pass = actualFirst === testCase.expectedFirst;
    console.log(`${pass ? 'PASS' : 'FAIL'} post-vision-lookup: ${testCase.name} -> "${actualFirst}"`);
    return {
        type: 'post-vision-lookup',
        name: testCase.name,
        pass,
        expectedFirst: testCase.expectedFirst,
        actualFirst,
        queries,
    };
}

const results = {
    generatedAt: new Date().toISOString(),
    creditPolicy: 'No live image or Claude vision calls. Voice tests use local parser/database paths with forceWebSearch=false.',
    voice: [],
    photoFixtures: [],
    hintGuardrails: [],
    visionSanitize: [],
    servingMath: [],
    parserHandoffGuardrails: [],
    postVisionLookup: [],
};

console.log('Running no-credit AI food regression tests...');
console.log('Live photo model calls: 0');

for (const testCase of voiceCases) {
    results.voice.push(await runVoiceCase(testCase));
}

for (const testCase of photoFixtureCases) {
    results.photoFixtures.push(await runPhotoFixtureCase(testCase));
}

for (const testCase of hintGuardrailCases) {
    results.hintGuardrails.push(runHintGuardrailCase(testCase));
}

for (const testCase of visionSanitizeCases) {
    results.visionSanitize.push(runVisionSanitizeCase(testCase));
}

for (const testCase of servingMathCases) {
    results.servingMath.push(runServingMathCase(testCase));
}

for (const testCase of parserHandoffGuardrailCases) {
    results.parserHandoffGuardrails.push(runParserHandoffGuardrailCase(testCase));
}

for (const testCase of postVisionLookupCases) {
    results.postVisionLookup.push(runPostVisionLookupCase(testCase));
}

const allResults = [...results.voice, ...results.photoFixtures, ...results.hintGuardrails, ...results.visionSanitize, ...results.servingMath, ...results.parserHandoffGuardrails, ...results.postVisionLookup];
const passCount = allResults.filter((result) => result.pass).length;
const outputPath = `${outputDir}/ai-food-regression-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log(`\nAI food regression tests: ${passCount}/${allResults.length} passed.`);
console.log(`Saved details to ${outputPath}`);

if (passCount !== allResults.length) {
    process.exit(1);
}
