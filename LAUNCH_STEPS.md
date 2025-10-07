# 🚀 APP STORE LAUNCH STEPS - MORNING CHECKLIST

## ✅ Step 1: Accept Xcode License
Open Terminal and run:
```bash
sudo xcodebuild -license accept
```
Enter your Mac password when prompted.

## ✅ Step 2: Install CocoaPods
In Terminal, run:
```bash
sudo gem install cocoapods
```

## ✅ Step 3: Build the iOS App
In Terminal, navigate to your project:
```bash
cd /Users/danperry/CascadeProjects/fuelfire-app
npm run cap:sync
npm run ios:build
```

## ✅ Step 4: Open in Xcode
```bash
open ios/App/App.xcworkspace
```

## ✅ Step 5: Configure Signing in Xcode
1. Click on "App" in the left sidebar
2. Select "Signing & Capabilities" tab
3. Check "Automatically manage signing"
4. Select your Team (your Apple Developer account)
5. Bundle Identifier should be: `com.wellfit.app`

## ✅ Step 6: Archive for App Store
1. Select "Any iOS Device (arm64)" as destination (top bar)
2. Menu: Product → Archive
3. Wait for build to complete (5-10 minutes)
4. When done, Organizer window opens

## ✅ Step 7: Upload to App Store Connect
1. In Organizer, click "Distribute App"
2. Select "App Store Connect" → Next
3. Select "Upload" → Next
4. Keep all defaults → Next
5. Click "Upload"

## ✅ Step 8: Complete App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Select your app "Well Fit Pro"
3. Fill in:
   - Description (see APP_STORE_LISTING.md)
   - Keywords
   - Screenshots (take from simulator)
   - Privacy Policy URL: https://fuelfire-app.vercel.app/privacy-policy.html
   - Support URL: https://github.com/Dan40000000/fuelfire-app
4. Submit for Review!

## 📱 App Details:
- **App Name:** Well Fit Pro
- **Bundle ID:** com.wellfit.app
- **Version:** 1.0
- **Build:** 1

## 🎯 Screenshots Needed:
- iPhone 6.5" (iPhone 14 Pro Max)
- iPhone 5.5" (iPhone 8 Plus)
Take these in Xcode Simulator

## 📝 App Description:
See `APP_STORE_LISTING.md` for full description to copy/paste

## 🔗 Important URLs:
- **Privacy Policy:** https://fuelfire-app.vercel.app/privacy-policy.html
- **Support:** https://github.com/Dan40000000/fuelfire-app
- **Marketing:** https://fuelfire-app.vercel.app

## ⚠️ NOTES:
- Build takes 5-10 minutes
- Upload takes 5-10 minutes  
- Review takes 24-48 hours typically
- Make sure you're on WiFi for faster uploads

---

**YOU'RE SO CLOSE! Just follow these steps in order and your app will be LIVE!** 🎉