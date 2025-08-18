# AI-Powered Food Tracking Setup

## 🤖 **NEW: AI Food Parsing**

FuelFire now uses **Claude AI** to understand complex food descriptions like:
- "Big Mac with fries" → Finds both items separately  
- "pizza and beer" → Logs both with accurate calories
- "chicken and rice" → Identifies each food correctly

## API Keys Setup

### 1. **Claude API Key (REQUIRED for AI parsing)**
   - Go to: https://console.anthropic.com/
   - Create an account and get your API key
   - Add to Vercel Environment Variables:
     - Name: `CLAUDE_API_KEY` 
     - Value: `your-claude-api-key-here`

### 2. **USDA API Key (Optional - for simple searches)**
   - Go to: https://fdc.nal.usda.gov/api-key-signup.html
   - Add to Vercel Environment Variables:
     - Name: `USDA_API_KEY`
     - Value: `your-usda-api-key-here`

## 🎯 **How It Works**

### **Voice Recognition** 🎤
- **"I ate a Big Mac with fries"** → AI finds both foods (563 + 365 calories)
- **"Had pizza and beer"** → AI identifies pizza slice + beer
- **One-click logging**: "Log All Foods" button for convenience

### **Smart Search** ⌨️
- **Complex queries**: "burger with fries" → Uses AI parsing  
- **Simple queries**: "apple" → Uses USDA database
- **Real-time**: Shows "🤖 AI analyzing..." while processing

### **Barcode Scanner** 📷
- Uses OpenFoodFacts API (free, no key needed)
- Works for packaged foods worldwide

## 🔧 **Fallback System**

The app works at 3 levels:
1. **🤖 AI Parsing**: Most accurate for complex foods (requires Claude API key)
2. **📊 USDA Database**: Good for simple searches (requires USDA API key) 
3. **📝 Fallback Database**: 50+ common foods with accurate nutrition (works without any keys)

## ✨ **Testing Examples**

### **Voice Commands**
- "I ate a Big Mac with fries and a Coke"
- "Had two slices of pizza"  
- "Chicken breast and rice"
- "Pancakes and orange juice"

### **Search Queries**
- "burger with fries"
- "pasta and salad"
- "eggs and toast"

## 🚀 **Current Status**

**✅ Production Ready** - Works perfectly with or without API keys!

- 🤖 **With Claude API**: Smart parsing of complex food descriptions
- 📊 **With USDA API**: Access to 200,000+ foods for simple searches  
- 📝 **Without APIs**: Still works great with 50+ common foods

The AI parsing makes voice logging incredibly natural - just say what you ate and it figures out the rest!