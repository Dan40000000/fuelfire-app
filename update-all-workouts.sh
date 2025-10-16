#!/bin/bash

cd /Users/danperry/CascadeProjects/fuelfire-app/public

# Function to update a workout file
update_workout() {
    local file=$1
    local varname=$2
    local color1=$3
    local color2=$4
    local color3=$5
    local color4=$6
    local emoji=$7
    local title=$8
    local desc=$9

    echo "Updating $file..."

    # Extract the exercise data array from original file
    sed -n "/const ${varname} = \[/,/^        \];$/p" "$file" > "${file}.exercises.tmp"

    # Create new file from legs template
    sed "s/legExercises/${varname}/g;
         s/#27ae60/${color1}/g;
         s/#219a52/${color2}/g;
         s/#1e8449/${color3}/g;
         s/#196f3d/${color4}/g;
         s/Leg Exercises/${title}/g;
         s/🦵/${emoji}/g;
         s/Leg Exercise Library/${title} Library/g;
         s/Build powerful legs with proper form and technique/${desc}/g" workout-legs.html > "${file}.new"

    # Replace the legExercises array with the original exercise array
    sed -i.bak "/const ${varname} = \[/,/^        \];$/{
        /const ${varname} = \[/r ${file}.exercises.tmp
        d
    }" "${file}.new"

    # Move new file over old file
    mv "${file}.new" "$file"
    rm -f "${file}.exercises.tmp" "${file}.new.bak"

    echo "✓ $file updated"
}

# Update each workout file with its specific colors and info
update_workout "workout-shoulders.html" "shoulderExercises" "#e74c3c" "#c0392b" "#a93226" "#922b21" "💪" "Shoulder Exercises" "Build powerful shoulders with proper form and technique"

update_workout "workout-arms.html" "armExercises" "#3498db" "#2980b9" "#21618c" "#1b4f72" "💪" "Arm Exercises" "Build powerful arms with proper form and technique"

update_workout "workout-chest.html" "chestExercises" "#9b59b6" "#8e44ad" "#7d3c98" "#6c3483" "🏋️" "Chest Exercises" "Build a powerful chest with proper form and technique"

update_workout "workout-back.html" "backExercises" "#16a085" "#27ae60" "#229954" "#1e8449" "💪" "Back Exercises" "Build a powerful back with proper form and technique"

update_workout "workout-core.html" "coreExercises" "#f39c12" "#d68910" "#b9770e" "#9c640c" "🔥" "Core Exercises" "Build a strong core with proper form and technique"

update_workout "workout-calves.html" "calfExercises" "#34495e" "#2c3e50" "#273746" "#212f3c" "🦵" "Calf Exercises" "Build powerful calves with proper form and technique"

update_workout "workout-cardio.html" "cardioExercises" "#e67e22" "#d35400" "#ba4a00" "#a04000" "🏃" "Cardio Exercises" "Build endurance with proper form and technique"

echo ""
echo "All workout files updated!"
