// Global navigation functions for all pages

// Toggle Sidebar Menu
function getOverlayElement() {
    return document.getElementById('global-overlay') || document.querySelector('.overlay');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = getOverlayElement();
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
    if (overlay) {
        overlay.classList.toggle('show');
    }
}

// Navigation helper functions
const PENDING_SCREEN_KEY = 'fuelfire_pending_screen';

function closeSidebarIfOpen() {
    const sidebar = document.getElementById('sidebar');
    const overlay = getOverlayElement();
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
}

function setPendingScreen(screenId) {
    try {
        if (screenId) {
            localStorage.setItem(PENDING_SCREEN_KEY, screenId);
        }
    } catch (error) {
        console.warn('Unable to persist pending screen:', error);
    }
}

function clearPendingScreen() {
    try {
        localStorage.removeItem(PENDING_SCREEN_KEY);
    } catch (error) {
        console.warn('Unable to clear pending screen:', error);
    }
}

function goToPage(page) {
    closeSidebarIfOpen();
    window.location.href = page;
}

function goToScreen(page, screenId) {
    if (!screenId) {
        goToPage(page || 'index.html');
        return;
    }

    setPendingScreen(screenId);

    const normalizedPage = (page || 'index.html').trim();
    const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const targetPage = normalizedPage.toLowerCase();

    if (screenId && (currentPath === '' || currentPath === 'index.html') &&
        (targetPage === '' || targetPage === 'index.html' || targetPage === './')) {
        if (typeof showScreen === 'function' && document.getElementById(screenId)) {
            history.replaceState(null, '', `#${screenId}`);
            showScreen(screenId);
            closeSidebarIfOpen();
            clearPendingScreen();
            return;
        }
    }

    closeSidebarIfOpen();
    window.location.href = `${normalizedPage}#${screenId}`;
}

function goBack() {
    window.history.back();
}

// -------- Workout Form Helper --------

const FORM_HELP_PAGE_MAP = {
    chest: 'workout-chest.html',
    back: 'workout-back.html',
    shoulders: 'workout-shoulders.html',
    arms: 'workout-arms.html',
    legs: 'workout-legs.html',
    calves: 'workout-calves.html',
    core: 'workout-core.html',
    cardio: 'workout-cardio.html',
    techniques: 'workout-techniques.html'
};

const FORM_HELP_ALIASES = {
    chest: 'chest',
    pec: 'chest',
    pecs: 'chest',
    upperchest: 'chest',
    back: 'back',
    lats: 'back',
    lat: 'back',
    traps: 'back',
    rear: 'back',
    shoulders: 'shoulders',
    delts: 'shoulders',
    delt: 'shoulders',
    arms: 'arms',
    biceps: 'arms',
    triceps: 'arms',
    forearms: 'arms',
    legs: 'legs',
    quads: 'legs',
    quad: 'legs',
    hamstrings: 'legs',
    hamstring: 'legs',
    glutes: 'legs',
    glute: 'legs',
    lowerbody: 'legs',
    calves: 'calves',
    calf: 'calves',
    core: 'core',
    abs: 'core',
    abdominals: 'core',
    midsection: 'core',
    cardio: 'cardio',
    conditioning: 'cardio',
    endurance: 'cardio',
    fullbody: 'techniques',
    totalbody: 'techniques',
    mobility: 'techniques'
};

const FORM_NAME_KEYWORDS = [
    { muscle: 'shoulders', patterns: ['shoulder', 'overhead press', 'military press', 'lateral raise', 'rear delt', 'arnold press'] },
    { muscle: 'chest', patterns: ['bench', 'push-up', 'push up', 'chest press', 'pec fly', 'pec deck', 'incline press'] },
    { muscle: 'back', patterns: ['row', 'deadlift', 'dead lift', 'pull-up', 'pull up', 'lat pulldown', 'face pull', 'good morning'] },
    { muscle: 'legs', patterns: ['squat', 'lunge', 'leg press', 'leg extension', 'leg curl', 'hip thrust', 'split squat', 'step-up'] },
    { muscle: 'arms', patterns: ['curl', 'tricep', 'bicep', 'extension', 'skullcrusher', 'pressdown', 'dip', 'hammer curl'] },
    { muscle: 'calves', patterns: ['calf', 'calves'] },
    { muscle: 'core', patterns: ['plank', 'crunch', 'sit-up', 'sit up', 'leg raise', 'hanging knee', 'russian twist', 'mountain climber', 'v-up', 'ab wheel', 'core'] },
    { muscle: 'cardio', patterns: ['run', 'sprint', 'bike', 'elliptical', 'rower', 'jump rope', 'jumprope', 'cardio', 'assault bike'] }
];

