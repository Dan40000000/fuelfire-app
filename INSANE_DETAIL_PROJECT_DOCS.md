# 🔥 FUELFIRE APP - INSANELY DETAILED PROJECT DOCUMENTATION

**FOR NEXT AI: Read this entire document. Everything you need is here.**

---

## 📍 ABSOLUTE FILE LOCATIONS

### Project Root
```
/Users/danperry/Apps/FuelFire/fuelfire-app/
```

**CRITICAL:** ALL commands must be run from this directory. `cd` here first.

### Main Code (Web Assets)
```
/Users/danperry/Apps/FuelFire/fuelfire-app/public/
```
This is where 99% of the app lives. Every HTML, CSS, JS file.

### iOS Native Project
```
/Users/danperry/Apps/FuelFire/fuelfire-app/ios/App/App.xcworkspace
```
**CRITICAL:** ALWAYS open `.xcworkspace` NOT `.xcodeproj` - Xcode will break otherwise.

### API Backend
```
/Users/danperry/Apps/FuelFire/fuelfire-app/api/
```
Serverless functions for Stripe, Firebase, webhooks.

### Environment Files
```
/Users/danperry/Apps/FuelFire/fuelfire-app/.env                    # REAL credentials (git-ignored)
/Users/danperry/Apps/FuelFire/fuelfire-app/.env.example            # Template (safe to commit)
/Users/danperry/Apps/FuelFire/fuelfire-app/.env.local              # Local dev
/Users/danperry/Apps/FuelFire/fuelfire-app/.env.production         # Production
```

---

## 🗂️ COMPLETE FILE STRUCTURE WITH DESCRIPTIONS

### Root Level Files

```
fuelfire-app/
├── package.json                           # Node dependencies & scripts
├── capacitor.config.json                  # Capacitor configuration (app ID, name, webDir)
├── .gitignore                             # Git ignore rules (includes .env)
├── .env                                   # ⚠️ REAL secrets - Firebase & Stripe credentials
├── .env.example                           # Template for environment variables
├── .env.local                             # Local development env vars
├── .env.production                        # Production env vars
├── README.md                              # Basic project readme
├── FIREBASE_SETUP.md                      # Firebase Firestore setup instructions
├── SIMPLE_PAYMENT_SETUP.md                # Stripe & payment setup guide
├── HANDOFF_FOR_NEXT_AI.md                 # Quick handoff document
├── PROJECT_SUMMARY.md                     # Detailed project summary
└── INSANE_DETAIL_PROJECT_DOCS.md          # This file (most detailed)
```

### Public Folder (Main App Code)

