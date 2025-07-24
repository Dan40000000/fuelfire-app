# 🤖 Claude AI Integration Setup

## Quick Setup (5 minutes)

### 1. Get Your Claude API Key
1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign in with your Claude Pro account
3. Navigate to **API Keys** section
4. Click **Create Key** 
5. Copy your API key (starts with `sk-ant-api03-`)

### 2. Add API Key to Your App
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your actual API key:
   ```bash
   CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
   NODE_ENV=production
   ```

### 3. Deploy Your App
The app is designed to work with:
- **Vercel** (recommended - free tier perfect for launch)
- **Netlify** 
- **Any Node.js hosting**

#### Vercel Setup (Easiest):
```bash
npm i -g vercel
vercel
# Follow prompts, add environment variables in dashboard
```

### 4. Test It!
1. Open your deployed app
2. Complete the 10-step quiz  
3. Click **Generate My AI Meal Plan**
4. Watch Claude create a personalized plan! 🎉

## 💰 Cost Monitoring

**Your Usage Dashboard:**
- Check usage at [https://console.anthropic.com/usage](https://console.anthropic.com/usage)
- Each meal plan costs ~$0.01-0.03
- Claude Pro gives you plenty of headroom for testing

**Scaling:**
- **0-100 users/day**: Claude Pro ($20/month) is perfect
- **100-1000 users/day**: Still very affordable (~$30-100/month)  
- **1000+ users/day**: Consider Claude for Business

## 🔧 Technical Details

**How It Works:**
1. User completes quiz → Data collected in `quizData`
2. Quiz calls `fuelFireAuth.generateMealPlan(quizData)`
3. Auth system sends request to `/api/claude-meal-plan`
4. API endpoint uses YOUR Claude account to generate plan
5. Beautiful meal plan opens in new tab

**Files Created:**
- `api/claude-meal-plan.js` - Main API endpoint
- `fuelfire-auth.js` - Authentication & request handling
- `enhanced-diet-quiz.html` - Updated with Claude integration

**Security:**
- API key stored securely in environment variables
- Simple session tracking (no sensitive data stored)
- All requests route through your account

## 🚀 Ready to Launch!

Your FuelFire app now has:
✅ **10-step comprehensive quiz**
✅ **Claude AI meal plan generation** 
✅ **Beautiful meal plan display**
✅ **Print functionality**
✅ **Usage tracking**
✅ **Error handling**

**Next Steps:**
1. Get your Claude API key
2. Deploy to Vercel/Netlify  
3. Share with friends and test!
4. Scale up as you get users! 

## 🔥 You're About to Launch Something Amazing!

This integration gives your users **professional-quality meal plans** that would normally cost $50-100 from a nutritionist, generated instantly using AI. 

**Pure value delivery!** 🎯