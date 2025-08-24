# Cloud Build Options for Well Fit App

## Option 1: GitHub Actions (FREE - Recommended)
The easiest cloud build option. I've already set up the workflows for you!

### How to use:
1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for app store builds"
   git push origin main
   ```

2. **Trigger builds manually from GitHub**
   - Go to your repo on GitHub
   - Click "Actions" tab
   - Select "Build Android App Bundle" or "Build iOS App"
   - Click "Run workflow"
   - Download the artifacts when complete

### What you get:
- **Android**: `.aab` file (for Play Store) + `.apk` (for testing)
- **iOS**: Unsigned `.ipa` file (needs signing before App Store)

## Option 2: Expo EAS Build (EASIEST - $30/month)
Professional cloud build service with automatic signing.

### Setup:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure your project
eas build:configure

# Build for Android (creates signed .aab)
eas build --platform android --profile production

# Build for iOS (creates signed .ipa)
eas build --platform ios --profile production
```

### Benefits:
- Handles all signing automatically
- Direct submission to app stores
- No local setup needed
- Works on any computer

## Option 3: Capacitor Appflow (Professional - $499/month)
Ionic's official CI/CD service.

### Features:
- Native builds in the cloud
- Automatic code signing
- Direct store deployment
- Live updates

### Setup:
1. Sign up at https://ionic.io/appflow
2. Connect your GitHub repo
3. Configure build settings
4. Trigger builds from dashboard

## Option 4: Codemagic (FREE tier available)
Popular CI/CD for mobile apps.

### Setup:
1. Sign up at https://codemagic.io
2. Connect your GitHub repo
3. Use this `codemagic.yaml`:

```yaml
workflows:
  android-workflow:
    name: Android Build
    instance_type: mac_mini_m1
    environment:
      node: 18
      java: 17
    scripts:
      - npm ci
      - npx cap sync android
      - cd android && ./gradlew bundleRelease
    artifacts:
      - android/app/build/outputs/**/*.aab
      
  ios-workflow:
    name: iOS Build
    instance_type: mac_mini_m1
    environment:
      node: 18
      xcode: latest
    scripts:
      - npm ci
      - npx cap sync ios
      - cd ios/App && pod install
      - xcodebuild archive -workspace App.xcworkspace -scheme App
    artifacts:
      - ios/App/build/**/*.ipa
```

## Quick Start Commands

### For GitHub Actions (Already configured!):
```bash
# Just push to trigger builds
git push origin main

# Or trigger manually from GitHub Actions tab
```

### For EAS Build:
```bash
# One-time setup
npm install -g eas-cli
eas login

# Build commands
eas build --platform android
eas build --platform ios

# Check build status
eas build:list
```

### For local testing before cloud build:
```bash
# Test Android locally (if Java installed)
npx cap sync android
cd android && ./gradlew assembleDebug

# Test iOS locally (Mac only)
npx cap sync ios
npx cap open ios
```

## Signing Setup for App Stores

### Android (Play Store):
1. EAS/Codemagic handle this automatically
2. For GitHub Actions, add your keystore as a secret

### iOS (App Store):
1. Need Apple Developer account ($99/year)
2. EAS handles certificates automatically
3. For GitHub Actions, use fastlane match

## Recommended Approach:
1. **Start with GitHub Actions** (free, already set up)
2. **Upgrade to EAS Build** when you need automatic signing ($30/month)
3. **Use Appflow** for enterprise features later

Your workflows are ready to use! Just push to GitHub and trigger the builds.