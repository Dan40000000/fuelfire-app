# 🔥 FuelFire Fitness App - AI Handoff Document

## START HERE - Critical Info

**Project Location:** `/Users/danperry/Apps/FuelFire/fuelfire-app/`
**App Name:** Well Fit Pro (FuelFire)
**Platform:** iOS/Android hybrid (Capacitor)
**Main Code:** Everything is in `public/` folder (vanilla JavaScript, HTML, CSS)

---

## 🎯 WHAT WE BUILT TODAY (Focus on This)

### 1. ACCOUNT MANAGEMENT PAGE ✅ COMPLETE
**File:** `public/account.html`

**What it does:**
- User profile management (editable name, email display)
- Subscription management (Premium $29.99/mo, Pro $49.99/mo)
- Payment methods display (saved credit cards)
- Purchase history (all expert plan/coaching purchases)
- App settings (push notifications, email updates, toggles)
- Account actions (change password, export data, delete account)

**Design:**
- **IMPORTANT:** Redesigned to match Carolina Blue color scheme
- Background: `#F0F7FC` (light blue)
- Cards: White with shadows
- Primary color: `#4B9CD3` (Carolina Blue)
- All buttons, toggles, and accents use Carolina Blue gradient

**Navigation:**
- Added to bottom nav bar (replaced "Workout Techniques")
- 5th icon in bottom navigation
- User icon that links to `account.html`

**Integration:**
- Updated `index.html` line 2315-2320 with account navigation
- Uses localStorage for user data
- Ready for backend integration

---

### 2. EXPERT COACHING SYSTEM ✅ COMPLETE

#### A) 1-on-1 Coaching Booking
**File:** `public/expert-coaching.html`

**Features:**
- Book personal training or nutrition coaching sessions
- **6 Expert Profiles:**
  - **Trainers:** Dr. Sarah Mitchell, Marcus Chen, Jessica Rodriguez
  - **Nutritionists:** Dr. Amanda Foster, Kevin Park, Dr. Lisa Thompson

**Pricing:**
- **$100/hour base rate**
- Session packages with discounts:
  - 1 session: $100
  - 4 sessions: $360 (save $40)
  - 8 sessions: $640 (save $160)
  - 12 sessions: $840 (save $360)

**Booking flow:**
1. Select expert type (trainer or nutritionist)
2. Choose specific expert
3. Pick session package
4. Schedule date/time
5. Enter focus area
6. Pay via Stripe (placeholder ready)

**Database:**
- Expert profiles in `public/expert-profiles.js`
- Contains all expert info, credentials, specialties
- Session pricing logic

#### B) Expert Meal Plans Library
**File:** `public/expert-meal-plans.html`

**6 Pre-made Plans ($99-$199):**
1. Professional Fat Loss Protocol - $149
2. Elite Muscle Building Plan - $199
3. Athletic Performance Nutrition - $169
4. Metabolic Health Reset - $129
5. Sustainable Lifestyle Plan - $99
6. Ketogenic Performance Plan - $149

**Features:**
- Filter by category (fat-loss, muscle-building, performance, health)
- Each plan shows: duration, calories, macros, features, expert
- Purchase button (Stripe placeholder)

#### C) Expert Workout Plans Library
**File:** `public/expert-workout-plans.html`

**6 Programs ($129-$199):**
1. Strength Foundations Program - $179
2. Hypertrophy Blueprint - $199
3. Endurance Athlete Training - $169
4. Fat Loss Accelerator - $149
5. Olympic Lifting Mastery - $189
6. Bodyweight Mastery - $129

**Features:**
- Filter by category (strength, hypertrophy, endurance, fat-loss)
- Each program shows: duration, frequency, level, features
- Video demos, progressive overload, form check protocols
- Purchase button (Stripe placeholder)

#### D) Main Dashboard Integration
**File:** `public/index.html` (lines 204-244)

**Added "Expert Coaching" section with 3 cards:**
- Book Expert → `expert-coaching.html`
- Meal Plans → `expert-meal-plans.html`
- Workout Plans → `expert-workout-plans.html`

**Location:** Between "Quick Actions" and "Recent Activity" sections

---

### 3. FIREBASE FIRESTORE SETUP ✅ COMPLETE

**Purpose:** Track user subscriptions in the cloud

**Configuration Files:**
- `.env` - Contains REAL Firebase credentials (DO NOT COMMIT)
- `.env.example` - Template for environment variables
- `FIREBASE_SETUP.md` - Complete setup instructions

**Environment Variables (Already Set in `.env`):**
```
FIREBASE_PROJECT_ID=well-fit-pro-fitness-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@well-fit-pro-fitness-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[ACTUAL KEY]\n-----END PRIVATE KEY-----\n"
```

**How It Works:**
- `api/subscriptions.js` checks for Firebase env vars
- **WITH env vars:** Uses Firestore cloud storage
- **WITHOUT env vars:** Falls back to local JSON file
- Subscription events automatically logged when users purchase

