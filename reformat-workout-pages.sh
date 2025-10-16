#!/bin/bash

# Script to reformat workout pages to use collapsible card layout

# Function to reformat a workout page
reformat_page() {
    local file=$1
    local gradient=$2
    local exercises_var=$3

    echo "Reformatting $file..."

    # Create a temporary Python script to do the replacement
    python3 << EOF
import re

# Read the file
with open('$file', 'r') as f:
    content = f.read()

# Replace CSS styles
old_css = r'''    <style>
        \.exercise-grid \{[^}]+\}

        \.exercise-card \{[^}]+\}

        \.exercise-card:hover \{[^}]+\}

        \.exercise-image \{[^}]+\}

        \.form-illustration \{[^}]+\}

        \.difficulty-badge \{[^}]+\}

        \.exercise-content \{[^}]+\}

        \.exercise-title \{[^}]+\}

        \.exercise-description \{[^}]+\}

        \.exercise-stats \{[^}]+\}

        \.muscle-tags \{[^}]+\}

        \.muscle-tag \{[^}]+\}

        \.modal \{[^}]+\}

        \.modal-content \{[^}]+\}

        \.modal-header \{[^}]+\}

        \.close-modal \{[^}]+\}

        \.modal-body \{[^}]+\}

        \.form-section \{[^}]+\}

        \.form-step \{[^}]+\}

        \.step-number \{[^}]+\}

        \.risk-warning \{[^}]+\}

        \.tip-box \{[^}]+\}
    </style>'''

new_css = '''    <style>
        .supplement-card {
            background: white;
            border-radius: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .supplement-header {
            background: linear-gradient(135deg, $gradient);
            color: white;
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s ease;
        }

        .supplement-header:hover {
            opacity: 0.9;
        }

        .supplement-header.active {
            opacity: 0.95;
        }

        .supplement-title {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
        }

        .supplement-rating {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 12px;
        }

        .expand-icon {
            font-size: 20px;
            transition: transform 0.3s ease;
        }

        .expand-icon.rotated {
            transform: rotate(180deg);
        }

        .supplement-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            background: #f8f9fa;
        }

        .supplement-content.expanded {
            max-height: 2000px;
        }

        .content-inner {
            padding: 20px;
        }

        .info-section {
            margin-bottom: 15px;
        }

        .info-title {
            font-weight: bold;
            color: ${gradient.split(',')[0].replace('linear-gradient(135deg', '').strip()};
            margin-bottom: 8px;
            font-size: 14px;
        }

        .info-text {
            font-size: 14px;
            line-height: 1.5;
            color: #333;
        }

        .dosage-box {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid ${gradient.split(',')[0].replace('linear-gradient(135deg', '').strip()};
            margin-bottom: 10px;
        }

        .quick-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }

        .quick-stat {
            background: white;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-value {
            font-weight: bold;
            color: ${gradient.split(',')[0].replace('linear-gradient(135deg', '').strip()};
            font-size: 16px;
        }

        .stat-label {
            font-size: 12px;
            color: #666;
        }

        .warning-box {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 12px;
            margin-top: 15px;
        }

        .warning-title {
            color: #856404;
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 14px;
        }
    </style>'''

# Can't use complex regex due to script complexity
# Let's use simpler approach - find and replace the entire styles section
style_start = content.find('<style>')
style_end = content.find('</style>') + len('</style>')

if style_start != -1 and style_end != -1:
    new_content = content[:style_start] + new_css + content[style_end:]
    content = new_content

# Remove modal HTML
modal_start = content.find('<!-- Exercise Modal -->')
modal_end = content.find('</div>\n    </div>\n\n    <script>')
if modal_start != -1 and modal_end != -1:
    content = content[:modal_start] + '\n    <script>' + content[modal_end + len('</div>\n    </div>\n\n    <script>'):]

# Replace exercise-grid class with just the container
content = content.replace('class="exercise-grid"', '')
content = content.replace('<!-- Exercises Grid -->\n\n                    \n                    ', '<!-- Exercises List -->\n                    ')

# Write back
with open('$file', 'w') as f:
    f.write(content)

print(f"CSS and HTML structure updated for $file")
EOF

    # Now update the JavaScript using sed
    echo "Updating JavaScript in $file..."

    # This is complex, so let's create a more comprehensive Python script
    python3 << 'PYEOF'
import re
import sys

file = sys.argv[1]
exercises_var = sys.argv[2]

with open(file, 'r') as f:
    content = f.read()

# Find and replace the displayExercises function
display_func_pattern = r'function displayExercises\(exercisesToShow = ' + exercises_var + r'\) \{[^}]*?\n\s+\}\s+\}'

new_display_func = f'''function displayExercises(exercisesToShow = {exercises_var}) {{
            const container = document.getElementById('exercises-container');
            let html = '';

            exercisesToShow.forEach((exercise, index) => {{
                html += `
                    <div class="supplement-card">
                        <div class="supplement-header" onclick="toggleExercise(${{index}})">
                            <div>
                                <div class="supplement-title">${{exercise.name}}</div>
                                <div class="supplement-rating">
                                    <span>${{generateDifficultyStars(exercise.difficulty)}}</span>
                                    <span>Difficulty</span>
                                </div>
                            </div>
                            <div class="expand-icon" id="icon-${{index}}">▼</div>
                        </div>
                        <div class="supplement-content" id="content-${{index}}">
                            <div class="content-inner">
                                <div class="quick-info">
                                    <div class="quick-stat">
                                        <div class="stat-value">${{exercise.equipment}}</div>
                                        <div class="stat-label">Equipment</div>
                                    </div>
                                    <div class="quick-stat">
                                        <div class="stat-value">${{generateDifficultyStars(exercise.difficulty)}}</div>
                                        <div class="stat-label">Difficulty</div>
                                    </div>
                                </div>

                                <div class="dosage-box">
                                    <div class="info-title">🎯 Proper Form</div>
                                    <div class="info-text">
                                        ${{exercise.steps.map(step => `• ${{step}}<br>`).join('')}}
                                    </div>
                                </div>

                                <div class="info-section">
                                    <div class="info-title">❌ Common Mistakes</div>
                                    <div class="info-text">
                                        ${{exercise.commonMistakes.map(mistake => `• ${{mistake}}<br>`).join('')}}
                                    </div>
                                </div>

                                <div class="info-section">
                                    <div class="info-title">✅ Safety Tips</div>
                                    <div class="info-text">
                                        ${{exercise.safetyTips.map(tip => `• ${{tip}}<br>`).join('')}}
                                    </div>
                                </div>

                                <div class="warning-box">
                                    <div class="warning-title">⚠️ Injury Risks</div>
                                    <div style="font-size: 12px; color: #856404;">${{exercise.risks}}</div>
                                </div>

                                <div class="info-section">
                                    <div class="info-title">💡 Energy Conservation</div>
                                    <div class="info-text">${{exercise.energySaving}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }});

            container.innerHTML = html;
        }}'''

# Replace the display function (this is tricky, let's use a marker-based approach)
# Find the start of displayExercises function
display_start = content.find(f'function displayExercises(exercisesToShow = {exercises_var})')
if display_start != -1:
    # Find the end by counting braces
    brace_count = 0
    i = display_start
    in_function = False
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
            in_function = True
        elif content[i] == '}':
            brace_count -= 1
            if in_function and brace_count == 0:
                # Found the end
                content = content[:display_start] + new_display_func + content[i+1:]
                break
        i += 1

# Add toggleExercise function before filterExercises
filter_start = content.find('function filterExercises()')
if filter_start != -1:
    toggle_func = '''function toggleExercise(index) {
            const content = document.getElementById(`content-${index}`);
            const icon = document.getElementById(`icon-${index}`);
            const header = content.previousElementSibling;

            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                icon.classList.remove('rotated');
                header.classList.remove('active');
                content.style.maxHeight = '0px';
            } else {
                content.classList.add('expanded');
                icon.classList.add('rotated');
                header.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        }

        '''
    content = content[:filter_start] + toggle_func + content[filter_start:]

# Remove modal functions
# Find openExerciseModal and remove it and everything up to filterExercises or the Initialize comment
open_modal_start = content.find('function openExerciseModal(')
if open_modal_start != -1:
    # Find where to stop - look for "// Initialize" or beginning of window.addEventListener
    init_start = content.find('// Initialize', open_modal_start)
    if init_start != -1:
        content = content[:open_modal_start] + content[init_start:]

with open(file, 'w') as f:
    f.write(content)

print(f"JavaScript updated for {file}")
PYEOF

}

# Process each file with its specific gradient and variable name
reformat_page "/Users/danperry/CascadeProjects/fuelfire-app/public/workout-shoulders.html" "#e74c3c, #c0392b" "shoulderExercises"

echo "Reformatting complete!"
