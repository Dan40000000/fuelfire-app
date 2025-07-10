#!/bin/bash

# GitHub CLI Setup Script for FuelFire App
echo "🔥 FuelFire Fitness App - GitHub CLI Setup"
echo "=========================================="
echo ""

# Set up local gh command
GH_PATH="$PWD/gh_2.74.2_macOS_arm64/bin/gh"

echo "📋 Step 1: GitHub Authentication"
echo "You'll need to authenticate with GitHub. This will open your browser."
echo ""
read -p "Press ENTER to continue with GitHub authentication..."

# Authenticate with GitHub
$GH_PATH auth login

echo ""
echo "🔍 Checking authentication status..."
$GH_PATH auth status

echo ""
echo "📦 Step 2: Creating GitHub Repository"
echo "Creating public repository 'fuelfire-fitness-app'..."

$GH_PATH repo create fuelfire-fitness-app \
  --public \
  --description "🔥 A modern fitness tracking app with Carolina Blue theme - mobile-first design for workout, nutrition, and progress tracking" \
  --homepage "https://fuelfire-fitness-app.vercel.app"

if [ $? -eq 0 ]; then
    echo "✅ Repository created successfully!"
    echo ""
    
    echo "📤 Step 3: Pushing code to GitHub"
    
    # Update remote origin to match the created repo
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://github.com/$(gh config get username)/fuelfire-fitness-app.git"
    
    # Push to GitHub
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Code pushed successfully!"
        echo ""
        echo "🎉 SUCCESS! Your FuelFire app is now on GitHub!"
        echo "📱 Repository: https://github.com/$(gh config get username)/fuelfire-fitness-app"
        echo ""
        echo "🌐 Next step: Deploy to Vercel"
        echo "1. Go to: https://vercel.com"
        echo "2. Sign in with GitHub"
        echo "3. Click 'New Project'"
        echo "4. Import 'fuelfire-fitness-app' repository"
        echo "5. Click 'Deploy'"
        echo ""
        echo "🚀 Your app will be live in minutes!"
    else
        echo "❌ Error pushing to GitHub"
        echo "Please check the error above and try again."
    fi
else
    echo "❌ Error creating repository"
    echo "Please check the error above and try again."
fi

echo ""
echo "🧹 Cleaning up temporary files..."
rm -rf gh_2.74.2_macOS_arm64 gh.zip