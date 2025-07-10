// FuelFire Fitness App - Complete JavaScript
// Enhanced workout tracking, nutrition management, and progress analytics

// ==================== GLOBAL VARIABLES ====================
let currentWorkout = null;
let workoutTimer = null;
let workoutStartTime = null;
let selectedExercises = [];
let currentScreen = 'home';

// ==================== DATA STORAGE ====================
class DataManager {
    static saveData(key, data) {
        localStorage.setItem(`fuelfire_${key}`, JSON.stringify(data));
    }
    
    static loadData(key, defaultValue = null) {
        const data = localStorage.getItem(`fuelfire_${key}`);
        return data ? JSON.parse(data) : defaultValue;
    }
    
    static removeData(key) {
        localStorage.removeItem(`fuelfire_${key}`);
    }
    
    static clearAllData() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('fuelfire_'));
        keys.forEach(key => localStorage.removeItem(key));
    }
}

// ==================== EXERCISE DATABASE ====================
const exerciseDatabase = [
    // CHEST
    { id: 1, name: 'Bench Press', muscle: 'Chest', difficulty: 'intermediate', equipment: 'Barbell' },
    { id: 2, name: 'Incline Dumbbell Press', muscle: 'Chest', difficulty: 'intermediate', equipment: 'Dumbbells' },
    { id: 3, name: 'Push-ups', muscle: 'Chest', difficulty: 'beginner', equipment: 'Bodyweight' },
    { id: 4, name: 'Dumbbell Flyes', muscle: 'Chest', difficulty: 'intermediate', equipment: 'Dumbbells' },
    { id: 5, name: 'Chest Dips', muscle: 'Chest', difficulty: 'intermediate', equipment: 'Dip Bar' },
    
    // BACK
    { id: 6, name: 'Deadlift', muscle: 'Back', difficulty: 'advanced', equipment: 'Barbell' },
    { id: 7, name: 'Pull-ups', muscle: 'Back', difficulty: 'intermediate', equipment: 'Pull-up Bar' },
    { id: 8, name: 'Bent-over Row', muscle: 'Back', difficulty: 'intermediate', equipment: 'Barbell' },
    { id: 9, name: 'Lat Pulldown', muscle: 'Back', difficulty: 'beginner', equipment: 'Cable Machine' },
    { id: 10, name: 'T-Bar Row', muscle: 'Back', difficulty: 'intermediate', equipment: 'T-Bar' },
    
    // SHOULDERS
    { id: 11, name: 'Overhead Press', muscle: 'Shoulders', difficulty: 'intermediate', equipment: 'Barbell' },
    { id: 12, name: 'Lateral Raises', muscle: 'Shoulders', difficulty: 'beginner', equipment: 'Dumbbells' },
    { id: 13, name: 'Face Pulls', muscle: 'Shoulders', difficulty: 'beginner', equipment: 'Cable Machine' },
    { id: 14, name: 'Arnold Press', muscle: 'Shoulders', difficulty: 'intermediate', equipment: 'Dumbbells' },
    { id: 15, name: 'Upright Rows', muscle: 'Shoulders', difficulty: 'intermediate', equipment: 'Barbell' },
    
    // ARMS
    { id: 16, name: 'Barbell Curl', muscle: 'Biceps', difficulty: 'beginner', equipment: 'Barbell' },
    { id: 17, name: 'Hammer Curls', muscle: 'Biceps', difficulty: 'beginner', equipment: 'Dumbbells' },
    { id: 18, name: 'Tricep Dips', muscle: 'Triceps', difficulty: 'intermediate', equipment: 'Dip Bar' },
    { id: 19, name: 'Close-Grip Bench Press', muscle: 'Triceps', difficulty: 'intermediate', equipment: 'Barbell' },
    { id: 20, name: 'Cable Tricep Pushdown', muscle: 'Triceps', difficulty: 'beginner', equipment: 'Cable Machine' },
    
    // LEGS
    { id: 21, name: 'Squats', muscle: 'Legs', difficulty: 'intermediate', equipment: 'Barbell' },
    { id: 22, name: 'Leg Press', muscle: 'Legs', difficulty: 'beginner', equipment: 'Leg Press Machine' },
    { id: 23, name: 'Lunges', muscle: 'Legs', difficulty: 'beginner', equipment: 'Dumbbells' },
    { id: 24, name: 'Romanian Deadlift', muscle: 'Legs', difficulty: 'intermediate', equipment: 'Barbell' },
    { id: 25, name: 'Calf Raises', muscle: 'Legs', difficulty: 'beginner', equipment: 'Dumbbells' },
    
    // CORE
    { id: 26, name: 'Plank', muscle: 'Core', difficulty: 'beginner', equipment: 'Bodyweight' },
    { id: 27, name: 'Hanging Leg Raises', muscle: 'Core', difficulty: 'intermediate', equipment: 'Pull-up Bar' },
    { id: 28, name: 'Russian Twists', muscle: 'Core', difficulty: 'beginner', equipment: 'Bodyweight' },
    { id: 29, name: 'Mountain Climbers', muscle: 'Core', difficulty: 'beginner', equipment: 'Bodyweight' },
    { id: 30, name: 'Dead Bug', muscle: 'Core', difficulty: 'beginner', equipment: 'Bodyweight' },
    
    // CARDIO
    { id: 31, name: 'Burpees', muscle: 'Cardio', difficulty: 'intermediate', equipment: 'Bodyweight' },
    { id: 32, name: 'High Knees', muscle: 'Cardio', difficulty: 'beginner', equipment: 'Bodyweight' },
    { id: 33, name: 'Jumping Jacks', muscle: 'Cardio', difficulty: 'beginner', equipment: 'Bodyweight' },
    { id: 34, name: 'Box Jumps', muscle: 'Cardio', difficulty: 'intermediate', equipment: 'Box' },
    { id: 35, name: 'Battle Ropes', muscle: 'Cardio', difficulty: 'intermediate', equipment: 'Battle Ropes' }
];