```
public/
├── index.html                             # ⭐ MAIN DASHBOARD - Home screen
│   ├── Lines 1-150: Head, styles, hero section
│   ├── Lines 151-203: Quick Actions section (4 cards)
│   ├── Lines 204-244: ⭐ Expert Coaching section (3 cards) - NEW
│   ├── Lines 246-260: Recent Activity section
│   ├── Lines 2271-2323: ⭐ Bottom navigation (5 buttons) - Account button added
│   └── Contains: Daily quotes, calorie overview, health stats, navigation
│
├── account.html                           # ⭐ USER ACCOUNT MANAGEMENT - NEW
│   ├── Lines 1-363: Styles (Carolina Blue design system)
│   ├── Lines 366-390: Profile card (avatar, name, email)
│   ├── Lines 393-408: Account stats grid (4 stats)
│   ├── Lines 411-427: Subscription management (Premium/Pro/Elite)
│   ├── Lines 430-438: Payment methods display
│   ├── Lines 441-460: Purchase history (recent orders)
│   ├── Lines 463-494: App settings (toggles for notifications, etc.)
│   ├── Lines 497-519: Account actions (password, export, delete)
│   ├── Lines 531-600: JavaScript functions for all interactions
│   └── PRICING: Elite $96/mo, Premium $15/mo, Core $6/mo
│
├── expert-coaching.html                   # ⭐ 1-ON-1 COACHING BOOKING - NEW
│   ├── 6 expert profiles (3 trainers, 3 nutritionists)
│   ├── Session packages: 1/$100, 4/$360, 8/$640, 12/$840
│   ├── Booking form: expert selection, date, time, focus area
│   ├── Stripe checkout integration (placeholder at line ~280)
│   └── Links to expert-profiles.js for data
│
├── expert-meal-plans.html                 # ⭐ MEAL PLANS LIBRARY - NEW
│   ├── 6 pre-made meal plans ($99-$199)
│   ├── Categories: fat-loss, muscle-building, performance, health
│   ├── Filter functionality
│   ├── Each plan: duration, calories, macros, features, expert
│   ├── Purchase buttons (Stripe placeholder at line ~265)
│   └── Plans: Fat Loss $149, Muscle Building $199, Performance $169, etc.
│
├── expert-workout-plans.html              # ⭐ WORKOUT PROGRAMS - NEW
│   ├── 6 workout programs ($129-$199)
│   ├── Categories: strength, hypertrophy, endurance, fat-loss
│   ├── Filter functionality
│   ├── Each program: duration, frequency, level, features
│   ├── Purchase buttons (Stripe placeholder at line ~286)
│   └── Programs: Strength $179, Hypertrophy $199, Endurance $169, etc.
│
├── expert-profiles.js                     # ⭐ EXPERT DATABASE - NEW
│   ├── Lines 1-109: 6 expert profiles (trainers & nutritionists)
│   ├── Lines 111-141: Session package pricing
│   ├── Lines 143-161: Helper functions
│   │   ├── getExpertById(id)
│   │   ├── getExpertsByType(type)
│   │   └── calculateSessionCost(packageType, sessions)
│   └── Export for use in other pages
│
├── calorie-tracker.html                   # FOOD/CALORIE LOGGING
│   ├── Manual macro entry
│   ├── AI-assisted meal logging (Claude API)
│   ├── Daily calorie goals
│   ├── Meal history
│   └── Macro breakdown (protein, carbs, fat)
│
├── workout-quiz.html                      # WORKOUT SELECTOR
│   ├── Quiz to find best workout program
│   ├── Links to workout programs
│   └── Recommendations based on goals
│
├── health-dashboard.html                  # APPLE HEALTH INTEGRATION
│   ├── Display steps, calories, heart rate
│   ├── Sync with Apple Health via Capacitor
│   ├── Export workout data
│   └── Health metrics visualization
│
├── coaching-scheduler.html                # BASIC SCHEDULER (old version)
│   └── Simpler version of coaching scheduling
│
├── subscriptions.html                     # ADMIN DASHBOARD
│   ├── View all user subscriptions
│   ├── Track subscription events
│   ├── Displays data from Firebase/Firestore
│   └── Real-time updates when Firebase connected
│
├── workout-techniques.html                # WORKOUT EDUCATION (not in nav anymore)
│   └── Exercise technique guides
│
├── styles.css                             # ⭐ GLOBAL STYLES
│   ├── Lines 1-47: Reset, root variables, touch handling
│   ├── Lines 30-47: ⭐ CSS VARIABLES (COLOR SYSTEM)
│   │   ├── --carolina-blue: #4B9CD3 (primary brand color)
│   │   ├── --carolina-dark: #13294B (navy text)
│   │   ├── --carolina-light: #7BAFD4 (light accent)
│   │   ├── --light-bg: #F0F7FC (page background)
│   │   ├── --card-bg: #F5FAFD (card backgrounds)
│   │   ├── --gradient-1: linear-gradient(135deg, #4B9CD3 0%, #3A7CA5 100%)
│   │   ├── --gradient-2: linear-gradient(135deg, #5DADE2 0%, #4B9CD3 100%)
│   │   └── --gradient-3: linear-gradient(135deg, #7BAFD4 0%, #5DADE2 100%)
│   ├── Lines 49-82: Phone container, screen layout
│   ├── Lines 84-100: Status bar styling
│   └── Remaining: Button styles, cards, navigation, etc.
│
├── workout-database.js                    # EXERCISE LIBRARY
│   ├── Complete exercise database
│   ├── Exercise categories
│   ├── Form video links
│   └── Muscle group mapping
│
├── daily-quotes.js                        # MOTIVATIONAL QUOTES
│   ├── 100+ motivational quotes
│   ├── Random selection logic
│   └── Quote shuffling
│
├── health-sync.js                         # APPLE HEALTH API WRAPPER
│   ├── Read steps, calories, heart rate
│   ├── Write workout data
│   ├── Permission handling
│   └── Capacitor Health plugin integration
│
├── global-nav.js                          # NAVIGATION LOGIC
│   ├── Bottom nav state management
│   ├── Page transitions
│   └── Active state handling
│
└── quick-food-entry.js                    # QUICK FOOD LOGGER
    ├── Modal food entry
    ├── AI parsing integration
    └── Quick macro entry
```

### iOS Folder Structure

```
ios/
├── App/
│   ├── App.xcworkspace                    # ⚠️ ALWAYS OPEN THIS IN XCODE
│   ├── App.xcodeproj                      # ⚠️ DO NOT OPEN THIS DIRECTLY
│   ├── Podfile                            # CocoaPods dependencies
│   │   ├── Line 1: platform :ios, '16.0'
│   │   ├── Lines 10-20: Capacitor pods
│   │   └── Lines 30-35: post_install hook
│   ├── Pods/                              # Installed pods (git-ignored)
│   └── App/
│       ├── App/
│       │   ├── Info.plist                 # iOS app configuration
│       │   │   ├── Bundle ID: com.wellfit.app
│       │   │   ├── App Name: Well Fit Pro
│       │   │   ├── Deployment Target: 16.0
│       │   │   └── Permissions: Camera, Health, etc.
│       │   ├── Assets.xcassets            # App icons, launch screens
│       │   └── public/                    # ⭐ SYNCED WEB ASSETS (copied from root public/)
│       │       └── [All HTML/CSS/JS files get copied here]
│       └── App.xcodeproj/
│           └── project.pbxproj            # Xcode project settings
│               ├── IPHONEOS_DEPLOYMENT_TARGET: 16.0
│               └── Build settings
└── build/                                 # Build output (git-ignored)
```

