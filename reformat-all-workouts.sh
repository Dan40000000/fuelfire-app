#!/bin/bash

# This script reformats all workout pages to use the collapsible card layout

# Color definitions for each workout page
declare -A GRADIENTS_NORMAL=(
    ["shoulders"]="#e74c3c, #c0392b"
    ["arms"]="#3498db, #2980b9"
    ["chest"]="#9b59b6, #8e44ad"
    ["back"]="#16a085, #27ae60"
    ["core"]="#f39c12, #d68910"
    ["calves"]="#34495e, #2c3e50"
    ["cardio"]="#e67e22, #d35400"
)

declare -A GRADIENTS_HOVER=(
    ["shoulders"]="#c0392b, #a93226"
    ["arms"]="#2980b9, #21618c"
    ["chest"]="#8e44ad, #7d3c98"
    ["back"]="#27ae60, #229954"
    ["core"]="#d68910, #b9770e"
    ["calves"]="#2c3e50, #273746"
    ["cardio"]="#d35400, #ba4a00"
)

declare -A GRADIENTS_ACTIVE=(
    ["shoulders"]="#a93226, #922b21"
    ["arms"]="#21618c, #1b4f72"
    ["chest"]="#7d3c98, #6c3483"
    ["back"]="#229954, #1e8449"
    ["core"]="#b9770e, #9c640c"
    ["calves"]="#273746, #212f3c"
    ["cardio"]="#ba4a00, #a04000"
)

declare -A PRIMARY_COLORS=(
    ["shoulders"]="#e74c3c"
    ["arms"]="#3498db"
    ["chest"]="#9b59b6"
    ["back"]="#16a085"
    ["core"]="#f39c12"
    ["calves"]="#34495e"
    ["cardio"]="#e67e22"
)

declare -A VARIABLE_NAMES=(
    ["shoulders"]="shoulderExercises"
    ["arms"]="armExercises"
    ["chest"]="chestExercises"
    ["back"]="backExercises"
    ["core"]="coreExercises"
    ["calves"]="calfExercises"
    ["cardio"]="cardioExercises"
)

