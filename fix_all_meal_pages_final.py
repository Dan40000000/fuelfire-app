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

def fix_meal_file(file_path):
    """Fix all issues in meal files."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix 1: Remove duplicate line in championBadge declaration
    content = re.sub(
        r"(var championBadge[^;]+;)[^}]*?\s+top: -10px[^}]+?MEAL PREP CHAMPION</div>' : '';",
        r"\1",
        content,
        flags=re.DOTALL
    )
    
    # Fix 2: Fix the updateTime function - remove duplicate closing brace and duplicate line
    content = re.sub(
        r"function updateTime\(\) \{[^}]*?\}[^}]*?\);[^}]*?document\.getElementById\('time'\)\.textContent = time;[^}]*?\}",
        r"""function updateTime() {
            var now = new Date();
            var time = now.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            document.getElementById('time').textContent = time;
        }""",
        content,
        flags=re.DOTALL
    )
    
    # Fix 3: Make sure event listener is properly closed
    content = re.sub(
        r"window\.addEventListener\('load', function\(\) \{([^}]*displayMeals\(\);)\s*\}\);",
        r"window.addEventListener('load', function() {\1\n        });",
        content,
        flags=re.DOTALL
    )
    
    return content

def main():
    for file_path in meal_files:
        full_path = os.path.join('/Users/danperry/CascadeProjects/fuelfire-app', file_path)
        if os.path.exists(full_path):
            try:
                fixed_content = fix_meal_file(full_path)
                with open(full_path, 'w') as f:
                    f.write(fixed_content)
                print(f"✓ Fixed {file_path}")
            except Exception as e:
                print(f"✗ Error processing {file_path}: {e}")
        else:
            print(f"✗ File not found: {file_path}")

if __name__ == '__main__':
    main()