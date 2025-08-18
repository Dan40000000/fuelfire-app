// USDA FoodData Central API Integration
// Get your free API key at: https://fdc.nal.usda.gov/api-key-signup.html

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { query } = req.method === 'POST' ? req.body : req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        // Check if API key is configured
        if (!process.env.USDA_API_KEY) {
            console.warn('USDA_API_KEY not configured, using fallback data');
            return res.status(200).json({
                success: true,
                foods: getFallbackFoods(query),
                source: 'fallback'
            });
        }

        console.log(`🔍 Searching USDA for: "${query}"`);
        
        // USDA FoodData Central API search
        const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_API_KEY}`;
        
        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                pageSize: 10,
                dataType: ['Foundation', 'SR Legacy'],
                sortBy: 'dataType.keyword',
                sortOrder: 'asc'
            })
        });

        if (!searchResponse.ok) {
            throw new Error(`USDA API error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        
        if (!searchData.foods || searchData.foods.length === 0) {
            return res.status(200).json({
                success: true,
                foods: getFallbackFoods(query),
                source: 'fallback',
                message: 'No USDA results found, showing estimated values'
            });
        }

        // Process and format foods
        const foods = searchData.foods.slice(0, 5).map(food => {
            // Find nutrition values
            const nutrients = food.foodNutrients || [];
            
            const getCalories = () => {
                const cal = nutrients.find(n => n.nutrientId === 1008); // Energy
                return cal ? Math.round(cal.value) : 200;
            };
            
            const getProtein = () => {
                const protein = nutrients.find(n => n.nutrientId === 1003); // Protein
                return protein ? Math.round(protein.value) : 10;
            };
            
            const getCarbs = () => {
                const carbs = nutrients.find(n => n.nutrientId === 1005); // Carbohydrates
                return carbs ? Math.round(carbs.value) : 20;
            };
            
            const getFat = () => {
                const fat = nutrients.find(n => n.nutrientId === 1004); // Total lipid (fat)
                return fat ? Math.round(fat.value) : 8;
            };

            return {
                name: food.description || 'Unknown Food',
                calories: getCalories(),
                protein: getProtein(),
                carbs: getCarbs(),
                fat: getFat(),
                fdcId: food.fdcId,
                source: 'USDA'
            };
        });

        console.log(`✅ Found ${foods.length} USDA foods for: "${query}"`);

        res.status(200).json({
            success: true,
            foods: foods,
            source: 'usda',
            totalResults: searchData.totalHits
        });

    } catch (error) {
        console.error('USDA API error:', error);
        
        // Fallback to estimated data on error
        const fallbackFoods = getFallbackFoods(req.method === 'POST' ? req.body.query : req.query.query);
        
        res.status(200).json({
            success: true,
            foods: fallbackFoods,
            source: 'fallback',
            message: 'USDA API temporarily unavailable, showing estimated values'
        });
    }
}

