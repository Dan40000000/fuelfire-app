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

        console.log(`🎯 Generating complete meal plan for user: ${userId || 'anonymous'}`);
        console.log(`📊 Quiz data includes: ${Object.keys(quizData).join(', ')}`);
        
        // Check if API key exists
        if (!process.env.CLAUDE_API_KEY) {
            console.error('❌ CLAUDE_API_KEY not found in environment variables');
            throw new Error('API configuration error - Claude API key not configured');
        }
        
        console.log('🔑 API Key found, generating 4-part meal plan...');

        // Generate all 4 parts in parallel
        const [week1, week2, shopping, title] = await Promise.all([
            generateWeek1(quizData),
            generateWeek2(quizData),
            generateShoppingList(quizData),
            generateTitle(quizData)
        ]);

        // Combine all parts
        const completeMealPlan = `${title}\n\n${week1}\n\n${week2}\n\n${shopping}`;

        console.log(`✅ Successfully generated complete meal plan for user: ${userId || 'anonymous'}`);

        res.status(200).json({
            success: true,
            content: completeMealPlan,
            metadata: {
                generatedAt: new Date().toISOString(),
                planDuration: '2-week',
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

async function callClaudeAPI(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function generateTitle(quizData) {
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes Plan' : 'Your Custom Fuel Plan';
    return `# 🔥 ${title}`;
}

async function generateWeek1(quizData) {
    const userInfo = `User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}`;

    const varietyInstructions = getVarietyInstructions(quizData.mealVariety);

    const prompt = `Create Week 1 (Days 1-7) of a meal plan.

${userInfo}
${varietyInstructions}

Format each day exactly like this:
### Day X:
**🍳 Breakfast:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🥗 Lunch:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🍽️ Dinner:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🍎 Snacks:** [snack] - Cal: X | P: Xg | C: Xg | F: Xg
**Day Total:** X cal | P: Xg | C: Xg | F: Xg

Include ALL 7 days. Keep meal descriptions concise. ALWAYS include complete macro totals for each day. Start with Day 1.`;

    return await callClaudeAPI(prompt);
}

async function generateWeek2(quizData) {
    const userInfo = `User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}`;

    const varietyInstructions = getVarietyInstructions(quizData.mealVariety);

    const prompt = `Create Week 2 (Days 8-14) of a meal plan.

${userInfo}
${varietyInstructions}

Format each day exactly like this:
### Day X:
**🍳 Breakfast:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🥗 Lunch:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🍽️ Dinner:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🍎 Snacks:** [snack] - Cal: X | P: Xg | C: Xg | F: Xg
**Day Total:** X cal | P: Xg | C: Xg | F: Xg

Include ALL 7 days (Days 8-14). Keep meal descriptions concise. ALWAYS include complete macro totals for each day. Start with Day 8.`;

    return await callClaudeAPI(prompt);
}

async function generateShoppingList(quizData) {
    const prompt = `Create a complete shopping list for a 14-day meal plan.

User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}

## 🛒 Complete Shopping List
**Proteins:** [list with quantities for 14 days]
**Vegetables:** [list with quantities for 14 days]
**Fruits:** [list with quantities for 14 days]
**Dairy & Eggs:** [list with quantities for 14 days]
**Pantry Items:** [list with quantities for 14 days]
**Cost Estimate:** $X

Keep it organized and practical. Include quantities needed for 2 weeks.`;

    return await callClaudeAPI(prompt);
}

function getVarietyInstructions(mealVariety) {
    if (mealVariety === 'same-daily') {
        return 'Same meals every day.';
    } else if (mealVariety === 'weekday-same') {
        return 'Days 1-5: same meals. Days 6-7: different weekend meals.';
    } else if (mealVariety === 'full-variety') {
        return 'Different meals every day.';
    } else {
        return '2-3 rotating options for breakfast/lunch, varied dinners.';
    }
}

function buildMealPlanPrompt(quizData, phase) {
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes Plan' : 'Your Custom Fuel Plan';
    
    const userInfo = `User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}`;
    
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
    
    // Optimized for complete generation within token limits
    return `Create a complete 14-day meal plan. Be concise but complete. Start with: # 🔥 ${title}

${userInfo}
${varietyInstructions}

Format each day:
### Day X:
**🍳 Breakfast:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🥗 Lunch:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg  
**🍽️ Dinner:** [meal] - Cal: X | P: Xg | C: Xg | F: Xg
**🍎 Snacks:** [snack] - Cal: X | P: Xg | C: Xg | F: Xg
**Day Total:** X cal

Include ALL Days 1-14. Keep meal descriptions concise (1-2 lines max per meal).

Then add:
## 🛒 Shopping List
**Proteins:** [concise list]
**Vegetables:** [concise list]
**Fruits:** [concise list]
**Dairy & Eggs:** [concise list]
**Pantry Items:** [concise list]
**Cost Estimate:** $X

## 📝 Meal Prep Tips
[2-3 brief tips]

IMPORTANT: Complete the ENTIRE 14-day plan and ALL sections. Do not ask to continue - generate everything.`;
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

