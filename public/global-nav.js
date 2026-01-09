// Global navigation functions for all pages

// Toggle Sidebar Menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
    if (overlay) {
        overlay.classList.toggle('show');
    }
}

// Navigation helper functions
function goToPage(page) {
    window.location.href = page;
}

function goToScreen(page, screenId) {
    window.location.href = `${page}#${screenId}`;
}

function goBack() {
    window.history.back();
}

// Ensure Book a Coach appears in all sidebars
function ensureBookCoachLink() {
    const menu = document.querySelector('.sidebar-menu');
    if (!menu) return;
    const existing = menu.querySelector('[data-nav="book-coach"]');
    if (existing) return;
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.dataset.nav = 'book-coach';
    item.onclick = () => { window.location.href = 'coaching-scheduler.html'; };
    item.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; vertical-align:middle; margin-right:8px;">
            <path d="M8 16L11 19L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="2"/>
        </svg>
        Book a Coach
    `;
    // Insert after Health Dashboard if present, else append
    const healthItem = Array.from(menu.children).find(el => el.textContent && el.textContent.includes('Health Dashboard'));
    if (healthItem && healthItem.nextSibling) {
        menu.insertBefore(item, healthItem.nextSibling);
    } else {
        menu.appendChild(item);
    }
}

function ensureBookCoachBottomNav() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav || nav.dataset.includeCoach !== 'true') return;

    const hasCoachLink = Array.from(nav.querySelectorAll('.nav-item')).some((item) => {
        const onclick = item.getAttribute('onclick') || '';
        const href = item.querySelector('a')?.getAttribute('href') || '';
        return item.dataset.nav === 'book-coach' ||
            onclick.includes('coaching-scheduler.html') ||
            href.includes('coaching-scheduler.html');
    });
    if (hasCoachLink) return;

    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.nav = 'book-coach';
    item.onclick = () => { window.location.href = 'coaching-scheduler.html'; };
    item.innerHTML = `
        <div class="nav-glow"></div>
        <div class="nav-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 16L11 19L16 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="3" y="4" width="18" height="16" rx="3" stroke="white" stroke-width="2"/>
            </svg>
        </div>
    `;
    nav.appendChild(item);
}

function ensureAccountBottomNav() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;

    const hasAccount = Array.from(nav.querySelectorAll('.nav-item')).some((item) => {
        const onclick = item.getAttribute('onclick') || '';
        return item.dataset.nav === 'account' || onclick.includes('account.html');
    });
    if (hasAccount) return;

    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.nav = 'account';
    item.onclick = () => { window.location.href = 'account.html'; };
    item.innerHTML = `
        <div class="nav-glow"></div>
        <div class="nav-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="5" stroke="white" stroke-width="2" fill="none"/>
                <path d="M3 21C3 17 7 14 12 14C17 14 21 17 21 21" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </div>
    `;
    nav.appendChild(item);
}

// Attach a global exercise image fallback to prevent broken blue icons
const EXERCISE_IMG_FALLBACK = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg';
function applyExerciseImageFallback(img) {
    if (!img || img.dataset.hasFallback) return;
    img.dataset.hasFallback = '1';
    img.onerror = () => {
        img.onerror = null;
        img.src = EXERCISE_IMG_FALLBACK;
    };
}

function scanExerciseImages(root = document) {
    // Broadly scan for exercise images and attach fallback (covers pages that don't use exercise-img ids)
    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (src.includes('exercises/') || img.id?.startsWith('exercise-img') || img.classList.contains('exercise-image') || img.dataset.exerciseImage !== undefined) {
            applyExerciseImageFallback(img);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    ensureBookCoachLink();
    ensureBookCoachBottomNav();
    ensureAccountBottomNav();
    scanExerciseImages();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'IMG') applyExerciseImageFallback(node);
                    scanExerciseImages(node);
                    if (node.classList?.contains('bottom-nav')) {
                        ensureBookCoachBottomNav();
                        ensureAccountBottomNav();
                    }
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

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