function resolveFormMuscle(value) {
    if (!value) return null;
    const key = value.toString().trim().toLowerCase().replace(/[\s-]+/g, '');
    if (!key) return null;
    if (FORM_HELP_PAGE_MAP[key]) {
        return key;
    }
    if (FORM_HELP_ALIASES[key]) {
        return FORM_HELP_ALIASES[key];
    }
    const aliasMatch = Object.keys(FORM_HELP_ALIASES).find(alias => key.includes(alias));
    if (aliasMatch) {
        return FORM_HELP_ALIASES[aliasMatch];
    }
    return null;
}

function inferFormMuscleFromName(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    for (const entry of FORM_NAME_KEYWORDS) {
        if (entry.patterns.some(pattern => lower.includes(pattern))) {
            return entry.muscle;
        }
    }
    return null;
}

function inferFormMuscleFromExercise(exercise) {
    if (!exercise) return null;
    const directKeys = [
        exercise.muscle,
        exercise.primaryMuscle,
        exercise.primaryMuscles && exercise.primaryMuscles[0],
        exercise.muscleGroup,
        exercise.category,
        exercise.focus
    ];

    for (const key of directKeys) {
        const resolved = resolveFormMuscle(key);
        if (resolved) return resolved;
    }

    if (Array.isArray(exercise.primaryMuscles)) {
        for (const muscle of exercise.primaryMuscles) {
            const resolved = resolveFormMuscle(muscle);
            if (resolved) return resolved;
        }
    }

    if (Array.isArray(exercise.muscles)) {
        for (const muscle of exercise.muscles) {
            const resolved = resolveFormMuscle(muscle);
            if (resolved) return resolved;
        }
    }

    const inferred = inferFormMuscleFromName(exercise.name);
    if (inferred) return inferred;

    return null;
}

function getFormHelpUrl(target) {
    let muscle = null;

    if (typeof target === 'string') {
        muscle = resolveFormMuscle(target) || inferFormMuscleFromName(target);
    } else if (target && typeof target === 'object') {
        muscle = inferFormMuscleFromExercise(target);
    }

    if (!muscle) {
        muscle = 'techniques';
    }

    return FORM_HELP_PAGE_MAP[muscle] || FORM_HELP_PAGE_MAP.techniques;
}

function goToFormHelp(target) {
    const url = getFormHelpUrl(target);
    if (url) {
        window.location.href = url;
    }
}

document.addEventListener('click', event => {
    const button = event.target.closest('[data-form-help]');
    if (!button) return;
    event.preventDefault();

    const payload = {
        muscle: button.dataset.formMuscle,
        primaryMuscles: button.dataset.formMuscle ? [button.dataset.formMuscle] : undefined,
        name: button.dataset.formName,
        category: button.dataset.formCategory
    };

    goToFormHelp(payload);
});

window.goToFormHelp = goToFormHelp;
window.getFormHelpUrl = getFormHelpUrl;
window.resolveFormMuscle = resolveFormMuscle;
window.inferFormMuscleFromExercise = inferFormMuscleFromExercise;

// Show Log Food Menu - works on all pages
function showLogFoodMenu() {
    // If we're on index.html, the modal exists
    const modal = document.getElementById('logFoodModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        // If we're on a different page, redirect to index.html and show modal
        window.location.href = 'index.html#logfood';
    }
}

// Close Log Food Menu
function closeLogFoodMenu() {
    const modal = document.getElementById('logFoodModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Check if we should show log food modal on page load (for redirects)
if (window.location.hash === '#logfood') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(showLogFoodMenu, 100);
        });
    } else {
        setTimeout(showLogFoodMenu, 100);
    }
    // Clear the hash
    history.replaceState(null, null, window.location.pathname);
}
