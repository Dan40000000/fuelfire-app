// WORKOUT VOLUME CHART - Determines exercises and sets based on time
const WORKOUT_VOLUME_CHART = {
    15: { totalExercises: 3, setsPerExercise: 3, totalSets: 9, restBetweenSets: '45-60 sec' },
    30: { totalExercises: 5, setsPerExercise: 3, totalSets: 15, restBetweenSets: '60 sec' },
    45: { totalExercises: 6, setsPerExercise: 4, totalSets: 24, restBetweenSets: '75-90 sec' },
    60: { totalExercises: 7, setsPerExercise: 4, totalSets: 28, restBetweenSets: '90 sec' },
    75: { totalExercises: 9, setsPerExercise: 4, totalSets: 36, restBetweenSets: '90-120 sec' },
    90: { totalExercises: 10, setsPerExercise: 4, totalSets: 40, restBetweenSets: '120 sec' },
    120: { totalExercises: 14, setsPerExercise: 4, totalSets: 56, restBetweenSets: '120 sec' }
};

// Location fallback logic allows hotel/home users to still get workouts if a pool is light
const LOCATION_FALLBACKS = {
    home: ['home', 'hotel', 'park', 'gym'],
    hotel: ['hotel', 'gym', 'home', 'park'],
    gym: ['gym', 'hotel', 'home', 'park'],
    park: ['park', 'home', 'hotel', 'gym'],
    default: ['gym', 'home', 'hotel', 'park']
};

const WORKOUT_BALANCE_RULES = {
    chest: {
        required: ['upper-chest', 'mid-chest', 'lower-chest'],
        optional: ['fly'],
        keywords: {
            'upper-chest': ['incline', 'upper', 'reverse grip', 'feet elevated', 'low-to-high'],
            'mid-chest': ['flat', 'bench', 'push-up', 'push up', 'press', 'floor'],
            'lower-chest': ['decline', 'dip', 'high-to-low', 'lower', 'deficit'],
            fly: ['fly', 'cable', 'svend', 'pec deck', 'crossover', 'squeeze']
        }
    },
    back: {
        required: ['vertical-pull', 'horizontal-row'],
        optional: ['posterior-chain', 'upper-back'],
        keywords: {
            'vertical-pull': ['pull-up', 'chin', 'lat pulldown', 'pulldown', 'pull down'],
            'horizontal-row': ['row', 'meadows', 'seal', 'pendlay', 'cable row', 'machine row', 'inverted', 'australian'],
            'posterior-chain': ['deadlift', 'dead lift', 'rdl', 'romanian', 'good morning', 'hyperextension', 'reverse hyper', 'hinge'],
            'upper-back': ['face pull', 'kelso', 'shrug', 'rear delt', 'trap']
        }
    },
    shoulders: {
        required: ['overhead-press', 'lateral-raise', 'rear-delt'],
        optional: ['front-raise'],
        keywords: {
            'overhead-press': ['press', 'push press', 'arnold', 'military', 'overhead'],
            'lateral-raise': ['lateral', 'side raise', 'cable raise'],
            'rear-delt': ['rear', 'reverse fly', 'face pull', 'bent-over raise', 'y-raise', 'posterior'],
            'front-raise': ['front raise', 'plate raise']
        }
    },
    quads: {
        required: ['squat-pattern', 'lunge-split'],
        optional: ['machine-quads'],
        keywords: {
            'squat-pattern': ['squat', 'front squat', 'hack squat', 'zercher', 'box squat'],
            'lunge-split': ['lunge', 'split squat', 'step-up', 'step up', 'bulgarian'],
            'machine-quads': ['leg press', 'leg extension', 'sled', 'belt squat']
        }
    },
    hamstrings: {
        required: ['hinge', 'leg-curl'],
        optional: ['glute-ham'],
        keywords: {
            hinge: ['deadlift', 'dead lift', 'romanian', 'good morning', 'rdl', 'hip hinge', 'pull through'],
            'leg-curl': ['curl', 'hamstring curl', 'leg curl'],
            'glute-ham': ['glute-ham', 'nordic', 'slider', 'ham raise']
        }
    },
    glutes: {
        required: ['hip-hinge', 'abduction'],
        optional: ['unilateral'],
        keywords: {
            'hip-hinge': ['hip thrust', 'glute bridge', 'deadlift', 'romanian', 'swing'],
            abduction: ['kickback', 'clam', 'abduction', 'monster walk', 'band walk'],
            unilateral: ['lunge', 'step-up', 'split squat', 'single-leg', 'pistol']
        }
    },
    calves: {
        required: ['standing-calf'],
        optional: ['seated-calf', 'plyometric'],
        keywords: {
            'standing-calf': ['standing calf', 'calf raise', 'donkey'],
            'seated-calf': ['seated calf', 'tib raise', 'soleus'],
            plyometric: ['jump', 'hop', 'plyo']
        }
    },
    core: {
        required: ['anti-extension', 'rotation'],
        optional: ['flexion', 'carry'],
        keywords: {
            'anti-extension': ['plank', 'ab wheel', 'dead bug', 'hollow', 'body saw'],
            rotation: ['woodchop', 'russian twist', 'pallof', 'chop', 'twist'],
            flexion: ['crunch', 'sit-up', 'leg raise', 'toe touch', 'jackknife'],
            carry: ['carry', 'farmer', 'suitcase', 'walk']
        }
    },
    'full-body': {
        required: ['compound-lift', 'conditioning'],
        optional: ['unilateral'],
        keywords: {
            'compound-lift': ['clean', 'snatch', 'thruster', 'deadlift', 'squat', 'swing', 'burpee'],
            conditioning: ['row', 'bike', 'jump rope', 'kettlebell swing', 'mountain climber', 'battle rope', 'conditioning', 'cardio'],
            unilateral: ['lunge', 'split squat', 'step-up', 'single-arm', 'single leg']
        }
    }
};

const EXERCISE_FOCUS_OVERRIDES = {
    chest: {
        'Low-to-High Cable Flyes': 'upper-chest',
        'High-to-Low Cable Flyes': 'lower-chest',
        'Decline Push-ups': 'lower-chest',
        'Decline Barbell Bench Press': 'lower-chest',
        'Incline Barbell Bench Press': 'upper-chest',
        'Incline Dumbbell Press': 'upper-chest',
        'Reverse Grip Bench Press': 'upper-chest',
        'Deficit Push-ups': 'mid-chest',
        'Dips': 'lower-chest'
    },
    back: {
        'Deadlifts': 'posterior-chain',
        'Romanian Deadlifts': 'posterior-chain',
        'Good Mornings': 'posterior-chain',
        'Face Pulls': 'upper-back',
        'Hyperextensions': 'posterior-chain',
        'Lat Pulldowns': 'vertical-pull',
        'Pull-ups': 'vertical-pull',
        'Pendlay Rows': 'horizontal-row',
        'Seal Rows': 'horizontal-row',
        'Inverted Rows': 'horizontal-row'
    },
    shoulders: {
        'Face Pulls': 'rear-delt',
        'Rear Delt Flyes': 'rear-delt',
        'Arnold Press': 'overhead-press',
        'Military Press': 'overhead-press',
        'Lateral Raises': 'lateral-raise'
    },
    glutes: {
        'Hip Thrusts': 'hip-hinge',
        'Barbell Hip Thrusts': 'hip-hinge',
        'Glute Bridges': 'hip-hinge',
        'Banded Monster Walks': 'abduction',
        'Cable Kickbacks': 'abduction'
    },
    calves: {
        'Standing Calf Raises': 'standing-calf',
        'Seated Calf Raises': 'seated-calf',
        'Single-Leg Calf Raises': 'standing-calf'
    },
    core: {
        'Pallof Press': 'rotation',
        'Russian Twists': 'rotation',
        'Plank': 'anti-extension',
        'Hanging Leg Raises': 'flexion',
        'Farmer\'s Carry': 'carry'
    }
};

function shuffle(array) {
    const cloned = [...array];
    for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
}

function computeExerciseFocus(muscle, exercise) {
    if (!exercise) return 'general';
    const overrides = EXERCISE_FOCUS_OVERRIDES[muscle];
    if (overrides && overrides[exercise.name]) {
        return overrides[exercise.name];
    }

    const rule = WORKOUT_BALANCE_RULES[muscle];
    if (!rule) {
        return 'general';
    }

    const text = `${exercise.name} ${exercise.notes || ''}`.toLowerCase();
    const keywordsMap = rule.keywords || {};
    for (const [focus, keywords] of Object.entries(keywordsMap)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return focus;
        }
    }

    return 'general';
}