**Firestore Collections:**
- `users` - User profiles and subscription status
- `subscriptionEvents` - All subscription events (trial_started, premium_purchased, etc.)

**Admin Dashboard:**
- `public/subscriptions.html` - View all users and subscription events
- Real-time data when Firebase is connected

---

## 🎨 DESIGN SYSTEM (CRITICAL - FOLLOW THIS)

### Color Palette
```css
--carolina-blue: #4B9CD3       /* PRIMARY - use everywhere */
--carolina-dark: #13294B       /* Dark navy for text */
--carolina-light: #7BAFD4      /* Light blue accents */
--light-bg: #F0F7FC            /* Page backgrounds */
--card-bg: #F5FAFD             /* Card backgrounds */
```

### Main Gradient
```css
background: linear-gradient(135deg, #4B9CD3 0%, #3A7CA5 100%);
```
Use this for buttons, subscription cards, avatars, etc.

### Design Rules
1. **Background:** Always `#F0F7FC` (light blue)
2. **Cards:** White with `border-radius: 20px` and subtle shadow
3. **Buttons:** Blue gradient with white text, 999px border-radius
4. **Text:** Navy (`#13294B`) for headers, `#666` for secondary
5. **Accents:** Carolina Blue everywhere (stats, prices, icons)

**⚠️ IMPORTANT:** All new pages MUST match this color scheme (like account.html does)

---

## 📱 NAVIGATION STRUCTURE

### Bottom Nav Bar (5 buttons)
1. Quick Workout → `workout-quiz.html`
2. Food Tracker → Opens modal
3. **Home (center, larger)** → `index.html`
4. Health Dashboard → `health-dashboard.html`
5. **Account** → `account.html` (NEW)

### Main Dashboard Sections (index.html)
1. Hero + Daily Quote
2. Today's Overview (calories/macros)
3. Apple Health Stats
4. Quick Actions (4 cards)
5. **Expert Coaching (3 cards)** ← NEW
6. Recent Activity

---

## 💰 MONETIZATION (Current Pricing)

### Subscriptions
- **Premium:** $29.99/month
  - Unlimited workouts & meal plans
  - AI coaching
  - Apple Health sync

- **Pro:** $49.99/month
  - Everything in Premium
  - **Unlimited 1-on-1 coaching** (normally $100/hr value)
  - Custom meal prep
  - Advanced analytics

### One-Time Purchases
- **Coaching Sessions:** $100-$840 (1-12 sessions)
- **Meal Plans:** $99-$199 each
- **Workout Programs:** $129-$199 each

---

## 🚀 iOS BUILD & DEPLOYMENT

### Sync Changes to iOS
```bash
cd /Users/danperry/Apps/FuelFire/fuelfire-app
npx cap sync ios
```

### Open in Xcode
```bash
open ios/App/App.xcworkspace
```
**⚠️ CRITICAL:** Always use `.xcworkspace` NOT `.xcodeproj`

### Build Settings
- Deployment Target: iOS 16.0
- Package ID: com.wellfit.app
- App Name: Well Fit Pro

### Test on Device
1. Connect iPhone via USB
2. Select device in Xcode
3. Click Run (⌘R)
4. App installs and runs

**Known Issue:** Simulator dropdown only shows "Any iOS Simulator Device" (not individual models). This is a workspace issue but doesn't affect functionality - you can still run on any simulator, just can't select specific models.

---

## 📂 KEY FILES TO KNOW

### Main Pages
- `public/index.html` - Home dashboard
- `public/account.html` - Account management (NEW)
- `public/expert-coaching.html` - 1-on-1 booking (NEW)
- `public/expert-meal-plans.html` - Meal plans library (NEW)
- `public/expert-workout-plans.html` - Workout programs (NEW)
- `public/calorie-tracker.html` - Food logging
- `public/workout-quiz.html` - Workout selector
- `public/health-dashboard.html` - Apple Health integration

### Data & Logic
- `public/expert-profiles.js` - Expert database (NEW)
- `public/workout-database.js` - Exercise library
- `public/health-sync.js` - Apple Health API
- `public/styles.css` - Global styles
- `api/subscriptions.js` - Firestore backend

### Config
- `capacitor.config.json` - Capacitor settings
- `package.json` - Dependencies
- `.env` - Firebase credentials (SECRET)
- `.env.example` - Template
- `FIREBASE_SETUP.md` - Setup guide

### iOS
- `ios/App/App.xcworkspace` - Xcode workspace
- `ios/App/Podfile` - CocoaPods dependencies
- `ios/App/App/Info.plist` - iOS config

---

## ✅ WHAT'S READY TO USE

1. ✅ Account management page (fully functional)
2. ✅ Expert coaching booking system
3. ✅ Expert meal plans library (6 plans)
4. ✅ Expert workout programs (6 programs)
5. ✅ Firebase Firestore configured and ready
6. ✅ All navigation integrated
7. ✅ Consistent Carolina Blue design
8. ✅ Synced to iOS project
9. ✅ Ready to test on iPhone

---

