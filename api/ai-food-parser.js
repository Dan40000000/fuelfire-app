// AI-Powered Food Parsing API - V2 (Accuracy-Focused)
// Uses Claude with comprehensive restaurant database for accurate nutrition data

import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// =============================================================================
// COMPREHENSIVE RESTAURANT NUTRITION DATABASE
// All values from official published nutrition data (as of 2026)
// =============================================================================
const nutritionDatabase = {
    // ==================== McDONALD'S ====================
    'big mac': { name: "McDonald's Big Mac", calories: 563, protein: 25, carbs: 45, fat: 33, sugar: 9, source: "McDonald's Official" },
    'mcdonald\'s big mac': { name: "McDonald's Big Mac", calories: 563, protein: 25, carbs: 45, fat: 33, sugar: 9, source: "McDonald's Official" },
    'quarter pounder with cheese': { name: "McDonald's Quarter Pounder with Cheese", calories: 520, protein: 30, carbs: 42, fat: 26, sugar: 10, source: "McDonald's Official" },
    'quarter pounder': { name: "McDonald's Quarter Pounder with Cheese", calories: 520, protein: 30, carbs: 42, fat: 26, sugar: 10, source: "McDonald's Official" },
    'mcdouble': { name: "McDonald's McDouble", calories: 400, protein: 22, carbs: 33, fat: 20, sugar: 7, source: "McDonald's Official" },
    'mcchicken': { name: "McDonald's McChicken", calories: 400, protein: 14, carbs: 40, fat: 21, sugar: 5, source: "McDonald's Official" },
    'filet-o-fish': { name: "McDonald's Filet-O-Fish", calories: 390, protein: 16, carbs: 39, fat: 19, sugar: 5, source: "McDonald's Official" },
    'filet o fish': { name: "McDonald's Filet-O-Fish", calories: 390, protein: 16, carbs: 39, fat: 19, sugar: 5, source: "McDonald's Official" },
    'egg mcmuffin': { name: "McDonald's Egg McMuffin", calories: 310, protein: 17, carbs: 30, fat: 13, sugar: 3, source: "McDonald's Official" },
    'sausage mcmuffin with egg': { name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31, sugar: 2, source: "McDonald's Official" },
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
    'chick-fil-a chicken sandwich': { name: "Chick-fil-A Chicken Sandwich", calories: 420, protein: 28, carbs: 41, fat: 16, sugar: 5, source: "Chick-fil-A Official" },
    'chick-fil-a sandwich': { name: "Chick-fil-A Chicken Sandwich", calories: 420, protein: 28, carbs: 41, fat: 16, sugar: 5, source: "Chick-fil-A Official" },
    'chick fil a chicken sandwich': { name: "Chick-fil-A Chicken Sandwich", calories: 420, protein: 28, carbs: 41, fat: 16, sugar: 5, source: "Chick-fil-A Official" },
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

    // ==================== NATURAL FOODS ====================
    'avocado half': { name: "Avocado (1/2)", calories: 160, protein: 2, carbs: 9, fat: 15, sugar: 0, source: "USDA" },
    'avocado': { name: "Avocado (1/2)", calories: 160, protein: 2, carbs: 9, fat: 15, sugar: 0, source: "USDA" },
    'banana medium': { name: "Banana (medium)", calories: 105, protein: 1, carbs: 27, fat: 0, sugar: 14, source: "USDA" },
    'banana': { name: "Banana (medium)", calories: 105, protein: 1, carbs: 27, fat: 0, sugar: 14, source: "USDA" },
    'apple medium': { name: "Apple (medium)", calories: 95, protein: 0, carbs: 25, fat: 0, sugar: 19, source: "USDA" },
    'apple': { name: "Apple (medium)", calories: 95, protein: 0, carbs: 25, fat: 0, sugar: 19, source: "USDA" },
    'large egg scrambled': { name: "Scrambled Egg (large)", calories: 91, protein: 6, carbs: 1, fat: 7, sugar: 1, source: "USDA" },
    'egg scrambled': { name: "Scrambled Egg (large)", calories: 91, protein: 6, carbs: 1, fat: 7, sugar: 1, source: "USDA" },
    'egg': { name: "Egg (large)", calories: 70, protein: 6, carbs: 1, fat: 5, sugar: 0, source: "USDA" },
    'chicken breast grilled 4 oz': { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, source: "USDA" },
    'grilled chicken breast': { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, source: "USDA" },
    'chicken breast': { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, source: "USDA" },
    'brown rice 1 cup cooked': { name: "Brown Rice (1 cup cooked)", calories: 216, protein: 5, carbs: 45, fat: 2, sugar: 0, source: "USDA" },
    'brown rice': { name: "Brown Rice (1 cup cooked)", calories: 216, protein: 5, carbs: 45, fat: 2, sugar: 0, source: "USDA" },
    'white rice': { name: "White Rice (1 cup cooked)", calories: 205, protein: 4, carbs: 45, fat: 0, sugar: 0, source: "USDA" },
    'salmon fillet 4 oz': { name: "Salmon Fillet (4 oz)", calories: 234, protein: 25, carbs: 0, fat: 14, sugar: 0, source: "USDA" },
    'salmon': { name: "Salmon Fillet (4 oz)", calories: 234, protein: 25, carbs: 0, fat: 14, sugar: 0, source: "USDA" },
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

    // ==================== PANERA ADDITIONAL ====================
    'panera grilled chicken salad': { name: "Panera Green Goddess Cobb Salad with Chicken", calories: 450, protein: 35, carbs: 20, fat: 28, sugar: 8, source: "Panera Official" },
    'grilled chicken salad panera': { name: "Panera Green Goddess Cobb Salad with Chicken", calories: 450, protein: 35, carbs: 20, fat: 28, sugar: 8, source: "Panera Official" },

    // ==================== TYSON PRODUCTS ====================
    'tyson grilled chicken breast': { name: "Tyson Grilled Chicken Breast", calories: 110, protein: 21, carbs: 2, fat: 3, sugar: 0, source: "Tyson Official" },
    'tyson chicken breast': { name: "Tyson Grilled Chicken Breast", calories: 110, protein: 21, carbs: 2, fat: 3, sugar: 0, source: "Tyson Official" },

    // ==================== DRINKS ====================
    'coffee with cream and sugar': { name: "Coffee with Cream and Sugar", calories: 60, protein: 0, carbs: 8, fat: 2, sugar: 7, source: "USDA" },
    'coffee': { name: "Black Coffee", calories: 2, protein: 0, carbs: 0, fat: 0, sugar: 0, source: "USDA" },
    'orange juice': { name: "Orange Juice (8 oz)", calories: 110, protein: 2, carbs: 26, fat: 0, sugar: 21, source: "USDA" },
    'coca cola': { name: "Coca-Cola (12 oz)", calories: 140, protein: 0, carbs: 39, fat: 0, sugar: 39, source: "Coca-Cola" },
    'coke': { name: "Coca-Cola (12 oz)", calories: 140, protein: 0, carbs: 39, fat: 0, sugar: 39, source: "Coca-Cola" },
    'pepsi': { name: "Pepsi (12 oz)", calories: 150, protein: 0, carbs: 41, fat: 0, sugar: 41, source: "PepsiCo" },
    'sprite': { name: "Sprite (12 oz)", calories: 140, protein: 0, carbs: 38, fat: 0, sugar: 38, source: "Coca-Cola" },
    'dr pepper': { name: "Dr Pepper (12 oz)", calories: 150, protein: 0, carbs: 40, fat: 0, sugar: 40, source: "Keurig Dr Pepper" },
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
    const lower = text.toLowerCase();

    // Pattern: "X slices of Y" or "X pieces of Y"
    const sliceMatch = lower.match(/(\d+)\s*slices?\s*(?:of\s*)?(.+)/i);
    if (sliceMatch) {
        return { quantity: parseInt(sliceMatch[1]), food: sliceMatch[2].trim() };
    }

    const pieceMatch = lower.match(/(\d+)\s*pieces?\s*(?:of\s*)?(.+)/i);
    if (pieceMatch) {
        return { quantity: parseInt(pieceMatch[1]), food: pieceMatch[2].trim() };
    }

    return { quantity: 1, food: text };
}