### API Folder Structure

```
api/
├── subscriptions.js                       # ⭐ FIRESTORE SUBSCRIPTION TRACKING
│   ├── GET: Fetch all users & subscription events
│   ├── POST: Log new subscription event
│   ├── Firestore integration (when env vars present)
│   ├── Local JSON fallback (when no env vars)
│   └── Event types: trial_started, premium_purchased, pro_purchased, etc.
│
├── stripe-webhook.js                      # STRIPE WEBHOOK HANDLER (if exists)
│   ├── Handles checkout.session.completed
│   ├── Handles subscription events
│   └── Logs to Firebase
│
└── create-checkout-session.js             # STRIPE CHECKOUT (if exists)
    └── Creates Stripe checkout sessions
```

---

## 🎨 DESIGN SYSTEM - EXACT SPECIFICATIONS

### Color Palette (CSS Variables in styles.css:30-47)

| Variable | Hex Code | Usage |
|----------|----------|-------|
| `--carolina-blue` | `#4B9CD3` | Primary brand color - buttons, links, accents |
| `--carolina-dark` | `#13294B` | Dark navy - headers, important text |
| `--carolina-light` | `#7BAFD4` | Light blue - secondary accents |
| `--primary` | `#4B9CD3` | Alias for carolina-blue |
| `--primary-dark` | `#3A7CA5` | Darker shade for hover states |
| `--primary-light` | `#7BAFD4` | Lighter shade for backgrounds |
| `--light-bg` | `#F0F7FC` | Main page background |
| `--lighter-bg` | `#E8F4FA` | Secondary background |
| `--card-bg` | `#F5FAFD` | Card backgrounds |
| `--dark` | `#13294B` | Dark text color |

### Gradients

**Primary Gradient (Most Used):**
```css
background: linear-gradient(135deg, #4B9CD3 0%, #3A7CA5 100%);
```
**Usage:** Primary buttons, subscription cards, avatars, active states

**Secondary Gradient:**
```css
background: linear-gradient(135deg, #5DADE2 0%, #4B9CD3 100%);
```
**Usage:** Secondary actions, alternate cards

**Tertiary Gradient:**
```css
background: linear-gradient(135deg, #7BAFD4 0%, #5DADE2 100%);
```
**Usage:** Subtle backgrounds, light accents

### Typography Rules

**Font Stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Text Hierarchy:**
- **H1 (Page Titles):** 2rem (32px), bold, carolina-blue
- **H2 (Section Titles):** 1.5rem (24px), bold, carolina-dark
- **H3 (Subsections):** 1.2rem (19px), bold, carolina-dark
- **Body Text:** 1rem (16px), regular, carolina-dark or #666
- **Small Text:** 0.85rem (14px), regular, #666
- **Tiny Text:** 0.75rem (12px), regular, #999

### Component Specifications

#### Cards
```css
background: white;
border-radius: 20px;
padding: 24px;
box-shadow: 0 4px 15px rgba(0,0,0,0.1);
```

#### Primary Button
```css
background: linear-gradient(135deg, #4B9CD3 0%, #3A7CA5 100%);
color: white;
border: none;
padding: 14px 24px;
border-radius: 999px;
font-weight: 700;
box-shadow: 0 4px 15px rgba(75, 156, 211, 0.3);
```

#### Secondary Button
```css
background: #F0F7FC;
color: #4B9CD3;
border: 2px solid #4B9CD3;
padding: 14px 24px;
border-radius: 999px;
font-weight: 700;
```
**Hover:** Background changes to #4B9CD3, text becomes white

#### Danger Button
```css
background: white;
color: #f44336;
border: 2px solid #f44336;
padding: 14px 24px;
border-radius: 999px;
font-weight: 700;
```
**Hover:** Background changes to #f44336, text becomes white

#### Stats Card
```css
background: #F0F7FC;
padding: 20px;
border-radius: 12px;
text-align: center;
border: 2px solid transparent;
```
**Value:** 2rem, bold, carolina-blue
**Label:** 0.85rem, regular, #666
**Hover:** border-color becomes carolina-blue

#### Toggle Switch
```css
/* Inactive */
width: 50px;
height: 28px;
background: #ddd;
border-radius: 999px;

/* Active */
background: linear-gradient(135deg, #4B9CD3 0%, #3A7CA5 100%);
```
**Knob:** 22px circle, white, box-shadow

