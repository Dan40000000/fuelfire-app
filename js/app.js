// DOM Elements
const notification = document.getElementById('notification');
const notificationQuote = document.getElementById('notification-quote');
const dailyQuote = document.getElementById('daily-quote');
const timeElement = document.getElementById('time');
const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.overlay');

// Motivational quotes
const quotes = [
    "Success isn't given. It's earned in the gym, kitchen, and every choice you make. Fuel your fire today.",
    "The only bad workout is the one that didn't happen.",
    "Discipline is choosing between what you want now and what you want most.",
    "It's a slow process, but quitting won't speed it up.",
    "Your body can stand almost anything. It's your mind you have to convince.",
    "The secret of getting ahead is getting started.",
    "Don't stop when you're tired. Stop when you're done.",
    "The pain you feel today will be the strength you feel tomorrow.",
    "Strive for progress, not perfection.",
    "The only way to do great work is to love what you do."
];

// Initialize the app
function init() {
    // Set current time
    updateTime();
    setInterval(updateTime, 60000);
    
    // Show random quote
    showRandomQuote();
    
    // Show welcome notification after 2 seconds
    setTimeout(showWelcomeNotification, 2000);
}

// Update time display
function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    timeElement.textContent = `${hours}:${minutes}`;
}

// Show random quote
function showRandomQuote() {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    dailyQuote.textContent = randomQuote;
    return randomQuote;
}

// Show welcome notification
function showWelcomeNotification() {
    const quote = showRandomQuote();
    notificationQuote.textContent = quote;
    notification.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Close notification
function closeNotification() {
    notification.classList.remove('show');
}

// Toggle sidebar
function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// Show screen
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen-content').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
    
    // Close sidebar if open
    if (sidebar.classList.contains('open')) {
        toggleSidebar();
    }
}

// Quick start workout
function quickStartWorkout(type) {
    let workoutName = '';
    let workoutDesc = '';
    
    switch(type) {
        case 'muscle-30':
            workoutName = '30-Min Muscle';
            workoutDesc = 'Quick pump session focused on major muscle groups';
            break;
        case 'hiit-20':
            workoutName = '20-Min HIIT';
            workoutDesc = 'High-intensity interval training for fat burning';
            break;
        case 'mobility-15':
            workoutName = '15-Min Mobility';
            workoutDesc = 'Flexibility and recovery focused session';
            break;
        case 'core-10':
            workoutName = '10-Min Core';
            workoutDesc = 'Quick and effective ab workout';
            break;
        default:
            workoutName = 'Quick Workout';
            workoutDesc = 'Custom workout session';
    }
    
    // In a real app, you would navigate to the workout screen
    alert(`Starting ${workoutName}: ${workoutDesc}`);
}

// Show workout info
function showWorkoutInfo(workoutId) {
    // In a real app, you would show detailed workout information
    alert(`Loading workout details for: ${workoutId}`);
}

// Start custom workout
function startCustomWorkout() {
    // In a real app, you would navigate to the custom workout creation screen
    alert('Starting custom workout creation wizard...');
}

// Close sidebar when clicking outside
overlay.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) {
        toggleSidebar();
    }
});

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
