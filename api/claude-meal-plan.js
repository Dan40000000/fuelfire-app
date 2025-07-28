// Claude AI Meal Plan Generation API
// This routes all user requests through your Claude Pro account
// Last updated: July 25, 2025 - Added better error handling

export default async function handler(req, res) {
    // Set CORS headers for frontend access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { quizData, userId } = req.body;

        // Validate required data
        if (!quizData) {
            return res.status(400).json({ error: 'Quiz data is required' });
        }

        // Build comprehensive prompt from quiz data
        const prompt = buildMealPlanPrompt(quizData);
        
        console.log(`🎯 Generating meal plan for user: ${userId || 'anonymous'}`);
        console.log(`📊 Quiz data includes: ${Object.keys(quizData).join(', ')}`);
        
        // Check if API key exists
        if (!process.env.CLAUDE_API_KEY) {
            console.error('❌ CLAUDE_API_KEY not found in environment variables');
            console.error('Available env vars:', Object.keys(process.env));
            throw new Error('API configuration error - Claude API key not configured');
        }
        
        console.log('🔑 API Key found, length:', process.env.CLAUDE_API_KEY.length);
        console.log('🔑 API Key prefix:', process.env.CLAUDE_API_KEY.substring(0, 15) + '...');

        // Call Claude API using your account credentials
        // Log the request for debugging
        const requestBody = {
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 8192, // Haiku maximum limit
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };
        
        console.log('📤 Sending to Claude API with body length:', JSON.stringify(requestBody).length);
        
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY, // Your Claude API key
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!claudeResponse.ok) {
            const errorData = await claudeResponse.text();
            console.error('Claude API Error Status:', claudeResponse.status);
            console.error('Claude API Error Response:', errorData);
            
            // Parse error if it's JSON
            let errorMessage = `Claude API error: ${claudeResponse.status}`;
            try {
                const errorJson = JSON.parse(errorData);
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
            } catch (e) {
                // Not JSON, use raw text
            }
            
            throw new Error(errorMessage);
        }

        const claudeData = await claudeResponse.json();
        const rawMealPlan = claudeData.content[0].text;

        // Format the meal plan for beautiful display
        const formattedMealPlan = formatMealPlanForApp(rawMealPlan);

        // Log success (for your monitoring)
        console.log(`✅ Successfully generated meal plan for user: ${userId || 'anonymous'}`);

        res.status(200).json({
            success: true,
            mealPlan: formattedMealPlan,
            metadata: {
                generatedAt: new Date().toISOString(),
                planDuration: quizData.planDuration || '2-week',
                goal: quizData.goal,
                userId: userId || 'anonymous'
            }
        });

    } catch (error) {
        console.error('❌ Error generating meal plan:', error);
        console.error('Full error:', error.stack);
        res.status(500).json({
            error: 'Failed to generate meal plan',
            message: 'Our AI chef is taking a quick break. Please try again in a moment!',
            details: error.message // Always show error details for debugging
        });
    }
}

function buildMealPlanPrompt(quizData) {
    // Ultra-simplified prompt to avoid token limits
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes' : 'Your Custom Fuel Plan';
    
    // Simplified meal variety instructions
    let varietyInstructions = '';
    if (quizData.mealVariety === 'same-daily') {
        varietyInstructions = 'Same meals every day for 14 days.';
    } else if (quizData.mealVariety === 'weekday-same') {
        varietyInstructions = 'Mon-Fri: same meals. Sat-Sun: different meals. Week 2 repeats week 1.';
    } else if (quizData.mealVariety === 'full-variety') {
        varietyInstructions = 'Different meals every day.';
    } else {
        varietyInstructions = '2-3 breakfast/lunch options rotating. Varied dinners.';
    }
    
    return `Create a 14-day meal plan. Start with: # 🔥 ${title}

User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}

${varietyInstructions}

Format each day:
### Day X:
**🍳 Breakfast:** [meal] - Cal: X
**🥗 Lunch:** [meal] - Cal: X  
**🍽️ Dinner:** [meal] - Cal: X
**🍎 Snacks:** [snack] - Cal: X
**Total:** X cal

Include all 14 days, then:

## 🛒 Week 1 Shopping
**Proteins:** [list with quantities]
**Vegetables:** [list with quantities]
**Fruits:** [list with quantities]
**Dairy:** [list with quantities]
**Pantry:** [list with quantities]

## 🛒 Week 2 Shopping
[Same categories]

## 📊 Summary
Daily avg: X cal, Xg protein, Xg carbs, Xg fat

NO intro text. Start with title. Include ALL 14 days + shopping lists.`;
}

function formatMealPlanForApp(rawMealPlan) {
    // Return the raw meal plan without HTML conversion
    // The frontend will handle the formatting
    return rawMealPlan;
}

