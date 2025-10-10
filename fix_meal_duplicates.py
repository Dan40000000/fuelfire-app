#!/usr/bin/env python3

import os
import re

# List of meal files to fix
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

def fix_duplicate_declarations(file_path):
    """Fix duplicate variable declarations in displayMeals function."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Find the displayMeals function
    display_meals_pattern = r'(function displayMeals\(\)\s*{[^}]*?)(var isChampion[^;]+;[^}]*?var cardStyle[^;]+;[^}]*?var imageGradient[^;]+;[^}]*?var championBadge[^;]+;[^}]*?)(var isChampion[^;]+;[^}]*?var cardStyle[^;]+;[^}]*?var imageGradient[^;]+;[^}]*?var championBadge[^;]+;)'
    
    # Check if there are duplicate declarations
    if re.search(display_meals_pattern, content, re.DOTALL):
        # Remove the duplicate declarations (keep only the first set)
        content = re.sub(
            display_meals_pattern,
            r'\1\2',
            content,
            flags=re.DOTALL
        )
        print(f"Fixed duplicate declarations in {file_path}")
    
    # Also check for any syntax errors in updateTime function
    # Fix any extra closing braces
    content = re.sub(
        r'(function updateTime\(\)\s*{[^}]*?)}\s*}(\s*setInterval)',
        r'\1}\2',
        content,
        flags=re.DOTALL
    )
    
    # Make sure event listener is properly closed
    content = re.sub(
        r"(window\.addEventListener\('load', function\(\) \{[^}]*displayMeals\(\);)\s*}\s*$",
        r'\1\n        });',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    return content

def main():
    for file_path in meal_files:
        full_path = os.path.join('/Users/danperry/CascadeProjects/fuelfire-app', file_path)
        if os.path.exists(full_path):
            try:
                fixed_content = fix_duplicate_declarations(full_path)
                with open(full_path, 'w') as f:
                    f.write(fixed_content)
                print(f"✓ Processed {file_path}")
            except Exception as e:
                print(f"✗ Error processing {file_path}: {e}")
        else:
            print(f"✗ File not found: {file_path}")

if __name__ == '__main__':
    main()