#### Subscription Status Card
```css
background: linear-gradient(135deg, #4B9CD3 0%, #3A7CA5 100%);
padding: 20px;
border-radius: 16px;
color: white;
box-shadow: 0 8px 25px rgba(75, 156, 211, 0.3);
```
**Badge:** White background, carolina-blue text

---

## 💰 PRICING STRUCTURE (CURRENT)

### Subscription Plans (Updated in account.html)

**Elite - $96/month**
- All AI features (meal logging, workout coaching, voice input)
- 1 free coaching session per month ($100 value)
- Unlimited meal plans
- Unlimited workout plans
- Priority support
- Advanced analytics

**Premium - $15/month**
- All AI features
- Unlimited meal plans
- Unlimited workout plans
- Apple Health sync
- Progress tracking

**Core - $6/month**
- Basic meal plans (capped/limited)
- Basic workout tracking
- No AI features
- No coaching

### One-Time Purchases

**Coaching Sessions:**
- 1 session: $100
- 4 sessions: $360 (save $40)
- 8 sessions: $640 (save $160)
- 12 sessions: $840 (save $360)

**Expert Meal Plans:** $99-$199 each
- Professional Fat Loss Protocol: $149
- Elite Muscle Building Plan: $199
- Athletic Performance Nutrition: $169
- Metabolic Health Reset: $129
- Sustainable Lifestyle Plan: $99
- Ketogenic Performance Plan: $149

**Expert Workout Programs:** $129-$199 each
- Strength Foundations Program: $179
- Hypertrophy Blueprint: $199
- Endurance Athlete Training: $169
- Fat Loss Accelerator: $149
- Olympic Lifting Mastery: $189
- Bodyweight Mastery: $129

---

## 🔐 ENVIRONMENT VARIABLES (Complete List)

### Firebase Firestore (Required for Production)
```bash
FIREBASE_PROJECT_ID=well-fit-pro-fitness-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@well-fit-pro-fitness-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[ACTUAL KEY]\n-----END PRIVATE KEY-----\n"
```
**Location:** `.env` (git-ignored)
**Usage:** `api/subscriptions.js` for cloud storage
**Fallback:** Local JSON file if not set

### Stripe Payment Processing (Not Yet Configured)
```bash
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_PRICE_ID_ELITE=price_xxxx
STRIPE_PRICE_ID_PREMIUM=price_xxxx
STRIPE_PRICE_ID_CORE=price_xxxx
```
**Location:** `.env` (git-ignored)
**Usage:** Checkout pages, webhook handler
**Status:** Placeholders only, not yet integrated

### Claude AI API (Optional)
```bash
CLAUDE_API_KEY=sk-ant-api03-xxxx
```
**Location:** `.env.local`
**Usage:** AI meal planning, voice input parsing

### RevenueCat (Optional - Skip for Now)
```bash
REVENUECAT_WEBHOOK_SECRET=xxxx
```
**Location:** `.env` (git-ignored)
**Usage:** Apple In-App Purchase integration
**Status:** Not needed if using web-based subscriptions

---

## 🔌 CAPACITOR PLUGINS (Native Features)

### Installed Plugins (package.json)

**@capacitor-community/speech-recognition@7.0.1**
- Voice input for food logging
- Speech-to-text parsing
- Usage: `quick-food-entry.js`

**@capacitor-mlkit/barcode-scanning@7.3.0**
- Scan food barcodes
- Get nutrition info from barcode
- Usage: Calorie tracker

**@capacitor/camera@7.0.2**
- Take progress photos
- Upload meal photos
- Usage: Various screens

**@capgo/capacitor-health@7.0.10**
- Apple Health integration
- Read: steps, calories, heart rate, workouts
- Write: workout data
- Usage: `health-sync.js`, `health-dashboard.html`

### Plugin Configuration (capacitor.config.json)
```json
{
  "appId": "com.wellfit.app",
  "appName": "Well Fit Pro",
  "webDir": "public",
  "bundledWebRuntime": false,
  "plugins": {
    "CapacitorHealth": {
      "requestAuthorization": true
    }
  }
}
```

---

## 🚀 BUILD & DEPLOYMENT PROCESS

### Development Workflow

**1. Edit Files**
```bash
cd /Users/danperry/Apps/FuelFire/fuelfire-app
# Edit files in public/ folder
```

**2. Sync to iOS**
```bash
npx cap sync ios
```
**What this does:**
- Copies `public/` → `ios/App/App/public/`
- Updates Podfile dependencies
- Installs/updates CocoaPods
- Takes ~3-5 seconds

**Alternative (faster, copy only):**
```bash
npx cap copy ios
```
**What this does:**
- Only copies `public/` files
- Doesn't update pods
- Takes ~1 second

**3. Open in Xcode**
```bash
open ios/App/App.xcworkspace
```
**⚠️ CRITICAL:** Must use `.xcworkspace` not `.xcodeproj`

**4. Build & Run**
- Select device or simulator
- Click Run (⌘R)
- Wait for build
- App launches on device

