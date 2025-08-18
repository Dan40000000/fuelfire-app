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
    
    // Common foods database
    const commonFoods = {
        'apple': { name: 'Apple, raw', calories: 52, protein: 0, carbs: 14, fat: 0 },
        'banana': { name: 'Banana, raw', calories: 89, protein: 1, carbs: 23, fat: 0 },
        'chicken': { name: 'Chicken breast, grilled', calories: 165, protein: 31, carbs: 0, fat: 4 },
        'egg': { name: 'Egg, whole, cooked', calories: 155, protein: 13, carbs: 1, fat: 11 },
        'rice': { name: 'Rice, white, cooked', calories: 130, protein: 3, carbs: 28, fat: 0 },
        'bread': { name: 'Bread, whole wheat', calories: 69, protein: 4, carbs: 12, fat: 1 },
        'milk': { name: 'Milk, 2%', calories: 50, protein: 3, carbs: 5, fat: 2 },
        'cheese': { name: 'Cheddar cheese', calories: 113, protein: 7, carbs: 1, fat: 9 },
        'salmon': { name: 'Salmon, cooked', calories: 206, protein: 22, carbs: 0, fat: 12 },
        'broccoli': { name: 'Broccoli, cooked', calories: 27, protein: 3, carbs: 5, fat: 0 },
        'pasta': { name: 'Pasta, cooked', calories: 131, protein: 5, carbs: 25, fat: 1 },
        'yogurt': { name: 'Greek yogurt, plain', calories: 59, protein: 10, carbs: 4, fat: 0 },
        'oats': { name: 'Oatmeal, cooked', calories: 68, protein: 2, carbs: 12, fat: 1 },
        'avocado': { name: 'Avocado, raw', calories: 160, protein: 2, carbs: 9, fat: 15 },
        'spinach': { name: 'Spinach, raw', calories: 7, protein: 1, carbs: 1, fat: 0 },
        'burger': { name: 'Hamburger, fast food', calories: 250, protein: 13, carbs: 30, fat: 9 },
        'pizza': { name: 'Pizza slice, cheese', calories: 285, protein: 12, carbs: 36, fat: 10 },
        'steak': { name: 'Beef steak, grilled', calories: 271, protein: 26, carbs: 0, fat: 18 },
        'turkey': { name: 'Turkey breast, roasted', calories: 135, protein: 25, carbs: 0, fat: 3 },
        'tuna': { name: 'Tuna, canned in water', calories: 109, protein: 25, carbs: 0, fat: 1 },
        'pork': { name: 'Pork chop, grilled', calories: 231, protein: 23, carbs: 0, fat: 15 },
        'shrimp': { name: 'Shrimp, cooked', calories: 84, protein: 18, carbs: 0, fat: 1 },
        'beans': { name: 'Black beans, cooked', calories: 132, protein: 9, carbs: 23, fat: 1 },
        'almonds': { name: 'Almonds, raw', calories: 164, protein: 6, carbs: 6, fat: 14 },
        'orange': { name: 'Orange, raw', calories: 47, protein: 1, carbs: 12, fat: 0 },
        'potato': { name: 'Potato, baked', calories: 93, protein: 2, carbs: 21, fat: 0 },
        'carrot': { name: 'Carrot, raw', calories: 25, protein: 1, carbs: 6, fat: 0 },
        'tomato': { name: 'Tomato, raw', calories: 18, protein: 1, carbs: 4, fat: 0 }
    };

    // Find matching foods
    const matches = [];
    
    // Direct matches
    for (let key in commonFoods) {
        if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
            matches.push({
                ...commonFoods[key],
                source: 'estimated'
            });
        }
    }
    
    // If no matches, provide generic estimate
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
    
    return matches.slice(0, 5);
}