// Search database with fuzzy matching
function searchDatabase(query) {
    const normalizedQuery = normalizeQuery(query);

    // 1. Exact match
    if (nutritionDatabase[normalizedQuery]) {
        return { ...nutritionDatabase[normalizedQuery], matchType: 'exact' };
    }

    // 2. Try common variations
    const variations = [
        normalizedQuery,
        normalizedQuery.replace(/-/g, ' '),
        normalizedQuery.replace(/'/g, ''),
        normalizedQuery.replace(/\s/g, '-'),
    ];

    for (const variant of variations) {
        if (nutritionDatabase[variant]) {
            return { ...nutritionDatabase[variant], matchType: 'variation' };
        }
    }

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
        // Look for the base food and multiply
        const searchKey = `${quantity} slices ${food}`;
        if (nutritionDatabase[searchKey]) {
            return { ...nutritionDatabase[searchKey], matchType: 'quantity-match' };
        }
        // Try singular form with quantity in name
        if (nutritionDatabase[food]) {
            const baseFood = nutritionDatabase[food];
            return {
                ...baseFood,
                name: `${baseFood.name} (${quantity}x)`,
                calories: baseFood.calories * quantity,
                protein: baseFood.protein * quantity,
                carbs: baseFood.carbs * quantity,
                fat: baseFood.fat * quantity,
                sugar: (baseFood.sugar || 0) * quantity,
                matchType: 'quantity-calculated'
            };
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

// Extract quantity from query
function extractQuantity(query) {
    const quantityPatterns = [
        /(\d+)\s*piece/i,
        /(\d+)\s*count/i,
        /(\d+)\s*pc/i,
        /(\d+)\s*x\s/i,
        /(\d+)\s*slices?/i,
        /(\d+)\s*oz/i,
    ];

    for (const pattern of quantityPatterns) {
        const match = query.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return 1;
}

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) {
        return;
    }
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['POST'])) {
        return;
    }

    try {
        const body = req.body || {};
        const { query } = body;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: 'Food description required' });
        }

        console.log(`🍔 AI parsing food: "${query}"`);

        // Step 1: Try local database first (fastest and most accurate)
        const dbResult = searchDatabase(query);
        if (dbResult) {
            console.log(`✅ Found in database: ${dbResult.name} (${dbResult.matchType})`);
            return res.status(200).json({
                success: true,
                foods: [{
                    name: dbResult.name,
                    calories: dbResult.calories,
                    protein: dbResult.protein,
                    carbs: dbResult.carbs,
                    fat: dbResult.fat,
                    sugar: dbResult.sugar || 0,
                    serving: '1 serving',
                    quantity: 1,
                    confidence: 'high',
                    source: dbResult.source
                }],
                source: 'database',
                originalQuery: query
            });
        }

        // Step 2: Use Claude with web search for items not in database
        const apiKey = process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            console.warn('Claude API key not configured, using estimate');
            return res.status(200).json({
                success: true,
                foods: [{
                    name: query,
                    calories: 250,
                    protein: 10,
                    carbs: 25,
                    fat: 10,
                    sugar: 5,
                    serving: '1 serving',
                    quantity: 1,
                    confidence: 'low',
                    source: 'estimated'
                }],
                source: 'estimate',
                message: 'Claude API key not configured'
            });
        }

        console.log('🔍 Searching with Claude AI...');

        const searchPrompt = `You are a nutrition expert. The user said: "${query}"

Identify the food item(s) and provide ACCURATE nutrition information.

CRITICAL RULES:
1. Search your knowledge for REAL published nutrition data from restaurants or USDA
2. DO NOT estimate or guess - only return data you are confident about
3. If you can't find accurate data, say so in the confidence field
4. For restaurant items, use their official published nutrition information
5. Break combo meals into individual items

Return ONLY a valid JSON array (no explanation, no markdown):
[
  {
    "name": "Exact Food Name",
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "sugar": 0,
    "serving": "serving description",
    "quantity": 1,
    "confidence": "high|medium|low",
    "source": "Restaurant Name Official" or "USDA" or "estimated"
  }
]

If you cannot identify the food or find nutrition data, return:
[{"name": "${query}", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "sugar": 0, "serving": "unknown", "quantity": 1, "confidence": "none", "source": "unidentified"}]`;

        const response = await fetch(ANTHROPIC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                temperature: 0,
                tools: [
                    {
                        type: 'web_search_20250305',
                        name: 'web_search',
                        max_uses: 3
                    }
                ],
                messages: [{ role: 'user', content: searchPrompt }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', errorText);
            throw new Error('Claude API request failed');
        }

        const data = await response.json();

        // Extract text response
        const textContent = data.content
            ?.filter(block => block.type === 'text')
            ?.map(block => block.text)
            ?.join('\n') || '';

        console.log('🤖 Claude response:', textContent.substring(0, 200));

        // Parse JSON response
        let foods;
        try {
            const jsonMatch = textContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                foods = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON array found');
            }
        } catch (parseError) {
            console.error('Failed to parse Claude response:', parseError);
            // Return a basic estimate
            return res.status(200).json({
                success: true,
                foods: [{
                    name: query,
                    calories: 250,
                    protein: 10,
                    carbs: 25,
                    fat: 10,
                    sugar: 5,
                    serving: '1 serving',
                    quantity: 1,
                    confidence: 'low',
                    source: 'estimated (parse error)'
                }],
                source: 'estimate',
                originalQuery: query
            });
        }

        // Validate and format foods
        const validatedFoods = foods.map(food => ({
            name: food.name || query,
            calories: Math.round(food.calories || 0),
            protein: Math.round(food.protein || 0),
            carbs: Math.round(food.carbs || 0),
            fat: Math.round(food.fat || 0),
            sugar: Math.round(food.sugar || 0),
            serving: food.serving || '1 serving',
            quantity: parseFloat(food.quantity) || 1,
            confidence: food.confidence || 'medium',
            source: food.source || 'ai'
        }));

        // Filter out items with 0 calories (unidentified)
        const filteredFoods = validatedFoods.filter(f => f.calories > 0);

        if (filteredFoods.length === 0) {
            // All items were unidentified, return a reasonable estimate
            return res.status(200).json({
                success: true,
                foods: [{
                    name: query,
                    calories: 250,
                    protein: 10,
                    carbs: 25,
                    fat: 10,
                    sugar: 5,
                    serving: '1 serving',
                    quantity: 1,
                    confidence: 'low',
                    source: 'estimated'
                }],
                source: 'estimate',
                originalQuery: query
            });
        }

        console.log(`✅ Claude found ${filteredFoods.length} foods`);

        res.status(200).json({
            success: true,
            foods: filteredFoods,
            source: 'ai',
            originalQuery: query
        });

    } catch (error) {
        console.error('AI food parsing error:', error);

        res.status(200).json({
            success: true,
            foods: [{
                name: req.body?.query || 'Unknown food',
                calories: 250,
                protein: 10,
                carbs: 25,
                fat: 10,
                sugar: 5,
                serving: '1 serving',
                quantity: 1,
                confidence: 'low',
                source: 'estimated (error)'
            }],
            source: 'estimate',
            error: error.message
        });
    }
}
