// Comprehensive Nutrition Test Database
// All values are from official restaurant nutrition data or USDA database
// Last updated: February 2026

export const testFoods = [
    // ==================== McDONALD'S ====================
    { query: "Big Mac", expected: { name: "Big Mac", calories: 563, protein: 25, carbs: 45, fat: 33 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "McDonald's Big Mac", expected: { name: "Big Mac", calories: 563, protein: 25, carbs: 45, fat: 33 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "Quarter Pounder with Cheese", expected: { name: "Quarter Pounder with Cheese", calories: 520, protein: 30, carbs: 42, fat: 26 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "McDouble", expected: { name: "McDouble", calories: 400, protein: 22, carbs: 33, fat: 20 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "10 piece McNuggets", expected: { name: "Chicken McNuggets (10 piece)", calories: 410, protein: 25, carbs: 26, fat: 24 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "McDonald's medium fries", expected: { name: "French Fries (Medium)", calories: 320, protein: 5, carbs: 43, fat: 15 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "McDonald's large fries", expected: { name: "French Fries (Large)", calories: 480, protein: 7, carbs: 65, fat: 23 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "Egg McMuffin", expected: { name: "Egg McMuffin", calories: 310, protein: 17, carbs: 30, fat: 13 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "Sausage McMuffin with Egg", expected: { name: "Sausage McMuffin with Egg", calories: 480, protein: 21, carbs: 29, fat: 31 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "McChicken", expected: { name: "McChicken", calories: 400, protein: 14, carbs: 40, fat: 21 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "Filet-O-Fish", expected: { name: "Filet-O-Fish", calories: 390, protein: 16, carbs: 39, fat: 19 }, tolerance: 0.15, source: "McDonald's Official" },
    { query: "McFlurry with Oreo", expected: { name: "McFlurry with Oreo", calories: 510, protein: 13, carbs: 80, fat: 17 }, tolerance: 0.20, source: "McDonald's Official" },

    // ==================== CHICK-FIL-A ====================
    { query: "Chick-fil-A chicken sandwich", expected: { name: "Chick-fil-A Chicken Sandwich", calories: 420, protein: 28, carbs: 41, fat: 16 }, tolerance: 0.15, source: "Chick-fil-A Official" },
    { query: "Chick-fil-A spicy chicken sandwich", expected: { name: "Spicy Chicken Sandwich", calories: 450, protein: 28, carbs: 43, fat: 19 }, tolerance: 0.15, source: "Chick-fil-A Official" },
    { query: "Chick-fil-A 8 piece nuggets", expected: { name: "Chicken Nuggets (8 count)", calories: 250, protein: 27, carbs: 11, fat: 11 }, tolerance: 0.15, source: "Chick-fil-A Official" },
    { query: "Chick-fil-A 12 count nuggets", expected: { name: "Chicken Nuggets (12 count)", calories: 380, protein: 40, carbs: 17, fat: 17 }, tolerance: 0.15, source: "Chick-fil-A Official" },
    { query: "Chick-fil-A waffle fries medium", expected: { name: "Waffle Potato Fries (Medium)", calories: 420, protein: 5, carbs: 45, fat: 24 }, tolerance: 0.15, source: "Chick-fil-A Official" },
    { query: "Chick-fil-A Cobb Salad", expected: { name: "Cobb Salad", calories: 510, protein: 40, carbs: 27, fat: 27 }, tolerance: 0.20, source: "Chick-fil-A Official" },
    { query: "Chick-fil-A grilled nuggets 8 piece", expected: { name: "Grilled Nuggets (8 count)", calories: 130, protein: 25, carbs: 2, fat: 3 }, tolerance: 0.15, source: "Chick-fil-A Official" },
    { query: "Chick-fil-A chicken biscuit", expected: { name: "Chick-fil-A Chicken Biscuit", calories: 440, protein: 16, carbs: 49, fat: 20 }, tolerance: 0.15, source: "Chick-fil-A Official" },

    // ==================== TACO BELL ====================
    { query: "Crunchy Taco", expected: { name: "Crunchy Taco", calories: 170, protein: 8, carbs: 13, fat: 10 }, tolerance: 0.15, source: "Taco Bell Official" },
    { query: "Taco Bell Crunchy Taco Supreme", expected: { name: "Crunchy Taco Supreme", calories: 200, protein: 8, carbs: 15, fat: 12 }, tolerance: 0.15, source: "Taco Bell Official" },
    { query: "Taco Bell Beef Burrito", expected: { name: "Bean Burrito", calories: 380, protein: 14, carbs: 55, fat: 10 }, tolerance: 0.20, source: "Taco Bell Official" },
    { query: "Crunchwrap Supreme", expected: { name: "Crunchwrap Supreme", calories: 540, protein: 16, carbs: 71, fat: 21 }, tolerance: 0.15, source: "Taco Bell Official" },
    { query: "Quesadilla chicken", expected: { name: "Chicken Quesadilla", calories: 500, protein: 27, carbs: 38, fat: 26 }, tolerance: 0.15, source: "Taco Bell Official" },
    { query: "Taco Bell Nachos BellGrande", expected: { name: "Nachos BellGrande", calories: 740, protein: 16, carbs: 82, fat: 38 }, tolerance: 0.15, source: "Taco Bell Official" },
    { query: "Mexican Pizza", expected: { name: "Mexican Pizza", calories: 540, protein: 19, carbs: 47, fat: 30 }, tolerance: 0.15, source: "Taco Bell Official" },
    { query: "Cheesy Gordita Crunch", expected: { name: "Cheesy Gordita Crunch", calories: 500, protein: 20, carbs: 41, fat: 28 }, tolerance: 0.15, source: "Taco Bell Official" },

    // ==================== WENDY'S ====================
    { query: "Wendy's Dave's Single", expected: { name: "Dave's Single", calories: 590, protein: 30, carbs: 41, fat: 34 }, tolerance: 0.15, source: "Wendy's Official" },
    { query: "Wendy's Dave's Double", expected: { name: "Dave's Double", calories: 850, protein: 48, carbs: 42, fat: 55 }, tolerance: 0.15, source: "Wendy's Official" },
    { query: "Wendy's Baconator", expected: { name: "Baconator", calories: 950, protein: 57, carbs: 38, fat: 65 }, tolerance: 0.15, source: "Wendy's Official" },
    { query: "Wendy's 4 piece nuggets", expected: { name: "Chicken Nuggets (4 piece)", calories: 170, protein: 8, carbs: 10, fat: 11 }, tolerance: 0.15, source: "Wendy's Official" },
    { query: "Wendy's 10 piece nuggets", expected: { name: "Chicken Nuggets (10 piece)", calories: 430, protein: 20, carbs: 25, fat: 28 }, tolerance: 0.15, source: "Wendy's Official" },
    { query: "Wendy's medium fries", expected: { name: "French Fries (Medium)", calories: 420, protein: 5, carbs: 56, fat: 20 }, tolerance: 0.15, source: "Wendy's Official" },
    { query: "Wendy's Frosty medium chocolate", expected: { name: "Chocolate Frosty (Medium)", calories: 470, protein: 10, carbs: 75, fat: 14 }, tolerance: 0.15, source: "Wendy's Official" },
    { query: "Wendy's spicy chicken sandwich", expected: { name: "Spicy Chicken Sandwich", calories: 500, protein: 29, carbs: 46, fat: 22 }, tolerance: 0.15, source: "Wendy's Official" },

    // ==================== BURGER KING ====================
    { query: "Whopper", expected: { name: "Whopper", calories: 660, protein: 28, carbs: 49, fat: 40 }, tolerance: 0.15, source: "Burger King Official" },
    { query: "Whopper with cheese", expected: { name: "Whopper with Cheese", calories: 740, protein: 33, carbs: 50, fat: 46 }, tolerance: 0.15, source: "Burger King Official" },
    { query: "Double Whopper", expected: { name: "Double Whopper", calories: 900, protein: 48, carbs: 49, fat: 56 }, tolerance: 0.15, source: "Burger King Official" },
    { query: "Burger King chicken nuggets 8 piece", expected: { name: "Chicken Nuggets (8 piece)", calories: 380, protein: 16, carbs: 22, fat: 24 }, tolerance: 0.15, source: "Burger King Official" },
    { query: "Burger King medium fries", expected: { name: "French Fries (Medium)", calories: 380, protein: 4, carbs: 53, fat: 17 }, tolerance: 0.15, source: "Burger King Official" },
    { query: "Original Chicken Sandwich", expected: { name: "Original Chicken Sandwich", calories: 660, protein: 28, carbs: 48, fat: 40 }, tolerance: 0.15, source: "Burger King Official" },
    { query: "Burger King Impossible Whopper", expected: { name: "Impossible Whopper", calories: 630, protein: 25, carbs: 58, fat: 34 }, tolerance: 0.15, source: "Burger King Official" },

    // ==================== SUBWAY ====================
    { query: "Subway 6 inch turkey sub", expected: { name: "Turkey Breast 6-inch Sub", calories: 280, protein: 18, carbs: 46, fat: 3 }, tolerance: 0.20, source: "Subway Official" },
    { query: "Subway footlong Italian BMT", expected: { name: "Italian B.M.T. Footlong", calories: 820, protein: 38, carbs: 90, fat: 32 }, tolerance: 0.20, source: "Subway Official" },
    { query: "Subway 6 inch meatball marinara", expected: { name: "Meatball Marinara 6-inch", calories: 480, protein: 22, carbs: 57, fat: 18 }, tolerance: 0.20, source: "Subway Official" },
    { query: "Subway 6 inch tuna", expected: { name: "Tuna 6-inch Sub", calories: 480, protein: 20, carbs: 44, fat: 25 }, tolerance: 0.20, source: "Subway Official" },
    { query: "Subway chicken bacon ranch", expected: { name: "Chicken Bacon Ranch 6-inch", calories: 610, protein: 36, carbs: 47, fat: 32 }, tolerance: 0.20, source: "Subway Official" },

    // ==================== CHIPOTLE ====================
    { query: "Chipotle chicken burrito", expected: { name: "Chicken Burrito", calories: 1055, protein: 60, carbs: 106, fat: 38 }, tolerance: 0.20, source: "Chipotle Official" },
    { query: "Chipotle chicken bowl", expected: { name: "Chicken Bowl", calories: 740, protein: 50, carbs: 56, fat: 30 }, tolerance: 0.20, source: "Chipotle Official" },
    { query: "Chipotle steak burrito", expected: { name: "Steak Burrito", calories: 1045, protein: 59, carbs: 106, fat: 37 }, tolerance: 0.20, source: "Chipotle Official" },
    { query: "Chipotle carnitas bowl", expected: { name: "Carnitas Bowl", calories: 750, protein: 40, carbs: 56, fat: 35 }, tolerance: 0.20, source: "Chipotle Official" },
    { query: "Chipotle chips and guacamole", expected: { name: "Chips and Guacamole", calories: 770, protein: 9, carbs: 72, fat: 50 }, tolerance: 0.20, source: "Chipotle Official" },
    { query: "Chipotle chicken tacos 3", expected: { name: "Chicken Tacos (3)", calories: 610, protein: 42, carbs: 41, fat: 24 }, tolerance: 0.20, source: "Chipotle Official" },

    // ==================== OLIVE GARDEN ====================
    { query: "Olive Garden breadstick", expected: { name: "Breadstick", calories: 140, protein: 4, carbs: 23, fat: 3 }, tolerance: 0.15, source: "Olive Garden Official" },
    { query: "Olive Garden 3 breadsticks", expected: { name: "Breadsticks (3)", calories: 420, protein: 12, carbs: 69, fat: 9 }, tolerance: 0.15, source: "Olive Garden Official" },
    { query: "Olive Garden Fettuccine Alfredo", expected: { name: "Fettuccine Alfredo", calories: 1220, protein: 47, carbs: 102, fat: 72 }, tolerance: 0.15, source: "Olive Garden Official" },
    { query: "Olive Garden Tour of Italy", expected: { name: "Tour of Italy", calories: 1520, protein: 82, carbs: 118, fat: 74 }, tolerance: 0.15, source: "Olive Garden Official" },
    { query: "Olive Garden chicken parmigiana", expected: { name: "Chicken Parmigiana", calories: 1060, protein: 69, carbs: 88, fat: 46 }, tolerance: 0.15, source: "Olive Garden Official" },
    { query: "Olive Garden lasagna classico", expected: { name: "Lasagna Classico", calories: 580, protein: 31, carbs: 47, fat: 29 }, tolerance: 0.15, source: "Olive Garden Official" },
    { query: "Olive Garden house salad", expected: { name: "House Salad", calories: 150, protein: 2, carbs: 11, fat: 11 }, tolerance: 0.20, source: "Olive Garden Official" },

    // ==================== PANERA BREAD ====================
    { query: "Panera broccoli cheddar soup bowl", expected: { name: "Broccoli Cheddar Soup (Bowl)", calories: 360, protein: 14, carbs: 30, fat: 21 }, tolerance: 0.20, source: "Panera Official" },
    { query: "Panera mac and cheese", expected: { name: "Mac & Cheese", calories: 980, protein: 35, carbs: 82, fat: 57 }, tolerance: 0.20, source: "Panera Official" },
    { query: "Panera Bacon Turkey Bravo", expected: { name: "Bacon Turkey Bravo", calories: 710, protein: 45, carbs: 67, fat: 28 }, tolerance: 0.20, source: "Panera Official" },
    { query: "Panera Caesar salad with chicken", expected: { name: "Caesar Salad with Chicken", calories: 470, protein: 35, carbs: 16, fat: 31 }, tolerance: 0.20, source: "Panera Official" },
    { query: "Panera Greek salad", expected: { name: "Greek Salad", calories: 400, protein: 9, carbs: 17, fat: 33 }, tolerance: 0.20, source: "Panera Official" },

    // ==================== STARBUCKS ====================
    { query: "Starbucks Grande Caramel Frappuccino", expected: { name: "Caramel Frappuccino Grande", calories: 380, protein: 5, carbs: 54, fat: 16 }, tolerance: 0.15, source: "Starbucks Official" },
    { query: "Starbucks Venti Mocha Frappuccino", expected: { name: "Mocha Frappuccino Venti", calories: 470, protein: 6, carbs: 75, fat: 16 }, tolerance: 0.15, source: "Starbucks Official" },
    { query: "Starbucks Grande Pumpkin Spice Latte", expected: { name: "Pumpkin Spice Latte Grande", calories: 380, protein: 14, carbs: 52, fat: 14 }, tolerance: 0.15, source: "Starbucks Official" },
    { query: "Starbucks bacon egg cheese sandwich", expected: { name: "Bacon, Gouda & Egg Sandwich", calories: 360, protein: 18, carbs: 34, fat: 17 }, tolerance: 0.20, source: "Starbucks Official" },
    { query: "Starbucks chocolate croissant", expected: { name: "Chocolate Croissant", calories: 340, protein: 6, carbs: 39, fat: 18 }, tolerance: 0.15, source: "Starbucks Official" },
    { query: "Starbucks cake pop", expected: { name: "Cake Pop", calories: 160, protein: 2, carbs: 22, fat: 8 }, tolerance: 0.15, source: "Starbucks Official" },

    // ==================== DUNKIN ====================
    { query: "Dunkin medium iced coffee", expected: { name: "Medium Iced Coffee", calories: 10, protein: 0, carbs: 2, fat: 0 }, tolerance: 0.30, source: "Dunkin Official" },
    { query: "Dunkin glazed donut", expected: { name: "Glazed Donut", calories: 260, protein: 3, carbs: 31, fat: 14 }, tolerance: 0.15, source: "Dunkin Official" },
    { query: "Dunkin Boston Kreme donut", expected: { name: "Boston Kreme Donut", calories: 300, protein: 4, carbs: 38, fat: 15 }, tolerance: 0.15, source: "Dunkin Official" },
    { query: "Dunkin bacon egg cheese croissant", expected: { name: "Bacon Egg Cheese Croissant", calories: 530, protein: 19, carbs: 37, fat: 33 }, tolerance: 0.15, source: "Dunkin Official" },
    { query: "Dunkin sausage egg cheese wake up wrap", expected: { name: "Sausage Egg Cheese Wake-Up Wrap", calories: 330, protein: 14, carbs: 15, fat: 24 }, tolerance: 0.15, source: "Dunkin Official" },

    // ==================== POPEYES ====================
    { query: "Popeyes chicken sandwich", expected: { name: "Chicken Sandwich", calories: 700, protein: 28, carbs: 50, fat: 42 }, tolerance: 0.15, source: "Popeyes Official" },
    { query: "Popeyes spicy chicken sandwich", expected: { name: "Spicy Chicken Sandwich", calories: 700, protein: 28, carbs: 50, fat: 42 }, tolerance: 0.15, source: "Popeyes Official" },
    { query: "Popeyes 3 piece chicken tenders", expected: { name: "Chicken Tenders (3 piece)", calories: 340, protein: 26, carbs: 19, fat: 18 }, tolerance: 0.15, source: "Popeyes Official" },
    { query: "Popeyes regular cajun fries", expected: { name: "Cajun Fries (Regular)", calories: 260, protein: 4, carbs: 35, fat: 13 }, tolerance: 0.15, source: "Popeyes Official" },
    { query: "Popeyes red beans and rice", expected: { name: "Red Beans and Rice", calories: 230, protein: 8, carbs: 23, fat: 11 }, tolerance: 0.15, source: "Popeyes Official" },

    // ==================== KFC ====================
    { query: "KFC Original Recipe chicken breast", expected: { name: "Original Recipe Chicken Breast", calories: 390, protein: 39, carbs: 11, fat: 21 }, tolerance: 0.15, source: "KFC Official" },
    { query: "KFC Original Recipe thigh", expected: { name: "Original Recipe Thigh", calories: 280, protein: 19, carbs: 10, fat: 19 }, tolerance: 0.15, source: "KFC Official" },
    { query: "KFC Extra Crispy breast", expected: { name: "Extra Crispy Breast", calories: 530, protein: 39, carbs: 19, fat: 35 }, tolerance: 0.15, source: "KFC Official" },
    { query: "KFC mashed potatoes with gravy", expected: { name: "Mashed Potatoes with Gravy", calories: 130, protein: 2, carbs: 18, fat: 5 }, tolerance: 0.15, source: "KFC Official" },
    { query: "KFC coleslaw", expected: { name: "Coleslaw", calories: 170, protein: 1, carbs: 14, fat: 12 }, tolerance: 0.15, source: "KFC Official" },
    { query: "KFC Famous Bowl", expected: { name: "Famous Bowl", calories: 720, protein: 26, carbs: 76, fat: 34 }, tolerance: 0.15, source: "KFC Official" },

    // ==================== PANDA EXPRESS ====================
    { query: "Panda Express Orange Chicken", expected: { name: "Orange Chicken", calories: 490, protein: 25, carbs: 51, fat: 21 }, tolerance: 0.15, source: "Panda Express Official" },
    { query: "Panda Express Beijing Beef", expected: { name: "Beijing Beef", calories: 470, protein: 13, carbs: 56, fat: 22 }, tolerance: 0.15, source: "Panda Express Official" },
    { query: "Panda Express Kung Pao Chicken", expected: { name: "Kung Pao Chicken", calories: 290, protein: 16, carbs: 14, fat: 19 }, tolerance: 0.15, source: "Panda Express Official" },
    { query: "Panda Express fried rice", expected: { name: "Fried Rice", calories: 520, protein: 11, carbs: 82, fat: 16 }, tolerance: 0.15, source: "Panda Express Official" },
    { query: "Panda Express chow mein", expected: { name: "Chow Mein", calories: 510, protein: 13, carbs: 80, fat: 16 }, tolerance: 0.15, source: "Panda Express Official" },
    { query: "Panda Express Broccoli Beef", expected: { name: "Broccoli Beef", calories: 150, protein: 9, carbs: 13, fat: 7 }, tolerance: 0.15, source: "Panda Express Official" },

    // ==================== FIVE GUYS ====================
    { query: "Five Guys cheeseburger", expected: { name: "Cheeseburger", calories: 840, protein: 43, carbs: 40, fat: 55 }, tolerance: 0.15, source: "Five Guys Official" },
    { query: "Five Guys little cheeseburger", expected: { name: "Little Cheeseburger", calories: 550, protein: 27, carbs: 40, fat: 32 }, tolerance: 0.15, source: "Five Guys Official" },
    { query: "Five Guys bacon cheeseburger", expected: { name: "Bacon Cheeseburger", calories: 920, protein: 49, carbs: 40, fat: 62 }, tolerance: 0.15, source: "Five Guys Official" },
    { query: "Five Guys regular fries", expected: { name: "Regular Fries", calories: 530, protein: 8, carbs: 64, fat: 27 }, tolerance: 0.20, source: "Five Guys Official" },
    { query: "Five Guys large fries", expected: { name: "Large Fries", calories: 1310, protein: 20, carbs: 158, fat: 67 }, tolerance: 0.20, source: "Five Guys Official" },
    { query: "Five Guys hot dog", expected: { name: "Hot Dog", calories: 545, protein: 18, carbs: 40, fat: 35 }, tolerance: 0.15, source: "Five Guys Official" },

    // ==================== IN-N-OUT ====================
    { query: "In-N-Out Double Double", expected: { name: "Double-Double", calories: 670, protein: 37, carbs: 39, fat: 41 }, tolerance: 0.15, source: "In-N-Out Official" },
    { query: "In-N-Out cheeseburger", expected: { name: "Cheeseburger", calories: 480, protein: 22, carbs: 39, fat: 27 }, tolerance: 0.15, source: "In-N-Out Official" },
    { query: "In-N-Out hamburger", expected: { name: "Hamburger", calories: 390, protein: 16, carbs: 39, fat: 19 }, tolerance: 0.15, source: "In-N-Out Official" },
    { query: "In-N-Out fries", expected: { name: "French Fries", calories: 395, protein: 7, carbs: 54, fat: 18 }, tolerance: 0.15, source: "In-N-Out Official" },
    { query: "In-N-Out animal style fries", expected: { name: "Animal Style Fries", calories: 750, protein: 15, carbs: 57, fat: 52 }, tolerance: 0.20, source: "Estimated" },

    // ==================== RAISING CANE'S ====================
    { query: "Raising Cane's 3 finger combo", expected: { name: "3 Finger Combo", calories: 1050, protein: 39, carbs: 82, fat: 61 }, tolerance: 0.15, source: "Raising Cane's Official" },
    { query: "Raising Cane's Caniac combo", expected: { name: "Caniac Combo", calories: 1740, protein: 68, carbs: 123, fat: 108 }, tolerance: 0.15, source: "Raising Cane's Official" },
    { query: "Raising Cane's chicken fingers 3", expected: { name: "Chicken Fingers (3)", calories: 330, protein: 30, carbs: 13, fat: 17 }, tolerance: 0.15, source: "Raising Cane's Official" },
    { query: "Raising Cane's crinkle cut fries", expected: { name: "Crinkle-Cut Fries", calories: 380, protein: 5, carbs: 51, fat: 17 }, tolerance: 0.15, source: "Raising Cane's Official" },
    { query: "Raising Cane's Cane's sauce", expected: { name: "Cane's Sauce", calories: 190, protein: 0, carbs: 4, fat: 19 }, tolerance: 0.15, source: "Raising Cane's Official" },
    { query: "Raising Cane's Texas toast", expected: { name: "Texas Toast", calories: 150, protein: 4, carbs: 19, fat: 7 }, tolerance: 0.15, source: "Raising Cane's Official" },

    // ==================== SONIC ====================
    { query: "Sonic cheeseburger", expected: { name: "Sonic Cheeseburger", calories: 640, protein: 24, carbs: 47, fat: 40 }, tolerance: 0.20, source: "Sonic Official" },
    { query: "Sonic large tots", expected: { name: "Tater Tots (Large)", calories: 410, protein: 4, carbs: 49, fat: 22 }, tolerance: 0.15, source: "Sonic Official" },
    { query: "Sonic medium cherry limeade", expected: { name: "Cherry Limeade (Medium)", calories: 240, protein: 0, carbs: 65, fat: 0 }, tolerance: 0.15, source: "Sonic Official" },
    { query: "Sonic footlong hot dog", expected: { name: "Footlong Quarter Pound Coney", calories: 780, protein: 27, carbs: 53, fat: 51 }, tolerance: 0.20, source: "Sonic Official" },

    // ==================== WHATABURGER ====================
    { query: "Whataburger with cheese", expected: { name: "Whataburger with Cheese", calories: 780, protein: 35, carbs: 62, fat: 43 }, tolerance: 0.15, source: "Whataburger Official" },
    { query: "Whataburger double meat", expected: { name: "Double Meat Whataburger", calories: 1050, protein: 52, carbs: 62, fat: 63 }, tolerance: 0.15, source: "Whataburger Official" },
    { query: "Whataburger honey butter chicken biscuit", expected: { name: "Honey Butter Chicken Biscuit", calories: 610, protein: 21, carbs: 53, fat: 35 }, tolerance: 0.15, source: "Whataburger Official" },
    { query: "Whataburger medium fries", expected: { name: "French Fries (Medium)", calories: 400, protein: 5, carbs: 54, fat: 18 }, tolerance: 0.15, source: "Whataburger Official" },

    // ==================== WALMART/GROCERY ====================
    { query: "Great Value 2% milk 1 cup", expected: { name: "2% Milk (1 cup)", calories: 122, protein: 8, carbs: 12, fat: 5 }, tolerance: 0.15, source: "USDA" },
    { query: "Great Value white bread 2 slices", expected: { name: "White Bread (2 slices)", calories: 160, protein: 6, carbs: 28, fat: 2 }, tolerance: 0.15, source: "USDA" },
    { query: "Oscar Mayer turkey lunch meat 2 oz", expected: { name: "Turkey Lunch Meat (2 oz)", calories: 50, protein: 10, carbs: 1, fat: 1 }, tolerance: 0.20, source: "USDA" },
    { query: "Kraft singles cheese slice", expected: { name: "American Cheese Slice", calories: 60, protein: 4, carbs: 2, fat: 5 }, tolerance: 0.15, source: "Kraft" },
    { query: "Barilla spaghetti 2 oz dry", expected: { name: "Spaghetti (2 oz dry)", calories: 200, protein: 7, carbs: 42, fat: 1 }, tolerance: 0.15, source: "USDA" },
    { query: "Ragu marinara sauce half cup", expected: { name: "Marinara Sauce (1/2 cup)", calories: 60, protein: 2, carbs: 10, fat: 1 }, tolerance: 0.20, source: "Ragu" },
    { query: "Tyson grilled chicken breast", expected: { name: "Grilled Chicken Breast", calories: 110, protein: 21, carbs: 2, fat: 3 }, tolerance: 0.20, source: "Tyson" },
    { query: "Mission flour tortilla large", expected: { name: "Large Flour Tortilla", calories: 210, protein: 5, carbs: 35, fat: 5 }, tolerance: 0.15, source: "Mission" },
    { query: "Doritos Nacho Cheese 1 oz", expected: { name: "Doritos Nacho Cheese (1 oz)", calories: 140, protein: 2, carbs: 18, fat: 7 }, tolerance: 0.15, source: "Frito Lay" },
    { query: "Oreos 3 cookies", expected: { name: "Oreo Cookies (3)", calories: 160, protein: 1, carbs: 25, fat: 7 }, tolerance: 0.15, source: "Nabisco" },

    // ==================== WHOLE FOODS/NATURAL ====================
    { query: "avocado half", expected: { name: "Avocado (1/2)", calories: 160, protein: 2, carbs: 9, fat: 15 }, tolerance: 0.15, source: "USDA" },
    { query: "banana medium", expected: { name: "Banana (medium)", calories: 105, protein: 1, carbs: 27, fat: 0 }, tolerance: 0.15, source: "USDA" },
    { query: "apple medium", expected: { name: "Apple (medium)", calories: 95, protein: 0, carbs: 25, fat: 0 }, tolerance: 0.15, source: "USDA" },
    { query: "large egg scrambled", expected: { name: "Scrambled Egg (large)", calories: 91, protein: 6, carbs: 1, fat: 7 }, tolerance: 0.15, source: "USDA" },
    { query: "chicken breast grilled 4 oz", expected: { name: "Grilled Chicken Breast (4 oz)", calories: 140, protein: 26, carbs: 0, fat: 3 }, tolerance: 0.15, source: "USDA" },
    { query: "brown rice 1 cup cooked", expected: { name: "Brown Rice (1 cup cooked)", calories: 216, protein: 5, carbs: 45, fat: 2 }, tolerance: 0.15, source: "USDA" },
    { query: "salmon fillet 4 oz", expected: { name: "Salmon Fillet (4 oz)", calories: 234, protein: 25, carbs: 0, fat: 14 }, tolerance: 0.15, source: "USDA" },
    { query: "greek yogurt 1 cup", expected: { name: "Greek Yogurt (1 cup)", calories: 130, protein: 17, carbs: 8, fat: 0 }, tolerance: 0.20, source: "USDA" },
    { query: "almonds 1 oz", expected: { name: "Almonds (1 oz)", calories: 164, protein: 6, carbs: 6, fat: 14 }, tolerance: 0.15, source: "USDA" },
    { query: "peanut butter 2 tbsp", expected: { name: "Peanut Butter (2 tbsp)", calories: 188, protein: 8, carbs: 6, fat: 16 }, tolerance: 0.15, source: "USDA" },

    // ==================== COMBO MEALS (to test multi-item parsing) ====================
    { query: "Big Mac meal with medium fries and coke", expected: { name: "Big Mac Meal", calories: 1080, protein: 30, carbs: 132, fat: 50 }, tolerance: 0.20, source: "McDonald's (combined)", isCombo: true },
    { query: "Chick-fil-A chicken sandwich meal", expected: { name: "Chicken Sandwich Meal", calories: 950, protein: 35, carbs: 100, fat: 40 }, tolerance: 0.20, source: "Chick-fil-A (combined)", isCombo: true },
    { query: "Wendy's 10 piece nuggets with large fries", expected: { name: "Nuggets + Large Fries", calories: 950, protein: 27, carbs: 97, fat: 50 }, tolerance: 0.20, source: "Wendy's (combined)", isCombo: true },

    // ==================== NATURAL LANGUAGE VARIATIONS ====================
    { query: "I had a big mac for lunch", expected: { name: "Big Mac", calories: 563, protein: 25, carbs: 45, fat: 33 }, tolerance: 0.15, source: "McDonald's" },
    { query: "ate 2 slices of pepperoni pizza", expected: { name: "Pepperoni Pizza (2 slices)", calories: 570, protein: 24, carbs: 60, fat: 26 }, tolerance: 0.20, source: "USDA Average" },
    { query: "had a grilled chicken salad from Panera", expected: { name: "Grilled Chicken Salad", calories: 450, protein: 35, carbs: 20, fat: 28 }, tolerance: 0.25, source: "Panera" },
    { query: "coffee with cream and sugar", expected: { name: "Coffee with Cream and Sugar", calories: 60, protein: 0, carbs: 8, fat: 2 }, tolerance: 0.30, source: "USDA" },
];

// Test categories for reporting
export const testCategories = {
    'Fast Food Burgers': testFoods.filter(f => f.query.toLowerCase().includes('burger') || f.query.toLowerCase().includes('whopper') || f.query.toLowerCase().includes('big mac') || f.query.toLowerCase().includes('double')),
    'Chicken Items': testFoods.filter(f => f.query.toLowerCase().includes('chicken') || f.query.toLowerCase().includes('nugget')),
    'Mexican Food': testFoods.filter(f => f.query.toLowerCase().includes('taco') || f.query.toLowerCase().includes('burrito') || f.query.toLowerCase().includes('chipotle') || f.query.toLowerCase().includes('quesadilla')),
    'Italian Food': testFoods.filter(f => f.query.toLowerCase().includes('olive garden') || f.query.toLowerCase().includes('pasta') || f.query.toLowerCase().includes('alfredo') || f.query.toLowerCase().includes('lasagna')),
    'Coffee & Breakfast': testFoods.filter(f => f.query.toLowerCase().includes('starbucks') || f.query.toLowerCase().includes('dunkin') || f.query.toLowerCase().includes('coffee') || f.query.toLowerCase().includes('muffin') || f.query.toLowerCase().includes('biscuit')),
    'Sides & Fries': testFoods.filter(f => f.query.toLowerCase().includes('fries') || f.query.toLowerCase().includes('tots') || f.query.toLowerCase().includes('salad') || f.query.toLowerCase().includes('coleslaw')),
    'Grocery Items': testFoods.filter(f => f.query.toLowerCase().includes('great value') || f.query.toLowerCase().includes('walmart') || f.query.toLowerCase().includes('milk') || f.query.toLowerCase().includes('bread')),
    'Natural Foods': testFoods.filter(f => f.query.toLowerCase().includes('avocado') || f.query.toLowerCase().includes('banana') || f.query.toLowerCase().includes('salmon') || f.query.toLowerCase().includes('yogurt')),
};

export default testFoods;
