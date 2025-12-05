# Firebase Firestore Setup Guide

This guide will help you set up Firebase Firestore to track user subscriptions in production.

## Why Firebase?

Currently, subscription data is stored locally. When you deploy to production, you need a cloud database to:
- Track who has active subscriptions
- See which plans users purchased (Premium, Pro, Trial)
- Monitor subscription events in real-time
- Access data from anywhere

## Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `fuelfire-app` (or your preferred name)
4. Click through setup (disable Google Analytics if not needed)
5. Click **"Create Project"**

### 2. Enable Firestore Database

1. In your Firebase project sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select a location close to your users (e.g., `us-central`)
5. Click **"Enable"**

### 3. Create Service Account

1. Click the **⚙️ gear icon** (top left) → **"Project settings"**
2. Navigate to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** - downloads a JSON file
5. **Save this file securely** (contains sensitive credentials)

### 4. Extract Credentials

Open the downloaded JSON file and locate these 3 values:

```json
{
  "project_id": "fuelfire-app-12345",
  "client_email": "firebase-adminsdk-xxxxx@fuelfire-app-12345.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nLONG_KEY_HERE\n-----END PRIVATE KEY-----\n"
}
```

### 5. Add to Production Environment

#### Option A: Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these 3 variables:

   ```
   FIREBASE_PROJECT_ID = fuelfire-app-12345
   FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@fuelfire-app-12345.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\nLONG_KEY_HERE\n-----END PRIVATE KEY-----\n
   ```

   **Important:** Keep the `\n` characters in the private key exactly as they appear!

4. Redeploy your app

#### Option B: Netlify Deployment

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the same 3 variables as above
4. Redeploy your app

#### Option C: Local Testing

1. Copy `.env.example` to `.env.production`:
   ```bash
   cp .env.example .env.production
   ```

2. Open `.env.production` and add your Firebase credentials:
   ```
   FIREBASE_PROJECT_ID=your-actual-project-id
   FIREBASE_CLIENT_EMAIL=your-actual-client-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_KEY\n-----END PRIVATE KEY-----\n"
   ```

3. Never commit `.env.production` to git!

### 6. Verify Setup

1. Deploy your app (or run locally with production env)
2. Open `https://your-app.com/subscriptions.html` (or `http://localhost:3000/subscriptions.html`)
3. You should see a subscription tracking dashboard
4. When users subscribe in the app, events will appear here in real-time

## How It Works

The API endpoint `api/subscriptions.js` automatically:
- **WITH** Firebase env vars: Reads/writes to Firestore ☁️
- **WITHOUT** Firebase env vars: Falls back to local JSON file 📁

The app paywall already sends these events:
- `trial_started` - User started free trial
- `promo_purchased` - User purchased promo plan
- `premium_purchased` - User purchased Premium ($29.99/mo)
- `pro_purchased` - User purchased Pro ($49.99/mo)

## Security Best Practices

✅ **Do:**
- Keep service account JSON file private
- Use environment variables for credentials
- Add `.env.production` to `.gitignore`
- Restrict Firestore rules to authenticated users only

❌ **Don't:**
- Commit credentials to git
- Share service account key publicly
- Hardcode credentials in source code

## Firestore Security Rules (Recommended)

Once set up, add these rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow server-side access with service account
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

This ensures only your backend (with the service account) can access the data.

## Troubleshooting

**Problem:** "Failed to fetch subscriptions"
- **Solution:** Check that all 3 environment variables are set correctly

**Problem:** "Permission denied" in Firestore
- **Solution:** Verify service account has proper permissions in Firebase Console

**Problem:** Private key format error
- **Solution:** Ensure `\n` newlines are preserved in the FIREBASE_PRIVATE_KEY value

## Questions?

If you need help, check:
- [Firebase Documentation](https://firebase.google.com/docs/firestore)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
