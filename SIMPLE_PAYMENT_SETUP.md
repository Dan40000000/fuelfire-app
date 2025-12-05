# 💳 Simple Payment Setup Guide - For Humans

Dan, here's what you need to do in plain English. I'll break this into **"Do This Now"** vs **"Do This Later"** sections.

---

## 🚀 DO THIS NOW - Get Stripe Working (15 minutes)

### Step 1: Create a Stripe Account
1. Go to https://stripe.com/
2. Click "Start now" and sign up
3. You'll get a test account automatically (perfect for testing)

### Step 2: Get Your Stripe Keys
1. In Stripe Dashboard, click **"Developers"** in the top menu
2. Click **"API keys"**
3. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - click "Reveal"
4. **Copy these somewhere safe** (Notes app, whatever)

### Step 3: Create Your Subscription Products
1. In Stripe Dashboard, click **"Products"** (top menu)
2. Click **"Add product"**

**For Premium:**
- Name: `FuelFire Premium`
- Description: `Monthly premium subscription`
- Price: `$29.99`
- Billing period: `Monthly`
- Click "Save product"
- **Copy the Price ID** (starts with `price_`) - you'll need this

**For Pro:**
- Click "Add product" again
- Name: `FuelFire Pro`
- Description: `Monthly pro subscription`
- Price: `$49.99`
- Billing period: `Monthly`
- Click "Save product"
- **Copy the Price ID** (starts with `price_`) - you'll need this

### Step 4: Add Keys to Your .env File
Open `/Users/danperry/Apps/FuelFire/fuelfire-app/.env` and add these lines at the bottom:

```bash
# Stripe - Payment Processing
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY
STRIPE_PRICE_ID_PREMIUM=price_YOUR_PREMIUM_PRICE_ID
STRIPE_PRICE_ID_PRO=price_YOUR_PRO_PRICE_ID
```

**Replace** the values with the actual keys you copied.

### Step 5: Test It (Once We Build It)
- We'll add Stripe checkout buttons to the app
- You'll be able to test purchases with Stripe's test card:
  - Card: `4242 4242 4242 4242`
  - Expiration: Any future date
  - CVC: Any 3 digits
  - ZIP: Any 5 digits

**That's it for basic Stripe!** ✅

---

## 📱 DO THIS LATER - Get TestFlight Working (When Ready to Test)

### What is TestFlight?
It's Apple's way of letting you test your app on your phone before submitting to the App Store. You can send it to friends too.

### Step 1: Join Apple Developer Program
1. Go to https://developer.apple.com/programs/
2. Click "Enroll"
3. Cost: $99/year
4. Use your Apple ID to sign up
5. Wait for approval (usually 24-48 hours)

### Step 2: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps"
3. Click the **+** button
4. Select "New App"
5. Fill out:
   - **Platform:** iOS
   - **Name:** Well Fit Pro
   - **Primary Language:** English
   - **Bundle ID:** com.wellfit.app
   - **SKU:** wellfit001 (or whatever you want)
6. Click "Create"

### Step 3: Build in Xcode (I'll Help With This)
When you're ready to upload:

1. Open Xcode: `open ios/App/App.xcworkspace`
2. At the top, change target from simulator to **"Any iOS Device"**
3. Click **Product** → **Archive**
4. Wait for it to build (takes a few minutes)
5. When done, the Organizer window opens
6. Click **"Distribute App"**
7. Choose **"App Store Connect"**
8. Choose **"Upload"**
9. Click through the options (defaults are fine)
10. Wait for upload (can take 10-20 minutes)