### Clean Build (When Things Break)

**1. Clean Xcode Build**
```
Xcode → Product → Clean Build Folder (⇧⌘K)
```

**2. Delete Derived Data**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

**3. Reinstall Pods**
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..
```

**4. Full Sync & Rebuild**
```bash
npx cap sync ios
open ios/App/App.xcworkspace
# Then rebuild in Xcode
```

### iOS Build Settings

**Deployment Target:** iOS 16.0
- Required by GoogleMLKit dependency
- Set in: Xcode → Target → General → Deployment Info
- Also in: `ios/App/Podfile` line 1

**Bundle Identifier:** com.wellfit.app
- Set in: Xcode → Target → General → Identity
- Also in: `capacitor.config.json`

**App Name:** Well Fit Pro
- Set in: Xcode → Target → General → Display Name
- Also in: `capacitor.config.json`

**Signing:**
- Team: (Dan's Apple Developer account)
- Automatically manage signing: YES
- Provisioning Profile: Xcode Managed Profile

---

## 🗄️ DATA STORAGE

### LocalStorage Keys (Browser/WebView)

```javascript
// User Data
localStorage.setItem('userName', 'John Athlete');
localStorage.setItem('userEmail', 'john@example.com');
localStorage.setItem('userId', 'user123');

// Subscription
localStorage.setItem('subscriptionPlan', 'elite'); // elite, premium, core
localStorage.setItem('subscriptionStatus', 'active');
localStorage.setItem('subscriptionExpiry', '2026-01-01');

// App Settings
localStorage.setItem('notificationsEnabled', 'true');
localStorage.setItem('emailUpdatesEnabled', 'true');
localStorage.setItem('darkModeEnabled', 'true');

// Workout Data
localStorage.setItem('workoutHistory', JSON.stringify([...]));
localStorage.setItem('currentProgram', 'strength-foundations');

// Nutrition Data
localStorage.setItem('dailyCalories', '2000');
localStorage.setItem('mealHistory', JSON.stringify([...]));