// ==================== FOOD DATABASE ====================
const foodDatabase = [
    // PROTEINS
    { id: 1, name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g' },
    { id: 2, name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, serving: '100g' },
    { id: 3, name: 'Eggs', calories: 155, protein: 13, carbs: 1.1, fat: 11, serving: '2 large' },
    { id: 4, name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 0, serving: '170g' },
    { id: 5, name: 'Tuna', calories: 132, protein: 28, carbs: 0, fat: 1, serving: '100g' },
    { id: 6, name: 'Lean Beef', calories: 250, protein: 26, carbs: 0, fat: 15, serving: '100g' },
    { id: 7, name: 'Turkey Breast', calories: 135, protein: 30, carbs: 0, fat: 1, serving: '100g' },
    { id: 8, name: 'Cottage Cheese', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, serving: '100g' },
    
    // CARBOHYDRATES
    { id: 9, name: 'Brown Rice', calories: 123, protein: 2.6, carbs: 23, fat: 0.9, serving: '100g cooked' },
    { id: 10, name: 'Oats', calories: 68, protein: 2.4, carbs: 12, fat: 1.4, serving: '40g dry' },
    { id: 11, name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, serving: '100g' },
    { id: 12, name: 'Quinoa', calories: 120, protein: 4.4, carbs: 22, fat: 1.9, serving: '100g cooked' },
    { id: 13, name: 'Whole Wheat Bread', calories: 80, protein: 4, carbs: 14, fat: 1, serving: '1 slice' },
    { id: 14, name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, serving: '1 medium' },
    { id: 15, name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, serving: '1 medium' },
    { id: 16, name: 'Blueberries', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, serving: '100g' },
    
    // FATS
    { id: 17, name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, serving: '1/2 medium' },
    { id: 18, name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14, serving: '28g' },
    { id: 19, name: 'Olive Oil', calories: 119, protein: 0, carbs: 0, fat: 14, serving: '1 tbsp' },
    { id: 20, name: 'Peanut Butter', calories: 190, protein: 8, carbs: 8, fat: 16, serving: '2 tbsp' },
    { id: 21, name: 'Walnuts', calories: 185, protein: 4.3, carbs: 3.9, fat: 18, serving: '28g' },
    { id: 22, name: 'Coconut Oil', calories: 117, protein: 0, carbs: 0, fat: 14, serving: '1 tbsp' },
    
    // VEGETABLES
    { id: 23, name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, serving: '100g' },
    { id: 24, name: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, serving: '100g' },
    { id: 25, name: 'Bell Peppers', calories: 20, protein: 1, carbs: 5, fat: 0.2, serving: '100g' },
    { id: 26, name: 'Carrots', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, serving: '100g' },
    { id: 27, name: 'Cucumber', calories: 16, protein: 0.7, carbs: 4, fat: 0.1, serving: '100g' },
    { id: 28, name: 'Tomatoes', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, serving: '100g' }
];

// ==================== WORKOUT TEMPLATES ====================
const workoutTemplates = {
    push: {
        name: 'Push Day',
        exercises: [
            { id: 1, sets: 4, reps: '8-10' }, // Bench Press
            { id: 2, sets: 3, reps: '10-12' }, // Incline Dumbbell Press
            { id: 11, sets: 3, reps: '8-10' }, // Overhead Press
            { id: 12, sets: 3, reps: '12-15' }, // Lateral Raises
            { id: 19, sets: 3, reps: '10-12' }, // Close-Grip Bench Press
            { id: 20, sets: 3, reps: '12-15' }  // Cable Tricep Pushdown
        ]
    },
    pull: {
        name: 'Pull Day',
        exercises: [
            { id: 6, sets: 4, reps: '5-6' },   // Deadlift
            { id: 7, sets: 3, reps: '8-10' },  // Pull-ups
            { id: 8, sets: 3, reps: '8-10' },  // Bent-over Row
            { id: 9, sets: 3, reps: '10-12' }, // Lat Pulldown
            { id: 16, sets: 3, reps: '10-12' }, // Barbell Curl
            { id: 17, sets: 3, reps: '12-15' }  // Hammer Curls
        ]
    },
    legs: {
        name: 'Leg Day',
        exercises: [
            { id: 21, sets: 4, reps: '8-10' }, // Squats
            { id: 24, sets: 3, reps: '10-12' }, // Romanian Deadlift
            { id: 22, sets: 3, reps: '12-15' }, // Leg Press
            { id: 23, sets: 3, reps: '12 each leg' }, // Lunges
            { id: 25, sets: 4, reps: '15-20' }, // Calf Raises
            { id: 26, sets: 3, reps: '30-60 sec' } // Plank
        ]
    },
    cardio: {
        name: 'HIIT Cardio',
        exercises: [
            { id: 31, sets: 4, reps: '10' },    // Burpees
            { id: 32, sets: 4, reps: '30 sec' }, // High Knees
            { id: 33, sets: 4, reps: '30 sec' }, // Jumping Jacks
            { id: 29, sets: 4, reps: '30 sec' }, // Mountain Climbers
            { id: 28, sets: 3, reps: '20 each side' } // Russian Twists
        ]
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadExerciseDatabase();
    updateDashboard();
    updateTime();
    setInterval(updateTime, 1000);
});

function initializeApp() {
    // Load user data and update UI
    const userData = DataManager.loadData('userData', {
        name: '',
        age: '',
        height: '',
        weight: '',
        goalWeight: '',
        activityLevel: 'moderate'
    });
    
    const goals = DataManager.loadData('goals', {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 80
    });
    
    // Update profile form if elements exist
    const userNameInput = document.getElementById('user-name');
    const userAgeInput = document.getElementById('user-age');
    const userHeightInput = document.getElementById('user-height');
    const goalWeightInput = document.getElementById('goal-weight');
    const activityLevelSelect = document.getElementById('activity-level');
    
    if (userNameInput) userNameInput.value = userData.name;
    if (userAgeInput) userAgeInput.value = userData.age;
    if (userHeightInput) userHeightInput.value = userData.height;
    if (goalWeightInput) goalWeightInput.value = userData.goalWeight;
    if (activityLevelSelect) activityLevelSelect.value = userData.activityLevel;
    
    // Update goals form if elements exist
    const calorieGoalInput = document.getElementById('calorie-goal');
    const proteinGoalInput = document.getElementById('protein-goal');
    const carbGoalInput = document.getElementById('carb-goal');
    const fatGoalInput = document.getElementById('fat-goal');
    
    if (calorieGoalInput) calorieGoalInput.value = goals.calories;
    if (proteinGoalInput) proteinGoalInput.value = goals.protein;
    if (carbGoalInput) carbGoalInput.value = goals.carbs;
    if (fatGoalInput) fatGoalInput.value = goals.fat;
    
    // Show welcome notification for new users
    if (!userData.name) {
        setTimeout(() => {
            showNotification('👋 Welcome to FuelFire!', 'Set up your profile to get personalized recommendations.', 'success');
        }, 2000);
    }
}

// ==================== NAVIGATION ====================
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen-content').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.classList.add('fade-in');
    }
    
    // Update header title
    const titles = {
        'home': 'FuelFire',
        'workouts': 'Workouts',
        'start-workout': 'Create Workout',
        'active-workout': 'Active Workout',
        'nutrition': 'Nutrition',
        'progress': 'Progress',
        'profile': 'Profile'
    };
    
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.textContent = titles[screenId] || 'FuelFire';
    }
    
    // Update sidebar menu
    updateSidebarMenu(screenId);
    
    // Close sidebar if open
    closeSidebar();
    
    // Load screen-specific data
    if (screenId === 'nutrition') {
        updateNutritionScreen();
    } else if (screenId === 'progress') {
        updateProgressScreen();
    } else if (screenId === 'workouts') {
        loadWorkoutTemplates();
    }
    
    currentScreen = screenId;
}

