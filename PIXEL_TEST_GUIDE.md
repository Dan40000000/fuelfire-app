# Testing Well Fit on Pixel 9 Pro XL

## Quick Steps:

### 1. First, trigger the build on GitHub:
- Go to: https://github.com/Dan40000000/fuelfire-app/actions
- Click "Build Android App Bundle"
- Click "Run workflow" → "Run workflow" (green button)
- Wait ~5-10 minutes

### 2. Enable app installation on your Pixel:
- Settings → Apps → Special app access → Install unknown apps
- Select Chrome (or your browser)
- Toggle "Allow from this source" ON

### 3. Get the APK to your phone:

**Easiest method - Direct GitHub download:**
1. On your Pixel, go to: https://github.com/Dan40000000/fuelfire-app/actions
2. Sign in to GitHub
3. Click your completed workflow run
4. Scroll to "Artifacts"
5. Tap "app-release-apk"
6. It'll download the zip
7. Open Files app → Downloads
8. Tap the zip file to extract
9. Tap "app-release.apk"
10. Tap "Install"

**Alternative - Google Drive:**
1. Download APK on your computer
2. Upload to Google Drive
3. Open Drive on your Pixel
4. Download and install

### 4. Launch Well Fit!
- The app will appear as "Well Fit" in your app drawer
- Icon should be visible
- Test all features!

## What to test:
- [ ] App opens without crashing
- [ ] Login/signup works
- [ ] Meal tracking works
- [ ] Goals section works
- [ ] Camera/photo features work
- [ ] Everything looks good on that beautiful 6.8" screen

## Troubleshooting:
- If install blocked: Make sure "Install unknown apps" is enabled for your browser
- If app crashes: The build might need fixes
- If features don't work: Check internet connection

Your Pixel 9 Pro XL runs Android 14, so the app should run perfectly!