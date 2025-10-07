#!/bin/bash

cd /Users/danperry/CascadeProjects/fuelfire-app/public

# List of supplement files to fix (excluding heart.html which is perfect)
files=(
    "supplements-muscle-building.html"
    "supplements-brain.html" 
    "supplements-endurance.html"
    "supplements-testosterone.html"
    "supplements-weight-loss.html"
    "supplements-pre-workout.html"
    "supplements-recovery.html"
    "supplements-blood-pressure.html"
    "supplements-gut.html"
    "supplements-kidney.html"
    "supplements-liver.html"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing: $file"
        
        # Check if back button already exists
        if ! grep -q "Back to Categories" "$file"; then
            echo "  Adding back button to $file"
            # Add back button after any subtitle paragraph that mentions supplements
            sed -i '' 's|</p>|</p>\
                        <button onclick="goBack()" ontouchstart="" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 15px; font-size: 12px; margin-top: 10px; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1);">← Back to Categories</button>|' "$file"
        fi
        
        # Check if goBack function exists
        if ! grep -q "function goBack()" "$file"; then
            echo "  Adding goBack() function to $file"
            # Add goBack function before the Initialize comment
            sed -i '' 's|// Initialize|function goBack() {\
            window.location.href = "supplements.html";\
        }\
        \
        // Initialize|' "$file"
        fi
        
        echo "  ✅ Fixed $file"
    else
        echo "  ❌ File not found: $file"
    fi
done

echo "🎉 All supplement pages fixed!"