// Payment Methods
localStorage.setItem('paymentMethods', JSON.stringify([...]));
```

### Firebase Firestore Collections (Cloud Storage)

**users/{userId}**
```javascript
{
  email: "user@example.com",
  name: "John Athlete",
  subscriptionPlan: "elite",
  subscriptionStatus: "active",
  createdAt: Timestamp,
  lastLogin: Timestamp
}
```

**subscriptionEvents/{eventId}**
```javascript
{
  userId: "user123",
  email: "user@example.com",
  event: "elite_purchased", // trial_started, premium_purchased, etc.
  timestamp: Timestamp,
  amount: 96.00,
  plan: "elite"
}
```

**purchases/{purchaseId}**
```javascript
{
  userId: "user123",
  type: "meal_plan", // coaching_session, workout_program
  itemId: "fat-loss-pro",
  amount: 149.00,
  timestamp: Timestamp
}
```

---

## 🔀 NAVIGATION FLOW

### Bottom Navigation (5 Buttons - index.html:2271-2323)

**1. Quick Workout (Left)**
- Icon: Dumbbell SVG
- Action: `window.location.href='workout-quiz.html'`
- Purpose: Start a workout

**2. Food Tracker**
- Icon: Apple/Food SVG
- Action: `showQuickFoodEntry()`
- Purpose: Log meals quickly

**3. Home (Center - Larger)**
- Icon: House SVG
- Action: `window.location.href='index.html'`
- Purpose: Return to dashboard
- Style: `transform: scale(1.2)`

**4. Health Dashboard**
- Icon: Heart SVG
- Action: `window.location.href='health-dashboard.html'`
- Purpose: View Apple Health data

**5. Account (Right) - NEW**
- Icon: User profile SVG
- Action: `window.location.href='account.html'`
- Purpose: Account management
- Lines: 2315-2320

### Main Dashboard Links (index.html)

**Quick Actions (Lines 151-203):**
1. Quick Workout → `workout-quiz.html`
2. Log Meal → Opens modal
3. Schedule Workout → `coaching-scheduler.html`
4. Set Goals → Opens modal

**Expert Coaching (Lines 204-244) - NEW:**
1. Book Expert → `expert-coaching.html`
2. Meal Plans → `expert-meal-plans.html`
3. Workout Plans → `expert-workout-plans.html`

**Today's Overview:**
- Entire card clickable → `calorie-tracker.html`

**Health Today:**
- Entire card clickable → `health-dashboard.html`

### Account Page Links (account.html)

**Back Button:**
- Lines 368-374
- Action: `window.location.href='index.html'`

**Profile Actions:**
- Edit Profile: `onclick="editProfile()"` (line 379)
- Triggers prompt to edit name

**Subscription Actions:**
- Manage Subscription: `onclick="manageSubscription()"` (line 425)
- Upgrade Plan: `onclick="upgradePlan()"` (line 426)
- Currently show alerts, need Stripe integration

**Payment Actions:**
- Add Payment Method: `onclick="addPaymentMethod()"` (line 438)
- Currently shows alert, needs Stripe integration

**Account Actions:**
- Change Password: `onclick="changePassword()"` (line 516)
- Export Data: `onclick="exportData()"` (line 517)
- Delete Account: `onclick="deleteAccount()"` (line 518)

---

## 🎯 KEY JAVASCRIPT FUNCTIONS

### expert-profiles.js

**getExpertById(id)**
```javascript
// Returns expert object by ID
const expert = getExpertById('trainer-1');
// Returns: { id, name, credentials, specialty, hourlyRate, ... }
```

**getExpertsByType(type)**
```javascript
// Returns array of experts by type
const trainers = getExpertsByType('trainer');
const nutritionists = getExpertsByType('nutritionist');
```

**calculateSessionCost(packageType, sessions)**
```javascript
// Calculate total cost for session package
const cost = calculateSessionCost('starter', 4);
// Returns: 360
```

### account.html Functions (Lines 531-600)

**toggleSetting(element)**
```javascript
// Toggle switch on/off
// Auto-saves to localStorage
```

**editProfile()**
```javascript
// Prompt for name change
// Updates display and localStorage
```

**manageSubscription()**
```javascript
// Show subscription management modal
// Currently alert, needs real implementation
```

**upgradePlan()**
```javascript
// Upgrade to higher tier
// Currently alert, needs Stripe checkout
```

**changePassword()**
```javascript
// Send password reset email
// Currently alert, needs backend
```

**exportData()**
```javascript
// Export all user data (GDPR compliance)
// Currently alert, needs backend
```

**deleteAccount()**
```javascript
// Delete account with confirmations
// Currently alert, needs backend
```

### health-sync.js Functions

**requestHealthPermissions()**
```javascript
// Request Apple Health permissions
// Returns: Promise<boolean>
```

**readSteps()**
```javascript
// Read today's step count
// Returns: Promise<number>
```

**readCalories()**
```javascript
// Read base + active calories
// Returns: Promise<{base: number, active: number}>
```

**writeWorkout(data)**
```javascript
// Write workout to Apple Health
// Params: { type, duration, calories, startDate }
```

---

## 🐛 KNOWN ISSUES

### Issue 1: Xcode Simulator Dropdown ⚠️ UNRESOLVED

**Problem:**
- FuelFire project only shows "Any iOS Simulator Device"
- Does NOT show individual simulators (iPhone 15, 16, 17, etc.)
- Other projects show all simulators correctly

**What We Tried:**
- Updated deployment target (14.0 → 15.0 → 16.0)
- Added/removed SUPPORTED_PLATFORMS build setting
- Deleted and recreated scheme
- Cleaned build folder
- Deleted derived data
- Reinstalled pods multiple times
- Matched settings to working projects

**Current Workaround:**
- Can still run on "Any iOS Simulator Device"
- Can run on physical iPhone (works perfectly)
- Just can't select specific simulator models

**Potential Cause:**
- Workspace corruption
- Project-specific Xcode settings
- May require fresh project creation

**Impact:**
- Minor - doesn't affect functionality
- Just can't choose specific simulator model

### Issue 2: Web Asset Caching

**Problem:**
- Changes to HTML/CSS/JS don't appear in app immediately
- iOS app shows old cached version

**Solution:**
```bash
npx cap sync ios
# Then rebuild in Xcode
```

**Why It Happens:**
- iOS bundles web assets at build time
- Changes to `public/` don't auto-sync
- Need manual sync + rebuild

---

## ⚡ QUICK COMMAND REFERENCE

### Project Setup
```bash
# Navigate to project
cd /Users/danperry/Apps/FuelFire/fuelfire-app

# Install dependencies
npm install

# Sync to iOS
npx cap sync ios

# Open Xcode
open ios/App/App.xcworkspace
```

### Development
```bash
# Copy web assets only (fast)
npx cap copy ios

# Full sync (includes pods)
npx cap sync ios

# Reinstall pods
cd ios/App && pod install && cd ../..
```

### Cleaning
```bash
# Remove iOS build artifacts
rm -rf ios/build

# Remove pods
cd ios/App && rm -rf Pods Podfile.lock && cd ../..

# Remove node modules
rm -rf node_modules && npm install
```

### Git
```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "Description"

# Push
git push
```

---

## 🎓 CRITICAL RULES FOR NEXT AI

### 1. File Editing Rules

**✅ DO:**
- Edit files in `public/` folder
- Run `npx cap sync ios` after changes
- Update this documentation when adding features
- Test on physical device for Health features
- Follow Carolina Blue design system

**❌ DON'T:**
- Edit files in `ios/App/App/public/` (they get overwritten)
- Commit `.env` file
- Open `.xcodeproj` (use `.xcworkspace`)
- Change deployment target below iOS 16.0
- Add gradients or colors outside the design system

### 2. Design System Rules

**All new pages MUST:**
- Use `#F0F7FC` background
- Use white cards with `border-radius: 20px`
- Use Carolina Blue (`#4B9CD3`) for all accents
- Use the primary gradient for buttons
- Match typography hierarchy
- Include hover states on interactive elements

