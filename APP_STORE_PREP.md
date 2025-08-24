# App Store Preparation Guide for Well Fit

## Current Status
- App Name: Well Fit
- Bundle ID: com.wellfit.app
- Version: 1.0 (Build 1)
- Icons: ✅ Configured for both platforms

## Google Play Store Preparation

### Prerequisites
1. **Install Java JDK** (Required for Android builds)
   ```bash
   # On macOS with Homebrew:
   brew install openjdk@17
   
   # Or download from: https://adoptium.net/
   ```

2. **Set JAVA_HOME** (after installing Java)
   ```bash
   echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc
   source ~/.zshrc
   ```

### Build Android App Bundle (.aab)
```bash
# 1. Sync Capacitor
npx cap sync android

# 2. Build the release bundle
cd android
./gradlew bundleRelease

# The .aab file will be at:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Signing the App Bundle
For Play Store, you'll need to sign your app:

1. **Generate a keystore** (if you don't have one):
   ```bash
   keytool -genkey -v -keystore ~/wellfit-release-key.keystore \
     -alias wellfit -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing** in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('~/wellfit-release-key.keystore')
               storePassword 'YOUR_STORE_PASSWORD'
               keyAlias 'wellfit'
               keyPassword 'YOUR_KEY_PASSWORD'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

## Apple App Store Preparation

### Prerequisites
1. **Xcode** (Already installed)
2. **Apple Developer Account** ($99/year)
3. **App Store Connect access**

### Build iOS App
```bash
# 1. Sync Capacitor
npx cap sync ios

# 2. Open in Xcode
npx cap open ios

# 3. In Xcode:
# - Select "Any iOS Device" as build target
# - Product > Archive
# - Follow the wizard to upload to App Store Connect
```

### Important iOS Settings in Xcode:
1. **Signing & Capabilities**:
   - Team: Select your Apple Developer Team
   - Bundle Identifier: com.wellfit.app
   - Automatically manage signing: ✓

2. **General Tab**:
   - Display Name: Well Fit
   - Version: 1.0
   - Build: 1

## App Store Listing Requirements

### Google Play Store
- **App Icon**: 512x512px PNG
- **Feature Graphic**: 1024x500px
- **Screenshots**: At least 2 (up to 8)
  - Phone: 1080x1920px or similar aspect ratio
  - Tablet (optional): 1920x1080px or similar
- **Short Description**: Max 80 characters
- **Full Description**: Max 4000 characters
- **Privacy Policy URL**: Required
- **Category**: Health & Fitness

### Apple App Store
- **App Icon**: 1024x1024px PNG (no transparency)
- **Screenshots**: 
  - iPhone 6.7": 1290x2796px
  - iPhone 6.5": 1242x2688px or 1284x2778px
  - iPhone 5.5": 1242x2208px
  - iPad Pro 12.9": 2048x2732px
- **App Name**: Max 30 characters
- **Subtitle**: Max 30 characters
- **Description**: Max 4000 characters
- **Keywords**: Max 100 characters
- **Privacy Policy URL**: Required
- **Category**: Health & Fitness

## Quick Commands Reference
```bash
# Android build
npx cap sync android && cd android && ./gradlew bundleRelease

# iOS build
npx cap sync ios && npx cap open ios

# Check build outputs
ls -la android/app/build/outputs/bundle/release/
ls -la ios/App/build/
```

## Next Steps
1. Install Java JDK for Android builds
2. Set up signing certificates for both platforms
3. Create app listings in both stores
4. Prepare marketing materials (screenshots, descriptions)
5. Submit for review

## Testing Before Submission
- Test on physical devices
- Check all features work offline/online
- Verify in-app purchases (if any)
- Test on different screen sizes
- Review crash reports from test builds