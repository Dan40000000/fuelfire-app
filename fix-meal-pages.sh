#!/bin/bash

# Fix all meal recipe pages - convert ES6 to ES5
for file in public/meal-beef.html public/meal-chicken.html public/meal-pork.html public/meal-shrimp.html public/meal-turkey.html public/meal-sandwiches.html public/meal-keto.html public/meal-fusion.html public/meal-protein-bowls.html; do
    if [ -f "$file" ]; then
        echo "Fixing $file..."
        
        # Replace const/let with var
        sed -i '' 's/const /var /g' "$file"
        sed -i '' 's/let /var /g' "$file"
        
        # Replace arrow functions
        sed -i '' 's/\([a-zA-Z_][a-zA-Z0-9_]*\) => {/function(\1) {/g' "$file"
        sed -i '' 's/() => {/function() {/g' "$file"
        
        # Replace template literals with string concatenation
        perl -i -pe 's/\`([^`]*)\$\{([^}]+)\}([^`]*)\`/'"'"'\1'"'"' + \2 + '"'"'\3'"'"'/g' "$file"
        perl -i -pe 's/\`([^`]*)\`/'"'"'\1'"'"'/g' "$file"
        
        # Make functions global by attaching to window
        sed -i '' 's/^[[:space:]]*function toggleSidebar()/        window.toggleSidebar = function()/g' "$file"
        sed -i '' 's/^[[:space:]]*function goToPage(/        window.goToPage = function(/g' "$file"
        sed -i '' 's/^[[:space:]]*function goBack()/        window.goBack = function()/g' "$file"
        
        echo "Fixed $file"
    fi
done

echo "All meal pages fixed!"