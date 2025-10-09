#!/bin/bash

# Fix all meal recipe pages completely
for file in public/meal-beef.html public/meal-chicken.html public/meal-pork.html public/meal-shrimp.html public/meal-turkey.html public/meal-sandwiches.html public/meal-keto.html public/meal-fusion.html; do
    if [ -f "$file" ]; then
        echo "Fixing $file completely..."
        
        # Create a temporary file for the fixes
        cp "$file" "$file.tmp"
        
        # Fix the forEach loops - convert to for loops
        sed -i '' 's/beefRecipes\.forEach((meal, index) => {/for (var index = 0; index < beefRecipes.length; index++) { var meal = beefRecipes[index];/g' "$file.tmp"
        sed -i '' 's/meal\.ingredients\.forEach(function(ingredient) {/for (var i = 0; i < meal.ingredients.length; i++) { var ingredient = meal.ingredients[i];/g' "$file.tmp"
        sed -i '' 's/meal\.instructions\.forEach((instruction, i) => {/for (var i = 0; i < meal.instructions.length; i++) { var instruction = meal.instructions[i];/g' "$file.tmp"
        
        # Fix the displayMeals function template literals
        perl -i -pe 's/html \+= `/<TEMPLATE_START>/g' "$file.tmp"
        perl -i -pe 's/`;<\/TEMPLATE_START>/'"'"';<\/TEMPLATE_START>/g' "$file.tmp"
        
        # Now we need to manually fix the template literals in displayMeals
        # This is complex so we'll use a Python script
        python3 - "$file.tmp" <<'EOF'
import sys
import re

def fix_template_literal(content):
    # Fix template literals with ${} expressions
    content = re.sub(r'\$\{([^}]+)\}', r'" + \1 + "', content)
    # Replace backticks with quotes
    content = content.replace('`', '"')
    return content

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Fix all template literals
lines = content.split('\n')
new_lines = []
in_template = False

for line in lines:
    if '<TEMPLATE_START>' in line:
        in_template = True
        line = line.replace('<TEMPLATE_START>', '')
        line = line.replace('html +=', 'html +=')
        # Start fixing this line
        line = fix_template_literal(line)
    elif '</TEMPLATE_START>' in line:
        in_template = False
        line = line.replace('</TEMPLATE_START>', '')
    elif in_template:
        line = fix_template_literal(line)
    
    # Fix remaining template literals not in the special block
    if '`' in line:
        line = fix_template_literal(line)
    
    new_lines.append(line)

with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(new_lines))
EOF
        
        # Move the temp file back
        mv "$file.tmp" "$file"
        
        echo "Fixed $file completely"
    fi
done

echo "All meal pages fixed completely!"