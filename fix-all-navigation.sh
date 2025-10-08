#!/bin/bash

# Fix navigation in all HTML files
for file in /Users/danperry/CascadeProjects/fuelfire-app/*.html; do
    # Update brand name
    sed -i '' 's/🔥 FuelFire/🔥 Well Fit/g' "$file"
    
    # Fix Saved Workouts navigation
    sed -i '' "s|onclick=\"goToPage('index.html')\">📚 Saved Workouts|onclick=\"window.location.href='index.html#saved-workouts'\">📚 Saved Workouts|g" "$file"
    
    # Fix Track Workouts navigation  
    sed -i '' "s|onclick=\"goToPage('index.html')\">📊 Track Workouts|onclick=\"window.location.href='index.html#track-workouts'\">📊 Track Workouts|g" "$file"
    
    # Fix Progress & Analytics navigation
    sed -i '' "s|onclick=\"goToPage('index.html')\">📈 Progress & Analytics|onclick=\"window.location.href='analytics.html'\">📈 Progress & Analytics|g" "$file"
    
    # Add Workout Techniques if missing (check if it's not already there)
    if ! grep -q "Workout Techniques" "$file" && grep -q "sidebar-menu" "$file"; then
        sed -i '' '/Create Workout<\/div>/a\
            <div class="menu-item" onclick="goToPage('"'"'workout-techniques.html'"'"')">🏋️ Workout Techniques</div>' "$file"
    fi
done

echo "Navigation fixed in all HTML files!"