function formatFocusLabel(focus) {
    if (!focus || focus === 'general') return 'Balanced Activation';
    return focus
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

// MASSIVE EXERCISE DATABASE
const EXERCISE_DATABASE = {
    // ========== CHEST EXERCISES ==========
    chest: {
        routine: {
            gym: [
                { name: 'Barbell Bench Press', reps: '8-10', notes: 'Classic compound movement' },
                { name: 'Incline Barbell Bench Press', reps: '8-10', notes: 'Upper chest focus' },
                { name: 'Decline Barbell Bench Press', reps: '8-10', notes: 'Lower chest focus' },
                { name: 'Dumbbell Bench Press', reps: '10-12', notes: 'Greater range of motion' },
                { name: 'Incline Dumbbell Press', reps: '10-12', notes: 'Upper chest development' },
                { name: 'Low-to-High Cable Flyes', reps: '12-15', notes: 'Upper chest, cables set low' },
                { name: 'High-to-Low Cable Flyes', reps: '12-15', notes: 'Lower chest, cables set high' },
                { name: 'Mid Cable Flyes', reps: '12-15', notes: 'Middle chest, cables at shoulder height' },
                { name: 'Pec Deck Machine', reps: '12-15', notes: 'Isolation movement' },
                { name: 'Dips', reps: '8-12', notes: 'Lower chest and triceps' },
                { name: 'Push-ups', reps: '15-20', notes: 'Bodyweight classic' },
                { name: 'Chest Press Machine', reps: '10-12', notes: 'Controlled movement' }
            ],
            home: [
                { name: 'Standard Push-ups', reps: '15-20', notes: 'Classic bodyweight' },
                { name: 'Wide Push-ups', reps: '12-15', notes: 'Outer chest focus' },
                { name: 'Diamond Push-ups', reps: '10-12', notes: 'Inner chest and triceps' },
                { name: 'Decline Push-ups', reps: '12-15', notes: 'Upper chest emphasis' },
                { name: 'Dumbbell Floor Press', reps: '10-12', notes: 'If you have dumbbells' },
                { name: 'Dumbbell Flyes (on floor)', reps: '12-15', notes: 'Chest stretch' },
                { name: 'Resistance Band Chest Press', reps: '15-20', notes: 'If you have bands' }
            ],
            hotel: [
                { name: 'Dumbbell Bench Press', reps: '10-12', notes: 'Most hotel gyms have DBs' },
                { name: 'Incline Dumbbell Press', reps: '10-12', notes: 'Use adjustable bench' },
                { name: 'Push-ups', reps: '15-20', notes: 'Always available' },
                { name: 'Decline Push-ups', reps: '12-15', notes: 'Feet on bed/chair' },
                { name: 'Dumbbell Flyes', reps: '12-15', notes: 'Great stretch' }
            ],
            park: [
                { name: 'Push-ups', reps: '15-20', notes: 'Ground work' },
                { name: 'Wide Push-ups', reps: '12-15', notes: 'Outer chest' },
                { name: 'Decline Push-ups', reps: '12-15', notes: 'Feet elevated on bench' },
                { name: 'Bench Dips', reps: '12-15', notes: 'Use park bench' },
                { name: 'Plyometric Push-ups', reps: '8-10', notes: 'Explosive power' }
            ]
        },
        unique: {
            gym: [
                { name: 'Guillotine Press', reps: '8-10', notes: 'Bar to neck, upper chest killer' },
                { name: 'Larsen Press', reps: '6-8', notes: 'Feet up bench press, core stability' },
                { name: 'Floor Press', reps: '8-10', notes: 'Bench press from floor, tricep focus' },
                { name: 'Spoto Press', reps: '6-8', notes: 'Pause 1 inch above chest' },
                { name: 'Board Press', reps: '6-8', notes: 'Partial ROM overload' },
                { name: 'Reverse Grip Bench Press', reps: '8-10', notes: 'Upper chest and triceps' },
                { name: 'Landmine Press', reps: '10-12', notes: 'Single arm, core engaged' },
                { name: 'Svend Press', reps: '15-20', notes: 'Plate squeeze press' },
                { name: 'Chaos Push-ups', reps: '10-12', notes: 'Hands on unstable surface/chains' },
                { name: 'Dead Bench Press', reps: '6-8', notes: 'Start from pins, no stretch reflex' },
                { name: 'Wide Grip Bench Press', reps: '8-10', notes: '2x shoulder width grip' },
                { name: 'Deficit Push-ups', reps: '12-15', notes: 'Hands on blocks for deeper stretch' },
                { name: 'Bench Press to Neck', reps: '10-12', notes: 'Upper chest isolation' },
                { name: 'Single Arm Cable Press', reps: '10-12 each', notes: 'Anti-rotation core work' },
                { name: 'Cable Crossovers', reps: '12-15', notes: 'Wide arc, full stretch' },
                { name: 'Low Cable Crossovers', reps: '12-15', notes: 'Lower cables for upper chest' },
                { name: 'High Cable Crossovers', reps: '12-15', notes: 'Higher cables for lower chest' },
                { name: 'Plate Pinch Press', reps: '12-15', notes: 'Squeeze two plates together' },
                { name: 'Bamboo Bar Press', reps: '8-10', notes: 'Unstable bar with hanging weights' },
                { name: 'JM Press', reps: '8-10', notes: 'Hybrid bench/skullcrusher' },
                { name: 'Close Grip Spoto Press', reps: '8-10', notes: 'Pause just above chest' },
                { name: 'Feet-Up Incline Press', reps: '8-10', notes: 'Core stability challenge' },
                { name: 'Chain Flyes', reps: '12-15', notes: 'Accommodating resistance' }
            ],
            home: [
                { name: 'Archer Push-ups', reps: '8-10 each', notes: 'Single arm emphasis' },
                { name: 'Pseudo Planche Push-ups', reps: '8-12', notes: 'Lean forward, advanced' },
                { name: 'Typewriter Push-ups', reps: '10-12', notes: 'Side to side movement' },
                { name: 'Explosive Clap Push-ups', reps: '8-10', notes: 'Plyometric power' },
                { name: 'One Arm Push-ups', reps: '5-8 each', notes: 'Ultimate bodyweight chest' },
                { name: 'Superman Push-ups', reps: '6-8', notes: 'Explosive full extension' },
                { name: 'Hindu Push-ups', reps: '12-15', notes: 'Dive bomber style' },
                { name: 'Lalanne Push-ups', reps: '10-12', notes: 'Fingertip push-ups' },
                { name: 'Ring Push-ups', reps: '10-12', notes: 'If you have gymnastics rings' },
                { name: 'Deficit Archer Push-ups', reps: '6-8 each', notes: 'Hands elevated on books' },
                { name: 'Spiderman Push-ups', reps: '10-12', notes: 'Knee to elbow each rep' },
                { name: 'Around the World Push-ups', reps: '8-10', notes: 'Circular hand movement' },
                { name: 'Pike Push-ups to Pseudo Planche', reps: '8-10', notes: 'Combo movement' },
                { name: 'Resistance Band Chaos Press', reps: '12-15', notes: 'Band wrapped around back' }
            ],
            hotel: [
                { name: 'Single Arm Dumbbell Press', reps: '8-10 each', notes: 'Core anti-rotation' },
                { name: 'Dumbbell Floor Press (Feet Up)', reps: '8-10', notes: 'Core stability challenge' },
                { name: 'Chaos Push-ups on Dumbbells', reps: '10-12', notes: 'Hands on DB handles' },
                { name: 'Offset Dumbbell Press', reps: '8-10', notes: 'One heavy, one light DB' },
                { name: 'Dumbbell Squeeze Press', reps: '12-15', notes: 'DBs pressed together' },
                { name: 'Hex Press', reps: '12-15', notes: 'Palms facing, DBs touching' },
                { name: '1.5 Rep Dumbbell Press', reps: '10-12', notes: 'Full, half, full = 1 rep' },
                { name: 'Eccentric Focus DB Press', reps: '6-8', notes: '5 second negative' }
            ],
            park: [
                { name: 'Plyo Push-ups to Bench', reps: '8-10', notes: 'Explosive up to bench' },
                { name: 'Bench Archer Push-ups', reps: '8-10 each', notes: 'Hands on bench' },
                { name: 'Decline Clap Push-ups', reps: '8-10', notes: 'Feet on bench, explosive' },
                { name: 'Around the World Push-ups', reps: '8-10', notes: 'Circular pattern' },
                { name: 'Typewriter Push-ups (Elevated)', reps: '10-12', notes: 'Hands on bench' },
                { name: 'Single Leg Push-ups', reps: '10-12', notes: 'One leg raised' }
            ]
        }
    },

    // ========== BACK EXERCISES ==========
    back: {
        routine: {
            gym: [
                { name: 'Barbell Rows', reps: '8-10', notes: 'Classic back builder' },
                { name: 'Deadlifts', reps: '6-8', notes: 'Full posterior chain' },
                { name: 'Lat Pulldowns', reps: '10-12', notes: 'Lat width builder' },
                { name: 'Pull-ups', reps: '8-12', notes: 'Best bodyweight back exercise' },
                { name: 'Seated Cable Rows', reps: '10-12', notes: 'Mid-back thickness' },
                { name: 'T-Bar Rows', reps: '10-12', notes: 'Thickness builder' },
                { name: 'Dumbbell Rows', reps: '10-12', notes: 'Unilateral work' },
                { name: 'Face Pulls', reps: '15-20', notes: 'Rear delts and upper back' },
                { name: 'Straight Arm Pulldowns', reps: '12-15', notes: 'Lat isolation' },
                { name: 'Hyperextensions', reps: '12-15', notes: 'Lower back' }
            ],
            home: [
                { name: 'Pull-ups (if bar available)', reps: '8-12', notes: 'Best back exercise' },
                { name: 'Inverted Rows', reps: '12-15', notes: 'Under table/bar' },
                { name: 'Superman Holds', reps: '30-45 sec', notes: 'Lower back endurance' },
                { name: 'Dumbbell Rows', reps: '10-12', notes: 'If you have DBs' },
                { name: 'Resistance Band Rows', reps: '15-20', notes: 'If you have bands' },
                { name: 'Reverse Snow Angels', reps: '12-15', notes: 'Upper back activation' }
            ],
            hotel: [
                { name: 'Dumbbell Rows', reps: '10-12', notes: 'Single arm work' },
                { name: 'Lat Pulldowns', reps: '10-12', notes: 'If machine available' },
                { name: 'Cable Rows', reps: '10-12', notes: 'If cable machine available' },
                { name: 'Inverted Rows', reps: '12-15', notes: 'Use desk/table' },
                { name: 'Superman Holds', reps: '30-45 sec', notes: 'Floor work' }
            ],
            park: [
                { name: 'Pull-ups', reps: '8-12', notes: 'Use bar/branch' },
                { name: 'Inverted Rows', reps: '12-15', notes: 'Under park equipment' },
                { name: 'Australian Pull-ups', reps: '12-15', notes: 'Low bar rows' },
                { name: 'Horizontal Rope Climbs', reps: '5-8', notes: 'If rope available' }
            ]
        },
        unique: {
            gym: [
                { name: 'Meadows Rows', reps: '10-12', notes: 'Landmine single arm row, lat focus' },
                { name: 'Pendlay Rows', reps: '6-8', notes: 'Dead stop rows from floor' },
                { name: 'Seal Rows', reps: '10-12', notes: 'Chest supported, no cheating' },
                { name: 'Kelso Shrugs', reps: '12-15', notes: 'Incline bench shrugs for upper back' },
                { name: 'Snatch Grip Deadlifts', reps: '6-8', notes: 'Wide grip, upper back emphasis' },
                { name: 'Deficit Deadlifts', reps: '6-8', notes: 'Standing on plates/platform' },
                { name: 'Romanian Deadlifts (Paused)', reps: '8-10', notes: '2 second pause at bottom' },
                { name: 'Chest Supported Y-Raises', reps: '12-15', notes: 'Upper back isolation' },
                { name: 'Batwing Rows', reps: '8-10', notes: 'Hold at top for 5 seconds' },
                { name: 'Gorilla Rows', reps: '10-12', notes: 'Alternating DB rows in plank' },
                { name: 'Dead Stop Cable Rows', reps: '10-12', notes: 'Reset plates each rep' },
                { name: 'Wide Grip Barbell Rows', reps: '8-10', notes: 'Snatch grip width' },
                { name: 'Helms Rows', reps: '10-12', notes: 'Incline bench DB rows' },
                { name: 'Trap Bar Deadlifts', reps: '8-10', notes: 'Hex bar variation' },
                { name: 'Jefferson Deadlifts', reps: '8-10', notes: 'Straddling bar deadlift' },
                { name: 'Band Resisted Pull-ups', reps: '8-10', notes: 'Band around waist for resistance' },
                { name: 'Chaos Pull-ups', reps: '6-8', notes: 'Pull-ups with unstable grip' },
                { name: 'Sternum Pull-ups', reps: '6-8', notes: 'Pull chest to bar' },
                { name: 'L-Sit Pull-ups', reps: '6-8', notes: 'Legs extended during pull-up' },
                { name: 'Kroc Rows', reps: '15-20', notes: 'Heavy DB rows with body english' }
            ],
            home: [
                { name: 'Archer Pull-ups', reps: '6-8 each', notes: 'One arm emphasis' },
                { name: 'Typewriter Pull-ups', reps: '8-10', notes: 'Side to side at top' },
                { name: 'L-Sit Pull-ups', reps: '6-8', notes: 'Legs straight out' },
                { name: 'Commando Pull-ups', reps: '8-10', notes: 'Parallel grip alternating sides' },
                { name: 'Eccentric One Arm Pull-ups', reps: '3-5 each', notes: 'Negative only' },
                { name: 'Towel Pull-ups', reps: '8-10', notes: 'Hang towels over bar' },
                { name: 'Wide Grip Inverted Rows', reps: '12-15', notes: 'Under table, wide grip' },
                { name: 'Feet Elevated Inverted Rows', reps: '10-12', notes: 'More horizontal' },
                { name: 'Single Arm Inverted Rows', reps: '8-10 each', notes: 'Advanced variation' },
                { name: 'YTW Floor Raises', reps: '12-15', notes: 'Upper back activation' }
            ],
            hotel: [
                { name: 'Kroc Rows', reps: '15-20', notes: 'Heavy DB with momentum' },
                { name: 'Dead Stop DB Rows', reps: '10-12', notes: 'Set DB down each rep' },
                { name: 'Gorilla Rows', reps: '10-12', notes: 'Alternating in plank position' },
                { name: 'Single Arm DB Deadlifts', reps: '10-12', notes: 'One DB in one hand' },
                { name: 'Renegade Rows', reps: '10-12', notes: 'Plank position DB rows' },
                { name: 'Offset Inverted Rows', reps: '10-12', notes: 'One hand higher than other' }
            ],
            park: [
                { name: 'Mixed Grip Pull-ups', reps: '8-10', notes: 'One over, one under' },
                { name: 'Around the World Pull-ups', reps: '6-8', notes: 'Circular path' },
                { name: 'Clapping Pull-ups', reps: '5-8', notes: 'Explosive release and clap' },
                { name: 'Muscle-ups', reps: '5-8', notes: 'Pull-up transition to dip' },
                { name: 'Skin the Cat', reps: '5-8', notes: 'Gymnastics back extension' }
            ]
        }
    },

    // ========== SHOULDERS EXERCISES ==========
    shoulders: {
        routine: {
            gym: [
                { name: 'Overhead Press', reps: '8-10', notes: 'Classic shoulder builder' },
                { name: 'Dumbbell Shoulder Press', reps: '10-12', notes: 'Greater ROM' },
                { name: 'Lateral Raises', reps: '12-15', notes: 'Side delt isolation' },
                { name: 'Front Raises', reps: '12-15', notes: 'Front delt isolation' },
                { name: 'Rear Delt Flyes', reps: '12-15', notes: 'Rear delt isolation' },
                { name: 'Arnold Press', reps: '10-12', notes: 'All three heads' },
                { name: 'Cable Lateral Raises', reps: '12-15', notes: 'Constant tension' },
                { name: 'Face Pulls', reps: '15-20', notes: 'Rear delts and rotator cuff' },
                { name: 'Upright Rows', reps: '10-12', notes: 'Overall shoulder mass' },
                { name: 'Machine Shoulder Press', reps: '10-12', notes: 'Controlled movement' }
            ],
            home: [
                { name: 'Pike Push-ups', reps: '12-15', notes: 'Shoulder emphasis' },
                { name: 'Handstand Push-ups', reps: '5-10', notes: 'Advanced shoulder work' },
                { name: 'Dumbbell Shoulder Press', reps: '10-12', notes: 'If you have DBs' },
                { name: 'Dumbbell Lateral Raises', reps: '12-15', notes: 'If you have DBs' },
                { name: 'Resistance Band Shoulder Press', reps: '15-20', notes: 'If you have bands' },
                { name: 'Plank to Down Dog', reps: '12-15', notes: 'Shoulder mobility' }
            ],
            hotel: [
                { name: 'Dumbbell Shoulder Press', reps: '10-12', notes: 'Seated or standing' },
                { name: 'Dumbbell Lateral Raises', reps: '12-15', notes: 'Side delts' },
                { name: 'Dumbbell Front Raises', reps: '12-15', notes: 'Front delts' },
                { name: 'Pike Push-ups', reps: '12-15', notes: 'Bodyweight option' },
                { name: 'Arnold Press', reps: '10-12', notes: 'All three heads' }
            ],
            park: [
                { name: 'Pike Push-ups', reps: '12-15', notes: 'Feet elevated on bench' },
                { name: 'Handstand Hold', reps: '30-60 sec', notes: 'Against tree/wall' },
                { name: 'Handstand Push-ups', reps: '5-10', notes: 'Against tree/wall' },
                { name: 'Decline Pike Push-ups', reps: '10-12', notes: 'Feet on bench' }
            ]
        },
        unique: {
            gym: [
                { name: 'Viking Press', reps: '8-10', notes: 'Landmine two-handed press' },
                { name: 'Sots Press', reps: '6-8', notes: 'Overhead press from bottom of squat' },
                { name: 'Bradford Press', reps: '10-12', notes: 'Front to back of head press' },
                { name: 'Z Press', reps: '8-10', notes: 'Seated on floor, legs straight' },
                { name: 'Javelin Press', reps: '10-12 each', notes: 'Single arm landmine press' },
                { name: 'Circus Dumbbell Press', reps: '6-8 each', notes: 'Single heavy DB pressed overhead' },
                { name: 'Button Ups', reps: '8-10', notes: 'DB clean to press in one motion' },
                { name: 'Klokov Press', reps: '8-10', notes: 'Behind neck press with snatch grip' },
                { name: 'Snatch Grip High Pulls', reps: '8-10', notes: 'Wide grip explosive pull' },
                { name: 'Lu Raises', reps: '10-12', notes: 'Front raise to overhead press' },
                { name: 'Chaos Lateral Raises', reps: '12-15', notes: 'Cable with unstable attachment' },
                { name: 'Six Ways', reps: '6 each way', notes: 'Front, side, rear raise combo' },
                { name: 'Cuban Press', reps: '10-12', notes: 'Upright row to external rotation to press' },
                { name: 'Landmine Rainbow', reps: '10-12 each', notes: 'Arc from hip to hip overhead' },
                { name: 'Waiter Carry', reps: '30-60 sec', notes: 'Single DB overhead walk' },
                { name: 'Seated Behind Neck Press', reps: '8-10', notes: 'Old school mass builder' },
                { name: 'Push Press', reps: '6-8', notes: 'Explosive leg drive into press' },
                { name: 'Single Arm Landmine Press', reps: '10-12', notes: 'Anti-rotation core work' },
                { name: 'Y-Raises on Incline Bench', reps: '12-15', notes: 'Upper back and rear delts' }
            ],
            home: [
                { name: 'Handstand Wall Walks', reps: '5-8', notes: 'Walk up wall to handstand' },
                { name: 'Freestanding Handstand Hold', reps: '30-60 sec', notes: 'Balance challenge' },
                { name: 'Deficit Pike Push-ups', reps: '10-12', notes: 'Hands on books/blocks' },
                { name: 'Pike Press to Handstand', reps: '8-10', notes: 'Press into handstand position' },
                { name: 'Crucifix Push-ups', reps: '8-10', notes: 'Wide arm position' },
                { name: 'Wall Handstand Push-ups (Deficit)', reps: '6-8', notes: 'Hands on parallettes/blocks' },
                { name: '90 Degree Hold', reps: '20-40 sec', notes: 'Body horizontal against wall' },
                { name: 'Typewriter Pike Push-ups', reps: '10-12', notes: 'Side to side movement' }
            ],
            hotel: [
                { name: 'Z Press with Dumbbells', reps: '8-10', notes: 'Seated on floor' },
                { name: 'Single Arm DB Press', reps: '10-12 each', notes: 'Core stability' },
                { name: '1.5 Rep Shoulder Press', reps: '10-12', notes: 'Full, half, full = 1 rep' },
                { name: 'Tempo Lateral Raises', reps: '10-12', notes: '3 second up, 3 second down' },
                { name: 'Offset Shoulder Press', reps: '10-12', notes: 'One heavy, one light DB' },
                { name: 'Cuban Press with DBs', reps: '10-12', notes: 'Complex movement pattern' }
            ],
            park: [
                { name: 'Handstand Push-ups on Bars', reps: '6-8', notes: 'Parallel bars' },
                { name: 'Wall Walks', reps: '5-8', notes: 'Walk feet up wall to handstand' },
                { name: 'L-Sit to Handstand', reps: '5-8', notes: 'Press from L-sit' },
                { name: 'Elevated Pike Push-ups', reps: '12-15', notes: 'Hands and feet elevated' },
                { name: 'Hindu Push-up Pike Combo', reps: '10-12', notes: 'Dive bomber variation' }
            ]
        }
    },

    // ========== ARMS EXERCISES ==========
    arms: {
        routine: {
            gym: [
                { name: 'Barbell Curls', reps: '10-12', notes: 'Classic bicep builder' },
                { name: 'Dumbbell Curls', reps: '10-12', notes: 'Alternating or together' },
                { name: 'Hammer Curls', reps: '10-12', notes: 'Brachialis focus' },
                { name: 'Preacher Curls', reps: '10-12', notes: 'Bicep isolation' },
                { name: 'Tricep Pushdowns', reps: '12-15', notes: 'Cable tricep extension' },
                { name: 'Overhead Tricep Extension', reps: '10-12', notes: 'Long head emphasis' },
                { name: 'Skull Crushers', reps: '10-12', notes: 'Lying tricep extension' },
                { name: 'Close Grip Bench Press', reps: '8-10', notes: 'Compound tricep work' },
                { name: 'Cable Curls', reps: '12-15', notes: 'Constant tension' },
                { name: 'Dips', reps: '10-12', notes: 'Tricep and chest' }
            ],
            home: [
                { name: 'Diamond Push-ups', reps: '12-15', notes: 'Tricep emphasis' },
                { name: 'Dumbbell Curls', reps: '10-12', notes: 'If you have DBs' },
                { name: 'Hammer Curls', reps: '10-12', notes: 'If you have DBs' },
                { name: 'Tricep Dips (Chair)', reps: '12-15', notes: 'Use chair/couch' },
                { name: 'Resistance Band Curls', reps: '15-20', notes: 'If you have bands' },
                { name: 'Close Grip Push-ups', reps: '12-15', notes: 'Tricep focus' }
            ],
            hotel: [
                { name: 'Dumbbell Curls', reps: '10-12', notes: 'Seated or standing' },
                { name: 'Hammer Curls', reps: '10-12', notes: 'Forearms and biceps' },
                { name: 'Overhead Tricep Extension', reps: '10-12', notes: 'Two hands on one DB' },
                { name: 'Tricep Kickbacks', reps: '12-15', notes: 'DB kickbacks' },
                { name: 'Diamond Push-ups', reps: '12-15', notes: 'Bodyweight triceps' }
            ],
            park: [
                { name: 'Close Grip Push-ups', reps: '12-15', notes: 'Tricep emphasis' },
                { name: 'Diamond Push-ups', reps: '12-15', notes: 'Maximum tricep activation' },
                { name: 'Bench Dips', reps: '15-20', notes: 'Use park bench' },
                { name: 'Chin-ups', reps: '8-12', notes: 'Bicep focus' },
                { name: 'Pull-up Hold', reps: '30-45 sec', notes: 'Isometric bicep work' }
            ]
        },
        unique: {
            gym: [
                { name: 'JM Press', reps: '8-10', notes: 'Hybrid skull crusher/close grip bench' },
                { name: 'Tate Press', reps: '10-12', notes: 'DB elbows out tricep isolation' },
                { name: 'California Press', reps: '8-10', notes: 'Angled bar path skull crusher' },
                { name: 'Drag Curls', reps: '10-12', notes: 'Drag bar up torso' },
                { name: 'Spider Curls', reps: '10-12', notes: 'Chest on incline bench, arms hanging' },
                { name: 'Waiter Curls', reps: '12-15', notes: 'Hold DB like waiter, curl up' },
                { name: 'Bayesian Curls', reps: '10-12', notes: 'Cable behind body curls' },
                { name: 'Meadows Curls', reps: '10-12', notes: 'Landmine single arm curls' },
                { name: 'Rolling Tricep Extensions', reps: '10-12', notes: 'Roll bar back over head' },
                { name: 'Chaos Curls', reps: '10-12', notes: 'Hanging weights on bands' },
                { name: 'Zottman Curls', reps: '10-12', notes: 'Curl up supinated, down pronated' },
                { name: '21s', reps: '7+7+7', notes: 'Bottom half, top half, full ROM' },
                { name: 'Incline Dumbbell Curls', reps: '10-12', notes: 'Long head stretch' },
                { name: 'Reverse Curl to Overhead Extension', reps: '10-12', notes: 'Combo movement' },
                { name: 'Bottoms Up Kettlebell Press', reps: '8-10 each', notes: 'Grip and stability' },
                { name: 'Band Resisted Dips', reps: '10-12', notes: 'Band around waist' },
                { name: 'Chest Supported Curls', reps: '10-12', notes: 'Incline bench, no momentum' },
                { name: 'Single Arm Overhead Cable Extension', reps: '12-15 each', notes: 'Long head focus' }
            ],
            home: [
                { name: 'Typewriter Push-ups', reps: '10-12', notes: 'Side to side tricep work' },
                { name: 'Pelican Curls', reps: '8-10', notes: 'Rings/suspension trainer curls' },
                { name: 'Ring Dips', reps: '8-10', notes: 'If you have rings' },
                { name: 'Eccentric One Arm Chin-ups', reps: '3-5 each', notes: 'Negative only bicep' },
                { name: 'Sliding Tricep Extensions', reps: '10-12', notes: 'Hands on towels/sliders' },
                { name: 'Isometric Holds (Various Angles)', reps: '20-30 sec', notes: 'DB curls at different positions' },
                { name: 'Bodyweight Skull Crushers', reps: '12-15', notes: 'Hands on wall/elevated surface' }
            ],
            hotel: [
                { name: 'Zottman Curls', reps: '10-12', notes: 'Rotation during movement' },
                { name: 'Offset Curls', reps: '10-12', notes: 'One heavy DB, one light' },
                { name: '1.5 Rep Curls', reps: '10-12', notes: 'Full, half, full = 1 rep' },
                { name: 'Cross Body Hammer Curls', reps: '10-12 each', notes: 'Curl across body' },
                { name: 'Tate Press', reps: '10-12', notes: 'Unique tricep angle' },
                { name: 'Single Arm Overhead Extension', reps: '10-12 each', notes: 'Core anti-rotation' }
            ],
            park: [
                { name: 'L-Sit Chin-ups', reps: '6-8', notes: 'Legs extended, bicep focus' },
                { name: 'Commando Pull-ups', reps: '8-10', notes: 'Parallel grip, bicep emphasis' },
                { name: 'Pelican Push-ups', reps: '6-8', notes: 'On bars, extreme tricep stretch' },
                { name: 'Typewriter Push-ups on Bars', reps: '10-12', notes: 'Side to side' },
                { name: 'Muscle-up Negatives', reps: '5-8', notes: 'Eccentric arm work' }
            ]
        }
    },

    // ========== LEGS EXERCISES ==========
    legs: {
        routine: {
            gym: [
                { name: 'Back Squats', reps: '8-10', notes: 'King of leg exercises' },
                { name: 'Front Squats', reps: '8-10', notes: 'Quad emphasis' },
                { name: 'Leg Press', reps: '10-12', notes: 'Overall leg mass' },
                { name: 'Romanian Deadlifts', reps: '10-12', notes: 'Hamstring focus' },
                { name: 'Leg Curls', reps: '12-15', notes: 'Hamstring isolation' },
                { name: 'Leg Extensions', reps: '12-15', notes: 'Quad isolation' },
                { name: 'Walking Lunges', reps: '12-15 each', notes: 'Functional leg work' },
                { name: 'Bulgarian Split Squats', reps: '10-12 each', notes: 'Single leg quad/glute' },
                { name: 'Calf Raises', reps: '15-20', notes: 'Calf development' },
                { name: 'Hack Squats', reps: '10-12', notes: 'Quad emphasis' }
            ],
            home: [
                { name: 'Bodyweight Squats', reps: '20-25', notes: 'Basic leg work' },
                { name: 'Jump Squats', reps: '15-20', notes: 'Explosive power' },
                { name: 'Lunges', reps: '12-15 each', notes: 'Walking or stationary' },
                { name: 'Bulgarian Split Squats', reps: '12-15 each', notes: 'Back foot elevated' },
                { name: 'Single Leg Deadlifts', reps: '10-12 each', notes: 'Balance and hamstrings' },
                { name: 'Glute Bridges', reps: '15-20', notes: 'Glute activation' },
                { name: 'Wall Sits', reps: '45-60 sec', notes: 'Isometric quad work' },
                { name: 'Calf Raises', reps: '20-25', notes: 'Standing on step' }
            ],
            hotel: [
                { name: 'Goblet Squats', reps: '12-15', notes: 'DB held at chest' },
                { name: 'Dumbbell Lunges', reps: '12-15 each', notes: 'Walking or stationary' },
                { name: 'Romanian Deadlifts', reps: '10-12', notes: 'DB RDLs' },
                { name: 'Bulgarian Split Squats', reps: '10-12 each', notes: 'With DBs' },
                { name: 'Single Leg Deadlifts', reps: '10-12 each', notes: 'DB in one hand' }
            ],
            park: [
                { name: 'Jump Squats', reps: '15-20', notes: 'Explosive bodyweight' },
                { name: 'Walking Lunges', reps: '15-20 each', notes: 'Long path' },
                { name: 'Step-ups', reps: '12-15 each', notes: 'Use park bench' },
                { name: 'Bulgarian Split Squats', reps: '12-15 each', notes: 'Back foot on bench' },
                { name: 'Single Leg Squats (Pistols)', reps: '6-10 each', notes: 'Advanced movement' }
            ]
        },
        unique: {
            gym: [
                { name: 'Hatfield Squats', reps: '8-10', notes: 'Safety bar, hands free to support' },
                { name: 'Anderson Squats', reps: '6-8', notes: 'Start from pins in squat rack' },
                { name: 'Pin Squats', reps: '6-8', notes: 'Pause on pins at bottom' },
                { name: 'Zercher Squats', reps: '8-10', notes: 'Bar in elbow crooks' },
                { name: 'Cyclist Squats', reps: '10-12', notes: 'Heels elevated, upright torso' },
                { name: 'Hatfield Goodmornings', reps: '10-12', notes: 'Safety bar good mornings' },
                { name: '1.5 Rep Squats', reps: '8-10', notes: 'Full, half, full = 1 rep' },
                { name: 'Paused Squats', reps: '6-8', notes: '3 second pause at bottom' },
                { name: 'Tempo Squats', reps: '6-8', notes: '5 second eccentric' },
                { name: 'Box Squats (Dead Stop)', reps: '6-8', notes: 'Sit fully on box, reset' },
                { name: 'Spanish Squats', reps: '15-20', notes: 'Band behind knees pushing forward' },
                { name: 'Nordic Hamstring Curls', reps: '6-8', notes: 'Eccentric hamstring destroyer' },
                { name: 'Landmine Belt Squats', reps: '12-15', notes: 'Dip belt attached to landmine' },
                { name: 'Sissy Squats', reps: '10-12', notes: 'Quad isolation, lean back' },
                { name: 'Peterson Step-ups', reps: '10-12 each', notes: 'Knee over toe emphasis' },
                { name: 'Poliquin Step-ups', reps: '10-12 each', notes: 'Eccentric emphasis, slow down' },
                { name: 'Reverse Nordics', reps: '8-10', notes: 'Quad eccentric, lean back' },
                { name: 'Leg Press (1.5 Reps)', reps: '12-15', notes: 'Full, half, full = 1 rep' },
                { name: 'Single Leg Romanian Deadlifts (Kickstand)', reps: '10-12 each', notes: 'Back toe touches ground' },
                { name: 'Trap Bar Jump Squats', reps: '6-8', notes: 'Explosive power' }
            ],
            home: [
                { name: 'Pistol Squats', reps: '6-10 each', notes: 'Single leg to ground' },
                { name: 'Shrimp Squats', reps: '8-12 each', notes: 'Back foot held behind' },
                { name: 'Sissy Squats', reps: '10-12', notes: 'Lean back, quad isolation' },
                { name: 'Nordic Hamstring Curls', reps: '5-8', notes: 'Hook feet under couch' },
                { name: 'Reverse Nordics', reps: '8-10', notes: 'Kneel, lean back' },
                { name: 'Spanish Squats (Band)', reps: '15-20', notes: 'Band behind knees' },
                { name: 'Heel Elevated Goblet Squats', reps: '12-15', notes: 'Books under heels' },
                { name: 'ATG Split Squats', reps: '10-12 each', notes: 'Ass to grass split squat' },
                { name: 'Skater Squats', reps: '8-10 each', notes: 'Single leg, back foot hovering' },
                { name: 'Cossack Squats', reps: '10-12 each', notes: 'Side to side squat' },
                { name: 'Sliding Leg Curls', reps: '12-15', notes: 'Feet on towels, bridge and curl' }
            ],
            hotel: [
                { name: 'Zercher Squats', reps: '8-10', notes: 'DB or weight held in elbows' },
                { name: 'Tempo Goblet Squats', reps: '10-12', notes: '5 second down' },
                { name: 'Pause Goblet Squats', reps: '10-12', notes: '3 second hold at bottom' },
                { name: '1.5 Rep Bulgarian Split Squats', reps: '10-12 each', notes: 'Down, half up, down, full up' },
                { name: 'Single Leg RDL (Contralateral)', reps: '10-12 each', notes: 'DB in opposite hand' },
                { name: 'Cyclist Squats', reps: '12-15', notes: 'Heels on plates, DB goblet style' }
            ],
            park: [
                { name: 'Pistol Squats', reps: '6-10 each', notes: 'Use tree/pole for balance' },
                { name: 'Shrimp Squats', reps: '8-12 each', notes: 'Advanced single leg' },
                { name: 'Jump Lunges', reps: '12-15', notes: 'Explosive switch legs' },
                { name: 'Box Jump Squats', reps: '8-10', notes: 'Jump to bench, squat on landing' },
                { name: 'Cossack Squats', reps: '10-12 each', notes: 'Wide stance, shift side to side' },
                { name: 'Skater Squats', reps: '8-10 each', notes: 'Single leg squat pattern' }
            ]
        }
    },

    // ========== CORE EXERCISES ==========
    core: {
        routine: {
            gym: [
                { name: 'Planks', reps: '45-60 sec', notes: 'Core stability' },
                { name: 'Ab Wheel Rollouts', reps: '12-15', notes: 'Core strength' },
                { name: 'Cable Crunches', reps: '15-20', notes: 'Weighted ab work' },
                { name: 'Hanging Leg Raises', reps: '12-15', notes: 'Lower abs' },
                { name: 'Russian Twists', reps: '20-30', notes: 'Obliques' },
                { name: 'Dead Bugs', reps: '15-20', notes: 'Core stability' },
                { name: 'Bicycle Crunches', reps: '20-30', notes: 'Overall core' },
                { name: 'Side Planks', reps: '30-45 sec each', notes: 'Oblique stability' },
                { name: 'Mountain Climbers', reps: '30-40', notes: 'Dynamic core' },
                { name: 'Pallof Press', reps: '12-15 each', notes: 'Anti-rotation' }
            ],
            home: [
                { name: 'Planks', reps: '45-60 sec', notes: 'Front plank hold' },
                { name: 'Side Planks', reps: '30-45 sec each', notes: 'Oblique work' },
                { name: 'Dead Bugs', reps: '15-20', notes: 'Lower back friendly' },
                { name: 'Bicycle Crunches', reps: '20-30', notes: 'Obliques and abs' },
                { name: 'Leg Raises', reps: '12-15', notes: 'Lower abs' },
                { name: 'Mountain Climbers', reps: '30-40', notes: 'Cardio and core' },
                { name: 'Russian Twists', reps: '20-30', notes: 'Obliques' },
                { name: 'Hollow Body Hold', reps: '30-45 sec', notes: 'Gymnastics core' }
            ],
            hotel: [
                { name: 'Planks', reps: '45-60 sec', notes: 'Standard plank' },
                { name: 'Ab Wheel Rollouts', reps: '12-15', notes: 'If wheel available' },
                { name: 'Dead Bugs', reps: '15-20', notes: 'Floor work' },
                { name: 'Russian Twists with DB', reps: '20-30', notes: 'Weighted obliques' },
                { name: 'Mountain Climbers', reps: '30-40', notes: 'Dynamic core' }
            ],
            park: [
                { name: 'Hanging Leg Raises', reps: '12-15', notes: 'Pull-up bar' },
                { name: 'Hanging Knee Raises', reps: '15-20', notes: 'Lower abs' },
                { name: 'L-Sit Holds', reps: '20-30 sec', notes: 'On bars' },
                { name: 'Windshield Wipers', reps: '10-12', notes: 'Hanging oblique work' },
                { name: 'Dragon Flags', reps: '6-8', notes: 'Advanced core on bench' }
            ]
        },
        unique: {
            gym: [
                { name: 'Ab Wheel from Feet', reps: '8-10', notes: 'Advanced rollout' },
                { name: 'Dragon Flags', reps: '6-8', notes: 'Bruce Lee core' },
                { name: 'Pallof Press (Anti-Rotation)', reps: '12-15 each', notes: 'Cable resistance' },
                { name: 'Landmine Rainbows', reps: '12-15', notes: 'Barbell side to side' },
                { name: 'Turkish Get-ups', reps: '5-8 each', notes: 'Full body core stability' },
                { name: 'Chaos Planks', reps: '30-45 sec', notes: 'Hands on unstable surface' },
                { name: 'Dead Bug with Band', reps: '15-20', notes: 'Band resistance' },
                { name: 'Suitcase Carries', reps: '40-60 sec each', notes: 'Anti-lateral flexion' },
                { name: 'Bird Dogs with Band', reps: '12-15 each', notes: 'Resistance added' },
                { name: 'Garhammer Raises', reps: '10-12', notes: 'Hanging straight leg raises' },
                { name: 'Weighted Hollow Rocks', reps: '15-20', notes: 'Holding plate overhead' },
                { name: 'Copenhagen Planks', reps: '20-30 sec each', notes: 'Adductor plank' },
                { name: 'Single Arm Farmers Walks', reps: '40-60 sec each', notes: 'Heavy DB/KB' },
                { name: 'Barbell Rollouts', reps: '10-12', notes: 'Barbell instead of ab wheel' },
                { name: 'L-Sit to Tuck', reps: '10-12', notes: 'Extending and tucking legs' }
            ],
            home: [
                { name: 'Ab Wheel from Feet', reps: '8-10', notes: 'If you have wheel' },
                { name: 'Dragon Flags', reps: '6-8', notes: 'On bench/couch' },
                { name: 'Hollow Body Rocks', reps: '15-20', notes: 'Rocking motion' },
                { name: 'V-Ups', reps: '12-15', notes: 'Touch toes to hands' },
                { name: 'Copenhagen Planks', reps: '20-30 sec each', notes: 'Side lying on couch' },
                { name: 'Windshield Wipers (Floor)', reps: '10-12', notes: 'Lying on back' },
                { name: 'Bear Crawls', reps: '30-45 sec', notes: 'Quadruped crawling' },
                { name: 'Dead Bug with Towel Pull', reps: '15-20', notes: 'Pull towel between hands' },
                { name: 'L-Sit Progressions', reps: '20-30 sec', notes: 'On floor or parallettes' }
            ],
            hotel: [
                { name: 'Turkish Get-ups', reps: '5-8 each', notes: 'With DB' },
                { name: 'Suitcase Carries', reps: '40-60 sec each', notes: 'DB in one hand' },
                { name: 'Single Arm Overhead Carries', reps: '40-60 sec each', notes: 'DB overhead walk' },
                { name: 'Ab Wheel from Feet', reps: '8-10', notes: 'Advanced version' },
                { name: 'Weighted Dead Bugs', reps: '15-20', notes: 'Hold DB overhead' }
            ],
            park: [
                { name: 'Toes to Bar', reps: '10-12', notes: 'Strict form' },
                { name: 'Windshield Wipers (Hanging)', reps: '10-12', notes: 'Side to side leg swings' },
                { name: 'Human Flag Progression', reps: '10-20 sec', notes: 'On vertical pole' },
                { name: 'L-Sit Pull-ups', reps: '6-8', notes: 'Legs extended during pull-up' },
                { name: 'Front Lever Progressions', reps: '10-20 sec', notes: 'Horizontal body hold' },
                { name: 'Around the Worlds (Hanging)', reps: '8-10', notes: 'Circular leg movement' }
            ]
        }
    },

    // ========== CARDIO EXERCISES ==========
    cardio: {
        routine: {
            gym: [
                { name: 'Treadmill Running', reps: '20-30 min', notes: 'Steady state or intervals' },
                { name: 'Stationary Bike', reps: '20-30 min', notes: 'Low impact cardio' },
                { name: 'Rowing Machine', reps: '15-20 min', notes: 'Full body cardio' },
                { name: 'Elliptical', reps: '20-30 min', notes: 'Low impact' },
                { name: 'Stair Climber', reps: '15-20 min', notes: 'Leg cardio' },
                { name: 'Jump Rope', reps: '10-15 min', notes: 'High intensity' },
                { name: 'Battle Ropes', reps: '30 sec on/30 sec off x 10', notes: 'Upper body cardio' },
                { name: 'Burpees', reps: '15-20', notes: 'Full body' },
                { name: 'Box Jumps', reps: '15-20', notes: 'Explosive power' },
                { name: 'Assault Bike', reps: '15-20 min', notes: 'High intensity' }
            ],
            home: [
                { name: 'Jump Rope', reps: '10-15 min', notes: 'If you have rope' },
                { name: 'Burpees', reps: '15-20', notes: 'Full body cardio' },
                { name: 'High Knees', reps: '45 sec on/15 sec off x 10', notes: 'In place running' },
                { name: 'Mountain Climbers', reps: '45 sec on/15 sec off x 10', notes: 'Core and cardio' },
                { name: 'Jumping Jacks', reps: '60 sec on/30 sec off x 10', notes: 'Classic cardio' },
                { name: 'Shadow Boxing', reps: '15-20 min', notes: 'Boxing movements' }
            ],
            hotel: [
                { name: 'Treadmill Running', reps: '20-30 min', notes: 'If available' },
                { name: 'Stationary Bike', reps: '20-30 min', notes: 'If available' },
                { name: 'Burpees', reps: '15-20', notes: 'In room option' },
                { name: 'Jump Rope', reps: '10-15 min', notes: 'Portable option' },
                { name: 'High Knees', reps: '45 sec on/15 sec off x 10', notes: 'In room' }
            ],
            park: [
                { name: 'Running', reps: '20-40 min', notes: 'Outdoor running' },
                { name: 'Sprint Intervals', reps: '30 sec sprint/90 sec walk x 10', notes: 'High intensity' },
                { name: 'Hill Sprints', reps: '8-10 sprints', notes: 'Find a hill' },
                { name: 'Burpees', reps: '15-20', notes: 'Anywhere' },
                { name: 'Box Jumps (Bench)', reps: '15-20', notes: 'Use park bench' }
            ]
        },
        unique: {
            gym: [
                { name: 'Assault Bike Tabata', reps: '20 sec on/10 sec off x 8', notes: 'Max effort sprints' },
                { name: 'Rowing Machine 500m Sprints', reps: '5 rounds, 2 min rest', notes: 'All out effort' },
                { name: 'Sled Pushes', reps: '40 yards x 6', notes: 'Heavy and hard' },
                { name: 'Sled Drags', reps: '40 yards x 6', notes: 'Backward walking' },
                { name: 'Farmers Walk Sprints', reps: '40 yards x 6', notes: 'Heavy DBs/KBs' },
                { name: 'Ski Erg Intervals', reps: '45 sec on/15 sec off x 12', notes: 'Upper body cardio' },
                { name: 'Battle Rope EMOM', reps: 'Every minute for 10 min', notes: '30 sec max effort waves' },
                { name: 'VersaClimber', reps: '15-20 min', notes: 'Vertical climbing machine' },
                { name: 'Airdyne Bike Sprints', reps: '30 sec max/2 min easy x 8', notes: 'Classic torture' },
                { name: 'Prowler Pushes (Heavy)', reps: '20 yards x 10', notes: 'Leg burner' },
                { name: 'Complexes (Barbell)', reps: '6 reps each, 5 rounds', notes: 'Clean, front squat, press, back squat, good morning' },
                { name: 'Car Pushes', reps: '30 sec pushes x 6', notes: 'If space available' },
                { name: 'Medicine Ball Slams', reps: '30 sec on/30 sec off x 10', notes: 'Full body power' }
            ],
            home: [
                { name: 'Burpee Variations Complex', reps: '40 sec work/20 sec rest x 8', notes: 'Different burpee styles' },
                { name: 'EMOM Burpees', reps: 'Every minute for 15 min', notes: '10 burpees per minute' },
                { name: 'Stair Sprints', reps: '10-15 sprints', notes: 'If you have stairs' },
                { name: 'Jump Rope Double Unders', reps: '30 sec on/30 sec off x 10', notes: 'Advanced jump rope' },
                { name: 'Deck Squats', reps: '20-25', notes: 'Roll back, stand up, jump' },
                { name: 'Bear Crawls', reps: '45 sec on/15 sec off x 8', notes: 'Forward and backward' },
                { name: 'Broad Jumps', reps: '10-12 x 5 sets', notes: 'Explosive power' }
            ],
            hotel: [
                { name: 'Stair Sprints (Hotel Stairs)', reps: '10-15 flights', notes: 'Use emergency stairs' },
                { name: 'Burpee Ladder', reps: '1, 2, 3... up to 10', notes: 'Pyramid burpees' },
                { name: 'EMOM Complex', reps: 'Every minute for 12 min', notes: '5 burpees + 10 push-ups' },
                { name: 'Jump Rope Tabata', reps: '20 sec on/10 sec off x 8', notes: 'Max speed' }
            ],
            park: [
                { name: 'Hill Sprint Repeats', reps: '10-12 x 30 sec sprints', notes: 'Find steep hill' },
                { name: 'Park Bench Circuit', reps: '5 rounds', notes: 'Step-ups, dips, jumps, incline push-ups' },
                { name: 'Broad Jump + Sprint', reps: '10 rounds', notes: '3 broad jumps + 20 yard sprint' },
                { name: 'Bear Crawl Hills', reps: '6-8 climbs', notes: 'Crawl up hills' },
                { name: 'Playground Circuit', reps: '20 min continuous', notes: 'Use all equipment' }
            ]
        }
    },

    // ========== FULL BODY EXERCISES ==========
    'full-body': {
        routine: {
            gym: [
                { name: 'Deadlifts', reps: '6-8', notes: 'King of full body' },
                { name: 'Barbell Cleans', reps: '6-8', notes: 'Olympic lift' },
                { name: 'Thrusters', reps: '10-12', notes: 'Squat to overhead press' },
                { name: 'Barbell Complexes', reps: '6-8 each', notes: 'Multiple exercises in sequence' },
                { name: 'Turkish Get-ups', reps: '5-8 each', notes: 'Full body stability' },
                { name: 'Burpees', reps: '15-20', notes: 'Conditioning' },
                { name: 'Rowing Machine', reps: '500m x 5', notes: 'Full body cardio' },
                { name: 'Battle Ropes', reps: '30 sec on/30 sec off x 8', notes: 'Upper body cardio' },
                { name: 'Kettlebell Swings', reps: '20-25', notes: 'Hip power' },
                { name: 'Man Makers', reps: '10-12', notes: 'DB burpee to renegade row' }
            ],
            home: [
                { name: 'Burpees', reps: '15-20', notes: 'Full body conditioning' },
                { name: 'Turkish Get-ups', reps: '5-8 each', notes: 'If you have weight' },
                { name: 'Thrusters', reps: '10-12', notes: 'If you have DBs' },
                { name: 'Man Makers', reps: '10-12', notes: 'If you have DBs' },
                { name: 'Mountain Climbers', reps: '40-50', notes: 'Core and cardio' },
                { name: 'Jump Squats', reps: '15-20', notes: 'Lower body power' }
            ],
            hotel: [
                { name: 'Dumbbell Thrusters', reps: '10-12', notes: 'Squat to press' },
                { name: 'Turkish Get-ups', reps: '5-8 each', notes: 'With DB' },
                { name: 'Man Makers', reps: '10-12', notes: 'With DBs' },
                { name: 'Burpees', reps: '15-20', notes: 'Always available' },
                { name: 'Renegade Rows', reps: '12-15', notes: 'If you have DBs' }
            ],
            park: [
                { name: 'Burpees', reps: '15-20', notes: 'Classic full body' },
                { name: 'Muscle-ups', reps: '5-8', notes: 'Advanced gymnastics' },
                { name: 'Park Circuit', reps: '3-5 rounds', notes: 'Pull-ups, dips, squats, sprints' },
                { name: 'Bear Crawls', reps: '40-60 sec', notes: 'Full body movement' }
            ]
        },
        unique: {
            gym: [
                { name: 'Snatch (Barbell)', reps: '5-6', notes: 'Olympic lift, full body power' },
                { name: 'Clean & Jerk', reps: '5-6', notes: 'Olympic lift' },
                { name: 'Complexes (Death by)', reps: '5 rounds', notes: 'Clean, front squat, push press, back squat, RDL' },
                { name: 'Bear Complex', reps: '5 rounds', notes: 'Power clean, front squat, push press, back squat, push press' },
                { name: 'Turkish Get-up to Windmill', reps: '5-8 each', notes: 'Advanced variation' },
                { name: 'Hang Snatch High Pulls', reps: '8-10', notes: 'Explosive triple extension' },
                { name: 'Dumbbell Complex (Waterbury)', reps: '8 reps each x 4 rounds', notes: 'Curl, clean, press, squat, RDL' },
                { name: 'Barbell Waterbury Complex', reps: '6 reps each x 5 rounds', notes: 'RDL, row, power clean, front squat, press' },
                { name: 'Circus Dumbbell Clean & Press', reps: '6-8 each', notes: 'Single heavy DB' },
                { name: 'Axle Bar Deadlifts', reps: '6-8', notes: 'Thick bar for grip' },
                { name: 'Zercher Carries', reps: '40-60 sec', notes: 'Barbell in elbow crooks, walk' },
                { name: 'Sandbag Over Shoulder', reps: '10-12', notes: 'Pick up and toss over shoulder' },
                { name: 'Atlas Stone Lifts', reps: '6-8', notes: 'If strongman equipment available' },
                { name: 'Tire Flips', reps: '8-10', notes: 'Full body power' },
                { name: 'Farmer Walk to Overhead Press', reps: '40 yards + 8 presses x 4', notes: 'Walk then press' }
            ],
            home: [
                { name: 'Man Maker Variations', reps: '10-12', notes: 'Add push-up, jump, etc' },
                { name: 'Turkish Get-up to Windmill', reps: '5-8 each', notes: 'With DB or KB' },
                { name: 'Burpee Complex', reps: '12-15', notes: 'Burpee + tuck jump + sprawl' },
                { name: 'Flow Movements', reps: '60-90 sec', notes: 'Continuous ground-based movement' },
                { name: 'Beast to Alternating Limb Lifts', reps: '12-15 each', notes: 'Quadruped position' },
                { name: 'Crab Walk to Bear Crawl', reps: '45 sec', notes: 'Alternating patterns' }
            ],
            hotel: [
                { name: 'DB Snatch', reps: '8-10 each', notes: 'Single arm power' },
                { name: 'DB Clean & Press', reps: '8-10', notes: 'Both arms or single' },
                { name: 'DB Complex (6 exercises)', reps: '8 reps each x 4 rounds', notes: 'RDL, row, clean, press, squat, lunge' },
                { name: 'Turkish Get-up Complex', reps: '5 each side', notes: 'Add windmill at top' }
            ],
            park: [
                { name: 'Muscle-up to Dip', reps: '6-8', notes: 'Advanced gymnastics combo' },
                { name: 'Burpee Broad Jump', reps: '10-12', notes: 'Burpee then broad jump' },
                { name: 'Park Workout Complex', reps: '5 rounds', notes: '10 pull-ups, 20 push-ups, 30 squats, 400m run' },
                { name: 'Bear Crawl to Broad Jump', reps: '8-10', notes: 'Crawl then jump' }
            ]
        }
    },

    // ========== LATS EXERCISES ==========
    lats: {
        routine: {
            gym: [
                { name: 'Wide Grip Pull-ups', reps: '8-12', notes: 'Lat width builder' },
                { name: 'Lat Pulldowns', reps: '10-12', notes: 'Classic lat exercise' },
                { name: 'Close Grip Pulldowns', reps: '10-12', notes: 'Lower lat focus' },
                { name: 'Straight Arm Pulldowns', reps: '12-15', notes: 'Lat isolation' },
                { name: 'Dumbbell Pullovers', reps: '12-15', notes: 'Stretch and contraction' },
                { name: 'Cable Pullovers', reps: '12-15', notes: 'Constant tension' },
                { name: 'Underhand Pulldowns', reps: '10-12', notes: 'Lower lat emphasis' },
                { name: 'V-Bar Pulldowns', reps: '10-12', notes: 'Neutral grip' },
                { name: 'Wide Grip Cable Rows', reps: '10-12', notes: 'Lat thickness' },
                { name: 'Machine Pullovers', reps: '12-15', notes: 'Controlled lat stretch' }
            ],
            home: [
                { name: 'Pull-ups', reps: '8-12', notes: 'If bar available' },
                { name: 'Wide Grip Pull-ups', reps: '8-10', notes: 'Lat width' },
                { name: 'Dumbbell Pullovers', reps: '12-15', notes: 'Floor or bench' },
                { name: 'Resistance Band Pulldowns', reps: '15-20', notes: 'If you have bands' },
                { name: 'Inverted Rows (Wide Grip)', reps: '12-15', notes: 'Under table' },
                { name: 'Straight Arm Pulldowns (Band)', reps: '15-20', notes: 'Band attached high' }
            ],
            hotel: [
                { name: 'Dumbbell Pullovers', reps: '12-15', notes: 'On bench' },
                { name: 'Wide Grip Pull-ups', reps: '8-12', notes: 'If bar available' },
                { name: 'Single Arm DB Rows (Wide)', reps: '10-12', notes: 'Lat focus' },
                { name: 'Inverted Rows', reps: '12-15', notes: 'Under desk' },
                { name: 'Lat Pulldowns', reps: '10-12', notes: 'If machine available' }
            ],
            park: [
                { name: 'Wide Grip Pull-ups', reps: '8-12', notes: 'On bar' },
                { name: 'Neutral Grip Pull-ups', reps: '8-12', notes: 'On parallel bars' },
                { name: 'Inverted Rows (Wide)', reps: '12-15', notes: 'Under low bar' },
                { name: 'Assisted Pull-ups', reps: '10-15', notes: 'Use band or partner' }
            ]
        },
        unique: {
            gym: [
                { name: 'Behind the Neck Pulldowns', reps: '10-12', notes: 'Old school lat width' },
                { name: 'Gironda Sternum Pulldowns', reps: '8-10', notes: 'Pull to sternum, lean back' },
                { name: 'Rope Straight Arm Pulldowns', reps: '12-15', notes: 'Rope attachment, lat stretch' },
                { name: 'Single Arm Lat Pulldowns', reps: '10-12 each', notes: 'Unilateral focus' },
                { name: 'Pullover to Extension', reps: '10-12', notes: 'Combo movement' },
                { name: 'Snatch Grip Pulldowns', reps: '10-12', notes: 'Extra wide grip' },
                { name: 'Chest Supported Lat Pulldowns', reps: '10-12', notes: 'Remove momentum' },
                { name: 'Kneeling Cable Pullovers', reps: '12-15', notes: 'On knees for stretch' },
                { name: 'X-Lat Pulldowns', reps: '10-12', notes: 'Crossed cable pulldowns' },
                { name: 'Meadows Shrugs', reps: '12-15', notes: 'T-bar lat shrugs' },
                { name: 'Lat Prayers', reps: '15-20', notes: 'Cable rope lat stretch' },
                { name: 'Single Arm Cable Pulldowns', reps: '12-15 each', notes: 'Alternating sides' },
                { name: 'Deficit Pull-ups', reps: '8-10', notes: 'Standing on plates for stretch' },
                { name: 'Pulse Pull-ups', reps: '8-12', notes: 'Small pulses at top' },
                { name: 'Wide Grip Barbell Pullovers', reps: '12-15', notes: 'Lying on bench' },
                { name: 'Lat Focused Chaos Pulldowns', reps: '10-12', notes: 'Unstable attachment' },
                { name: 'Bamboo Bar Pulldowns', reps: '10-12', notes: 'Unstable bar' },
                { name: 'Paused Pulldowns', reps: '8-10', notes: '3 second hold at chest' },
                { name: 'One and a Half Pulldowns', reps: '10-12', notes: 'Full, half, full = 1 rep' },
                { name: 'Scapular Pull-ups', reps: '15-20', notes: 'Just shrug shoulders, no bend' }
            ],
            home: [
                { name: 'Archer Pull-ups', reps: '6-8 each', notes: 'Single side emphasis' },
                { name: 'Scapular Pull-ups', reps: '15-20', notes: 'Lat activation' },
                { name: 'Eccentric Pull-ups', reps: '5-8', notes: '5 second negative' },
                { name: 'Typewriter Pull-ups', reps: '8-10', notes: 'Side to side at top' },
                { name: 'Weighted Pull-ups', reps: '8-10', notes: 'Backpack with weight' },
                { name: 'Wide to Close Grip Transition', reps: '8-12', notes: 'Change grip mid-set' },
                { name: 'L-Sit Pull-ups', reps: '6-8', notes: 'Legs extended' },
                { name: 'Pullover on Stability Ball', reps: '12-15', notes: 'If you have ball' }
            ],
            hotel: [
                { name: 'Single Arm DB Pullovers', reps: '10-12 each', notes: 'Unilateral stretch' },
                { name: 'Cross Bench DB Pullovers', reps: '12-15', notes: 'Shoulders on bench only' },
                { name: 'Tempo DB Pullovers', reps: '10-12', notes: '5 second eccentric' },
                { name: 'Alternating Arm Pullovers', reps: '12-15', notes: 'One arm at a time' },
                { name: 'Paused DB Pullovers', reps: '10-12', notes: '2 second stretch hold' },
                { name: 'Offset DB Rows (Lat Focus)', reps: '10-12', notes: 'Pull to hip' }
            ],
            park: [
                { name: 'Muscle-up Negatives', reps: '5-8', notes: 'Lower down slowly' },
                { name: 'L-Sit Pull-ups', reps: '6-8', notes: 'Legs straight out' },
                { name: 'Around the World Pull-ups', reps: '6-8', notes: 'Circular path' },
                { name: 'Clapping Pull-ups', reps: '5-8', notes: 'Explosive lat power' },
                { name: 'Mixed Grip Pull-ups', reps: '8-10', notes: 'Asymmetric grip' }
            ]
        }
    },

    // ========== TRAPS EXERCISES ==========
    traps: {
        routine: {
            gym: [
                { name: 'Barbell Shrugs', reps: '12-15', notes: 'Classic trap builder' },
                { name: 'Dumbbell Shrugs', reps: '12-15', notes: 'Greater range of motion' },
                { name: 'Trap Bar Shrugs', reps: '12-15', notes: 'Neutral grip, heavy load' },
                { name: 'Face Pulls', reps: '15-20', notes: 'Upper traps and rear delts' },
                { name: 'Upright Rows', reps: '10-12', notes: 'Upper trap activation' },
                { name: 'Cable Shrugs', reps: '12-15', notes: 'Constant tension' },
                { name: 'Rack Pulls', reps: '8-10', notes: 'Heavy trap work' },
                { name: 'Farmers Walks', reps: '40-60 sec', notes: 'Loaded carry' },
                { name: 'Y-Raises', reps: '12-15', notes: 'Lower trap focus' }
            ],
            home: [
                { name: 'Dumbbell Shrugs', reps: '15-20', notes: 'If you have DBs' },
                { name: 'Resistance Band Shrugs', reps: '20-25', notes: 'If you have bands' },
                { name: 'Scapular Wall Slides', reps: '15-20', notes: 'Trap activation' },
                { name: 'Prone Y-Raises', reps: '15-20', notes: 'Floor work' },
                { name: 'Farmers Walks', reps: '45-60 sec', notes: 'Heavy objects' },
                { name: 'Band Face Pulls', reps: '20-25', notes: 'Upper trap work' }
            ],
            hotel: [
                { name: 'Dumbbell Shrugs', reps: '12-15', notes: 'Standard trap work' },
                { name: 'Single Arm DB Shrugs', reps: '12-15 each', notes: 'Unilateral focus' },
                { name: 'Farmers Walks', reps: '40-60 sec', notes: 'With DBs' },
                { name: 'Upright Rows', reps: '10-12', notes: 'With DBs' },
                { name: 'Face Pulls', reps: '15-20', notes: 'If cable available' }
            ],
            park: [
                { name: 'Scapular Pull-ups', reps: '15-20', notes: 'Trap activation' },
                { name: 'Shrug Pull-ups', reps: '12-15', notes: 'Hang and shrug' },
                { name: 'Dead Hangs', reps: '45-60 sec', notes: 'Passive trap stretch' },
                { name: 'Inverted Shrugs', reps: '15-20', notes: 'Under bar, retract scapula' }
            ]
        },
        unique: {
            gym: [
                { name: 'Kelso Shrugs', reps: '12-15', notes: 'Chest on incline bench' },
                { name: 'Behind the Back Shrugs', reps: '12-15', notes: 'Bar behind body' },
                { name: 'Snatch Grip High Pulls', reps: '8-10', notes: 'Wide grip explosive' },
                { name: 'Bradford Shrugs', reps: '12-15', notes: 'Overhead shrugs, bar moving' },
                { name: 'Overhead Barbell Shrugs', reps: '10-12', notes: 'Locked out overhead' },
                { name: 'Haney Shrugs', reps: '12-15', notes: 'Behind back smith machine' },
                { name: 'Cable Upright Row to Shrug', reps: '12-15', notes: 'Combo movement' },
                { name: 'Scapular Retraction Rows', reps: '15-20', notes: 'Just squeeze, no row' },
                { name: 'Chaos Shrugs', reps: '12-15', notes: 'Unstable load' },
                { name: 'Snatch Shrugs', reps: '8-10', notes: 'From hang position' },
                { name: 'Trap Bar Jump Shrugs', reps: '8-10', notes: 'Explosive power' },
                { name: 'Band Resisted Barbell Shrugs', reps: '12-15', notes: 'Accommodating resistance' },
                { name: 'Seal Row Shrugs', reps: '12-15', notes: 'Chest supported, trap focus' },
                { name: 'Single Arm Cable Shrugs', reps: '15-20 each', notes: 'Unilateral isolation' },
                { name: 'Overhead Carries', reps: '40-60 sec', notes: 'DB/KB overhead walk' },
                { name: 'Bottoms Up KB Carry', reps: '30-45 sec each', notes: 'Kettlebell upside down' },
                { name: 'Paused Shrugs', reps: '12-15', notes: '3 second hold at top' },
                { name: 'Deficit Shrugs', reps: '12-15', notes: 'Standing on plates' },
                { name: 'Power Shrugs', reps: '8-10', notes: 'Explosive from hang' }
            ],
            home: [
                { name: 'Scapular Push-ups', reps: '15-20', notes: 'Plank position, protract/retract' },
                { name: 'YTW Raises', reps: '12-15 each', notes: 'Prone on floor' },
                { name: 'Overhead Hold Shrugs', reps: '12-15', notes: 'DB overhead, shrug up' },
                { name: 'Isometric Shrug Holds', reps: '30-45 sec', notes: 'DB or loaded bag' },
                { name: 'Prone Trap Raises', reps: '15-20', notes: 'Thumbs up raise' },
                { name: 'Wall Angel Shrugs', reps: '15-20', notes: 'Back against wall' },
                { name: 'Band Overhead Shrugs', reps: '15-20', notes: 'Arms locked out' },
                { name: 'Loaded Carry Variations', reps: '45-60 sec', notes: 'Heavy objects' }
            ],
            hotel: [
                { name: 'Overhead DB Shrugs', reps: '12-15', notes: 'Arms locked out' },
                { name: 'Tempo Shrugs', reps: '12-15', notes: '3 second up, 3 second down' },
                { name: 'One and a Half Shrugs', reps: '12-15', notes: 'Full, half, full = 1 rep' },
                { name: 'Offset Shrugs', reps: '12-15', notes: 'One heavy, one light DB' },
                { name: 'Single Arm Overhead Carry', reps: '40-60 sec each', notes: 'DB overhead walk' },
                { name: 'Suitcase Carry', reps: '40-60 sec each', notes: 'Heavy DB one side' }
            ],
            park: [
                { name: 'Scapular Pull-up Hold', reps: '30-45 sec', notes: 'Hold shrugged position' },
                { name: 'Hanging Scapular Circles', reps: '10-12 each direction', notes: 'Circle shoulders while hanging' },
                { name: 'Active Dead Hangs', reps: '45-60 sec', notes: 'Squeeze traps while hanging' },
                { name: 'Inverted Row Holds', reps: '30-45 sec', notes: 'Hold at top, squeeze' },
                { name: 'Pull-up Shrugs', reps: '15-20', notes: 'At top of pull-up, shrug' }
            ]
        }
    },

    // ========== BICEPS EXERCISES ==========
    biceps: {
        routine: {
            gym: [
                { name: 'Barbell Curls', reps: '10-12', notes: 'Classic bicep builder' },
                { name: 'Dumbbell Curls', reps: '10-12', notes: 'Alternating or together' },
                { name: 'Hammer Curls', reps: '10-12', notes: 'Brachialis and forearms' },
                { name: 'Preacher Curls', reps: '10-12', notes: 'Isolation movement' },
                { name: 'Cable Curls', reps: '12-15', notes: 'Constant tension' },
                { name: 'Incline Dumbbell Curls', reps: '12-15', notes: 'Long head stretch' },
                { name: 'Concentration Curls', reps: '12-15', notes: 'Peak contraction' },
                { name: 'EZ Bar Curls', reps: '10-12', notes: 'Easier on wrists' },
                { name: 'Cable Hammer Curls', reps: '12-15', notes: 'Rope attachment' },
                { name: 'Machine Curls', reps: '12-15', notes: 'Controlled movement' }
            ],
            home: [
                { name: 'Dumbbell Curls', reps: '10-12', notes: 'If you have DBs' },
                { name: 'Hammer Curls', reps: '10-12', notes: 'Neutral grip' },
                { name: 'Resistance Band Curls', reps: '15-20', notes: 'If you have bands' },
                { name: 'Chin-ups', reps: '8-12', notes: 'If bar available' },
                { name: 'Isometric Holds', reps: '30-45 sec', notes: 'Various angles with DB' },
                { name: 'Concentration Curls', reps: '12-15', notes: 'Seated with DB' }
            ],
            hotel: [
                { name: 'Dumbbell Curls', reps: '10-12', notes: 'Seated or standing' },
                { name: 'Hammer Curls', reps: '10-12', notes: 'DB neutral grip' },
                { name: 'Incline Dumbbell Curls', reps: '12-15', notes: 'On incline bench' },
                { name: 'Concentration Curls', reps: '12-15', notes: 'Isolation work' },
                { name: 'Chin-ups', reps: '8-12', notes: 'If bar available' }
            ],
            park: [
                { name: 'Chin-ups', reps: '8-12', notes: 'Underhand grip pull-ups' },
                { name: 'Neutral Grip Pull-ups', reps: '8-12', notes: 'Hammer grip variation' },
                { name: 'Isometric Chin-up Holds', reps: '20-30 sec', notes: 'Hold at various angles' },
                { name: 'Commando Pull-ups', reps: '8-10', notes: 'Parallel bar bicep work' }
            ]
        },
        unique: {
            gym: [
                { name: 'Spider Curls', reps: '10-12', notes: 'Chest on incline, arms hanging' },
                { name: 'Drag Curls', reps: '10-12', notes: 'Drag bar up torso' },
                { name: 'Bayesian Curls', reps: '10-12', notes: 'Cable behind body' },
                { name: 'Waiter Curls', reps: '12-15', notes: 'DB held like waiter' },
                { name: 'Meadows Curls', reps: '10-12 each', notes: 'Landmine single arm' },
                { name: 'Zottman Curls', reps: '10-12', notes: 'Curl up supinated, down pronated' },
                { name: '21s', reps: '7+7+7', notes: 'Bottom half, top half, full' },
                { name: 'Chaos Curls', reps: '10-12', notes: 'Hanging weights on bands' },
                { name: 'Reverse Curls', reps: '12-15', notes: 'Overhand grip' },
                { name: '1.5 Rep Curls', reps: '10-12', notes: 'Full, half, full = 1 rep' },
                { name: 'Chest Supported Curls', reps: '10-12', notes: 'Incline bench, no momentum' },
                { name: 'Pin Curls', reps: '10-12', notes: 'Start from pins, no stretch reflex' },
                { name: 'Band Resisted DB Curls', reps: '10-12', notes: 'Band and DB combo' },
                { name: 'Crucifix Curls', reps: '12-15', notes: 'Arms out to sides, cable curls' },
                { name: 'Seated Alternating Curls', reps: '12-15', notes: 'Strict form, seated' },
                { name: 'Scott Curls', reps: '10-12', notes: 'Preacher bench variation' },
                { name: 'Cable Curls (Behind Back)', reps: '12-15', notes: 'Cable low behind body' },
                { name: 'Paused Curls', reps: '10-12', notes: '2 second hold at top' },
                { name: 'Eccentric Focus Curls', reps: '8-10', notes: '5 second negative' },
                { name: 'Single Arm Preacher Curls', reps: '10-12 each', notes: 'Unilateral focus' }
            ],
            home: [
                { name: 'Pelican Curls', reps: '8-10', notes: 'Rings or suspension trainer' },
                { name: 'Eccentric Chin-ups', reps: '5-8', notes: 'Slow negative only' },
                { name: 'Isometric Ladder', reps: '20 sec each', notes: 'Hold at 3 different angles' },
                { name: 'Typewriter Chin-ups', reps: '8-10', notes: 'Side to side at top' },
                { name: 'L-Sit Chin-ups', reps: '6-8', notes: 'Legs extended' },
                { name: 'Towel Curls', reps: '12-15', notes: 'Towel over door or bar' },
                { name: 'Blood Flow Restriction Curls', reps: '20-25', notes: 'Light weight, band around arm' },
                { name: 'Offset DB Curls', reps: '12-15', notes: 'Hold DB by one end' }
            ],
            hotel: [
                { name: 'Zottman Curls', reps: '10-12', notes: 'Rotation during movement' },
                { name: 'Cross Body Hammer Curls', reps: '10-12 each', notes: 'Curl across body' },
                { name: '1.5 Rep Curls', reps: '10-12', notes: 'Enhanced time under tension' },
                { name: 'Tempo Curls', reps: '10-12', notes: '3 second up, 3 second down' },
                { name: 'Seated Incline Offset Curls', reps: '10-12', notes: 'One heavy, one light' },
                { name: 'DB Drag Curls', reps: '10-12', notes: 'Drag DBs up torso' }
            ],
            park: [
                { name: 'L-Sit Chin-ups', reps: '6-8', notes: 'Legs straight during curl' },
                { name: 'Commando Pull-ups', reps: '8-10', notes: 'Parallel grip focus' },
                { name: 'Mixed Grip Pull-ups', reps: '8-10', notes: 'One under, one over' },
                { name: 'Chin-up Holds (3 Positions)', reps: '15 sec each', notes: 'Top, mid, bottom' },
                { name: 'Typewriter Chin-ups', reps: '8-10', notes: 'Side to side bicep burn' }
            ]
        }
    },

    // ========== TRICEPS EXERCISES ==========
    triceps: {
        routine: {
            gym: [
                { name: 'Tricep Pushdowns', reps: '12-15', notes: 'Cable extension' },
                { name: 'Overhead Tricep Extension', reps: '10-12', notes: 'Long head focus' },
                { name: 'Skull Crushers', reps: '10-12', notes: 'Lying tricep extension' },
                { name: 'Close Grip Bench Press', reps: '8-10', notes: 'Compound movement' },
                { name: 'Dips', reps: '10-12', notes: 'Bodyweight tricep builder' },
                { name: 'Rope Pushdowns', reps: '12-15', notes: 'Split rope at bottom' },
                { name: 'Single Arm Pushdowns', reps: '12-15 each', notes: 'Unilateral work' },
                { name: 'Overhead Cable Extensions', reps: '12-15', notes: 'Rope behind head' },
                { name: 'Dumbbell Kickbacks', reps: '12-15', notes: 'Isolation movement' },
                { name: 'Machine Tricep Extensions', reps: '12-15', notes: 'Controlled path' }
            ],
            home: [
                { name: 'Diamond Push-ups', reps: '12-15', notes: 'Tricep emphasis' },
                { name: 'Close Grip Push-ups', reps: '12-15', notes: 'Hands close together' },
                { name: 'Tricep Dips (Chair)', reps: '12-15', notes: 'Use chair or couch' },
                { name: 'Overhead DB Extension', reps: '12-15', notes: 'If you have DB' },
                { name: 'DB Kickbacks', reps: '12-15', notes: 'If you have DBs' },
                { name: 'Resistance Band Extensions', reps: '15-20', notes: 'If you have bands' }
            ],
            hotel: [
                { name: 'Close Grip Push-ups', reps: '12-15', notes: 'Bodyweight option' },
                { name: 'Overhead DB Extension', reps: '10-12', notes: 'Two hands on one DB' },
                { name: 'Dumbbell Kickbacks', reps: '12-15', notes: 'Single arm isolation' },
                { name: 'Diamond Push-ups', reps: '12-15', notes: 'Maximum tricep activation' },
                { name: 'Bench Dips', reps: '15-20', notes: 'Feet on floor or elevated' }
            ],
            park: [
                { name: 'Bench Dips', reps: '15-20', notes: 'On park bench' },
                { name: 'Close Grip Push-ups', reps: '12-15', notes: 'Hands close' },
                { name: 'Diamond Push-ups', reps: '12-15', notes: 'Tricep focus' },
                { name: 'Tricep Extensions on Bars', reps: '10-12', notes: 'Use parallel bars' },
                { name: 'Decline Diamond Push-ups', reps: '10-12', notes: 'Feet elevated' }
            ]
        },
        unique: {
            gym: [
                { name: 'JM Press', reps: '8-10', notes: 'Hybrid skull crusher/bench' },
                { name: 'Tate Press', reps: '10-12', notes: 'DB elbows out' },
                { name: 'California Press', reps: '8-10', notes: 'Angled bar path' },
                { name: 'Rolling Tricep Extensions', reps: '10-12', notes: 'Roll bar back over head' },
                { name: 'Dead Skull Crushers', reps: '8-10', notes: 'Start from pins' },
                { name: 'Chaos Pushdowns', reps: '12-15', notes: 'Unstable attachment' },
                { name: 'Board Press', reps: '8-10', notes: 'Partial ROM overload' },
                { name: 'Floor Press', reps: '8-10', notes: 'Tricep focus variation' },
                { name: 'Reverse Grip Pushdowns', reps: '12-15', notes: 'Underhand cable' },
                { name: 'Single Arm Overhead Extensions', reps: '12-15 each', notes: 'Unilateral long head' },
                { name: 'Pin Press', reps: '8-10', notes: 'Start from pins in rack' },
                { name: 'Bamboo Bar Extensions', reps: '10-12', notes: 'Unstable bar' },
                { name: 'Seated Overhead Band Extensions', reps: '15-20', notes: 'Band under foot' },
                { name: 'Cross Body Cable Extensions', reps: '12-15 each', notes: 'Cable from side' },
                { name: 'Kneeling Tricep Extensions', reps: '12-15', notes: 'On knees, rope behind head' },
                { name: 'Tricep Push-up to Extension', reps: '10-12', notes: 'Combo movement' },
                { name: 'Decline Close Grip Press', reps: '10-12', notes: 'On decline bench' },
                { name: 'One Arm Kickback Hold', reps: '20-30 sec each', notes: 'Isometric at top' },
                { name: 'Band Resisted Dips', reps: '10-12', notes: 'Band around waist' },
                { name: 'Spoto Press (Close Grip)', reps: '8-10', notes: 'Pause 1 inch above chest' }
            ],
            home: [
                { name: 'Typewriter Push-ups', reps: '10-12', notes: 'Side to side tricep work' },
                { name: 'Sliding Tricep Extensions', reps: '10-12', notes: 'Hands on towels' },
                { name: 'Bodyweight Skull Crushers', reps: '12-15', notes: 'Hands on elevated surface' },
                { name: 'Ring Dips', reps: '8-10', notes: 'If you have rings' },
                { name: 'Pike Push-up to Close Grip', reps: '10-12', notes: 'Combo movement' },
                { name: 'Deficit Diamond Push-ups', reps: '10-12', notes: 'Hands on books/blocks' },
                { name: 'Pelican Push-ups', reps: '6-8', notes: 'Extreme tricep stretch' }
            ],
            hotel: [
                { name: 'Tate Press', reps: '10-12', notes: 'Unique tricep angle' },
                { name: 'Single Arm Overhead Extension', reps: '10-12 each', notes: 'One DB overhead' },
                { name: 'Cross Body Kickbacks', reps: '12-15 each', notes: 'Kick across body' },
                { name: 'Tempo Overhead Extensions', reps: '10-12', notes: '3 second eccentric' },
                { name: '1.5 Rep Kickbacks', reps: '12-15', notes: 'Full, half, full = 1 rep' },
                { name: 'Offset Push-ups', reps: '10-12', notes: 'One hand elevated' }
            ],
            park: [
                { name: 'Pelican Push-ups', reps: '6-8', notes: 'On bars, extreme stretch' },
                { name: 'Typewriter Push-ups on Bars', reps: '10-12', notes: 'Side to side' },
                { name: 'Russian Dips', reps: '8-10', notes: 'Lean forward heavily' },
                { name: 'Straight Bar Extensions', reps: '10-12', notes: 'Lean back, extend arms' },
                { name: 'Korean Dips', reps: '6-8', notes: 'Behind back on bars' }
            ]
        }
    },

    // ========== QUADS EXERCISES ==========
    quads: {
        routine: {
            gym: [
                { name: 'Back Squats', reps: '8-10', notes: 'Quad dominant pattern' },
                { name: 'Front Squats', reps: '8-10', notes: 'Maximum quad activation' },
                { name: 'Leg Press', reps: '10-12', notes: 'High foot = quads' },
                { name: 'Leg Extensions', reps: '12-15', notes: 'Quad isolation' },
                { name: 'Hack Squats', reps: '10-12', notes: 'Quad emphasis' },
                { name: 'Walking Lunges', reps: '12-15 each', notes: 'Functional quad work' },
                { name: 'Bulgarian Split Squats', reps: '10-12 each', notes: 'Single leg quads' },
                { name: 'Step-ups', reps: '12-15 each', notes: 'Quad and glute' },
                { name: 'Goblet Squats', reps: '12-15', notes: 'Upright torso, quad focus' },
                { name: 'Sissy Squats', reps: '10-12', notes: 'Pure quad isolation' }
            ],
            home: [
                { name: 'Bodyweight Squats', reps: '20-25', notes: 'Basic quad work' },
                { name: 'Jump Squats', reps: '15-20', notes: 'Explosive quads' },
                { name: 'Lunges', reps: '12-15 each', notes: 'Forward lunges' },
                { name: 'Bulgarian Split Squats', reps: '12-15 each', notes: 'Back foot elevated' },
                { name: 'Wall Sits', reps: '45-60 sec', notes: 'Isometric quad burn' },
                { name: 'Step-ups', reps: '12-15 each', notes: 'Use stairs or chair' },
                { name: 'Sissy Squats', reps: '10-12', notes: 'Hold something for balance' }
            ],
            hotel: [
                { name: 'Goblet Squats', reps: '12-15', notes: 'DB at chest' },
                { name: 'Dumbbell Lunges', reps: '12-15 each', notes: 'Forward or reverse' },
                { name: 'Bulgarian Split Squats', reps: '10-12 each', notes: 'With DBs' },
                { name: 'Step-ups', reps: '12-15 each', notes: 'Bench or chair' },
                { name: 'Single Leg Squats', reps: '8-10 each', notes: 'Pistol progression' }
            ],
            park: [
                { name: 'Jump Squats', reps: '15-20', notes: 'Explosive power' },
                { name: 'Walking Lunges', reps: '15-20 each', notes: 'Long distance' },
                { name: 'Step-ups', reps: '12-15 each', notes: 'Park bench' },
                { name: 'Bulgarian Split Squats', reps: '12-15 each', notes: 'Back foot on bench' },
                { name: 'Pistol Squats', reps: '6-10 each', notes: 'Advanced single leg' }
            ]
        },
        unique: {
            gym: [
                { name: 'Cyclist Squats', reps: '10-12', notes: 'Heels elevated, upright torso' },
                { name: 'Anderson Squats', reps: '6-8', notes: 'Start from pins' },
                { name: 'Paused Squats', reps: '6-8', notes: '3 second pause at bottom' },
                { name: 'Tempo Squats', reps: '6-8', notes: '5 second eccentric' },
                { name: '1.5 Rep Squats', reps: '8-10', notes: 'Full, half, full = 1 rep' },
                { name: 'Hatfield Squats', reps: '8-10', notes: 'Safety bar, hands free' },
                { name: 'Spanish Squats', reps: '15-20', notes: 'Band behind knees' },
                { name: 'Peterson Step-ups', reps: '10-12 each', notes: 'Knee over toe emphasis' },
                { name: 'Poliquin Step-ups', reps: '10-12 each', notes: 'Slow eccentric' },
                { name: 'Reverse Nordics', reps: '8-10', notes: 'Kneel and lean back' },
                { name: 'Leg Press (1.5 Reps)', reps: '12-15', notes: 'Enhanced tension' },
                { name: 'Zercher Squats', reps: '8-10', notes: 'Bar in elbows' },
                { name: 'Box Squats (Narrow)', reps: '8-10', notes: 'Narrow stance quad focus' },
                { name: 'Front Foot Elevated Lunges', reps: '10-12 each', notes: 'Front foot on plate' },
                { name: 'Landmine Squats', reps: '12-15', notes: 'Goblet style with landmine' },
                { name: 'Single Leg Leg Press', reps: '10-12 each', notes: 'Unilateral focus' },
                { name: 'Hatfield Belt Squats', reps: '12-15', notes: 'Deload spine' },
                { name: 'Sissy Squat Machine', reps: '10-12', notes: 'If available' },
                { name: 'Heels Elevated Goblet Squat', reps: '12-15', notes: 'Plates under heels' },
                { name: 'Wall Squats (Weighted)', reps: '10-12', notes: 'Back against wall, hold weight' }
            ],
            home: [
                { name: 'Pistol Squats', reps: '6-10 each', notes: 'Single leg to ground' },
                { name: 'Shrimp Squats', reps: '8-12 each', notes: 'Back foot held' },
                { name: 'Sissy Squats', reps: '10-12', notes: 'Lean back, quad burn' },
                { name: 'Reverse Nordics', reps: '8-10', notes: 'Kneel and lean back' },
                { name: 'Spanish Squats (Band)', reps: '15-20', notes: 'Band behind knees' },
                { name: 'ATG Split Squats', reps: '10-12 each', notes: 'Ass to grass' },
                { name: 'Skater Squats', reps: '8-10 each', notes: 'Single leg, back foot hovering' },
                { name: 'Heel Elevated Squats', reps: '15-20', notes: 'Books under heels' },
                { name: 'Cossack Squats', reps: '10-12 each', notes: 'Side to side' },
                { name: '1.5 Rep Pistols', reps: '6-8 each', notes: 'Enhanced difficulty' }
            ],
            hotel: [
                { name: 'Cyclist Squats', reps: '12-15', notes: 'Heels on plates with DB' },
                { name: 'Tempo Goblet Squats', reps: '10-12', notes: '5 second down' },
                { name: 'Pause Goblet Squats', reps: '10-12', notes: '3 second hold' },
                { name: '1.5 Rep Bulgarian Splits', reps: '10-12 each', notes: 'Down, half, down, full' },
                { name: 'Heels Elevated Goblet Squat', reps: '12-15', notes: 'Plates or books under heels' },
                { name: 'Single Leg Box Squats', reps: '8-10 each', notes: 'Sit to bench' }
            ],
            park: [
                { name: 'Pistol Squats', reps: '6-10 each', notes: 'Use tree for balance' },
                { name: 'Shrimp Squats', reps: '8-12 each', notes: 'Advanced single leg' },
                { name: 'Jump Lunges', reps: '12-15', notes: 'Explosive switch' },
                { name: 'Box Jump Squats', reps: '8-10', notes: 'Jump to bench, squat' },
                { name: 'Skater Squats', reps: '8-10 each', notes: 'Single leg pattern' }
            ]
        }
    },

    // ========== HAMSTRINGS EXERCISES ==========
    hamstrings: {
        routine: {
            gym: [
                { name: 'Romanian Deadlifts', reps: '10-12', notes: 'Classic hamstring builder' },
                { name: 'Leg Curls', reps: '12-15', notes: 'Hamstring isolation' },
                { name: 'Stiff Leg Deadlifts', reps: '10-12', notes: 'Hamstring stretch' },
                { name: 'Good Mornings', reps: '10-12', notes: 'Posterior chain' },
                { name: 'Glute Ham Raises', reps: '10-12', notes: 'Best hamstring exercise' },
                { name: 'Single Leg RDLs', reps: '10-12 each', notes: 'Unilateral work' },
                { name: 'Seated Leg Curls', reps: '12-15', notes: 'Short head focus' },
                { name: 'Lying Leg Curls', reps: '12-15', notes: 'Long head focus' },
                { name: 'Cable Pull Throughs', reps: '12-15', notes: 'Hip hinge pattern' },
                { name: 'Kettlebell Swings', reps: '15-20', notes: 'Explosive hip hinge' }
            ],
            home: [
                { name: 'Single Leg Deadlifts', reps: '10-12 each', notes: 'Balance and hamstrings' },
                { name: 'Glute Bridges', reps: '15-20', notes: 'Hamstring and glute' },
                { name: 'Nordic Hamstring Curls', reps: '6-8', notes: 'Hook feet under couch' },
                { name: 'Single Leg Glute Bridges', reps: '12-15 each', notes: 'One leg elevated' },
                { name: 'Sliding Leg Curls', reps: '12-15', notes: 'Feet on towels' },
                { name: 'Good Mornings', reps: '12-15', notes: 'Bodyweight or with weight' }
            ],
            hotel: [
                { name: 'Romanian Deadlifts', reps: '10-12', notes: 'With DBs' },
                { name: 'Single Leg RDLs', reps: '10-12 each', notes: 'DB in one or both hands' },
                { name: 'Good Mornings', reps: '10-12', notes: 'DB on shoulders' },
                { name: 'Glute Bridges', reps: '15-20', notes: 'DB on hips' },
                { name: 'Single Leg Curls', reps: '12-15 each', notes: 'If machine available' }
            ],
            park: [
                { name: 'Single Leg Deadlifts', reps: '10-12 each', notes: 'Bodyweight balance' },
                { name: 'Nordic Hamstring Curls', reps: '6-8', notes: 'Partner holds feet' },
                { name: 'Glute Ham Raises', reps: '8-10', notes: 'If equipment available' },
                { name: 'Single Leg Glute Bridges', reps: '12-15 each', notes: 'On ground' }
            ]
        },
        unique: {
            gym: [
                { name: 'Nordic Hamstring Curls', reps: '6-8', notes: 'Eccentric destroyer' },
                { name: 'Glute Ham Raises', reps: '10-12', notes: 'Full hamstring ROM' },
                { name: 'Razor Curls', reps: '8-10', notes: 'From knees, pull bar to body' },
                { name: 'Single Leg RDL (Kickstand)', reps: '10-12 each', notes: 'Back toe touches' },
                { name: 'Snatch Grip RDLs', reps: '10-12', notes: 'Wide grip variation' },
                { name: 'Deficit RDLs', reps: '10-12', notes: 'Standing on plates' },
                { name: 'Paused RDLs', reps: '10-12', notes: '2 second hold at bottom' },
                { name: 'Tempo RDLs', reps: '8-10', notes: '5 second eccentric' },
                { name: 'Band Resisted RDLs', reps: '10-12', notes: 'Accommodating resistance' },
                { name: 'Harop Curls', reps: '8-10', notes: 'Feet elevated Nordic' },
                { name: 'Single Leg Glute Ham Raises', reps: '6-8 each', notes: 'Advanced unilateral' },
                { name: 'Slider Leg Curls', reps: '12-15', notes: 'Feet on sliders, bridge and curl' },
                { name: 'Eccentric Nordics', reps: '5-8', notes: 'Only negative portion' },
                { name: 'Banded Leg Curls', reps: '15-20', notes: 'Band around ankles' },
                { name: 'Reverse Hypers', reps: '12-15', notes: 'If machine available' },
                { name: 'Cable Through (Single Leg)', reps: '12-15 each', notes: 'Unilateral cable' },
                { name: 'TRX/Ring Hamstring Curls', reps: '10-12', notes: 'Suspension trainer' },
                { name: '45 Degree Back Extension', reps: '12-15', notes: 'Hamstring focus' },
                { name: 'Marching Glute Ham Raises', reps: '10-12', notes: 'Alternating legs' },
                { name: 'RDL to Row', reps: '10-12', notes: 'Combo movement' }
            ],
            home: [
                { name: 'Nordic Hamstring Curls', reps: '6-8', notes: 'Hook feet under couch' },
                { name: 'Sliding Leg Curls', reps: '12-15', notes: 'Towels under feet' },
                { name: 'Single Leg Sliding Curls', reps: '10-12 each', notes: 'One leg at a time' },
                { name: 'Eccentric Nordic Curls', reps: '5-8', notes: 'Slow negative only' },
                { name: 'Glute Bridge Walkouts', reps: '10-12', notes: 'Bridge, walk feet out and back' },
                { name: 'Single Leg RDL Holds', reps: '30-45 sec each', notes: 'Isometric at bottom' },
                { name: 'Sliding Single Leg Curls', reps: '8-10 each', notes: 'Unilateral slider work' },
                { name: 'Reverse Plank Leg Curls', reps: '12-15', notes: 'From reverse plank' },
                { name: 'Feet Elevated Glute Bridges', reps: '15-20', notes: 'Feet on chair' }
            ],
            hotel: [
                { name: 'Single Leg RDL (Contralateral)', reps: '10-12 each', notes: 'DB in opposite hand' },
                { name: 'Tempo RDLs', reps: '10-12', notes: '5 second down' },
                { name: 'Pause RDLs', reps: '10-12', notes: '3 second hold at bottom' },
                { name: '1.5 Rep RDLs', reps: '10-12', notes: 'Full, half, full = 1 rep' },
                { name: 'B-Stance RDLs', reps: '10-12 each', notes: 'Back toe down for balance' },
                { name: 'Sliding Leg Curls', reps: '12-15', notes: 'Towel under feet' }
            ],
            park: [
                { name: 'Nordic Hamstring Curls', reps: '6-8', notes: 'Partner holds feet' },
                { name: 'Natural Glute Ham Raises', reps: '8-10', notes: 'Feet hooked under bench' },
                { name: 'Eccentric Nordics', reps: '5-8', notes: 'Slow negative' },
                { name: 'Single Leg RDL Holds', reps: '30-45 sec', notes: 'Balance work' },
                { name: 'Pistol RDL Combo', reps: '8-10 each', notes: 'Pistol squat to RDL' }
            ]
        }
    },

    // ========== GLUTES EXERCISES ==========
    glutes: {
        routine: {
            gym: [
                { name: 'Hip Thrusts', reps: '10-12', notes: 'Best glute builder' },
                { name: 'Romanian Deadlifts', reps: '10-12', notes: 'Glute and hamstring' },
                { name: 'Bulgarian Split Squats', reps: '10-12 each', notes: 'Single leg glute work' },
                { name: 'Glute Bridges', reps: '12-15', notes: 'Glute isolation' },
                { name: 'Cable Pull Throughs', reps: '12-15', notes: 'Hip hinge glute focus' },
                { name: 'Step-ups', reps: '12-15 each', notes: 'Functional glute work' },
                { name: 'Reverse Lunges', reps: '12-15 each', notes: 'Glute emphasis' },
                { name: 'Sumo Deadlifts', reps: '8-10', notes: 'Wide stance glute work' },
                { name: 'Cable Kickbacks', reps: '12-15 each', notes: 'Glute isolation' },
                { name: 'Smith Machine Hip Thrusts', reps: '10-12', notes: 'Controlled glute work' }
            ],
            home: [
                { name: 'Glute Bridges', reps: '15-20', notes: 'Floor glute work' },
                { name: 'Single Leg Glute Bridges', reps: '12-15 each', notes: 'Unilateral focus' },
                { name: 'Hip Thrusts', reps: '12-15', notes: 'Shoulders on couch/chair' },
                { name: 'Bulgarian Split Squats', reps: '12-15 each', notes: 'Back foot elevated' },
                { name: 'Single Leg Deadlifts', reps: '10-12 each', notes: 'Balance and glutes' },
                { name: 'Reverse Lunges', reps: '12-15 each', notes: 'Step back lunges' },
                { name: 'Frog Pumps', reps: '20-25', notes: 'Feet together glute bridges' }
            ],
            hotel: [
                { name: 'Hip Thrusts', reps: '10-12', notes: 'DB on hips, back on bench' },
                { name: 'Bulgarian Split Squats', reps: '10-12 each', notes: 'With DBs' },
                { name: 'Romanian Deadlifts', reps: '10-12', notes: 'DB RDLs' },
                { name: 'Single Leg Glute Bridges', reps: '12-15 each', notes: 'One leg elevated' },
                { name: 'Reverse Lunges', reps: '12-15 each', notes: 'DB in each hand' }
            ],
            park: [
                { name: 'Hip Thrusts', reps: '12-15', notes: 'Back on park bench' },
                { name: 'Bulgarian Split Squats', reps: '12-15 each', notes: 'Back foot on bench' },
                { name: 'Single Leg Deadlifts', reps: '10-12 each', notes: 'Bodyweight balance' },
                { name: 'Step-ups', reps: '12-15 each', notes: 'High bench for glute focus' },
                { name: 'Reverse Lunges', reps: '12-15 each', notes: 'Bodyweight or loaded' }
            ]
        },
        unique: {
            gym: [
                { name: 'B-Stance Hip Thrusts', reps: '10-12 each', notes: 'One heel down, toe down' },
                { name: 'Frog Pumps', reps: '20-25', notes: 'Feet together, knees out' },
                { name: 'Deficit Bulgarian Splits', reps: '10-12 each', notes: 'Front foot elevated' },
                { name: 'Paused Hip Thrusts', reps: '10-12', notes: '3 second hold at top' },
                { name: 'Single Leg Hip Thrusts', reps: '10-12 each', notes: 'One leg extended' },
                { name: 'Kas Glute Bridges', reps: '15-20', notes: 'Short ROM, shoulders on ground' },
                { name: 'Feet Elevated Hip Thrusts', reps: '10-12', notes: 'Feet on bench' },
                { name: 'Cable Glute Kickbacks', reps: '15-20 each', notes: 'Ankle attachment' },
                { name: 'Smith Machine B-Stance RDLs', reps: '10-12 each', notes: 'One leg emphasis' },
                { name: 'Hip Thrust 1.5 Reps', reps: '10-12', notes: 'Full, half, full = 1 rep' },
                { name: 'Reverse Hypers', reps: '12-15', notes: 'If machine available' },
                { name: 'Pendulum Quadruped Hip Extension', reps: '15-20 each', notes: 'Machine glute isolation' },
                { name: 'Band Glute Bridges', reps: '15-20', notes: 'Band around knees' },
                { name: 'Deficit Reverse Lunges', reps: '10-12 each', notes: 'Standing on plates' },
                { name: 'Copenhagen Hip Adduction', reps: '10-12 each', notes: 'Side lying on bench' },
                { name: 'Fire Hydrants with Band', reps: '15-20 each', notes: 'On hands and knees' },
                { name: 'Curtsy Lunges', reps: '12-15 each', notes: 'Step back and across' },
                { name: 'Glute Focused Back Extensions', reps: '12-15', notes: 'Round back, squeeze glutes' },
                { name: 'Banded Glute Walks', reps: '20 steps each direction', notes: 'Band around knees' },
                { name: 'Single Leg Cable Pull Through', reps: '12-15 each', notes: 'One leg balance' }
            ],
            home: [
                { name: 'Frog Pumps', reps: '20-25', notes: 'Feet together, knees out' },
                { name: 'Single Leg Hip Thrust', reps: '10-12 each', notes: 'One leg extended' },
                { name: 'Kas Glute Bridges', reps: '15-20', notes: 'Short ROM pulses' },
                { name: 'B-Stance Glute Bridges', reps: '12-15 each', notes: 'One heel, one toe' },
                { name: 'Feet Elevated Glute Bridges', reps: '15-20', notes: 'Feet on chair' },
                { name: 'Curtsy Lunges', reps: '12-15 each', notes: 'Cross back lunge' },
                { name: 'Fire Hydrants', reps: '15-20 each', notes: 'On hands and knees' },
                { name: 'Glute Kickbacks', reps: '15-20 each', notes: 'Quadruped position' },
                { name: 'Deficit Reverse Lunges', reps: '10-12 each', notes: 'Stand on books' }
            ],
            hotel: [
                { name: 'B-Stance Hip Thrusts', reps: '10-12 each', notes: 'One leg emphasis' },
                { name: 'Single Leg Hip Thrusts', reps: '10-12 each', notes: 'Advanced variation' },
                { name: 'Paused Hip Thrusts', reps: '10-12', notes: '3 second squeeze' },
                { name: '1.5 Rep Hip Thrusts', reps: '10-12', notes: 'Enhanced tension' },
                { name: 'Tempo Bulgarian Splits', reps: '10-12 each', notes: '3 second down' },
                { name: 'Deficit Bulgarian Splits', reps: '10-12 each', notes: 'Front foot on plates' }
            ],
            park: [
                { name: 'Single Leg Hip Thrusts', reps: '10-12 each', notes: 'On bench' },
                { name: 'Deficit Step-ups', reps: '10-12 each', notes: 'High bench' },
                { name: 'Pistol Squats', reps: '6-10 each', notes: 'Full glute engagement' },
                { name: 'Jump Lunges', reps: '12-15', notes: 'Explosive glute power' },
                { name: 'Hill Sprints', reps: '8-10 sprints', notes: 'Explosive glute work' }
            ]
        }
    },

    // ========== CALVES EXERCISES ==========
    calves: {
        routine: {
            gym: [
                { name: 'Standing Calf Raises', reps: '15-20', notes: 'Gastrocnemius focus' },
                { name: 'Seated Calf Raises', reps: '15-20', notes: 'Soleus focus' },
                { name: 'Leg Press Calf Raises', reps: '15-20', notes: 'Heavy load' },
                { name: 'Smith Machine Calf Raises', reps: '15-20', notes: 'Controlled movement' },
                { name: 'Single Leg Calf Raises', reps: '12-15 each', notes: 'Unilateral work' },
                { name: 'Donkey Calf Raises', reps: '15-20', notes: 'If machine available' },
                { name: 'Calf Raises on Leg Press', reps: '20-25', notes: 'Alternative angle' },
                { name: 'Jump Rope', reps: '2-3 min', notes: 'Calf endurance' }
            ],
            home: [
                { name: 'Standing Calf Raises', reps: '20-25', notes: 'Bodyweight on step' },
                { name: 'Single Leg Calf Raises', reps: '15-20 each', notes: 'On step or floor' },
                { name: 'Seated Calf Raises', reps: '20-25', notes: 'Weight on knees if available' },
                { name: 'Jump Rope', reps: '3-5 min', notes: 'Calf conditioning' },
                { name: 'Calf Raise Holds', reps: '30-45 sec', notes: 'Isometric at top' },
                { name: 'Jumping Jacks', reps: '50-100', notes: 'Calf activation' }
            ],
            hotel: [
                { name: 'Standing Calf Raises', reps: '20-25', notes: 'On step with DB' },
                { name: 'Single Leg Calf Raises', reps: '15-20 each', notes: 'Holding DB' },
                { name: 'Seated Calf Raises', reps: '20-25', notes: 'DB on knees' },
                { name: 'Jump Rope', reps: '3-5 min', notes: 'If rope available' },
                { name: 'Calf Machine', reps: '15-20', notes: 'If available' }
            ],
            park: [
                { name: 'Standing Calf Raises', reps: '20-25', notes: 'On curb or step' },
                { name: 'Single Leg Calf Raises', reps: '15-20 each', notes: 'Bodyweight' },
                { name: 'Jump Rope', reps: '5-10 min', notes: 'Calf endurance' },
                { name: 'Hill Walking', reps: '10-15 min', notes: 'Incline calf work' }
            ]
        },
        unique: {
            gym: [
                { name: 'Paused Calf Raises', reps: '15-20', notes: '2 second hold at top and bottom' },
                { name: 'Tempo Calf Raises', reps: '15-20', notes: '3 second up, 3 second down' },
                { name: '1.5 Rep Calf Raises', reps: '15-20', notes: 'Full, half, full = 1 rep' },
                { name: 'Deficit Calf Raises', reps: '15-20', notes: 'Extra deep stretch' },
                { name: 'Tib Raises', reps: '15-20', notes: 'Anterior tibialis work' },
                { name: 'Seated Single Leg Calf Raises', reps: '15-20 each', notes: 'Soleus isolation' },
                { name: 'Calf Raises with Band', reps: '20-25', notes: 'Band around toes' },
                { name: 'Explosive Calf Raises', reps: '15-20', notes: 'Jump at top' },
                { name: 'Sled Push (Toes)', reps: '40 yards x 4', notes: 'Stay on toes' },
                { name: 'Farmers Walk (Toes)', reps: '40-60 sec', notes: 'Walk on toes only' },
                { name: 'Calf Raise Ladder', reps: '10-9-8...1', notes: 'Descending ladder' },
                { name: 'Donkey Calf Raise (Partner)', reps: '15-20', notes: 'Partner on back' },
                { name: 'Smith Machine Single Leg', reps: '12-15 each', notes: 'Unilateral smith' },
                { name: 'Banded Calf Walks', reps: '40-60 sec', notes: 'Band around toes, walk' },
                { name: 'Seated Calf Machine (Paused)', reps: '15-20', notes: '3 second holds' },
                { name: 'Hack Squat Calf Raises', reps: '15-20', notes: 'On hack squat machine' },
                { name: 'Box Jump to Calf Raise', reps: '10-12', notes: 'Land and raise' },
                { name: 'Eccentric Focus Calf Raises', reps: '12-15', notes: '5 second negative' }
            ],
            home: [
                { name: 'Tib Raises', reps: '15-20', notes: 'Front of shin work' },
                { name: 'Paused Single Leg Calf Raises', reps: '12-15 each', notes: '2 second hold' },
                { name: 'Eccentric Calf Raises', reps: '12-15', notes: '5 second negative' },
                { name: 'Explosive Calf Raises', reps: '15-20', notes: 'Jump at top' },
                { name: 'Wall Calf Stretch Raises', reps: '15-20', notes: 'Against wall for balance' },
                { name: 'Seated Calf Raise Holds', reps: '45-60 sec', notes: 'Isometric tension' },
                { name: 'Banded Calf Raises', reps: '20-25', notes: 'Band under foot' },
                { name: 'Jump Squats (Calf Focus)', reps: '15-20', notes: 'Land on toes' }
            ],
            hotel: [
                { name: 'Tempo Single Leg Raises', reps: '15-20 each', notes: '3 second up and down' },
                { name: 'Paused Seated Calf Raises', reps: '15-20', notes: '2 second holds' },
                { name: '1.5 Rep Calf Raises', reps: '15-20', notes: 'Enhanced tension' },
                { name: 'Eccentric Single Leg Raises', reps: '12-15 each', notes: '5 second down' },
                { name: 'Offset Calf Raises', reps: '15-20', notes: 'One leg slightly forward' },
                { name: 'Tib Raises', reps: '15-20', notes: 'Shin muscle work' }
            ],
            park: [
                { name: 'Hill Calf Raises', reps: '20-25', notes: 'On incline' },
                { name: 'Explosive Calf Raises', reps: '15-20', notes: 'Jump at top' },
                { name: 'Walking on Toes', reps: '2-3 min', notes: 'Continuous calf work' },
                { name: 'Single Leg Hops', reps: '15-20 each', notes: 'Calf power' },
                { name: 'Box Jump Landings', reps: '12-15', notes: 'Eccentric calf work' }
            ]
        }
    }
};

// Main function to get workout from database
function getWorkoutFromDatabase(muscles, time, location, style) {
    const volumeChart = WORKOUT_VOLUME_CHART[time];
    const totalExercises = volumeChart.totalExercises;
    const setsPerExercise = volumeChart.setsPerExercise;
    const restPeriod = volumeChart.restBetweenSets;

    const workout = [];
    const exercisesPerMuscle = Math.max(1, Math.ceil(totalExercises / muscles.length));

    const clonedMuscles = Array.isArray(muscles) ? [...muscles] : [muscles];

    clonedMuscles.forEach(muscle => {
        const muscleDatabase = EXERCISE_DATABASE[muscle];
        if (!muscleDatabase) {
            console.warn(`No exercise database found for muscle group: ${muscle}`);
            return;
        }

        const styleBucket = muscleDatabase[style] || muscleDatabase.routine || muscleDatabase.unique;
        if (!styleBucket) {
            console.warn(`No style bucket found for muscle ${muscle} and style ${style}`);
            return;
        }

        const fallbackOrder = LOCATION_FALLBACKS[location] || LOCATION_FALLBACKS.default;
        let locationUsed = null;
        let locationExercises = [];

        for (const candidate of fallbackOrder) {
            if (styleBucket[candidate] && styleBucket[candidate].length) {
                locationExercises = styleBucket[candidate];
                locationUsed = candidate;
                break;
            }
        }

        if (!locationExercises.length) {
            console.warn(`No exercises available for ${muscle} at any fallback location.`);
            return;
        }

        const available = shuffle(locationExercises).map(exercise => ({
            exercise,
            focus: computeExerciseFocus(muscle, exercise)
        }));

        const selections = [];
        const rule = WORKOUT_BALANCE_RULES[muscle];
        const requiredFocuses = rule ? rule.required || [] : [];
        const optionalFocuses = rule ? rule.optional || [] : [];

        const takeFromFocus = focusName => {
            const index = available.findIndex(item => item.focus === focusName);
            if (index !== -1) {
                const [picked] = available.splice(index, 1);
                selections.push(picked);
                return true;
            }
            return false;
        };

        requiredFocuses.forEach(focus => {
            if (selections.length >= exercisesPerMuscle) return;
            takeFromFocus(focus);
        });

        optionalFocuses.forEach(focus => {
            if (selections.length >= exercisesPerMuscle) return;
            takeFromFocus(focus);
        });

        while (selections.length < exercisesPerMuscle && available.length) {
            selections.push(available.shift());
        }

        selections.forEach(entry => {
            const { exercise, focus } = entry;
            const formattedFocus = focus && focus !== 'general' ? formatFocusLabel(focus) : null;
            workout.push({
                name: exercise.name,
                sets: `${setsPerExercise} sets`,
                reps: exercise.reps,
                rest: restPeriod,
                notes: exercise.notes,
                muscle: muscle,
                focus: formattedFocus,
                baseLocation: locationUsed || location,
                workoutStyle: style
            });
        });
    });

    return workout.slice(0, totalExercises);
}
