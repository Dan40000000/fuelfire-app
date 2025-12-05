# 🚀 HOW TO OPEN THIS PROJECT IN XCODE

## ✅ THE ONLY CORRECT WAY TO OPEN XCODE:

**Open this file:**
```
/Users/danperry/CascadeProjects/fuelfire-app/ios/App/App.xcworkspace
```

**Or from Terminal:**
```bash
open /Users/danperry/CascadeProjects/fuelfire-app/ios/App/App.xcworkspace
```

---

## ⚠️ IMPORTANT - READ THIS:

### ✅ ALWAYS open: `App.xcworkspace` (the workspace file)
### ❌ NEVER open: `App.xcodeproj` (the project file)

**Why?** The workspace includes CocoaPods dependencies. The project file alone will cause build errors.

---

## 🧹 CLEANUP COMPLETED (Nov 5, 2024):

### Deleted:
- ❌ `fuelfire-app 2/` - duplicate folder
- ❌ `fuelfire-app-backup/` - extracted backup folder
- ❌ `ios_backup_20251015_115029/` - old iOS backup folders
- ❌ All causing duplicate Xcode windows to open

### Current Structure:
- ✅ `/Users/danperry/CascadeProjects/fuelfire-app/` - **MAIN PROJECT** (work here)
- ✅ `/Users/danperry/CascadeProjects/fuelfire-app-workout-1.0-backup.tar.gz` - **BACKUP ARCHIVE** (don't touch)

---

## 🔧 IF XCODE STILL HAS ISSUES:

1. **Close Xcode completely** (Cmd+Q)
2. **Clean DerivedData:**
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. **Reinstall Pods:**
   ```bash
   cd /Users/danperry/CascadeProjects/fuelfire-app/ios/App
   pod install
   ```
4. **Open workspace:**
   ```bash
   open App.xcworkspace
   ```
5. **Clean Build Folder in Xcode:** Shift+Cmd+K
6. **Build:** Cmd+B

---

## 📂 PROJECT STRUCTURE:

```
fuelfire-app/
├── public/              ← Web files (HTML, CSS, JS)
├── ios/
│   └── App/
│       ├── App.xcworkspace  ← OPEN THIS IN XCODE ✅
│       ├── App.xcodeproj    ← Don't open this directly
│       └── Pods/            ← CocoaPods dependencies
├── android/
├── capacitor.config.json
└── package.json
```

---

## ✅ YOU SHOULD ONLY SEE:

- **ONE Xcode window** opening
- **ONE project** in CascadeProjects folder
- **ONE backup** .tar.gz file

If you see multiple Xcode windows or duplicate folders, something went wrong. Contact the AI for cleanup.

---

**Last Updated:** November 5, 2024, 8:30 PM
**Cleaned by:** Claude Code AI
