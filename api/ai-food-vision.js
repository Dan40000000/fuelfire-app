// AI-Powered Food Photo Analysis API
// Uses Claude Opus 4.5 with Extended Thinking to analyze food photos and find REAL nutrition data

import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

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
        const { image, mimeType = 'image/jpeg' } = body;

        if (!image) {
            return res.status(400).json({ error: 'Image data required' });
        }

        console.log(`📸 Analyzing food photo with Claude Opus 4.5...`);

        const apiKey = process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Claude API key not configured' });
        }

        // Use Claude Opus 4.5 Vision with Extended Thinking for deep analysis
        const response = await fetch(ANTHROPIC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
            },
            body: JSON.stringify({
                model: 'claude-opus-4-5-20251101',
                max_tokens: 16000,
                thinking: {
                    type: 'enabled',
                    budget_tokens: 10000
                },
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: mimeType,
                                    data: image,
                                },
                            },
                            {
                                type: 'text',
                                text: `You are a professional nutrition analyst with access to extensive restaurant menu databases. Your job is to provide ACCURATE calorie and nutrition data for foods in photos.

CRITICAL REQUIREMENTS FOR PHOTO ANALYSIS:

1. IDENTIFY RESTAURANTS FIRST:
   - Look for ANY visible branding: logos, packaging, cups, bags, napkins, receipts
   - Check for distinctive food styling or plating specific to chains
   - Look for branded containers, boxes, wrappers
   - If you identify a restaurant, YOU MUST search your knowledge for their ACTUAL menu nutrition data
   - DO NOT estimate if you can find real data

2. IDENTIFY SPECIFIC MENU ITEMS:
   - What exact menu items are visible? (e.g., "Big Mac" not "burger")
   - What size portions? (small/medium/large fries, 6pc vs 10pc nuggets)
   - What combo/meal is this? (meals include sides and drinks)

3. BREAK DOWN COMBO MEALS:
   - If this is a combo/meal, list EACH item separately
   - Example: Fast food meal = Main item + Fries + Drink (3 separate entries)
   - Example: Olive Garden plate = Breadsticks + Salad + Entree (separate entries)
   - DO NOT lump everything together

4. USE REAL NUTRITION DATA:
   - For major chains (McDonald's, Burger King, Chick-fil-A, Taco Bell, Subway, Chipotle, Panera, Olive Garden, etc.), use their published nutrition information
   - For regional/local restaurants, search your knowledge for similar items at comparable restaurants
   - If the restaurant publishes nutrition data, USE IT - don't estimate
   - Example: McDonald's Big Mac is EXACTLY 563 calories, 25g protein, 45g carbs, 33g fat
   - Example: Chick-fil-A Chicken Sandwich is EXACTLY 440 calories, 28g protein, 40g carbs, 19g fat

5. PORTION SIZE ACCURACY:
   - Use visual cues: plate size, hand for scale, utensils, coin for reference
   - Restaurant portions are typically LARGER than home-cooked
   - Medium fast food fries = typically 350-400 calories
   - Large fast food drink = typically 280-350 calories

6. HIDDEN CALORIES:
   - Sauces, dressings, butter, toppings add significant calories
   - If you see condiment packets, count them
   - Restaurant food often has added butter/oil you can't see

RESPONSE FORMAT - Return ONLY this JSON structure:

{
  "restaurantIdentified": "Restaurant Name" or null,
  "foods": [
    {
      "name": "Specific Menu Item Name (Size if applicable)",
      "restaurant": "Restaurant Name" or null,
      "calories": 440,
      "protein": 28,
      "carbs": 40,
      "fat": 19,
      "sugar": 5,
      "serving": "1 sandwich",
      "quantity": 1,
      "confidence": "high",
      "dataSource": "Published menu data" or "Estimated based on similar items"
    }
  ],
  "totalCalories": 440,
  "totalProtein": 28,
  "totalCarbs": 40,
  "totalFat": 19,
  "totalSugar": 5,
  "overallConfidence": "high",
  "notes": "Detailed analysis: what you identified, how you determined portions, what data sources you used"
}

CONFIDENCE LEVELS:
- "high": Restaurant identified with published nutrition data, or clear standard items
- "medium": Restaurant/items estimated based on similar known items
- "low": Unclear items or unusual foods requiring best-guess estimates

DATA SOURCE EXAMPLES:
- "McDonald's published nutrition data"
- "Chick-fil-A official menu nutrition"
- "Estimated based on typical fried chicken restaurant portions"
- "USDA database for home-cooked chicken breast"

If image is NOT food or too unclear:
{
  "error": true,
  "message": "Clear description of the issue"
}

IMPORTANT: Users are counting calories for health/fitness. Accuracy is CRITICAL. When in doubt, search your knowledge for real data rather than guessing. Restaurant chains publish detailed nutrition information - USE IT.

Return ONLY valid JSON, no other text outside the JSON.`
                            }
                        ]
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude Vision API error:', errorText);
            return res.status(500).json({ error: 'Failed to analyze image' });
        }

        const data = await response.json();

        // Extract thinking and text content
        const thinkingContent = data?.content?.find(part => part?.type === 'thinking')?.thinking;
        const textContent = data?.content?.find(part => part?.type === 'text')?.text;

        if (!textContent) {
            return res.status(500).json({ error: 'No response from Claude Vision' });
        }

        if (thinkingContent) {
            console.log('🧠 Claude Thinking Process:', thinkingContent.substring(0, 500) + '...');
        }
        console.log('🤖 Claude Vision response:', textContent);

        // Parse the JSON response
        let result;
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse Claude Vision response:', parseError);
            return res.status(500).json({
                error: 'Failed to parse food analysis',
                rawResponse: textContent
            });
        }

        // Check for error response from Claude
        if (result.error) {
            return res.status(200).json({
                success: false,
                error: result.message || 'Could not analyze the image',
                suggestion: 'Try taking a clearer photo with better lighting'
            });
        }

        // Enhance each food item with additional metadata
        if (result.foods) {
            result.foods = result.foods.map(food => ({
                ...food,
                source: 'photo-ai',
                // Preserve restaurant and dataSource from Claude's response
                restaurant: food.restaurant || result.restaurantIdentified || null,
                dataSource: food.dataSource || 'AI Vision Analysis'
            }));
        }

        const restaurantInfo = result.restaurantIdentified ? ` from ${result.restaurantIdentified}` : '';
        console.log(`✅ Analyzed photo${restaurantInfo}: ${result.foods?.length || 0} items, ${result.totalCalories || 0} total calories`);
        console.log(`📊 Confidence: ${result.overallConfidence || 'unknown'}`);

        if (result.notes) {
            console.log(`📝 Analysis notes: ${result.notes}`);
        }

        res.status(200).json({
            success: true,
            ...result,
            source: 'photo-ai',
            aiThinking: thinkingContent ? true : false
        });

    } catch (error) {
        console.error('Food vision analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze food photo',
            message: error.message
        });
    }
}
