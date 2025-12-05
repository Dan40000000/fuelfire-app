# 🔥 FUELFIRE / WELLFIT APP - COMPLETE PROJECT RUNDOWN

**Last Updated:** November 10, 2025
**Project Status:** ✅ READY FOR TESTING
**Current Version:** 2.1.0

---

## 📍 PROJECT LOCATION

**Main Project Directory:**
```
/Users/danperry/Apps/FuelFire/fuelfire-app/
```

**Xcode Workspace (iOS):**
```
/Users/danperry/Apps/FuelFire/fuelfire-app/ios/App/App.xcworkspace
```
⚠️ **ALWAYS open `.xcworkspace` NOT `.xcodeproj`**

---

## 🎯 WHAT IS THIS APP?

**App Name:** Well Fit Pro
**Bundle ID:** com.wellfit.app
**Type:** Capacitor-based hybrid mobile app (iOS/Android)

**Description:** AI-powered fitness and nutrition tracking app with:
- Workout tracking and routines
- Calorie/macro tracking
- AI meal planning (Claude AI integration)
- Supplement recommendations
- Health data sync (Apple Health/Google Fit)
- Voice recognition for food logging
- Barcode scanning

---

## 📦 TECH STACK

### Frontend
- **Framework:** Vanilla JavaScript (ES6+)
- **UI:** HTML5, CSS3 (no framework)
- **Styling:** Carolina Blue theme, mobile-first design
- **Storage:** LocalStorage for offline data

### Mobile Platform
- **Framework:** Capacitor 7.4.3
- **iOS:** Native iOS app
- **Android:** Native Android app

### Key Capacitor Plugins
- `@capacitor/camera` - Photo capture
- `@capacitor-community/speech-recognition` - Voice input
- `@capacitor-mlkit/barcode-scanning` - Barcode scanner
- `@capgo/capacitor-health` - Apple Health/Google Fit sync

### Backend/API
- **Hosting:** Vercel (serverless functions)
- **AI:** Claude AI (Anthropic API)
- **Food Data:** USDA FoodData Central API
- **Database:** None (local storage only currently)

---

## 📂 PROJECT STRUCTURE

```
fuelfire-app/
├── public/                          ← Main web files (deployed to Vercel)
│   ├── index.html                   ← Main dashboard
│   ├── app.js                       ← Main app logic (334KB!)
│   ├── styles.css                   ← Main styles
│   ├── global-nav.js                ← Navigation system
│   ├── auth.js & fuelfire-auth.js   ← Authentication
│   │
│   ├── calorie-tracker.html         ← Food logging
│   ├── health-dashboard.html        ← Health metrics sync
│   ├── in-workout.html              ← Active workout tracking
│   │
│   ├── workout-*.html               ← Workout pages by muscle group
│   │   ├── workout-chest.html
│   │   ├── workout-back.html
│   │   ├── workout-legs.html
│   │   ├── workout-arms.html
│   │   ├── workout-shoulders.html
│   │   ├── workout-calves.html
│   │   ├── workout-cardio.html
│   │   └── workout-core.html
│   │
│   ├── meal-*.html                  ← Meal plan pages
│   │   ├── meal-chicken.html
│   │   ├── meal-beef.html
│   │   ├── meal-pork.html
│   │   ├── meal-seafood.html
│   │   ├── meal-protein-bowls.html
│   │   ├── meal-wraps.html
│   │   └── meal-keto.html
│   │
│   ├── supplements-*.html           ← Supplement guides
│   │   ├── supplements-muscle-building.html
│   │   ├── supplements-pre-workout.html
│   │   ├── supplements-recovery.html
│   │   ├── supplements-brain.html
│   │   ├── supplements-heart.html
│   │   └── (10+ more)
│   │
│   └── images/                      ← App assets
│
├── api/                             ← Vercel serverless functions
│   ├── _lib/
│   │   └── anthropic.js             ← Claude AI config (centralized)
│   ├── ai-food-parser.js            ← Parse food descriptions w/ AI
│   ├── claude-meal-plan.js          ← Generate meal plans w/ AI
│   ├── generate-meal-plan.js        ← Meal plan wrapper
│   ├── test-api-key.js              ← API key validator
│   ├── treadmill-vision.js          ← OCR for treadmill displays
│   └── usda-food-search.js          ← USDA food database search
│
├── ios/                             ← iOS native project
│   └── App/
│       ├── App.xcworkspace          ← Open this in Xcode!
│       ├── App.xcodeproj
│       ├── Pods/                    ← CocoaPods dependencies
│       └── App/
│           ├── public/              ← Synced from main public/
│           └── AppDelegate.swift
│
├── android/                         ← Android native project
│   ├── app/
│   └── gradle files
│
├── capacitor.config.json            ← Capacitor configuration
├── package.json                     ← Dependencies & scripts
├── vercel.json                      ← Vercel deployment config
│
├── .env.local                       ← Local environment variables
├── .env.production                  ← Production env vars
│
└── BACKUPS:
    ├── fuelfire-app-backup-20250818-152144.tar.gz
    ├── fuelfire-app-backup-20251021-121121.tar.gz
    └── fuelfire-app-backup-20251029-165839.tar.gz
```