function updateSidebarMenu(activeScreen) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Map screen IDs to menu items
    const screenToMenu = {
        'home': '🏠 Home',
        'workouts': '💪 Workouts',
        'start-workout': '💪 Workouts',
        'active-workout': '💪 Workouts',
        'nutrition': '🥗 Nutrition',
        'progress': '📊 Progress',
        'profile': '👤 Profile'
    };
    
    const targetText = screenToMenu[activeScreen];
    if (targetText) {
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item.textContent.includes(targetText.split(' ')[1])) {
                item.classList.add('active');
            }
        });
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    updateDailyStats();
    updateGoalProgress();
    updateRecentActivity();
}

function updateDailyStats() {
    const today = new Date().toDateString();
    
    // Load today's data
    const todayWorkouts = DataManager.loadData('workouts', []).filter(w => 
        new Date(w.date).toDateString() === today
    );
    const todayNutrition = DataManager.loadData('dailyNutrition', {})[today] || { calories: 0 };
    const userData = DataManager.loadData('userData', {});
    
    // Calculate stats
    const totalWorkoutTime = todayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const streak = calculateStreak();
    
    // Update UI
    const dailyCaloriesEl = document.getElementById('daily-calories');
    const workoutTimeEl = document.getElementById('workout-time');
    const streakDaysEl = document.getElementById('streak-days');
    
    if (dailyCaloriesEl) dailyCaloriesEl.textContent = Math.round(todayNutrition.calories);
    if (workoutTimeEl) workoutTimeEl.textContent = `${totalWorkoutTime}m`;
    if (streakDaysEl) streakDaysEl.textContent = streak;
}