// Fallback food data when API is unavailable
function getFallbackFoods(query) {
    const normalizedQuery = query.toLowerCase();
    
    // Expanded foods database with accurate fast food items
    const commonFoods = {
        // Fast Food Items
        'big mac': { name: 'McDonald\'s Big Mac', calories: 563, protein: 25, carbs: 45, fat: 33 },
        'whopper': { name: 'Burger King Whopper', calories: 657, protein: 28, carbs: 49, fat: 40 },
        'quarter pounder': { name: 'McDonald\'s Quarter Pounder', calories: 520, protein: 26, carbs: 42, fat: 26 },
        'mcchicken': { name: 'McDonald\'s McChicken', calories: 400, protein: 14, carbs: 40, fat: 22 },
        'chicken nuggets': { name: 'Chicken nuggets (6 pc)', calories: 250, protein: 15, carbs: 16, fat: 15 },
        'french fries': { name: 'French fries, medium', calories: 365, protein: 4, carbs: 48, fat: 17 },
        'pizza slice': { name: 'Pizza slice, pepperoni', calories: 298, protein: 13, carbs: 34, fat: 12 },
        'dominos pizza': { name: 'Dominos pizza slice', calories: 290, protein: 12, carbs: 35, fat: 11 },
        'taco bell': { name: 'Taco Bell Crunchy Taco', calories: 170, protein: 8, carbs: 13, fat: 10 },
        'subway sandwich': { name: 'Subway 6" Turkey Sub', calories: 280, protein: 18, carbs: 46, fat: 4 },
        'kfc chicken': { name: 'KFC Original Recipe Chicken', calories: 320, protein: 19, carbs: 8, fat: 20 },
        'chipotle bowl': { name: 'Chipotle Chicken Bowl', calories: 630, protein: 37, carbs: 40, fat: 34 },
        'chick fil a': { name: 'Chick-fil-A Chicken Sandwich', calories: 440, protein: 28, carbs: 40, fat: 19 },
        
        // Common Foods
        'burger': { name: 'Hamburger, regular', calories: 354, protein: 16, carbs: 35, fat: 16 },
        'cheeseburger': { name: 'Cheeseburger, regular', calories: 400, protein: 19, carbs: 35, fat: 20 },
        'pizza': { name: 'Pizza slice, cheese', calories: 285, protein: 12, carbs: 36, fat: 10 },
        'hot dog': { name: 'Hot dog with bun', calories: 314, protein: 11, carbs: 25, fat: 19 },
        'sandwich': { name: 'Turkey sandwich', calories: 320, protein: 22, carbs: 28, fat: 14 },
        'salad': { name: 'Garden salad with dressing', calories: 150, protein: 3, carbs: 8, fat: 12 },
        'pasta': { name: 'Spaghetti with sauce', calories: 220, protein: 8, carbs: 42, fat: 2 },
        'burrito': { name: 'Bean and cheese burrito', calories: 378, protein: 15, carbs: 55, fat: 12 },
        'quesadilla': { name: 'Cheese quesadilla', calories: 480, protein: 19, carbs: 39, fat: 28 },
        'wings': { name: 'Buffalo chicken wings (6)', calories: 430, protein: 24, carbs: 4, fat: 36 },
        
        // Basic Foods
        'apple': { name: 'Apple, medium', calories: 95, protein: 0, carbs: 25, fat: 0 },
        'banana': { name: 'Banana, medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
        'chicken breast': { name: 'Chicken breast, grilled (4oz)', calories: 185, protein: 35, carbs: 0, fat: 4 },
        'chicken': { name: 'Chicken breast, grilled (4oz)', calories: 185, protein: 35, carbs: 0, fat: 4 },
        'egg': { name: 'Egg, large', calories: 70, protein: 6, carbs: 1, fat: 5 },
        'eggs': { name: 'Eggs, 2 large', calories: 140, protein: 12, carbs: 1, fat: 10 },
        'rice': { name: 'Rice, white, 1 cup cooked', calories: 205, protein: 4, carbs: 45, fat: 0 },
        'bread': { name: 'Bread, 2 slices whole wheat', calories: 160, protein: 6, carbs: 28, fat: 2 },
        'milk': { name: 'Milk, 1 cup 2%', calories: 122, protein: 8, carbs: 12, fat: 5 },
        'cheese': { name: 'Cheddar cheese, 1 oz', calories: 113, protein: 7, carbs: 1, fat: 9 },
        'salmon': { name: 'Salmon fillet, 4oz', calories: 206, protein: 22, carbs: 0, fat: 12 },
        'steak': { name: 'Beef steak, 4oz', calories: 310, protein: 26, carbs: 0, fat: 22 },
        'pork': { name: 'Pork chop, 4oz', calories: 290, protein: 26, carbs: 0, fat: 20 },
        'fish': { name: 'White fish fillet, 4oz', calories: 180, protein: 25, carbs: 0, fat: 8 },
        
        // Snacks & Desserts  
        'cookie': { name: 'Chocolate chip cookie', calories: 78, protein: 1, carbs: 11, fat: 4 },
        'ice cream': { name: 'Ice cream, 1/2 cup', calories: 137, protein: 2, carbs: 16, fat: 7 },
        'chips': { name: 'Potato chips, 1 oz bag', calories: 152, protein: 2, carbs: 15, fat: 10 },
        'soda': { name: 'Soda, 12 oz can', calories: 140, protein: 0, carbs: 39, fat: 0 },
        'beer': { name: 'Beer, 12 oz', calories: 153, protein: 2, carbs: 13, fat: 0 },
        'wine': { name: 'Wine, 5 oz glass', calories: 125, protein: 0, carbs: 4, fat: 0 },
        
        // Breakfast Items
        'pancakes': { name: 'Pancakes, 3 medium', calories: 350, protein: 8, carbs: 45, fat: 14 },
        'waffle': { name: 'Waffle with syrup', calories: 280, protein: 6, carbs: 36, fat: 12 },
        'cereal': { name: 'Cereal with milk, 1 cup', calories: 150, protein: 3, carbs: 27, fat: 2 },
        'oatmeal': { name: 'Oatmeal, 1 cup cooked', calories: 150, protein: 5, carbs: 27, fat: 3 },
        'bagel': { name: 'Bagel with cream cheese', calories: 360, protein: 12, carbs: 56, fat: 12 },
        'muffin': { name: 'Blueberry muffin', calories: 265, protein: 4, carbs: 47, fat: 6 },
        
        // Vegetables & Fruits
        'broccoli': { name: 'Broccoli, 1 cup cooked', calories: 27, protein: 3, carbs: 5, fat: 0 },
        'spinach': { name: 'Spinach, 1 cup raw', calories: 7, protein: 1, carbs: 1, fat: 0 },
        'carrot': { name: 'Carrot, 1 medium', calories: 25, protein: 1, carbs: 6, fat: 0 },
        'potato': { name: 'Baked potato, medium', calories: 161, protein: 4, carbs: 37, fat: 0 },
        'orange': { name: 'Orange, medium', calories: 62, protein: 1, carbs: 15, fat: 0 },
        'strawberries': { name: 'Strawberries, 1 cup', calories: 49, protein: 1, carbs: 11, fat: 0 },
        'grapes': { name: 'Grapes, 1 cup', calories: 104, protein: 1, carbs: 27, fat: 0 }
    };

    // Find matching foods with better matching logic
    const matches = [];
    
    // First, check for exact phrase matches
    for (let key in commonFoods) {
        if (normalizedQuery.includes(key)) {
            matches.push({
                ...commonFoods[key],
                source: 'estimated'
            });
        }
    }
    
    // If no exact matches, try partial matches
    if (matches.length === 0) {
        for (let key in commonFoods) {
            const keyWords = key.split(' ');
            const queryWords = normalizedQuery.split(' ');
            
            // Check if any key word matches any query word
            if (keyWords.some(kw => queryWords.some(qw => qw.includes(kw) || kw.includes(qw)))) {
                matches.push({
                    ...commonFoods[key],
                    source: 'estimated'
                });
            }
        }
    }
    
    // If still no matches, provide generic estimate
    if (matches.length === 0) {
        matches.push({
            name: `${query} (estimated)`,
            calories: 200,
            protein: 10,
            carbs: 20,
            fat: 8,
            source: 'estimated'
        });
    }
    
    // Remove duplicates and return top 5
    const uniqueMatches = matches.filter((food, index, self) => 
        index === self.findIndex(f => f.name === food.name)
    );
    
    return uniqueMatches.slice(0, 5);
}