#!/bin/bash

cd /Users/danperry/CascadeProjects/fuelfire-app/public

# Array of all HTML files that need fixing
files=(
    "workout-chest.html"
    "workout-legs.html"
    "workout-shoulders.html"
    "workout-arms.html"
    "workout-back.html"
    "workout-core.html"
    "workout-calves.html"
    "workout-cardio.html"
    "calorie-tracker.html"
    "enhanced-diet-quiz.html"
    "meal-plans.html"
    "meal-ideas.html"
    "supplements.html"
    "workout-techniques.html"
    "workout-quiz.html"
)

echo "Fixing all pages..."

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."

        # 1. Remove hardcoded times from status bar (remove entire span with 9:41)
        sed -i '' 's/<span id="time">9:41 AM<\/span>//g' "$file"
        sed -i '' 's/<span>9:41<\/span>//g' "$file"

        # 2. Add viewport-fit=cover if viewport tag exists but doesn't have it
        sed -i '' 's/<meta name="viewport" content="width=device-width, initial-scale=1.0">/<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">/g' "$file"

        echo "✓ $file updated"
    fi
done

echo ""
echo "All pages fixed!"
