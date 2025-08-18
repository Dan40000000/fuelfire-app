# USDA API Setup for FuelFire Calorie Tracker

## Getting Your Free USDA API Key

1. **Visit the USDA API Key Registration**
   - Go to: https://fdc.nal.usda.gov/api-key-signup.html
   - Fill out the simple form with your email and organization (can be "Personal Use")
   - Check your email for the API key

2. **Add API Key to Vercel Environment Variables**
   - Go to your Vercel dashboard: https://vercel.com/dashboard
   - Select your fuelfire-app project
   - Go to Settings → Environment Variables
   - Add a new variable:
     - Name: `USDA_API_KEY`
     - Value: `your-api-key-here`
   - Save and redeploy

3. **Local Development Setup** (optional)
   - Create a `.env.local` file in your project root
   - Add: `USDA_API_KEY=your-api-key-here`
   - The app will work with fallback data without the API key

## Features Enabled with USDA API

✅ **Voice Recognition**: "I ate a burger" → Real USDA burger data
✅ **Smart Search**: Type "chicken" → Get accurate nutrition from USDA database
✅ **Barcode Scanner**: Already uses OpenFoodFacts (free, no key needed)
✅ **Fallback System**: Works without API key using estimated nutrition data

## API Details

- **Database**: USDA FoodData Central
- **Coverage**: 200,000+ foods including branded products
- **Rate Limit**: 1,000 requests/hour (more than enough for personal use)
- **Cost**: 100% FREE
- **Backup**: Automatic fallback to estimated data if API is down

## Current Status

The calorie tracker is fully functional with or without the API key:

- ✅ **Without API Key**: Uses comprehensive fallback database with 25+ common foods
- ✅ **With API Key**: Access to full USDA database with 200,000+ foods
- ✅ **Voice Recognition**: Web Speech API (works on phones)
- ✅ **Barcode Scanner**: QuaggaJS + OpenFoodFacts API
- ✅ **Smart Search**: Real-time search with autocomplete
- ✅ **Quick Add**: Learns from your eating habits

## Testing the Features

1. **Voice**: Say "I ate a chicken sandwich" → Should find USDA chicken sandwich data
2. **Barcode**: Scan any packaged food → Gets nutrition from OpenFoodFacts
3. **Search**: Type "apple" → Returns various apple varieties from USDA
4. **Quick Add**: After logging foods, they appear as quick-add buttons

The app is production-ready and will work great with just the fallback data!