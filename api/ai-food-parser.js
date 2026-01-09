// AI-Powered Food Parsing API
// Uses Claude to parse natural food descriptions and return accurate nutrition data

import { callClaude, getClaudeModel } from './_lib/anthropic.js';
import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

// Comprehensive nutrition database for web search simulation
const nutritionDatabase = {
    // Olive Garden
    'olive garden breadstick': {
        name: 'Olive Garden Breadstick',
        calories: 140,
        protein: 4,
        carbs: 23,
        fat: 3,
        sugar: 1,
        serving: '1 breadstick',
        source: 'Olive Garden Official Nutrition'
    },
    'olive garden house salad': {
        name: 'Olive Garden House Salad',
        calories: 150,
        protein: 2,
        carbs: 11,
        fat: 11,
        sugar: 4,
        serving: '1 bowl',
        source: 'Olive Garden Official Nutrition'
    },
    'olive garden tour of italy': {
        name: 'Olive Garden Tour of Italy',
        calories: 1520,
        protein: 82,
        carbs: 118,
        fat: 74,
        sugar: 17,
        serving: '1 entree (Chicken Parmigiana, Lasagna Classico, Fettuccine Alfredo)',
        source: 'Olive Garden Official Nutrition'
    },
    'olive garden chicken parmigiana': {
        name: 'Olive Garden Chicken Parmigiana',
        calories: 1060,
        protein: 69,
        carbs: 88,
        fat: 46,
        sugar: 13,
        serving: '1 entree',
        source: 'Olive Garden Official Nutrition'
    },
    'olive garden fettuccine alfredo': {
        name: 'Olive Garden Fettuccine Alfredo',
        calories: 1220,
        protein: 47,
        carbs: 102,
        fat: 72,
        sugar: 5,
        serving: '1 entree',
        source: 'Olive Garden Official Nutrition'
    },
    'olive garden lasagna': {
        name: 'Olive Garden Lasagna Classico',
        calories: 580,
        protein: 31,
        carbs: 47,
        fat: 29,
        sugar: 11,
        serving: '1 entree',
        source: 'Olive Garden Official Nutrition'
    },

    // Chick-fil-A
    'chick-fil-a chicken sandwich': {
        name: 'Chick-fil-A Chicken Sandwich',
        calories: 420,
        protein: 28,
        carbs: 41,
        fat: 16,
        sugar: 5,
        serving: '1 sandwich',
        source: 'Chick-fil-A Official Nutrition'
    },
    'chick-fil-a nuggets': {
        name: 'Chick-fil-A Chicken Nuggets (8 count)',
        calories: 250,
        protein: 27,
        carbs: 11,
        fat: 11,
        sugar: 1,
        serving: '8 nuggets',
        source: 'Chick-fil-A Official Nutrition'
    },
    'chick-fil-a waffle fries': {
        name: 'Chick-fil-A Waffle Potato Fries (Medium)',
        calories: 420,
        protein: 5,
        carbs: 45,
        fat: 24,
        sugar: 0,
        serving: 'medium',
        source: 'Chick-fil-A Official Nutrition'
    },

    // McDonald's
    'big mac': {
        name: 'McDonald\'s Big Mac',
        calories: 563,
        protein: 25,
        carbs: 45,
        fat: 33,
        sugar: 9,
        serving: '1 burger',
        source: 'McDonald\'s Official Nutrition'
    },
    'mcdonalds fries': {
        name: 'McDonald\'s French Fries (Medium)',
        calories: 365,
        protein: 4,
        carbs: 48,
        fat: 17,
        sugar: 0,
        serving: 'medium',
        source: 'McDonald\'s Official Nutrition'
    },
    'mcnuggets': {
        name: 'McDonald\'s Chicken McNuggets (10 piece)',
        calories: 420,
        protein: 24,
        carbs: 25,
        fat: 24,
        sugar: 0,
        serving: '10 nuggets',
        source: 'McDonald\'s Official Nutrition'
    },

    // Generic items
    'fountain drink': {
        name: 'Fountain Drink (Medium)',
        calories: 210,
        protein: 0,
        carbs: 58,
        fat: 0,
        sugar: 58,
        serving: 'medium cup',
        source: 'Standard Nutrition Data'
    },
    'french fries': {
        name: 'French Fries (Medium)',
        calories: 380,
        protein: 4,
        carbs: 48,
        fat: 19,
        sugar: 0,
        serving: 'medium',
        source: 'USDA Standard'
    }
};

