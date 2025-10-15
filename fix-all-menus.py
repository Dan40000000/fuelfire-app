#!/usr/bin/env python3
import os
import re

# All HTML pages that need menu fixes
pages_to_fix = [
    'public/index.html',
    'public/calorie-tracker.html',
    'public/enhanced-diet-quiz.html',
    'public/meal-plans.html',
    'public/meal-ideas.html',
    'public/meal-beef.html',
    'public/meal-chicken.html',
    'public/meal-pork.html',
    'public/meal-keto.html',
    'public/meal-protein-bowls.html',
    'public/meal-seafood.html',
    'public/supplements.html',
    'public/workout-techniques.html',
    'public/workout-chest.html',
    'public/workout-back.html',
    'public/workout-arms.html',
    'public/workout-shoulders.html',
    'public/workout-legs.html',
    'public/workout-core.html',
    'public/workout-calves.html',
    'public/workout-cardio.html',
]

def fix_menu(filepath):
    """Fix menu on a single page"""
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes_made = []

    # Fix 1: Ensure goToScreen function exists
    if 'function goToScreen(' not in content:
        # Find goToPage function and add goToScreen after it
        go_to_page_pattern = r'(function goToPage\(page\) \{[^}]+\})'
        go_to_screen_func = '''

        function goToScreen(page, screenId) {
            window.location.href = `${page}#${screenId}`;
        }'''

        if re.search(go_to_page_pattern, content):
            content = re.sub(go_to_page_pattern, r'\1' + go_to_screen_func, content)
            changes_made.append("Added goToScreen function")

    # Fix 2: Update Saved Workouts to use goToScreen
    saved_workouts_pattern = r'<div class="menu-item"[^>]*onclick="goToPage\(\'index\.html\'\)"([^>]*?)>📚 Saved Workouts</div>'
    saved_workouts_new = r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'saved-workouts\')" \1>📚 Saved Workouts</div>'

    if re.search(saved_workouts_pattern, content):
        content = re.sub(saved_workouts_pattern, saved_workouts_new, content)
        changes_made.append("Fixed Saved Workouts navigation")

    # Fix 3: Update Track Workouts to use goToScreen
    track_workouts_pattern = r'<div class="menu-item"[^>]*onclick="goToPage\(\'index\.html\'\)"([^>]*?)>📊 Track Workouts</div>'
    track_workouts_new = r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'track-workouts\')" \1>📊 Track Workouts</div>'

    if re.search(track_workouts_pattern, content):
        content = re.sub(track_workouts_pattern, track_workouts_new, content)
        changes_made.append("Fixed Track Workouts navigation")

    # Fix 4: Ensure Workout Techniques is in the menu (insert after Track Workouts if not present)
    if '🏋️ Workout Techniques</div>' not in content:
        # Find Track Workouts and insert Workout Techniques after it
        track_line_pattern = r'(<div class="menu-item"[^>]*>📊 Track Workouts</div>)'
        workout_techniques_line = r'''\1
            <div class="menu-item" onclick="goToPage('workout-techniques.html')" ontouchstart="" style="touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1);">🏋️ Workout Techniques</div>'''

        if re.search(track_line_pattern, content):
            content = re.sub(track_line_pattern, workout_techniques_line, content)
            changes_made.append("Added Workout Techniques to menu")

    # Fix 5: Update Progress & Analytics to use goToScreen
    progress_pattern = r'<div class="menu-item"[^>]*onclick="goToPage\(\'index\.html\'\)"([^>]*?)>📈 Progress & Analytics</div>'
    progress_new = r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'progress-analytics\')" \1>📈 Progress & Analytics</div>'

    if re.search(progress_pattern, content):
        content = re.sub(progress_pattern, progress_new, content)
        changes_made.append("Fixed Progress & Analytics navigation")

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
    print("🔧 Fixing menus across all pages...\n")

    fixed_count = 0
    for filepath in pages_to_fix:
        if fix_menu(filepath):
            fixed_count += 1

    print(f"\n✨ Fixed {fixed_count} files!")

if __name__ == '__main__':
    main()
