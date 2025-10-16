#!/bin/bash

# This script will copy the workout-legs.html template to all other workout pages
# with the appropriate variable names and colors

cd /Users/danperry/CascadeProjects/fuelfire-app/public

# Read the legs template
cp workout-legs.html workout-back-new.html

# Replace for back (teal: #16a085, #27ae60)
sed -i '' 's/legExercises/backExercises/g' workout-back-new.html
sed -i '' 's/#27ae60/#16a085/g' workout-back-new.html
sed -i '' 's/#219a52/#27ae60/g' workout-back-new.html
sed-i '' 's/#1e8449/#229954/g' workout-back-new.html
sed -i '' 's/#196f3d/#1e8449/g' workout-back-new.html
sed -i '' 's/Leg Exercises/Back Exercises/g' workout-back-new.html
sed -i '' 's/🦵/💪/g' workout-back-new.html
sed -i '' 's/Leg Exercise Library/Back Exercise Library/g' workout-back-new.html
sed -i '' 's/Build powerful legs/Build a powerful back/g' workout-back-new.html

mv workout-back-new.html workout-back.html

echo "workout-back.html updated!"
