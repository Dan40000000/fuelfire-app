#!/usr/bin/env python3
import os
import re

# Files to update
files_to_update = [
    'public/workout-techniques.html',
    'public/workout-chest.html',
    'public/workout-arms.html',
    'public/workout-shoulders.html',
    'public/workout-legs.html',
    'public/workout-core.html',
    'public/workout-calves.html',
    'public/workout-cardio.html',
    'public/meal-plans.html',
    'public/meal-ideas.html',
    'public/meal-beef.html',
    'public/meal-chicken.html',
    'public/meal-pork.html',
    'public/meal-keto.html',
    'public/meal-protein-bowls.html',
    'public/meal-seafood.html',
    'public/calorie-tracker.html',
    'public/enhanced-diet-quiz.html',
    'public/supplements.html'
]

def fix_file(filepath):
    """Fix navigation in a single file"""
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes_made = []

    # Fix 1: Change Create Workout menu item to use goToScreen
    old_pattern = r'<div class="menu-item" onclick="goToPage\(\'index\.html\'\)"([^>]*?)>💪 Create Workout</div>'
    new_text = r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'create-workout\')" \1>💪 Create Workout</div>'

    if re.search(old_pattern, content):
        content = re.sub(old_pattern, new_text, content)
        changes_made.append("Updated Create Workout menu item")

    # Fix 2: Add goToScreen function if it doesn't exist
    if 'function goToScreen(' not in content and 'goToScreen' in content:
        # Find where to insert the function (after goToPage function)
        go_to_page_pattern = r'(function goToPage\(page\) \{[^}]+\})'
        go_to_screen_func = '''

        function goToScreen(page, screenId) {
            window.location.href = `${page}#${screenId}`;
        }'''

        if re.search(go_to_page_pattern, content):
            content = re.sub(go_to_page_pattern, r'\1' + go_to_screen_func, content)
            changes_made.append("Added goToScreen function")

    # Only write if changes were made
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {filepath}: {', '.join(changes_made)}")
        return True
    else:
        print(f"⏭️  {filepath}: No changes needed")
        return False

def main():
    print("🔧 Fixing Create Workout navigation across all pages...\n")

    fixed_count = 0
    for filepath in files_to_update:
        if fix_file(filepath):
            fixed_count += 1

    print(f"\n✨ Fixed {fixed_count} files!")

if __name__ == '__main__':
    main()