# Function to reformat a workout file
reformat_workout() {
    local workout_type=$1
    local input_file="/Users/danperry/CascadeProjects/fuelfire-app/workout-${workout_type}.html"
    local temp_file="/tmp/workout-${workout_type}-temp.html"
    
    echo "Reformatting workout-${workout_type}.html..."
    
    # Read the original file to extract exercise data
    # Then create new file with collapsible card layout
    
    python3 << 'PYTHON_EOF' "$workout_type" "$input_file" "$temp_file"
import sys
import re
import json

workout_type = sys.argv[1]
input_file = sys.argv[2]
output_file = sys.argv[3]

# Gradient mappings
gradients_normal = {
    "shoulders": "#e74c3c, #c0392b",
    "arms": "#3498db, #2980b9",
    "chest": "#9b59b6, #8e44ad",
    "back": "#16a085, #27ae60",
    "core": "#f39c12, #d68910",
    "calves": "#34495e, #2c3e50",
    "cardio": "#e67e22, #d35400"
}

gradients_hover = {
    "shoulders": "#c0392b, #a93226",
    "arms": "#2980b9, #21618c",
    "chest": "#8e44ad, #7d3c98",
    "back": "#27ae60, #229954",
    "core": "#d68910, #b9770e",
    "calves": "#2c3e50, #273746",
    "cardio": "#d35400, #ba4a00"
}

gradients_active = {
    "shoulders": "#a93226, #922b21",
    "arms": "#21618c, #1b4f72",
    "chest": "#7d3c98, #6c3483",
    "back": "#229954, #1e8449",
    "core": "#b9770e, #9c640c",
    "calves": "#273746, #212f3c",
    "cardio": "#ba4a00, #a04000"
}

primary_colors = {
    "shoulders": "#e74c3c",
    "arms": "#3498db",
    "chest": "#9b59b6",
    "back": "#16a085",
    "core": "#f39c12",
    "calves": "#34495e",
    "cardio": "#e67e22"
}

variable_names = {
    "shoulders": "shoulderExercises",
    "arms": "armExercises",
    "chest": "chestExercises",
    "back": "backExercises",
    "core": "coreExercises",
    "calves": "calfExercises",
    "cardio": "cardioExercises"
}

# Read original file
with open(input_file, 'r') as f:
    content = f.read()

# Extract exercise data array
exercise_match = re.search(r'const\s+\w+Exercises\s*=\s*(\[[\s\S]*?\]);', content)
if not exercise_match:
    print(f"Error: Could not find exercise data in {input_file}")
    sys.exit(1)

exercise_data = exercise_match.group(1)

# Get colors for this workout type
grad_normal = gradients_normal.get(workout_type, "#27ae60, #219a52")
grad_hover = gradients_hover.get(workout_type, "#219a52, #1e8449")
grad_active = gradients_active.get(workout_type, "#1e8449, #196f3d")
primary = primary_colors.get(workout_type, "#27ae60")
var_name = variable_names.get(workout_type, f"{workout_type}Exercises")

# Get page title and emoji
title_match = re.search(r'<title>(.*?)</title>', content)
title = title_match.group(1) if title_match else f"{workout_type.title()} Exercises - FuelFire"

header_match = re.search(r'<div class="header-title">(.*?)</div>', content)
header_text = header_match.group(1) if header_match else f"{workout_type.title()} Exercises"

lib_match = re.search(r'<h2[^>]*>(.*?)Exercise Library</h2>', content)
library_header = lib_match.group(1) if lib_match else f"{header_text} "

# Read the template from workout-legs.html
template_file = "/Users/danperry/CascadeProjects/fuelfire-app/public/workout-legs.html"
with open(template_file, 'r') as f:
    template = f.read()

# Replace template values
output = template

# Replace titles
output = output.replace('<title>Leg Exercises - FuelFire</title>', f'<title>{title}</title>')
output = output.replace('<div class="header-title">🦵 Leg Exercises</div>', f'<div class="header-title">{header_text}</div>')
output = output.replace('<h2 style="color: var(--primary); margin-bottom: 10px;">🦵 Leg Exercise Library</h2>', 
                       f'<h2 style="color: var(--primary); margin-bottom: 10px;">{library_header}Exercise Library</h2>')

# Replace colors in CSS
output = output.replace('background: linear-gradient(135deg, #27ae60, #219a52);', f'background: linear-gradient(135deg, {grad_normal});')
output = output.replace('background: linear-gradient(135deg, #219a52, #1e8449);', f'background: linear-gradient(135deg, {grad_hover});')
output = output.replace('background: linear-gradient(135deg, #1e8449, #196f3d);', f'background: linear-gradient(135deg, {grad_active});')
output = output.replace('color: #27ae60;', f'color: {primary};')
output = output.replace('border-left: 4px solid #27ae60;', f'border-left: 4px solid {primary};')

# Replace exercise data
output = re.sub(r'const legExercises = \[[\s\S]*?\];', f'const {var_name} = {exercise_data};', output)

# Replace variable names in functions
output = output.replace('legExercises', var_name)
output = output.replace(f'function displayExercises(exercisesToShow = {var_name})', f'function displayExercises(exercisesToShow = {var_name})')

# Write output
with open(output_file, 'w') as f:
    f.write(output)

print(f"Successfully created {output_file}")
PYTHON_EOF
    
    # Move temp file to original location
    if [ -f "$temp_file" ]; then
        mv "$temp_file" "$input_file"
        echo "✓ Successfully reformatted workout-${workout_type}.html"
    else
        echo "✗ Failed to reformat workout-${workout_type}.html"
    fi
}

# Reformat all workout pages
for workout in shoulders arms chest back core calves cardio; do
    reformat_workout "$workout"
    echo ""
done

echo "All workout pages have been reformatted!"
