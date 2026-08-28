// AI-Powered Food Parsing API - V2 (Accuracy-Focused)
// Uses an evidence-first Qwen provider with a comprehensive local nutrition database.

import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';
import { callFoodAi, isFoodAiConfigured } from './_lib/food-ai-provider.js';
import { lookupOpenFoodFacts } from './_lib/nutrition-evidence.js';
import { buildHighImpactClarifyingQuestions, mergeClarifyingQuestions, sanitizeClarifyingQuestions } from './_lib/food-clarifications.js';
import { requireAiAccess } from './_lib/security.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

// =============================================================================
// COMPREHENSIVE RESTAURANT NUTRITION DATABASE
// All values from official published nutrition data (as of 2026)
// =============================================================================
const nutritionDatabase = {
    // ==================== McDONALD'S ====================
    'big mac': { name: "McDonald's Big Mac", calories: 580, protein: 25, carbs: 46, fat: 34, sugar: 9, source: "McDonald's Official" },
    'mcdonald\'s big mac': { name: "McDonald's Big Mac", calories: 580, protein: 25, carbs: 46, fat: 34, sugar: 9, source: "McDonald's Official" },
    'quarter pounder with cheese': { name: "McDonald's Quarter Pounder with Cheese", calories: 520, protein: 30, carbs: 42, fat: 26, sugar: 10, source: "McDonald's Official" },
    'quarter pounder': { name: "McDonald's Quarter Pounder with Cheese", calories: 520, protein: 30, carbs: 42, fat: 26, sugar: 10, source: "McDonald's Official" },
    'mcdouble': { name: "McDonald's McDouble", calories: 400, protein: 22, carbs: 33, fat: 20, sugar: 7, source: "McDonald's Official" },
    'mcchicken': { name: "McDonald's McChicken", calories: 400, protein: 14, carbs: 40, fat: 21, sugar: 5, source: "McDonald's Official" },
    'filet-o-fish': { name: "McDonald's Filet-O-Fish", calories: 390, protein: 16, carbs: 39, fat: 19, sugar: 5, source: "McDonald's Official" },
    'filet o fish': { name: "McDonald's Filet-O-Fish", calories: 390, protein: 16, carbs: 39, fat: 19, sugar: 5, source: "McDonald's Official" },
    'egg mcmuffin': { name: "McDonald's Egg McMuffin", calories: 310, protein: 17, carbs: 30, fat: 13, sugar: 3, source: "McDonald's Official" },
    'sausage mcmuffin with egg': { name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31, sugar: 2, source: "McDonald's Official" },
    'sausage egg mcmuffin': { name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31, sugar: 2, source: "McDonald's Official" },
    'mcdonalds sausage egg mcmuffin': { name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31, sugar: 2, source: "McDonald's Official" },
    'mcdonald\'s sausage egg mcmuffin': { name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31, sugar: 2, source: "McDonald's Official" },
    'mcdonalds sausage mcmuffin with egg': { name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31, sugar: 2, source: "McDonald's Official" },
    'mcdonald\'s sausage mcmuffin with egg': { name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31, sugar: 2, source: "McDonald's Official" },
    'sausage mcmuffin': { name: "McDonald's Sausage McMuffin", calories: 400, protein: 14, carbs: 29, fat: 26, sugar: 2, source: "McDonald's Official" },
    'hotcakes': { name: "McDonald's Hotcakes", calories: 350, protein: 9, carbs: 60, fat: 9, sugar: 14, source: "McDonald's Official" },
    'hash browns': { name: "McDonald's Hash Browns", calories: 140, protein: 1, carbs: 15, fat: 8, sugar: 0, source: "McDonald's Official" },
    'mcflurry with oreo': { name: "McDonald's McFlurry with Oreo", calories: 510, protein: 13, carbs: 80, fat: 17, sugar: 63, source: "McDonald's Official" },
    'mcflurry oreo': { name: "McDonald's McFlurry with Oreo", calories: 510, protein: 13, carbs: 80, fat: 17, sugar: 63, source: "McDonald's Official" },
    'mcflurry m&m': { name: "McDonald's McFlurry with M&M's", calories: 640, protein: 14, carbs: 96, fat: 23, sugar: 85, source: "McDonald's Official" },
    // McNuggets
    '4 piece mcnuggets': { name: "McDonald's 4-Piece Chicken McNuggets", calories: 170, protein: 10, carbs: 10, fat: 10, sugar: 0, source: "McDonald's Official" },
    '6 piece mcnuggets': { name: "McDonald's 6-Piece Chicken McNuggets", calories: 250, protein: 15, carbs: 15, fat: 15, sugar: 0, source: "McDonald's Official" },
    '10 piece mcnuggets': { name: "McDonald's 10-Piece Chicken McNuggets", calories: 410, protein: 25, carbs: 26, fat: 24, sugar: 0, source: "McDonald's Official" },
    '20 piece mcnuggets': { name: "McDonald's 20-Piece Chicken McNuggets", calories: 830, protein: 49, carbs: 51, fat: 49, sugar: 0, source: "McDonald's Official" },
    'chicken mcnuggets': { name: "McDonald's 10-Piece Chicken McNuggets", calories: 410, protein: 25, carbs: 26, fat: 24, sugar: 0, source: "McDonald's Official" },
    // Fries
    'mcdonald\'s small fries': { name: "McDonald's Small Fries", calories: 220, protein: 3, carbs: 29, fat: 10, sugar: 0, source: "McDonald's Official" },
    'mcdonald\'s medium fries': { name: "McDonald's Medium Fries", calories: 320, protein: 5, carbs: 43, fat: 15, sugar: 0, source: "McDonald's Official" },
    'mcdonald\'s large fries': { name: "McDonald's Large Fries", calories: 480, protein: 7, carbs: 65, fat: 23, sugar: 0, source: "McDonald's Official" },
    'mcdonalds fries': { name: "McDonald's Medium Fries", calories: 320, protein: 5, carbs: 43, fat: 15, sugar: 0, source: "McDonald's Official" },

    // ==================== CHICK-FIL-A ====================
    'chick-fil-a chicken sandwich': { name: "Chick-fil-A Chicken Sandwich", calories: 420, protein: 29, carbs: 41, fat: 18, sugar: 6, source: "Chick-fil-A Official" },
    'chick-fil-a sandwich': { name: "Chick-fil-A Chicken Sandwich", calories: 420, protein: 29, carbs: 41, fat: 18, sugar: 6, source: "Chick-fil-A Official" },
    'chick fil a chicken sandwich': { name: "Chick-fil-A Chicken Sandwich", calories: 420, protein: 29, carbs: 41, fat: 18, sugar: 6, source: "Chick-fil-A Official" },
    'chick-fil-a spicy chicken sandwich': { name: "Chick-fil-A Spicy Chicken Sandwich", calories: 450, protein: 28, carbs: 43, fat: 19, sugar: 6, source: "Chick-fil-A Official" },
    'chick-fil-a spicy sandwich': { name: "Chick-fil-A Spicy Chicken Sandwich", calories: 450, protein: 28, carbs: 43, fat: 19, sugar: 6, source: "Chick-fil-A Official" },
    'chick-fil-a deluxe': { name: "Chick-fil-A Deluxe Sandwich", calories: 500, protein: 29, carbs: 44, fat: 22, sugar: 7, source: "Chick-fil-A Official" },
    'chick-fil-a grilled chicken sandwich': { name: "Chick-fil-A Grilled Chicken Sandwich", calories: 320, protein: 30, carbs: 36, fat: 6, sugar: 8, source: "Chick-fil-A Official" },
    // Nuggets
    'chick-fil-a 8 piece nuggets': { name: "Chick-fil-A 8-Count Nuggets", calories: 250, protein: 27, carbs: 11, fat: 11, sugar: 1, source: "Chick-fil-A Official" },
    'chick-fil-a 8 count nuggets': { name: "Chick-fil-A 8-Count Nuggets", calories: 250, protein: 27, carbs: 11, fat: 11, sugar: 1, source: "Chick-fil-A Official" },
    'chick-fil-a 12 count nuggets': { name: "Chick-fil-A 12-Count Nuggets", calories: 380, protein: 40, carbs: 17, fat: 17, sugar: 2, source: "Chick-fil-A Official" },
    'chick-fil-a 12 piece nuggets': { name: "Chick-fil-A 12-Count Nuggets", calories: 380, protein: 40, carbs: 17, fat: 17, sugar: 2, source: "Chick-fil-A Official" },
    'chick-fil-a grilled nuggets': { name: "Chick-fil-A 8-Count Grilled Nuggets", calories: 130, protein: 25, carbs: 2, fat: 3, sugar: 1, source: "Chick-fil-A Official" },
    'chick-fil-a grilled nuggets 8 piece': { name: "Chick-fil-A 8-Count Grilled Nuggets", calories: 130, protein: 25, carbs: 2, fat: 3, sugar: 1, source: "Chick-fil-A Official" },
    // Sides
    'chick-fil-a waffle fries': { name: "Chick-fil-A Medium Waffle Fries", calories: 420, protein: 5, carbs: 45, fat: 24, sugar: 0, source: "Chick-fil-A Official" },
    'chick-fil-a waffle fries medium': { name: "Chick-fil-A Medium Waffle Fries", calories: 420, protein: 5, carbs: 45, fat: 24, sugar: 0, source: "Chick-fil-A Official" },
    'chick-fil-a waffle fries large': { name: "Chick-fil-A Large Waffle Fries", calories: 540, protein: 7, carbs: 58, fat: 31, sugar: 0, source: "Chick-fil-A Official" },
    'chick-fil-a cobb salad': { name: "Chick-fil-A Cobb Salad", calories: 510, protein: 40, carbs: 27, fat: 27, sugar: 6, source: "Chick-fil-A Official" },
    'chick-fil-a chicken biscuit': { name: "Chick-fil-A Chicken Biscuit", calories: 440, protein: 16, carbs: 49, fat: 20, sugar: 5, source: "Chick-fil-A Official" },

    // ==================== TACO BELL ====================
    'crunchy taco': { name: "Taco Bell Crunchy Taco", calories: 170, protein: 8, carbs: 13, fat: 10, sugar: 1, source: "Taco Bell Official" },
    'crunchy taco supreme': { name: "Taco Bell Crunchy Taco Supreme", calories: 200, protein: 8, carbs: 15, fat: 12, sugar: 1, source: "Taco Bell Official" },
    'taco bell crunchy taco supreme': { name: "Taco Bell Crunchy Taco Supreme", calories: 200, protein: 8, carbs: 15, fat: 12, sugar: 1, source: "Taco Bell Official" },
    'soft taco': { name: "Taco Bell Soft Taco", calories: 180, protein: 9, carbs: 18, fat: 8, sugar: 1, source: "Taco Bell Official" },
    'bean burrito': { name: "Taco Bell Bean Burrito", calories: 380, protein: 14, carbs: 55, fat: 10, sugar: 3, source: "Taco Bell Official" },
    'taco bell beef burrito': { name: "Taco Bell Bean Burrito", calories: 380, protein: 14, carbs: 55, fat: 10, sugar: 3, source: "Taco Bell Official" },
    'crunchwrap supreme': { name: "Taco Bell Crunchwrap Supreme", calories: 540, protein: 16, carbs: 71, fat: 21, sugar: 6, source: "Taco Bell Official" },
    'chicken quesadilla': { name: "Taco Bell Chicken Quesadilla", calories: 500, protein: 27, carbs: 38, fat: 26, sugar: 3, source: "Taco Bell Official" },
    'quesadilla chicken': { name: "Taco Bell Chicken Quesadilla", calories: 500, protein: 27, carbs: 38, fat: 26, sugar: 3, source: "Taco Bell Official" },
    'nachos bellgrande': { name: "Taco Bell Nachos BellGrande", calories: 740, protein: 16, carbs: 82, fat: 38, sugar: 4, source: "Taco Bell Official" },
    'taco bell nachos bellgrande': { name: "Taco Bell Nachos BellGrande", calories: 740, protein: 16, carbs: 82, fat: 38, sugar: 4, source: "Taco Bell Official" },
    'mexican pizza': { name: "Taco Bell Mexican Pizza", calories: 540, protein: 19, carbs: 47, fat: 30, sugar: 3, source: "Taco Bell Official" },
    'cheesy gordita crunch': { name: "Taco Bell Cheesy Gordita Crunch", calories: 500, protein: 20, carbs: 41, fat: 28, sugar: 5, source: "Taco Bell Official" },
    'chalupa supreme': { name: "Taco Bell Chalupa Supreme", calories: 350, protein: 12, carbs: 31, fat: 20, sugar: 3, source: "Taco Bell Official" },

    // ==================== WENDY'S ====================
    'dave\'s single': { name: "Wendy's Dave's Single", calories: 590, protein: 30, carbs: 41, fat: 34, sugar: 9, source: "Wendy's Official" },
    'wendy\'s dave\'s single': { name: "Wendy's Dave's Single", calories: 590, protein: 30, carbs: 41, fat: 34, sugar: 9, source: "Wendy's Official" },
    'dave\'s double': { name: "Wendy's Dave's Double", calories: 850, protein: 48, carbs: 42, fat: 55, sugar: 9, source: "Wendy's Official" },
    'wendy\'s dave\'s double': { name: "Wendy's Dave's Double", calories: 850, protein: 48, carbs: 42, fat: 55, sugar: 9, source: "Wendy's Official" },
    'baconator': { name: "Wendy's Baconator", calories: 950, protein: 57, carbs: 38, fat: 65, sugar: 8, source: "Wendy's Official" },
    'wendy\'s baconator': { name: "Wendy's Baconator", calories: 950, protein: 57, carbs: 38, fat: 65, sugar: 8, source: "Wendy's Official" },
    'jr bacon cheeseburger': { name: "Wendy's Jr. Bacon Cheeseburger", calories: 380, protein: 18, carbs: 26, fat: 23, sugar: 5, source: "Wendy's Official" },
    'wendy\'s 4 piece nuggets': { name: "Wendy's 4-Piece Chicken Nuggets", calories: 170, protein: 8, carbs: 10, fat: 11, sugar: 0, source: "Wendy's Official" },
    'wendy\'s 6 piece nuggets': { name: "Wendy's 6-Piece Chicken Nuggets", calories: 250, protein: 12, carbs: 15, fat: 16, sugar: 0, source: "Wendy's Official" },
    'wendy\'s 10 piece nuggets': { name: "Wendy's 10-Piece Chicken Nuggets", calories: 430, protein: 20, carbs: 25, fat: 28, sugar: 0, source: "Wendy's Official" },
    'wendy\'s medium fries': { name: "Wendy's Medium Fries", calories: 420, protein: 5, carbs: 56, fat: 20, sugar: 0, source: "Wendy's Official" },
    'wendy\'s large fries': { name: "Wendy's Large Fries", calories: 530, protein: 6, carbs: 70, fat: 25, sugar: 0, source: "Wendy's Official" },
    'wendy\'s frosty': { name: "Wendy's Medium Chocolate Frosty", calories: 470, protein: 10, carbs: 75, fat: 14, sugar: 57, source: "Wendy's Official" },
    'wendy\'s frosty medium chocolate': { name: "Wendy's Medium Chocolate Frosty", calories: 470, protein: 10, carbs: 75, fat: 14, sugar: 57, source: "Wendy's Official" },
    'wendy\'s spicy chicken sandwich': { name: "Wendy's Spicy Chicken Sandwich", calories: 500, protein: 29, carbs: 46, fat: 22, sugar: 7, source: "Wendy's Official" },

    // ==================== BURGER KING ====================
    'whopper': { name: "Burger King Whopper", calories: 660, protein: 28, carbs: 49, fat: 40, sugar: 11, source: "Burger King Official" },
    'whopper with cheese': { name: "Burger King Whopper with Cheese", calories: 740, protein: 33, carbs: 50, fat: 46, sugar: 11, source: "Burger King Official" },
    'double whopper': { name: "Burger King Double Whopper", calories: 900, protein: 48, carbs: 49, fat: 56, sugar: 11, source: "Burger King Official" },
    'whopper jr': { name: "Burger King Whopper Jr.", calories: 310, protein: 13, carbs: 27, fat: 18, sugar: 7, source: "Burger King Official" },
    'burger king chicken nuggets 8 piece': { name: "Burger King 8-Piece Chicken Nuggets", calories: 380, protein: 16, carbs: 22, fat: 24, sugar: 0, source: "Burger King Official" },
    'burger king medium fries': { name: "Burger King Medium Fries", calories: 380, protein: 4, carbs: 53, fat: 17, sugar: 0, source: "Burger King Official" },
    'burger king large fries': { name: "Burger King Large Fries", calories: 430, protein: 5, carbs: 60, fat: 19, sugar: 0, source: "Burger King Official" },
    'original chicken sandwich': { name: "Burger King Original Chicken Sandwich", calories: 660, protein: 28, carbs: 48, fat: 40, sugar: 6, source: "Burger King Official" },
    'impossible whopper': { name: "Burger King Impossible Whopper", calories: 630, protein: 25, carbs: 58, fat: 34, sugar: 12, source: "Burger King Official" },
    'burger king impossible whopper': { name: "Burger King Impossible Whopper", calories: 630, protein: 25, carbs: 58, fat: 34, sugar: 12, source: "Burger King Official" },

    // ==================== SUBWAY ====================
    'subway 6 inch turkey': { name: "Subway 6-inch Turkey Breast Sub", calories: 280, protein: 18, carbs: 46, fat: 3, sugar: 6, source: "Subway Official" },
    'subway 6 inch turkey sub': { name: "Subway 6-inch Turkey Breast Sub", calories: 280, protein: 18, carbs: 46, fat: 3, sugar: 6, source: "Subway Official" },
    'subway footlong italian bmt': { name: "Subway Footlong Italian B.M.T.", calories: 820, protein: 38, carbs: 90, fat: 32, sugar: 14, source: "Subway Official" },
    'subway 6 inch meatball marinara': { name: "Subway 6-inch Meatball Marinara", calories: 480, protein: 22, carbs: 57, fat: 18, sugar: 11, source: "Subway Official" },
    'subway 6 inch tuna': { name: "Subway 6-inch Tuna", calories: 480, protein: 20, carbs: 44, fat: 25, sugar: 5, source: "Subway Official" },
    'subway chicken bacon ranch': { name: "Subway 6-inch Chicken Bacon Ranch", calories: 610, protein: 36, carbs: 47, fat: 32, sugar: 6, source: "Subway Official" },
    'subway club': { name: "Subway 6-inch Turkey, Ham & Roast Beef", calories: 300, protein: 23, carbs: 46, fat: 4, sugar: 6, source: "Subway Official" },

    // ==================== CHIPOTLE ====================
    'chipotle chicken burrito': { name: "Chipotle Chicken Burrito", calories: 1055, protein: 60, carbs: 106, fat: 38, sugar: 8, source: "Chipotle Official" },
    'chipotle chicken bowl': { name: "Chipotle Chicken Bowl", calories: 740, protein: 50, carbs: 56, fat: 30, sugar: 5, source: "Chipotle Official" },
    'chipotle chicken': { name: "Chipotle Chicken (4 oz)", calories: 180, protein: 32, carbs: 0, fat: 7, sugar: 0, source: "Chipotle Official" },
    'chipotle cilantro-lime white rice': { name: "Chipotle Cilantro-Lime White Rice (4 oz)", calories: 210, protein: 4, carbs: 40, fat: 4, sugar: 0, source: "Chipotle Official" },
    'chipotle black beans': { name: "Chipotle Black Beans (4 oz)", calories: 130, protein: 8, carbs: 22, fat: 2, sugar: 2, source: "Chipotle Official" },
    'chipotle fajita veggies': { name: "Chipotle Fajita Vegetables (2 oz)", calories: 20, protein: 1, carbs: 5, fat: 0, sugar: 2, source: "Chipotle Official" },
    'chipotle fresh tomato salsa': { name: "Chipotle Fresh Tomato Salsa (4 oz)", calories: 25, protein: 0, carbs: 4, fat: 0, sugar: 1, source: "Chipotle Official" },
    'chipotle cheese': { name: "Chipotle Cheese (1 oz)", calories: 110, protein: 6, carbs: 1, fat: 8, sugar: 0, source: "Chipotle Official" },
    'chipotle romaine lettuce': { name: "Chipotle Romaine Lettuce (1 oz)", calories: 5, protein: 0, carbs: 1, fat: 0, sugar: 0, source: "Chipotle Official" },
    'chipotle steak burrito': { name: "Chipotle Steak Burrito", calories: 1045, protein: 59, carbs: 106, fat: 37, sugar: 8, source: "Chipotle Official" },
    'chipotle steak bowl': { name: "Chipotle Steak Bowl", calories: 730, protein: 49, carbs: 56, fat: 29, sugar: 5, source: "Chipotle Official" },
    'chipotle carnitas bowl': { name: "Chipotle Carnitas Bowl", calories: 750, protein: 40, carbs: 56, fat: 35, sugar: 5, source: "Chipotle Official" },
    'chipotle chips and guacamole': { name: "Chipotle Chips and Guacamole", calories: 770, protein: 9, carbs: 72, fat: 50, sugar: 2, source: "Chipotle Official" },
    'chipotle chips': { name: "Chipotle Chips", calories: 540, protein: 7, carbs: 68, fat: 27, sugar: 1, source: "Chipotle Official" },
    'chipotle guacamole': { name: "Chipotle Guacamole (side)", calories: 230, protein: 2, carbs: 8, fat: 22, sugar: 1, source: "Chipotle Official" },
    'chipotle chicken tacos 3': { name: "Chipotle Chicken Tacos (3)", calories: 610, protein: 42, carbs: 41, fat: 24, sugar: 2, source: "Chipotle Official" },

    // ==================== OLIVE GARDEN ====================
    'olive garden breadstick': { name: "Olive Garden Breadstick (1)", calories: 140, protein: 4, carbs: 23, fat: 3, sugar: 1, source: "Olive Garden Official" },
    'olive garden 3 breadsticks': { name: "Olive Garden Breadsticks (3)", calories: 420, protein: 12, carbs: 69, fat: 9, sugar: 3, source: "Olive Garden Official" },
    'olive garden fettuccine alfredo': { name: "Olive Garden Fettuccine Alfredo", calories: 1220, protein: 47, carbs: 102, fat: 72, sugar: 5, source: "Olive Garden Official" },
    'olive garden tour of italy': { name: "Olive Garden Tour of Italy", calories: 1520, protein: 82, carbs: 118, fat: 74, sugar: 17, source: "Olive Garden Official" },
    'olive garden chicken parmigiana': { name: "Olive Garden Chicken Parmigiana", calories: 1060, protein: 69, carbs: 88, fat: 46, sugar: 13, source: "Olive Garden Official" },
    'olive garden lasagna classico': { name: "Olive Garden Lasagna Classico", calories: 580, protein: 31, carbs: 47, fat: 29, sugar: 11, source: "Olive Garden Official" },
    'olive garden lasagna': { name: "Olive Garden Lasagna Classico", calories: 580, protein: 31, carbs: 47, fat: 29, sugar: 11, source: "Olive Garden Official" },
    'olive garden house salad': { name: "Olive Garden House Salad", calories: 150, protein: 2, carbs: 11, fat: 11, sugar: 4, source: "Olive Garden Official" },

    // ==================== PANERA ====================
    'panera broccoli cheddar soup': { name: "Panera Broccoli Cheddar Soup (Bowl)", calories: 360, protein: 14, carbs: 30, fat: 21, sugar: 6, source: "Panera Official" },
    'panera broccoli cheddar soup bowl': { name: "Panera Broccoli Cheddar Soup (Bowl)", calories: 360, protein: 14, carbs: 30, fat: 21, sugar: 6, source: "Panera Official" },
    'panera mac and cheese': { name: "Panera Mac & Cheese", calories: 980, protein: 35, carbs: 82, fat: 57, sugar: 8, source: "Panera Official" },
    'panera bacon turkey bravo': { name: "Panera Bacon Turkey Bravo", calories: 710, protein: 45, carbs: 67, fat: 28, sugar: 13, source: "Panera Official" },
    'panera caesar salad with chicken': { name: "Panera Caesar Salad with Chicken", calories: 470, protein: 35, carbs: 16, fat: 31, sugar: 3, source: "Panera Official" },
    'panera greek salad': { name: "Panera Greek Salad", calories: 400, protein: 9, carbs: 17, fat: 33, sugar: 5, source: "Panera Official" },

    // ==================== STARBUCKS ====================
    'starbucks grande caramel frappuccino': { name: "Starbucks Caramel Frappuccino (Grande)", calories: 380, protein: 5, carbs: 54, fat: 16, sugar: 50, source: "Starbucks Official" },
    'starbucks venti mocha frappuccino': { name: "Starbucks Mocha Frappuccino (Venti)", calories: 470, protein: 6, carbs: 75, fat: 16, sugar: 67, source: "Starbucks Official" },
    'starbucks grande pumpkin spice latte': { name: "Starbucks Pumpkin Spice Latte (Grande)", calories: 380, protein: 14, carbs: 52, fat: 14, sugar: 50, source: "Starbucks Official" },
    'starbucks pumpkin spice latte': { name: "Starbucks Pumpkin Spice Latte (Grande)", calories: 380, protein: 14, carbs: 52, fat: 14, sugar: 50, source: "Starbucks Official" },
    'starbucks bacon egg cheese sandwich': { name: "Starbucks Bacon, Gouda & Egg Sandwich", calories: 360, protein: 18, carbs: 34, fat: 17, sugar: 4, source: "Starbucks Official" },
    'starbucks chocolate croissant': { name: "Starbucks Chocolate Croissant", calories: 340, protein: 6, carbs: 39, fat: 18, sugar: 13, source: "Starbucks Official" },
    'starbucks cake pop': { name: "Starbucks Cake Pop", calories: 160, protein: 2, carbs: 22, fat: 8, sugar: 15, source: "Starbucks Official" },
    'starbucks coffee': { name: "Starbucks Pike Place Coffee (Grande)", calories: 5, protein: 1, carbs: 0, fat: 0, sugar: 0, source: "Starbucks Official" },

    // ==================== DUNKIN ====================
    'dunkin medium iced coffee': { name: "Dunkin' Medium Iced Coffee (unsweetened)", calories: 10, protein: 0, carbs: 2, fat: 0, sugar: 0, source: "Dunkin' Official" },
    'dunkin glazed donut': { name: "Dunkin' Glazed Donut", calories: 260, protein: 3, carbs: 31, fat: 14, sugar: 12, source: "Dunkin' Official" },
    'dunkin boston kreme donut': { name: "Dunkin' Boston Kreme Donut", calories: 300, protein: 4, carbs: 38, fat: 15, sugar: 17, source: "Dunkin' Official" },
    'dunkin boston kreme': { name: "Dunkin' Boston Kreme Donut", calories: 300, protein: 4, carbs: 38, fat: 15, sugar: 17, source: "Dunkin' Official" },
    'dunkin bacon egg cheese croissant': { name: "Dunkin' Bacon Egg & Cheese on Croissant", calories: 530, protein: 19, carbs: 37, fat: 33, sugar: 5, source: "Dunkin' Official" },
    'dunkin sausage egg cheese wake up wrap': { name: "Dunkin' Sausage Egg Cheese Wake-Up Wrap", calories: 330, protein: 14, carbs: 15, fat: 24, sugar: 1, source: "Dunkin' Official" },

    // ==================== POPEYES ====================
    'popeyes chicken sandwich': { name: "Popeyes Chicken Sandwich", calories: 700, protein: 28, carbs: 50, fat: 42, sugar: 8, source: "Popeyes Official" },
    'popeyes spicy chicken sandwich': { name: "Popeyes Spicy Chicken Sandwich", calories: 700, protein: 28, carbs: 50, fat: 42, sugar: 8, source: "Popeyes Official" },
    'popeyes 3 piece chicken tenders': { name: "Popeyes 3-Piece Chicken Tenders", calories: 340, protein: 26, carbs: 19, fat: 18, sugar: 0, source: "Popeyes Official" },
    'popeyes 5 piece chicken tenders': { name: "Popeyes 5-Piece Chicken Tenders", calories: 570, protein: 44, carbs: 31, fat: 30, sugar: 0, source: "Popeyes Official" },
    'popeyes regular cajun fries': { name: "Popeyes Regular Cajun Fries", calories: 260, protein: 4, carbs: 35, fat: 13, sugar: 0, source: "Popeyes Official" },
    'popeyes cajun fries': { name: "Popeyes Regular Cajun Fries", calories: 260, protein: 4, carbs: 35, fat: 13, sugar: 0, source: "Popeyes Official" },
    'popeyes red beans and rice': { name: "Popeyes Red Beans and Rice", calories: 230, protein: 8, carbs: 23, fat: 11, sugar: 1, source: "Popeyes Official" },
    'popeyes biscuit': { name: "Popeyes Biscuit", calories: 260, protein: 4, carbs: 27, fat: 15, sugar: 3, source: "Popeyes Official" },

    // ==================== KFC ====================
    'kfc original recipe chicken breast': { name: "KFC Original Recipe Chicken Breast", calories: 390, protein: 39, carbs: 11, fat: 21, sugar: 0, source: "KFC Official" },
    'kfc original recipe breast': { name: "KFC Original Recipe Chicken Breast", calories: 390, protein: 39, carbs: 11, fat: 21, sugar: 0, source: "KFC Official" },
    'kfc original recipe thigh': { name: "KFC Original Recipe Chicken Thigh", calories: 280, protein: 19, carbs: 10, fat: 19, sugar: 0, source: "KFC Official" },
    'kfc extra crispy breast': { name: "KFC Extra Crispy Chicken Breast", calories: 530, protein: 39, carbs: 19, fat: 35, sugar: 0, source: "KFC Official" },
    'kfc mashed potatoes with gravy': { name: "KFC Mashed Potatoes with Gravy", calories: 130, protein: 2, carbs: 18, fat: 5, sugar: 1, source: "KFC Official" },
    'kfc mashed potatoes': { name: "KFC Mashed Potatoes with Gravy", calories: 130, protein: 2, carbs: 18, fat: 5, sugar: 1, source: "KFC Official" },
    'kfc coleslaw': { name: "KFC Coleslaw", calories: 170, protein: 1, carbs: 14, fat: 12, sugar: 10, source: "KFC Official" },
    'kfc famous bowl': { name: "KFC Famous Bowl", calories: 720, protein: 26, carbs: 76, fat: 34, sugar: 3, source: "KFC Official" },
    'kfc biscuit': { name: "KFC Biscuit", calories: 180, protein: 3, carbs: 21, fat: 9, sugar: 2, source: "KFC Official" },

    // ==================== PANDA EXPRESS ====================
    'panda express orange chicken': { name: "Panda Express Orange Chicken", calories: 490, protein: 25, carbs: 51, fat: 21, sugar: 19, source: "Panda Express Official" },
    'orange chicken': { name: "Panda Express Orange Chicken", calories: 490, protein: 25, carbs: 51, fat: 21, sugar: 19, source: "Panda Express Official" },
    'panda express beijing beef': { name: "Panda Express Beijing Beef", calories: 470, protein: 13, carbs: 56, fat: 22, sugar: 26, source: "Panda Express Official" },
    'beijing beef': { name: "Panda Express Beijing Beef", calories: 470, protein: 13, carbs: 56, fat: 22, sugar: 26, source: "Panda Express Official" },
    'panda express kung pao chicken': { name: "Panda Express Kung Pao Chicken", calories: 290, protein: 16, carbs: 14, fat: 19, sugar: 5, source: "Panda Express Official" },
    'kung pao chicken': { name: "Panda Express Kung Pao Chicken", calories: 290, protein: 16, carbs: 14, fat: 19, sugar: 5, source: "Panda Express Official" },
    'panda express broccoli beef': { name: "Panda Express Broccoli Beef", calories: 150, protein: 9, carbs: 13, fat: 7, sugar: 7, source: "Panda Express Official" },
    'broccoli beef': { name: "Panda Express Broccoli Beef", calories: 150, protein: 9, carbs: 13, fat: 7, sugar: 7, source: "Panda Express Official" },
    'panda express fried rice': { name: "Panda Express Fried Rice", calories: 520, protein: 11, carbs: 82, fat: 16, sugar: 3, source: "Panda Express Official" },
    'panda express chow mein': { name: "Panda Express Chow Mein", calories: 510, protein: 13, carbs: 80, fat: 16, sugar: 9, source: "Panda Express Official" },
    'panda express white rice': { name: "Panda Express White Rice", calories: 380, protein: 7, carbs: 87, fat: 0, sugar: 0, source: "Panda Express Official" },

    // ==================== FIVE GUYS ====================
    'five guys cheeseburger': { name: "Five Guys Cheeseburger", calories: 840, protein: 43, carbs: 40, fat: 55, sugar: 9, source: "Five Guys Official" },
    'five guys little cheeseburger': { name: "Five Guys Little Cheeseburger", calories: 550, protein: 27, carbs: 40, fat: 32, sugar: 9, source: "Five Guys Official" },
    'five guys bacon cheeseburger': { name: "Five Guys Bacon Cheeseburger", calories: 920, protein: 49, carbs: 40, fat: 62, sugar: 9, source: "Five Guys Official" },
    'five guys hamburger': { name: "Five Guys Hamburger", calories: 700, protein: 38, carbs: 39, fat: 43, sugar: 9, source: "Five Guys Official" },
    'five guys regular fries': { name: "Five Guys Regular Fries", calories: 530, protein: 8, carbs: 64, fat: 27, sugar: 0, source: "Five Guys Official" },
    'five guys large fries': { name: "Five Guys Large Fries", calories: 1310, protein: 20, carbs: 158, fat: 67, sugar: 0, source: "Five Guys Official" },
    'five guys hot dog': { name: "Five Guys Hot Dog", calories: 545, protein: 18, carbs: 40, fat: 35, sugar: 7, source: "Five Guys Official" },

    // ==================== IN-N-OUT ====================
    'in-n-out double double': { name: "In-N-Out Double-Double", calories: 670, protein: 37, carbs: 39, fat: 41, sugar: 10, source: "In-N-Out Official" },
    'double double': { name: "In-N-Out Double-Double", calories: 670, protein: 37, carbs: 39, fat: 41, sugar: 10, source: "In-N-Out Official" },
    'in-n-out cheeseburger': { name: "In-N-Out Cheeseburger", calories: 480, protein: 22, carbs: 39, fat: 27, sugar: 10, source: "In-N-Out Official" },
    'in-n-out hamburger': { name: "In-N-Out Hamburger", calories: 390, protein: 16, carbs: 39, fat: 19, sugar: 10, source: "In-N-Out Official" },
    'in-n-out fries': { name: "In-N-Out French Fries", calories: 395, protein: 7, carbs: 54, fat: 18, sugar: 0, source: "In-N-Out Official" },
    'in-n-out animal style fries': { name: "In-N-Out Animal Style Fries", calories: 750, protein: 15, carbs: 57, fat: 52, sugar: 4, source: "In-N-Out Official (Estimated)" },

    // ==================== RAISING CANE'S ====================
    'raising cane\'s 3 finger combo': { name: "Raising Cane's 3 Finger Combo", calories: 1050, protein: 39, carbs: 82, fat: 61, sugar: 10, source: "Raising Cane's Official" },
    'raising cane\'s caniac combo': { name: "Raising Cane's Caniac Combo", calories: 1740, protein: 68, carbs: 123, fat: 108, sugar: 13, source: "Raising Cane's Official" },
    'raising cane\'s chicken fingers 3': { name: "Raising Cane's 3 Chicken Fingers", calories: 330, protein: 30, carbs: 13, fat: 17, sugar: 0, source: "Raising Cane's Official" },
    'raising cane\'s crinkle cut fries': { name: "Raising Cane's Crinkle-Cut Fries", calories: 380, protein: 5, carbs: 51, fat: 17, sugar: 0, source: "Raising Cane's Official" },
    'raising cane\'s cane\'s sauce': { name: "Raising Cane's Cane's Sauce", calories: 190, protein: 0, carbs: 4, fat: 19, sugar: 3, source: "Raising Cane's Official" },
    'cane\'s sauce': { name: "Raising Cane's Cane's Sauce", calories: 190, protein: 0, carbs: 4, fat: 19, sugar: 3, source: "Raising Cane's Official" },
    'raising cane\'s texas toast': { name: "Raising Cane's Texas Toast", calories: 150, protein: 4, carbs: 19, fat: 7, sugar: 2, source: "Raising Cane's Official" },

    // ==================== SONIC ====================
    'sonic cheeseburger': { name: "Sonic Cheeseburger", calories: 640, protein: 24, carbs: 47, fat: 40, sugar: 10, source: "Sonic Official" },
    'sonic large tots': { name: "Sonic Large Tater Tots", calories: 410, protein: 4, carbs: 49, fat: 22, sugar: 1, source: "Sonic Official" },
    'sonic tater tots': { name: "Sonic Medium Tater Tots", calories: 290, protein: 3, carbs: 35, fat: 16, sugar: 1, source: "Sonic Official" },
    'sonic medium cherry limeade': { name: "Sonic Medium Cherry Limeade", calories: 240, protein: 0, carbs: 65, fat: 0, sugar: 63, source: "Sonic Official" },
    'sonic cherry limeade': { name: "Sonic Medium Cherry Limeade", calories: 240, protein: 0, carbs: 65, fat: 0, sugar: 63, source: "Sonic Official" },
    'sonic footlong hot dog': { name: "Sonic Footlong Quarter Pound Coney", calories: 780, protein: 27, carbs: 53, fat: 51, sugar: 9, source: "Sonic Official" },

    // ==================== WHATABURGER ====================
    'whataburger with cheese': { name: "Whataburger with Cheese", calories: 780, protein: 35, carbs: 62, fat: 43, sugar: 11, source: "Whataburger Official" },
    'whataburger': { name: "Whataburger", calories: 700, protein: 30, carbs: 61, fat: 37, sugar: 11, source: "Whataburger Official" },
    'whataburger double meat': { name: "Whataburger Double Meat", calories: 1050, protein: 52, carbs: 62, fat: 63, sugar: 11, source: "Whataburger Official" },
    'double meat whataburger': { name: "Whataburger Double Meat", calories: 1050, protein: 52, carbs: 62, fat: 63, sugar: 11, source: "Whataburger Official" },
    'whataburger honey butter chicken biscuit': { name: "Whataburger Honey Butter Chicken Biscuit", calories: 610, protein: 21, carbs: 53, fat: 35, sugar: 8, source: "Whataburger Official" },
    'honey butter chicken biscuit': { name: "Whataburger Honey Butter Chicken Biscuit", calories: 610, protein: 21, carbs: 53, fat: 35, sugar: 8, source: "Whataburger Official" },
    'whataburger medium fries': { name: "Whataburger Medium Fries", calories: 400, protein: 5, carbs: 54, fat: 18, sugar: 0, source: "Whataburger Official" },

    // ==================== ADDITIONAL NATIONAL CHAINS ====================
    'arby\'s classic roast beef': {
        name: "Arby's Classic Roast Beef Sandwich",
        calories: 360,
        protein: 23,
        carbs: 37,
        fat: 14,
        sugar: 5,
        source: "Arby's Official",
        sourceType: 'official',
        sourceUrl: 'https://www.arbys.com/menu/top-picks/classic-roast-beef/'
    },
    'arbys classic roast beef': {
        name: "Arby's Classic Roast Beef Sandwich",
        calories: 360,
        protein: 23,
        carbs: 37,
        fat: 14,
        sugar: 5,
        source: "Arby's Official",
        sourceType: 'official',
        sourceUrl: 'https://www.arbys.com/menu/top-picks/classic-roast-beef/'
    },
    'domino\'s medium hand tossed pepperoni pizza 2 slices': {
        name: "Domino's Medium Hand Tossed Pepperoni Pizza (2 slices)",
        calories: 430,
        protein: 18,
        carbs: 52,
        fat: 18,
        sugar: 4,
        source: "Domino's Official Nutrition Guide",
        sourceType: 'menu_pdf',
        sourceUrl: 'https://cache.dominos.com/olo/6_159_0/assets/build/market/US/_en/pdf/DominosNutritionGuide.pdf'
    },
    'dominos medium hand tossed pepperoni pizza 2 slices': {
        name: "Domino's Medium Hand Tossed Pepperoni Pizza (2 slices)",
        calories: 430,
        protein: 18,
        carbs: 52,
        fat: 18,
        sugar: 4,
        source: "Domino's Official Nutrition Guide",
        sourceType: 'menu_pdf',
        sourceUrl: 'https://cache.dominos.com/olo/6_159_0/assets/build/market/US/_en/pdf/DominosNutritionGuide.pdf'
    },
    'pizza hut medium hand tossed pepperoni pizza 2 slices': {
        name: 'Pizza Hut Medium Hand Tossed Pepperoni Pizza (2 slices)',
        calories: 440,
        protein: 18,
        carbs: 50,
        fat: 18,
        sugar: 2,
        source: 'Pizza Hut Official Nutrition',
        sourceType: 'official',
        sourceUrl: 'https://www.pizzahut.com/c/content/nutrition'
    },
    'papa john\'s large original crust pepperoni pizza 2 slices': {
        name: "Papa Johns Large Original Crust Pepperoni Pizza (2 slices)",
        calories: 580,
        protein: 22,
        carbs: 76,
        fat: 20,
        sugar: 10,
        source: 'Papa Johns Official',
        sourceType: 'official',
        sourceUrl: 'https://www.papajohns.com/company/nutritional-details/index.html'
    },
    'papa johns large original crust pepperoni pizza 2 slices': {
        name: "Papa Johns Large Original Crust Pepperoni Pizza (2 slices)",
        calories: 580,
        protein: 22,
        carbs: 76,
        fat: 20,
        sugar: 10,
        source: 'Papa Johns Official',
        sourceType: 'official',
        sourceUrl: 'https://www.papajohns.com/company/nutritional-details/index.html'
    },
    'little caesars classic pepperoni pizza 2 slices': {
        name: 'Little Caesars Classic Pepperoni Pizza (2 slices)',
        calories: 580,
        protein: 27,
        carbs: 63,
        fat: 24,
        sugar: 5,
        source: 'Little Caesars Official Nutrition Guide',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://littlecaesars.com/static/usnutritionguide.pdf'
    },
    'dairy queen small oreo blizzard': {
        name: 'Dairy Queen OREO Cookie Blizzard Treat (Small)',
        calories: 620,
        protein: 12,
        carbs: 92,
        fat: 23,
        sugar: 67,
        source: 'Dairy Queen Official',
        sourceType: 'official',
        sourceUrl: 'https://www.dairyqueen.com/en-us/menu/oreo-cookie-blizzard-treat/'
    },
    'dq small oreo blizzard': {
        name: 'Dairy Queen OREO Cookie Blizzard Treat (Small)',
        calories: 620,
        protein: 12,
        carbs: 92,
        fat: 23,
        sugar: 67,
        source: 'Dairy Queen Official',
        sourceType: 'official',
        sourceUrl: 'https://www.dairyqueen.com/en-us/menu/oreo-cookie-blizzard-treat/'
    },
    'shake shack shackburger': {
        name: 'Shake Shack ShackBurger',
        calories: 530,
        protein: 29,
        carbs: 26,
        fat: 34,
        sugar: 7,
        source: 'Shake Shack Official Nutrition',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://shakeshack.com/sites/default/files/2022-05/Shake%20Shack%20Nutrition%20Spreadsheets%20May%203%2C%202022%20LTOs.pdf'
    },
    'jimmy john\'s turkey tom': {
        name: "Jimmy John's Turkey Tom",
        calories: 480,
        protein: 23,
        carbs: 57,
        fat: 19,
        sugar: 2,
        source: "Jimmy John's Official Nutrition Guide",
        sourceType: 'menu_pdf',
        sourceUrl: 'https://resources.jimmyjohns.com/downloadable-files/NutritionGuide.pdf'
    },
    'jimmy johns turkey tom': {
        name: "Jimmy John's Turkey Tom",
        calories: 480,
        protein: 23,
        carbs: 57,
        fat: 19,
        sugar: 2,
        source: "Jimmy John's Official Nutrition Guide",
        sourceType: 'menu_pdf',
        sourceUrl: 'https://resources.jimmyjohns.com/downloadable-files/NutritionGuide.pdf'
    },
    'jersey mike\'s regular original italian': {
        name: "Jersey Mike's Original Italian (Regular)",
        calories: 940,
        protein: 45,
        carbs: 65,
        fat: 55,
        sugar: 10,
        source: "Jersey Mike's Official Nutrition",
        sourceType: 'official',
        sourceUrl: 'https://www.jerseymikes.com/menu/nutrition'
    },
    'jersey mikes regular original italian': {
        name: "Jersey Mike's Original Italian (Regular)",
        calories: 940,
        protein: 45,
        carbs: 65,
        fat: 55,
        sugar: 10,
        source: "Jersey Mike's Official Nutrition",
        sourceType: 'official',
        sourceUrl: 'https://www.jerseymikes.com/menu/nutrition'
    },
    'culver\'s butterburger cheese single': {
        name: "Culver's ButterBurger Cheese Single",
        calories: 460,
        protein: 23,
        carbs: 39,
        fat: 23,
        sugar: 7,
        source: "Culver's Official Nutrition Guide",
        sourceType: 'menu_pdf',
        sourceUrl: 'https://cdn.culvers.com/page-content/menu/nutrition-allergen.pdf'
    },
    'culvers butterburger cheese single': {
        name: "Culver's ButterBurger Cheese Single",
        calories: 460,
        protein: 23,
        carbs: 39,
        fat: 23,
        sugar: 7,
        source: "Culver's Official Nutrition Guide",
        sourceType: 'menu_pdf',
        sourceUrl: 'https://cdn.culvers.com/page-content/menu/nutrition-allergen.pdf'
    },
    'qdoba grilled adobo chicken': {
        name: 'Qdoba Grilled Adobo Chicken (3.5 oz)',
        calories: 150,
        protein: 16,
        carbs: 2,
        fat: 9,
        sugar: 1,
        source: 'Qdoba Official Nutrition Information',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://www.qdoba.com/public/assets/documents/qdoba-nutrition-information.pdf'
    },
    'qdoba cilantro lime rice': {
        name: 'Qdoba Cilantro Lime Rice',
        calories: 190,
        protein: 3,
        carbs: 38,
        fat: 3,
        sugar: 1,
        source: 'Qdoba Official Nutrition Information',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://www.qdoba.com/public/assets/documents/qdoba-nutrition-information.pdf'
    },
    'qdoba black beans': {
        name: 'Qdoba Black Beans',
        calories: 130,
        protein: 8,
        carbs: 22,
        fat: 1,
        sugar: 1,
        source: 'Qdoba Official Nutrition Information',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://www.qdoba.com/public/assets/documents/qdoba-nutrition-information.pdf'
    },
    'qdoba fajita veggies': {
        name: 'Qdoba Fajita Vegetables',
        calories: 35,
        protein: 1,
        carbs: 4,
        fat: 2,
        sugar: 2,
        source: 'Qdoba Official Nutrition Information',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://www.qdoba.com/public/assets/documents/qdoba-nutrition-information.pdf'
    },
    'qdoba pico de gallo': {
        name: 'Qdoba Pico de Gallo',
        calories: 10,
        protein: 0,
        carbs: 2,
        fat: 0,
        sugar: 1,
        source: 'Qdoba Official Nutrition Information',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://www.qdoba.com/public/assets/documents/qdoba-nutrition-information.pdf'
    },
    'qdoba shredded lettuce': {
        name: 'Qdoba Shredded Lettuce',
        calories: 5,
        protein: 0,
        carbs: 1,
        fat: 0,
        sugar: 0,
        source: 'Qdoba Official Nutrition Information',
        sourceType: 'menu_pdf',
        sourceUrl: 'https://www.qdoba.com/public/assets/documents/qdoba-nutrition-information.pdf'
    },

    // ==================== GROCERY/GENERIC ITEMS ====================
    'great value 2% milk 1 cup': { name: "2% Milk (1 cup)", calories: 122, protein: 8, carbs: 12, fat: 5, sugar: 12, source: "USDA" },
    '2% milk': { name: "2% Milk (1 cup)", calories: 122, protein: 8, carbs: 12, fat: 5, sugar: 12, source: "USDA" },
    'great value white bread 2 slices': { name: "White Bread (2 slices)", calories: 160, protein: 6, carbs: 28, fat: 2, sugar: 4, source: "USDA" },
    'white bread': { name: "White Bread (1 slice)", calories: 80, protein: 3, carbs: 14, fat: 1, sugar: 2, source: "USDA" },
    'oscar mayer turkey lunch meat 2 oz': { name: "Turkey Lunch Meat (2 oz)", calories: 50, protein: 10, carbs: 1, fat: 1, sugar: 0, source: "USDA" },
    'kraft singles cheese slice': { name: "American Cheese Slice", calories: 60, protein: 4, carbs: 2, fat: 5, sugar: 1, source: "Kraft" },
    'american cheese slice': { name: "American Cheese Slice", calories: 60, protein: 4, carbs: 2, fat: 5, sugar: 1, source: "Kraft" },
    'barilla spaghetti 2 oz dry': { name: "Dry Spaghetti (2 oz)", calories: 200, protein: 7, carbs: 42, fat: 1, sugar: 2, source: "USDA" },
    'spaghetti': { name: "Cooked Spaghetti (1 cup)", calories: 220, protein: 8, carbs: 43, fat: 1, sugar: 1, source: "USDA" },
    'ragu marinara sauce half cup': { name: "Marinara Sauce (1/2 cup)", calories: 60, protein: 2, carbs: 10, fat: 1, sugar: 6, source: "Ragu" },
    'marinara sauce': { name: "Marinara Sauce (1/2 cup)", calories: 60, protein: 2, carbs: 10, fat: 1, sugar: 6, source: "USDA" },
    'tyson grilled chicken breast': { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, source: "USDA" },
    'mission flour tortilla large': { name: "Large Flour Tortilla", calories: 210, protein: 5, carbs: 35, fat: 5, sugar: 1, source: "Mission" },
    'flour tortilla': { name: "Large Flour Tortilla", calories: 210, protein: 5, carbs: 35, fat: 5, sugar: 1, source: "USDA" },
    'doritos nacho cheese 1 oz': { name: "Doritos Nacho Cheese (1 oz)", calories: 140, protein: 2, carbs: 18, fat: 7, sugar: 1, source: "Frito-Lay" },
    'doritos': { name: "Doritos Nacho Cheese (1 oz)", calories: 140, protein: 2, carbs: 18, fat: 7, sugar: 1, source: "Frito-Lay" },
    'oreos 3 cookies': { name: "Oreo Cookies (3)", calories: 160, protein: 1, carbs: 25, fat: 7, sugar: 14, source: "Nabisco" },
    'oreo': { name: "Oreo Cookie (1)", calories: 53, protein: 0, carbs: 8, fat: 2, sugar: 5, source: "Nabisco" },
    'canned tuna': { name: "Canned Tuna (5 oz)", calories: 110, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0, serving: '1 five-ounce can', source: "Generic chunk-light tuna estimate; confirm water or oil", sourceType: 'estimate', confidence: 'medium', needsVerification: true },
    'tuna in water': { name: "Canned Tuna in Water (5 oz)", calories: 110, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0, serving: '1 five-ounce can', source: "Generic chunk-light tuna in water estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'canned tuna in water': { name: "Canned Tuna in Water (5 oz)", calories: 110, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0, serving: '1 five-ounce can', source: "Generic chunk-light tuna in water estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'tuna packed in water': { name: "Canned Tuna in Water (5 oz)", calories: 110, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0, serving: '1 five-ounce can', source: "Generic chunk-light tuna in water estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'tuna in oil': { name: "Canned Tuna in Oil (5 oz)", calories: 200, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 10, sugar: 0, serving: '1 five-ounce can', source: "Generic canned tuna in oil estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'canned tuna in oil': { name: "Canned Tuna in Oil (5 oz)", calories: 200, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 10, sugar: 0, serving: '1 five-ounce can', source: "Generic canned tuna in oil estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'tuna packed in oil': { name: "Canned Tuna in Oil (5 oz)", calories: 200, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 10, sugar: 0, serving: '1 five-ounce can', source: "Generic canned tuna in oil estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'ritz cracker': { name: "Ritz-style Butter Cracker", calories: 16, protein: 0, carbs: 2, fiber: 0, netCarbs: 2, fat: 1, sugar: 0, serving: '1 cracker', source: "Generic round butter cracker estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'ritz crackers': { name: "Ritz-style Butter Cracker", calories: 16, protein: 0, carbs: 2, fiber: 0, netCarbs: 2, fat: 1, sugar: 0, serving: '1 cracker', source: "Generic round butter cracker estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'butter cracker': { name: "Round Butter Cracker", calories: 16, protein: 0, carbs: 2, fiber: 0, netCarbs: 2, fat: 1, sugar: 0, serving: '1 cracker', source: "Generic round butter cracker estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'butter crackers': { name: "Round Butter Cracker", calories: 16, protein: 0, carbs: 2, fiber: 0, netCarbs: 2, fat: 1, sugar: 0, serving: '1 cracker', source: "Generic round butter cracker estimate", sourceType: 'database', confidence: 'medium', needsVerification: true },
    'cracker': { name: "Round Butter Cracker", calories: 16, protein: 0, carbs: 2, fiber: 0, netCarbs: 2, fat: 1, sugar: 0, serving: '1 cracker', source: "Generic round butter cracker estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'crackers': { name: "Round Butter Cracker", calories: 16, protein: 0, carbs: 2, fiber: 0, netCarbs: 2, fat: 1, sugar: 0, serving: '1 cracker', source: "Generic round butter cracker estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    // Blueberry muffin sizes vary wildly. Use the package/standard serving as the safe default,
    // and only use large bakery/Costco values when the user says that size/type.
    'blueberry muffin': { name: "Blueberry Muffins (standard / box mix)", calories: 270, protein: 3, carbs: 63, fiber: 1, netCarbs: 62, fat: 1, sugar: 31, serving: '2 muffins (81g dry mix and blueberries)', source: "Blueberry muffin package label default", sourceType: 'estimate', confidence: 'medium', needsVerification: true },
    'blueberry muffins': { name: "Blueberry Muffins (standard / box mix)", calories: 270, protein: 3, carbs: 63, fiber: 1, netCarbs: 62, fat: 1, sugar: 31, serving: '2 muffins (81g dry mix and blueberries)', source: "Blueberry muffin package label default", sourceType: 'estimate', confidence: 'medium', needsVerification: true },
    'standard blueberry muffin': { name: "Blueberry Muffins (standard / box mix)", calories: 270, protein: 3, carbs: 63, fiber: 1, netCarbs: 62, fat: 1, sugar: 31, serving: '2 muffins (81g dry mix and blueberries)', source: "Blueberry muffin package label default", sourceType: 'estimate', confidence: 'medium', needsVerification: true },
    'regular blueberry muffin': { name: "Blueberry Muffins (standard / box mix)", calories: 270, protein: 3, carbs: 63, fiber: 1, netCarbs: 62, fat: 1, sugar: 31, serving: '2 muffins (81g dry mix and blueberries)', source: "Blueberry muffin package label default", sourceType: 'estimate', confidence: 'medium', needsVerification: true },
    'box mix blueberry muffin': { name: "Blueberry Muffins (standard / box mix)", calories: 270, protein: 3, carbs: 63, fiber: 1, netCarbs: 62, fat: 1, sugar: 31, serving: '2 muffins (81g dry mix and blueberries)', source: "Blueberry muffin package label default", sourceType: 'estimate', confidence: 'medium', needsVerification: true },
    'blueberry muffin mix': { name: "Blueberry Muffins (standard / box mix)", calories: 270, protein: 3, carbs: 63, fiber: 1, netCarbs: 62, fat: 1, sugar: 31, serving: '2 muffins (81g dry mix and blueberries)', source: "Blueberry muffin package label default", sourceType: 'estimate', confidence: 'medium', needsVerification: true },
    'large blueberry muffin': { name: "Large Blueberry Muffin", calories: 385, protein: 6, carbs: 55, fiber: 1, netCarbs: 54, fat: 15, sugar: 28, serving: '1 large bakery muffin', source: "Large bakery muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'large bakery blueberry muffin': { name: "Large Blueberry Muffin", calories: 385, protein: 6, carbs: 55, fiber: 1, netCarbs: 54, fat: 15, sugar: 28, serving: '1 large bakery muffin', source: "Large bakery muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'bakery blueberry muffin': { name: "Large Blueberry Muffin", calories: 385, protein: 6, carbs: 55, fiber: 1, netCarbs: 54, fat: 15, sugar: 28, serving: '1 large bakery muffin', source: "Large bakery muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'jumbo blueberry muffin': { name: "Large Blueberry Muffin", calories: 385, protein: 6, carbs: 55, fiber: 1, netCarbs: 54, fat: 15, sugar: 28, serving: '1 large bakery muffin', source: "Large bakery muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'costco blueberry muffin': { name: "Costco/Kirkland Blueberry Muffin (large)", calories: 580, protein: 8, carbs: 68, fiber: 2, netCarbs: 66, fat: 29, sugar: 35, serving: '1 large muffin', source: "Costco bakery muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'kirkland blueberry muffin': { name: "Costco/Kirkland Blueberry Muffin (large)", calories: 580, protein: 8, carbs: 68, fiber: 2, netCarbs: 66, fat: 29, sugar: 35, serving: '1 large muffin', source: "Costco bakery muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'mini blueberry muffin': { name: "Mini Blueberry Muffin", calories: 45, protein: 1, carbs: 10, fiber: 0, netCarbs: 10, fat: 1, sugar: 5, serving: '1 mini muffin', source: "Mini muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'mini blueberry muffins': { name: "Mini Blueberry Muffin", calories: 45, protein: 1, carbs: 10, fiber: 0, netCarbs: 10, fat: 1, sugar: 5, serving: '1 mini muffin', source: "Mini muffin estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },

    // ==================== NATURAL FOODS ====================
    'avocado half': { name: "Avocado (1/2)", calories: 160, protein: 2, carbs: 9, fat: 15, sugar: 0, source: "USDA" },
    'avocado': { name: "Avocado (1/2)", calories: 160, protein: 2, carbs: 9, fat: 15, sugar: 0, source: "USDA" },
    'banana medium': { name: "Banana (medium)", calories: 105, protein: 1, carbs: 27, fat: 0, sugar: 14, source: "USDA" },
    'banana': { name: "Banana (medium)", calories: 105, protein: 1, carbs: 27, fat: 0, sugar: 14, source: "USDA" },
    'apple medium': { name: "Apple (medium)", calories: 95, protein: 0, carbs: 25, fat: 0, sugar: 19, source: "USDA" },
    'apple': { name: "Apple (medium)", calories: 95, protein: 0, carbs: 25, fat: 0, sugar: 19, source: "USDA" },
    'large egg scrambled': { name: "Scrambled Egg (large)", calories: 91, protein: 6, carbs: 1, fat: 7, sugar: 1, source: "USDA" },
    'egg scrambled': { name: "Scrambled Egg (large)", calories: 91, protein: 6, carbs: 1, fat: 7, sugar: 1, source: "USDA" },
    'large egg': { name: "Egg (large)", calories: 70, protein: 6, carbs: 1, fat: 5, sugar: 0, serving: '1 large egg', source: "USDA", sourceType: 'database' },
    'large eggs': { name: "Egg (large)", calories: 70, protein: 6, carbs: 1, fat: 5, sugar: 0, serving: '1 large egg', source: "USDA", sourceType: 'database' },
    'egg': { name: "Egg (large)", calories: 70, protein: 6, carbs: 1, fat: 5, sugar: 0, source: "USDA" },
    'chicken breast grilled 4 oz': { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, source: "USDA" },
    'grilled chicken breast': { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, source: "USDA" },
    'chicken breast': { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, source: "USDA" },
    'brown rice 1 cup cooked': { name: "Brown Rice (1 cup cooked)", calories: 216, protein: 5, carbs: 45, fat: 2, sugar: 0, source: "USDA" },
    'brown rice': { name: "Brown Rice (1 cup cooked)", calories: 216, protein: 5, carbs: 45, fat: 2, sugar: 0, source: "USDA" },
    'white rice': { name: "White Rice (1 cup cooked)", calories: 205, protein: 4, carbs: 45, fat: 0, sugar: 0, source: "USDA" },
    'rice': { name: "White Rice (1 cup cooked)", calories: 205, protein: 4, carbs: 45, fat: 0, sugar: 0, source: "USDA" },
    'quinoa cooked 1 cup': { name: "Cooked Quinoa (1 cup)", calories: 222, protein: 8, carbs: 39, fiber: 5, netCarbs: 34, fat: 4, sugar: 2, serving: '1 cup cooked (185g)', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/168917/nutrients' },
    'cooked quinoa': { name: "Cooked Quinoa (1 cup)", calories: 222, protein: 8, carbs: 39, fiber: 5, netCarbs: 34, fat: 4, sugar: 2, serving: '1 cup cooked (185g)', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/168917/nutrients' },
    'quinoa': { name: "Cooked Quinoa (1 cup)", calories: 222, protein: 8, carbs: 39, fiber: 5, netCarbs: 34, fat: 4, sugar: 2, serving: '1 cup cooked (185g)', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/168917/nutrients' },
    'oatmeal': { name: "Oatmeal (1 cup cooked)", calories: 154, protein: 6, carbs: 27, fiber: 4, netCarbs: 23, fat: 3, sugar: 1, source: "USDA" },
    'protein shake': { name: "Protein Shake (generic)", calories: 180, protein: 30, carbs: 8, fiber: 1, netCarbs: 7, fat: 3, sugar: 4, source: "Generic protein shake estimate", sourceType: 'estimate', confidence: 'low', needsVerification: true },
    'popcorn': { name: "Popcorn (air-popped, 1 cup)", calories: 31, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 0, sugar: 0, serving: '1 cup popped', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/167959/nutrients' },
    'pop corn': { name: "Popcorn (air-popped, 1 cup)", calories: 31, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 0, sugar: 0, serving: '1 cup popped', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/167959/nutrients' },
    'air popped popcorn': { name: "Popcorn (air-popped, 1 cup)", calories: 31, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 0, sugar: 0, serving: '1 cup popped', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/167959/nutrients' },
    'plain popcorn': { name: "Popcorn (air-popped, 1 cup)", calories: 31, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 0, sugar: 0, serving: '1 cup popped', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/167959/nutrients' },
    'buttered popcorn': { name: "Popcorn (buttered/oil-popped, 1 cup)", calories: 55, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 3, sugar: 0, serving: '1 cup popped', source: "USDA FoodData Central estimate", sourceType: 'database' },
    'butter popcorn': { name: "Popcorn (buttered/oil-popped, 1 cup)", calories: 55, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 3, sugar: 0, serving: '1 cup popped', source: "USDA FoodData Central estimate", sourceType: 'database' },
    'microwave popcorn': { name: "Popcorn (microwave/oil-popped, 1 cup)", calories: 60, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 3, sugar: 0, serving: '1 cup popped', source: "USDA FoodData Central estimate", sourceType: 'database' },
    'salmon fillet 4 oz': { name: "Salmon Fillet (4 oz)", calories: 234, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 14, sugar: 0, serving: '4 oz cooked', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/175168/nutrients' },
    'grilled salmon': { name: "Salmon Fillet (4 oz)", calories: 234, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 14, sugar: 0, serving: '4 oz cooked', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/175168/nutrients' },
    'salmon': { name: "Salmon Fillet (4 oz)", calories: 234, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 14, sugar: 0, serving: '4 oz cooked', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/175168/nutrients' },
    'roasted asparagus': { name: "Roasted Asparagus (1 cup)", calories: 80, protein: 4, carbs: 7, fiber: 4, netCarbs: 3, fat: 5, sugar: 2, serving: '1 cup cooked with about 1 tsp oil', source: "USDA FoodData Central + cooking oil estimate", sourceType: 'estimate', sourceUrl: 'https://fdc.nal.usda.gov/food-details/168390/nutrients', confidence: 'medium', needsVerification: true },
    'cooked asparagus': { name: "Cooked Asparagus (1 cup)", calories: 40, protein: 4, carbs: 7, fiber: 4, netCarbs: 3, fat: 0, sugar: 2, serving: '1 cup cooked (180g)', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/168390/nutrients' },
    'asparagus': { name: "Cooked Asparagus (1 cup)", calories: 40, protein: 4, carbs: 7, fiber: 4, netCarbs: 3, fat: 0, sugar: 2, serving: '1 cup cooked (180g)', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/food-details/168390/nutrients' },
    'greek yogurt 1 cup': { name: "Greek Yogurt (1 cup)", calories: 130, protein: 17, carbs: 8, fat: 0, sugar: 7, source: "USDA" },
    'greek yogurt': { name: "Greek Yogurt (1 cup)", calories: 130, protein: 17, carbs: 8, fat: 0, sugar: 7, source: "USDA" },
    'almonds 1 oz': { name: "Almonds (1 oz)", calories: 164, protein: 6, carbs: 6, fat: 14, sugar: 1, source: "USDA" },
    'almonds': { name: "Almonds (1 oz)", calories: 164, protein: 6, carbs: 6, fat: 14, sugar: 1, source: "USDA" },
    'peanut butter 2 tbsp': { name: "Peanut Butter (2 tbsp)", calories: 188, protein: 8, carbs: 6, fat: 16, sugar: 3, source: "USDA" },
    'peanut butter': { name: "Peanut Butter (2 tbsp)", calories: 188, protein: 8, carbs: 6, fat: 16, sugar: 3, source: "USDA" },

    // ==================== COMBO MEALS ====================
    'big mac meal': { name: "McDonald's Big Mac Meal (Medium)", calories: 1120, protein: 34, carbs: 130, fat: 52, sugar: 48, source: "McDonald's Official" },
    'big mac meal with medium fries and coke': { name: "McDonald's Big Mac Meal (Medium)", calories: 1120, protein: 34, carbs: 130, fat: 52, sugar: 48, source: "McDonald's Official" },
    'chick-fil-a chicken sandwich meal': { name: "Chick-fil-A Chicken Sandwich Meal", calories: 950, protein: 35, carbs: 100, fat: 40, sugar: 55, source: "Chick-fil-A Official" },
    'chick fil a chicken sandwich meal': { name: "Chick-fil-A Chicken Sandwich Meal", calories: 950, protein: 35, carbs: 100, fat: 40, sugar: 55, source: "Chick-fil-A Official" },
    'wendy\'s 10 piece nuggets with large fries': { name: "Wendy's 10-Piece Nuggets with Large Fries", calories: 960, protein: 26, carbs: 95, fat: 53, sugar: 0, source: "Wendy's Official" },
    'wendy\'s nuggets and fries': { name: "Wendy's 10-Piece Nuggets with Large Fries", calories: 960, protein: 26, carbs: 95, fat: 53, sugar: 0, source: "Wendy's Official" },

    // ==================== PIZZA ====================
    'pepperoni pizza': { name: "Pepperoni Pizza (1 slice, large)", calories: 285, protein: 12, carbs: 30, fat: 13, sugar: 3, source: "USDA" },
    'pepperoni pizza slice': { name: "Pepperoni Pizza (1 slice, large)", calories: 285, protein: 12, carbs: 30, fat: 13, sugar: 3, source: "USDA" },
    '2 slices pepperoni pizza': { name: "Pepperoni Pizza (2 slices)", calories: 570, protein: 24, carbs: 60, fat: 26, sugar: 6, source: "USDA" },
    'cheese pizza': { name: "Cheese Pizza (1 slice, large)", calories: 250, protein: 11, carbs: 30, fat: 10, sugar: 3, source: "USDA" },
    'pizza slice': { name: "Pizza (1 slice, large)", calories: 285, protein: 12, carbs: 30, fat: 13, sugar: 3, source: "USDA" },
    'margherita pizza whole': { name: "Margherita Pizza (whole 10-12 inch)", calories: 950, protein: 38, carbs: 120, fat: 34, sugar: 9, source: "USDA Estimate" },
    'whole margherita pizza': { name: "Margherita Pizza (whole 10-12 inch)", calories: 950, protein: 38, carbs: 120, fat: 34, sugar: 9, source: "USDA Estimate" },
    'neapolitan margherita pizza whole': { name: "Neapolitan Margherita Pizza (whole 10-12 inch)", calories: 950, protein: 38, carbs: 120, fat: 34, sugar: 9, source: "USDA Estimate" },
    'whole neapolitan margherita pizza': { name: "Neapolitan Margherita Pizza (whole 10-12 inch)", calories: 950, protein: 38, carbs: 120, fat: 34, sugar: 9, source: "USDA Estimate" },
    'kirkland signature supreme cauliflower crust pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza", calories: 310, protein: 14, carbs: 31, fiber: 1, netCarbs: 30, fat: 15, sugar: 4, serving: '1/4 pizza (138g)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'kirkland signature cauliflower crust supreme pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza", calories: 310, protein: 14, carbs: 31, fiber: 1, netCarbs: 30, fat: 15, sugar: 4, serving: '1/4 pizza (138g)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'kirkland supreme cauliflower pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza", calories: 310, protein: 14, carbs: 31, fiber: 1, netCarbs: 30, fat: 15, sugar: 4, serving: '1/4 pizza (138g)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'kirkland cauliflower pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza", calories: 310, protein: 14, carbs: 31, fiber: 1, netCarbs: 30, fat: 15, sugar: 4, serving: '1/4 pizza (138g)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'costco kirkland cauliflower pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza", calories: 310, protein: 14, carbs: 31, fiber: 1, netCarbs: 30, fat: 15, sugar: 4, serving: '1/4 pizza (138g)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'kirkland signature supreme cauliflower crust pizza whole pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza (whole pizza)", calories: 1240, protein: 56, carbs: 124, fiber: 4, netCarbs: 120, fat: 60, sugar: 16, serving: '1 whole pizza (4 label servings)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'whole kirkland signature supreme cauliflower crust pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza (whole pizza)", calories: 1240, protein: 56, carbs: 124, fiber: 4, netCarbs: 120, fat: 60, sugar: 16, serving: '1 whole pizza (4 label servings)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'kirkland cauliflower pizza whole pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza (whole pizza)", calories: 1240, protein: 56, carbs: 124, fiber: 4, netCarbs: 120, fat: 60, sugar: 16, serving: '1 whole pizza (4 label servings)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'whole kirkland cauliflower pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza (whole pizza)", calories: 1240, protein: 56, carbs: 124, fiber: 4, netCarbs: 120, fat: 60, sugar: 16, serving: '1 whole pizza (4 label servings)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'costco kirkland cauliflower pizza whole pizza': { name: "Kirkland Signature Supreme Cauliflower Crust Pizza (whole pizza)", calories: 1240, protein: 56, carbs: 124, fiber: 4, netCarbs: 120, fat: 60, sugar: 16, serving: '1 whole pizza (4 label servings)', source: "Kirkland package nutrition label", sourceType: 'official' },
    'quest supreme pizza': { name: "Quest Supreme Thin Crust Pizza (1/3 pizza)", calories: 260, protein: 20, carbs: 18, fiber: 12, netCarbs: 6, fat: 17, sugar: 2, serving: '1/3 pizza (126g)', source: "Quest manufacturer nutrition / package label", sourceType: 'official', sourceUrl: 'https://www.questnutrition.com/collections/more-products/products/supreme-pizza' },
    'quest supreme thin crust pizza': { name: "Quest Supreme Thin Crust Pizza (1/3 pizza)", calories: 260, protein: 20, carbs: 18, fiber: 12, netCarbs: 6, fat: 17, sugar: 2, serving: '1/3 pizza (126g)', source: "Quest manufacturer nutrition / package label", sourceType: 'official', sourceUrl: 'https://www.questnutrition.com/collections/more-products/products/supreme-pizza' },
    'quest supreme whole pizza': { name: "Quest Supreme Thin Crust Pizza (whole pizza)", calories: 780, protein: 60, carbs: 54, fiber: 36, netCarbs: 18, fat: 51, sugar: 6, serving: '1 whole pizza', source: "Quest manufacturer nutrition / package label", sourceType: 'official', sourceUrl: 'https://www.questnutrition.com/collections/more-products/products/supreme-pizza' },
    'quest supreme full pizza': { name: "Quest Supreme Thin Crust Pizza (whole pizza)", calories: 780, protein: 60, carbs: 54, fiber: 36, netCarbs: 18, fat: 51, sugar: 6, serving: '1 whole pizza', source: "Quest manufacturer nutrition / package label", sourceType: 'official', sourceUrl: 'https://www.questnutrition.com/collections/more-products/products/supreme-pizza' },
    'quest thin crust supreme whole pizza': { name: "Quest Supreme Thin Crust Pizza (whole pizza)", calories: 780, protein: 60, carbs: 54, fiber: 36, netCarbs: 18, fat: 51, sugar: 6, serving: '1 whole pizza', source: "Quest manufacturer nutrition / package label", sourceType: 'official', sourceUrl: 'https://www.questnutrition.com/collections/more-products/products/supreme-pizza' },

    // ==================== PANERA ADDITIONAL ====================
    'panera grilled chicken salad': { name: "Panera Green Goddess Cobb Salad with Chicken", calories: 450, protein: 35, carbs: 20, fat: 28, sugar: 8, source: "Panera Official" },
    'grilled chicken salad panera': { name: "Panera Green Goddess Cobb Salad with Chicken", calories: 450, protein: 35, carbs: 20, fat: 28, sugar: 8, source: "Panera Official" },

    // ==================== TYSON PRODUCTS ====================
    'tyson grilled chicken breast': { name: "Tyson Grilled Chicken Breast", calories: 110, protein: 21, carbs: 2, fat: 3, sugar: 0, source: "Tyson Official" },
    'tyson chicken breast': { name: "Tyson Grilled Chicken Breast", calories: 110, protein: 21, carbs: 2, fat: 3, sugar: 0, source: "Tyson Official" },

    // ==================== PACKAGED BREAKFAST SAUSAGE LINKS ====================
    // Johnsonville Vermont Maple small breakfast links are roughly 150-170 calories per 3 links.
    // Use this for visible small breakfast links so 6 links lands around 300-340 calories, not 900.
    'johnsonville vermont maple syrup breakfast sausage links': { name: "Johnsonville Vermont Maple Syrup Breakfast Sausage Links", calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1, serving: '3 cooked links (55g)', source: "Johnsonville Vermont Maple links nutrition reference", sourceType: 'database', sourceUrl: 'https://www.calorieking.com/us/en/foods/f/calories-in-franks-wieners-sausages-vermont-maple-syrup-breakfast-sausage-links/mz4dOyNORMWVCjKVD37Xxg' },
    'johnsonville vermont maple breakfast sausage links': { name: "Johnsonville Vermont Maple Syrup Breakfast Sausage Links", calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1, serving: '3 cooked links (55g)', source: "Johnsonville Vermont Maple links nutrition reference", sourceType: 'database', sourceUrl: 'https://www.calorieking.com/us/en/foods/f/calories-in-franks-wieners-sausages-vermont-maple-syrup-breakfast-sausage-links/mz4dOyNORMWVCjKVD37Xxg' },
    'johnsonville maple breakfast sausage links': { name: "Johnsonville Vermont Maple Syrup Breakfast Sausage Links", calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1, serving: '3 cooked links (55g)', source: "Johnsonville Vermont Maple links nutrition reference", sourceType: 'database', sourceUrl: 'https://www.calorieking.com/us/en/foods/f/calories-in-franks-wieners-sausages-vermont-maple-syrup-breakfast-sausage-links/mz4dOyNORMWVCjKVD37Xxg' },
    'vermont maple syrup breakfast sausage links': { name: "Johnsonville Vermont Maple Syrup Breakfast Sausage Links", calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1, serving: '3 cooked links (55g)', source: "Johnsonville Vermont Maple links nutrition reference", sourceType: 'database', sourceUrl: 'https://www.calorieking.com/us/en/foods/f/calories-in-franks-wieners-sausages-vermont-maple-syrup-breakfast-sausage-links/mz4dOyNORMWVCjKVD37Xxg' },
    'vermont maple breakfast sausage links': { name: "Johnsonville Vermont Maple Syrup Breakfast Sausage Links", calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1, serving: '3 cooked links (55g)', source: "Johnsonville Vermont Maple links nutrition reference", sourceType: 'database', sourceUrl: 'https://www.calorieking.com/us/en/foods/f/calories-in-franks-wieners-sausages-vermont-maple-syrup-breakfast-sausage-links/mz4dOyNORMWVCjKVD37Xxg' },
    'small sausage link': { name: "Small Sausage Link", calories: 57, protein: 3, carbs: 1, fiber: 0, netCarbs: 1, fat: 4, sugar: 0, serving: '1 small sausage link', source: "Breakfast sausage link nutrition reference", sourceType: 'database' },
    'small sausage links': { name: "Small Sausage Link", calories: 57, protein: 3, carbs: 1, fiber: 0, netCarbs: 1, fat: 4, sugar: 0, serving: '1 small sausage link', source: "Breakfast sausage link nutrition reference", sourceType: 'database' },
    'small breakfast sausage links': { name: "Small Breakfast Sausage Links", calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1, serving: '3 small links', source: "Breakfast sausage links nutrition reference", sourceType: 'database' },
    'breakfast sausage links': { name: "Breakfast Sausage Links", calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1, serving: '3 small links', source: "Breakfast sausage links nutrition reference", sourceType: 'database' },
    'large sausage link': { name: "Large Sausage Link", calories: 225, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 20, sugar: 1, serving: '1 large link (about 70g)', source: "USDA FoodData Central bratwurst/large cooked link estimate", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171622/nutrients' },
    'large sausage links': { name: "Large Sausage Link", calories: 225, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 20, sugar: 1, serving: '1 large link (about 70g)', source: "USDA FoodData Central bratwurst/large cooked link estimate", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171622/nutrients' },
    'regular sausage link': { name: "Large Sausage Link", calories: 225, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 20, sugar: 1, serving: '1 large link (about 70g)', source: "USDA FoodData Central bratwurst/large cooked link estimate", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171622/nutrients' },
    'regular sausage links': { name: "Large Sausage Link", calories: 225, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 20, sugar: 1, serving: '1 large link (about 70g)', source: "USDA FoodData Central bratwurst/large cooked link estimate", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171622/nutrients' },
    'bratwurst': { name: "Bratwurst / Large Sausage Link", calories: 225, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 20, sugar: 1, serving: '1 large link (about 70g)', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171622/nutrients' },
    'bratwurst sausage links': { name: "Bratwurst / Large Sausage Link", calories: 225, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 20, sugar: 1, serving: '1 large link (about 70g)', source: "USDA FoodData Central", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171622/nutrients' },
    'sausage links': { name: "Large Sausage Link", calories: 225, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 20, sugar: 1, serving: '1 large link (about 70g)', source: "USDA FoodData Central bratwurst/large cooked link estimate", sourceType: 'database', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171622/nutrients' },

    // ==================== PACKAGED CANDY LABELS ====================
    // Verified from package nutrition label: serving size 20 pieces (31g)
    'trolli sour brite eggs': { name: "Trolli Sour Brite Eggs", calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19, serving: '20 pieces (31g)', source: "Trolli package nutrition label", sourceType: 'official' },
    'trolli sour bright eggs': { name: "Trolli Sour Brite Eggs", calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19, serving: '20 pieces (31g)', source: "Trolli package nutrition label", sourceType: 'official' },
    'trolley sour brite eggs': { name: "Trolli Sour Brite Eggs", calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19, serving: '20 pieces (31g)', source: "Trolli package nutrition label", sourceType: 'official' },
    'trolley sour bright eggs': { name: "Trolli Sour Brite Eggs", calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19, serving: '20 pieces (31g)', source: "Trolli package nutrition label", sourceType: 'official' },
    'sour brite eggs': { name: "Trolli Sour Brite Eggs", calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19, serving: '20 pieces (31g)', source: "Trolli package nutrition label", sourceType: 'official' },
    'sour bright eggs': { name: "Trolli Sour Brite Eggs", calories: 110, protein: 1, carbs: 26, fat: 0, sugar: 19, serving: '20 pieces (31g)', source: "Trolli package nutrition label", sourceType: 'official' },

    // ==================== DRINKS ====================
    'coffee with cream and sugar': { name: "Coffee with Cream and Sugar", calories: 60, protein: 0, carbs: 8, fat: 2, sugar: 7, source: "USDA" },
    'coffee': { name: "Black Coffee", calories: 2, protein: 0, carbs: 0, fat: 0, sugar: 0, source: "USDA" },
    'orange juice': { name: "Orange Juice (8 oz)", calories: 110, protein: 2, carbs: 26, fat: 0, sugar: 21, source: "USDA" },
    'coca cola': { name: "Coca-Cola (12 oz)", calories: 140, protein: 0, carbs: 39, fat: 0, sugar: 39, source: "Coca-Cola" },
    'coke': { name: "Coca-Cola (12 oz)", calories: 140, protein: 0, carbs: 39, fat: 0, sugar: 39, source: "Coca-Cola" },
    'pepsi': { name: "Pepsi (12 oz)", calories: 150, protein: 0, carbs: 41, fat: 0, sugar: 41, source: "PepsiCo" },
    'sprite': { name: "Sprite (12 oz)", calories: 140, protein: 0, carbs: 38, fat: 0, sugar: 38, source: "Coca-Cola" },
    'dr pepper': { name: "Dr Pepper (12 oz)", calories: 150, protein: 0, carbs: 40, fat: 0, sugar: 40, source: "Keurig Dr Pepper" },

    // ==================== DAIRY PRODUCTS ====================
    // Daisy Brand Cottage Cheese
    'daisy cottage cheese with pineapple': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy pineapple cottage cheese': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy brand cottage cheese with pineapple': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy brand pineapple cottage cheese': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'pineapple cottage cheese daisy': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'cottage cheese with pineapple daisy': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy cottage cheese pineapple': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy cottage cheese 1 container': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy cottage cheese 170g': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy cottage cheese 160 calories': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    'daisy cottage cheese 15 carbs': { name: "Daisy Cottage Cheese with Pineapple (1 container, 170g)", calories: 160, protein: 14, carbs: 15, fiber: 0, netCarbs: 15, fat: 5, sugar: 11, serving: '1 container (170g)', source: "Daisy package nutrition label" },
    // Plain Daisy Cottage Cheese
    'daisy cottage cheese': { name: "Daisy Cottage Cheese 4% (1/2 cup)", calories: 110, protein: 13, carbs: 4, fat: 5, sugar: 3, source: "Daisy Brand Official" },
    'daisy brand cottage cheese': { name: "Daisy Cottage Cheese 4% (1/2 cup)", calories: 110, protein: 13, carbs: 4, fat: 5, sugar: 3, source: "Daisy Brand Official" },
    // Generic cottage cheese
    'cottage cheese': { name: "Cottage Cheese 4% (1/2 cup)", calories: 110, protein: 13, carbs: 4, fat: 5, sugar: 3, source: "USDA" },
    'cottage cheese with pineapple': { name: "Cottage Cheese with Pineapple (6oz)", calories: 160, protein: 14, carbs: 15, fat: 5, sugar: 12, source: "USDA" },
    'pineapple cottage cheese': { name: "Cottage Cheese with Pineapple (6oz)", calories: 160, protein: 14, carbs: 15, fat: 5, sugar: 12, source: "USDA" },
    'low fat cottage cheese': { name: "Low Fat Cottage Cheese 2% (1/2 cup)", calories: 90, protein: 12, carbs: 5, fat: 2, sugar: 4, source: "USDA" },
    'fat free cottage cheese': { name: "Fat Free Cottage Cheese (1/2 cup)", calories: 80, protein: 14, carbs: 6, fat: 0, sugar: 4, source: "USDA" },

    // Other Dairy
    'string cheese': { name: "String Cheese (1 stick)", calories: 80, protein: 7, carbs: 1, fat: 6, sugar: 0, source: "USDA" },
    'cheddar cheese': { name: "Cheddar Cheese (1 oz)", calories: 113, protein: 7, carbs: 0, fat: 9, sugar: 0, source: "USDA" },
    'mozzarella cheese': { name: "Mozzarella Cheese (1 oz)", calories: 85, protein: 6, carbs: 1, fat: 6, sugar: 0, source: "USDA" },
    'cream cheese': { name: "Cream Cheese (2 tbsp)", calories: 100, protein: 2, carbs: 1, fat: 10, sugar: 1, source: "USDA" },
    'whole milk': { name: "Whole Milk (1 cup)", calories: 149, protein: 8, carbs: 12, fat: 8, sugar: 12, source: "USDA" },
    'skim milk': { name: "Skim Milk (1 cup)", calories: 83, protein: 8, carbs: 12, fat: 0, sugar: 12, source: "USDA" },
    'almond milk': { name: "Almond Milk Unsweetened (1 cup)", calories: 30, protein: 1, carbs: 1, fat: 3, sugar: 0, source: "USDA" },
    'oat milk': { name: "Oat Milk (1 cup)", calories: 120, protein: 3, carbs: 16, fat: 5, sugar: 7, source: "USDA" },
    'butter': { name: "Butter (1 tbsp)", calories: 102, protein: 0, carbs: 0, fat: 12, sugar: 0, source: "USDA" },
    'sour cream': { name: "Sour Cream (2 tbsp)", calories: 60, protein: 1, carbs: 1, fat: 5, sugar: 1, source: "USDA" },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Normalize query for database lookup
function normalizeQuery(query) {
    return query.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/['']/g, "'")
        .trim();
}

function normalizeInputSource(value) {
    const normalized = String(value || '').toLowerCase().trim();
    if (normalized === 'voice' || normalized === 'search' || normalized === 'message' || normalized === 'photo' || normalized === 'test') {
        return normalized;
    }
    return 'search';
}

function normalizeVoiceTranscript(query) {
    let normalized = String(query || '').trim();
    if (!normalized) return normalized;

    const replacements = [
        [/\b(?:trolley|trolly|trollie|troli|truly)\b/gi, 'Trolli'],
        [/\bsour\s+bright\b/gi, 'Sour Brite'],
        [/\bsour\s+bite\b/gi, 'Sour Brite'],
        [/\bbrite\s+eggs?\b/gi, 'Brite Eggs'],
        [/\bnuggests?\b/gi, 'nuggets'],
        [/\bchickn\b/gi, 'chicken'],
        [/\bchik fil a\b/gi, 'chick fil a'],
        [/\bchick filet\b/gi, 'chick-fil-a'],
        [/\bmacdonalds\b/gi, "McDonald's"],
        [/\bmcdonalds\b/gi, "McDonald's"],
        [/\btoco bell\b/gi, 'Taco Bell'],
        [/\bpanda express orange chikn\b/gi, 'Panda Express Orange Chicken'],
        [/\bpapa johns\b/gi, 'Papa Johns'],
        [/\bdominos\b/gi, "Domino's"],
        [/\bjohnson\s*ville\b/gi, 'Johnsonville'],
        [/\bjohnsonvilled\b/gi, 'Johnsonville'],
        [/\bvermont\s+maple\s+sirup\b/gi, 'Vermont Maple Syrup'],
        [/\blittle ceasars\b/gi, 'Little Caesars'],
        [/\bjersey mikes\b/gi, "Jersey Mike's"],
        [/\bjimmy johns\b/gi, "Jimmy John's"],
        [/\bculvers\b/gi, "Culver's"],
        [/\barbys\b/gi, "Arby's"],
        [/\bsausage\s+egg\s+mc\s*muffin\b/gi, 'Sausage McMuffin with Egg'],
        [/\b(?:sick|sic)\s+cups?\b/gi, 'six cups'],
        [/\bpop\s+corn\b/gi, 'popcorn'],
        [/\bquestion(?=\s+(?:supreme|thin|pizza|crust|whole|full))/gi, 'Quest'],
        [/\bquest\s+(?:supper|suppereme|supereme)\b/gi, 'Quest Supreme'],
        [/\bfair\s+life\b/gi, 'Fairlife'],
        [/\bdazy\b/gi, 'Daisy'],
        [/\bfour\s*nett?\b/gi, '4 net'],
        [/\bfournette\b/gi, '4 net'],
        [/\bfor\s+nett?\b/gi, '4 net'],
        [/\bfore\s+nett?\b/gi, '4 net'],
        [/\bfour\s+net\b/gi, '4 net'],
        [/\bquest\s+supreme\s+full\s+pizza\b/gi, 'Quest Supreme whole pizza'],
        [/\bfull\s+pizza\b/gi, 'whole pizza'],
        [/\bmeal drink\b/gi, 'meal with drink'],
        [/\bhousten\b/gi, 'houston']
    ];

    for (const [pattern, replacement] of replacements) {
        normalized = normalized.replace(pattern, replacement);
    }

    return normalized.replace(/\s+/g, ' ').trim();
}

function buildQueryMeta(originalQuery, normalizedQuery) {
    if (normalizedQuery && normalizedQuery !== originalQuery) {
        return { originalQuery, normalizedQuery };
    }
    return { originalQuery };
}

function selectVoiceQuery(originalQuery, alternatives = []) {
    const candidates = [originalQuery, ...(Array.isArray(alternatives) ? alternatives : [])]
        .map((value) => canonicalizeVoiceQuery(String(value || '').trim()))
        .filter((value, index, arr) => value && arr.indexOf(value) === index);
    if (!candidates.length) return canonicalizeVoiceQuery(originalQuery);

    const scoreCandidate = (candidate, index) => {
        const databaseResult = searchDatabase(candidate);
        const nutritionCandidate = normalizeUserNutritionQuery(candidate);
        const explicitFacts = /\b\d+(?:\.\d+)?\s*(?:cal|cals|calories|kcal|g\s*(?:protein|carbs?|carbohydrates?|fat|fiber|sugar)|net\s*(?:carbs?|carbohydrates?))\b/i.test(nutritionCandidate);
        const listSignals = (candidate.match(/,/g) || []).length + (candidate.match(/\band\b/gi) || []).length;
        const tokenCount = normalizeQuery(candidate).split(/\s+/).filter(Boolean).length;
        let score = Math.min(40, tokenCount * 2) - index;
        if (databaseResult) {
            score += 55;
            if (['exact', 'variation', 'extracted', 'extracted-variation'].includes(databaseResult.matchType)) {
                score += 12;
            }
        }
        if (isVerifiedPackagedDbResult(databaseResult)) score += 35;
        if (explicitFacts) score += 180;
        if (listSignals >= 2 || (listSignals >= 1 && tokenCount >= 7)) score += 150;
        // Speech engines often emit a short generic partial as their first match.
        // Keep only a minimal primary tie-breaker so a richer exact alternative
        // such as a branded menu item can win.
        if (index === 0) score += 1;
        return score;
    };

    return candidates
        .map((candidate, index) => ({ candidate, score: scoreCandidate(candidate, index) }))
        .sort((a, b) => b.score - a.score)[0].candidate;
}

function replaceSpokenNutritionNumbers(value) {
    const smallNumbers = {
        zero: 0,
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
        thirteen: 13,
        fourteen: 14,
        fifteen: 15,
        sixteen: 16,
        seventeen: 17,
        eighteen: 18,
        nineteen: 19,
        twenty: 20,
        thirty: 30,
        forty: 40,
        fifty: 50,
        sixty: 60,
        seventy: 70,
        eighty: 80,
        ninety: 90
    };

    const numberWords = [
        ...Object.keys(smallNumbers),
        'hundred',
        'thousand',
        'and'
    ];
    const numberWordPattern = new RegExp(`\\b(?:${numberWords.join('|')})(?:[\\s-]+(?:${numberWords.join('|')}))*\\b`, 'gi');

    const parseSpokenNumber = (phrase) => {
        const tokens = phrase.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter((token) => token && token !== 'and');
        let total = 0;
        let current = 0;
        let matched = false;

        for (const token of tokens) {
            if (smallNumbers[token] !== undefined) {
                current += smallNumbers[token];
                matched = true;
            } else if (token === 'hundred') {
                current = (current || 1) * 100;
                matched = true;
            } else if (token === 'thousand') {
                total += (current || 1) * 1000;
                current = 0;
                matched = true;
            } else {
                return null;
            }
        }

        return matched ? total + current : null;
    };

    return String(value || '').replace(numberWordPattern, (match) => {
        const parsed = parseSpokenNumber(match);
        return Number.isFinite(parsed) ? String(parsed) : match;
    });
}

const foodCountUnitPattern = '(?:pieces?|pcs?|pc|counts?|ct|nuggets?|tenders?|wings?|links?|patties?|muffins?|slices?|bars?|items?|eggs?|bananas?|apples?|oranges?|shrimp|prawns?|meatballs?|dumplings?|tacos?|cookies?|crackers?|breasts?|fillets?|sandwiches?|burgers?|hot\s+dogs?)';
const outerQuantityUnitPattern = '(?:orders?|servings?|meals?|boxes?|packages?|containers?|sets?)';
const countDescriptorPattern = '(?:(?:small|breakfast|sausage|standard|regular|large|bakery|mini|chicken)\\s+)*';

function normalizeCountPhrase(value) {
    return normalizeQuery(replaceSpokenNutritionNumbers(String(value || '')));
}

function canonicalizeVoiceQuery(value) {
    const transcript = normalizeVoiceTranscript(value);
    if (!transcript) return transcript;

    // Convert spoken numbers only when they introduce a counted food. This
    // avoids changing names such as "Five Guys" while still normalizing the
    // count boundary before voice metadata, splitting, and local lookup.
    const simpleNumberWord = '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)';
    const compoundNumberWord = `(?:(?:twenty|thirty|forty|fifty)[-\\s](?:one|two|three|four|five|six|seven|eight|nine)|${simpleNumberWord})`;
    const countedNumberPattern = new RegExp(
        `\\b${compoundNumberWord}(?=\\s+${countDescriptorPattern}(${foodCountUnitPattern})\\b)`,
        'gi'
    );
    const withNormalizedCounts = transcript.replace(
        countedNumberPattern,
        (match) => normalizeCountPhrase(match)
    );
    const normalized = normalizeQuery(withNormalizedCounts);
    const canonical = normalized.replace(
        /\b(\d+(?:\.\d+)?)\s+sausage\s+links?\s+(small|breakfast)\s+sausage\s+links?\b/g,
        '$1 $2 sausage links'
    );

    return canonical !== normalizeQuery(transcript) ? canonical : transcript;
}

function canonicalCountUnit(unit) {
    const normalized = String(unit || '').toLowerCase();
    if (/^(?:pieces?|pcs?|pc|counts?|ct)$/.test(normalized)) return 'piece';
    if (/^nuggets?$/.test(normalized)) return 'nugget';
    if (/^tenders?$/.test(normalized)) return 'tender';
    if (/^wings?$/.test(normalized)) return 'wing';
    if (/^links?$/.test(normalized)) return 'link';
    if (/^patties?$/.test(normalized)) return 'patty';
    if (/^muffins?$/.test(normalized)) return 'muffin';
    if (/^slices?$/.test(normalized)) return 'slice';
    if (/^bars?$/.test(normalized)) return 'bar';
    if (/^eggs?$/.test(normalized)) return 'egg';
    if (/^bananas?$/.test(normalized)) return 'banana';
    if (/^apples?$/.test(normalized)) return 'apple';
    if (/^oranges?$/.test(normalized)) return 'orange';
    if (/^(?:shrimp|prawns?)$/.test(normalized)) return 'shrimp';
    if (/^meatballs?$/.test(normalized)) return 'meatball';
    if (/^dumplings?$/.test(normalized)) return 'dumpling';
    if (/^tacos?$/.test(normalized)) return 'taco';
    if (/^cookies?$/.test(normalized)) return 'cookie';
    if (/^crackers?$/.test(normalized)) return 'cracker';
    if (/^breasts?$/.test(normalized)) return 'breast';
    if (/^fillets?$/.test(normalized)) return 'fillet';
    if (/^sandwiches?$/.test(normalized)) return 'sandwich';
    if (/^burgers?$/.test(normalized)) return 'burger';
    if (/^hot\s+dogs?$/.test(normalized)) return 'hot dog';
    return 'item';
}

function extractCountMatches(value) {
    const normalized = normalizeCountPhrase(value);
    if (!normalized) return [];

    const pattern = new RegExp(
        `\\b(\\d+(?:\\.\\d+)?)(?:\\s*[-–—]\\s*|\\s+(?:x\\s+)?${countDescriptorPattern})(${foodCountUnitPattern})\\b`,
        'gi'
    );
    return [...normalized.matchAll(pattern)].map((match) => ({
        count: toFiniteNumber(match[1], 0),
        unit: match[2].toLowerCase(),
        canonicalUnit: canonicalCountUnit(match[2]),
        index: match.index ?? -1,
        text: match[0]
    })).filter((match) => match.count > 0);
}

function extractLooseCountMatch(value) {
    const normalized = normalizeCountPhrase(value);
    if (!normalized) return null;
    const pattern = new RegExp(
        `\\b(\\d+(?:\\.\\d+)?)\\b(?!\\s*(?:g|grams?|kg|oz|ounces?|lb|pounds?|ml|cups?|tbsp|tsp|in|inch|inches|cm|cal|cals|calories?|kcal|protein|carbs?|fat|fiber|sugar)\\b)(?=[^\\d,;]{0,80}\\b(${foodCountUnitPattern})\\b)`,
        'gi'
    );
    const matches = [...normalized.matchAll(pattern)];
    const match = matches[matches.length - 1];
    if (!match) return null;
    return {
        count: toFiniteNumber(match[1], 0),
        unit: match[2].toLowerCase(),
        canonicalUnit: canonicalCountUnit(match[2]),
        index: match.index ?? -1,
        text: match[0]
    };
}

function extractStandaloneQuantity(value) {
    const normalized = normalizeCountPhrase(value);
    const patterns = [
        new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*x\\b`, 'i'),
        new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s+${outerQuantityUnitPattern}\\b`, 'i')
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) return toFiniteNumber(match[1], null);
    }

    return null;
}

function extractCountBasis(value) {
    const normalized = normalizeCountPhrase(value);
    const matches = extractCountMatches(normalized);
    const groupMatch = matches[matches.length - 1] || extractLooseCountMatch(normalized);
    if (!groupMatch) {
        return {
            normalized,
            groupCount: null,
            groupUnit: null,
            groupMatch: null,
            explicitQuantity: extractStandaloneQuantity(normalized)
        };
    }

    const prefix = normalized.slice(0, groupMatch.index).trim();
    const explicitQuantityPatterns = [
        /(?:^|\s)(\d+(?:\.\d+)?)\s*x\s*$/i,
        new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s+${outerQuantityUnitPattern}\\s+(?:of\\s*)?$`, 'i'),
        new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s+${foodCountUnitPattern}\\s+of\\s*$`, 'i'),
        /(?:^|\s)(\d+(?:\.\d+)?)\s*$/i
    ];

    let explicitQuantity = null;
    for (const pattern of explicitQuantityPatterns) {
        const match = prefix.match(pattern);
        if (match) {
            explicitQuantity = toFiniteNumber(match[1], null);
            break;
        }
    }

    return {
        normalized,
        groupCount: groupMatch.count,
        groupUnit: groupMatch.canonicalUnit,
        groupMatch,
        explicitQuantity: Number.isFinite(explicitQuantity) && explicitQuantity > 0 ? explicitQuantity : null
    };
}

function formatCountServing(count, canonicalUnit) {
    const safeCount = toFiniteNumber(count, 1);
    const unit = canonicalUnit || 'piece';
    return `${Number.isInteger(safeCount) ? safeCount : safeCount} ${unit}${safeCount === 1 ? '' : 's'}`;
}

function normalizeUserNutritionQuery(query) {
    return normalizeQuery(replaceSpokenNutritionNumbers(normalizeVoiceTranscript(query)))
        .replace(/\bfour\s+net\b/g, '4 net')
        .replace(/\bfor\s+net\b/g, '4 net')
        .replace(/\bfore\s+net\b/g, '4 net')
        .replace(/\bnet\s+carb\b/g, 'net carbs')
        .replace(/\bcals\b/g, 'calories');
}

function extractNutritionNumber(normalizedQuery, patterns) {
    for (const pattern of patterns) {
        const match = normalizedQuery.match(pattern);
        if (match?.[1] !== undefined) {
            const value = toFiniteNumber(match[1], null);
            if (Number.isFinite(value)) return value;
        }
    }
    return null;
}

function findFirstNutritionMarkerIndex(normalizedQuery) {
    const markers = [
        /\bshould\s+be\b/,
        /\b(?:about|around|approximately|approx\.?|roughly|at|with|and)?\s*\d+(?:\.\d+)?\s*(?:g|grams?)?\s*(?:of\s*)?(?:cal|cals|calories?|kcal|net\s*(?:carbs?|carbohydrates?)|carbs?|carbohydrates?|fiber|fibre|protein|pro|fat|sugar)\b/,
        /\b(?:cal|cals|calories?|kcal|net\s*(?:carbs?|carbohydrates?)|carbs?|carbohydrates?|fiber|fibre|protein|pro|fat|sugar)\s*(?:is|are|should\s+be|=|equals|at|about|around|approximately|approx\.?|roughly)?\s*\d+(?:\.\d+)?\b/
    ];

    return markers.reduce((best, pattern) => {
        const match = normalizedQuery.match(pattern);
        if (!match || match.index === undefined) return best;
        return best === -1 ? match.index : Math.min(best, match.index);
    }, -1);
}

function cleanUserProvidedFoodName(normalizedQuery) {
    const nutritionMarker = findFirstNutritionMarkerIndex(normalizedQuery);
    const prefix = (nutritionMarker >= 0 ? normalizedQuery.slice(0, nutritionMarker) : normalizedQuery)
        .replace(/\b(i|we)\s+(had|ate|logged?|want|need|did|drank|made|mixed|took|used)\b/g, '')
        .replace(/\b(log|add|track)\b/g, '')
        .replace(/\b(a|an|the)\b/g, '')
        .replace(/\b(full|whole|entire)\b(?=\s+pizza\b)/g, '')
        .replace(/\b\d+(?:\.\d+)?\s*$/g, '')
        .replace(/\b(with|at|for)\s*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (/\bquest\b/.test(normalizedQuery) && /\bsupreme\b/.test(normalizedQuery) && /\bpizza\b/.test(normalizedQuery)) {
        return 'Quest Supreme Thin Crust Pizza';
    }

    if (!/[a-z]/.test(prefix)) {
        return 'Quick calorie entry';
    }

    return cleanText(prefix, cleanText(normalizedQuery, 'Food item', 100), 100);
}

function userWantsRemainingCaloriesAsCarbs(normalizedQuery) {
    return /\b(rest|remaining|remainder|leftover|however many)\b.{0,90}\b(carbs?|carbohydrates?)\b/.test(normalizedQuery)
        || /\b(carbs?|carbohydrates?)\b.{0,60}\b(rest|remaining|remainder|leftover)\b/.test(normalizedQuery)
        || /\ball\b.{0,30}\b(?:other|remaining|rest)\b.{0,60}\b(carbs?|carbohydrates?)\b/.test(normalizedQuery);
}

function userWantsRemainingCaloriesAsFat(normalizedQuery) {
    return /\b(rest|remaining|remainder|leftover|however many)\b.{0,90}\bfat\b/.test(normalizedQuery)
        || /\bfat\b.{0,60}\b(rest|remaining|remainder|leftover)\b/.test(normalizedQuery);
}

function extractUserProvidedNutritionDetails(query) {
    const normalizedQuery = normalizeUserNutritionQuery(query);
    if (!/\b(cal|cals|calories?|kcal|net\s*(?:carbs?|carbohydrates?)|carbs?|carbohydrates?|fiber|fibre|protein|pro|fat|sugar)\b/.test(normalizedQuery)) {
        return null;
    }

    const calories = extractNutritionNumber(normalizedQuery, [
        /(\d+(?:\.\d+)?)\s*(?:cal|cals|calories?|kcal)\b/,
        /\b(?:cal|cals|calories?|kcal)\s*(?:is|are|should be|=|equals|at)?\s*(\d+(?:\.\d+)?)\b/
    ]);
    const netCarbs = extractNutritionNumber(normalizedQuery, [
        /(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*(?:of\s*)?net\s*(?:carbs?|carbohydrates?)\b/,
        /(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*net\b/,
        /\bnet\s*(?:carbs?|carbohydrates?)?\s*(?:is|are|should be|=|equals|at)?\s*(\d+(?:\.\d+)?)\b/
    ]);
    const totalCarbs = extractNutritionNumber(normalizedQuery, [
        /(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*(?:of\s*)?(?:total\s*)?(?:carbs?|carbohydrates?)\b/,
        /\b(?:total\s*)?(?:carbs?|carbohydrates?)\s*(?:is|are|should be|=|equals|at)?\s*(\d+(?:\.\d+)?)\b/,
        /\bc\s*[:=]\s*(\d+(?:\.\d+)?)\b/
    ]);
    const fiber = extractNutritionNumber(normalizedQuery, [
        /(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*(?:of\s*)?(?:fiber|fibre)\b/,
        /\b(?:fiber|fibre)\s*(?:is|are|should be|=|equals|at)?\s*(\d+(?:\.\d+)?)\b/
    ]);
    const protein = extractNutritionNumber(normalizedQuery, [
        /(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*(?:of\s*)?(?:protein|pro)\b/,
        /\b(?:protein|pro)\s*(?:is|are|should be|=|equals|at)?\s*(\d+(?:\.\d+)?)\b/,
        /\bp\s*[:=]\s*(\d+(?:\.\d+)?)\b/
    ]);
    const fat = extractNutritionNumber(normalizedQuery, [
        /(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*(?:of\s*)?fat\b/,
        /\bfat\s*(?:is|are|should be|=|equals|at)?\s*(\d+(?:\.\d+)?)\b/,
        /\bf\s*[:=]\s*(\d+(?:\.\d+)?)\b/
    ]);
    const sugar = extractNutritionNumber(normalizedQuery, [
        /(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*(?:of\s*)?sugar\b/,
        /\bsugar\s*(?:is|are|should be|=|equals|at)?\s*(\d+(?:\.\d+)?)\b/
    ]);

    const hasUsefulNutrition = calories !== null || netCarbs !== null || totalCarbs !== null || fiber !== null || protein !== null || fat !== null || sugar !== null;
    if (!hasUsefulNutrition) return null;

    const name = cleanUserProvidedFoodName(normalizedQuery);
    const serving = /\b(full|whole|entire|all)\s+(pizza|bag|package|container|box)\b/.test(normalizedQuery)
        ? `1 whole ${normalizedQuery.match(/\b(full|whole|entire|all)\s+(pizza|bag|package|container|box)\b/)?.[2] || 'package'}`
        : '1 serving';
    const databaseHint = /\bquest\b/.test(normalizedQuery) && /\bsupreme\b/.test(normalizedQuery) && /\bpizza\b/.test(normalizedQuery)
        ? (/\b(full|whole|entire|all)\s+pizza\b/.test(normalizedQuery)
            ? nutritionDatabase['quest supreme whole pizza']
            : nutritionDatabase['quest supreme pizza'])
        : null;
    const lookupName = name === 'Quick calorie entry' ? '' : name;
    const nameCountBasis = extractCountBasis(name);
    const describedQuantity = nameCountBasis.groupCount || nameCountBasis.explicitQuantity || 1;
    const leadingFoodCount = toFiniteNumber(name.match(/^(\d+(?:\.\d+)?)\s+[^\d]/)?.[1], describedQuantity);
    const explicitPerUnit = /\b(each|a\s*piece|apiece|per\s+(?:item|piece|serving|slice|bar|muffin|link|breast|burger|sandwich))\b/.test(normalizedQuery);
    const explicitTotal = /\b(total|altogether|combined)\b/.test(normalizedQuery);
    const caloriesFromMacros = calories === null
        && protein !== null
        && totalCarbs !== null
        && fat !== null;

    return {
        normalizedQuery,
        name,
        lookupName,
        serving,
        describedQuantity: Math.max(1, toFiniteNumber(leadingFoodCount, describedQuantity)),
        valuesApplyToTotal: !explicitPerUnit && (leadingFoodCount > 1 || explicitTotal),
        databaseHint,
        explicit: {
            calories,
            protein,
            carbs: totalCarbs,
            fiber,
            netCarbs,
            fat,
            sugar
        },
        derived: {
            carbsFromRemainingCalories: calories !== null
                && userWantsRemainingCaloriesAsCarbs(normalizedQuery)
                && totalCarbs === null
                && netCarbs === null,
            fatFromRemainingCalories: calories !== null
                && userWantsRemainingCaloriesAsFat(normalizedQuery)
                && fat === null,
            caloriesFromMacros
        }
    };
}

function resolveUserProvidedNutritionValues(details, baseFood = null) {
    const explicit = details?.explicit || {};
    const derived = details?.derived || {};
    const base = baseFood || details?.databaseHint || {};
    const hasExplicitProtein = explicit.protein !== null && explicit.protein !== undefined;
    const hasExplicitCarbs = explicit.carbs !== null && explicit.carbs !== undefined;
    const hasExplicitFat = explicit.fat !== null && explicit.fat !== undefined;
    const caloriesFromMacros = hasExplicitProtein && hasExplicitCarbs && hasExplicitFat
        ? (explicit.protein * 4) + (explicit.carbs * 4) + (explicit.fat * 9)
        : null;
    const caloriesValue = explicit.calories
        ?? (caloriesFromMacros !== null ? caloriesFromMacros : (base?.calories ?? 0));
    const proteinValue = explicit.protein ?? base?.protein ?? 0;
    let fatValue = explicit.fat ?? base?.fat ?? 0;
    let carbsValue = explicit.carbs ?? base?.carbs ?? explicit.netCarbs ?? 0;
    let sugarValue = explicit.sugar ?? base?.sugar ?? 0;
    const hasExplicitFiber = explicit.fiber !== null && explicit.fiber !== undefined;
    const hasExplicitNetCarbs = explicit.netCarbs !== null && explicit.netCarbs !== undefined;
    let fiberValue;
    if (hasExplicitFiber) {
        fiberValue = explicit.fiber;
    } else if (hasExplicitCarbs && hasExplicitNetCarbs) {
        fiberValue = Math.max(0, explicit.carbs - explicit.netCarbs);
    } else if (hasExplicitNetCarbs && base?.carbs !== undefined) {
        fiberValue = Math.max(0, toFiniteNumber(base.carbs, 0) - explicit.netCarbs);
    } else {
        fiberValue = base?.fiber ?? 0;
    }

    if (derived.carbsFromRemainingCalories) {
        fatValue = explicit.fat ?? 0;
        fiberValue = explicit.fiber ?? 0;
        sugarValue = explicit.sugar ?? 0;
        carbsValue = Math.max(0, (caloriesValue - (proteinValue * 4) - (fatValue * 9)) / 4);
    }

    if (derived.fatFromRemainingCalories) {
        carbsValue = explicit.carbs ?? explicit.netCarbs ?? 0;
        fiberValue = explicit.fiber ?? 0;
        sugarValue = explicit.sugar ?? 0;
        fatValue = Math.max(0, (caloriesValue - (proteinValue * 4) - (carbsValue * 4)) / 9);
    }

    const netCarbsValue = explicit.netCarbs
        ?? (hasExplicitCarbs || hasExplicitFiber || derived.carbsFromRemainingCalories || derived.fatFromRemainingCalories
            ? Math.max(0, carbsValue - fiberValue)
            : (base?.netCarbs ?? Math.max(0, carbsValue - fiberValue)));

    return {
        calories: clampAndRound(caloriesValue, 0, 5000),
        protein: clampAndRound(proteinValue, 0, 500),
        carbs: clampAndRound(carbsValue, 0, 700),
        fiber: clampAndRound(fiberValue, 0, 300),
        netCarbs: clampAndRound(netCarbsValue, 0, 700),
        fat: clampAndRound(fatValue, 0, 300),
        sugar: clampAndRound(sugarValue, 0, 300),
    };
}

function extractUserProvidedNutrition(query) {
    const details = extractUserProvidedNutritionDetails(query);
    if (!details) return null;

    const values = resolveUserProvidedNutritionValues(details);
    const explicit = details.explicit;
    const quantity = Math.max(1, toFiniteNumber(details.describedQuantity, 1));
    const valueDivisor = details.valuesApplyToTotal ? quantity : 1;
    const perEntryValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, clampAndRound(value / valueDivisor, 0, key === 'calories' ? 5000 : 1000)])
    );

    const food = applyNutritionPlausibilityValidation({
        name: details.name,
        matchedItem: details.name,
        restaurant: /\bquest\b/.test(details.normalizedQuery) ? 'Quest' : null,
        ...perEntryValues,
        serving: details.serving,
        quantity,
        confidence: 'high',
        needsVerification: false,
        source: explicit.netCarbs !== null ? 'User-provided nutrition label (net carbs)' : 'User-provided nutrition label',
        sourceType: 'database',
        sourceUrl: /\bquest\b/.test(details.normalizedQuery) ? 'https://www.questnutrition.com/collections/more-products/products/supreme-pizza' : null,
        evidence: 'User dictated exact nutrition values; used those instead of an AI estimate.',
        nutritionBasis: 'user-provided',
        nutritionEvidence: {
            source: 'user-dictated',
            fields: getUserProvidedNutritionFields(details),
            scope: details.valuesApplyToTotal ? 'described-total' : 'item-entry'
        }
    });

    return applyUserNutritionConsistencyWarning(food, details, valueDivisor);
}

function hasCompleteUserProvidedNutrition(details) {
    const explicit = details?.explicit || {};
    const derived = details?.derived || {};
    return (explicit.calories !== null || derived.caloriesFromMacros)
        && explicit.protein !== null
        && (explicit.carbs !== null || explicit.netCarbs !== null || derived.carbsFromRemainingCalories)
        && (explicit.fat !== null || derived.fatFromRemainingCalories);
}

function splitExplicitNutritionClauses(query) {
    const text = normalizeUserNutritionQuery(query);
    if (!text) return [];

    const candidateClauses = text.split(
        /\s*(?:,|;)\s*|\s+(?:and|plus)\s+(?!(?:it|that|this|they|which|there|about|around|approximately|remaining)\b|the\s+rest\b)(?=[a-z][a-z0-9'&()\-\s]{0,70}\d+(?:\.\d+)?\s*(?:cal|cals|calories?|kcal|g\s*)?(?:protein|carbs?|carbohydrates?|fat|fiber|fibre|sugar)?\b)/i
    ).map((value) => value.trim()).filter(Boolean);

    // Do not mistake a macro connector such as "40 g protein and 30 g fat"
    // for a second food. A real clause has a food-name prefix before its first
    // nutrition marker.
    const clauses = candidateClauses.filter((clause) => {
        const clauseDetails = extractUserProvidedNutritionDetails(clause);
        return clauseDetails && clauseDetails.name !== 'Quick calorie entry';
    });

    if (clauses.length < 2 || clauses.length !== candidateClauses.length) return [];
    return clauses;
}

function findFoodIndexForNutritionClause(foods, details, usedIndexes = new Set(), query = '') {
    if (!Array.isArray(foods) || !foods.length || !details) return -1;

    const candidateNames = [details.name];
    const markerIndex = findFirstNutritionMarkerIndex(details.normalizedQuery || '');
    const prefix = markerIndex >= 0
        ? details.normalizedQuery.slice(0, markerIndex).trim()
        : '';
    const nearbyParts = prefix
        .split(/\s*(?:,|;|\+|&)\s*|\s+(?:and|plus|also|then)\s+/i)
        .map((part) => part.trim())
        .filter(Boolean);
    if (nearbyParts.length) candidateNames.unshift(nearbyParts[nearbyParts.length - 1]);

    const normalizedQuery = normalizeQuery(query);
    const scored = foods.map((food, index) => {
        if (usedIndexes.has(index) || foodLooksLikeDrink(food)) return { index, score: -1 };
        const nearbyScore = scoreFoodForCompositeSegment(food, candidateNames[0]);
        const broader = candidateNames.slice(1).reduce(
            (score, candidate) => Math.max(score, scoreFoodForCompositeSegment(food, candidate)),
            0
        );
        const queryBonus = normalizedQuery && scoreFoodForCompositeSegment(food, normalizedQuery) > 0 ? 0.1 : 0;
        // The item nearest the nutrition marker wins over a broader prefix
        // that contains several foods (for example "yogurt and granola").
        const score = nearbyScore > 0 ? 100 + nearbyScore : broader;
        return { index, score: score + queryBonus };
    }).sort((a, b) => b.score - a.score);

    if (scored[0]?.score > 0) return scored[0].index;

    const firstAvailable = foods.findIndex((food, index) => !usedIndexes.has(index) && !foodLooksLikeDrink(food));
    return firstAvailable >= 0 ? firstAvailable : 0;
}

function resolveUserProvidedNutritionClause(clause) {
    const details = extractUserProvidedNutritionDetails(clause);
    if (!details) return null;

    const databaseResult = details.databaseHint || (details.lookupName ? searchDatabase(details.lookupName) : null);
    if (databaseResult) {
        return applyUserProvidedNutritionOverrides(
            buildFoodFromDatabase(details.lookupName || details.name, databaseResult),
            details
        );
    }

    // Keep user facts authoritative while still giving missing fields a useful
    // fallback when a clause has no local database match.
    return applyUserProvidedNutritionOverrides(
        buildEstimatedFood(details.lookupName || details.name, 'estimated (missing user nutrition fields)'),
        details
    );
}

function getUserProvidedNutritionFields(details) {
    const explicit = details?.explicit || {};
    const fields = Object.entries(explicit)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key]) => key);

    if (details?.derived?.caloriesFromMacros) fields.push('calories');
    if (details?.derived?.carbsFromRemainingCalories) fields.push('carbs');
    if (details?.derived?.fatFromRemainingCalories) fields.push('fat');
    return [...new Set(fields)];
}

function applyUserNutritionConsistencyWarning(food, details, explicitValueDivisor = 1) {
    if (!food || !details?.explicit) return food;

    const explicit = details.explicit;
    const divisor = Math.max(1, toFiniteNumber(explicitValueDivisor, 1));
    const explicitCalories = explicit.calories === null || explicit.calories === undefined
        ? null
        : toFiniteNumber(explicit.calories, null) / divisor;
    if (!Number.isFinite(explicitCalories)) return food;

    const protein = explicit.protein === null || explicit.protein === undefined
        ? null
        : toFiniteNumber(explicit.protein, null) / divisor;
    const carbs = explicit.carbs === null || explicit.carbs === undefined
        ? null
        : toFiniteNumber(explicit.carbs, null) / divisor;
    const netCarbs = explicit.netCarbs === null || explicit.netCarbs === undefined
        ? null
        : toFiniteNumber(explicit.netCarbs, null) / divisor;
    const fat = explicit.fat === null || explicit.fat === undefined
        ? null
        : toFiniteNumber(explicit.fat, null) / divisor;
    const knownMacroCalories = (protein === null ? 0 : protein * 4)
        + (carbs === null ? (netCarbs === null ? 0 : netCarbs * 4) : carbs * 4)
        + (fat === null ? 0 : fat * 9);
    const hasKnownMacros = protein !== null || carbs !== null || netCarbs !== null || fat !== null;
    const allCoreMacros = protein !== null && carbs !== null && fat !== null;
    const tolerance = Math.max(20, explicitCalories * 0.15);
    const warnings = [];

    if (hasKnownMacros && knownMacroCalories > explicitCalories + tolerance) {
        warnings.push(allCoreMacros
            ? 'user-calories-macro-mismatch'
            : 'user-macros-exceed-calories');
    } else if (allCoreMacros && Math.abs(knownMacroCalories - explicitCalories) > tolerance) {
        warnings.push('user-calories-macro-mismatch');
    }

    if (!warnings.length) return food;

    const existingWarnings = Array.isArray(food.nutritionWarnings) ? food.nutritionWarnings : [];
    const nutritionWarnings = [...new Set([...existingWarnings, ...warnings])];
    const warningText = `User-provided calories and macros are inconsistent (${Math.round(knownMacroCalories)} macro calories vs ${Math.round(explicitCalories)} calories); values preserved for review.`;
    return {
        ...food,
        confidence: 'low',
        needsVerification: true,
        nutritionWarnings,
        nutritionEvidence: {
            ...(food.nutritionEvidence || {}),
            needsReview: true,
            warnings: nutritionWarnings
        },
        evidence: cleanText(
            `${food.evidence ? `${food.evidence}; ` : ''}${warningText}`,
            warningText,
            280
        )
    };
}

function applyUserProvidedNutritionOverrides(food, details) {
    if (!food || !details?.explicit) return food;

    const explicit = details.explicit;
    const derived = details.derived || {};
    const hasOverride = Object.values(explicit).some((value) => value !== null && value !== undefined);
    const hasDerivedOverride = Boolean(derived.carbsFromRemainingCalories || derived.fatFromRemainingCalories);
    if (!hasOverride && !hasDerivedOverride) return food;

    const updated = { ...food };
    const values = resolveUserProvidedNutritionValues(details, food);
    const describedQuantity = Math.max(1, toFiniteNumber(details.describedQuantity, 1));
    if (describedQuantity > 1 && toFiniteNumber(updated.quantity, 1) <= 1) {
        updated.quantity = describedQuantity;
    }
    const explicitValueDivisor = details.valuesApplyToTotal
        ? Math.max(1, toFiniteNumber(updated.quantity, 1))
        : 1;

    const setValue = (key, max = 1000) => {
        updated[key] = clampAndRound(values[key] / explicitValueDivisor, 0, max);
    };

    if (explicit.calories !== null && explicit.calories !== undefined) setValue('calories', 5000);
    if (derived.caloriesFromMacros) setValue('calories', 5000);
    if (explicit.protein !== null && explicit.protein !== undefined) setValue('protein', 500);
    if (explicit.fat !== null && explicit.fat !== undefined) setValue('fat', 300);
    if (explicit.sugar !== null && explicit.sugar !== undefined) setValue('sugar', 300);
    if (explicit.carbs !== null && explicit.carbs !== undefined) setValue('carbs', 700);
    if (explicit.fiber !== null && explicit.fiber !== undefined) setValue('fiber', 300);
    if (explicit.netCarbs !== null && explicit.netCarbs !== undefined) setValue('netCarbs', 700);

    const hasExplicitCarbRelation = explicit.carbs !== null && explicit.carbs !== undefined
        && explicit.netCarbs !== null && explicit.netCarbs !== undefined;
    if (hasExplicitCarbRelation || ((explicit.carbs !== null && explicit.carbs !== undefined) && (explicit.fiber !== null && explicit.fiber !== undefined))) {
        // Total carbs + fiber/net carbs describe the relationship between all
        // three fields, so derive only the missing member from user facts.
        if (explicit.fiber === null || explicit.fiber === undefined) setValue('fiber', 300);
        if (explicit.netCarbs === null || explicit.netCarbs === undefined) setValue('netCarbs', 700);
    } else if ((explicit.carbs !== null && explicit.carbs !== undefined) || (explicit.fiber !== null && explicit.fiber !== undefined)) {
        // Keep a lookup/estimate's missing counterpart when available, but
        // refresh derived net carbs against the user-supplied total/fiber.
        if (explicit.netCarbs === null || explicit.netCarbs === undefined) setValue('netCarbs', 700);
    }

    if (derived.carbsFromRemainingCalories) {
        setValue('carbs', 700);
        setValue('fiber', 300);
        setValue('netCarbs', 700);
        // Remaining calories are explicitly assigned to carbs, so do not
        // retain unrelated lookup macros such as generic shake fat/sugar.
        setValue('fat', 300);
        setValue('sugar', 300);
    }

    if (derived.fatFromRemainingCalories) {
        setValue('fat', 300);
        setValue('sugar', 300);
    }

    if (explicit.netCarbs !== null && explicit.netCarbs !== undefined
        && (explicit.carbs === null || explicit.carbs === undefined)
        && (explicit.fiber === null || explicit.fiber === undefined)
        && Number.isFinite(toFiniteNumber(updated.carbs, NaN))) {
        // When a serving reference supplies total carbs, net carbs determine
        // the missing fiber value without changing either user fact.
        setValue('fiber', 300);
    }

    updated.source = cleanText(`${updated.source || 'nutrition lookup'} + user dictated values`, 'User dictated values', 180);
    updated.evidence = cleanText(
        `${updated.evidence || 'Matched food'}; user dictated one or more nutrition values${hasDerivedOverride ? ' and remaining calories were calculated into macros' : ''}.`,
        'User dictated nutrition values',
        260
    );
    updated.nutritionBasis = 'user-provided';
    updated.needsVerification = Boolean(updated.needsVerification) && updated.sourceType === 'estimate';
    updated.nutritionEvidence = {
        ...(updated.nutritionEvidence || {}),
        source: 'user-dictated',
        fields: getUserProvidedNutritionFields(details),
        scope: details.valuesApplyToTotal ? 'described-total' : 'item-entry',
        needsReview: Boolean(updated.nutritionEvidence?.needsReview)
    };

    const validated = applyNutritionPlausibilityValidation(updated);
    return applyUserNutritionConsistencyWarning(validated, details, explicitValueDivisor);
}

function applyUserProvidedNutritionOverridesToFoods(foods, details, query = '') {
    if (!details || !Array.isArray(foods) || foods.length === 0) return foods;

    const clauses = splitExplicitNutritionClauses(query);
    if (clauses.length > 1) {
        const usedIndexes = new Set();
        const updated = [...foods];
        for (const clause of clauses) {
            const clauseDetails = extractUserProvidedNutritionDetails(clause);
            if (!clauseDetails) continue;
            const index = findFoodIndexForNutritionClause(updated, clauseDetails, usedIndexes);
            if (index < 0) continue;
            updated[index] = applyUserProvidedNutritionOverrides(updated[index], clauseDetails);
            usedIndexes.add(index);
        }
        return updated;
    }

    const index = findFoodIndexForNutritionClause(foods, details, new Set(), query);
    return foods.map((food, foodIndex) => (
        foodIndex === index ? applyUserProvidedNutritionOverrides(food, details) : food
    ));
}

// Extract food items from conversational text
function extractFoodFromText(text) {
    const lower = text.toLowerCase();

    // Remove common conversational phrases
    const cleaned = lower
        .replace(/^(i |we |they |he |she |just |had |ate |eating |eaten |grabbed |got |ordered |bought |made |having |eat )+/g, '')
        .replace(/ (for |at |from |during |with my |after |before )?(breakfast|lunch|dinner|snack|brunch|meal|today|yesterday|this morning|tonight|earlier).*$/g, '')
        .replace(/^(a |an |some |the )/g, '')
        .trim();

    return cleaned;
}

// Handle quantity prefixes like "2 slices of pizza"
function extractQuantityAndFood(text) {
    const lower = normalizeCountPhrase(text);

    const countBasis = extractCountBasis(lower);
    if (countBasis.groupMatch && countBasis.explicitQuantity !== null) {
        return {
            quantity: countBasis.explicitQuantity,
            food: lower.slice(countBasis.groupMatch.index).trim()
        };
    }

    // Pattern: "X slices of Y" or "X pieces of Y"
    const sliceMatch = lower.match(/(\d+)\s*[-–—]?\s*slices?\s*(?:of\s*)?(.+)/i);
    if (sliceMatch) {
        return { quantity: parseInt(sliceMatch[1]), food: sliceMatch[2].trim() };
    }

    const pieceMatch = lower.match(/(\d+)\s*[-–—]?\s*pieces?\s*(?:of\s*)?(.+)/i);
    if (pieceMatch) {
        return { quantity: parseInt(pieceMatch[1]), food: pieceMatch[2].trim() };
    }

    const linkMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:(small|breakfast)\s+)?(?:sausage\s+)?links?\b(?:\s*(?:of\s*)?(.+))?/i);
    if (linkMatch) {
        const count = toFiniteNumber(linkMatch[1], 1);
        const rest = (linkMatch[3] || '').trim();
        const prefix = linkMatch[2] ? `${linkMatch[2]} ` : '';
        const food = rest ? `${rest} ${prefix}sausage links` : `${prefix}sausage links`;
        return { quantity: count, food: food.trim() };
    }

    return { quantity: 1, food: text };
}

function searchDatabaseDirect(query) {
    const normalizedQuery = normalizeCountPhrase(query);
    const variations = [
        normalizedQuery,
        normalizedQuery.replace(/-/g, ' '),
        normalizedQuery.replace(/'/g, ''),
        normalizedQuery.replace(/\s/g, '-'),
    ];

    for (const variant of variations) {
        if (nutritionDatabase[variant]) {
            return { ...nutritionDatabase[variant], matchType: variant === normalizedQuery ? 'exact' : 'variation' };
        }
    }

    const extractedFood = extractFoodFromText(normalizedQuery);
    if (extractedFood !== normalizedQuery) {
        const extractedVariations = [
            extractedFood,
            extractedFood.replace(/-/g, ' '),
            extractedFood.replace(/'/g, ''),
        ];

        for (const variant of extractedVariations) {
            if (nutritionDatabase[variant]) {
                return { ...nutritionDatabase[variant], matchType: 'extracted-variation' };
            }
        }
    }

    return null;
}

// Search database with fuzzy matching
function searchDatabase(query) {
    const normalizedQuery = normalizeCountPhrase(query);

    // 1. Exact match
    const directMatch = searchDatabaseDirect(query);
    if (directMatch) return directMatch;

    const muffinMatch = resolveMuffinDatabaseResult(normalizedQuery);
    if (muffinMatch) return muffinMatch;

    // 3. Extract food from conversational text (handles "I had a big mac for lunch")
    const extractedFood = extractFoodFromText(normalizedQuery);
    if (extractedFood !== normalizedQuery) {
        // Try exact match on extracted food
        if (nutritionDatabase[extractedFood]) {
            return { ...nutritionDatabase[extractedFood], matchType: 'extracted' };
        }
        // Try variations on extracted food
        for (const variant of [extractedFood, extractedFood.replace(/-/g, ' '), extractedFood.replace(/'/g, '')]) {
            if (nutritionDatabase[variant]) {
                return { ...nutritionDatabase[variant], matchType: 'extracted-variation' };
            }
        }
    }

    // 4. Handle quantity + food (e.g., "2 slices of pepperoni pizza")
    const { quantity, food } = extractQuantityAndFood(normalizedQuery);
    if (quantity > 1) {
        // Keep database nutrition per canonical serving. Quantity is carried
        // separately by buildFoodFromDatabase and applied exactly once.
        const searchKey = `${quantity} slices ${food}`;
        if (nutritionDatabase[searchKey]) {
            return { ...nutritionDatabase[searchKey], matchType: 'quantity-match' };
        }
        const foodVariants = [
            food,
            food.replace(/[-–—]/g, ' '),
            food.replace(/'/g, '')
        ];
        const baseFood = foodVariants.map((variant) => nutritionDatabase[variant]).find(Boolean);
        if (baseFood) {
            return { ...baseFood, matchType: 'quantity-base-serving' };
        }
    }

    // 5. Check if query contains a key (for phrases like "I had a Big Mac")
    // Sort by key length descending to match longest (most specific) first
    const sortedEntries = Object.entries(nutritionDatabase).sort((a, b) => b[0].length - a[0].length);
    for (const [key, value] of sortedEntries) {
        // Match keys of 6+ characters (lowered from 8 to catch "big mac")
        if (key.length >= 6 && normalizedQuery.includes(key)) {
            return { ...value, matchType: 'contains' };
        }
    }

    // 6. Check if any key starts with the query
    for (const [key, value] of Object.entries(nutritionDatabase)) {
        if (key.startsWith(normalizedQuery) && normalizedQuery.length >= 5) {
            return { ...value, matchType: 'startsWith' };
        }
    }

    return null;
}

function isVerifiedPackagedDbResult(dbResult) {
    const sourceText = normalizeQuery(`${dbResult?.source || ''} ${dbResult?.sourceType || ''}`);
    const knownPackageReference = /\b(johnsonville vermont maple links nutrition reference)\b/.test(sourceText);
    return Boolean(dbResult)
        && (
            (dbResult.sourceType === 'official' && /\b(package|label|manufacturer)\b/.test(sourceText))
            || knownPackageReference
        );
}

function matchCompositeDatabaseFoods(query) {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return [];

    const matches = [];
    const usedNames = new Set();
    const addMatch = (value, queryText = '') => {
        if (!value) return;
        const normalizedName = normalizeQuery(value.name);
        const built = buildFoodFromDatabase(queryText || value.name, {
            ...value,
            matchType: 'composite-database'
        });
        if (usedNames.has(normalizedName)) {
            const existing = matches.find((food) => normalizeQuery(food.name) === normalizedName);
            if (existing) existing.quantity = toFiniteNumber(existing.quantity, 1) + toFiniteNumber(built.quantity, 1);
            return;
        }
        matches.push(built);
        usedNames.add(normalizedName);
    };

    const segments = splitCompositeFoodSegments(query);
    const isExplicitChipotleBuild = normalizedQuery.includes('chipotle')
        && segments.length >= 2
        && /\b(chicken|steak|carnitas|barbacoa|sofritas|rice|beans|veggies|salsa|cheese|lettuce)\b/.test(normalizedQuery);
    if (segments.length >= 2 && !isBrandedProduct(query) && !isExplicitChipotleBuild) {
        for (const segment of segments) {
            const dbResult = findDatabaseMatchForSegment(segment);
            if (dbResult) {
                addMatch(dbResult, segment);
            }
        }

        if (matches.length >= 2) {
            return matches;
        }
    }

    const brandedComponentMatches = [];
    if (normalizedQuery.includes('chipotle')) {
        brandedComponentMatches.push(
            ['chicken', 'chipotle chicken'],
            ['white rice', 'chipotle cilantro-lime white rice'],
            ['cilantro lime white rice', 'chipotle cilantro-lime white rice'],
            ['cilantro-lime white rice', 'chipotle cilantro-lime white rice'],
            ['black beans', 'chipotle black beans'],
            ['fajita veggies', 'chipotle fajita veggies'],
            ['fajita vegetables', 'chipotle fajita veggies'],
            ['fresh tomato salsa', 'chipotle fresh tomato salsa'],
            ['cheese', 'chipotle cheese'],
            ['romaine lettuce', 'chipotle romaine lettuce'],
            ['lettuce', 'chipotle romaine lettuce']
        );
    }
    if (normalizedQuery.includes('panda express')) {
        brandedComponentMatches.push(
            ['orange chicken', 'panda express orange chicken'],
            ['chow mein', 'panda express chow mein'],
            ['fried rice', 'panda express fried rice'],
            ['white rice', 'panda express white rice']
        );
    }
    if (normalizedQuery.includes('chick-fil-a') || normalizedQuery.includes('chick fil a')) {
        brandedComponentMatches.push(
            ['chicken sandwich', 'chick-fil-a chicken sandwich'],
            ['waffle fries', 'chick-fil-a waffle fries'],
            ['fries', 'chick-fil-a waffle fries']
        );
    }
    if (normalizedQuery.includes('qdoba')) {
        brandedComponentMatches.push(
            ['grilled adobo chicken', 'qdoba grilled adobo chicken'],
            ['adobo chicken', 'qdoba grilled adobo chicken'],
            ['chicken', 'qdoba grilled adobo chicken'],
            ['cilantro lime rice', 'qdoba cilantro lime rice'],
            ['cilantro-lime rice', 'qdoba cilantro lime rice'],
            ['rice', 'qdoba cilantro lime rice'],
            ['black beans', 'qdoba black beans'],
            ['fajita veggies', 'qdoba fajita veggies'],
            ['fajita vegetables', 'qdoba fajita veggies'],
            ['pico de gallo', 'qdoba pico de gallo'],
            ['pico', 'qdoba pico de gallo'],
            ['shredded lettuce', 'qdoba shredded lettuce'],
            ['lettuce', 'qdoba shredded lettuce']
        );
    }

    const addedBrandedKeys = new Set();
    for (const [alias, key] of brandedComponentMatches) {
        if (normalizedQuery.includes(normalizeQuery(alias)) && !addedBrandedKeys.has(key)) {
            addMatch(nutritionDatabase[key], alias);
            addedBrandedKeys.add(key);
        }
    }

    if (matches.length >= 2) {
        return matches;
    }

    const sortedEntries = Object.entries(nutritionDatabase)
        .filter(([key]) => key.length >= 6)
        .sort((a, b) => b[0].length - a[0].length);

    for (const [key, value] of sortedEntries) {
        if (!normalizedQuery.includes(key)) continue;
        addMatch(value, key);
    }

    return matches;
}

function splitCompositeFoodSegments(query) {
    const cleaned = String(query || '')
        .replace(/^\s*(?:i|we)\s+(?:had|ate|did|logged?|want|need|added?|tracked?)\s+/i, '')
        .replace(/^\s*(?:log|add|track)\s+/i, '')
        .trim();
    if (!cleaned) return [];

    let parts = cleaned
        .split(/\s*(?:,|;|\+|&)\s*|\s+(?:also|plus|then)\s+/i)
        .map((part) => part.trim())
        .filter(Boolean);

    const hasExplicitNutritionText = /\b\d+(?:\.\d+)?\s*(?:cal|cals|calories?|kcal|grams?\s+of\s+protein|g\s+(?:protein|carbs?|fiber|fat|sugar)|net\s*carbs?)\b/i.test(cleaned);
    if (parts.length < 2 && !hasExplicitNutritionText) {
        const andParts = cleaned.split(/\s+and\s+/i).map((part) => part.trim()).filter(Boolean);
        const allAndPartsKnown = andParts.length >= 2 && andParts.every((part) => Boolean(findDatabaseMatchForSegment(part)));
        if (!isKnownSingleFoodPhrase(cleaned) || andParts.length >= 3 || allAndPartsKnown) {
            parts = andParts;
        }
    }

    return parts
        .map((part) => part
            .replace(/\b(?:for|as)\s+(?:breakfast|lunch|dinner|snack|meal)\b.*$/i, '')
            .replace(/^\s*(?:and|plus|also|then)\s+/i, '')
            .replace(/^\s*(?:a|an|the|some)\s+/i, '')
            .replace(/\s+/g, ' ')
            .trim())
        .filter((part) => normalizeQuery(part).length >= 2)
        .slice(0, 12);
}

function findDatabaseMatchForSegment(segment) {
    const normalized = normalizeQuery(segment);
    if (!normalized) return null;

    let result = searchDatabaseDirect(segment) || searchDatabase(segment);
    if (result) return result;

    const leadingQuantityMatch = normalized.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    const itemWithoutQuantity = leadingQuantityMatch?.[2] || normalized;
    const variants = [itemWithoutQuantity];
    if (itemWithoutQuantity.endsWith('s')) {
        variants.push(itemWithoutQuantity.slice(0, -1));
    }

    for (const variant of variants) {
        result = searchDatabaseDirect(variant) || searchDatabase(variant);
        if (result) return result;
    }

    return null;
}

function hasCompleteCompositeDatabaseCoverage(query) {
    const segments = splitCompositeFoodSegments(query);
    return segments.length >= 2
        && segments.every((segment) => Boolean(findDatabaseMatchForSegment(segment)));
}

function foodIdentityTokens(value) {
    const ignored = new Set([
        'a', 'an', 'and', 'cup', 'cups', 'cooked', 'food', 'grilled', 'had', 'i',
        'of', 'one', 'ounce', 'ounces', 'oz', 'roasted', 'serving', 'the', 'with'
    ]);
    return normalizeQuery(value)
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !ignored.has(token) && !/^\d/.test(token));
}

function scoreFoodForCompositeSegment(food, segment) {
    const foodTokens = foodIdentityTokens(`${food?.name || ''} ${food?.matchedItem || ''}`);
    if (!foodTokens.length) return 0;
    const segmentText = normalizeQuery(segment);
    return foodTokens.reduce((total, token) => total + (segmentText.includes(token) ? 1 : 0), 0);
}

function findFoodIndexForCompositeSegment(foods, segment, usedIndexes = new Set()) {
    const bestMatch = foods
        .map((food, index) => ({ index, score: usedIndexes.has(index) ? 0 : scoreFoodForCompositeSegment(food, segment) }))
        .sort((a, b) => b.score - a.score)[0];
    return bestMatch?.score > 0 ? bestMatch.index : -1;
}

function isMeasuredDatabaseReference(dbFood) {
    const sourceType = normalizeSourceType(dbFood?.sourceType, 'database');
    return sourceType === 'database' || /\busda\b|fooddata central/i.test(dbFood?.source || '');
}

function findMissingCompositeAiSegments(foods, query) {
    const segments = splitCompositeFoodSegments(query);
    const usedIndexes = new Set();
    return segments.filter((segment) => {
        const dbResult = findDatabaseMatchForSegment(segment);
        if (dbResult && isMeasuredDatabaseReference(buildFoodFromDatabase(segment, dbResult))) return false;

        const foodIndex = findFoodIndexForCompositeSegment(foods, segment, usedIndexes);
        if (foodIndex < 0) return true;
        usedIndexes.add(foodIndex);
        return false;
    });
}

function reconcileCompositeAiFoodsWithDatabase(foods, query) {
    if (!Array.isArray(foods) || foods.length === 0) return foods;
    const segments = splitCompositeFoodSegments(query);
    if (segments.length < 2) return foods;
    const usedIndexes = new Set();
    const reconciled = segments.map((segment) => {
        const foodIndex = findFoodIndexForCompositeSegment(foods, segment, usedIndexes);
        if (foodIndex >= 0) usedIndexes.add(foodIndex);
        const food = foodIndex >= 0 ? foods[foodIndex] : null;
        const dbResult = findDatabaseMatchForSegment(segment);
        if (!isBrandedProduct(segment) && !isRestaurantLikeQuery(segment) && dbResult) {
            const dbFood = buildFoodFromDatabase(segment, dbResult);
            if (isMeasuredDatabaseReference(dbFood)) {
                return {
                    ...(food || {}),
                    name: dbFood.name,
                    matchedItem: dbFood.matchedItem,
                    calories: dbFood.calories,
                    protein: dbFood.protein,
                    carbs: dbFood.carbs,
                    fiber: dbFood.fiber,
                    netCarbs: dbFood.netCarbs,
                    fat: dbFood.fat,
                    sugar: dbFood.sugar,
                    serving: dbFood.serving,
                    quantity: dbFood.quantity,
                    confidence: dbFood.confidence,
                    needsVerification: dbFood.needsVerification,
                    source: dbFood.source,
                    sourceType: dbFood.sourceType,
                    sourceUrl: dbFood.sourceUrl,
                    evidence: cleanText(
                        `${dbFood.evidence}; replaced the model estimate with a measured serving reference`,
                        dbFood.evidence,
                        240
                    )
                };
            }
        }

        return food || buildEstimatedFood(segment, 'estimated (AI omitted component fallback)');
    });

    return [
        ...reconciled,
        ...foods.filter((food, index) => !usedIndexes.has(index))
    ];
}

// Extract quantity from query
function extractQuantity(query) {
    const countBasis = extractCountBasis(query);
    if (countBasis.groupCount !== null) {
        return Math.max(0.05, Math.min(50, countBasis.groupCount));
    }

    const quantityPatterns = [
        /(\d+)\s*piece/i,
        /(\d+)\s*count/i,
        /(\d+)\s*pc/i,
        /(\d+)\s*muffins?/i,
        /(\d+)\s*x\s/i,
        /(\d+)\s*slices?/i,
        /(\d+)\s*oz/i,
    ];

    for (const pattern of quantityPatterns) {
        const match = normalizeCountPhrase(query).match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return 1;
}

function extractServingQuantityFromQuery(query, dbResult = {}) {
    const normalized = normalizeCountPhrase(query);
    const servingText = normalizeCountPhrase([
        dbResult.serving,
        dbResult.servingSize,
        dbResult.name
    ].filter(Boolean).join(' '));

    const queryBasis = extractCountBasis(normalized);
    const servingBasis = extractCountBasis(servingText);

    if (queryBasis.groupCount !== null) {
        const requestedCount = queryBasis.groupCount;
        const servingCount = servingBasis.groupCount;
        const outerQuantity = queryBasis.explicitQuantity ?? 1;
        const basisRatio = servingCount
            ? requestedCount / servingCount
            : requestedCount;
        return Math.max(0.05, Math.min(50, basisRatio * outerQuantity));
    }

    const servingMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:x\s*)?servings?\b/);
    if (servingMatch) {
        return Math.max(0.25, Math.min(50, toFiniteNumber(servingMatch[1], 1)));
    }

    const standaloneQuantity = extractStandaloneQuantity(normalized);
    if (standaloneQuantity !== null) {
        return Math.max(0.25, Math.min(50, standaloneQuantity));
    }

    const volumeMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:cups?|c)\b/);
    const servingVolumeMatch = servingText.match(/\b(\d+(?:\.\d+)?)\s*(?:cups?|c)\b/);
    if (volumeMatch && servingVolumeMatch) {
        const cups = toFiniteNumber(volumeMatch[1], 0);
        const servingCups = toFiniteNumber(servingVolumeMatch[1], 0);
        if (cups > 0 && servingCups > 0) {
            return Math.max(0.25, Math.min(50, cups / servingCups));
        }
    }

    const weightMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(oz|ounce|ounces|g|gram|grams)\b/);
    const servingWeightMatch = servingText.match(/\b(\d+(?:\.\d+)?)\s*(oz|ounce|ounces|g|gram|grams)\b/);
    if (weightMatch && servingWeightMatch) {
        const toGrams = (amount, unit) => /^(?:oz|ounce|ounces)$/.test(unit) ? amount * 28.3495 : amount;
        const requestedGrams = toGrams(toFiniteNumber(weightMatch[1], 0), weightMatch[2]);
        const servingGrams = toGrams(toFiniteNumber(servingWeightMatch[1], 0), servingWeightMatch[2]);
        if (requestedGrams > 0 && servingGrams > 0) {
            return Math.max(0.05, Math.min(50, requestedGrams / servingGrams));
        }
    }

    return 1;
}

function resolveMuffinDatabaseResult(query) {
    const normalized = normalizeQuery(query);
    if (!/\bmuffins?\b/.test(normalized) || !/\bblueberry\b/.test(normalized)) {
        return null;
    }

    let key = 'blueberry muffin';
    if (/\b(costco|kirkland)\b/.test(normalized)) {
        key = 'costco blueberry muffin';
    } else if (/\b(large|jumbo|bakery)\b/.test(normalized)) {
        key = 'large bakery blueberry muffin';
    } else if (/\bmini\b/.test(normalized)) {
        key = 'mini blueberry muffin';
    } else if (/\b(box mix|muffin mix|standard|regular|normal|package|label)\b/.test(normalized)) {
        key = 'blueberry muffin';
    }

    const result = nutritionDatabase[key];
    return result ? { ...result, matchType: 'muffin-size-default' } : null;
}

function isBrandedProduct(query) {
    const lower = normalizeQuery(query);
    const brandIndicators = [
        'daisy', 'chobani', 'fage', 'yoplait', 'dannon', 'oikos', 'siggi',
        'fairlife', 'kraft', 'oscar mayer', 'tyson', 'perdue', 'hormel', 'hillshire',
        'johnsonville',
        'great value', 'kirkland', 'trader joe', 'whole foods', 'quest', 'rxbar',
        'kind', 'clif', 'larabar', 'nature valley', 'cheerios', 'special k',
        'kashi', 'quaker', 'post', 'ben & jerry', 'haagen-dazs', 'breyers',
        'talenti', 'coca-cola', 'pepsi', 'gatorade', 'powerade', 'body armor',
        'mcdonald', 'chick-fil-a', 'chick fil a', 'chipotle', 'taco bell',
        'wendy', 'burger king', 'subway', 'starbucks', 'dunkin', 'popeyes',
        'kfc', 'panera', 'olive garden', 'panda express', 'five guys',
        'in-n-out', 'in n out', 'raising cane', 'sonic', 'whataburger',
        'arby', 'arbys', 'domino', 'dominos', 'pizza hut', 'papa john',
        'little caesars', 'little ceasars', 'dairy queen', 'dq', 'shake shack',
        'jimmy john', 'jersey mike', 'culver', 'culvers', 'qdoba',
        'trolli', 'trolley', 'ferrara', 'sour brite', 'sour bright'
    ];

    return brandIndicators.some((indicator) => lower.includes(indicator));
}

function isKnownSingleFoodPhrase(query) {
    const lower = normalizeQuery(query);
    const singleFoodPhrases = [
        'mac and cheese',
        'fish and chips',
        'peanut butter and jelly',
        'cookies and cream',
        'salt and vinegar',
        'biscuits and gravy'
    ];
    return singleFoodPhrases.some((phrase) => lower.includes(phrase));
}

function isLikelyCompositeQuery(query) {
    const lower = normalizeQuery(query);

    if (lower.includes(',')) return true;
    if (lower.includes('+')) return true;
    if (lower.includes(' then ') || lower.includes(' also ') || lower.includes(' plus ')) return true;
    if (lower.includes(' with ')) return true;
    if (queryImpliesMealCombo(lower)) return true;
    if (!isKnownSingleFoodPhrase(lower) && /\sand\s/.test(lower)) return true;
    return false;
}

function toFiniteNumber(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/,/g, '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function clampAndRound(value, min = 0, max = 5000) {
    const num = toFiniteNumber(value, 0);
    const clamped = Math.min(Math.max(num, min), max);
    return Math.round(clamped);
}

function cleanText(value, fallback, maxLength = 120) {
    if (typeof value !== 'string') return fallback;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function assessNutritionPlausibility(food) {
    const calories = toFiniteNumber(food?.calories, 0);
    const protein = toFiniteNumber(food?.protein, 0);
    const carbs = toFiniteNumber(food?.carbs, 0);
    const fiber = toFiniteNumber(food?.fiber, 0);
    const netCarbs = toFiniteNumber(food?.netCarbs, NaN);
    const fat = toFiniteNumber(food?.fat, 0);
    const issues = [];

    if (fiber > carbs) issues.push('fiber-exceeds-carbs');
    if (Number.isFinite(netCarbs) && netCarbs > carbs) issues.push('net-carbs-exceed-carbs');

    const macroCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    if (calories >= 100 && macroCalories > 0) {
        if (macroCalories > (calories * 1.75) + 50) {
            issues.push('macro-calories-exceed-declared-calories');
        } else if (calories > (macroCalories * 2.5) + 100) {
            issues.push('declared-calories-exceed-macro-calories');
        }
    }

    return {
        plausible: issues.length === 0,
        issues,
        macroCalories: Math.round(macroCalories)
    };
}

function applyNutritionPlausibilityValidation(food) {
    if (!food || typeof food !== 'object') return food;

    const assessment = assessNutritionPlausibility(food);
    if (assessment.plausible) {
        const cleaned = { ...food };
        delete cleaned.nutritionWarnings;
        return cleaned;
    }

    const warningText = `Nutrition plausibility warning: ${assessment.issues.join(', ')}; values preserved for verification.`;
    const updated = {
        ...food,
        confidence: 'low',
        needsVerification: true,
        nutritionWarnings: assessment.issues,
        evidence: cleanText(
            `${food.evidence ? `${food.evidence}; ` : ''}${warningText}`,
            warningText,
            240
        )
    };

    if (Object.prototype.hasOwnProperty.call(food, 'officiallyVerified')) {
        updated.officiallyVerified = false;
    }

    return updated;
}

function hasAuthoritativeNutritionEvidence(food) {
    if (!food || typeof food !== 'object') return false;
    if (food.nutritionBasis === 'user-provided' || food.labelExtracted === true || food.visibleLabel || food.sourceType === 'label') {
        return true;
    }

    return /\b(?:user[- ]provided|dictated|visible\s+(?:nutrition\s+)?label|nutrition\s+facts|package\s+label)\b/i.test(
        `${food.source || ''} ${food.evidence || ''}`
    );
}

function sanitizeFoodMemoryHints(value) {
    const hints = Array.isArray(value) ? value : [];
    return hints.slice(0, 5).map((hint) => {
        if (!hint || typeof hint !== 'object') return null;
        const name = cleanText(hint.name, '', 100);
        const calories = clampAndRound(hint.calories, 0, 5000);
        if (!name) return null;

        const carbs = clampAndRound(hint.carbs, 0, 1000);
        const fiber = clampAndRound(hint.fiber, 0, 500);
        const netCarbs = hint.netCarbs === undefined || hint.netCarbs === null
            ? Math.max(0, carbs - fiber)
            : clampAndRound(hint.netCarbs, 0, 1000);

        return {
            name,
            restaurant: cleanText(hint.restaurant || '', '', 80) || null,
            serving: cleanText(hint.serving, '1 serving', 100),
            calories,
            protein: clampAndRound(hint.protein, 0, 1000),
            carbs,
            fiber,
            netCarbs,
            fat: clampAndRound(hint.fat, 0, 1000),
            sugar: clampAndRound(hint.sugar, 0, 1000),
            source: cleanText(hint.source, 'Saved user food memory', 120),
            aliases: Array.isArray(hint.aliases)
                ? hint.aliases.map((alias) => cleanText(alias, '', 80)).filter(Boolean).slice(0, 6)
                : []
        };
    }).filter(Boolean);
}

function formatFoodMemoryHints(hints) {
    return hints.map((hint, index) => {
        const title = [hint.restaurant, hint.name].filter(Boolean).join(' ');
        const aliases = hint.aliases.length ? `; aliases ${hint.aliases.join(', ')}` : '';
        return `${index + 1}. ${title}; serving ${hint.serving}; per unit ${hint.calories} cal, P ${hint.protein}g, C ${hint.carbs}g, fiber ${hint.fiber}g, net ${hint.netCarbs}g, F ${hint.fat}g, sugar ${hint.sugar}g; source ${hint.source}${aliases}`;
    }).join('\n');
}

function sanitizeLocationContext(value) {
    if (!value || typeof value !== 'object') return null;
    const latitude = toFiniteNumber(value.latitude, NaN);
    const longitude = toFiniteNumber(value.longitude, NaN);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return {
        latitude: Math.round(latitude * 1000) / 1000,
        longitude: Math.round(longitude * 1000) / 1000,
        accuracyMeters: Math.max(0, Math.min(10000, Math.round(toFiniteNumber(value.accuracyMeters, 0))))
    };
}

function scoreFoodMemoryHint(query, hint) {
    const rawNormalizedQuery = normalizeQuery(query);
    const requestsSavedFood = /\b(my\s+)?(usual|regular|saved|same|go[ -]?to|favorite|favourite)\b/.test(rawNormalizedQuery);
    const normalizedQuery = rawNormalizedQuery
        .replace(/\b(my|usual|regular|saved|same|food|meal|breakfast|lunch|dinner|snack)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const searchable = [hint.name, hint.restaurant, ...(hint.aliases || [])]
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => normalizeQuery(value))
        .filter(Boolean);
    if (!normalizedQuery || !searchable.length) return 0;

    const querySize = normalizedQuery.match(/\b(mini|small|standard|regular|medium|large|big|thick|jumbo)\b/)?.[1] || '';
    let best = 0;
    searchable.forEach((candidate) => {
        const candidateSize = candidate.match(/\b(mini|small|standard|regular|medium|large|big|thick|jumbo)\b/)?.[1] || '';
        if (querySize && candidateSize && querySize !== candidateSize) return;
        if (normalizedQuery === candidate) {
            best = Math.max(best, 100);
            return;
        }

        const queryTokens = Array.from(new Set(normalizedQuery.split(' ').filter((token) => token.length > 2)));
        const candidateTokens = Array.from(new Set(candidate.split(' ').filter((token) => token.length > 2)));
        const candidateTokenSet = new Set(candidateTokens);
        const overlap = queryTokens.filter((token) => candidateTokenSet.has(token)).length;
        if (overlap > 0) {
            const precision = overlap / candidateTokens.length;
            const recall = overlap / queryTokens.length;
            const identityScore = Math.round((2 * precision * recall / (precision + recall)) * 100);
            best = Math.max(best, identityScore);
        }

        // A broad containment match is only appropriate when the user explicitly
        // asks for a saved/usual item. It must not turn "McDonald's ... McMuffin"
        // into a previously logged generic "sausage".
        if (requestsSavedFood) {
            if (normalizedQuery.includes(candidate) && candidate.length >= 5) best = Math.max(best, 94);
            else if (candidate.includes(normalizedQuery) && normalizedQuery.length >= 5) best = Math.max(best, 88);
        }
    });
    return best;
}

function buildFoodFromMemoryHint(query, memoryHints) {
    const ranked = (Array.isArray(memoryHints) ? memoryHints : [])
        .map((hint) => ({ hint, score: scoreFoodMemoryHint(query, hint) }))
        .filter(({ score }) => score >= 88)
        .sort((a, b) => b.score - a.score);
    const match = ranked[0]?.hint;
    if (!match) return null;
    const quantity = extractServingQuantityFromQuery(query, match);
    return {
        name: match.name,
        matchedItem: match.name,
        restaurant: match.restaurant || null,
        calories: match.calories,
        protein: match.protein,
        carbs: match.carbs,
        fiber: match.fiber,
        netCarbs: match.netCarbs,
        fat: match.fat,
        sugar: match.sugar,
        serving: match.serving || '1 serving',
        quantity,
        confidence: 'high',
        needsVerification: false,
        source: match.source || 'Saved user food memory',
        sourceType: 'user-saved',
        sourceUrl: null,
        evidence: 'Matched a user-confirmed saved food before generic database lookup',
        fromFoodMemory: true
    };
}

function normalizeConfidence(value) {
    const normalized = String(value || '').toLowerCase().trim();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
        return normalized;
    }
    return 'medium';
}

function normalizeSourceType(value, fallback = 'estimate') {
    const normalized = String(value || '').toLowerCase().trim();
    if (normalized === 'official' || normalized === 'menu_pdf' || normalized === 'aggregator' || normalized === 'estimate' || normalized === 'database' || normalized === 'label') {
        return normalized;
    }
    return fallback;
}

function inferSourceTypeFromSource(sourceText, fallback = 'estimate') {
    const lower = normalizeQuery(sourceText || '');
    if (!lower) return fallback;
    if (lower.includes('official')) return 'official';
    if (/\b(?:nutrition\s+facts?|package\s+label|visible\s+label|label\s+text)\b/.test(lower)) return 'label';
    if (lower.includes('database') || lower === 'usda') return 'database';
    if (lower.includes('pdf')) return 'menu_pdf';
    if (lower.includes('estimate')) return 'estimate';
    if (
        lower.includes('aggregator')
        || lower.includes('myfitnesspal')
        || lower.includes('calorieking')
        || lower.includes('fatsecret')
        || lower.includes('mynetdiary')
        || lower.includes('loseit')
        || lower.includes('lose it')
        || lower.includes('carb manager')
    ) {
        return 'aggregator';
    }
    return fallback;
}

function cleanSourceUrl(value) {
    if (typeof value !== 'string') return null;
    const candidate = value.trim();
    if (!candidate) return null;
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.toString();
        }
    } catch {
        return null;
    }
    return null;
}

function deriveRestaurantFromSource(sourceText) {
    const source = cleanText(sourceText, '', 120);
    if (!source) return null;
    if (/official$/i.test(source)) {
        return cleanText(source.replace(/\s+official$/i, ''), '', 80) || null;
    }
    return null;
}

function queryImpliesMealCombo(query) {
    return /\b(meal|combo|combos|box|bundle)\b/.test(normalizeQuery(query));
}

function isRestaurantLikeQuery(query) {
    const lower = normalizeQuery(query);
    if (!lower) return false;

    if (queryImpliesMealCombo(lower)) return true;
    if (/\bfrom\s+[a-z0-9&'.-]{2,}/.test(lower)) return true;
    if (/\b\d+\s*(?:[-–—]\s*)?(piece|pc|count|ct)\b/.test(lower)) return true;

    const restaurantMenuTerms = [
        'burger', 'fries', 'nuggets', 'wings', 'sandwich', 'taco', 'burrito',
        'quesadilla', 'pizza', 'shake', 'milkshake', 'soda', 'drink'
    ];
    const hasRestaurantMenuTerm = restaurantMenuTerms.some((term) => lower.includes(term));

    if (hasRestaurantMenuTerm && /\b(meal|combo|menu|bucket|platter|value)\b/.test(lower)) {
        return true;
    }

    const tokens = lower.split(/\s+/).filter(Boolean);
    return tokens.length >= 4 && hasRestaurantMenuTerm;
}

function queryMentionsDrink(query) {
    const lower = normalizeQuery(query);
    return /\b(drink|soda|coke|sprite|tea|lemonade|shake|milkshake|coffee)\b/.test(lower);
}

function querySpecifiesDrinkType(query) {
    const lower = normalizeQuery(query);
    return /\b(coke|coca cola|pepsi|sprite|dr pepper|fanta|mountain dew|sweet tea|unsweet tea|lemonade|shake|milkshake|latte|mocha|frappuccino|espresso|coffee)\b/.test(lower);
}

function querySpecifiesDrinkSize(query) {
    const lower = normalizeQuery(query);
    return /\b(small|medium|large|xl|extra large|kids|kid|oz|ounce|ounces|fl oz|liter|litre|ml)\b/.test(lower);
}

function queryHasUnspecifiedDrink(query) {
    return queryMentionsDrink(query) && !querySpecifiesDrinkType(query);
}

function foodLooksLikeDrink(food) {
    const text = normalizeQuery(`${food?.name || ''} ${food?.matchedItem || ''}`);
    return /\b(drink|soda|coke|sprite|tea|lemonade|shake|milkshake|coffee)\b/.test(text);
}

function foodLooksLikeSauce(food) {
    const text = normalizeQuery(`${food?.name || ''} ${food?.matchedItem || ''}`);
    return /\b(sauce|ketchup|ranch|buffalo|bbq|mayo|aioli|dressing)\b/.test(text);
}

function foodLooksLikeSide(food) {
    const text = normalizeQuery(`${food?.name || ''} ${food?.matchedItem || ''}`);
    return /\b(fries|french fries|waffle fries|crinkle|tots|chips|coleslaw|slaw|mac|cheese|side|toast|bread|biscuit)\b/.test(text);
}

function queryMentionsExtraSide(query) {
    const lower = normalizeQuery(query);
    return (
        /\bside of\b/.test(lower)
        || /\b(extra|additional|add)\b.{0,20}\b(fries|tots|chips|coleslaw|slaw|mac|cheese|toast|bread|biscuit|side)\b/.test(lower)
    );
}

function hasDrinkFood(foods) {
    return (Array.isArray(foods) ? foods : []).some((food) => foodLooksLikeDrink(food));
}

function hasOfficialNonAggregatorSource(foods) {
    return (Array.isArray(foods) ? foods : []).some((food) => (
        (food?.sourceType === 'official' || food?.sourceType === 'menu_pdf')
        && Boolean(food?.sourceUrl)
        && !isAggregatorHost(food.sourceUrl)
    ));
}

function getHostFromUrl(url) {
    if (!url) return '';
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function isAggregatorHost(url) {
    const host = getHostFromUrl(url);
    return [
        'mynetdiary.com',
        'www.mynetdiary.com',
        'myfitnesspal.com',
        'www.myfitnesspal.com',
        'fatsecret.com',
        'www.fatsecret.com',
        'calorieking.com',
        'www.calorieking.com',
        'loseit.com',
        'www.loseit.com',
        'carbmanager.com',
        'www.carbmanager.com'
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function decodeHtmlEntities(value) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
}

function stripHtml(value) {
    return decodeHtmlEntities(String(value || '').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

function buildQueryTokens(query) {
    const stopWords = new Set([
        'with', 'and', 'the', 'for', 'from', 'meal', 'combo', 'box', 'bundle',
        'a', 'an', 'to', 'of', 'in', 'on', 'at', 'drink'
    ]);

    return normalizeQuery(query)
        .split(/\s+/)
        .map((token) => token.replace(/[^a-z0-9]/g, ''))
        .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function extractQueryNumbers(query) {
    return [...new Set((normalizeQuery(query).match(/\b\d+\b/g) || []))];
}

function normalizeNutritionLabel(label) {
    const normalized = normalizeQuery(stripHtml(label));
    if (!normalized) return null;

    if (normalized.includes('calories')) return 'calories';
    if (normalized.includes('protein')) return 'protein';
    if (normalized.includes('carbs')) return 'carbs';
    if (normalized.includes('fiber') || normalized.includes('fibre')) return 'fiber';
    if (normalized.includes('tot. fat') || normalized.includes('total fat') || normalized === 'fat') return 'fat';
    if (normalized.includes('sugar')) return 'sugar';

    return null;
}

function parseNutritionItemsFromHtml(html, pageUrl) {
    if (typeof html !== 'string' || !html) return [];

    const items = [];
    const itemRegex = /<a\s+href="([^"]*\/menu\/[^"#?]+)"[^>]*class="[^"]*nutr__link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(html)) !== null) {
        const href = itemMatch[1];
        const block = itemMatch[2];
        const titleMatch = block.match(/<h[1-4][^>]*class="[^"]*nutr__h3[^"]*"[^>]*>([\s\S]*?)<\/h[1-4]>/i)
            || block.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
        const itemName = stripHtml(titleMatch?.[1] || '');
        if (!itemName) continue;

        const nutrition = {
            calories: null,
            protein: null,
            carbs: null,
            fiber: null,
            fat: null,
            sugar: null
        };

        const pairRegex = /<div[^>]*class="[^"]*nutr__value[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*nutr__label[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
        let pairMatch;
        while ((pairMatch = pairRegex.exec(block)) !== null) {
            const value = Number(stripHtml(pairMatch[1]).replace(/,/g, ''));
            const labelKey = normalizeNutritionLabel(pairMatch[2]);
            if (!labelKey || !Number.isFinite(value)) continue;
            nutrition[labelKey] = value;
        }

        if (!Number.isFinite(nutrition.calories) || nutrition.calories <= 0) continue;

        let absoluteUrl = null;
        try {
            absoluteUrl = new URL(href, pageUrl).toString();
        } catch {
            absoluteUrl = pageUrl;
        }

        items.push({
            name: itemName,
            calories: nutrition.calories,
            protein: Number.isFinite(nutrition.protein) ? nutrition.protein : 0,
            carbs: Number.isFinite(nutrition.carbs) ? nutrition.carbs : 0,
            fiber: Number.isFinite(nutrition.fiber) ? nutrition.fiber : 0,
            netCarbs: Math.max(0, (Number.isFinite(nutrition.carbs) ? nutrition.carbs : 0) - (Number.isFinite(nutrition.fiber) ? nutrition.fiber : 0)),
            fat: Number.isFinite(nutrition.fat) ? nutrition.fat : 0,
            sugar: Number.isFinite(nutrition.sugar) ? nutrition.sugar : 0,
            sourceUrl: absoluteUrl
        });
    }

    return items;
}

function buildNutritionCandidateUrls(sourceUrl) {
    try {
        const parsed = new URL(sourceUrl);
        const origin = parsed.origin;
        return [...new Set([
            `${origin}/nutrition`,
            sourceUrl,
            `${origin}/nutrition-facts`,
            `${origin}/nutrition-information`,
            `${origin}/nutritional-information`,
            `${origin}/menu`
        ])];
    } catch {
        return [sourceUrl];
    }
}

function extractRestaurantHintFromQuery(query) {
    const tokens = normalizeQuery(query).split(/\s+/).filter(Boolean);
    const stopTokens = new Set([
        'meal', 'combo', 'combos', 'box', 'bundle', 'with', 'and', 'drink', 'drinks',
        'nugget', 'nuggets', 'tender', 'tenders', 'wing', 'wings', 'fries', 'burger',
        'sandwich', 'pizza', 'taco', 'burrito', 'piece', 'pieces', 'count', 'pc', 'ct'
    ]);

    const restaurantTokens = [];
    for (const token of tokens) {
        if (/^\d+$/.test(token)) break;
        if (stopTokens.has(token) && restaurantTokens.length > 0) break;
        if (!stopTokens.has(token)) {
            restaurantTokens.push(token);
        }
        if (restaurantTokens.length >= 5) break;
    }

    return restaurantTokens.length >= 2 ? restaurantTokens.join(' ') : '';
}

function buildRestaurantDomainCandidates(foods, query) {
    const restaurantHints = [];
    for (const food of (Array.isArray(foods) ? foods : [])) {
        const restaurant = cleanText(food?.restaurant, '', 120);
        if (restaurant) restaurantHints.push(restaurant);
    }
    const queryHint = extractRestaurantHintFromQuery(query);
    if (queryHint) restaurantHints.push(queryHint);

    const candidates = new Set();
    const tlds = ['com', 'net', 'org', 'co', 'io', 'ooo'];
    const ignored = new Set(['tx', 'texas', 'usa', 'us']);

    for (const hint of restaurantHints.slice(0, 4)) {
        const words = normalizeQuery(hint)
            .split(/\s+/)
            .map((word) => word.replace(/[^a-z0-9]/g, ''))
            .filter((word) => word.length >= 2 && !ignored.has(word))
            .slice(0, 4);
        if (words.length < 2) continue;

        const joined = words.join('');
        const hyphen = words.join('-');
        const acronym = words.map((word) => word[0]).join('');

        for (const tld of tlds) {
            candidates.add(`https://www.${joined}.${tld}`);
            candidates.add(`https://${joined}.${tld}`);
            candidates.add(`https://www.${hyphen}.${tld}`);
            candidates.add(`https://${hyphen}.${tld}`);
            if (acronym.length >= 2) {
                candidates.add(`https://www.${acronym}.${tld}`);
                candidates.add(`https://${acronym}.${tld}`);
            }
        }
    }

    return [...candidates].slice(0, 18);
}

async function fetchTextWithTimeout(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'FuelFireNutritionBot/1.0',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });

        if (!response.ok) return null;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) return null;
        return await response.text();
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function resolveOfficialNutritionFromRestaurantHint(foods, query) {
    const candidates = buildRestaurantDomainCandidates(foods, query);
    if (!candidates.length) return null;

    let bestMatch = null;
    let bestScore = -Infinity;
    const seenPages = new Set();

    for (const candidateUrl of candidates) {
        let origin;
        try {
            origin = new URL(candidateUrl).origin;
        } catch {
            continue;
        }

        const probeUrls = [...new Set([
            `${origin}/nutrition`,
            `${origin}/menu`,
            `${origin}/nutrition-facts`,
            `${origin}`
        ])];

        for (const probeUrl of probeUrls) {
            if (seenPages.has(probeUrl)) continue;
            seenPages.add(probeUrl);

            const html = await fetchTextWithTimeout(probeUrl, 3500);
            if (!html) continue;

            const pageItems = parseNutritionItemsFromHtml(html, probeUrl);
            for (const item of pageItems) {
                const score = scoreNutritionItemForQuery(item, query);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = { ...item, matchScore: score };
                }
            }
        }
    }

    if (!bestMatch || bestScore < 6) return null;
    return bestMatch;
}

function scoreNutritionItemForQuery(item, query) {
    const queryText = normalizeQuery(query);
    const itemText = normalizeQuery(`${item?.name || ''} ${item?.sourceUrl || ''}`);
    const queryTokens = buildQueryTokens(query);
    const queryNumbers = extractQueryNumbers(query);
    const itemNumbers = new Set(itemText.match(/\b\d+\b/g) || []);

    let score = 0;

    for (const token of queryTokens) {
        if (itemText.includes(token)) {
            score += token.length >= 5 ? 2 : 1;
        }
    }

    for (const num of queryNumbers) {
        if (itemNumbers.has(num)) {
            score += 4;
        } else if (itemNumbers.size > 0) {
            score -= 1;
        }
    }

    if (queryImpliesMealCombo(queryText)) {
        if (/\b(meal|combo|combos|box|bundle)\b/.test(itemText)) {
            score += 4;
        } else {
            score -= 2;
        }
    }

    if (queryText.includes('nugget') && itemText.includes('nugget')) score += 3;
    if (queryText.includes('tender') && itemText.includes('tender')) score += 2;
    if (queryText.includes('wing') && itemText.includes('wing')) score += 2;
    if (queryText.includes('fries') && itemText.includes('fries')) score += 1;
    if (queryMentionsDrink(queryText) && foodLooksLikeDrink(item)) score -= 2;

    if (Number.isFinite(item?.calories) && item.calories > 0) score += 1;

    return score;
}

async function resolveOfficialNutritionFromSourceUrls(foods, query) {
    const allowEstimateSources = isRestaurantLikeQuery(query);
    const officialUrls = [...new Set((foods || [])
        .filter((food) => (
            (
                food?.sourceType === 'official'
                || food?.sourceType === 'menu_pdf'
                || (allowEstimateSources && food?.sourceType === 'estimate')
            )
            && Boolean(food?.sourceUrl)
            && !isAggregatorHost(food.sourceUrl)
        ))
        .map((food) => food.sourceUrl))];

    const restaurantLikeQuery = isRestaurantLikeQuery(query);
    if (!officialUrls.length && !restaurantLikeQuery) return null;

    let bestMatch = null;
    let bestScore = -Infinity;
    const seenPages = new Set();

    for (const sourceUrl of officialUrls.slice(0, 2)) {
        const candidateUrls = buildNutritionCandidateUrls(sourceUrl);
        for (const candidateUrl of candidateUrls) {
            if (seenPages.has(candidateUrl)) continue;
            seenPages.add(candidateUrl);

            const html = await fetchTextWithTimeout(candidateUrl, 10000);
            if (!html) continue;

            const pageItems = parseNutritionItemsFromHtml(html, candidateUrl);
            for (const item of pageItems) {
                const score = scoreNutritionItemForQuery(item, query);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = { ...item, matchScore: score };
                }
            }
        }
    }

    if ((!bestMatch || bestScore < 6) && restaurantLikeQuery) {
        const hintedMatch = await resolveOfficialNutritionFromRestaurantHint(foods, query);
        if (hintedMatch && toFiniteNumber(hintedMatch.matchScore, -Infinity) > bestScore) {
            bestMatch = hintedMatch;
            bestScore = toFiniteNumber(hintedMatch.matchScore, bestScore);
        }
    }

    if (!bestMatch || bestScore < 6) {
        return null;
    }

    return bestMatch;
}

function resolveOfficialServingBasis(resolved) {
    const servingText = [resolved?.serving, resolved?.servingSize, resolved?.name]
        .filter(Boolean)
        .join(' ');
    const servingBasis = extractCountBasis(servingText);
    const groupedCount = servingBasis.groupCount;
    if (groupedCount === null) {
        return {
            serving: cleanText(resolved?.serving || resolved?.servingSize, '1 serving', 100),
            groupedCount: null
        };
    }

    const suppliedServing = cleanText(resolved?.serving || resolved?.servingSize, '', 100);
    const suppliedBasis = extractCountBasis(suppliedServing);
    return {
        serving: suppliedBasis.groupCount === groupedCount
            ? suppliedServing
            : formatCountServing(groupedCount, servingBasis.groupUnit),
        groupedCount
    };
}

function resolveOfficialPortionBasis(query, resolved) {
    const officialBasis = resolveOfficialServingBasis(resolved);
    const quantity = extractServingQuantityFromQuery(query, {
        serving: officialBasis.serving,
        name: resolved?.name
    });

    return {
        serving: officialBasis.serving,
        quantity: Math.round(quantity * 1000) / 1000
    };
}

export function applyOfficialNutritionReplacement(existing, resolved, query) {
    if (!existing || !resolved || hasAuthoritativeNutritionEvidence(existing)) return existing;

    const portionBasis = resolveOfficialPortionBasis(query, resolved);
    const replacement = {
        ...existing,
        name: cleanText(resolved.name, existing?.name || 'Menu item', 120),
        matchedItem: cleanText(resolved.name, existing?.matchedItem || 'Menu item', 120),
        calories: clampAndRound(resolved.calories, 0, 5000),
        protein: clampAndRound(resolved.protein, 0, 500),
        carbs: clampAndRound(resolved.carbs, 0, 700),
        fiber: clampAndRound(resolved.fiber || 0, 0, 300),
        netCarbs: clampAndRound(resolved.netCarbs ?? Math.max(0, toFiniteNumber(resolved.carbs, 0) - toFiniteNumber(resolved.fiber, 0)), 0, 700),
        fat: clampAndRound(resolved.fat, 0, 300),
        sugar: clampAndRound(resolved.sugar, 0, 300),
        serving: portionBasis.serving,
        quantity: portionBasis.quantity,
        confidence: 'high',
        source: cleanText('Official nutrition page', 'Official nutrition page', 120),
        sourceType: 'official',
        sourceUrl: cleanSourceUrl(resolved.sourceUrl),
        evidence: cleanText(`Matched "${resolved.name}" on official nutrition page`, 'Matched item on official nutrition page', 240),
        officiallyVerified: true
    };

    return applyNutritionPlausibilityValidation(replacement);
}

async function refineFoodsWithOfficialNutrition(foods, query) {
    if (!Array.isArray(foods) || !foods.length) return foods;

    const resolved = await resolveOfficialNutritionFromSourceUrls(foods, query);
    if (!resolved) return foods;

    const replaceIndex = foods.findIndex((food) => !foodLooksLikeDrink(food));
    if (replaceIndex === -1) return foods;

    const existing = foods[replaceIndex];
    const replacement = applyOfficialNutritionReplacement(existing, resolved, query);
    if (replacement === existing) return foods;

    const updated = [...foods];
    updated[replaceIndex] = replacement;

    const replacementIsMeal = /\b(meal|combo|combos|box|bundle)\b/.test(normalizeQuery(replacement.name));
    if (replacementIsMeal) {
        const queryMentionsSauce = /\b(sauce|ketchup|ranch|buffalo|bbq|mayo|aioli|dressing)\b/.test(normalizeQuery(query));
        const extraSideRequested = queryMentionsExtraSide(query);
        return updated.filter((food, index) => {
            if (index === replaceIndex) return true;
            if (!queryMentionsSauce && foodLooksLikeSauce(food)) return false;
            if (!extraSideRequested && foodLooksLikeSide(food)) return false;
            return true;
        });
    }

    return updated;
}

function ensureComponentSeparation(foods, query) {
    if (!Array.isArray(foods)) return [];
    let separated = [...foods];
    const wantsDrink = queryImpliesMealCombo(query) && queryMentionsDrink(query);
    const unspecifiedDrink = queryHasUnspecifiedDrink(query);

    if (wantsDrink) {
        const drinkIndexes = separated
            .map((food, index) => (foodLooksLikeDrink(food) ? index : -1))
            .filter((index) => index !== -1);
        const hasOfficialDrink = drinkIndexes.some((index) => (
            (separated[index]?.sourceType === 'official' || separated[index]?.sourceType === 'menu_pdf')
            && Boolean(separated[index]?.sourceUrl)
        ));

        if (unspecifiedDrink && drinkIndexes.length > 0 && !hasOfficialDrink) {
            const keepIndex = drinkIndexes[0];
            separated[keepIndex] = {
                ...separated[keepIndex],
                name: 'Drink (unspecified)',
                matchedItem: 'Drink (unspecified)',
                calories: 0,
                protein: 0,
                carbs: 0,
                fiber: 0,
                netCarbs: 0,
                fat: 0,
                sugar: 0,
                serving: '1 drink',
                quantity: 1,
                confidence: 'low',
                source: 'Drink mentioned, type not specified',
                sourceType: 'estimate',
                sourceUrl: null,
                evidence: 'User requested a drink but did not specify drink type'
            };

            separated = separated.filter((food, index) => (
                index === keepIndex || !foodLooksLikeDrink(food)
            ));
        }
    }

    if (wantsDrink && !hasDrinkFood(separated)) {
        separated.push({
            name: 'Drink (unspecified)',
            matchedItem: 'Drink (unspecified)',
            restaurant: separated.find((food) => food?.restaurant)?.restaurant || null,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            sugar: 0,
            serving: '1 drink',
            quantity: 1,
            confidence: 'low',
            source: 'Drink mentioned, type not specified',
            sourceType: 'estimate',
            sourceUrl: null,
            evidence: 'Added placeholder drink item because query explicitly included a drink'
        });
    }
    return separated;
}

function buildClarifyingQuestions(query, foods) {
    const questions = buildHighImpactClarifyingQuestions({ query, foods });
    const normalizedQuery = normalizeQuery(query);
    const drinkItems = (Array.isArray(foods) ? foods : []).filter((food) => foodLooksLikeDrink(food));
    const hasUnspecifiedDrinkItem = drinkItems.some((food) => (
        normalizeQuery(food?.name || '') === 'drink unspecified'
        || normalizeQuery(food?.matchedItem || '') === 'drink unspecified'
        || (
            toFiniteNumber(food?.calories, 0) === 0
            && (food?.sourceType === 'estimate' || !food?.sourceType)
            && /\bdrink\b/.test(normalizeQuery(`${food?.name || ''} ${food?.matchedItem || ''}`))
        )
    ));

    const needsDrinkClarification = queryHasUnspecifiedDrink(normalizedQuery) || hasUnspecifiedDrinkItem;
    if (needsDrinkClarification) {
        if (!querySpecifiesDrinkType(normalizedQuery)) {
            questions.push({
                id: 'drink_type',
                question: 'What type of drink is it?',
                examples: ['Coke', 'Sprite', 'Sweet tea', 'Lemonade', 'Milkshake'],
                reason: 'Drink was mentioned but drink type was not specified.'
            });
        }
        if (!querySpecifiesDrinkSize(normalizedQuery)) {
            questions.push({
                id: 'drink_size',
                question: 'What size is the drink?',
                examples: ['Small', 'Medium', 'Large', '16 oz', '20 oz'],
                reason: 'Drink size is needed for accurate calories.'
            });
        }
    }

    const mentionsMuffin = /\bmuffins?\b/.test(normalizedQuery);
    const mentionsMuffinSize = /\b(mini|small|standard|regular|normal|medium|large|jumbo|bakery|costco|kirkland|box mix|muffin mix|package|label)\b/.test(normalizedQuery);
    const muffinFood = (Array.isArray(foods) ? foods : []).find((food) => /\bmuffins?\b/i.test(`${food?.name || ''} ${food?.serving || ''}`));
    if (mentionsMuffin && muffinFood && !mentionsMuffinSize) {
        questions.push({
            id: 'muffin_size',
            question: 'What size/type were the muffins?',
            examples: ['standard / box mix', 'mini', 'large bakery', 'Costco large', 'use package label'],
            reason: 'Muffins vary a lot by size, so the app needs the size or label serving to avoid overcounting.'
        });
    }

    const mentionsSausageLinks = /\bsausage\s+links?\b|\blinks?\b/.test(normalizedQuery)
        && (Array.isArray(foods) ? foods : []).some((food) => /\bsausage\b|\blinks?\b/i.test(`${food?.name || ''} ${food?.serving || ''}`));
    const specifiesSausageSize = /\b(mini|small|breakfast|standard|regular|large|thick|bratwurst|brat|kielbasa|\d+(?:\.\d+)?\s*(?:g|gram|grams|oz|ounce|ounces))\b/.test(normalizedQuery);
    const specifiesSausageBrand = /\b(johnsonville|jimmy dean|bob evans|banquet|aidells|hillshire|applegate)\b/.test(normalizedQuery);
    if (mentionsSausageLinks && !specifiesSausageSize && !specifiesSausageBrand) {
        questions.push({
            id: 'sausage_size',
            question: 'What size/type were the sausage links?',
            examples: ['small breakfast links', 'large bratwurst-size links', 'about 2 oz each', 'use the package label'],
            reason: 'A large sausage link can have several times the calories of a small breakfast link.'
        });
    }

    const mentionsGenericSteak = /\bsteak\b/.test(normalizedQuery)
        && !/\b(chipotle|taco bell|steak burrito|steak bowl)\b/.test(normalizedQuery);
    const specifiesSteakSize = /\b\d+(?:\.\d+)?\s*(?:g|gram|grams|oz|ounce|ounces|lb|lbs|pound|pounds)\b/.test(normalizedQuery)
        || /\b(small|medium|large|petite)\b/.test(normalizedQuery);
    if (mentionsGenericSteak && !specifiesSteakSize) {
        questions.push({
            id: 'steak_size',
            question: 'About how large was the steak?',
            examples: ['6 oz', '8 oz', '12 oz', 'weighed portion'],
            reason: 'Steak calories depend heavily on weight and cut.'
        });
    }

    const mentionsPancakes = /\bpancakes?\b/.test(normalizedQuery);
    const specifiesPancakeSize = /\b(mini|silver dollar|small|medium|large|restaurant|\d+(?:\.\d+)?\s*(?:inch|inches|in))\b/.test(normalizedQuery);
    if (mentionsPancakes && !specifiesPancakeSize) {
        questions.push({
            id: 'pancake_size',
            question: 'What size were the pancakes?',
            examples: ['silver dollar', 'about 4 inches', 'about 8 inches', 'restaurant large'],
            reason: 'Pancake diameter materially changes the estimated serving size.'
        });
    }

    const asksForWholePackage = /\b(full|whole|entire|all|rest of)\s+(bag|package|pack|container|box)\b/.test(normalizedQuery);
    const packagedServingFood = (Array.isArray(foods) ? foods : []).find((food) => (
        food?.serving
        && /\b(piece|pieces|serving|servings|g|gram|grams|oz)\b/i.test(food.serving)
        && /\b(package|label|manufacturer|official|database)\b/i.test(`${food.source || ''} ${food.sourceType || ''}`)
    ));

    if (asksForWholePackage && packagedServingFood && !/\b\d+(?:\.\d+)?\s*(?:servings?|pieces?|pcs?|count|ct)\b/.test(normalizedQuery)) {
        questions.push({
            id: 'servings_consumed',
            question: `I found ${packagedServingFood.calories} calories per ${packagedServingFood.serving}. How much did you eat?`,
            examples: ['1 serving', '2 servings', '40 pieces', 'the whole bag if the label says servings per container'],
            reason: 'A full package needs servings or pieces to calculate exact total calories.'
        });
    }

    return mergeClarifyingQuestions(questions);
}

function isWeakWebSearchFoods(foods, query) {
    if (!Array.isArray(foods) || foods.length === 0) return true;

    const mealLikeQuery = queryImpliesMealCombo(query);
    const singleCombinedMeal = mealLikeQuery && foods.length === 1;
    const missingSourceUrl = foods.every((food) => !food?.sourceUrl);
    const hasAggregatorUrl = foods.some((food) => isAggregatorHost(food?.sourceUrl));
    const lowConfidence = foods.some((food) => food?.confidence === 'low');
    const weakSourceType = foods.some((food) => food?.sourceType === 'estimate' || food?.sourceType === 'aggregator');
    const missingDrinkSplit = queryMentionsDrink(query) && !hasDrinkFood(foods);
    const mealNamedMatch = foods.some((food) => (
        /\b(meal|combo|combos|box|bundle)\b/.test(normalizeQuery(`${food?.name || ''} ${food?.matchedItem || ''}`))
    ));
    const totalCalories = calculateTotals(foods).calories;
    const highCountMealQuery = /\b(1[0-9]|[2-9]\d)\s*(piece|pc|count|ct|nugget|nuggets|tender|tenders)\b/.test(normalizeQuery(query));
    const possibleMealMiss = mealLikeQuery && highCountMealQuery && !mealNamedMatch && totalCalories < 1600;
    const unspecifiedDrinkWasAssumed = queryHasUnspecifiedDrink(query) && foods.some((food) => (
        foodLooksLikeDrink(food)
        && toFiniteNumber(food?.calories, 0) > 0
        && food?.sourceType !== 'official'
        && food?.sourceType !== 'menu_pdf'
    ));
    const hasOfficialSource = hasOfficialNonAggregatorSource(foods);
    const restaurantLikeQuery = mealLikeQuery || isBrandedProduct(query) || isRestaurantLikeQuery(query);
    const lacksOfficialForRestaurantLikeQuery = restaurantLikeQuery && !hasOfficialSource;

    return singleCombinedMeal
        || missingSourceUrl
        || hasAggregatorUrl
        || lowConfidence
        || weakSourceType
        || missingDrinkSplit
        || possibleMealMiss
        || unspecifiedDrinkWasAssumed
        || lacksOfficialForRestaurantLikeQuery;
}

function calculateTotals(foods) {
    return foods.reduce((totals, food) => {
        const qty = toFiniteNumber(food.quantity, 1);
        const carbs = toFiniteNumber(food.carbs, 0);
        const fiber = toFiniteNumber(food.fiber, 0);
        const explicitNetCarbs = toFiniteNumber(food.netCarbs, NaN);
        const netCarbs = Number.isFinite(explicitNetCarbs)
            ? explicitNetCarbs
            : Math.max(0, carbs - fiber);

        totals.calories += Math.round(toFiniteNumber(food.calories, 0) * qty);
        totals.protein += Math.round(toFiniteNumber(food.protein, 0) * qty);
        totals.carbs += Math.round(carbs * qty);
        totals.fiber += Math.round(fiber * qty);
        totals.netCarbs += Math.round(netCarbs * qty);
        totals.fat += Math.round(toFiniteNumber(food.fat, 0) * qty);
        totals.sugar += Math.round((food.sugar || 0) * qty);
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0, sugar: 0 });
}

function buildNutritionTotals(totals) {
    return {
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFiber: totals.fiber,
        totalNetCarbs: totals.netCarbs,
        totalFat: totals.fat,
        totalSugar: totals.sugar
    };
}

function buildEstimatedFood(query, source = 'estimated') {
    const lower = normalizeQuery(query);
    let estimate = { calories: 250, protein: 12, carbs: 22, fiber: 0, netCarbs: 22, fat: 10, sugar: 5 };

    if (lower.includes('salad')) estimate = { calories: 180, protein: 8, carbs: 14, fiber: 3, netCarbs: 11, fat: 10, sugar: 6 };
    if (lower.includes('pizza')) estimate = { calories: 285, protein: 12, carbs: 30, fiber: 2, netCarbs: 28, fat: 13, sugar: 3 };
    if (lower.includes('burger')) estimate = { calories: 520, protein: 26, carbs: 40, fiber: 2, netCarbs: 38, fat: 28, sugar: 8 };
    if (lower.includes('protein shake') || lower.includes('protein drink')) {
        estimate = { calories: 180, protein: 30, carbs: 8, fiber: 1, netCarbs: 7, fat: 3, sugar: 4 };
    }
    if (lower.includes('popcorn') || lower.includes('pop corn')) {
        estimate = { calories: 31, protein: 1, carbs: 6, fiber: 1, netCarbs: 5, fat: 0, sugar: 0 };
    }

    return {
        name: cleanText(query, 'Food item'),
        matchedItem: cleanText(query, 'Food item'),
        restaurant: null,
        calories: estimate.calories,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fiber: estimate.fiber,
        netCarbs: estimate.netCarbs,
        fat: estimate.fat,
        sugar: estimate.sugar,
        serving: '1 serving',
        quantity: 1,
        confidence: 'low',
        needsVerification: true,
        source,
        sourceType: 'estimate',
        sourceUrl: null,
        evidence: 'Estimated from generic nutrition profile'
    };
}

function buildFoodFromDatabase(query, dbResult) {
    const normalized = normalizeQuery(query);
    let quantity = extractServingQuantityFromQuery(query, dbResult);
    const source = dbResult.source || 'database';
    const sourceType = normalizeSourceType(dbResult.sourceType, dbResult.sourceUrl ? 'official' : 'database');
    const confidence = normalizeConfidence(dbResult.confidence || 'high');

    // Multiply by leading quantity for simple entries like "3 eggs"
    const leadingQuantityMatch = normalized.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    const hasExplicitServingUnit = /\b(piece|pieces|count|slice|slices|links?|patties?|muffins?|oz|ounce|ounces|lb|lbs|cup|cups)\b/.test(normalized);
    if (quantity === 1 && leadingQuantityMatch && !hasExplicitServingUnit) {
        quantity = Math.max(0.25, Math.min(20, toFiniteNumber(leadingQuantityMatch[1], 1)));
    }
    quantity = Math.round(quantity * 1000) / 1000;

    const food = {
        name: dbResult.name,
        matchedItem: dbResult.name,
        restaurant: deriveRestaurantFromSource(source),
        calories: clampAndRound(dbResult.calories, 0, 5000),
        protein: clampAndRound(dbResult.protein, 0, 500),
        carbs: clampAndRound(dbResult.carbs, 0, 700),
        fiber: clampAndRound(dbResult.fiber || 0, 0, 300),
        netCarbs: clampAndRound(
            dbResult.netCarbs ?? Math.max(0, toFiniteNumber(dbResult.carbs, 0) - toFiniteNumber(dbResult.fiber, 0)),
            0,
            700
        ),
        fat: clampAndRound(dbResult.fat, 0, 300),
        sugar: clampAndRound(dbResult.sugar || 0, 0, 300),
        serving: cleanText(dbResult.serving, '1 serving', 100),
        quantity,
        confidence,
        needsVerification: Boolean(dbResult.needsVerification)
            || confidence === 'low'
            || sourceType === 'estimate'
            || sourceType === 'aggregator',
        source,
        sourceType,
        sourceUrl: cleanSourceUrl(dbResult.sourceUrl),
        evidence: cleanText(`Matched local nutrition database (${dbResult.matchType || 'lookup'})`, 'Matched local nutrition database', 240)
    };

    return applyNutritionPlausibilityValidation(food);
}

function buildUserProvidedNutritionFallback(query, details) {
    const clauses = splitExplicitNutritionClauses(query);
    if (clauses.length > 1) {
        const foods = clauses.map(resolveUserProvidedNutritionClause).filter(Boolean);
        if (foods.length === clauses.length) return foods;
    }

    const lookupName = details?.lookupName || query;
    const databaseResult = searchDatabase(lookupName);
    const baseFood = databaseResult
        ? buildFoodFromDatabase(lookupName, databaseResult)
        : buildEstimatedFood(lookupName, 'estimated (user-provided nutrition missing fields)');
    return [applyUserProvidedNutritionOverrides(baseFood, details)];
}

function extractTextFromFoodAiResponse(data) {
    return typeof data?.text === 'string' ? data.text.trim() : '';
}

function parseFoodAiPayload(text) {
    const cleaned = String(text || '')
        .replace(/```json/gi, '```')
        .replace(/```/g, '')
        .trim();

    if (!cleaned) return { foods: [], notes: '' };

    const candidates = [];
    candidates.push(cleaned);

    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
        candidates.push(cleaned.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
        candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
    }

    for (const candidate of [...new Set(candidates)]) {
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) {
                return { foods: parsed, notes: '' };
            }
            if (parsed && Array.isArray(parsed.foods)) {
                return {
                    foods: parsed.foods,
                    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
                    overallConfidence: parsed.overallConfidence
                };
            }
            if (parsed && typeof parsed === 'object' && parsed.name) {
                return { foods: [parsed], notes: '' };
            }
        } catch {
            // Try next candidate
        }
    }

    return { foods: [], notes: '' };
}

function sanitizeFoods(rawFoods, query) {
    const foods = (Array.isArray(rawFoods) ? rawFoods : []).map((food, index) => {
        const quantity = Math.max(0.25, Math.min(20, toFiniteNumber(food?.quantity, 1)));
        const source = cleanText(food?.source, 'ai-estimated', 150);
        const sourceUrl = cleanSourceUrl(food?.sourceUrl);
        const urlInferredSourceType = sourceUrl && isAggregatorHost(sourceUrl) ? 'aggregator' : null;
        const inferredSourceType = inferSourceTypeFromSource(source, 'estimate');
        const sourceType = normalizeSourceType(food?.sourceType, urlInferredSourceType || inferredSourceType);
        const carbs = clampAndRound(food?.carbs, 0, 700);
        const fiber = clampAndRound(food?.fiber || 0, 0, 300);
        const explicitNetCarbs = toFiniteNumber(food?.netCarbs, NaN);
        const sanitizedFood = {
            name: cleanText(food?.name, index === 0 ? cleanText(query, 'Food item') : `Food item ${index + 1}`),
            matchedItem: cleanText(food?.matchedItem, cleanText(food?.name, cleanText(query, 'Food item'), 150), 150),
            restaurant: cleanText(food?.restaurant, deriveRestaurantFromSource(source), 100) || null,
            calories: clampAndRound(food?.calories, 0, 5000),
            protein: clampAndRound(food?.protein, 0, 500),
            carbs,
            fiber,
            netCarbs: clampAndRound(Number.isFinite(explicitNetCarbs) ? explicitNetCarbs : Math.max(0, carbs - fiber), 0, 700),
            fat: clampAndRound(food?.fat, 0, 300),
            sugar: clampAndRound(food?.sugar || 0, 0, 300),
            serving: cleanText(food?.serving, '1 serving', 100),
            quantity,
            confidence: normalizeConfidence(food?.confidence),
            needsVerification: normalizeConfidence(food?.confidence) === 'low'
                || sourceType === 'estimate'
                || sourceType === 'aggregator',
            source,
            sourceType,
            sourceUrl,
            evidence: cleanText(food?.evidence, '', 240) || null
        };

        if (typeof food?.nutritionBasis === 'string' && food.nutritionBasis.trim()) {
            sanitizedFood.nutritionBasis = cleanText(food.nutritionBasis, '', 60);
        }
        if (food?.labelExtracted === true) sanitizedFood.labelExtracted = true;
        if (food?.visibleLabel && typeof food.visibleLabel === 'object') sanitizedFood.visibleLabel = food.visibleLabel;

        return applyNutritionPlausibilityValidation(sanitizedFood);
    }).filter((food) => (
        food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fiber > 0 || food.fat > 0 || food.sugar > 0
    ));

    return foods;
}

function deriveOverallConfidence(foods, explicitConfidence) {
    if ((Array.isArray(foods) ? foods : []).some((food) => (
        Array.isArray(food?.nutritionWarnings) && food.nutritionWarnings.length > 0
    ))) {
        return 'low';
    }

    const explicit = normalizeConfidence(explicitConfidence);
    if (explicitConfidence) return explicit;

    if (!foods.length) return 'low';
    if (foods.every((food) => food.confidence === 'high')) return 'high';
    if (foods.some((food) => food.confidence === 'low')) return 'low';
    return 'medium';
}

function getDeepFoodMaxTokens() {
    const configured = Number(process.env.FOOD_AI_DEEP_MAX_TOKENS);
    if (Number.isFinite(configured) && configured >= 1500) {
        return Math.min(Math.round(configured), 8000);
    }
    return 2400;
}

async function callFoodParserAi({
    query,
    useWebSearch,
    strictMode = false,
    officialOnly = false,
    deepSearch = false,
    inputSource = 'search',
    memoryHints = [],
    locationContext = null
}) {
    const sanitizedMemoryHints = sanitizeFoodMemoryHints(memoryHints);
    const strictInstructions = strictMode
        ? `
Strict mode requirements:
- Enforce official-source evidence for restaurant/branded foods.
- For meal/combo/box/bundle inputs, split into separate items (entree, side, drink) when implied.
- Avoid single combined meal entries if components can be identified.
- Prefer sourceType "official" or "menu_pdf"; only use "aggregator" as last resort with low confidence.
- If user says "meal/combo/box/bundle", prefer an exact meal/combo menu match when official nutrition lists one.
- Do not downgrade a meal request to entree-only nutrition unless no meal nutrition entry exists.
- If user says "with a drink" but no specific drink type, use "Drink (unspecified)" with 0 calories and low confidence.
- Restaurant items should include a valid sourceUrl when available.`
        : '';
    const officialOnlyInstructions = officialOnly
        ? `
Official-only requirements:
- Use ONLY official restaurant/manufacturer domains or official menu PDFs for nutrition values.
- Do NOT use MyFitnessPal, MyNetDiary, FatSecret, CalorieKing, Lose It, Carb Manager, or other aggregators.
- If you cannot find an official source, return {"foods":[],"overallConfidence":"low","notes":"No official source found"}.
- Every returned food must include sourceType "official" or "menu_pdf" and a valid sourceUrl.`
        : '';
    const voiceInstructions = inputSource === 'voice'
        ? `
Voice input requirements:
- Treat speech-to-text as noisy. Consider likely brand, restaurant, and food-name corrections before estimating.
- If the user says exact calories, macros, serving size, package facts, or "net carbs", preserve those facts and use them before generic database values.
- If size materially changes calories, make the serving assumption explicit and return a clarifying question through confidence/serving text when needed.
- For branded or restaurant items, search official manufacturer/restaurant nutrition before using broad estimates.`
        : '';
    const thinkingInstructions = deepSearch
        ? `
Reasoning requirement:
- This is a high-accuracy nutrition lookup. Think carefully before responding, compare the query against serving size, quantity, brand, restaurant, and source reliability, then return only the JSON.`
        : '';
    const memoryInstructions = sanitizedMemoryHints.length
        ? `
Saved/product nutrition candidates:
${formatFoodMemoryHints(sanitizedMemoryHints)}

Hint requirements:
- Use a saved/product nutrition candidate only when it clearly matches the query, brand/product, and size/serving.
- Do not use a candidate if the query says a conflicting size, brand, restaurant, exact package label, or explicit macros.
- Explicit user-provided calories/macros, visible labels, and official restaurant/manufacturer sources override candidates.
- If a candidate clearly matches, preserve its per-unit macros and serving, and set source to the candidate source.`
        : '';
    const sanitizedLocation = sanitizeLocationContext(locationContext);
    const locationInstructions = sanitizedLocation
        ? `
Foreground location hint (coarse and user-authorized for this request only): ${sanitizedLocation.latitude}, ${sanitizedLocation.longitude}; accuracy about ${sanitizedLocation.accuracyMeters || 'unknown'} meters.
Location requirements:
- Use location only to narrow a restaurant candidate when the spoken food is restaurant-like.
- Do not assume a restaurant from coordinates alone. Confirm the nearby restaurant and exact menu item with an official source before using its nutrition.
- Ignore location for packaged, homemade, or generic foods.`
        : '';

    const prompt = `You are FuelFire's nutrition parsing engine.

Parse this user food log:
"${query}"

Return ONLY valid JSON with this shape:
{
  "foods": [
    {
      "name": "food name shown to user",
      "matchedItem": "exact menu/database item used for nutrition",
      "restaurant": "restaurant/brand name or null",
      "calories": 0,
	      "protein": 0,
	      "carbs": 0,
	      "fiber": 0,
	      "netCarbs": 0,
	      "fat": 0,
	      "sugar": 0,
      "serving": "serving description",
      "quantity": 1,
      "confidence": "high|medium|low",
      "source": "where nutrition came from",
      "sourceType": "official|menu_pdf|aggregator|estimate|database",
      "sourceUrl": "https://...",
      "evidence": "short evidence snippet or rationale"
    }
  ],
  "overallConfidence": "high|medium|low",
  "notes": "optional short note",
  "clarifyingQuestions": [
    {
      "id": "short_stable_id",
      "question": "one short question",
      "examples": ["short answer"],
      "reason": "why the answer changes nutrition",
      "affectedFood": "food name",
      "estimatedCalorieImpact": 0,
      "acceptsVoice": true
    }
  ]
}

Rules:
- Break the text into separate consumed items.
- If the user lists several foods in one sentence, return one food object for every listed food instead of combining the list into a single entry.
- If meal/combo/box/bundle is mentioned or implied, split into separate components: entree, side, and drink.
- Quantity is how many units were consumed.
- Calories/protein/carbs/fiber/netCarbs/fat/sugar must be PER ONE UNIT, not multiplied by quantity.
- Use carbs for total carbohydrates, fiber for dietary fiber, and netCarbs for carbs minus fiber. If a package advertises net carbs, preserve that explicit netCarbs value.
- Include drinks, sauces, toppings, and sides when implied.
- If query says drink but no specific drink type, return "Drink (unspecified)" with 0 calories and low confidence.
- For branded and restaurant foods, prioritize official nutrition values from the restaurant/manufacturer domains.
- Avoid user-generated nutrition trackers and aggregators unless no official data exists.
- Set sourceType using only: official, menu_pdf, aggregator, estimate, database.
- sourceUrl must be an http(s) URL when available; otherwise null.
- If uncertain, still return best estimate with confidence "low".
- Ask up to three clarifying questions only when the user can answer and the answer could materially change calories. Prefer missing count eaten, water versus oil, cooking fat, size, serving amount, or whole-container questions. Do not ask for information the user already supplied. Questions must be answerable by voice or a short button choice.
- Never return markdown or prose outside JSON.${strictInstructions}${officialOnlyInstructions}${voiceInstructions}${memoryInstructions}${locationInstructions}${thinkingInstructions}`;

    return callFoodAi({
        prompt,
        modality: 'text',
        maxTokens: deepSearch ? getDeepFoodMaxTokens() : 1200,
        temperature: 0,
        json: true,
        thinking: deepSearch,
        tags: [inputSource === 'voice' ? 'food-voice' : 'food-text', useWebSearch ? 'lookup-requested' : 'parse-only']
    });
}

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) {
        return;
    }
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['POST'])) {
        return;
    }

    if (!await requireAiAccess(req, res, { capability: 'ai_food' })) {
        return;
    }

    try {
        const body = req.body || {};
        const rawQuery = typeof body.query === 'string' ? body.query : '';
        const originalQuery = rawQuery.trim();
        const inputSource = normalizeInputSource(body.source);
        const voiceAlternatives = Array.isArray(body.alternatives)
            ? body.alternatives.map((value) => cleanText(value, '', 180)).filter(Boolean).slice(0, 5)
            : [];
        const normalizedVoiceQuery = inputSource === 'voice'
            ? selectVoiceQuery(originalQuery, voiceAlternatives)
            : originalQuery;
        const query = normalizedVoiceQuery;
        const queryMeta = buildQueryMeta(originalQuery, query);
        const forceWebSearch = Boolean(body.forceWebSearch);
        const foodMemoryHints = sanitizeFoodMemoryHints(body.foodMemoryHints);
        const locationContext = sanitizeLocationContext(body.locationContext);

        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Food description required' });
        }

        console.log(`🍔 Parsing food input (${inputSource}): "${query}"`);

        const userProvidedNutritionDetails = extractUserProvidedNutritionDetails(query);
        const userProvidedNutrition = userProvidedNutritionDetails ? extractUserProvidedNutrition(query) : null;
        const lookupQuery = userProvidedNutritionDetails?.lookupName || query;

        const explicitNutritionClauses = splitExplicitNutritionClauses(query);
        if (explicitNutritionClauses.length > 1) {
            const foods = explicitNutritionClauses.map(resolveUserProvidedNutritionClause).filter(Boolean);
            if (foods.length === explicitNutritionClauses.length) {
                const totals = calculateTotals(foods);
                return res.status(200).json({
                    success: true,
                    foods,
                    ...buildNutritionTotals(totals),
                    overallConfidence: deriveOverallConfidence(foods, 'high'),
                    source: 'user-provided-nutrition-multi',
                    clarifyingQuestions: [],
                    ...queryMeta
                });
            }
        }

        if (userProvidedNutritionDetails?.databaseHint) {
            const hintedFood = applyUserProvidedNutritionOverrides(
                buildFoodFromDatabase(lookupQuery, {
                    ...userProvidedNutritionDetails.databaseHint,
                    matchType: 'user-provided-database-hint'
                }),
                userProvidedNutritionDetails
            );
            const totals = calculateTotals([hintedFood]);
	            return res.status(200).json({
	                success: true,
	                foods: [hintedFood],
	                ...buildNutritionTotals(totals),
	                overallConfidence: deriveOverallConfidence([hintedFood], 'high'),
	                source: 'database+user-provided-nutrition',
                clarifyingQuestions: [],
                ...queryMeta
            });
        }

        if (userProvidedNutrition && !userProvidedNutritionDetails?.lookupName) {
            const totals = calculateTotals([userProvidedNutrition]);
	            return res.status(200).json({
	                success: true,
	                foods: [userProvidedNutrition],
	                ...buildNutritionTotals(totals),
	                overallConfidence: deriveOverallConfidence([userProvidedNutrition], 'high'),
	                source: 'user-provided-nutrition',
                clarifyingQuestions: [],
                ...queryMeta
            });
        }

        const verifiedPackagedResult = searchDatabase(lookupQuery);
        if (isVerifiedPackagedDbResult(verifiedPackagedResult)) {
            const dbFood = applyUserProvidedNutritionOverrides(
                buildFoodFromDatabase(lookupQuery, verifiedPackagedResult),
                userProvidedNutritionDetails
            );
            const totals = calculateTotals([dbFood]);
	            return res.status(200).json({
	                success: true,
	                foods: [dbFood],
	                ...buildNutritionTotals(totals),
	                overallConfidence: deriveOverallConfidence([dbFood], 'high'),
	                source: 'verified-package-database',
                clarifyingQuestions: buildClarifyingQuestions(query, [dbFood]),
                ...queryMeta
            });
        }

        // Exact known foods are authoritative. Resolve them before considering
        // personalized memory so a generic saved item cannot shadow a branded
        // restaurant product with known nutrition.
        if (!forceWebSearch && !locationContext && !queryHasUnspecifiedDrink(lookupQuery)) {
            const directDbResult = searchDatabaseDirect(lookupQuery);
            if (directDbResult) {
                const dbFood = applyUserProvidedNutritionOverrides(
                    buildFoodFromDatabase(lookupQuery, directDbResult),
                    userProvidedNutritionDetails
                );
                const totals = calculateTotals([dbFood]);
                const clarifyingQuestions = buildClarifyingQuestions(lookupQuery, [dbFood]);
	                return res.status(200).json({
	                    success: true,
	                    foods: [dbFood],
	                    ...buildNutritionTotals(totals),
	                    overallConfidence: clarifyingQuestions.length ? 'medium' : deriveOverallConfidence([dbFood]),
	                    source: 'database',
                    clarifyingQuestions,
                    ...queryMeta
                });
            }
        }

        // A complete set of user-supplied core facts (including calories
        // derived from protein/carbs/fat) needs no provider estimate. Keep
        // this after local lookup so missing optional fields can still come
        // from a known serving reference.
        if (userProvidedNutrition && hasCompleteUserProvidedNutrition(userProvidedNutritionDetails)) {
            const totals = calculateTotals([userProvidedNutrition]);
            return res.status(200).json({
                success: true,
                foods: [userProvidedNutrition],
                ...buildNutritionTotals(totals),
                overallConfidence: deriveOverallConfidence([userProvidedNutrition], 'high'),
                source: 'user-provided-nutrition',
                clarifyingQuestions: [],
                ...queryMeta
            });
        }

        if (!userProvidedNutritionDetails) {
            const memoryFood = buildFoodFromMemoryHint(lookupQuery, foodMemoryHints);
            if (memoryFood) {
                const totals = calculateTotals([memoryFood]);
                return res.status(200).json({
                    success: true,
                    foods: [memoryFood],
                    ...buildNutritionTotals(totals),
                    overallConfidence: deriveOverallConfidence([memoryFood], 'high'),
                    source: 'user-saved-memory',
                    clarifyingQuestions: buildClarifyingQuestions(lookupQuery, [memoryFood]),
                    ...queryMeta
                });
            }
        }

        const looksComposite = isLikelyCompositeQuery(lookupQuery);
        const isBranded = isBrandedProduct(lookupQuery);
        const restaurantLikeQuery = isRestaurantLikeQuery(lookupQuery);
        const requiresLiveSearch = forceWebSearch || isBranded || restaurantLikeQuery || Boolean(locationContext);

        if (!restaurantLikeQuery && (isBranded || forceWebSearch) && !looksComposite) {
            const openFoodFactsMatch = await lookupOpenFoodFacts(lookupQuery);
            if (openFoodFactsMatch) {
                const matchedFood = applyUserProvidedNutritionOverrides(
                    openFoodFactsMatch,
                    userProvidedNutritionDetails
                );
                const totals = calculateTotals([matchedFood]);
                return res.status(200).json({
                    success: true,
                    foods: [matchedFood],
                    ...buildNutritionTotals(totals),
                    overallConfidence: matchedFood.confidence,
                    source: 'open-food-facts',
                    clarifyingQuestions: buildClarifyingQuestions(lookupQuery, [matchedFood]),
                    ...queryMeta
                });
            }
        }

        if (!forceWebSearch && !locationContext && looksComposite) {
            const compositeFoods = applyUserProvidedNutritionOverridesToFoods(
                ensureComponentSeparation(matchCompositeDatabaseFoods(lookupQuery), lookupQuery),
                userProvidedNutritionDetails,
                lookupQuery
            );
            const hasCompleteCoverage = isBranded
                ? compositeFoods.length >= 2
                : hasCompleteCompositeDatabaseCoverage(lookupQuery);
            if (compositeFoods.length >= 1 && hasCompleteCoverage) {
                const totals = calculateTotals(compositeFoods);
                const clarifyingQuestions = buildClarifyingQuestions(lookupQuery, compositeFoods);
	                return res.status(200).json({
	                    success: true,
	                    foods: compositeFoods,
	                    ...buildNutritionTotals(totals),
	                    overallConfidence: clarifyingQuestions.length ? 'medium' : deriveOverallConfidence(compositeFoods),
	                    source: 'database-composite',
                    clarifyingQuestions,
                    ...queryMeta
                });
            }
        }

        // Fast path: known single items from local nutrition database
        if (!forceWebSearch && !locationContext && !looksComposite) {
            let dbResult = searchDatabase(lookupQuery);

            // Retry database lookup without leading quantity ("3 eggs" -> "eggs")
            const leadingQuantityMatch = normalizeQuery(lookupQuery).match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
            if (!dbResult && leadingQuantityMatch?.[2]) {
                const noQuantityQuery = leadingQuantityMatch[2];
                dbResult = searchDatabase(noQuantityQuery);
                if (!dbResult && noQuantityQuery.endsWith('s')) {
                    dbResult = searchDatabase(noQuantityQuery.slice(0, -1));
                }
            }

            if (dbResult) {
                const dbFood = applyUserProvidedNutritionOverrides(
                    buildFoodFromDatabase(lookupQuery, dbResult),
                    userProvidedNutritionDetails
                );
                const totals = calculateTotals([dbFood]);
                const clarifyingQuestions = buildClarifyingQuestions(lookupQuery, [dbFood]);
	                return res.status(200).json({
	                    success: true,
	                    foods: [dbFood],
	                    ...buildNutritionTotals(totals),
	                    overallConfidence: clarifyingQuestions.length ? 'medium' : deriveOverallConfidence([dbFood]),
	                    source: 'database',
                    clarifyingQuestions,
                    ...queryMeta
                });
            }
        }

        if (!isFoodAiConfigured('text')) {
            console.warn('FOOD_AI_API_KEY not configured - falling back to deterministic nutrition handling');

            if (userProvidedNutritionDetails) {
                const deterministicFoods = buildUserProvidedNutritionFallback(query, userProvidedNutritionDetails);
                const totals = calculateTotals(deterministicFoods);
                return res.status(200).json({
                    success: true,
                    foods: deterministicFoods,
                    ...buildNutritionTotals(totals),
                    overallConfidence: deriveOverallConfidence(deterministicFoods, 'high'),
                    source: 'user-provided-nutrition-fallback',
                    clarifyingQuestions: [],
                    message: 'Food AI provider not configured; preserved user-dictated nutrition values',
                    ...queryMeta
                });
            }

            if (requiresLiveSearch) {
                return res.status(503).json({
                    success: false,
                    error: 'Exact branded or restaurant nutrition lookup is temporarily unavailable.',
                    code: 'LIVE_NUTRITION_REQUIRED',
                    source: 'live-search-unavailable',
                    ...queryMeta
                });
            }

            let dbFallback = searchDatabase(lookupQuery);
            const leadingQuantityMatch = normalizeQuery(lookupQuery).match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
            if (!dbFallback && leadingQuantityMatch?.[2]) {
                const noQuantityQuery = leadingQuantityMatch[2];
                dbFallback = searchDatabase(noQuantityQuery) || (noQuantityQuery.endsWith('s')
                    ? searchDatabase(noQuantityQuery.slice(0, -1))
                    : null);
            }

            if (dbFallback) {
                const dbFood = applyUserProvidedNutritionOverrides(
                    buildFoodFromDatabase(lookupQuery, dbFallback),
                    userProvidedNutritionDetails
                );
                const totals = calculateTotals([dbFood]);
                const clarifyingQuestions = buildClarifyingQuestions(lookupQuery, [dbFood]);
	                return res.status(200).json({
	                    success: true,
	                    foods: [dbFood],
	                    ...buildNutritionTotals(totals),
	                    overallConfidence: clarifyingQuestions.length ? 'medium' : deriveOverallConfidence([dbFood]),
	                    source: 'database-fallback',
                    clarifyingQuestions,
                    message: 'Food AI provider not configured; served from local nutrition database',
                    ...queryMeta
                });
            }

            const estimated = applyUserProvidedNutritionOverrides(
                buildEstimatedFood(lookupQuery, 'estimated (no api key)'),
                userProvidedNutritionDetails
            );
            const totals = calculateTotals([estimated]);
	            return res.status(200).json({
	                success: true,
	                foods: [estimated],
	                ...buildNutritionTotals(totals),
	                overallConfidence: 'low',
	                source: 'estimate',
                message: 'Food AI provider not configured',
                ...queryMeta
            });
        }

        const voiceDeepSearch = inputSource === 'voice';
        const deepSearch = voiceDeepSearch || requiresLiveSearch;
        const requestOfficialEvidence = requiresLiveSearch || voiceDeepSearch;
        let responseSource = voiceDeepSearch ? 'voice-ai-qwen' : 'ai-qwen';
        const foodAiData = await callFoodParserAi({
            query: lookupQuery,
            useWebSearch: requestOfficialEvidence,
            strictMode: requiresLiveSearch,
            deepSearch,
            inputSource,
            memoryHints: foodMemoryHints,
            locationContext
        });

        const textContent = extractTextFromFoodAiResponse(foodAiData);
        let parsedPayload = parseFoodAiPayload(textContent);
        let foods = sanitizeFoods(parsedPayload.foods, lookupQuery);
        if (looksComposite && !isBranded && !locationContext) {
            const missingSegments = findMissingCompositeAiSegments(foods, lookupQuery);
            if (missingSegments.length) {
                try {
                    const retryData = await callFoodParserAi({
                        query: missingSegments.join(', '),
                        useWebSearch: false,
                        strictMode: false,
                        deepSearch: false,
                        inputSource,
                        memoryHints: foodMemoryHints,
                        locationContext: null
                    });
                    const retryPayload = parseFoodAiPayload(extractTextFromFoodAiResponse(retryData));
                    foods = [...foods, ...sanitizeFoods(retryPayload.foods, missingSegments.join(', '))];
                } catch (retryError) {
                    console.warn(`Missing composite food retry failed: ${retryError.message}`);
                }
            }
            foods = reconcileCompositeAiFoodsWithDatabase(foods, lookupQuery);
            parsedPayload.overallConfidence = null;
        }

        if (requiresLiveSearch && foods.length > 0 && (queryImpliesMealCombo(lookupQuery) || isBranded)) {
            try {
                const refinedFoods = await refineFoodsWithOfficialNutrition(foods, lookupQuery);
                if (refinedFoods !== foods) {
                    foods = refinedFoods;
                    parsedPayload.notes = 'Matched meal nutrition from an official nutrition page.';
                    responseSource = `${responseSource}+official-page`;
                }
            } catch (refineError) {
                console.warn(`Official nutrition refinement skipped: ${refineError.message}`);
            }
        }

        if (requiresLiveSearch && foods.length > 0 && !userProvidedNutritionDetails && !foods.some((food) => food?.officiallyVerified === true)) {
            return res.status(502).json({
                success: false,
                error: 'No verifiable official nutrition source was found. Add package label values, scan the barcode, or include a clearer brand and serving size.',
                code: 'OFFICIAL_NUTRITION_NOT_VERIFIED',
                source: 'official-evidence-required',
                ...queryMeta
            });
        }

        if (foods.length === 0) {
            if (requiresLiveSearch && !userProvidedNutritionDetails) {
                return res.status(502).json({
                    success: false,
                    error: 'No reliable official nutrition match was found. Add the brand, restaurant, serving size, or label values and try again.',
                    code: 'OFFICIAL_NUTRITION_NOT_FOUND',
                    source: 'live-search-no-match',
                    ...queryMeta
                });
            } else {
                const dbFallback = searchDatabase(lookupQuery);
                if (dbFallback) {
                    foods = [buildFoodFromDatabase(lookupQuery, dbFallback)];
                } else {
                    foods = [buildEstimatedFood(lookupQuery, 'estimated (ai parse fallback)')];
                }
            }
        }

        foods = applyUserProvidedNutritionOverridesToFoods(
            ensureComponentSeparation(foods, lookupQuery),
            userProvidedNutritionDetails,
            lookupQuery
        );

        const totals = calculateTotals(foods);
        const overallConfidence = deriveOverallConfidence(foods, parsedPayload.overallConfidence);
        const clarifyingQuestions = mergeClarifyingQuestions(
            buildClarifyingQuestions(lookupQuery, foods),
            sanitizeClarifyingQuestions(parsedPayload.clarifyingQuestions)
        );

	        res.status(200).json({
	            success: true,
	            foods,
	            ...buildNutritionTotals(totals),
	            overallConfidence,
	            notes: cleanText(parsedPayload.notes || '', '', 240) || null,
            source: userProvidedNutritionDetails
                ? `${responseSource}+user-provided-nutrition`
                : responseSource,
            clarifyingQuestions,
            ...queryMeta
        });

    } catch (error) {
        console.error('AI food parsing error:', error);

        const body = req.body || {};
        const rawQuery = typeof body.query === 'string' ? body.query : '';
        const originalQuery = rawQuery.trim() || 'Food item';
        const inputSource = normalizeInputSource(body.source);
        const voiceAlternatives = Array.isArray(body.alternatives)
            ? body.alternatives.map((value) => cleanText(value, '', 180)).filter(Boolean).slice(0, 5)
            : [];
        const normalizedQuery = inputSource === 'voice'
            ? selectVoiceQuery(originalQuery, voiceAlternatives)
            : originalQuery;
        const userProvidedNutritionDetails = extractUserProvidedNutritionDetails(normalizedQuery);
        const userProvidedNutrition = userProvidedNutritionDetails ? extractUserProvidedNutrition(normalizedQuery) : null;
        const fallbackQuery = userProvidedNutritionDetails?.lookupName || normalizedQuery;
        const requiresLiveSearch = Boolean(body.forceWebSearch)
            || isBrandedProduct(fallbackQuery)
            || isLikelyCompositeQuery(fallbackQuery)
            || isRestaurantLikeQuery(fallbackQuery);
        const errorMessage = String(error?.message || '');
        const statusMatch = errorMessage.match(/Food AI provider\s+(\d{3})/i);
        const providerStatus = Number(error?.providerStatus) || (statusMatch ? Number(statusMatch[1]) : null);
        const isProviderFailure = /Food AI provider \d{3}/i.test(errorMessage)
            || /rate_limit_error/i.test(errorMessage)
            || /credit balance is too low/i.test(errorMessage);

        if (requiresLiveSearch && isProviderFailure) {
            if (userProvidedNutrition) {
                const fallbackFoods = buildUserProvidedNutritionFallback(normalizedQuery, userProvidedNutritionDetails);
                const totals = calculateTotals(fallbackFoods);
                return res.status(200).json({
                    success: true,
                    foods: fallbackFoods,
                    ...buildNutritionTotals(totals),
                    overallConfidence: deriveOverallConfidence(fallbackFoods, 'high'),
                    source: 'user-provided-nutrition-provider-fallback',
                    error: error.message,
                    ...buildQueryMeta(originalQuery, normalizedQuery)
                });
            }

            let statusCode = 502;
            let userMessage = 'Live nutrition lookup is temporarily unavailable.';

            if (providerStatus === 429 || /rate_limit_error/i.test(errorMessage)) {
                statusCode = 429;
                userMessage = 'Live nutrition lookup is rate-limited right now. Please retry in about 30 seconds.';
            } else if (/credit balance is too low/i.test(errorMessage)) {
                statusCode = 503;
                userMessage = 'Live nutrition lookup is unavailable because the provider account is out of credits.';
            }

            return res.status(statusCode).json({
                success: false,
                error: userMessage,
                source: 'live-search-unavailable',
                providerStatus,
                ...buildQueryMeta(originalQuery, normalizedQuery)
            });
        }

        // Provider/refinement errors must not discard facts the user dictated.
        // Fill only the missing fields from a local reference or generic
        // estimate and retain the user values on the returned item(s).
        if (userProvidedNutritionDetails) {
            const fallbackFoods = buildUserProvidedNutritionFallback(normalizedQuery, userProvidedNutritionDetails);
            const totals = calculateTotals(fallbackFoods);
            return res.status(200).json({
                success: true,
                foods: fallbackFoods,
                ...buildNutritionTotals(totals),
                overallConfidence: deriveOverallConfidence(fallbackFoods, 'high'),
                source: 'user-provided-nutrition-error-fallback',
                error: error.message,
                ...buildQueryMeta(originalQuery, normalizedQuery)
            });
        }

        if (requiresLiveSearch) {
            return res.status(502).json({
                success: false,
                error: 'A reliable branded or restaurant nutrition match could not be verified. Add label values or try again.',
                code: 'OFFICIAL_NUTRITION_NOT_VERIFIED',
                source: 'live-search-unverified',
                ...buildQueryMeta(originalQuery, normalizedQuery)
            });
        }

        const fallback = applyUserProvidedNutritionOverrides(
            buildEstimatedFood(fallbackQuery, 'estimated (error)'),
            userProvidedNutritionDetails
        );
        const totals = calculateTotals([fallback]);

	        res.status(200).json({
	            success: true,
	            foods: [fallback],
	            ...buildNutritionTotals(totals),
	            overallConfidence: 'low',
	            source: 'estimate',
            error: error.message,
            ...buildQueryMeta(originalQuery, normalizedQuery)
        });
    }
}

export {
    assessNutritionPlausibility,
    applyNutritionPlausibilityValidation,
    extractQuantity,
    extractServingQuantityFromQuery
};
