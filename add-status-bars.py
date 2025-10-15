#!/usr/bin/env python3
import os
import re

# Workout pages that need status bars and search
workout_pages = [
    ('public/workout-back.html', '🦵 Back Exercises', 'backExercises'),
    ('public/workout-arms.html', '💪 Arms Exercises', 'armsExercises'),
    ('public/workout-shoulders.html', '🏋️ Shoulders Exercises', 'shouldersExercises'),
    ('public/workout-legs.html', '🦵 Legs Exercises', 'legsExercises'),
    ('public/workout-core.html', '🔥 Core Exercises', 'coreExercises'),
    ('public/workout-calves.html', '🦵 Calves Exercises', 'calvesExercises'),
    ('public/workout-cardio.html', '🏃 Cardio Exercises', 'cardioExercises'),
]

STATUS_BAR_HTML = '''            <!-- Status Bar -->
            <div class="status-bar">
                <span>9:41</span>
                <span id="time">9:41 AM</span>
            </div>

'''

def add_status_bar(filepath, page_title, exercises_array_name):
    """Add status bar and search to workout page"""
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes_made = []

    # Check if status bar already exists
    if '<div class="status-bar">' in content:
        print(f"⏭️  {filepath}: Status bar already exists")
        return False

    # Add status bar after <div class="screen">
    if '<div class="screen">' in content and '<div class="status-bar">' not in content:
        content = content.replace(
            '<div class="screen">\n            \n            <div class="header">',
            '<div class="screen">\n' + STATUS_BAR_HTML + '            <div class="header">'
        )
        changes_made.append("Added status bar")

    # Add search bar if it doesn't exist
    if '<input type="text" id="exercise-search"' not in content:
        # Find the location after the intro text and before the exercises container
        search_bar_html = f'''
                    <!-- Search Bar -->
                    <div style="margin-bottom: 20px;">
                        <input type="text" id="exercise-search" placeholder="🔍 Search exercises..."
                               onkeyup="filterExercises()"
                               style="width: 100%; padding: 12px 15px; border: 2px solid var(--primary-light); border-radius: 15px; font-size: 14px;">
                    </div>
'''

        # Replace the exercises container line with search + container
        old_pattern = r'(\s+)<!-- Exercises Grid -->\s+<div id="exercises-container" class="exercise-grid">'
        new_text = search_bar_html + r'\1<!-- Exercises Grid -->\n\1<div id="exercises-container" class="exercise-grid">'

        if re.search(old_pattern, content):
            content = re.sub(old_pattern, new_text, content)
            changes_made.append("Added search bar")

    # Add filterExercises function if it doesn't exist
    if 'function filterExercises()' not in content:
        filter_func = f'''
        function filterExercises() {{
            const searchTerm = document.getElementById('exercise-search').value.toLowerCase();

            if (!searchTerm) {{
                displayExercises();
                return;
            }}

            const filtered = {exercises_array_name}.filter(exercise => {{
                return exercise.name.toLowerCase().includes(searchTerm) ||
                       exercise.description.toLowerCase().includes(searchTerm) ||
                       exercise.equipment.toLowerCase().includes(searchTerm) ||
                       exercise.primaryMuscles.some(muscle => muscle.toLowerCase().includes(searchTerm));
            }});

            displayExercises(filtered);
        }}

'''

        # Insert before openExerciseModal function
        if 'function openExerciseModal(' in content:
            content = content.replace('        function openExerciseModal(', filter_func + '        function openExerciseModal(')
            changes_made.append("Added filterExercises function")

    # Update displayExercises function to accept parameter
    if f'function displayExercises() {{' in content:
        content = content.replace(
            f'function displayExercises() {{',
            f'function displayExercises(exercisesToShow = {exercises_array_name}) {{'
        )

        # Update the forEach to use exercisesToShow and add empty state
        old_foreach_pattern = rf'{exercises_array_name}\.forEach\(\(exercise, index\) => {{'
        new_foreach = f'''
            if (exercisesToShow.length === 0) {{
                html = `
                    <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🔍</div>
                        <div style="color: #666; font-size: 16px;">No exercises found</div>
                        <div style="color: #999; font-size: 14px; margin-top: 8px;">Try a different search term</div>
                    </div>
                `;
            }} else {{
                exercisesToShow.forEach((exercise, index) => {{
                    const originalIndex = {exercises_array_name}.indexOf(exercise);'''

        if re.search(old_foreach_pattern, content):
            content = re.sub(old_foreach_pattern, new_foreach, content)

            # Need to close the else block before container.innerHTML
            old_container_line = r'(\s+)container\.innerHTML = html;'
            new_container_line = r'\1}\n\n\1container.innerHTML = html;'
            content = re.sub(old_container_line, new_container_line, content)

            # Update onclick to use originalIndex instead of index
            content = content.replace(
                f'onclick="openExerciseModal(${{index}})"',
                f'onclick="openExerciseModal(${{originalIndex}})"'
            )

            changes_made.append("Updated displayExercises for search")

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
    print("🔧 Adding status bars and search to workout pages...\n")

    fixed_count = 0
    for filepath, title, array_name in workout_pages:
        if add_status_bar(filepath, title, array_name):
            fixed_count += 1

    print(f"\n✨ Enhanced {fixed_count} files!")

if __name__ == '__main__':
    main()
