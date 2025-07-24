// Claude AI Meal Plan Generation API
// This routes all user requests through your Claude Pro account

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

        // Call Claude API using your account credentials
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY, // Your Claude API key
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
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
Create a **comprehensive ${quizData.planDuration || '2-week'} meal plan** that includes:

## 1. DAILY MEAL PLANS
For each day, provide:
- **Breakfast** with exact measurements (e.g., "1 cup oatmeal, 1/2 cup blueberries, 2 tbsp almond butter")
- **Lunch** with exact measurements
- **Dinner** with exact measurements
- **Snacks** (if applicable based on meals per day preference)
- **Daily Calories & Macros** (Protein/Carbs/Fat breakdown)

## 2. SHOPPING LISTS
- **Week 1 Shopping List** with exact quantities needed
- **Week 2 Shopping List** with exact quantities needed
- Organize by category (Proteins, Vegetables, Fruits, Pantry Items, etc.)
- Include total estimated cost if possible

## 3. MEAL PREP INSTRUCTIONS
- **Sunday Prep Guide** (what to prepare ahead)
- **Storage Instructions** for prepped items
- **Cooking Tips** based on their skill level

## 4. NUTRITIONAL SUMMARY
- **Daily Average**: Calories, Protein, Carbs, Fat
- **Weekly Totals** and how it aligns with their goals
- **Key Nutrients** highlighted (fiber, vitamins, etc.)

## FORMATTING REQUIREMENTS:
- Use clear headers with emojis (🍳, 🥗, 🛒)
- Make it visually appealing and easy to follow
- Include motivational elements
- Ensure all measurements are precise (oz, cups, tbsp, etc.)
- Make sure recipes match their cooking skill level
- Consider their available kitchen equipment
- Stay within their budget range
- Focus on foods they actually like

Create an amazing, personalized meal plan that will help them achieve their ${quizData.goal} goal while being practical and delicious!`;
}

function formatMealPlanForApp(rawMealPlan) {
    let formatted = rawMealPlan;
    
    // Convert markdown-style headers to HTML with FuelFire styling
    formatted = formatted.replace(/^# (.*$)/gm, '<h1 class="plan-title">🎯 $1</h1>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2 class="section-header">$1</h2>');
    formatted = formatted.replace(/^### (.*$)/gm, '<h3 class="day-header">$1</h3>');
    
    // Convert bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>');
    
    // Convert line breaks and create paragraphs
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = '<p>' + formatted + '</p>';
    
    // Style different sections with CSS classes
    formatted = addFuelFireStyling(formatted);
    
    return formatted;
}

function addFuelFireStyling(content) {
    // Style meal plans with special containers
    content = content.replace(/(Day \d+.*?(?=Day \d+|Week \d+ Shopping|$))/gs, 
        '<div class="day-plan">$1</div>');
    
    // Style shopping lists
    content = content.replace(/(Week \d+ Shopping List.*?(?=Week \d+ Shopping|Meal Prep|Nutritional Summary|$))/gs, 
        '<div class="shopping-list">$1</div>');
    
    // Style individual meals
    content = content.replace(/(🍳 Breakfast:|🥗 Lunch:|🍽️ Dinner:|🍎 Snack:)(.*?)(?=🍳|🥗|🍽️|🍎|<\/div>)/gs, 
        '<div class="meal-item"><strong>$1</strong><div class="meal-details">$2</div></div>');
    
    // Style nutritional information
    content = content.replace(/(Calories:.*?Fat:.*?)/g, 
        '<div class="nutrition-info">$1</div>');
    
    // Style prep instructions
    content = content.replace(/(Prep Instructions:.*?(?=Storage|$))/gs,
        '<div class="prep-instructions">$1</div>');
    
    return content;
}