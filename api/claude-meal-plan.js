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
        const { quizData, userId, phase = '1' } = req.body;

        // Validate required data
        if (!quizData) {
            return res.status(400).json({ error: 'Quiz data is required' });
        }

        // Build phase-specific prompt from quiz data
        const prompt = buildMealPlanPrompt(quizData, phase);
        
        console.log(`🎯 Generating meal plan Phase ${phase} for user: ${userId || 'anonymous'}`);
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
        console.log(`✅ Successfully generated meal plan Phase ${phase} for user: ${userId || 'anonymous'}`);

        res.status(200).json({
            success: true,
            phase: phase,
            content: formattedMealPlan,
            metadata: {
                generatedAt: new Date().toISOString(),
                planDuration: quizData.planDuration || '2-week',
                goal: quizData.goal,
                userId: userId || 'anonymous',
                phase: phase
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

function buildMealPlanPrompt(quizData, phase) {
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes Plan' : 'Your Custom Fuel Plan';
    
    // User info for all phases
    const userInfo = `User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}`;
    
    // Meal variety logic
    let varietyInstructions = '';
    if (quizData.mealVariety === 'same-daily') {
        varietyInstructions = 'Same meals every day.';
    } else if (quizData.mealVariety === 'weekday-same') {
        varietyInstructions = 'Days 1-5: same meals. Days 6-7: different weekend meals.';
    } else if (quizData.mealVariety === 'full-variety') {
        varietyInstructions = 'Different meals every day.';
    } else {
        varietyInstructions = '2-3 rotating options for breakfast/lunch, varied dinners.';
    }
    
    if (phase === '1') {
        return `Create Week 1 of a meal plan (Days 1-7). Start with: # 🔥 ${title} - Week 1

${userInfo}

${varietyInstructions}

Format each day:
### Day X:
**🍳 Breakfast:** [meal with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg
**🥗 Lunch:** [meal with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg
**🍽️ Dinner:** [meal with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg
**🍎 Snacks:** [snack with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg

**📊 Day X Totals:** X calories | Protein: Xg | Carbs: Xg | Fat: Xg

Include Days 1, 2, 3, 4, 5, 6, 7 then:

**📈 Week 1 Summary:**
Total: X calories | Protein: Xg | Carbs: Xg | Fat: Xg
Daily Average: X cal | Xg protein | Xg carbs | Xg fat

## 🛒 Week 1 Shopping List
**Proteins:** [list with exact quantities]
**Vegetables:** [list with exact quantities]
**Fruits:** [list with exact quantities]
**Dairy & Eggs:** [list with exact quantities]
**Pantry Items:** [list with exact quantities]
**Spices & Condiments:** [list]
**Cost Estimate:** $X

NO intro text. Start with title.`;
    }
    
    if (phase === '2') {
        return `Create Week 2 of the meal plan (Days 8-14). Start with: ## Week 2 - Days 8-14

${userInfo}

${varietyInstructions}

Format each day:
### Day X:
**🍳 Breakfast:** [meal with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg
**🥗 Lunch:** [meal with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg
**🍽️ Dinner:** [meal with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg
**🍎 Snacks:** [snack with portions] - Calories: X | Protein: Xg | Carbs: Xg | Fat: Xg

**📊 Day X Totals:** X calories | Protein: Xg | Carbs: Xg | Fat: Xg

Include Days 8, 9, 10, 11, 12, 13, 14 then:

**📈 Week 2 Summary:**
Total: X calories | Protein: Xg | Carbs: Xg | Fat: Xg
Daily Average: X cal | Xg protein | Xg carbs | Xg fat

## 🛒 Week 2 Shopping List
**Proteins:** [list with exact quantities]
**Vegetables:** [list with exact quantities]
**Fruits:** [list with exact quantities]
**Dairy & Eggs:** [list with exact quantities]
**Pantry Items:** [list with exact quantities]
**Spices & Condiments:** [list]
**Cost Estimate:** $X

NO intro text. Start with Week 2 header.`;
    }
    
    if (phase === '3') {
        return `Create nutritional summary and tips. Start with: ## 📊 Complete Plan Summary

${userInfo}

**📈 14-Day Overview:**
- Total Calories: X (avg X/day)
- Total Protein: Xg (avg Xg/day)
- Total Carbs: Xg (avg Xg/day) 
- Total Fat: Xg (avg Xg/day)
- Total Fiber: Xg (avg Xg/day)

**🎯 Weekly Breakdown:**
Week 1 Average: X cal | Xg protein | Xg carbs | Xg fat
Week 2 Average: X cal | Xg protein | Xg carbs | Xg fat

**How this supports your ${quizData.goal} goal:**
[2-3 sentences explaining nutritional strategy]

**📝 Meal Prep Tips:**
- [3-4 practical meal prep suggestions]
- [Storage and preparation advice]
- [Time-saving tips]

**💰 Budget Summary:**
- Week 1 + Week 2 Total Cost: ~$X
- [2-3 money-saving suggestions]

NO intro text. Start with summary header.`;
    }
    
    // Default fallback
    return buildLegacyPrompt(quizData);
}

// Fallback to original prompt if phase not recognized
function buildLegacyPrompt(quizData) {
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes' : 'Your Custom Fuel Plan';
    return `Create a 14-day meal plan. Start with: # 🔥 ${title}

User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}

Format: Days 1-14 with breakfast/lunch/dinner/snacks + calories, then shopping lists.
NO intro text. Start with title.`;
}

function formatMealPlanForApp(rawMealPlan) {
    // Return the raw meal plan without HTML conversion
    // The frontend will handle the formatting
    return rawMealPlan;
}