### Step 4: Add TestFlight Testers
1. Go back to App Store Connect
2. Click your app
3. Click **"TestFlight"** tab
4. Wait for processing to finish (you'll get an email)
5. Click **"Internal Testing"**
6. Click **"+"** to add testers
7. Enter email addresses (yours, friends, whatever)
8. They'll get an email with TestFlight download link

**That's it!** They download TestFlight app from App Store, then install your app.

---

## 🤔 DO THIS MAYBE - Apple In-App Purchases (Only if You Want)

### Why Would You Use This?
- Apple takes 30% of Stripe payments if you use them in the iOS app
- Apple **requires** you use their In-App Purchase system instead
- **BUT** you can avoid this by:
  - Only allowing purchases on the website (not in the app)
  - Linking to your website for upgrades
  - This is what Netflix, Spotify, etc. do

### My Recommendation:
**Skip Apple IAP for now.** Just use Stripe on a website and have users log in to the app after purchasing. Way simpler.

If you REALLY want Apple IAP later:
- It's super complicated
- Requires setting up products in App Store Connect
- Requires RevenueCat integration (another service)
- I can help but let's get basic Stripe working first

---

## 🎯 WHAT I'LL DO FOR YOU

Here's what I'll build once you give me your Stripe keys:

### 1. Stripe Checkout Integration
- Update `expert-coaching.html` with real Stripe checkout
- Update `expert-meal-plans.html` with real Stripe checkout
- Update `expert-workout-plans.html` with real Stripe checkout
- Update `account.html` subscription management
- Create checkout sessions for each purchase

### 2. Webhook Handler (Already Exists)
- The file `api/stripe-webhook.js` will handle payments
- When someone pays, it automatically logs to Firebase
- Shows up in your admin dashboard

### 3. Testing
- Test purchases with Stripe test cards
- Verify Firebase logging
- Check admin dashboard shows purchases

---

## 📋 QUICK CHECKLIST

**Today (Required):**
- [ ] Create Stripe account
- [ ] Get API keys (publishable + secret)
- [ ] Create Premium product ($29.99/mo)
- [ ] Create Pro product ($49.99/mo)
- [ ] Copy price IDs
- [ ] Add all 4 values to `.env` file
- [ ] Tell me when done, I'll build the checkout pages

**This Week (Optional):**
- [ ] Join Apple Developer Program ($99/year)
- [ ] Create app in App Store Connect
- [ ] We'll do first TestFlight build together

**Later (Skip for now):**
- [ ] Apple In-App Purchases setup
- [ ] RevenueCat integration
- [ ] Production Stripe account (vs test mode)

---

## 🆘 IF YOU GET STUCK

### Can't find Stripe API keys?
- Dashboard → Developers → API keys
- Make sure you're in "Test mode" (toggle in top right)

### Don't see Products menu?
- Make sure you're logged into Stripe Dashboard
- It's in the top navigation bar

### Price ID not showing?
- After creating product, click on it
- The price ID is under "Pricing" section
- Starts with `price_`

### .env file won't open?
- It starts with a dot, so it's hidden
- In Finder: Press ⌘⇧. to show hidden files
- Or just tell me the keys and I'll add them for you

---

## 💰 COSTS BREAKDOWN

- **Stripe:** FREE (they take 2.9% + 30¢ per transaction)
- **Firebase:** FREE tier is plenty for starting
- **Apple Developer:** $99/year (required for App Store)
- **RevenueCat:** FREE tier available (if you want Apple IAP later)

**Total to start:** Just get the Stripe keys (free), we can test everything. Apple Developer only needed when you're ready for TestFlight.

---

## 🎬 NEXT STEPS

**Right now:**
1. Go create your Stripe account
2. Get the 4 things I need:
   - Secret key
   - Publishable key
   - Premium price ID
   - Pro price ID
3. Paste them in chat or add to `.env` yourself
4. I'll build the checkout pages

**Then:**
- Test purchases with test cards
- See them show up in Firebase
- Deploy to production when ready

**Eventually:**
- Join Apple Developer Program
- Upload to TestFlight
- Get it on your iPhone
- Share with friends for testing

---

**Questions? Just ask me to explain any part in simpler terms.**
