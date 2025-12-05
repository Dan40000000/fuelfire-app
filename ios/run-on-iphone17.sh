#!/bin/bash

# Build and run on iPhone 17 simulator
cd "$(dirname "$0")/App"

echo "🔨 Building app..."
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.0' \
  clean build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
  echo "🚀 Installing on iPhone 17 simulator..."

  # Boot simulator if not running
  xcrun simctl boot "8E15F288-DB24-4568-991C-A59D877C861B" 2>/dev/null || true

  # Open simulator
  open -a Simulator

  # Install the app
  xcrun simctl install "8E15F288-DB24-4568-991C-A59D877C861B" ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app

  # Launch the app
  xcrun simctl launch "8E15F288-DB24-4568-991C-A59D877C861B" com.wellfit.app

  echo "✅ App launched on iPhone 17!"
else
  echo "❌ Build failed"
  exit 1
fi
