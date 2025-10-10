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

def fix_css_javascript_injection(file_path):
    """Remove JavaScript code that was incorrectly injected into CSS sections."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to find and remove JavaScript lines in CSS sections
    # These lines start with 'var championBadge' and are inside style tags
    patterns_to_remove = [
        r"^\s*var championBadge = isChampion.*?MEAL PREP CHAMPION</div>' : '';.*?$",
    ]
    
    # Split content by lines
    lines = content.split('\n')
    cleaned_lines = []
    in_style_tag = False
    
    for line in lines:
        # Track if we're inside a <style> tag
        if '<style>' in line:
            in_style_tag = True
        elif '</style>' in line:
            in_style_tag = False
        
        # If we're in a style section and the line contains JavaScript, skip it
        if in_style_tag:
            if 'var championBadge' in line or 'var isChampion' in line:
                # Skip this line - it's JavaScript in CSS
                continue
        
        # Also check CSS class definitions that have JavaScript injected
        if re.match(r'^\s*\.\w+[-\w]*\s*\{', line):  # CSS class definition
            # Keep the line as is
            cleaned_lines.append(line)
        elif 'var championBadge' in line and 'position:' not in line and '<script>' not in cleaned_lines[-10:] if len(cleaned_lines) > 10 else True:
            # This is JavaScript outside of script tags - skip it
            continue
        else:
            cleaned_lines.append(line)
    
    # Join lines back
    fixed_content = '\n'.join(cleaned_lines)
    
    # Fix specific CSS classes that have JavaScript injected
    css_fixes = [
        (r'\.fusion-badge\s*\{\s*var championBadge[^}]*?\}', '.fusion-badge {\n            position: absolute;\n        }'),
        (r'\.keto-badge\s*\{\s*var championBadge[^}]*?\}', '.keto-badge {\n            position: absolute;\n        }'),
        (r'\.difficulty-badge\s*\{\s*var championBadge[^}]*?\}', '.difficulty-badge {\n            position: absolute;\n        }'),
        (r'\.cuisine-fusion\s*\{\s*var championBadge[^}]*?\}', '.cuisine-fusion {\n            position: absolute;\n        }'),
        (r'\.carb-badge\s*\{\s*var championBadge[^}]*?\}', '.carb-badge {\n            position: absolute;\n        }'),
        (r'\.close-modal\s*\{\s*[^}]*?var championBadge[^}]*?\}', '''.close-modal {
            color: white;
            float: right;
            font-size: 28px;
            font-weight: bold;
            background: none;
            border: none;
            cursor: pointer;
            position: absolute;
        }'''),
    ]
    
    for pattern, replacement in css_fixes:
        fixed_content = re.sub(pattern, replacement, fixed_content, flags=re.DOTALL)
    
    return fixed_content

def main():
    for file_path in meal_files:
        full_path = os.path.join('/Users/danperry/CascadeProjects/fuelfire-app', file_path)
        if os.path.exists(full_path):
            try:
                fixed_content = fix_css_javascript_injection(full_path)
                with open(full_path, 'w') as f:
                    f.write(fixed_content)
                print(f"✓ Fixed CSS injection in {file_path}")
            except Exception as e:
                print(f"✗ Error processing {file_path}: {e}")
        else:
            print(f"✗ File not found: {file_path}")

if __name__ == '__main__':
    main()