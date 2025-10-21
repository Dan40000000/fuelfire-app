#!/usr/bin/env python3

import os
import re

# List of files that need bottom nav
files = [
    "calorie-tracker.html",
    "enhanced-diet-quiz.html",
    "meal-beef.html",
    "meal-chicken.html",
    "meal-ideas.html",
    "meal-keto.html",
    "meal-plan-simple.html",
    "meal-plan.html",
    "meal-pork.html",
    "meal-protein-bowls.html",
    "meal-seafood.html",
    "meal-wraps.html",
    "supplements-blood-pressure.html",
    "supplements-brain.html",
    "supplements-endurance.html",
    "supplements-gut.html",
    "supplements-heart.html",
    "supplements-kidney.html",
    "supplements-liver.html",
    "supplements-muscle-building.html",
    "supplements-pre-workout.html",
    "supplements-recovery.html",
    "supplements-testosterone.html",
    "supplements-weight-loss.html"
]

bottom_nav = '''
    <!-- Bottom Navigation Bar -->
    <div class="bottom-nav">
        <div class="nav-item" onclick="window.location.href='index.html'" ontouchstart="">
            <div class="nav-icon">🍽️</div>
            <div class="nav-label">Log Food</div>
            <div class="nav-glow"></div>
        </div>
        <div class="nav-item" onclick="window.location.href='workout-quiz.html'" ontouchstart="">
            <div class="nav-icon">🏋️</div>
            <div class="nav-label">Quick Workout</div>
            <div class="nav-glow"></div>
        </div>
        <div class="nav-item" onclick="window.location.href='meal-plans.html'" ontouchstart="">
            <div class="nav-icon">📋</div>
            <div class="nav-label">Meal Plan</div>
            <div class="nav-glow"></div>
        </div>
        <div class="nav-item" onclick="window.location.href='index.html#progress'" ontouchstart="">
            <div class="nav-icon">📈</div>
            <div class="nav-label">Progress</div>
            <div class="nav-glow"></div>
        </div>
    </div>
'''

base_dir = "/Users/danperry/CascadeProjects/fuelfire-app/public"

for filename in files:
    filepath = os.path.join(base_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if bottom-nav already exists
        if 'bottom-nav' not in content:
            # Insert before </body>
            content = content.replace('</body>', bottom_nav + '\n</body>')

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Added bottom nav to {filename}")
        else:
            print(f"- Bottom nav already in {filename}")
    else:
        print(f"✗ File not found: {filename}")
