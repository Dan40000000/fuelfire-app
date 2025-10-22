// Quick Food Entry Modal - Shows 3 entry options with exit to full tracker

function showQuickFoodEntry() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('quick-food-entry-modal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quick-food-entry-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 25px; padding: 30px; width: 90%; max-width: 400px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <!-- Exit Button (Small Red X to go to Calorie Tracker) -->
                <button onclick="closeQuickFoodEntry()"
                    style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(220,53,69,0.3);">
                    ✕
                </button>

                <h2 style="color: var(--primary); margin: 0 0 10px 0; text-align: center; font-size: 24px;">Log Food</h2>
                <p style="color: #666; text-align: center; margin: 0 0 25px 0; font-size: 14px;">Choose how you want to add your meal</p>

                <!-- 3 Entry Options -->
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <!-- Barcode Scanner -->
                    <button onclick="quickEntryOption('scan')"
                        style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; border: none; padding: 20px; border-radius: 15px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); display: flex; align-items: center; justify-content: center; gap: 15px; transition: transform 0.2s;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>
                            <path d="M7 6V18M10 6V18M13 6V18M16 6V18" stroke="white" stroke-width="1.5"/>
                        </svg>
                        <span>Scan Barcode</span>
                    </button>

                    <!-- Voice Input -->
                    <button onclick="quickEntryOption('voice')"
                        style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; border: none; padding: 20px; border-radius: 15px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3); display: flex; align-items: center; justify-content: center; gap: 15px; transition: transform 0.2s;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="white"/>
                            <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H3V12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12V10H19Z" fill="white"/>
                            <path d="M11 22H13V24H11V22Z" fill="white"/>
                        </svg>
                        <span>Voice Input</span>
                    </button>

                    <!-- Manual Entry -->
                    <button onclick="quickEntryOption('manual')"
                        style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; border: none; padding: 20px; border-radius: 15px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 15px; transition: transform 0.2s;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25Z" fill="white"/>
                            <path d="M20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="white"/>
                        </svg>
                        <span>Manual Entry</span>
                    </button>
                </div>

                <!-- Link to Full Tracker -->
                <div style="margin-top: 20px; text-align: center;">
                    <a href="calorie-tracker.html"
                        style="color: #666; text-decoration: none; font-size: 13px; display: inline-block; padding: 8px 15px; border-radius: 8px; transition: all 0.2s;">
                        View Full Calorie Tracker →
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
}

function closeQuickFoodEntry() {
    const modal = document.getElementById('quick-food-entry-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function quickEntryOption(mode) {
    closeQuickFoodEntry();
    // Navigate to calorie tracker with the selected mode
    window.location.href = `calorie-tracker.html?mode=${mode}`;
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('quick-food-entry-modal');
    if (modal && event.target === modal) {
        closeQuickFoodEntry();
    }
});
