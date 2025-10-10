#!/usr/bin/env python3

import os
import re

def fix_meal_page(filepath):
    """Fix all issues in a meal recipe page"""
    
    # Read the file
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Get the recipe variable name
    recipe_var_match = re.search(r'var (\w+Recipes) = getCurrentRecipes\(\);', content)
    if not recipe_var_match:
        recipe_var_match = re.search(r'for \(var index = 0; index < (\w+Recipes)\.length', content)
        if not recipe_var_match:
            print(f"Could not find recipe variable in {filepath}")
            return False
    
    recipe_var = recipe_var_match.group(1)
    print(f"Found recipe variable: {recipe_var}")
    
    # Fix the displayMeals function to properly declare variables
    display_meals_pattern = r'(function displayMeals\(\) \{[\s\S]*?for \(var index = 0; index < ' + recipe_var + r'\.length; index\+\+\) \{\s*var meal = ' + recipe_var + r'\[index\];)'
    
    display_meals_replacement = r'''\1
                var isChampion = meal.mealPrepChampion;
                var cardStyle = isChampion ? 'style="border: 3px solid #FFD700; box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4); transform: scale(1.02);"' : '';
                var imageGradient = isChampion ? 'background: linear-gradient(135deg, #FFD700, #FFA500, #8B4513);' : 'background: linear-gradient(135deg, #8B4513, #A0522D);';
                var championBadge = isChampion ? '<div class="champion-badge" style="position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #8B4513; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; box-shadow: 0 3px 10px rgba(255, 215, 0, 0.5);">MEAL PREP CHAMPION</div>' : '';'''
    
    content = re.sub(display_meals_pattern, display_meals_replacement, content)
    
    # Check if the meal page has special badge logic (for sandwiches)
    if 'sandwichRecipes' in content and 'fusionBadge' in content:
        # Fix sandwiches page special fusion badge
        sandwich_pattern = r'(var meal = sandwichRecipes\[index\];)'
        sandwich_replacement = r'''\1
                var isChampion = meal.mealPrepChampion;
                var cardStyle = isChampion ? 'style="border: 3px solid #FFD700; box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4); transform: scale(1.02);"' : '';
                var imageGradient = isChampion ? 'background: linear-gradient(135deg, #FFD700, #FFA500, #8B4513);' : 'background: linear-gradient(135deg, #4ECDC4, #44A08D);';
                var championBadge = isChampion ? '<div class="champion-badge" style="position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #8B4513; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; box-shadow: 0 3px 10px rgba(255, 215, 0, 0.5);">MEAL PREP CHAMPION</div>' : '';
                var fusionBadge = meal.fusion ? '<div class="fusion-badge">FUSION</div>' : '';'''
        content = re.sub(sandwich_pattern, sandwich_replacement, content)
    
    # Fix any remaining syntax issues
    # Fix missing closing parenthesis in alert
    content = re.sub(r"alert\('✅ \$\{meal\.name\} logged!", r"alert('✅ ' + meal.name + ' logged!", content)
    
    # Fix any template literal remnants in alert
    if 'ketoRecipes' in content:
        content = re.sub(r"alert\('✅ \$\{meal\.name\} logged! \(\+' \+ meal\.calories \+ ' calories\) 🥑 KETO APPROVED!'\);", 
                        r"alert('✅ ' + meal.name + ' logged! (+' + meal.calories + ' calories) 🥑 KETO APPROVED!');", content)
    
    # Fix updateTime function missing closing brace
    update_time_pattern = r'(function updateTime\(\) \{[\s\S]*?hour12: true\s*)\}'
    update_time_replacement = r'\1});\n            document.getElementById("time").textContent = time;\n        }'
    content = re.sub(update_time_pattern, update_time_replacement, content, flags=re.MULTILINE)
    
    # Ensure closeModal function is defined
    if 'function closeModal()' not in content:
        # Add closeModal function before logRecipe
        log_recipe_pattern = r'(function logRecipe\(index\) \{)'
        close_modal_function = '''function closeModal() {
            document.getElementById('recipe-modal').style.display = 'none';
        }
        
        \1'''
        content = re.sub(log_recipe_pattern, close_modal_function, content)
    
    # Write the fixed content back
    with open(filepath, 'w') as f:
        f.write(content)
    
    return True

# List of all meal recipe pages
meal_files = [
    'public/meal-beef.html',
    'public/meal-chicken.html',
    'public/meal-pork.html',
    'public/meal-shrimp.html',
    'public/meal-turkey.html',
    'public/meal-sandwiches.html',
    'public/meal-keto.html',
    'public/meal-fusion.html'
]

print("=== Fixing all meal recipe pages ===\n")

for filepath in meal_files:
    if os.path.exists(filepath):
        print(f"Processing {filepath}...")
        if fix_meal_page(filepath):
            print(f"✅ Fixed {filepath}\n")
        else:
            print(f"❌ Failed to fix {filepath}\n")
    else:
        print(f"⚠️ File not found: {filepath}\n")

print("=== All meal pages processed ===")