---

## 🔑 KEY FILES EXPLAINED

### `public/index.html` (296KB)
- Main dashboard/home page
- Shows daily stats, workout streak, quotes
- Navigation hub to all features

### `public/app.js` (334KB)
- **HUGE** main JavaScript file
- Handles most app logic
- Contains workout database, meal tracking, etc.
- ⚠️ **Note:** This is getting very large, consider refactoring

### `public/calorie-tracker.html` (181KB)
- Food logging interface
- Integrates with AI food parser
- USDA food database search
- Macro/calorie tracking

### `public/health-dashboard.html` (115KB)
- Apple Health / Google Fit integration
- Syncs steps, heart rate, workouts, etc.
- Uses `@capgo/capacitor-health` plugin

### `api/claude-meal-plan.js` (19KB)
- Claude AI meal plan generation
- Takes user preferences (diet type, calories, etc.)
- Returns 7-day meal plan with recipes

### `capacitor.config.json`
```json
{
  "appId": "com.wellfit.app",
  "appName": "Well Fit Pro",
  "webDir": "public"
}
```

---

## 🚀 HOW TO RUN THE APP

### Web Development (Local)
```bash
cd /Users/danperry/Apps/FuelFire/fuelfire-app
npm run dev
# Opens on http://localhost:3000
```

### iOS (Xcode)
```bash
# 1. Sync Capacitor
cd /Users/danperry/Apps/FuelFire/fuelfire-app
npx cap sync ios

# 2. Open in Xcode
open ios/App/App.xcworkspace

# 3. In Xcode:
#    - Select target device/simulator
#    - Press Cmd+R to build & run
```

### Android (Android Studio)
```bash
# 1. Sync Capacitor
npx cap sync android

# 2. Open Android Studio
npx cap open android

# 3. In Android Studio:
#    - Select device/emulator
#    - Press Run button
```

### Deploy to Vercel
```bash
npm run deploy
# OR
vercel --prod
```

---

## 🔐 ENVIRONMENT VARIABLES

### Required for AI Features
```bash
# .env.local or .env.production
CLAUDE_API_KEY=sk-ant-...        # Anthropic API key
USDA_API_KEY=...                 # USDA FoodData Central
```

### Setting in Vercel
1. Go to Vercel dashboard
2. Select project
3. Settings → Environment Variables
4. Add `CLAUDE_API_KEY` and `USDA_API_KEY`

---

## 📱 KEY FEATURES

### ✅ Working Features
1. **Workout Tracking** - 8 muscle group pages with exercises
2. **Calorie Tracking** - Manual food logging with search
3. **Meal Plans** - Pre-made meal plans by protein type
4. **Supplements** - 12 supplement guide pages
5. **Health Sync** - Apple Health integration (iOS)
6. **Voice Input** - Speech recognition for food logging
7. **Barcode Scanner** - Scan food barcodes
8. **AI Meal Planning** - Claude AI generates custom meal plans
9. **Progress Tracking** - Weight, measurements, photos
10. **Daily Quotes** - Motivational quotes

### ⚠️ Features Needing Testing
1. **AI Food Parser** - Natural language food input
2. **Treadmill Vision** - OCR to read treadmill displays
3. **Android Build** - Only iOS has been tested recently
4. **Health Totals** - Some HealthKit metrics

### 🚧 Future Features (Not Implemented)
- User accounts / authentication
- Cloud sync
- Social features
- Workout video integration
- Push notifications
- Dark mode

---

## 🐛 KNOWN ISSUES

### Fixed Previously (Per HANDOFF doc)
- ✅ Duplicate Xcode projects causing confusion
- ✅ Multiple folder versions
- ✅ Pods installation issues