function updateGoalProgress() {
    const today = new Date().toDateString();
    const goals = DataManager.loadData('goals', { calories: 2000, protein: 150, carbs: 200, fat: 80 });
    const todayNutrition = DataManager.loadData('dailyNutrition', {})[today] || 
        { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const todayWorkouts = DataManager.loadData('workouts', []).filter(w => 
        new Date(w.date).toDateString() === today
    );
    
    // Update calorie progress
    const calorieProgress = Math.min((todayNutrition.calories / goals.calories) * 100, 100);
    const calorieProgressEl = document.getElementById('calorie-progress');
    const calorieProgressTextEl = document.getElementById('calorie-progress-text');
    
    if (calorieProgressEl) calorieProgressEl.style.width = `${calorieProgress}%`;
    if (calorieProgressTextEl) {
        calorieProgressTextEl.textContent = `${Math.round(todayNutrition.calories)} / ${goals.calories}`;
    }
    
    // Update workout progress
    const workoutProgress = Math.min((todayWorkouts.length / 1) * 100, 100);
    const workoutProgressEl = document.getElementById('workout-progress');
    const workoutProgressTextEl = document.getElementById('workout-progress-text');
    
    if (workoutProgressEl) workoutProgressEl.style.width = `${workoutProgress}%`;
    if (workoutProgressTextEl) workoutProgressTextEl.textContent = `${todayWorkouts.length} / 1`;
    
    // Update steps progress (simulated)
    const steps = Math.floor(Math.random() * 12000);
    const stepsProgress = Math.min((steps / 10000) * 100, 100);
    const stepsProgressEl = document.getElementById('steps-progress');
    const stepsProgressTextEl = document.getElementById('steps-progress-text');
    
    if (stepsProgressEl) stepsProgressEl.style.width = `${stepsProgress}%`;
    if (stepsProgressTextEl) stepsProgressTextEl.textContent = `${steps.toLocaleString()} / 10,000`;
}

function updateRecentActivity() {
    const recentWorkouts = DataManager.loadData('workouts', []).slice(-3);
    const recentMeals = DataManager.loadData('recentMeals', []).slice(-2);
    
    const activityEl = document.getElementById('recent-activity');
    if (!activityEl) return;
    
    let activityHTML = '';
    
    // Add recent workouts
    recentWorkouts.forEach(workout => {
        const date = new Date(workout.date).toLocaleDateString();
        activityHTML += `
            <div style="padding: 10px; margin-bottom: 8px; background: var(--lighter-bg); border-radius: 12px;">
                <div style="font-weight: bold; color: var(--dark);">🏋️ ${workout.name}</div>
                <div style="font-size: 14px; color: #666;">${workout.duration}min • ${date}</div>
            </div>
        `;
    });
    
    // Add recent meals
    recentMeals.forEach(meal => {
        const date = new Date(meal.date).toLocaleDateString();
        activityHTML += `
            <div style="padding: 10px; margin-bottom: 8px; background: var(--lighter-bg); border-radius: 12px;">
                <div style="font-weight: bold; color: var(--dark);">🥗 ${meal.name}</div>
                <div style="font-size: 14px; color: #666;">${meal.calories} cal • ${date}</div>
            </div>
        `;
    });
    
    if (activityHTML === '') {
        activityHTML = '<div style="color: #666; text-align: center; padding: 20px;">No recent activity. Start your first workout!</div>';
    }
    
    activityEl.innerHTML = activityHTML;
}

function calculateStreak() {
    const workouts = DataManager.loadData('workouts', []);
    if (workouts.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // Count consecutive days with workouts
    while (true) {
        const dateString = currentDate.toDateString();
        const hasWorkout = workouts.some(w => new Date(w.date).toDateString() === dateString);
        
        if (hasWorkout) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (streak === 0 && currentDate.toDateString() === today.toDateString()) {
            // If today has no workout, check yesterday
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

// ==================== EXERCISE DATABASE ====================
function loadExerciseDatabase() {
    const container = document.getElementById('exercise-database');
    if (!container) return;
    
    let exerciseHTML = '';
    
    exerciseDatabase.forEach(exercise => {
        const difficultyClass = `difficulty-${exercise.difficulty}`;
        exerciseHTML += `
            <div class="exercise-item" onclick="selectExercise(${exercise.id})">
                <div class="exercise-name">${exercise.name}</div>
                <div class="exercise-muscle">${exercise.muscle} • ${exercise.equipment}</div>
                <div class="exercise-difficulty ${difficultyClass}">${exercise.difficulty}</div>
            </div>
        `;
    });
    
    container.innerHTML = exerciseHTML;
}

function searchExercises() {
    const searchTerm = document.getElementById('exercise-search').value.toLowerCase();
    const container = document.getElementById('exercise-database');
    if (!container) return;
    
    const filteredExercises = exerciseDatabase.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm) ||
        exercise.muscle.toLowerCase().includes(searchTerm) ||
        exercise.equipment.toLowerCase().includes(searchTerm)
    );
    
    let exerciseHTML = '';
    
    filteredExercises.forEach(exercise => {
        const difficultyClass = `difficulty-${exercise.difficulty}`;
        const isSelected = selectedExercises.some(ex => ex.id === exercise.id);
        const selectedClass = isSelected ? 'selected' : '';
        
        exerciseHTML += `
            <div class="exercise-item ${selectedClass}" onclick="selectExercise(${exercise.id})">
                <div class="exercise-name">${exercise.name}</div>
                <div class="exercise-muscle">${exercise.muscle} • ${exercise.equipment}</div>
                <div class="exercise-difficulty ${difficultyClass}">${exercise.difficulty}</div>
            </div>
        `;
    });
    
    container.innerHTML = exerciseHTML || '<div style="text-align: center; color: #666; padding: 20px;">No exercises found</div>';
}

function selectExercise(exerciseId) {
    const exercise = exerciseDatabase.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    // Check if already selected
    const existingIndex = selectedExercises.findIndex(ex => ex.id === exerciseId);
    
    if (existingIndex > -1) {
        // Remove if already selected
        selectedExercises.splice(existingIndex, 1);
    } else {
        // Add with default sets/reps
        selectedExercises.push({
            ...exercise,
            sets: 3,
            reps: '10-12'
        });
    }
    
    updateSelectedExercises();
    searchExercises(); // Refresh the list to update selected state
}

function updateSelectedExercises() {
    const container = document.getElementById('selected-exercises');
    if (!container) return;
    
    if (selectedExercises.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let selectedHTML = '<h3 style="color: var(--dark); margin-bottom: 15px;">Selected Exercises</h3>';
    
    selectedExercises.forEach((exercise, index) => {
        selectedHTML += `
            <div style="background: var(--lighter-bg); padding: 20px; border-radius: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">${exercise.name}</div>
                        <div style="color: var(--primary-dark); font-size: 14px;">${exercise.muscle}</div>
                    </div>
                    <button onclick="removeSelectedExercise(${index})" style="background: var(--error); color: white; border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer;">
                        Remove
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--primary-dark);">Sets</label>
                        <input type="number" value="${exercise.sets}" onchange="updateExerciseParameter(${index}, 'sets', this.value)" 
                               style="width: 100%; padding: 8px; border: 1px solid var(--lighter-bg); border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--primary-dark);">Reps</label>
                        <input type="text" value="${exercise.reps}" onchange="updateExerciseParameter(${index}, 'reps', this.value)" 
                               style="width: 100%; padding: 8px; border: 1px solid var(--lighter-bg); border-radius: 8px;">
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = selectedHTML;
}

function updateExerciseParameter(index, parameter, value) {
    if (selectedExercises[index]) {
        selectedExercises[index][parameter] = parameter === 'sets' ? parseInt(value) : value;
    }
}

function removeSelectedExercise(index) {
    selectedExercises.splice(index, 1);
    updateSelectedExercises();
    searchExercises(); // Refresh to update selected state
}

// ==================== WORKOUT MANAGEMENT ====================
function startQuickWorkout(templateName) {
    const template = workoutTemplates[templateName];
    if (!template) return;
    
    // Convert template to selected exercises
    selectedExercises = template.exercises.map(templateEx => {
        const exercise = exerciseDatabase.find(ex => ex.id === templateEx.id);
        return {
            ...exercise,
            sets: templateEx.sets,
            reps: templateEx.reps
        };
    });
    
    // Set workout name
    document.getElementById('workout-name-input').value = template.name;
    
    // Start the workout immediately
    startWorkoutSession();
}

function loadWorkoutTemplates() {
    // This function can be expanded to load custom templates
    // For now, the templates are hardcoded in the HTML
}

function startWorkoutSession() {
    if (selectedExercises.length === 0) {
        showNotification('⚠️ No Exercises Selected', 'Please select at least one exercise to start your workout.', 'error');
        return;
    }
    
    const workoutName = document.getElementById('workout-name-input').value || 'My Workout';
    
    // Initialize workout session
    currentWorkout = {
        id: Date.now(),
        name: workoutName,
        exercises: selectedExercises.map(ex => ({
            ...ex,
            sets: Array(ex.sets).fill().map(() => ({ weight: '', reps: '', completed: false }))
        })),
        startTime: new Date(),
        duration: 0,
        totalVolume: 0
    };
    
    // Start timer
    workoutStartTime = Date.now();
    workoutTimer = setInterval(updateWorkoutTimer, 1000);
    
    // Show active workout screen
    showScreen('active-workout');
    loadActiveWorkout();
    
    showNotification('🔥 Workout Started!', `Good luck with your ${workoutName}!`, 'success');
}

function loadActiveWorkout() {
    if (!currentWorkout) return;
    
    const container = document.getElementById('active-exercises');
    if (!container) return;
    
    let workoutHTML = '';
    
    currentWorkout.exercises.forEach((exercise, exerciseIndex) => {
        workoutHTML += `
            <div class="workout-session">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <div style="font-weight: bold; font-size: 18px; color: var(--dark);">${exercise.name}</div>
                        <div style="color: var(--primary-dark);">${exercise.muscle} • ${exercise.sets} sets × ${exercise.reps} reps</div>
                    </div>
                </div>
                
                <div class="exercise-sets">
                    <div class="set-row" style="background: var(--primary-dark); color: white; font-weight: bold;">
                        <div class="set-number">Set</div>
                        <div style="text-align: center;">Weight (lbs)</div>
                        <div style="text-align: center;">Reps</div>
                        <div style="text-align: center;">✓</div>
                    </div>
                    
                    ${exercise.sets.map((set, setIndex) => `
                        <div class="set-row">
                            <div class="set-number">${setIndex + 1}</div>
                            <input type="number" class="set-input" placeholder="0" 
                                   value="${set.weight}" 
                                   onchange="updateSet(${exerciseIndex}, ${setIndex}, 'weight', this.value)">
                            <input type="number" class="set-input" placeholder="0" 
                                   value="${set.reps}" 
                                   onchange="updateSet(${exerciseIndex}, ${setIndex}, 'reps', this.value)">
                            <input type="checkbox" class="set-checkbox" 
                                   ${set.completed ? 'checked' : ''} 
                                   onchange="updateSet(${exerciseIndex}, ${setIndex}, 'completed', this.checked)">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = workoutHTML;
}

function updateSet(exerciseIndex, setIndex, property, value) {
    if (!currentWorkout) return;
    
    const set = currentWorkout.exercises[exerciseIndex].sets[setIndex];
    set[property] = property === 'completed' ? value : (property === 'weight' || property === 'reps') ? parseFloat(value) || 0 : value;
    
    // Calculate total volume when weight or reps change
    if (property === 'weight' || property === 'reps') {
        calculateTotalVolume();
    }
    
    // Play a success sound when set is completed (simulated with vibration if available)
    if (property === 'completed' && value) {
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        showNotification('✅ Set Complete!', 'Great job! Keep it up!', 'success');
    }
}

function calculateTotalVolume() {
    if (!currentWorkout) return;
    
    let totalVolume = 0;
    
    currentWorkout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
            if (set.weight && set.reps) {
                totalVolume += parseFloat(set.weight) * parseFloat(set.reps);
            }
        });
    });
    
    currentWorkout.totalVolume = totalVolume;
}

function updateWorkoutTimer() {
    if (!workoutStartTime) return;
    
    const elapsed = Math.floor((Date.now() - workoutStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (currentWorkout) {
        currentWorkout.duration = Math.floor(elapsed / 60);
    }
}

function pauseWorkout() {
    if (workoutTimer) {
        clearInterval(workoutTimer);
        workoutTimer = null;
        showNotification('⏸️ Workout Paused', 'Take your time and resume when ready.', 'success');
        
        // Change pause button to resume
        const pauseBtn = document.querySelector('[onclick="pauseWorkout()"]');
        if (pauseBtn) {
            pauseBtn.innerHTML = '▶️ Resume';
            pauseBtn.onclick = resumeWorkout;
        }
    }
}

function resumeWorkout() {
    if (!workoutTimer && workoutStartTime) {
        workoutTimer = setInterval(updateWorkoutTimer, 1000);
        showNotification('▶️ Workout Resumed', 'Let\'s get back to it!', 'success');
        
        // Change resume button back to pause
        const resumeBtn = document.querySelector('[onclick="resumeWorkout()"]');
        if (resumeBtn) {
            resumeBtn.innerHTML = '⏸️ Pause';
            resumeBtn.onclick = pauseWorkout;
        }
    }
}

function finishWorkout() {
    if (!currentWorkout) return;
    
    // Stop timer
    if (workoutTimer) {
        clearInterval(workoutTimer);
        workoutTimer = null;
    }
    
    // Calculate final stats
    calculateTotalVolume();
    currentWorkout.endTime = new Date();
    
    // Count completed sets
    let completedSets = 0;
    let totalSets = 0;
    
    currentWorkout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
            totalSets++;
            if (set.completed) completedSets++;
        });
    });
    
    // Save workout to storage
    const workouts = DataManager.loadData('workouts', []);
    workouts.push({
        ...currentWorkout,
        date: currentWorkout.startTime,
        completedSets,
        totalSets,
        completionRate: Math.round((completedSets / totalSets) * 100)
    });
    DataManager.saveData('workouts', workouts);
    
    // Update recent activity
    const recentActivity = DataManager.loadData('recentActivity', []);
    recentActivity.unshift({
        type: 'workout',
        name: currentWorkout.name,
        date: new Date(),
        duration: currentWorkout.duration,
        volume: Math.round(currentWorkout.totalVolume)
    });
    DataManager.saveData('recentActivity', recentActivity.slice(0, 10));
    
    // Show completion notification
    showNotification('🎉 Workout Complete!', 
        `Great job! You completed ${completedSets}/${totalSets} sets in ${currentWorkout.duration} minutes.`, 
        'success');
    
    // Reset workout state
    currentWorkout = null;
    workoutStartTime = null;
    selectedExercises = [];
    
    // Return to home screen
    setTimeout(() => {
        showScreen('home');
        updateDashboard();
    }, 2000);
}

// ==================== NUTRITION TRACKING ====================
function updateNutritionScreen() {
    updateNutritionSummary();
    loadFoodDatabase();
    loadTodaysMeals();
}

function updateNutritionSummary() {
    const today = new Date().toDateString();
    const todayNutrition = DataManager.loadData('dailyNutrition', {})[today] || 
        { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const goals = DataManager.loadData('goals', { calories: 2000, protein: 150, carbs: 200, fat: 80 });
    
    // Update total calories
    const totalCaloriesEl = document.getElementById('total-calories');
    if (totalCaloriesEl) totalCaloriesEl.textContent = Math.round(todayNutrition.calories);
    
    // Update macros
    const proteinGramsEl = document.getElementById('protein-grams');
    const carbGramsEl = document.getElementById('carb-grams');
    const fatGramsEl = document.getElementById('fat-grams');
    
    if (proteinGramsEl) proteinGramsEl.textContent = `${Math.round(todayNutrition.protein)}g`;
    if (carbGramsEl) carbGramsEl.textContent = `${Math.round(todayNutrition.carbs)}g`;
    if (fatGramsEl) fatGramsEl.textContent = `${Math.round(todayNutrition.fat)}g`;
    
    // Update progress bars
    const proteinProgress = Math.min((todayNutrition.protein / goals.protein) * 100, 100);
    const carbProgress = Math.min((todayNutrition.carbs / goals.carbs) * 100, 100);
    const fatProgress = Math.min((todayNutrition.fat / goals.fat) * 100, 100);
    
    const proteinProgressEl = document.getElementById('protein-progress');
    const carbProgressEl = document.getElementById('carb-progress');
    const fatProgressEl = document.getElementById('fat-progress');
    
    if (proteinProgressEl) proteinProgressEl.style.width = `${proteinProgress}%`;
    if (carbProgressEl) carbProgressEl.style.width = `${carbProgress}%`;
    if (fatProgressEl) fatProgressEl.style.width = `${fatProgress}%`;
}

function loadFoodDatabase() {
    // Foods will be loaded dynamically when searching
}

function searchFoods() {
    const searchTerm = document.getElementById('food-search').value.toLowerCase();
    const container = document.getElementById('food-results');
    if (!container) return;
    
    if (searchTerm.length < 2) {
        container.innerHTML = '';
        return;
    }
    
    const filteredFoods = foodDatabase.filter(food =>
        food.name.toLowerCase().includes(searchTerm)
    );
    
    let foodHTML = '';
    
    filteredFoods.slice(0, 10).forEach(food => {
        foodHTML += `
            <div class="food-item" onclick="addFood(${food.id})">
                <div class="food-name">${food.name}</div>
                <div class="food-calories">${food.calories} cal per ${food.serving} • P: ${food.protein}g, C: ${food.carbs}g, F: ${food.fat}g</div>
            </div>
        `;
    });
    
    container.innerHTML = foodHTML;
}

function addFood(foodId) {
    const food = foodDatabase.find(f => f.id === foodId);
    if (!food) return;
    
    // Prompt for serving size
    const servings = prompt(`How many servings of ${food.name}? (1 serving = ${food.serving})`, '1');
    if (!servings || isNaN(servings)) return;
    
    const multiplier = parseFloat(servings);
    
    // Calculate nutrition
    const nutrition = {
        calories: food.calories * multiplier,
        protein: food.protein * multiplier,
        carbs: food.carbs * multiplier,
        fat: food.fat * multiplier
    };
    
    // Add to today's nutrition
    const today = new Date().toDateString();
    const dailyNutrition = DataManager.loadData('dailyNutrition', {});
    
    if (!dailyNutrition[today]) {
        dailyNutrition[today] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    dailyNutrition[today].calories += nutrition.calories;
    dailyNutrition[today].protein += nutrition.protein;
    dailyNutrition[today].carbs += nutrition.carbs;
    dailyNutrition[today].fat += nutrition.fat;
    
    DataManager.saveData('dailyNutrition', dailyNutrition);
    
    // Add to today's meals
    const todaysMeals = DataManager.loadData('todaysMeals', []);
    todaysMeals.push({
        id: Date.now(),
        name: food.name,
        servings: multiplier,
        serving: food.serving,
        nutrition,
        time: new Date()
    });
    DataManager.saveData('todaysMeals', todaysMeals);
    
    // Update UI
    updateNutritionSummary();
    loadTodaysMeals();
    updateDashboard();
    
    // Clear search
    document.getElementById('food-search').value = '';
    document.getElementById('food-results').innerHTML = '';
    
    showNotification('🥗 Food Added!', `${food.name} added to your daily nutrition.`, 'success');
}

function loadTodaysMeals() {
    const todaysMeals = DataManager.loadData('todaysMeals', []);
    const container = document.getElementById('todays-meals');
    if (!container) return;
    
    if (todaysMeals.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No meals logged today. Start by adding your first meal!</div>';
        return;
    }
    
    let mealsHTML = '';
    
    todaysMeals.forEach(meal => {
        const time = new Date(meal.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        mealsHTML += `
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">${meal.name}</div>
                        <div style="font-size: 14px; color: var(--primary-dark);">
                            ${meal.servings} × ${meal.serving} • ${time}
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            ${Math.round(meal.nutrition.calories)} cal • P: ${Math.round(meal.nutrition.protein)}g, C: ${Math.round(meal.nutrition.carbs)}g, F: ${Math.round(meal.nutrition.fat)}g
                        </div>
                    </div>
                    <button onclick="removeMeal(${meal.id})" style="background: var(--error); color: white; border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-size: 12px;">
                        Remove
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = mealsHTML;
}

function removeMeal(mealId) {
    const todaysMeals = DataManager.loadData('todaysMeals', []);
    const mealIndex = todaysMeals.findIndex(m => m.id === mealId);
    
    if (mealIndex === -1) return;
    
    const meal = todaysMeals[mealIndex];
    
    // Remove from today's nutrition
    const today = new Date().toDateString();
    const dailyNutrition = DataManager.loadData('dailyNutrition', {});
    
    if (dailyNutrition[today]) {
        dailyNutrition[today].calories -= meal.nutrition.calories;
        dailyNutrition[today].protein -= meal.nutrition.protein;
        dailyNutrition[today].carbs -= meal.nutrition.carbs;
        dailyNutrition[today].fat -= meal.nutrition.fat;
        
        // Ensure no negative values
        Object.keys(dailyNutrition[today]).forEach(key => {
            if (dailyNutrition[today][key] < 0) dailyNutrition[today][key] = 0;
        });
        
        DataManager.saveData('dailyNutrition', dailyNutrition);
    }
    
    // Remove meal
    todaysMeals.splice(mealIndex, 1);
    DataManager.saveData('todaysMeals', todaysMeals);
    
    // Update UI
    updateNutritionSummary();
    loadTodaysMeals();
    updateDashboard();
    
    showNotification('🗑️ Meal Removed', 'Meal has been removed from your daily nutrition.', 'success');
}

// ==================== PROGRESS TRACKING ====================
function updateProgressScreen() {
    updateWeightProgress();
    updateWorkoutStats();
    updatePersonalRecords();
}

function updateWeightProgress() {
    const weights = DataManager.loadData('weights', []);
    const currentWeightEl = document.getElementById('current-weight');
    
    if (weights.length > 0) {
        const latestWeight = weights[weights.length - 1];
        if (currentWeightEl) currentWeightEl.textContent = `${latestWeight.weight} lbs`;
    } else {
        if (currentWeightEl) currentWeightEl.textContent = '0 lbs';
    }
    
    // Simple weight chart representation
    const chartEl = document.getElementById('weight-chart');
    if (chartEl && weights.length > 0) {
        let chartHTML = '<div style="display: flex; align-items: end; justify-content: space-around; height: 100%; padding: 20px;">';
        
        const maxWeight = Math.max(...weights.map(w => w.weight));
        const minWeight = Math.min(...weights.map(w => w.weight));
        const range = maxWeight - minWeight || 1;
        
        weights.slice(-7).forEach((weight, index) => {
            const height = ((weight.weight - minWeight) / range) * 80 + 20;
            const date = new Date(weight.date).toLocaleDateString();
            
            chartHTML += `
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="background: var(--gradient-1); width: 20px; height: ${height}%; border-radius: 10px 10px 0 0; margin-bottom: 5px;"></div>
                    <div style="font-size: 10px; color: #666; writing-mode: vertical-lr; text-orientation: mixed;">${weight.weight}</div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartEl.innerHTML = chartHTML;
    }
}

function logWeight() {
    const weightInput = document.getElementById('weight-input');
    if (!weightInput) return;
    
    const weight = parseFloat(weightInput.value);
    if (!weight || weight <= 0) {
        showNotification('⚠️ Invalid Weight', 'Please enter a valid weight.', 'error');
        return;
    }
    
    const weights = DataManager.loadData('weights', []);
    weights.push({
        weight,
        date: new Date(),
        id: Date.now()
    });
    
    DataManager.saveData('weights', weights);
    weightInput.value = '';
    
    updateWeightProgress();
    showNotification('📊 Weight Logged!', `Weight of ${weight} lbs has been recorded.`, 'success');
}

function updateWorkoutStats() {
    const workouts = DataManager.loadData('workouts', []);
    
    const totalWorkouts = workouts.length;
    const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
    const avgDuration = workouts.length > 0 ? Math.round(workouts.reduce((sum, w) => sum + (w.duration || 0), 0) / workouts.length) : 0;
    const currentStreak = calculateStreak();
    
    const totalWorkoutsEl = document.getElementById('total-workouts');
    const totalVolumeEl = document.getElementById('total-volume');
    const avgDurationEl = document.getElementById('avg-duration');
    const currentStreakEl = document.getElementById('current-streak');
    
    if (totalWorkoutsEl) totalWorkoutsEl.textContent = totalWorkouts;
    if (totalVolumeEl) totalVolumeEl.textContent = Math.round(totalVolume).toLocaleString();
    if (avgDurationEl) avgDurationEl.textContent = `${avgDuration}min`;
    if (currentStreakEl) currentStreakEl.textContent = currentStreak;
}

function updatePersonalRecords() {
    const workouts = DataManager.loadData('workouts', []);
    const recordsEl = document.getElementById('personal-records');
    if (!recordsEl) return;
    
    if (workouts.length === 0) {
        recordsEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Complete workouts to see your personal records!</div>';
        return;
    }
    
    // Calculate personal records by exercise
    const records = {};
    
    workouts.forEach(workout => {
        workout.exercises.forEach(exercise => {
            exercise.sets.forEach(set => {
                if (set.weight && set.reps && set.completed) {
                    const oneRepMax = calculateOneRepMax(parseFloat(set.weight), parseFloat(set.reps));
                    
                    if (!records[exercise.name] || oneRepMax > records[exercise.name].oneRepMax) {
                        records[exercise.name] = {
                            oneRepMax,
                            weight: parseFloat(set.weight),
                            reps: parseFloat(set.reps),
                            date: workout.date
                        };
                    }
                }
            });
        });
    });
    
    let recordsHTML = '';
    
    Object.entries(records).slice(0, 5).forEach(([exerciseName, record]) => {
        const date = new Date(record.date).toLocaleDateString();
        recordsHTML += `
            <div style="padding: 15px; margin-bottom: 10px; background: var(--lighter-bg); border-radius: 15px;">
                <div style="font-weight: bold; color: var(--dark);">${exerciseName}</div>
                <div style="color: var(--primary-dark);">
                    ${record.weight} lbs × ${record.reps} reps (Est. 1RM: ${Math.round(record.oneRepMax)} lbs)
                </div>
                <div style="font-size: 12px; color: #666;">${date}</div>
            </div>
        `;
    });
    
    recordsEl.innerHTML = recordsHTML || '<div style="text-align: center; padding: 20px; color: #666;">No personal records yet. Complete some sets!</div>';
}

function calculateOneRepMax(weight, reps) {
    // Epley formula: 1RM = weight × (1 + reps/30)
    return weight * (1 + reps / 30);
}

// ==================== PROFILE MANAGEMENT ====================
function saveProfile() {
    const userData = {
        name: document.getElementById('user-name').value,
        age: document.getElementById('user-age').value,
        height: document.getElementById('user-height').value,
        goalWeight: document.getElementById('goal-weight').value,
        activityLevel: document.getElementById('activity-level').value
    };
    
    DataManager.saveData('userData', userData);
    showNotification('👤 Profile Saved!', 'Your profile information has been updated.', 'success');
}

function saveGoals() {
    const goals = {
        calories: parseInt(document.getElementById('calorie-goal').value) || 2000,
        protein: parseInt(document.getElementById('protein-goal').value) || 150,
        carbs: parseInt(document.getElementById('carb-goal').value) || 200,
        fat: parseInt(document.getElementById('fat-goal').value) || 80
    };
    
    DataManager.saveData('goals', goals);
    updateDashboard();
    showNotification('🎯 Goals Updated!', 'Your daily nutrition goals have been saved.', 'success');
}

function exportData() {
    const allData = {
        userData: DataManager.loadData('userData', {}),
        goals: DataManager.loadData('goals', {}),
        workouts: DataManager.loadData('workouts', []),
        weights: DataManager.loadData('weights', []),
        dailyNutrition: DataManager.loadData('dailyNutrition', {}),
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `fuelfire-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('📤 Data Exported!', 'Your FuelFire data has been downloaded.', 'success');
}

function clearAllData() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
        if (confirm('This will permanently delete all your workouts, nutrition data, and progress. Are you absolutely sure?')) {
            DataManager.clearAllData();
            
            // Reset UI
            selectedExercises = [];
            currentWorkout = null;
            if (workoutTimer) {
                clearInterval(workoutTimer);
                workoutTimer = null;
            }
            
            // Reload app
            location.reload();
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeEl = document.getElementById('time');
    if (timeEl) timeEl.textContent = timeString;
}

function showNotification(title, message, type = 'success') {
    const notification = document.getElementById('notification');
    const titleEl = document.getElementById('notification-title');
    const contentEl = document.getElementById('notification-content');
    const iconEl = document.getElementById('notification-icon');
    
    if (!notification) return;
    
    // Set content
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.textContent = message;
    
    // Set icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    if (iconEl) iconEl.textContent = icons[type] || '💪';
    
    // Set type class
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.classList.add('show');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function closeNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.remove('show');
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('keydown', function(e) {
    // ESC key closes sidebar
    if (e.key === 'Escape') {
        closeSidebar();
    }
    
    // Enter key in search fields
    if (e.key === 'Enter') {
        if (e.target.id === 'exercise-search') {
            searchExercises();
        } else if (e.target.id === 'food-search') {
            searchFoods();
        }
    }
});

// ==================== PWA SUPPORT ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}

// ==================== INITIALIZATION ====================
// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}