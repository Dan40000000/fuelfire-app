# AI Food Parser Test Guide

## Your Claude API is Now Connected! 🎉

Your API key ending in `-fTe9gAAA` has been added to Vercel and redeployed.

## Quick Test Steps:

### 1. Test Voice Input (Web Browser):
- Open https://fuelfire-app.vercel.app/calorie-tracker.html
- Click the **Voice** button
- Say: "Big Mac with fries and a coke"
- You should see individual items parsed with accurate nutrition

### 2. Test Type Input:
- Click the **Type** button
- Enter: "grilled chicken breast with brown rice and broccoli"
- Should parse into 3 separate items with real nutrition data

### 3. Test Complex Descriptions:
Try these to verify AI parsing:
- "Two slices of pepperoni pizza and a beer"
- "Chipotle burrito bowl with chicken, rice, beans, and guac"
- "Protein shake with banana and peanut butter"

## How to Verify AI is Working:

### ✅ AI is Working If:
- Foods are parsed into individual items (Big Mac + Fries + Coke)
- Nutrition values are accurate (Big Mac = ~563 calories)
- Brand names are recognized (McDonald's, Chipotle, etc.)
- Complex descriptions work ("large iced coffee with 2 sugars")

### ❌ Fallback Mode If:
- You see "(estimated)" in food names
- All items show generic values (350 cal, 15g protein)
- Only basic foods are recognized
- Complex descriptions fail

## Check API Status:

In browser console (F12), you should see:
```
🍔 AI parsing food: "your food description"
🤖 Claude response: [parsed foods array]
✅ AI parsed X foods from: "your query"
```

If you see:
```
Claude API key not configured, using fallback parsing
```
Then the API key isn't loading properly.

## Troubleshooting:

1. **If AI isn't working:**
   - Check Vercel Environment Variables
   - Make sure key name is exactly: `CLAUDE_API_KEY`
   - Redeploy after adding the key

2. **For iOS App Testing:**
   - Voice will use text prompt (iOS WebView limitation)
   - Type the food description when prompted
   - AI parsing still works, just without voice recognition

3. **API Rate Limits:**
   - Your Claude API key has usage limits
   - If you hit limits, it will fall back to basic parsing
   - Check your usage at: https://console.anthropic.com/

## Test Results Log:

Test these and note results:

| Test Case | Expected Result | Working? |
|-----------|----------------|----------|
| "Big Mac" | McDonald's Big Mac, 563 cal | ⬜ |
| "Starbucks venti latte" | Specific drink, ~250 cal | ⬜ |
| "6 oz steak with mashed potatoes" | 2 items, accurate portions | ⬜ |
| "Half a subway footlong" | Recognizes portion size | ⬜ |

## Your API Integration:
- **API Key:** `sk-ant-api03-...fTe9gAAA` ✅ Added
- **Vercel Deploy:** ✅ Completed
- **Endpoint:** `/api/ai-food-parser`
- **Model:** Claude 3.5 Sonnet

The AI should now be providing intelligent food parsing for all your calorie tracking! 🚀