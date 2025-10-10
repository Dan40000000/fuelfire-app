#!/usr/bin/env python3

import os

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

def fix_champion_badge(file_path):
    """Fix broken championBadge variable declaration."""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    fixed_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this line has a broken championBadge declaration
        if 'var championBadge = isChampion ?' and 'position: absolute;' in line and 'MEAL PREP CHAMPION' not in line:
            # This is the start of a broken declaration
            # Complete it properly on one line
            fixed_line = "                var championBadge = isChampion ? '<div class=\"champion-badge\" style=\"position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #8B4513; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; box-shadow: 0 3px 10px rgba(255, 215, 0, 0.5);\">MEAL PREP CHAMPION</div>' : '';\n"
            fixed_lines.append(fixed_line)
            
            # Skip the next line if it contains the continuation
            if i + 1 < len(lines) and 'MEAL PREP CHAMPION' in lines[i + 1]:
                i += 2
            else:
                i += 1
        # Also check for duplicate/broken lines in sandwiches file
        elif 'var fusionBadge' in line and i > 0 and 'var championBadge' in lines[i-1]:
            # Check if previous line has broken championBadge
            if 'position: absolute;' in lines[i-1] and 'MEAL PREP CHAMPION' not in lines[i-1]:
                # Fix the previous line
                fixed_lines[-1] = "                var championBadge = isChampion ? '<div class=\"champion-badge\" style=\"position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #8B4513; padding: 8px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; box-shadow: 0 3px 10px rgba(255, 215, 0, 0.5);\">MEAL PREP CHAMPION</div>' : '';\n"
                
                # Skip the continuation line if present
                if 'top: -10px' in line:
                    # Skip this line and check if next is fusionBadge
                    if i + 1 < len(lines) and 'var fusionBadge' in lines[i + 1]:
                        i += 1
                        line = lines[i]
            fixed_lines.append(line)
            i += 1
        # Skip duplicate lines with just the end of championBadge
        elif 'top: -10px; right: -10px' in line and 'var championBadge' not in line:
            i += 1
        else:
            fixed_lines.append(line)
            i += 1
    
    return ''.join(fixed_lines)

def main():
    for file_path in meal_files:
        full_path = os.path.join('/Users/danperry/CascadeProjects/fuelfire-app', file_path)
        if os.path.exists(full_path):
            try:
                fixed_content = fix_champion_badge(full_path)
                with open(full_path, 'w') as f:
                    f.write(fixed_content)
                print(f"✓ Fixed championBadge in {file_path}")
            except Exception as e:
                print(f"✗ Error processing {file_path}: {e}")
        else:
            print(f"✗ File not found: {file_path}")

if __name__ == '__main__':
    main()