**Reference:** `account.html` is the perfect example

### 3. Pricing Rules

**Current Plans (DO NOT CHANGE WITHOUT PERMISSION):**
- Elite: $96/month
- Premium: $15/month
- Core: $6/month

**Coaching Sessions:**
- Base rate: $100/hour
- Packages have fixed discounts (see pricing section)

**Location:** `public/account.html` lines 411-427

### 4. Navigation Rules

**Bottom Nav (5 buttons ONLY):**
1. Quick Workout
2. Food Tracker
3. Home (center, larger)
4. Health Dashboard
5. Account

**DO NOT add 6th button** - layout breaks

### 5. Build Rules

**Always:**
1. Edit in `public/`
2. Run `npx cap sync ios`
3. Rebuild in Xcode
4. Test changes

**When things break:**
1. Clean build folder in Xcode
2. Delete derived data
3. Reinstall pods
4. Full sync
5. Rebuild

### 6. Stripe Integration Rules

**When adding Stripe:**
- Use `STRIPE_PUBLISHABLE_KEY` in frontend
- Use `STRIPE_SECRET_KEY` in backend only
- Never expose secret key to frontend
- All checkout sessions server-side
- Webhook verification required

**Files to update:**
- `expert-coaching.html` line ~280
- `expert-meal-plans.html` line ~265
- `expert-workout-plans.html` line ~286
- `account.html` lines 425-426
- Create `api/create-checkout-session.js`
- Create `api/stripe-webhook.js`

### 7. Firebase Rules

**When events logged:**
- `trial_started` - User starts trial
- `elite_purchased` - Subscribes to Elite
- `premium_purchased` - Subscribes to Premium
- `core_purchased` - Subscribes to Core
- `coaching_purchased` - Buys coaching sessions
- `meal_plan_purchased` - Buys meal plan
- `workout_program_purchased` - Buys workout program

**Event Structure:**
```javascript
{
  userId: string,
  email: string,
  event: string,
  timestamp: Timestamp,
  amount: number,
  plan: string
}
```

---

## 📊 PROJECT STATUS

### ✅ COMPLETE
- Account management page (Carolina Blue redesign)
- Expert coaching booking system
- Expert meal plans library (6 plans)
- Expert workout programs (6 programs)
- Firebase Firestore integration
- Navigation (bottom nav + dashboard links)
- Design system (Carolina Blue throughout)
- iOS project setup and working

### 🚧 IN PROGRESS / NEEDS WORK
- Stripe payment integration (placeholders only)
- Real authentication system
- Backend API endpoints
- Admin dashboard enhancements
- Email notifications

### 📋 TODO (Priority Order)
1. **Stripe Integration** (HIGH)
   - Replace alert() with real checkout
   - Create checkout session endpoint
   - Add webhook handler
   - Test with test cards

2. **Authentication** (HIGH)
   - User signup/login
   - Password reset
   - Session management
   - OAuth options

3. **TestFlight** (MEDIUM)
   - Join Apple Developer Program
   - Create App Store Connect app
   - First TestFlight build
   - Add testers

4. **Notifications** (MEDIUM)
   - Push notifications for workouts
   - Email updates
   - Coaching session reminders

5. **Analytics** (LOW)
   - Track user behavior
   - Conversion tracking
   - A/B testing setup

### ❌ SKIP (Not Needed)
- Apple In-App Purchases (use Stripe on web instead)
- RevenueCat integration (not needed for web subscriptions)
- Android build (focus on iOS first)

---

## 🎬 GETTING STARTED CHECKLIST

**For Dan's Next AI Assistant:**

### Immediate First Steps
- [ ] Read this entire document (yes, all of it)
- [ ] Navigate to project: `cd /Users/danperry/Apps/FuelFire/fuelfire-app`
- [ ] Check current status: `git status`
- [ ] Verify Xcode can open: `open ios/App/App.xcworkspace`
- [ ] Check environment: `ls -la .env` (should exist)

### Understand Current State
- [ ] Read `account.html` to understand design system
- [ ] Read `expert-coaching.html` to understand booking flow
- [ ] Check Firebase connection in `.env`
- [ ] Review pricing in `account.html` lines 411-427
- [ ] Understand navigation in `index.html` lines 2271-2323

### What Dan Probably Wants Next
- [ ] Stripe integration (most likely)
- [ ] Testing on his iPhone (common request)
- [ ] Bug fixes (describe issue)
- [ ] New feature (describe what)

