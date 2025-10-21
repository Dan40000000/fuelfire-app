#!/bin/bash

# List of files that need bottom nav
files=(
    "calorie-tracker.html"
    "enhanced-diet-quiz.html"
    "meal-beef.html"
    "meal-chicken.html"
    "meal-ideas.html"
    "meal-keto.html"
    "meal-plan-simple.html"
    "meal-plan.html"
    "meal-plans.html"
    "meal-pork.html"
    "meal-protein-bowls.html"
    "meal-seafood.html"
    "meal-wraps.html"
    "supplements-blood-pressure.html"
    "supplements-brain.html"
    "supplements-endurance.html"
    "supplements-gut.html"
    "supplements-heart.html"
    "supplements-kidney.html"
    "supplements-liver.html"
    "supplements-muscle-building.html"
    "supplements-pre-workout.html"
    "supplements-recovery.html"
    "supplements-testosterone.html"
    "supplements-weight-loss.html"
)

bottom_nav='
    <!-- Bottom Navigation Bar -->
    <div class="bottom-nav">
        <div class="nav-item" onclick="window.location.href='"'"'index.html'"'"'" ontouchstart="">
            <div class="nav-icon">🍽️</div>
            <div class="nav-label">Log Food</div>
            <div class="nav-glow"></div>
        </div>
        <div class="nav-item" onclick="window.location.href='"'"'workout-quiz.html'"'"'" ontouchstart="">
            <div class="nav-icon">🏋️</div>
            <div class="nav-label">Quick Workout</div>
            <div class="nav-glow"></div>
        </div>
        <div class="nav-item" onclick="window.location.href='"'"'meal-plans.html'"'"'" ontouchstart="">
            <div class="nav-icon">📋</div>
            <div class="nav-label">Meal Plan</div>
            <div class="nav-glow"></div>
        </div>
        <div class="nav-item" onclick="window.location.href='"'"'index.html#progress'"'"'" ontouchstart="">
            <div class="nav-icon">📈</div>
            <div class="nav-label">Progress</div>
            <div class="nav-glow"></div>
        </div>
    </div>
'

cd /Users/danperry/CascadeProjects/fuelfire-app/public

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        # Check if bottom-nav already exists
        if ! grep -q "bottom-nav" "$file"; then
            # Find the line before </body> and insert bottom nav
            sed -i '' "/<\/body>/i\\
$bottom_nav
" "$file"
            echo "Added bottom nav to $file"
        else
            echo "Bottom nav already exists in $file"
        fi
    fi
done
