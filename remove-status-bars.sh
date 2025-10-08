#!/bin/bash

# Remove status bars from all HTML files
echo "Removing status bars from all HTML files..."

# Find all HTML files and remove status bar divs
find . -name "*.html" -type f | while read file; do
    # Create a temporary file
    temp_file="${file}.tmp"
    
    # Remove status bar div and its contents (including the time and battery percentage)
    # This handles multi-line status bar divs
    sed '/<div class="status-bar">/,/<\/div>/d' "$file" > "$temp_file"
    
    # Also remove any standalone status bar divs on a single line
    sed -i '' '/<div class="status-bar">.*<\/div>/d' "$temp_file"
    
    # Also remove specific time/battery patterns if they exist outside status-bar
    sed -i '' 's/<span id="time">9:41<\/span>//g' "$temp_file"
    sed -i '' 's/<span>100%<\/span>//g' "$temp_file"
    
    # Move temp file back to original
    mv "$temp_file" "$file"
done

echo "Status bars removed from all HTML files!"