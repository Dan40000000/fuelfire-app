// AI-Powered Food Parsing API
// Uses Claude to parse natural food descriptions and return accurate nutrition data

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { query } = req.body;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: 'Food description required' });
        }

        console.log(`🍔 AI parsing food: "${query}"`);

        // Check if Claude API key is available
        if (!process.env.CLAUDE_API_KEY) {
            console.warn('Claude API key not configured, using fallback parsing');
            return res.status(200).json({
                success: true,
                foods: parseWithFallback(query),
                source: 'fallback',
                message: 'Using basic food parsing - add Claude API key for smarter recognition'
            });
        }

        // Use Claude AI to parse the food description
        const prompt = `Parse this food description and return ONLY a JSON array of foods with accurate nutrition data. No other text.

User said: "${query}"

Extract each individual food item and return accurate nutrition per serving. For example:
- "Big Mac with fries" = Big Mac + medium fries  
- "pizza and beer" = pizza slice + beer
- "chicken and rice" = chicken breast + cup of rice

Return format (JSON array only):
[
  {
    "name": "McDonald's Big Mac",
    "calories": 563,
    "protein": 25,
    "carbs": 45,
    "fat": 33,
    "serving": "1 sandwich"
  },
  {
    "name": "French fries, medium",
    "calories": 365,
    "protein": 4,
    "carbs": 48,
    "fat": 17,
    "serving": "medium order"
  }
]

Use accurate nutrition data from major brands/USDA. Include realistic serving sizes.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.content[0].text.trim();
        
        console.log('🤖 Claude response:', aiResponse);

        // Parse the AI response
        let foods;
        try {
            // Clean up the response to extract just the JSON
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                foods = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON array found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            // Fallback to basic parsing
            foods = parseWithFallback(query);
        }

        // Validate and format the foods
        const validatedFoods = foods.map(food => ({
            name: food.name || 'Unknown Food',
            calories: Math.round(food.calories || 200),
            protein: Math.round(food.protein || 10),
            carbs: Math.round(food.carbs || 20),
            fat: Math.round(food.fat || 8),
            serving: food.serving || '1 serving',
            source: 'ai'
        }));

        console.log(`✅ AI parsed ${validatedFoods.length} foods from: "${query}"`);

        res.status(200).json({
            success: true,
            foods: validatedFoods,
            source: 'ai',
            originalQuery: query
        });

    } catch (error) {
        console.error('AI food parsing error:', error);
        
        // Fallback to basic parsing on error
        const fallbackFoods = parseWithFallback(req.body.query || '');
        
        res.status(200).json({
            success: true,
            foods: fallbackFoods,
            source: 'fallback',
            message: 'AI temporarily unavailable, using basic parsing',
            error: error.message
        });
    }
}

// Fallback parsing for when AI is not available
function parseWithFallback(query) {
    const normalizedQuery = query.toLowerCase();
    const foods = [];
    
    // Enhanced food database with combinations
    const foodDatabase = {
        // Fast Food Combos
        'big mac': { name: 'McDonald\'s Big Mac', calories: 563, protein: 25, carbs: 45, fat: 33 },
        'fries': { name: 'French fries, medium', calories: 365, protein: 4, carbs: 48, fat: 17 },
        'french fries': { name: 'French fries, medium', calories: 365, protein: 4, carbs: 48, fat: 17 },
        'whopper': { name: 'Burger King Whopper', calories: 657, protein: 28, carbs: 49, fat: 40 },
        'chicken nuggets': { name: 'Chicken nuggets (6 pc)', calories: 250, protein: 15, carbs: 16, fat: 15 },
        'pizza': { name: 'Pizza slice, cheese', calories: 285, protein: 12, carbs: 36, fat: 10 },
        'burger': { name: 'Hamburger', calories: 354, protein: 16, carbs: 35, fat: 16 },
        'sandwich': { name: 'Turkey sandwich', calories: 320, protein: 22, carbs: 28, fat: 14 },
        'hot dog': { name: 'Hot dog with bun', calories: 314, protein: 11, carbs: 25, fat: 19 },
        
        // Sides & Drinks
        'coke': { name: 'Coca-Cola, 12 oz', calories: 140, protein: 0, carbs: 39, fat: 0 },
        'soda': { name: 'Soda, 12 oz', calories: 140, protein: 0, carbs: 39, fat: 0 },
        'milkshake': { name: 'Vanilla milkshake, medium', calories: 420, protein: 8, carbs: 65, fat: 16 },
        'onion rings': { name: 'Onion rings, medium', calories: 320, protein: 4, carbs: 40, fat: 16 },
        
        // Basic Foods
        'chicken': { name: 'Chicken breast, grilled', calories: 185, protein: 35, carbs: 0, fat: 4 },
        'rice': { name: 'Rice, white, 1 cup', calories: 205, protein: 4, carbs: 45, fat: 0 },
        'apple': { name: 'Apple, medium', calories: 95, protein: 0, carbs: 25, fat: 0 },
        'banana': { name: 'Banana, medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
        'egg': { name: 'Egg, large', calories: 70, protein: 6, carbs: 1, fat: 5 },
        'bread': { name: 'Bread, 1 slice', calories: 80, protein: 3, carbs: 14, fat: 1 },
        'milk': { name: 'Milk, 1 cup 2%', calories: 122, protein: 8, carbs: 12, fat: 5 },
        'cheese': { name: 'Cheese, 1 oz', calories: 113, protein: 7, carbs: 1, fat: 9 }
    };
    
    // Look for multiple food items in the query
    const foundFoods = new Set(); // Prevent duplicates
    
    // Check for each food in the database
    Object.keys(foodDatabase).forEach(key => {
        if (normalizedQuery.includes(key) && !foundFoods.has(key)) {
            foods.push({
                ...foodDatabase[key],
                serving: '1 serving',
                source: 'estimated'
            });
            foundFoods.add(key);
        }
    });
    
    // Common combinations
    if (normalizedQuery.includes('big mac') && normalizedQuery.includes('fries')) {
        // Already added both above
    } else if (normalizedQuery.includes('burger') && normalizedQuery.includes('fries')) {
        // Already added both above  
    } else if (normalizedQuery.includes('chicken') && normalizedQuery.includes('rice')) {
        // Already added both above
    }
    
    // If no foods found, provide a generic estimate
    if (foods.length === 0) {
        foods.push({
            name: `${query} (estimated)`,
            calories: 350,
            protein: 15,
            carbs: 30,
            fat: 15,
            serving: '1 serving',
            source: 'estimated'
        });
    }
    
    return foods;
}