### Current Issues to Watch
1. **app.js size** - 334KB is huge, may need refactoring
2. **No user accounts** - All data is local only
3. **iOS focus** - Android may have untested features
4. **API costs** - Claude AI calls can get expensive

---

## 📋 IMPORTANT COMMANDS

### Capacitor Sync
```bash
# After changing web files, sync to native projects
npx cap sync

# Or specific platform
npx cap sync ios
npx cap sync android
```

### Pod Install (iOS)
```bash
cd ios/App
pod install --repo-update
```

### Clean Build
```bash
# iOS - In Xcode
Shift+Cmd+K (Clean Build Folder)

# Android - In terminal
cd android
./gradlew clean
```

### Verify Anthropic Model
```bash
npm run verify:anthropic
# Ensures all API calls use correct Claude model names
```

---

## 🧪 TESTING CHECKLIST

When testing, verify:

- [ ] App opens in Xcode without errors
- [ ] Builds successfully (Cmd+B)
- [ ] Runs on simulator (Cmd+R)
- [ ] Main dashboard loads
- [ ] Navigation works between pages
- [ ] Workout pages load correctly
- [ ] Calorie tracker opens
- [ ] Food search works
- [ ] AI meal plan generates (if API key set)
- [ ] Health sync works (real device only)
- [ ] Barcode scanner works (real device only)
- [ ] Voice input works

---

## 📞 COMMON ISSUES & SOLUTIONS

### Issue: Xcode won't build
**Solution:**
```bash
cd /Users/danperry/Apps/FuelFire/fuelfire-app/ios/App
pod install
# Then clean build in Xcode (Shift+Cmd+K)
```

### Issue: Changes not showing in app
**Solution:**
```bash
npx cap sync ios
# Then rebuild in Xcode
```

### Issue: API not working
**Solution:**
- Check Vercel deployment logs
- Verify environment variables are set
- Check `api/_lib/anthropic.js` for model names

### Issue: Multiple Xcode projects opening
**Solution:**
```bash
# Find all workspaces
find /Users/danperry/Apps/FuelFire -name "App.xcworkspace" | grep -v Pods | grep -v DerivedData

# Should only show ONE result. If more, delete extras.
```

---

## 🎯 INSTRUCTIONS FOR NEXT AI

### When Taking Over This Project:

1. **Read This Document First!**

2. **Verify Project Location:**
   ```bash
   ls /Users/danperry/Apps/FuelFire/fuelfire-app
   ```

3. **Check if app works:**
   - Ask user to open in Xcode
   - Verify it builds and runs

4. **Before Making Changes:**
   - Work in `/Users/danperry/Apps/FuelFire/fuelfire-app/` ONLY
   - Never extract backups or create duplicate folders
   - Remember to sync changes: `npx cap sync`

5. **For Xcode Issues:**
   - Point user to `HOW-TO-OPEN-XCODE.md`
   - Only open `App.xcworkspace` (never `.xcodeproj`)

6. **For Code Changes:**
   - Main logic: `public/app.js`
   - Styles: `public/styles.css`
   - After changes: `npx cap sync ios`

---

## 📚 DOCUMENTATION FILES

- `README.md` - Basic project info
- `HANDOFF-FOR-NEXT-AI.md` - Previous cleanup details (Nov 5)
- `HOW-TO-OPEN-XCODE.md` - User instructions for Xcode
- `PROJECT-RUNDOWN.md` - **THIS FILE** - Complete overview

---

## 🔗 USEFUL LINKS

- **GitHub:** https://github.com/Dan40000000/fuelfire-app
- **Vercel:** (check `.vercel` folder for deployment URL)
- **Claude API:** https://console.anthropic.com
- **USDA API:** https://fdc.nal.usda.gov/api-guide.html
- **Capacitor Docs:** https://capacitorjs.com/docs

---

## ✅ PROJECT STATUS

**Current State:**
- ✅ Code is clean and organized
- ✅ Single working version (no duplicates)
- ✅ All dependencies installed
- ✅ Pods freshly installed
- ✅ Ready for testing in Xcode

**Next Steps:**
1. User tests app in Xcode
2. Verify all features work
3. Fix any bugs found
4. Prepare for App Store submission (if desired)

---

**🔥 This is a well-built fitness app ready for testing!**

The core functionality is complete, and it just needs thorough testing to ensure all features work correctly on both iOS and Android platforms.

---

*Last updated: November 10, 2025 by Claude Code AI*