// Simulate web search for nutrition data
async function simulateWebSearch(query) {
    console.log(`🌐 Simulating web search for: "${query}"`);

    const normalizedQuery = query.toLowerCase();

    // Check our database for matching items
    for (const [key, value] of Object.entries(nutritionDatabase)) {
        if (normalizedQuery.includes(key) || key.includes(normalizedQuery.replace('nutrition', '').replace('official', '').replace('calories', '').trim())) {
            console.log(`✅ Found match in database: ${key}`);
            return JSON.stringify({
                found: true,
                item: value,
                query: query
            });
        }
    }

    // Return generic response if not found
    console.log(`⚠️ No exact match found for: ${query}`);
    return JSON.stringify({
        found: false,
        message: `No exact nutrition data found for "${query}". Please estimate based on similar items.`,
        query: query
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

    try {
        const body = req.body || {};
        const { query } = body;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: 'Food description required' });
        }

        console.log(`🍔 AI parsing food: "${query}"`);

        // Hard overrides for known items to improve accuracy (e.g., Houston Hot Chicken nuggets)
        const overrideFoods = getOverrideFoods(query);
        if (overrideFoods) {
            console.log('⚡ Using override foods for query');
            return res.status(200).json({
                success: true,
                foods: overrideFoods,
                source: 'override',
                originalQuery: query
            });
        }

        // Check if Claude API key is available
        const hasApiKey = !!process.env.CLAUDE_API_KEY;
        console.log(`🔑 API Key status: ${hasApiKey ? 'Found' : 'Missing'}`);
        
        if (!process.env.CLAUDE_API_KEY) {
            console.warn('Claude API key not configured, using fallback parsing');
            return res.status(200).json({
                success: true,
                foods: parseWithFallback(query),
                source: 'fallback',
                message: 'Using basic food parsing - add Claude API key for smarter recognition'
            });
        }

        console.log(`🧠 Claude model in use: ${getClaudeModel()}`);

        // Use Claude's extensive knowledge of restaurant nutrition data
        const searchPrompt = `You are an expert nutritionist helping someone track calories. The user said: "${query}"

CRITICAL RULES:

1. MEALS vs ITEMS - If they say "meal" or "combo", ALWAYS include ALL components:
   - Nugget MEAL = Nuggets + Fries + Drink (3 separate items)
   - Burger MEAL = Burger + Fries + Drink (3 separate items)
   - Just "nuggets" alone = only nuggets

2. QUANTITIES & SIZES MATTER:
   - If they say "10 piece" or "10 nuggets" → quantity should reflect that
   - If they don't specify size, ASK or use MEDIUM as default
   - "Houston Hot Chicken nuggets" without size → assume 10-piece meal (most common)
   - Always specify the size in the name (e.g., "10-Piece Nuggets" not just "Nuggets")

3. BREAK OUT EVERY COMPONENT SEPARATELY:
   - "Houston Hot Chicken 15 nugget meal" = 15 Nuggets (1) + Fries (1) + Drink (1)
   - "Chick-fil-A 12 count nuggets with large fry" = 12-ct Nuggets (1) + Large Fries (1)
   - Each sauce packet = separate item (~50-100 cal each)

4. REGIONAL/LOCAL RESTAURANTS:
   - Houston Hot Chicken, Raising Cane's, Zaxby's, Wingstop, etc.
   - Search for real nutrition data
   - If unknown, estimate based on similar items (fried chicken nuggets ~50-60 cal per nugget)

5. QUANTITY FIELD:
   - Use quantity=1 for the item as described
   - Put the count IN THE NAME: "Houston Hot Chicken 15-Piece Nuggets" with quantity=1
   - NOT "Nuggets" with quantity=15

EXAMPLE - "Houston Hot Chicken 15 nugget meal with fries and ranch":
[
  {"name": "Houston Hot Chicken 15-Piece Nuggets", "calories": 1350, "protein": 90, "carbs": 90, "fat": 70, "sugar": 2, "serving": "15 nuggets", "quantity": 1, "confidence": "medium", "source": "Estimated from similar fried chicken restaurants"},
  {"name": "Houston Hot Chicken Fries (Medium)", "calories": 420, "protein": 5, "carbs": 55, "fat": 20, "sugar": 1, "serving": "medium", "quantity": 1, "confidence": "medium", "source": "Estimated"},
  {"name": "Ranch Dipping Sauce", "calories": 120, "protein": 0, "carbs": 2, "fat": 12, "sugar": 1, "serving": "1 container", "quantity": 1, "confidence": "medium", "source": "Standard ranch sauce"}
]

EXAMPLE - "10 piece McNuggets":
[
  {"name": "McDonald's 10-Piece Chicken McNuggets", "calories": 410, "protein": 25, "carbs": 26, "fat": 24, "sugar": 0, "serving": "10 pieces", "quantity": 1, "confidence": "high", "source": "McDonald's official nutrition"}
]

CALORIE ESTIMATES FOR FRIED CHICKEN NUGGETS (when no official data):
- Per nugget: ~50-60 calories (breaded, fried)
- 5 piece: ~275 cal
- 10 piece: ~550 cal
- 15 piece: ~825 cal
- 20 piece: ~1100 cal
(Add more if restaurant is known for larger/fattier nuggets)

ALWAYS RETURN VALID JSON ARRAY ONLY (no markdown, no explanation):
[
  {
    "name": "Full Item Name with Size/Count",
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "sugar": 0,
    "serving": "description",
    "quantity": 1,
    "confidence": "high|medium|low",
    "source": "where data came from"
  }
]

Be accurate. Users are counting calories for real fitness goals.`;

        // Call Claude with web search enabled for real-time nutrition data
        const apiKey = process.env.CLAUDE_API_KEY;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                temperature: 0,
                tools: [
                    {
                        type: 'web_search_20250305',
                        name: 'web_search',
                        max_uses: 5
                    }
                ],
                messages: [{ role: 'user', content: searchPrompt }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', errorText);
            // Fallback to basic Claude call without web search
            const fallbackResponse = await callClaude({
                prompt: searchPrompt,
                maxTokens: 4000,
                temperature: 0,
                tags: ['food-parser-fallback'],
            });
            var aiResponse = fallbackResponse.text;
        } else {
            const data = await response.json();
            console.log('🌐 Claude response with web search:', JSON.stringify(data.content?.slice(0, 2)));

            // Extract text from response (may have multiple content blocks including web search results)
            var aiResponse = data.content
                ?.filter(block => block.type === 'text')
                ?.map(block => block.text)
                ?.join('\n') || '';
        }

        if (!aiResponse) {
            throw new Error('Claude did not return a response');
        }

        const trimmedResponse = aiResponse.trim();
        console.log('🤖 Claude final response:', trimmedResponse);

        // Parse the AI response
        let foods;
        let isAIResponse = true;
        try {
            // Clean up the response to extract just the JSON
            const jsonMatch = trimmedResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                foods = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON array found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            // Fallback to basic parsing
            foods = parseWithFallback(query);
            isAIResponse = false;
        }

        // Validate and format the foods (don't add defaults if from AI)
        const validatedFoods = foods.map(food => ({
            name: food.name || 'Unknown Food',
            calories: Math.round(food.calories || 0),
            protein: Math.round(food.protein || 0),
            carbs: Math.round(food.carbs || 0),
            fat: Math.round(food.fat || 0),
            sugar: Math.round(food.sugar || 0),
            serving: food.serving || '1 serving',
            quantity: parseFloat(food.quantity) || 1,
            confidence: food.confidence || 'medium',
            source: isAIResponse ? 'ai' : 'fallback'
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

// Override specific known queries to improve accuracy
function getOverrideFoods(query) {
    const q = (query || '').toLowerCase();
    const isHoustonHot = q.includes('houston hot chicken') || q.includes('hot houston chicken');
    const mentionsNuggets = q.includes('nugget');
    const mentions15 = q.includes('15');

    if (isHoustonHot && mentionsNuggets && mentions15) {
        // Estimated combo ~1890 cal (15pc nuggets + fries + sauce)
        return [
            {
                name: 'Houston Hot Chicken Nuggets (15 pc)',
                calories: 1350,
                protein: 90,
                carbs: 90,
                fat: 70,
                sugar: 2,
                serving: '15 nuggets',
                quantity: 1,
                confidence: 'medium'
            },
            {
                name: 'Houston Hot Chicken Fries (medium)',
                calories: 420,
                protein: 5,
                carbs: 55,
                fat: 20,
                sugar: 1,
                serving: 'medium fries',
                quantity: 1,
                confidence: 'medium'
            },
            {
                name: 'Signature Sauce',
                calories: 120,
                protein: 0,
                carbs: 10,
                fat: 9,
                sugar: 5,
                serving: '2 oz',
                quantity: 1,
                confidence: 'medium'
            }
        ];
    }

    return null;
}

// Fallback parsing for when AI is not available
function parseWithFallback(query) {
    const normalizedQuery = query.toLowerCase();
    const foods = [];
    
    // Enhanced food database with combinations
    const foodDatabase = {
        // Fast Food Combos
        'big mac': { name: 'McDonald\'s Big Mac', calories: 563, protein: 25, carbs: 45, fat: 33, sugar: 9 },
        'fries': { name: 'French fries, medium', calories: 365, protein: 4, carbs: 48, fat: 17, sugar: 0 },
        'french fries': { name: 'French fries, medium', calories: 365, protein: 4, carbs: 48, fat: 17, sugar: 0 },
        'whopper': { name: 'Burger King Whopper', calories: 657, protein: 28, carbs: 49, fat: 40, sugar: 11 },
        'chicken nuggets': { name: 'Chicken nuggets (6 pc)', calories: 250, protein: 15, carbs: 16, fat: 15, sugar: 0 },
        'pizza': { name: 'Pizza slice, cheese', calories: 285, protein: 12, carbs: 36, fat: 10, sugar: 4 },
        'burger': { name: 'Hamburger', calories: 354, protein: 16, carbs: 35, fat: 16, sugar: 6 },
        'sandwich': { name: 'Turkey sandwich', calories: 320, protein: 22, carbs: 28, fat: 14, sugar: 4 },
        'hot dog': { name: 'Hot dog with bun', calories: 314, protein: 11, carbs: 25, fat: 19, sugar: 5 },

        // Sides & Drinks
        'coke': { name: 'Coca-Cola, 12 oz', calories: 140, protein: 0, carbs: 39, fat: 0, sugar: 39 },
        'soda': { name: 'Soda, 12 oz', calories: 140, protein: 0, carbs: 39, fat: 0, sugar: 39 },
        'milkshake': { name: 'Vanilla milkshake, medium', calories: 420, protein: 8, carbs: 65, fat: 16, sugar: 56 },
        'onion rings': { name: 'Onion rings, medium', calories: 320, protein: 4, carbs: 40, fat: 16, sugar: 3 },

        // Basic Foods
        'chicken': { name: 'Chicken breast, grilled', calories: 185, protein: 35, carbs: 0, fat: 4, sugar: 0 },
        'rice': { name: 'Rice, white, 1 cup', calories: 205, protein: 4, carbs: 45, fat: 0, sugar: 0 },
        'apple': { name: 'Apple, medium', calories: 95, protein: 0, carbs: 25, fat: 0, sugar: 19 },
        'banana': { name: 'Banana, medium', calories: 105, protein: 1, carbs: 27, fat: 0, sugar: 14 },
        'egg': { name: 'Egg, large', calories: 70, protein: 6, carbs: 1, fat: 5, sugar: 0 },
        'bread': { name: 'Bread, 1 slice', calories: 80, protein: 3, carbs: 14, fat: 1, sugar: 2 },
        'milk': { name: 'Milk, 1 cup 2%', calories: 122, protein: 8, carbs: 12, fat: 5, sugar: 12 },
        'cheese': { name: 'Cheese, 1 oz', calories: 113, protein: 7, carbs: 1, fat: 9, sugar: 0 }
    };
    
    // Look for multiple food items in the query
    const foundFoods = new Set(); // Prevent duplicates
    
    // Check for each food in the database
    Object.keys(foodDatabase).forEach(key => {
        if (normalizedQuery.includes(key) && !foundFoods.has(key)) {
            foods.push({
                ...foodDatabase[key],
                serving: '1 serving',
                quantity: 1,
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
            sugar: 6,
            serving: '1 serving',
            quantity: 1,
            source: 'estimated'
        });
    }
    
    return foods;
}