## 🔧 WHAT NEEDS TO BE DONE NEXT

### Immediate (High Priority)
1. **Stripe Integration**
   - Replace alert() placeholders with real Stripe checkout
   - Files to update:
     - `expert-coaching.html` (line ~280)
     - `expert-meal-plans.html` (line ~265)
     - `expert-workout-plans.html` (line ~286)
   - Add Stripe public key to env vars
   - Create checkout sessions for each purchase type

2. **Test Firebase Connection**
   - Create a test subscription event
   - Verify it appears in Firestore console
   - Check admin dashboard (`subscriptions.html`)

3. **Test on Physical iPhone**
   - All new pages (account, expert coaching, meal/workout plans)
   - Verify navigation works
   - Test toggles and buttons
   - Check design consistency

### Short Term
4. Add expert profile photos (currently using emoji avatars)
5. Create booking confirmation emails
6. Add calendar integration for coaching sessions
7. Build expert dashboard for managing appointments
8. Add notification system for upcoming sessions

### Long Term
9. Implement video chat for coaching sessions
10. Add progress tracking for purchased programs
11. Build admin panel for expert management
12. Deploy to production (Vercel/Netlify)
13. Set Firebase env vars in production
14. App Store submission

---

## ⚠️ CRITICAL WARNINGS

### Security
- **NEVER commit `.env` file** - It contains Firebase private key
- Keep service account JSON secure
- All credentials go in environment variables only
- `.env` is already in `.gitignore`

### Xcode
- **ALWAYS open `.xcworkspace`** not `.xcodeproj`
- Simulator dropdown issue exists but doesn't affect functionality
- Test on real device for Health features

### Design
- **ALL new pages must use Carolina Blue color scheme**
- Match existing design patterns (see `account.html` as reference)
- White cards on light blue background
- Blue gradient for primary actions

### Code
- Don't modify iOS native code unless necessary
- All features should be web-based (in `public/`)
- Use Capacitor plugins for native features
- Keep vanilla JavaScript (no frameworks)

---

## 🎯 TESTING CHECKLIST

Before deploying:
- [ ] Test account page on iPhone
- [ ] Test expert coaching booking flow
- [ ] Test meal plans purchase flow
- [ ] Test workout programs purchase flow
- [ ] Verify Firebase connection (check Firestore console)
- [ ] Test subscription tracking
- [ ] Verify all navigation links work
- [ ] Check color consistency across all pages
- [ ] Test toggles in account settings
- [ ] Verify payment method display
- [ ] Check purchase history shows correctly

---

## 📞 QUICK REFERENCE

### Commands
```bash
# Sync to iOS
npx cap sync ios

# Open Xcode
open ios/App/App.xcworkspace

# Install dependencies
npm install
```

### File Locations
```
Main app code:     /Users/danperry/Apps/FuelFire/fuelfire-app/public/
iOS project:       /Users/danperry/Apps/FuelFire/fuelfire-app/ios/
API:               /Users/danperry/Apps/FuelFire/fuelfire-app/api/
Environment:       /Users/danperry/Apps/FuelFire/fuelfire-app/.env
```

### Firebase Project
- Project ID: `well-fit-pro-fitness-app`
- Console: https://console.firebase.google.com/
- Credentials: In `.env` file (already configured)

---

## 💡 CONTEXT FOR NEXT AI

**What Dan wants:**
- This is a comprehensive fitness app with workout tracking, nutrition logging, and Apple Health integration
- **New features added today:** Expert coaching system with $100/hr trainers and nutritionists, meal plans, workout programs, and account management
- **Firebase is configured** and ready to track subscriptions in production
- **Design is Carolina Blue themed** - keep this consistent
- Focus on making the expert coaching features work with real payments (Stripe)

**Dan's style:**
- Direct and to the point
- Wants things done, not long explanations
- Appreciates when you "just make it work"
- Testing on his iPhone is important to him

**Current status:**
- All UI is built and looks great
- Navigation is integrated
- Firebase is connected
- Ready for Stripe payment integration
- Ready to test on device

**Your job:**
- Help Dan finish the Stripe integration
- Test everything works on his iPhone
- Deploy to production when ready
- Keep the Carolina Blue design consistent
- Focus on the fitness app features

---

## 🚨 IF SOMETHING BREAKS

### Xcode won't build
1. Clean build folder (⇧⌘K)
2. Delete `ios/App/Pods/` and `ios/build/`
3. Run `npx cap sync ios` again
4. Reopen workspace

### Firebase not working
1. Check `.env` file exists
2. Verify all 3 env vars are set
3. Check private key has literal `\n` (not actual newlines)
4. Restart dev server

### Design looks wrong
1. Reference `account.html` for correct color scheme
2. Use Carolina Blue (`#4B9CD3`) for all accents
3. White cards on light blue background
4. Blue gradient for primary buttons

---

**Last Updated:** December 1, 2025
**Status:** ✅ Ready for Stripe Integration & Testing
**Next Step:** Integrate Stripe payments and test on iPhone
