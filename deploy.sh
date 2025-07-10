#!/bin/bash

echo "🔥 FuelFire Fitness App - GitHub Setup & Deploy Script"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: Please run this script from the project directory"
    exit 1
fi

echo "📋 STEP 1: Create GitHub Repository"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: fuelfire-fitness-app"
echo "3. Description: 🔥 A modern fitness tracking app with Carolina Blue theme"
echo "4. Make it PUBLIC"
echo "5. DON'T initialize with README (we have one)"
echo "6. Click 'Create Repository'"
echo ""

read -p "✅ Press ENTER after creating the GitHub repository..."

echo ""
echo "📤 STEP 2: Pushing to GitHub..."

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🌐 STEP 3: Deploy to Vercel"
    echo "1. Go to: https://vercel.com"
    echo "2. Sign in with GitHub"
    echo "3. Click 'New Project'"
    echo "4. Import 'fuelfire-fitness-app' repository"
    echo "5. Click 'Deploy'"
    echo ""
    echo "🎉 Your app will be live in minutes!"
    echo "📱 Repository: https://github.com/$(git config user.name)/fuelfire-fitness-app"
else
    echo "❌ Error pushing to GitHub. Please check:"
    echo "1. Repository exists on GitHub"
    echo "2. You have push permissions"
    echo "3. GitHub credentials are configured"
fi