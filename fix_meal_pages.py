#!/usr/bin/env python3

import os
import re
import sys

def fix_javascript_in_file(filepath):
    """Fix all ES6 JavaScript issues in a meal file"""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Get the recipe variable name (chickenRecipes, beefRecipes, etc.)
    recipe_var_match = re.search(r'var (\w+Recipes) = getCurrentRecipes\(\);', content)
    if recipe_var_match:
        recipe_var = recipe_var_match.group(1)
    else:
        # Try to find it another way
        recipe_var_match = re.search(r'(\w+Recipes)\.forEach', content)
        if recipe_var_match:
            recipe_var = recipe_var_match.group(1)
        else:
            print(f"Could not find recipe variable in {filepath}")
            return False
    
    print(f"Found recipe variable: {recipe_var}")
    
    # Fix forEach loops
    # Fix the main display loop
    pattern = rf'{recipe_var}\.forEach\(\(meal, index\) => \{{'
    replacement = rf'for (var index = 0; index < {recipe_var}.length; index++) {{\n                var meal = {recipe_var}[index];'
    content = re.sub(pattern, replacement, content)
    
    # Fix ingredients forEach
    content = re.sub(
        r'meal\.ingredients\.forEach\(function\(ingredient\) \{',
        r'for (var i = 0; i < meal.ingredients.length; i++) {\n                var ingredient = meal.ingredients[i];',
        content
    )
    
    # Fix instructions forEach with arrow function
    content = re.sub(
        r'meal\.instructions\.forEach\(\(instruction, i\) => \{',
        r'for (var i = 0; i < meal.instructions.length; i++) {\n                var instruction = meal.instructions[i];',
        content
    )
    
    # Fix template literals in displayMeals function
    # This is complex, we need to find the html += ` ... ` blocks
    def replace_template_literal(match):
        template = match.group(1)
        # Replace ${...} with string concatenation
        result = template
        result = re.sub(r'\$\{([^}]+)\}', r'" + \1 + "', result)
        # Handle newlines and formatting
        lines = result.split('\n')
        formatted_lines = []
        for i, line in enumerate(lines):
            line = line.strip()
            if line:
                if i == 0:
                    formatted_lines.append("'" + line)
                else:
                    formatted_lines.append("                    '" + line)
        
        if formatted_lines:
            return 'html += ' + ' +\n'.join(formatted_lines) + "';"
        return match.group(0)
    
    # Fix the main display template literal
    display_pattern = r'html \+= `([\s\S]*?)`;\s*\}\)'
    display_match = re.search(display_pattern, content)
    if display_match:
        template = display_match.group(1)
        # Replace ${...} with concatenation
        fixed_template = re.sub(r'\$\{([^}]+)\}', r"' + \1 + '", template)
        # Build the concatenated string
        replacement = """html += '<div class="meal-card" onclick="openRecipeModal(' + index + ')" ' + cardStyle + '>' +
                    championBadge +
                    '<div class="meal-image" style="' + imageGradient + '">' +
                        '<div class="difficulty-badge">' +
                            'Difficulty: ' + generateDifficultyStars(meal.difficulty) +
                        '</div>' +
                        '<span class="category-icon">' + meal.icon + '</span>' +
                    '</div>' +
                    '<div class="meal-content">' +
                        '<div class="meal-title">' + meal.name + '</div>' +
                        '<div class="meal-description">' + meal.description + '</div>' +
                        '<div class="meal-stats">' +
                            '<div class="meal-time">⏱️ ' + meal.time + '</div>' +
                            '<div class="rating-stars">' + generateRatingStars(meal.rating) + '</div>' +
                        '</div>' +
                        '<div class="meal-nutrition">' +
                            '<div class="nutrition-item">' +
                                '<div class="nutrition-value">' + meal.calories + '</div>' +
                                '<div class="nutrition-label">Cal</div>' +
                            '</div>' +
                            '<div class="nutrition-item">' +
                                '<div class="nutrition-value">' + meal.protein + 'g</div>' +
                                '<div class="nutrition-label">Protein</div>' +
                            '</div>' +
                            '<div class="nutrition-item">' +
                                '<div class="nutrition-value">' + meal.carbs + 'g</div>' +
                                '<div class="nutrition-label">Carbs</div>' +
                            '</div>' +
                            '<div class="nutrition-item">' +
                                '<div class="nutrition-value">' + meal.fat + 'g</div>' +
                                '<div class="nutrition-label">Fat</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }"""
        content = re.sub(display_pattern, replacement, content)
    
    # Fix template literals in modal
    # Modal subtitle
    modal_subtitle_pattern = r"document\.getElementById\('modal-subtitle'\)\.innerHTML = `([^`]+)`;"
    modal_subtitle_match = re.search(modal_subtitle_pattern, content)
    if modal_subtitle_match:
        template = modal_subtitle_match.group(1)
        fixed = re.sub(r'\$\{([^}]+)\}', r"' + \1 + '", template)
        replacement = f"document.getElementById('modal-subtitle').innerHTML = \n                '{fixed}';"
        content = re.sub(modal_subtitle_pattern, replacement, content)
    
    # Fix ingredient template
    ingredient_pattern = r"ingredientsHtml \+= `([\s\S]*?)`;"
    ingredient_matches = re.finditer(ingredient_pattern, content)
    for match in ingredient_matches:
        template = match.group(1)
        fixed = re.sub(r'\$\{([^}]+)\}', r"' + \1 + '", template)
        replacement = f"""ingredientsHtml += 
                    '<div class="ingredient-item">' +
                        '<input type="checkbox" class="ingredient-checkbox">' +
                        '<span>' + ingredient + '</span>' +
                    '</div>';"""
        content = content.replace(match.group(0), replacement)
    
    # Fix instruction template
    instruction_pattern = r"instructionsHtml \+= `([\s\S]*?)`;"
    instruction_matches = re.finditer(instruction_pattern, content)
    for match in instruction_matches:
        template = match.group(1)
        replacement = """instructionsHtml += 
                    '<div class="instruction-item">' +
                        '<strong>Step ' + (i + 1) + ':</strong> ' + instruction +
                    '</div>';"""
        content = content.replace(match.group(0), replacement)
    
    # Fix nutrition template
    nutrition_pattern = r"var nutritionHtml = `([\s\S]*?)`;"
    nutrition_match = re.search(nutrition_pattern, content)
    if nutrition_match:
        replacement = """var nutritionHtml = 
                '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; padding: 15px; background: #f8f9ff; border-radius: 10px;">' +
                    '<div style="text-align: center;">' +
                        '<div style="font-weight: bold; color: var(--primary);">' + meal.calories + '</div>' +
                        '<div style="font-size: 12px; color: #666;">Calories</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-weight: bold; color: var(--primary);">' + meal.protein + 'g</div>' +
                        '<div style="font-size: 12px; color: #666;">Protein</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-weight: bold; color: var(--primary);">' + meal.carbs + 'g</div>' +
                        '<div style="font-size: 12px; color: #666;">Carbs</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-weight: bold; color: var(--primary);">' + meal.fat + 'g</div>' +
                        '<div style="font-size: 12px; color: #666;">Fat</div>' +
                    '</div>' +
                '</div>';"""
        content = re.sub(nutrition_pattern, replacement, content)
    
    # Fix alert template literal
    alert_pattern = r"alert\('✅ \$\{meal\.name\} logged! \(\+' \+ meal\.calories \+ ' calories\)'\);"
    content = re.sub(alert_pattern, "alert('✅ ' + meal.name + ' logged! (+' + meal.calories + ' calories)');", content)
    
    # Make sure toggleSidebar, goToPage, and goBack are attached to window
    if 'window.toggleSidebar = function()' not in content:
        content = re.sub(
            r'function toggleSidebar\(\) \{',
            r'window.toggleSidebar = function() {',
            content
        )
    
    if 'window.goToPage = function' not in content:
        content = re.sub(
            r'function goToPage\(page\) \{',
            r'window.goToPage = function(page) {',
            content
        )
    
    if 'window.goBack = function' not in content:
        content = re.sub(
            r'function goBack\(\) \{',
            r'window.goBack = function() {',
            content
        )
    
    # Write the fixed content back
    with open(filepath, 'w') as f:
        f.write(content)
    
    return True

# Process all meal files
meal_files = [
    'public/meal-chicken.html',
    'public/meal-pork.html',
    'public/meal-shrimp.html',
    'public/meal-turkey.html',
    'public/meal-sandwiches.html',
    'public/meal-keto.html',
    'public/meal-fusion.html'
]

for filepath in meal_files:
    if os.path.exists(filepath):
        print(f"\nFixing {filepath}...")
        if fix_javascript_in_file(filepath):
            print(f"✅ Successfully fixed {filepath}")
        else:
            print(f"❌ Failed to fix {filepath}")
    else:
        print(f"File not found: {filepath}")

print("\n✅ All meal pages have been fixed!")