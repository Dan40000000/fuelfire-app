#!/usr/bin/env python3
import os
import re

# All supplement pages
supplement_files = [
    'public/supplements-blood-pressure.html',
    'public/supplements-brain.html',
    'public/supplements-endurance.html',
    'public/supplements-gut.html',
    'public/supplements-heart.html',
    'public/supplements-kidney.html',
    'public/supplements-liver.html'
]

for file_path in supplement_files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (not found)")
        continue

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix Create Workout menu item
    content = re.sub(
        r'<div class="menu-item" onclick="goToPage\(\'index\.html\'\)">💪 Create Workout</div>',
        r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'create-workout\')">💪 Create Workout</div>',
        content
    )

    # Fix Saved Workouts menu item (appears right after Create Workout)
    content = re.sub(
        r'<div class="menu-item" onclick="goToPage\(\'index\.html\'\)">📚 Saved Workouts</div>',
        r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'saved-workouts\')">📚 Saved Workouts</div>',
        content
    )

    # Fix Track Workouts menu item
    content = re.sub(
        r'<div class="menu-item" onclick="goToPage\(\'index\.html\'\)">📊 Track Workouts</div>',
        r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'track-workouts\')">📊 Track Workouts</div>',
        content
    )

    # Fix Progress & Analytics menu item
    content = re.sub(
        r'<div class="menu-item" onclick="goToPage\(\'index\.html\'\)">📈 Progress & Analytics</div>',
        r'<div class="menu-item" onclick="goToScreen(\'index.html\', \'progress-analytics\')">📈 Progress & Analytics</div>',
        content
    )

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Fixed {file_path}")
    else:
        print(f"○ No changes needed for {file_path}")

print("\nDone!")