### Before Making Changes
- [ ] Confirm with Dan what needs to be done
- [ ] Understand his communication style (direct, no BS)
- [ ] Don't over-explain, just do
- [ ] Test changes before saying "done"

### After Making Changes
- [ ] Run `npx cap sync ios`
- [ ] Tell Dan to rebuild in Xcode
- [ ] Update this documentation if adding features
- [ ] Commit changes with clear message

---

## 💬 DAN'S COMMUNICATION STYLE

### What Dan Likes
- Direct answers
- "Just make it work"
- Minimal explanation
- Getting shit done

### What Dan Doesn't Like
- Long explanations
- Over-engineering
- Asking too many questions
- Not understanding context

### How to Work with Dan
1. **Read the room** - Check previous messages for context
2. **Be proactive** - If you know what he wants, do it
3. **Be concise** - Short responses, clear action items
4. **Test before confirming** - Make sure it actually works
5. **Document clearly** - He needs to pass work to other AIs

### Common Dan Requests
- "Push to Xcode" → He means run `npx cap sync ios`
- "Make it consistent" → Use Carolina Blue design
- "Get this to work" → Fix it, don't explain why it's broken
- "Give details" → He's passing to another AI, be thorough

---

## 🔮 FUTURE ENHANCEMENTS

### Planned Features (Not Started)
- Video coaching sessions (Zoom/WebRTC integration)
- Social features (share workouts, compete with friends)
- Advanced analytics dashboard
- Custom workout builder (drag-and-drop)
- Meal prep service integration
- Wearable device sync (Garmin, Fitbit, Whoop)
- Progressive web app (PWA) version
- Android build
- Web dashboard (desktop version)

### Database Schema (Future)
When moving to production database (PostgreSQL/MySQL):

**users table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  subscription_plan VARCHAR(50),
  subscription_status VARCHAR(50),
  subscription_expiry TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**subscriptions table:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50),
  status VARCHAR(50),
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP
);
```

**purchases table:**
```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),
  item_id VARCHAR(255),
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP
);
```

---

## 📚 EXTERNAL RESOURCES

### Documentation Links
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [Apple Developer Portal](https://developer.apple.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Xcode Documentation](https://developer.apple.com/xcode/)

### Design Resources
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design](https://material.io/design)
- [Coolors (Color Palette Tool)](https://coolors.co/)

### Tools & Services
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Firebase Console](https://console.firebase.google.com/)
- [TestFlight](https://developer.apple.com/testflight/)
- [GitHub](https://github.com/)

---

## 🆘 TROUBLESHOOTING GUIDE

### Problem: Changes not showing in app

**Solution:**
```bash
npx cap sync ios
# Then rebuild in Xcode
```

### Problem: Xcode won't build

**Solution:**
```bash
# Clean in Xcode
Product → Clean Build Folder (⇧⌘K)

# Delete derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall pods
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..

# Sync and rebuild
npx cap sync ios
open ios/App/App.xcworkspace
```

### Problem: Firebase not working

**Check:**
1. `.env` file exists
2. All 3 Firebase vars are set
3. Private key has literal `\n` (not actual newlines)
4. Restart dev server

### Problem: CocoaPods installation fails

**Solution:**
```bash
# Update CocoaPods
sudo gem install cocoapods

# Update pod repo
pod repo update

# Try again
cd ios/App
pod install
```

### Problem: App crashes on device

**Check:**
1. Deployment target is iOS 16.0+
2. All permissions in Info.plist
3. Valid signing certificate
4. Device meets minimum iOS version

### Problem: Capacitor plugin not working

**Solution:**
```bash
# Reinstall plugin
npm uninstall @plugin-name
npm install @plugin-name

# Sync
npx cap sync ios

# Rebuild
```

---

## 📞 CONTACT & HANDOFF

**Project Owner:** Dan Perry

**Project Location:** `/Users/danperry/Apps/FuelFire/fuelfire-app/`

**Firebase Project:** well-fit-pro-fitness-app

**Bundle ID:** com.wellfit.app

**Last Updated:** December 5, 2025

**Current Status:** Production-ready (pending Stripe integration)

**Next Steps:** Stripe payment integration, TestFlight deployment

---

## ✅ AI ASSISTANT HANDOFF CHECKLIST

When starting work on this project:

- [ ] I have read this entire document
- [ ] I understand the project structure
- [ ] I know where all key files are located
- [ ] I understand the design system (Carolina Blue)
- [ ] I know the current pricing (Elite $96, Premium $15, Core $6)
- [ ] I understand the build process (sync → Xcode → rebuild)
- [ ] I know what's complete vs what needs work
- [ ] I understand Dan's communication style
- [ ] I know how to troubleshoot common issues
- [ ] I'm ready to help Dan with this project

**If you checked all boxes, you're ready to work on FuelFire!**

---

**END OF DOCUMENTATION**

*This document contains everything you need to work on the FuelFire fitness app. If something is missing or unclear, add it to this document for the next AI.*
