#!/bin/bash

# Standard bottom nav HTML with improved icons
BOTTOM_NAV='    <!-- Bottom Navigation Bar -->
    <div class="bottom-nav">
        <!-- Quick Workout -->
        <div class="nav-item" onclick="window.location.href='"'"'workout-quiz.html'"'"'">
            <div class="nav-glow"></div>
            <div class="nav-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="9" width="4" height="6" rx="1" fill="white"/>
                    <rect x="18" y="9" width="4" height="6" rx="1" fill="white"/>
                    <rect x="6" y="11" width="12" height="2" rx="1" fill="white"/>
                    <circle cx="4" cy="12" r="1.5" fill="#4B9CD3"/>
                    <circle cx="20" cy="12" r="1.5" fill="#4B9CD3"/>
                </svg>
            </div>
        </div>
        <!-- Food Tracker -->
        <div class="nav-item" onclick="window.location.href='"'"'calorie-tracker.html?showEntry=true'"'"'">
            <div class="nav-glow"></div>
            <div class="nav-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2" fill="none"/>
                    <path d="M12 3C12 3 16 8 16 12C16 14.2 14.2 16 12 16C9.8 16 8 14.2 8 12C8 8 12 3 12 3Z" stroke="white" stroke-width="2" fill="none"/>
                </svg>
            </div>
        </div>
        <!-- Home (Center, Larger) -->
        <div class="nav-item" onclick="window.location.href='"'"'index.html'"'"'" style="transform: scale(1.2);">
            <div class="nav-glow"></div>
            <div class="nav-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 22V12H15V22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        </div>
        <!-- Health Dashboard -->
        <div class="nav-item" onclick="window.location.href='"'"'health-dashboard.html'"'"'">
            <div class="nav-glow"></div>
            <div class="nav-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" fill="white"/>
                </svg>
            </div>
        </div>
        <!-- Diet Plan -->
        <div class="nav-item" onclick="window.location.href='"'"'enhanced-diet-quiz.html'"'"'">
            <div class="nav-glow"></div>
            <div class="nav-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                    <path d="M12 2V12L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
        </div>
    </div>'

# List of files to update (excluding templates and special pages)
FILES=(
    "index.html"
    "calorie-tracker.html"
    "health-dashboard.html"
    "enhanced-diet-quiz.html"
    "meal-plans.html"
    "meal-ideas.html"
    "meal-beef.html"
    "meal-chicken.html"
    "meal-keto.html"
    "meal-pork.html"
    "meal-seafood.html"
    "meal-protein-bowls.html"
    "meal-wraps.html"
    "supplements.html"
    "supplements-blood-pressure.html"
    "supplements-brain.html"
    "supplements-endurance.html"
    "supplements-gut.html"
    "supplements-heart.html"
    "supplements-kidney.html"
    "supplements-liver.html"
    "supplements-muscle-building.html"
    "supplements-pre-workout.html"
    "supplements-recovery.html"
    "supplements-testosterone.html"
    "supplements-weight-loss.html"
    "workout-arms.html"
    "workout-back.html"
    "workout-calves.html"
    "workout-cardio.html"
    "workout-chest.html"
    "workout-core.html"
    "workout-legs.html"
    "workout-shoulders.html"
    "workout-quiz.html"
    "workout-techniques.html"
)

echo "Updating bottom navigation on ${#FILES[@]} files..."

for file in "${FILES[@]}"; do
    if [ -f "public/$file" ]; then
        echo "Processing $file..."
        # This is a placeholder - we'll use a different approach
    fi
done

echo "Done!"
