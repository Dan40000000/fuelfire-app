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
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY, // Your Claude API key
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!claudeResponse.ok) {
            const errorData = await claudeResponse.text();
            console.error('Claude API Error:', errorData);
            throw new Error(`Claude API error: ${claudeResponse.status}`);
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
        res.status(500).json({
            error: 'Failed to generate meal plan',
            message: 'Our AI chef is taking a quick break. Please try again in a moment!',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

function buildMealPlanPrompt(quizData) {
    return `# FuelFire AI Meal Plan Generation

You are an expert nutritionist and meal planning specialist creating a comprehensive, personalized meal plan for a FuelFire app user.

## User Profile & Goals:
- **Primary Goal**: ${quizData.goal || 'maintenance'}
- **Age**: ${quizData.age} | **Gender**: ${quizData.gender} | **Weight**: ${quizData.weight}lbs
- **Activity Level**: ${quizData.activity || 'moderate'}
- **Body Type**: ${quizData.bodytype || 'unknown'}
- **Target Calories**: ${quizData.calories || 'auto-calculate based on profile'}

## Dietary Restrictions & Preferences:
- **Allergies**: ${quizData.allergies?.join(', ') || 'None'}
- **Additional Allergies**: ${quizData.otherAllergies || 'None'}
- **Dietary Lifestyle**: ${quizData.dietaryLifestyle || 'No restrictions'}

## Food Preferences:
- **Preferred Meats**: ${quizData.meats?.join(', ') || 'All meats'}
- **Meat Frequency**: ${quizData.meatFrequency || 'regular'}
- **Vegetables**: ${quizData.vegetables?.join(', ') || 'All vegetables'}
- **Fruits**: ${quizData.fruits?.join(', ') || 'All fruits'}

## Exercise & Lifestyle:
- **Exercise Type**: ${quizData.exerciseType || 'mixed'}
- **Exercise Frequency**: ${quizData.exerciseFrequency || '3-4 days/week'}
- **Workout Duration**: ${quizData.workoutDuration || '30-45 minutes'}
- **Fitness Goal**: ${quizData.fitnessGoal || 'general health'}

## Meal Planning Preferences:
- **Meals Per Day**: ${quizData.mealsPerDay || '3'} meals
- **Largest Meal**: ${quizData.largestMeal || 'dinner'}
- **Meal Prep Time**: ${quizData.mealPrepTime || 'moderate'}
- **Meal Variety**: ${quizData.mealVariety || 'some-variety'}
- **Cooking Skill**: ${quizData.cookingSkill || 'intermediate'}
- **Kitchen Equipment**: ${quizData.kitchenEquipment?.join(', ') || 'Basic equipment'}

## Budget & Shopping:
- **Budget Range**: ${quizData.budgetRange || 'moderate'}
- **Preferred Stores**: ${quizData.preferredStores?.join(', ') || 'Any store'}
- **Plan Duration**: ${quizData.planDuration || '2-week'}

## Special Requests:
${quizData.specialRequests || 'None'}

---

# INSTRUCTIONS:
Create a **comprehensive, well-organized ${quizData.planDuration || '2-week'} meal plan** with the following structure:

## 1. 📅 DAILY MEAL PLANS SECTION
**Format each day as:**
### Day 1: [Date]
**🍳 Breakfast:**
- [Meal description with exact measurements]
- Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g

**🥗 Lunch:**
- [Meal description with exact measurements]  
- Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g

**🍽️ Dinner:**
- [Meal description with exact measurements]
- Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g

**🍎 Snacks:** (if applicable)
- [Snack with measurements]

**Daily Total:** [X] calories

## 2. 🛒 SHOPPING LISTS SECTION (CRITICAL - MUST INCLUDE!)
### Week 1 Shopping List
**🥩 Proteins:**
- [Item] - [exact quantity needed]
- [Item] - [exact quantity needed]

**🥬 Vegetables:**  
- [Item] - [exact quantity needed]
- [Item] - [exact quantity needed]

**🍎 Fruits:**
- [Item] - [exact quantity needed]

**🥛 Dairy:**
- [Item] - [exact quantity needed]

**🌾 Pantry/Dry Goods:**
- [Item] - [exact quantity needed]

**Estimated Total Cost: $[X]**

### Week 2 Shopping List
[Same format as Week 1]

## 3. 👨‍🍳 MEAL PREP INSTRUCTIONS
**Sunday Prep (Week 1):**
- [Step-by-step prep instructions]
- [Storage instructions]

**Sunday Prep (Week 2):**
- [Step-by-step prep instructions]

## 4. 📊 NUTRITIONAL SUMMARY
**Daily Averages:**
- Calories: [X]
- Protein: [X]g ([X]%)
- Carbohydrates: [X]g ([X]%)
- Fat: [X]g ([X]%)
- Fiber: [X]g

**How this aligns with your ${quizData.goal} goal:**
[Explanation of nutritional strategy]

## CRITICAL REQUIREMENTS:
- ✅ MUST include detailed shopping lists with exact quantities
- ✅ Use precise measurements (1 cup, 4 oz, 2 tbsp, etc.)
- ✅ Organize content with clear sections and headers
- ✅ Include daily calorie/macro breakdowns
- ✅ Focus on foods from their preferences: ${quizData.meats?.join(', ')}, ${quizData.vegetables?.join(', ')}, ${quizData.fruits?.join(', ')}
- ✅ Match their cooking skill level: ${quizData.cookingSkill}
- ✅ Stay within budget: ${quizData.budgetRange}
- ✅ Consider available equipment: ${quizData.kitchenEquipment?.join(', ')}

## MEAL VARIETY INSTRUCTIONS:
${quizData.mealVariety === 'same-daily' ? '- Use the SAME breakfast, lunch, and dinner every day for easier meal prep' : ''}
${quizData.mealVariety === 'weekday-same' ? '- Use the SAME meals Monday-Friday, but create different meals for weekends' : ''}
${quizData.mealVariety === 'some-variety' ? '- Provide 2-3 options for breakfast and lunch that rotate, dinner can vary daily' : ''}
${quizData.mealVariety === 'full-variety' ? '- Create DIFFERENT meals every single day - maximum variety' : ''}
${quizData.mealVariety === 'office-prep' ? '- Create same meals for Mon/Tue/Thu/Fri (office days) and different for Wed/Sat/Sun (WFH days)' : ''}

Create a professional, organized meal plan that delivers real value and helps them achieve their ${quizData.goal} goal!`;
}

function formatMealPlanForApp(rawMealPlan) {
    // Return the raw meal plan without HTML conversion
    // The frontend will handle the formatting
    return rawMealPlan;
}

