#!/bin/bash

# Fix all meal pages by adding missing variables in displayMeals function

for file in public/meal-*.html; do
    echo "Fixing $file..."
    
    # Add missing variable declarations right before the html += line
    sed -i '' "/for (var index = 0; index < .*Recipes\.length; index++)/,/html += '<div class=\"meal-card\"/s/var meal = .*\[index\];/&\n                var isChampion = meal.mealPrepChampion;\n                var cardStyle = isChampion ? 'style=\"border: 3px solid #FFD700; box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4); transform: scale(1.02);\"' : '';\n                var imageGradient = isChampion ? 'background: linear-gradient(135deg, #FFD700, #FFA500, #8B4513);' : 'background: linear-gradient(135deg, #8B4513, #A0522D);';\n                var championBadge = isChampion ? '<div class=\"champion-badge\" style=\"position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #8B4513; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; box-shadow: 0 3px 10px rgba(255, 215, 0, 0.5);\">MEAL PREP CHAMPION<\/div>' : '';/" "$file"
    
    # Fix closing parentheses for updateTime and addEventListener
    sed -i '' 's/hour12: true$/hour12: true/' "$file"
    sed -i '' 's/});$/});/' "$file"
    sed -i '' 's/displayMeals();$/displayMeals();/' "$file"
    sed -i '' "s/window.addEventListener('load', function() {/window.addEventListener('load', function() {/" "$file"
    sed -i '' '/window.addEventListener.*load.*function/,/displayMeals();$/{s/}$/});/}' "$file"
done

echo "All meal pages fixed!"