// Motivational quotes array
const motivationalQuotes = [
    "Success isn't given. It's earned in the gym, kitchen, and every choice you make. Fuel your fire today.",
    "The only bad workout is the one that didn't happen. Make today count!",
    "Your body can stand almost anything. It's your mind you have to convince.",
    "Don't stop when you're tired. Stop when you're done.",
    "The pain you feel today will be the strength you feel tomorrow."
];

// Get quote based on day
function getDailyQuote() {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
}

// Update quote
function updateDailyQuote() {
    const quote = getDailyQuote();
    document.getElementById('daily-quote').textContent = quote;
    document.getElementById('notification-quote').textContent = '"' + quote + '"';
}

// Show notification
function showNotification() {
    document.getElementById('notification').classList.add('show');
    setTimeout(closeNotification, 5000);
}

// Close notification
function closeNotification() {
    document.getElementById('notification').classList.remove('show');
}

// Toggle sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.querySelector('.overlay').classList.toggle('show');
}


// Update time
function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    document.getElementById('time').textContent = time;
}

// Custom Workout Quiz Variables
let currentStep = 1;
const totalSteps = 7;
const workoutData = {
    sex: '',
    age: '',
    level: '',
    goal: '',
    style: '',
    days: '',
    duration: '',
    location: '',
    injuries: [],
    injuryNotes: '',
    experience: '',
    music: ''
};

// Complete workout programs data
const workoutPrograms = {
    'beginner': {
        name: 'Beginner Strength Foundation',
        weeks: 12,
        daysPerWeek: 3,
        schedule: {
            'Monday': {
                name: 'Full Body A',
                exercises: [
                    { name: 'Barbell Squat', sets: '3', reps: '8-10', rest: '3 min', suggestedWeight: '95-135', notes: 'Start with just the bar if needed. Focus on depth and form.' },
                    { name: 'Bench Press', sets: '3', reps: '8-10', rest: '3 min', suggestedWeight: '65-95', notes: 'Lower slowly, press explosively. Keep feet flat on floor.' },
                    { name: 'Bent-Over Row', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '65-95', notes: 'Pull to lower chest, squeeze shoulder blades together.' },
                    { name: 'Overhead Press', sets: '3', reps: '8-10', rest: '2 min', suggestedWeight: '45-65', notes: 'Core tight, no arching back. Push straight up.' },
                    { name: 'Romanian Deadlift', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '95-135', notes: 'Feel stretch in hamstrings, maintain flat back.' },
                    { name: 'Plank', sets: '3', reps: '30-60 sec', rest: '1 min', suggestedWeight: 'Bodyweight', notes: 'Keep hips level, breathe normally.' }
                ]
            },
            'Wednesday': {
                name: 'Full Body B',
                exercises: [
                    { name: 'Goblet Squat', sets: '3', reps: '12-15', rest: '2 min', suggestedWeight: '25-50', notes: 'Hold dumbbell at chest, elbows inside knees at bottom.' },
                    { name: 'Dumbbell Press', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '20-40', notes: 'Full range of motion, touch chest at bottom.' },
                    { name: 'Lat Pulldown', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '60-100', notes: 'Pull to upper chest, focus on using lats not arms.' },
                    { name: 'Leg Press', sets: '3', reps: '12-15', rest: '2 min', suggestedWeight: '180-270', notes: 'Full depth, knees tracking over toes.' },
                    { name: 'Dumbbell Curl', sets: '3', reps: '10-12', rest: '90 sec', suggestedWeight: '15-25', notes: 'No swinging, control the negative.' },
                    { name: 'Tricep Pushdown', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '30-50', notes: 'Keep elbows stationary at sides.' }
                ]
            },
            'Friday': {
                name: 'Full Body C',
                exercises: [
                    { name: 'Deadlift', sets: '3', reps: '5-6', rest: '4 min', suggestedWeight: '135-185', notes: 'Most important lift - perfect form essential. Reset each rep.' },
                    { name: 'Incline Dumbbell Press', sets: '3', reps: '8-10', rest: '2 min', suggestedWeight: '25-40', notes: '30-45 degree incline, squeeze at top.' },
                    { name: 'Pull-ups (Assisted)', sets: '3', reps: '6-10', rest: '2 min', suggestedWeight: '-60 to -30', notes: 'Full dead hang to chin over bar.' },
                    { name: 'Walking Lunges', sets: '3', reps: '10 each', rest: '2 min', suggestedWeight: '20-35', notes: 'Big steps, knee to floor, alternate legs.' },
                    { name: 'Face Pulls', sets: '3', reps: '15-20', rest: '90 sec', suggestedWeight: '20-40', notes: 'Pull to face level, hold 1 sec, squeeze rear delts.' },
                    { name: 'Ab Wheel Rollout', sets: '3', reps: '8-12', rest: '90 sec', suggestedWeight: 'Bodyweight', notes: 'Start on knees, go as far as you can control.' }
                ]
            }
        }
    },
    '75hard': {
        name: '75 HARD Challenge',
        weeks: 11,
        daysPerWeek: 14, // Two workouts per day!
        schedule: {
            'Morning': {
                name: 'Outdoor Workout (45 min)',
                exercises: [
                    { name: 'Dynamic Warm-up', sets: '1', reps: '5 min', rest: 'None', suggestedWeight: 'N/A', notes: 'Leg swings, arm circles, light jogging' },
                    { name: 'Running/Walking', sets: '1', reps: '30-35 min', rest: 'As needed', suggestedWeight: 'N/A', notes: 'Maintain steady pace, must be outdoors regardless of weather' },
                    { name: 'Bodyweight Circuit', sets: '3', reps: '30 sec each', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Push-ups, squats, lunges, burpees' },
                    { name: 'Cool-down Stretch', sets: '1', reps: '5 min', rest: 'None', suggestedWeight: 'N/A', notes: 'Full body stretch routine' }
                ]
            },
            'Evening': {
                name: 'Strength Training (45 min)',
                exercises: [
                    { name: 'Compound Lift', sets: '5', reps: '5', rest: '3 min', suggestedWeight: 'Heavy', notes: 'Rotate: Squat, Bench, Deadlift, OHP' },
                    { name: 'Accessory Work 1', sets: '4', reps: '8-10', rest: '2 min', suggestedWeight: 'Moderate', notes: 'Target weak points' },
                    { name: 'Accessory Work 2', sets: '4', reps: '10-12', rest: '90 sec', suggestedWeight: 'Moderate', notes: 'Complementary movement' },
                    { name: 'Core Circuit', sets: '3', reps: '15-20', rest: '45 sec', suggestedWeight: 'Varies', notes: 'Planks, leg raises, Russian twists' },
                    { name: 'Arms Finisher', sets: '3', reps: '12-15', rest: '45 sec', suggestedWeight: 'Light', notes: 'Supersets for pump' }
                ]
            }
        }
    },
    'cbum': {
        name: 'Chris Bumstead Classic Physique',
        weeks: 12,
        daysPerWeek: 6,
        schedule: {
            'Monday': {
                name: 'Chest & Triceps',
                exercises: [
                    { name: 'Incline Barbell Press', sets: '4', reps: '8-10', rest: '3 min', suggestedWeight: '185-225', notes: 'CBum starts with incline for upper chest development' },
                    { name: 'Flat Dumbbell Press', sets: '4', reps: '10-12', rest: '2 min', suggestedWeight: '80-100', notes: 'Squeeze at top, full stretch at bottom' },
                    { name: 'Cable Flyes (High to Low)', sets: '4', reps: '12-15', rest: '90 sec', suggestedWeight: '30-50', notes: 'Focus on the squeeze, constant tension' },
                    { name: 'Machine Press', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: 'Stack', notes: 'Burnout sets, drop set on last' },
                    { name: 'Close-Grip Bench', sets: '4', reps: '10-12', rest: '2 min', suggestedWeight: '135-185', notes: 'Shoulder width grip, elbows tucked' },
                    { name: 'Overhead Cable Extension', sets: '4', reps: '12-15', rest: '90 sec', suggestedWeight: '60-80', notes: 'Keep elbows stationary' },
                    { name: 'Rope Pushdowns', sets: '4', reps: '15-20', rest: '60 sec', suggestedWeight: '50-70', notes: 'Split rope at bottom, squeeze triceps' }
                ]
            },
            'Tuesday': {
                name: 'Back & Biceps',
                exercises: [
                    { name: 'Wide-Grip Pulldowns', sets: '4', reps: '10-12', rest: '2 min', suggestedWeight: '140-180', notes: 'Lean back slightly, pull to upper chest' },
                    { name: 'Bent-Over Barbell Row', sets: '4', reps: '8-10', rest: '3 min', suggestedWeight: '185-225', notes: 'Classic movement, pull to lower chest' },
                    { name: 'T-Bar Row', sets: '4', reps: '10-12', rest: '2 min', suggestedWeight: '90-135', notes: 'V-handle, stay bent over' },
                    { name: 'Cable Row (Wide Grip)', sets: '4', reps: '12-15', rest: '90 sec', suggestedWeight: '140-180', notes: 'Squeeze shoulder blades together' },
                    { name: 'Straight-Arm Pulldown', sets: '3', reps: '15-20', rest: '60 sec', suggestedWeight: '50-70', notes: 'Lats only, no arm bend' },
                    { name: 'Barbell Curl', sets: '4', reps: '8-10', rest: '2 min', suggestedWeight: '80-100', notes: 'Strict form, no swinging' },
                    { name: 'Hammer Curls', sets: '4', reps: '10-12', rest: '90 sec', suggestedWeight: '35-45', notes: 'Alternate arms, control the weight' },
                    { name: 'Cable Curls', sets: '4', reps: '15-20', rest: '60 sec', suggestedWeight: '60-80', notes: 'Constant tension, squeeze at top' }
                ]
            },
            'Wednesday': {
                name: 'Shoulders & Abs',
                exercises: [
                    { name: 'Seated Dumbbell Press', sets: '4', reps: '8-10', rest: '2 min', suggestedWeight: '60-80', notes: 'Full range, control the negative' },
                    { name: 'Lateral Raises', sets: '4', reps: '12-15', rest: '90 sec', suggestedWeight: '20-30', notes: 'Lead with elbows, pause at top' },
                    { name: 'Rear Delt Flyes', sets: '4', reps: '15-20', rest: '60 sec', suggestedWeight: '15-25', notes: 'Bent over or on incline bench' },
                    { name: 'Upright Rows', sets: '4', reps: '10-12', rest: '90 sec', suggestedWeight: '80-100', notes: 'Wide grip, pull to chest level' },
                    { name: 'Cable Laterals', sets: '3', reps: '12-15', rest: '60 sec', suggestedWeight: '15-25', notes: 'Behind the back for constant tension' },
                    { name: 'Hanging Leg Raises', sets: '4', reps: '15-20', rest: '90 sec', suggestedWeight: 'Bodyweight', notes: 'Control the movement, no swinging' },
                    { name: 'Cable Crunches', sets: '4', reps: '20-25', rest: '60 sec', suggestedWeight: '80-100', notes: 'Round the spine, not a hip hinge' },
                    { name: 'Plank Variations', sets: '3', reps: '60 sec', rest: '60 sec', suggestedWeight: 'Bodyweight', notes: 'Standard, side planks, variations' }
                ]
            },
            'Thursday': {
                name: 'Legs (Quad Focus)',
                exercises: [
                    { name: 'Back Squat', sets: '5', reps: '8-10', rest: '3 min', suggestedWeight: '225-315', notes: 'Olympic style, ass to grass' },
                    { name: 'Front Squat', sets: '4', reps: '10-12', rest: '2 min', suggestedWeight: '185-225', notes: 'Clean grip if possible, stay upright' },
                    { name: 'Leg Press', sets: '4', reps: '15-20', rest: '2 min', suggestedWeight: '450-630', notes: 'Feet low and close for quads' },
                    { name: 'Bulgarian Split Squats', sets: '3', reps: '12 each', rest: '90 sec', suggestedWeight: '35-50', notes: 'Rear foot elevated, deep stretch' },
                    { name: 'Leg Extensions', sets: '4', reps: '15-20', rest: '60 sec', suggestedWeight: 'Stack', notes: 'Pause at top, slow negative' },
                    { name: 'Walking Lunges', sets: '3', reps: '20 total', rest: '2 min', suggestedWeight: '45-65', notes: 'Long steps, knee to floor' },
                    { name: 'Calf Raises', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: 'Heavy', notes: 'Full range, pause at top' }
                ]
            },
            'Friday': {
                name: 'Arms & Abs',
                exercises: [
                    { name: 'Close-Grip Bench', sets: '4', reps: '8-10', rest: '2 min', suggestedWeight: '155-205', notes: 'Heavy for mass' },
                    { name: 'Barbell Curl', sets: '4', reps: '8-10', rest: '2 min', suggestedWeight: '80-100', notes: 'Straight bar, full range' },
                    { name: 'Dumbbell Hammer Curls', sets: '4', reps: '10-12', rest: '90 sec', suggestedWeight: '40-50', notes: 'Simultaneous, not alternating' },
                    { name: 'Overhead Dumbbell Extension', sets: '4', reps: '10-12', rest: '90 sec', suggestedWeight: '70-90', notes: 'Single dumbbell, both hands' },
                    { name: 'Cable Curls (21s)', sets: '3', reps: '21', rest: '90 sec', suggestedWeight: '50-70', notes: '7 bottom, 7 top, 7 full' },
                    { name: 'Diamond Push-ups', sets: '3', reps: 'To failure', rest: '90 sec', suggestedWeight: 'Bodyweight', notes: 'Hands form diamond shape' },
                    { name: 'Weighted Crunches', sets: '4', reps: '20-25', rest: '60 sec', suggestedWeight: '25-45', notes: 'Hold plate on chest' },
                    { name: 'Russian Twists', sets: '4', reps: '30 total', rest: '60 sec', suggestedWeight: '25-45', notes: 'Side to side with weight' }
                ]
            },
            'Saturday': {
                name: 'Legs (Ham/Glute Focus)',
                exercises: [
                    { name: 'Romanian Deadlifts', sets: '4', reps: '8-10', rest: '3 min', suggestedWeight: '225-315', notes: 'Feel the stretch, hinge at hips' },
                    { name: 'Lying Leg Curls', sets: '4', reps: '12-15', rest: '90 sec', suggestedWeight: '80-120', notes: 'Point toes down, squeeze glutes' },
                    { name: 'Stiff-Leg Deadlifts', sets: '4', reps: '10-12', rest: '2 min', suggestedWeight: '185-225', notes: 'From deficit if flexible enough' },
                    { name: 'Walking Lunges', sets: '3', reps: '20 total', rest: '2 min', suggestedWeight: '45-65', notes: 'Focus on glute stretch' },
                    { name: 'Good Mornings', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '95-135', notes: 'Light weight, feel hamstrings' },
                    { name: 'Glute Ham Raises', sets: '3', reps: '10-15', rest: '90 sec', suggestedWeight: 'Bodyweight+', notes: 'Use band assist if needed' },
                    { name: 'Seated Calf Raises', sets: '5', reps: '15-20', rest: '45 sec', suggestedWeight: '90-135', notes: 'Pause and squeeze each rep' }
                ]
            }
        }
    },
    'arnold': {
        name: 'Arnold\'s Golden Era Blueprint',
        weeks: 16,
        daysPerWeek: 6,
        schedule: {
            'Monday': {
                name: 'Chest & Back',
                exercises: [
                    { name: 'Bench Press', sets: '5', reps: '6-8', rest: '3 min', suggestedWeight: '225-315', notes: 'Arnold loved heavy bench - pyramid up' },
                    { name: 'Incline Barbell Press', sets: '5', reps: '8-10', rest: '2 min', suggestedWeight: '185-225', notes: '45 degree angle, full range' },
                    { name: 'Dumbbell Flyes', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '50-70', notes: 'Deep stretch, arms slightly bent' },
                    { name: 'Dips', sets: '5', reps: '10-15', rest: '2 min', suggestedWeight: 'BW+45', notes: 'Lean forward for chest' },
                    { name: 'Wide-Grip Pull-ups', sets: '5', reps: '10-12', rest: '2 min', suggestedWeight: 'BW', notes: 'All the way down, chin over bar' },
                    { name: 'T-Bar Rows', sets: '5', reps: '8-10', rest: '2 min', suggestedWeight: '135-225', notes: 'Arnold\'s favorite back builder' },
                    { name: 'Seated Cable Rows', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '150-200', notes: 'Squeeze shoulder blades' },
                    { name: 'Straight-Arm Pullovers', sets: '5', reps: '12-15', rest: '90 sec', suggestedWeight: '80-100', notes: 'Expand the ribcage' }
                ]
            },
            'Tuesday': {
                name: 'Shoulders & Arms',
                exercises: [
                    { name: 'Behind Neck Press', sets: '5', reps: '8-10', rest: '2 min', suggestedWeight: '135-185', notes: 'Only if flexible - ear level' },
                    { name: 'Arnold Press', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '50-70', notes: 'His signature move - full rotation' },
                    { name: 'Lateral Raises', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: '25-35', notes: 'Pour water at the top' },
                    { name: 'Bent-Over Laterals', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: '20-30', notes: 'Rear delts crucial for width' },
                    { name: 'Barbell Curls', sets: '5', reps: '8-10', rest: '90 sec', suggestedWeight: '95-115', notes: 'Cheat curls on last 2-3 reps' },
                    { name: 'Incline Dumbbell Curls', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '30-40', notes: 'Simultaneous, full stretch' },
                    { name: 'Close-Grip Bench', sets: '5', reps: '8-10', rest: '2 min', suggestedWeight: '185-225', notes: 'Hands 6-8 inches apart' },
                    { name: 'Overhead Extensions', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '80-100', notes: 'French press style' },
                    { name: 'Concentration Curls', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: '25-35', notes: 'Peak contraction focus' }
                ]
            },
            'Wednesday': {
                name: 'Legs',
                exercises: [
                    { name: 'Back Squats', sets: '6', reps: '8-12', rest: '3 min', suggestedWeight: '315-405', notes: 'High volume - Arnold did up to 15 sets' },
                    { name: 'Front Squats', sets: '5', reps: '10-12', rest: '2 min', suggestedWeight: '225-275', notes: 'Cross-arm grip acceptable' },
                    { name: 'Leg Press', sets: '5', reps: '15-20', rest: '2 min', suggestedWeight: '630-810', notes: 'Feet together for outer sweep' },
                    { name: 'Leg Extensions', sets: '5', reps: '15-20', rest: '60 sec', suggestedWeight: 'Stack', notes: 'Toes pointed slightly out' },
                    { name: 'Leg Curls', sets: '6', reps: '12-15', rest: '60 sec', suggestedWeight: '80-120', notes: 'Toes pointed in' },
                    { name: 'Stiff-Leg Deadlifts', sets: '5', reps: '10-12', rest: '2 min', suggestedWeight: '225-315', notes: 'Stand on platform for stretch' },
                    { name: 'Standing Calf Raises', sets: '6', reps: '15-20', rest: '45 sec', suggestedWeight: 'Heavy', notes: 'Hold top for 2 seconds' },
                    { name: 'Donkey Calf Raises', sets: '5', reps: '15-20', rest: '45 sec', suggestedWeight: 'Partner', notes: 'Training partner on back' }
                ]
            },
            'Thursday': {
                name: 'Chest & Back',
                exercises: [
                    { name: 'Incline Dumbbell Press', sets: '5', reps: '8-10', rest: '2 min', suggestedWeight: '90-110', notes: 'Different angle than Monday' },
                    { name: 'Flat Dumbbell Press', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '80-100', notes: 'Touch dumbbells at top' },
                    { name: 'Cable Crossovers', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: '50-70', notes: 'High to low for lower chest' },
                    { name: 'Pullovers', sets: '5', reps: '12-15', rest: '90 sec', suggestedWeight: '80-100', notes: 'Cross bench for ribcage expansion' },
                    { name: 'Chin-ups', sets: '5', reps: '10-12', rest: '2 min', suggestedWeight: 'BW+25', notes: 'Underhand grip for biceps too' },
                    { name: 'Bent-Over Barbell Rows', sets: '5', reps: '8-10', rest: '2 min', suggestedWeight: '225-275', notes: 'Pull to stomach, not chest' },
                    { name: 'One-Arm Dumbbell Rows', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '80-100', notes: 'Support on bench, full stretch' },
                    { name: 'Deadlifts', sets: '5', reps: '6-8', rest: '3 min', suggestedWeight: '315-405', notes: 'Reset each rep for power' }
                ]
            },
            'Friday': {
                name: 'Shoulders & Arms',
                exercises: [
                    { name: 'Military Press', sets: '5', reps: '8-10', rest: '2 min', suggestedWeight: '135-185', notes: 'Strict form, no leg drive' },
                    { name: 'Dumbbell Press', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '60-80', notes: 'Seated with back support' },
                    { name: 'Cable Laterals', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: '20-30', notes: 'One arm at a time' },
                    { name: 'Upright Rows', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '95-115', notes: 'Wide grip to ear level' },
                    { name: 'Preacher Curls', sets: '5', reps: '8-10', rest: '90 sec', suggestedWeight: '70-90', notes: 'EZ-bar, full extension' },
                    { name: 'Cable Curls', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: '70-90', notes: 'Rope attachment for peak' },
                    { name: 'Lying Tricep Extension', sets: '5', reps: '10-12', rest: '90 sec', suggestedWeight: '80-100', notes: 'To forehead, not behind head' },
                    { name: 'Cable Pushdowns', sets: '5', reps: '12-15', rest: '60 sec', suggestedWeight: '70-90', notes: 'V-bar, lock out fully' },
                    { name: 'Wrist Curls', sets: '4', reps: '15-20', rest: '45 sec', suggestedWeight: '45-65', notes: 'Forearms on bench' }
                ]
            },
            'Saturday': {
                name: 'Legs',
                exercises: [
                    { name: 'Hack Squats', sets: '5', reps: '10-12', rest: '2 min', suggestedWeight: '315-405', notes: 'Feet low on platform' },
                    { name: 'Lunges', sets: '5', reps: '12 each', rest: '2 min', suggestedWeight: '95-135', notes: 'Barbell on back, alternating' },
                    { name: 'Leg Press', sets: '5', reps: '20-25', rest: '2 min', suggestedWeight: '540-720', notes: 'Wide stance this time' },
                    { name: 'Single Leg Curls', sets: '5', reps: '12-15', rest: '45 sec', suggestedWeight: '40-60', notes: 'Focus on contraction' },
                    { name: 'Romanian Deadlifts', sets: '5', reps: '10-12', rest: '2 min', suggestedWeight: '225-315', notes: 'Dumbbells for variation' },
                    { name: 'Walking Lunges', sets: '3', reps: '50 total', rest: '3 min', suggestedWeight: '45-65', notes: 'Burnout finisher' },
                    { name: 'Seated Calf Raises', sets: '6', reps: '20-25', rest: '45 sec', suggestedWeight: '90-135', notes: 'Slow negatives' },
                    { name: 'Calf Press on Leg Press', sets: '5', reps: '15-20', rest: '45 sec', suggestedWeight: '270-360', notes: 'Full range of motion' }
                ]
            }
        }
    },
    'chloe': {
        name: 'Chloe Ting Summer Shred',
        weeks: 4,
        daysPerWeek: 6,
        schedule: {
            'Monday': {
                name: 'Abs & Core Killer',
                exercises: [
                    { name: 'Dead Bug', sets: '3', reps: '10 each side', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Slow and controlled, core engaged' },
                    { name: 'Bicycle Crunches', sets: '3', reps: '20 each side', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Touch elbow to opposite knee' },
                    { name: 'Russian Twists', sets: '3', reps: '20 each side', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Lean back, twist with control' },
                    { name: 'Plank', sets: '3', reps: '30-60 sec', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Keep hips level, breathe normally' },
                    { name: 'Mountain Climbers', sets: '3', reps: '20 each leg', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Drive knees to chest quickly' },
                    { name: 'Reverse Crunches', sets: '3', reps: '15-20', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Pull knees to chest' },
                    { name: 'Flutter Kicks', sets: '3', reps: '20 each leg', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Small, quick kicks' }
                ]
            },
            'Tuesday': {
                name: 'Full Body Tone',
                exercises: [
                    { name: 'Squat Pulses', sets: '3', reps: '15-20', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Small pulses at bottom of squat' },
                    { name: 'Push-ups', sets: '3', reps: '10-15', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Knee variation if needed' },
                    { name: 'Lunge Pulses', sets: '3', reps: '15 each leg', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Stay low, pulse up and down' },
                    { name: 'Tricep Dips', sets: '3', reps: '10-15', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Use chair or bench' },
                    { name: 'Glute Bridges', sets: '3', reps: '15-20', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Squeeze glutes at top' },
                    { name: 'Burpees', sets: '3', reps: '5-10', rest: '45 sec', suggestedWeight: 'Bodyweight', notes: 'Full body movement' }
                ]
            },
            'Wednesday': {
                name: 'Lower Body Shred',
                exercises: [
                    { name: 'Squats', sets: '4', reps: '15-20', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Deep squat, chest up' },
                    { name: 'Jumping Lunges', sets: '3', reps: '10 each leg', rest: '45 sec', suggestedWeight: 'Bodyweight', notes: 'Explosive jump between legs' },
                    { name: 'Wall Sit', sets: '3', reps: '30-60 sec', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Back against wall, thighs parallel' },
                    { name: 'Calf Raises', sets: '3', reps: '20-25', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Rise up on toes, hold briefly' },
                    { name: 'Single Leg Glute Bridges', sets: '3', reps: '10 each leg', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'One leg extended, bridge with other' },
                    { name: 'Jump Squats', sets: '3', reps: '10-15', rest: '45 sec', suggestedWeight: 'Bodyweight', notes: 'Explosive jump from squat' }
                ]
            }
        }
    },
    'amateur': {
        name: 'Amateur Strength Foundation',
        weeks: 16,
        daysPerWeek: 4,
        schedule: {
            'Monday': {
                name: 'Chest & Triceps',
                exercises: [
                    { name: 'Bench Press', sets: '4', reps: '8-10', rest: '3 min', suggestedWeight: '135-185', notes: 'Compound movement - focus on form over weight' },
                    { name: 'Incline Dumbbell Press', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '35-55', notes: 'Upper chest focus, 30-45 degree incline' },
                    { name: 'Dumbbell Flyes', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '20-35', notes: 'Stretch and squeeze, control the weight' },
                    { name: 'Tricep Dips', sets: '3', reps: '10-15', rest: '90 sec', suggestedWeight: 'Bodyweight', notes: 'Use dip bar or bench, full range of motion' },
                    { name: 'Close-Grip Bench Press', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '95-135', notes: 'Hands shoulder-width apart, elbows tucked' },
                    { name: 'Overhead Cable Extension', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '50-70', notes: 'Keep elbows stationary, full extension' }
                ]
            },
            'Tuesday': {
                name: 'Back & Biceps',
                exercises: [
                    { name: 'Deadlifts', sets: '4', reps: '6-8', rest: '3 min', suggestedWeight: '185-225', notes: 'King of exercises - perfect form essential' },
                    { name: 'Pull-ups/Lat Pulldowns', sets: '3', reps: '8-12', rest: '2 min', suggestedWeight: '100-140', notes: 'Wide grip, pull to upper chest' },
                    { name: 'Bent-Over Rows', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '115-155', notes: 'Pull to lower chest, squeeze shoulder blades' },
                    { name: 'Cable Rows', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '100-140', notes: 'Sit tall, pull to abdomen' },
                    { name: 'Barbell Curls', sets: '3', reps: '10-12', rest: '90 sec', suggestedWeight: '60-85', notes: 'Strict form, no swinging' },
                    { name: 'Hammer Curls', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '25-40', notes: 'Neutral grip, control the weight' }
                ]
            },
            'Thursday': {
                name: 'Legs & Glutes',
                exercises: [
                    { name: 'Squats', sets: '4', reps: '10-12', rest: '3 min', suggestedWeight: '155-205', notes: 'Below parallel, chest up, knees track over toes' },
                    { name: 'Romanian Deadlifts', sets: '3', reps: '12-15', rest: '2 min', suggestedWeight: '115-155', notes: 'Hip hinge, feel stretch in hamstrings' },
                    { name: 'Leg Press', sets: '3', reps: '15-20', rest: '2 min', suggestedWeight: '270-360', notes: 'Full range of motion, controlled descent' },
                    { name: 'Walking Lunges', sets: '3', reps: '10 each leg', rest: '90 sec', suggestedWeight: '25-40', notes: 'Big steps, knee to floor, alternate legs' },
                    { name: 'Leg Curls', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '70-100', notes: 'Hamstring isolation, control the negative' },
                    { name: 'Calf Raises', sets: '4', reps: '15-20', rest: '90 sec', suggestedWeight: '45-90', notes: 'Full range of motion, pause at top' }
                ]
            },
            'Friday': {
                name: 'Shoulders & Core',
                exercises: [
                    { name: 'Overhead Press', sets: '4', reps: '8-10', rest: '3 min', suggestedWeight: '85-115', notes: 'Core tight, press straight up, no back arch' },
                    { name: 'Lateral Raises', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '15-25', notes: 'Lead with elbows, slight forward lean' },
                    { name: 'Rear Delt Flyes', sets: '3', reps: '15-20', rest: '90 sec', suggestedWeight: '10-20', notes: 'Bent over, squeeze shoulder blades' },
                    { name: 'Upright Rows', sets: '3', reps: '12-15', rest: '90 sec', suggestedWeight: '65-95', notes: 'Wide grip, pull to chest level' },
                    { name: 'Plank', sets: '3', reps: '45-90 sec', rest: '90 sec', suggestedWeight: 'Bodyweight', notes: 'Keep hips level, breathe normally' },
                    { name: 'Hanging Leg Raises', sets: '3', reps: '10-15', rest: '90 sec', suggestedWeight: 'Bodyweight', notes: 'Control the swing, use abs not momentum' }
                ]
            }
        }
    }
};

// Workout information data
const workoutInfo = {
    'beginner': {
        name: 'Beginner Strength Foundation',
        creator: 'FuelFire Team',
        duration: '12 Weeks',
        difficulty: 'BEGINNER',
        type: 'Strength Building',
        description: 'The perfect starting point for your fitness journey. This program uses a full body approach to ease you into strength training without overwhelming your muscles or nervous system. By training all major muscle groups each session with moderate volume, you\'ll build strength safely while allowing adequate recovery between workouts. Designed specifically for those new to weight training.',
        requirements: [
            'No prior weightlifting experience needed',
            '3 days per week commitment',
            '45-60 minutes per session',
            'Access to basic gym equipment',
            'Willingness to learn proper form',
            'Patience for progressive development'
        ],
        weeklySchedule: `
            Monday: Full Body A
            Tuesday: Rest or Light Cardio
            Wednesday: Full Body B
            Thursday: Rest or Light Cardio
            Friday: Full Body C
            Saturday: Rest or Active Recovery
            Sunday: Rest
        `,
        equipment: 'Basic gym access - barbells, dumbbells, bench, pull-up bar (assisted), machines',
        idealFor: 'Complete beginners wanting to build muscle safely with proper form and progressive overload',
        warnings: [
            'Start with light weights to master form',
            'Don\'t rush progression - consistency is key',
            'Focus on compound movements first',
            'Consider working with a trainer initially'
        ]
    },
    '75hard': {
        name: '75 HARD Challenge',
        creator: 'Andy Frisella',
        duration: '75 Days',
        difficulty: 'EXTREME',
        type: 'Mental Toughness',
        description: '75 HARD is not a fitness challenge - it\'s a mental toughness program designed to help you take complete control of your life. No compromises, no substitutions, no excuses.',
        requirements: [
            'Follow a diet (your choice, but it must be a structured eating plan)',
            'Complete TWO 45-minute workouts per day (one must be outside)',
            'Drink 1 gallon of water',
            'Read 10 pages of a non-fiction book',
            'Take a progress photo',
            'No alcohol or cheat meals'
        ],
        weeklySchedule: 'Every single day for 75 days - no days off, no exceptions. If you miss any task, you start over at day 1.',
        equipment: 'Varies based on workout choice - can be done with bodyweight only',
        idealFor: 'People ready for extreme mental and physical transformation who can commit 3+ hours daily',
        warnings: [
            'This is an extreme program - consult a doctor before starting',
            'Very high time commitment required',
            'Zero flexibility - missing one task means starting over',
            'Not recommended for beginners'
        ]
    },
    'cbum': {
        name: 'Chris Bumstead\'s Classic Physique',
        creator: 'Chris Bumstead',
        duration: '12 Weeks',
        difficulty: 'ADVANCED',
        type: 'Bodybuilding',
        description: 'The exact training split used by 5x Classic Physique Mr. Olympia Chris Bumstead. Focus on aesthetics, proportion, and the golden era physique.',
        requirements: [
            'Full gym access with free weights and machines',
            '6 days per week commitment',
            '90-120 minutes per session',
            'Advanced training experience',
            'Strict nutrition adherence'
        ],
        weeklySchedule: `
            Monday: Chest & Triceps
            Tuesday: Back & Biceps
            Wednesday: Shoulders & Abs
            Thursday: Legs (Quad Focus)
            Friday: Arms & Abs
            Saturday: Legs (Hamstring/Glute Focus)
            Sunday: Rest
        `,
        equipment: 'Full gym required - barbells, dumbbells, cables, machines',
        idealFor: 'Advanced lifters wanting to build a classic, aesthetic physique with perfect proportions',
        warnings: [
            'Very high volume - not for beginners',
            'Requires significant recovery capacity',
            'Diet is crucial for results'
        ]
    },
    'summershred': {
        name: 'Summer Shred Challenge',
        creator: 'FuelFire Team',
        duration: '8 Weeks',
        difficulty: 'INTERMEDIATE',
        type: 'Fat Loss',
        description: 'Get beach-ready in 8 weeks! Combines strength training, HIIT cardio, and a structured nutrition plan for maximum fat loss while maintaining muscle.',
        requirements: [
            'Gym or home gym access',
            '5 days per week training',
            '45-60 minutes per session',
            'Calorie tracking',
            'Weekly progress photos'
        ],
        weeklySchedule: `
            Monday: Upper Body Strength + HIIT
            Tuesday: Lower Body Strength
            Wednesday: Core & Cardio
            Thursday: Full Body Circuit
            Friday: Upper Body Volume + HIIT
            Saturday: Active Recovery (Optional)
            Sunday: Rest
        `,
        equipment: 'Dumbbells, resistance bands, pull-up bar (modifications available)',
        idealFor: 'Anyone wanting to lose 10-20 lbs and get lean for summer',
        warnings: [
            'Requires caloric deficit - may affect energy',
            'High intensity - proper form crucial',
            'Results depend heavily on nutrition compliance'
        ]
    },
    'arnold': {
        name: 'Arnold\'s Golden Era Blueprint',
        creator: 'Arnold Schwarzenegger',
        duration: '16 Weeks',
        difficulty: 'ELITE',
        type: 'Mass Building',
        description: 'The legendary high-volume training approach that built 7x Mr. Olympia Arnold Schwarzenegger. Based on the golden era of bodybuilding, this program emphasizes shocking the muscles with intense volume and variety.',
        requirements: [
            'Full gym access with extensive equipment',
            '6 days per week commitment',
            '2-3 hours per session',
            'Years of training experience',
            'Ability to recover from extreme volume',
            'Partner for forced reps (recommended)'
        ],
        weeklySchedule: `
            Monday AM: Chest & Back
            Monday PM: Legs
            Tuesday AM: Shoulders & Arms
            Tuesday PM: Calves & Abs
            Wednesday: Chest & Back
            Thursday AM: Shoulders & Arms
            Thursday PM: Legs
            Friday: Chest & Back
            Saturday: Shoulders & Arms
            Sunday: Rest
        `,
        equipment: 'Full gym with barbells, dumbbells, cables, machines, dipping station, pull-up bars',
        idealFor: 'Elite bodybuilders wanting maximum muscle mass using old-school high-volume techniques',
        warnings: [
            'Extremely high volume - risk of overtraining',
            'Not suitable for natural lifters without excellent recovery',
            'Requires 4-6 hours daily gym commitment',
            'Joint stress from heavy weights and high volume'
        ]
    },
    'ronnie': {
        name: 'Ronnie Coleman\'s Power Building',
        creator: 'Ronnie Coleman',
        duration: '12 Weeks',
        difficulty: 'EXTREME',
        type: 'Power Bodybuilding',
        description: 'The training style of 8x Mr. Olympia Ronnie Coleman - combining powerlifting strength with bodybuilding volume. Famous for lifting extremely heavy weights for high reps. "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights!"',
        requirements: [
            'Full powerlifting/bodybuilding gym',
            '6 days per week',
            '90-120 minutes per session',
            'Expert-level form on all lifts',
            'Spotter for heavy sets',
            'Years of progressive strength training'
        ],
        weeklySchedule: `
            Monday: Back & Biceps (Heavy)
            Tuesday: Chest & Triceps (Heavy)
            Wednesday: Legs (Heavy)
            Thursday: Shoulders & Traps
            Friday: Back & Biceps (Volume)
            Saturday: Chest & Triceps (Volume)
            Sunday: Rest
        `,
        equipment: 'Power rack, heavy barbells (up to 800+ lbs), dumbbells up to 200 lbs, leg press, hack squat',
        idealFor: 'Advanced lifters who want to combine maximum strength with maximum size',
        warnings: [
            'Extremely heavy weights - high injury risk',
            'Requires perfect form and years of experience',
            'Not sustainable long-term without deload phases',
            'May require joint support supplements',
            'Professional spotters recommended'
        ]
    },
    'dorian': {
        name: 'Dorian Yates HIT Training',
        creator: 'Dorian Yates',
        duration: '10 Weeks',
        difficulty: 'ADVANCED',
        type: 'High Intensity Training',
        description: 'The revolutionary HIT (High Intensity Training) approach used by 6x Mr. Olympia Dorian Yates. Short, brutal workouts with maximum intensity and perfect form. Quality over quantity - train to absolute failure and beyond.',
        requirements: [
            'Full gym access',
            '4 days per week',
            '45-60 minutes per session',
            'Ability to train to true failure',
            'Training partner for forced reps',
            'Mental toughness for extreme intensity'
        ],
        weeklySchedule: `
            Monday: Chest & Biceps
            Tuesday: Legs
            Wednesday: Rest
            Thursday: Shoulders & Triceps
            Friday: Back
            Saturday: Rest
            Sunday: Rest
        `,
        equipment: 'Full gym with machines (Nautilus preferred), cables, free weights',
        idealFor: 'Busy professionals who want maximum results in minimum time with ultra-high intensity',
        warnings: [
            'Requires 100% mental and physical effort',
            'Easy to overtrain if not careful',
            'Form must be perfect to avoid injury',
            'Not for those who can\'t push to true failure'
        ]
    },
    'marathon': {
        name: 'Boston Marathon Qualifier Program',
        creator: 'Elite Running Coaches',
        duration: '18 Weeks',
        difficulty: 'ADVANCED',
        type: 'Endurance Running',
        description: 'A comprehensive 18-week program designed to help you achieve a Boston Marathon qualifying time. Incorporates progressive mileage, speed work, tempo runs, and race-pace training.',
        requirements: [
            'Already running 25+ miles per week',
            'Can run a half marathon under 2 hours',
            '6-7 days per week availability',
            'Access to track for speed work',
            'Heart rate monitor recommended',
            'Quality running shoes (2-3 pairs)'
        ],
        weeklySchedule: `
            Monday: Easy Recovery Run (6-8 miles)
            Tuesday: Track Speed Work (8-10 miles total)
            Wednesday: Medium Run (8-10 miles)
            Thursday: Tempo Run (6-8 miles)
            Friday: Rest or Easy 4 miles
            Saturday: Long Run (14-22 miles)
            Sunday: Recovery Run (6-8 miles)
        `,
        equipment: 'Running shoes, GPS watch, heart rate monitor, foam roller, hydration system',
        idealFor: 'Experienced runners aiming for Boston qualifying times (sub-3:00 for men 18-34, varies by age/gender)',
        warnings: [
            'High mileage increases injury risk',
            'Requires 8-12 hours per week',
            'Weather can significantly impact training',
            'Proper nutrition and recovery essential',
            'May need gait analysis to prevent injury'
        ]
    },
    'kayla': {
        name: 'Kayla Itsines BBG Stronger',
        creator: 'Kayla Itsines',
        duration: '12 Weeks',
        difficulty: 'INTERMEDIATE',
        type: 'HIIT & Strength',
        description: 'The world-famous Bikini Body Guide that has transformed millions of women. Combines resistance training with high-intensity cardio in quick, effective workouts. Focus on building strength, endurance, and confidence.',
        requirements: [
            '3-4 days per week',
            '28 minutes per resistance session',
            '35-45 minutes for cardio sessions',
            'Basic equipment or gym access',
            'Ability to perform high-intensity intervals',
            'Commitment to nutrition guidelines'
        ],
        weeklySchedule: `
            Monday: Legs & Cardio (28 min resistance + 15 min LISS)
            Tuesday: Arms & Abs (28 min resistance)
            Wednesday: LISS Cardio (35-45 min)
            Thursday: Full Body (28 min resistance)
            Friday: HIIT Cardio (15-20 min)
            Saturday: Full Body (28 min) or Rest
            Sunday: Rest or LISS
        `,
        equipment: 'Dumbbells (2 sets), bench/chair, jump rope, exercise mat, resistance bands (optional)',
        idealFor: 'Women wanting to build lean muscle, lose fat, and develop sustainable fitness habits',
        warnings: [
            'High intensity may be challenging for beginners',
            'Jumping exercises require good knees',
            'Results heavily dependent on nutrition',
            'May need modifications for injuries'
        ]
    },
    'goggins': {
        name: 'David Goggins Ultra Training',
        creator: 'David Goggins',
        duration: 'Ongoing',
        difficulty: 'SAVAGE',
        type: 'Mental & Physical',
        description: 'Train like the toughest man alive. This isn\'t just a workout program - it\'s a complete mental transformation. Push past your perceived limits and callous your mind through extreme physical challenges.',
        requirements: [
            'Unbreakable mental commitment',
            'Ability to embrace suffering',
            'Time for multiple daily workouts',
            'Running shoes and basic equipment',
            'Medical clearance for extreme training',
            'Recovery tools (ice baths, stretching)'
        ],
        weeklySchedule: `
            Daily Requirements:
            - 4:30 AM wake up
            - Morning run (6-15 miles)
            - Stretching routine (1-2 hours)
            - Strength training or calisthenics
            - Evening cardio session
            - Cold exposure/ice bath
            - No days off when building calluses
        `,
        equipment: 'Running shoes, pull-up bar, basic weights, jump rope, bike (optional)',
        idealFor: 'Those ready to discover what they\'re truly capable of - mental toughness seekers',
        warnings: [
            'Extreme volume can lead to overuse injuries',
            'Not sustainable without progressive build-up',
            'Requires total lifestyle commitment',
            'Mental stress can be overwhelming',
            'Recovery is absolutely critical'
        ]
    },
    'chloe': {
        name: 'Chloe Ting Summer Shred',
        creator: 'Chloe Ting',
        duration: '8 Weeks',
        difficulty: 'INTERMEDIATE',
        type: 'Fat Loss & Toning',
        description: 'Get ready for summer with this popular fat-burning program! Combines HIIT workouts, targeted abs training, and full-body circuits designed to help you lose weight and tone up. Perfect for home workouts with minimal equipment.',
        requirements: [
            'No gym required - home friendly',
            '5-6 days per week',
            '30-45 minutes per session',
            'Basic equipment (mat, water bottle)',
            'Commitment to nutrition plan',
            'Progress photos recommended'
        ],
        weeklySchedule: `
            Monday: Full Body HIIT
            Tuesday: Targeted Abs & Core
            Wednesday: Lower Body Burn
            Thursday: Upper Body & Arms
            Friday: Full Body Fat Burn
            Saturday: Abs & Cardio Combo
            Sunday: Rest or Active Recovery
        `,
        equipment: 'Exercise mat, water bottle, optional: light dumbbells, resistance bands',
        idealFor: 'Anyone wanting to lose weight and tone up from home with fun, effective workouts',
        warnings: [
            'High intensity - start slow if needed',
            'Proper form crucial to avoid injury',
            'Results depend on nutrition compliance',
            'May need modifications for beginners'
        ]
    },
    'amateur': {
        name: 'Amateur Strength Foundation',
        creator: 'Amateur Strength Foundation',
        duration: '12 Weeks',
        difficulty: 'INTERMEDIATE',
        type: 'Strength Building',
        description: 'A well-rounded 4-day split program focusing on compound movements and progressive overload. Each workout targets two major muscle groups with optimal volume for strength and muscle building. Perfect for intermediate lifters wanting consistent progress.',
        requirements: [
            'Basic gym access required',
            '4 days per week commitment',
            '60-90 minutes per session',
            '6+ months lifting experience',
            'Knowledge of compound movements',
            'Consistent nutrition plan'
        ],
        weeklySchedule: `
            Monday: Chest & Triceps
            Tuesday: Back & Biceps
            Wednesday: Rest or Light Cardio
            Thursday: Shoulders & Abs
            Friday: Legs & Glutes
            Saturday: Rest or Active Recovery
            Sunday: Rest
        `,
        equipment: 'Full gym access - barbells, dumbbells, cable machines, leg press, bench',
        idealFor: 'Intermediate lifters wanting structured progression in strength and muscle building',
        warnings: [
            'Requires proper form on compound lifts',
            'Progressive overload is essential',
            'May need deload weeks for recovery',
            'Nutrition timing affects results'
        ]
    }
};

// Show workout information
function showWorkoutInfo(workoutId) {
    const info = workoutInfo[workoutId];
    if (!info) return;
    
    let infoHTML = `
        <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">${info.name}</h2>
            <p style="opacity: 0.9;">by ${info.creator}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 25px;">
            <div style="background: var(--card-bg); padding: 15px; border-radius: 15px; text-align: center;">
                <div style="color: var(--primary-dark); font-size: 14px;">Duration</div>
                <div style="font-weight: bold; font-size: 18px; color: var(--dark);">${info.duration}</div>
            </div>
            <div style="background: var(--card-bg); padding: 15px; border-radius: 15px; text-align: center;">
                <div style="color: var(--primary-dark); font-size: 14px;">Difficulty</div>
                <div style="font-weight: bold; font-size: 18px; color: var(--dark);">${info.difficulty}</div>
            </div>
            <div style="background: var(--card-bg); padding: 15px; border-radius: 15px; text-align: center;">
                <div style="color: var(--primary-dark); font-size: 14px;">Type</div>
                <div style="font-weight: bold; font-size: 18px; color: var(--dark);">${info.type}</div>
            </div>
        </div>
        
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">📝 Overview</h3>
            <p style="color: #666; line-height: 1.6;">${info.description}</p>
        </div>
        
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">✅ Requirements</h3>
            <ul style="color: #666; padding-left: 20px;">
                ${info.requirements.map(req => `<li style="margin-bottom: 8px;">${req}</li>`).join('')}
            </ul>
        </div>
        
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">📅 Weekly Schedule</h3>
            <div style="display: grid; gap: 8px;">
                ${info.weeklySchedule.trim().split('\n').map(day => {
                    if (day.includes(':')) {
                        const [dayName, workout] = day.split(':');
                        return `
                            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 10px; background: var(--lighter-bg); border-radius: 12px;">
                                <div style="font-weight: bold; color: var(--primary-dark);">${dayName.trim()}</div>
                                <div style="color: #666;">${workout.trim()}</div>
                            </div>
                        `;
                    } else {
                        return `<div style="color: #666; padding: 10px;">${day}</div>`;
                    }
                }).join('')}
            </div>
        </div>
        
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">🏋️ Equipment Needed</h3>
            <p style="color: #666;">${info.equipment}</p>
        </div>
        
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">🎯 Ideal For</h3>
            <p style="color: #666;">${info.idealFor}</p>
        </div>
        
        ${info.warnings ? `
        <div style="background: #fff3e0; padding: 25px; border-radius: 20px;">
            <h3 style="color: #f57c00; margin-bottom: 15px;">⚠️ Important Considerations</h3>
            <ul style="color: #666; padding-left: 20px;">
                ${info.warnings.map(warning => `<li style="margin-bottom: 8px;">${warning}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    `;
    
    document.getElementById('workout-info-content').innerHTML = infoHTML;
    document.getElementById('workout-info').style.display = 'block';
    
    // Store current workout for saving
    window.currentWorkoutInfo = {
        id: workoutId,
        ...info
    };
}

// Close workout info
function closeWorkoutInfo() {
    document.getElementById('workout-info').style.display = 'none';
}

// Add to saved workouts
function addToSavedWorkouts() {
    if (!window.currentWorkoutInfo) return;
    
    // Get existing saved workouts
    let savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    
    // Check if already saved
    if (savedWorkouts.some(w => w.id === window.currentWorkoutInfo.id)) {
        alert('This workout is already in your saved workouts!');
        return;
    }
    
    // Check limit
    if (savedWorkouts.length >= 3) {
        const confirmDelete = confirm(
            'You already have 3 saved workouts (maximum limit).\n\n' +
            'Would you like to delete your oldest workout to save this one?'
        );
        
        if (confirmDelete) {
            savedWorkouts.shift();
        } else {
            alert('Workout not saved. Please delete a workout from your Saved Workouts page first.');
            return;
        }
    }
    
    // Add workout
    savedWorkouts.push({
        ...window.currentWorkoutInfo,
        savedAt: new Date().toISOString(),
        type: 'preset'
    });
    
    localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
    alert('Workout saved successfully! 💪');
    closeWorkoutInfo();
}

// Start custom workout questionnaire
function startCustomWorkout() {
    document.getElementById('custom-workout-quiz').style.display = 'block';
    currentStep = 1;
    updateQuizProgress();
}

// Close custom workout
function closeCustomWorkout() {
    document.getElementById('custom-workout-quiz').style.display = 'none';
    document.getElementById('generating-workout').style.display = 'none';
}

// Select option in quiz
function selectOption(button, field, value) {
    // Remove selected class from siblings
    const parent = button.parentElement;
    parent.querySelectorAll('.quiz-select-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    button.classList.add('selected');
    
    // Store the value
    workoutData[field] = value;
}

// Navigate quiz
function nextQuestion() {
    // Validate current step
    if (currentStep === 1) {
        workoutData.age = document.getElementById('age-input').value;
        if (!workoutData.sex || !workoutData.age || !workoutData.level) {
            alert('Please complete all fields');
            return;
        }
    }
    
    if (currentStep === 6) {
        workoutData.injuryNotes = 'User injuries: ' + workoutData.injuries.join(', ');
    }
    
    if (currentStep === 7) {
        workoutData.experience = document.getElementById('experience').value;
        workoutData.workoutName = document.getElementById('workout-name').value || 'My Custom Workout';
        generateWorkout();
        return;
    }
    
    // Move to next step
    document.querySelector(`[data-step="${currentStep}"]`).style.display = 'none';
    currentStep++;
    document.querySelector(`[data-step="${currentStep}"]`).style.display = 'block';
    
    updateQuizProgress();
}

function previousQuestion() {
    if (currentStep > 1) {
        document.querySelector(`[data-step="${currentStep}"]`).style.display = 'none';
        currentStep--;
        document.querySelector(`[data-step="${currentStep}"]`).style.display = 'block';
        updateQuizProgress();
    }
}

function updateQuizProgress() {
    document.getElementById('quiz-step').textContent = currentStep;
    document.getElementById('quiz-progress').style.width = `${(currentStep / totalSteps) * 100}%`;
    
    // Show/hide back button
    document.getElementById('quiz-back-btn').style.display = currentStep > 1 ? 'block' : 'none';
    
    // Change next button text on last step
    document.getElementById('quiz-next-btn').textContent = currentStep === 7 ? 'Generate Workout 🚀' : 'Next →';
}

// Update injuries
function updateInjuries(checkbox, injury) {
    if (injury === 'none' && checkbox.checked) {
        // Uncheck all other injury checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
        workoutData.injuries = [];
    } else {
        // Uncheck "no injuries" if selecting an injury
        const noInjuryCheckbox = document.querySelector('input[onchange*="none"]');
        if (noInjuryCheckbox && checkbox !== noInjuryCheckbox) {
            noInjuryCheckbox.checked = false;
        }
        
        // Update injuries array
        if (checkbox.checked) {
            workoutData.injuries.push(injury);
        } else {
            workoutData.injuries = workoutData.injuries.filter(i => i !== injury);
        }
    }
}

// Generate workout with AI
async function generateWorkout() {
    document.getElementById('custom-workout-quiz').style.display = 'none';
    document.getElementById('generating-workout').style.display = 'block';
    
    // Update status
    document.getElementById('generating-status').textContent = 'Preparing your workout data...';
    
    try {
        // Option 1: Direct API call to your backend
        // const response = await fetch('YOUR_BACKEND_API_ENDPOINT/generate-workout', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify(workoutData)
        // });
        
        // const generatedWorkout = await response.json();
        // displayGeneratedWorkout(generatedWorkout);
        
        // Option 2: For demo/testing - simulate AI generation
        simulateAIGeneration();
        
    } catch (error) {
        console.error('Error generating workout:', error);
        alert('Error generating workout. Please try again.');
        document.getElementById('generating-workout').style.display = 'none';
        document.getElementById('custom-workout-quiz').style.display = 'block';
    }
}

// Simulated AI generation (replace with real API call)
function simulateAIGeneration() {
    const statuses = [
        'Analyzing your fitness profile...',
        'Considering your goals and preferences...',
        'Adjusting for injury prevention...',
        'Optimizing workout split...',
        'Finalizing your custom program...'
    ];
    
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
        if (statusIndex < statuses.length) {
            document.getElementById('generating-status').textContent = statuses[statusIndex];
            statusIndex++;
        } else {
            clearInterval(statusInterval);
            displayGeneratedWorkout();
        }
    }, 600);
}

// Display the generated workout
function displayGeneratedWorkout() {
    setTimeout(() => {
        document.getElementById('generating-workout').style.display = 'none';
        document.getElementById('generated-workout').style.display = 'block';
        
        // Generate workout content based on user data
        const workoutPlan = createWorkoutPlan();
        document.getElementById('workout-plan-content').innerHTML = workoutPlan;
    }, 3000);
}

// Create workout plan based on user data
function createWorkoutPlan() {
    const { sex, age, level, goal, style, days, duration, location, injuries, workoutName } = workoutData;
    
    let planHTML = `
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 20px;">${workoutName}</h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                    <div style="color: var(--primary-dark); font-size: 14px;">Duration</div>
                    <div style="font-weight: bold; font-size: 18px;">${duration} min/day</div>
                </div>
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                    <div style="color: var(--primary-dark); font-size: 14px;">Frequency</div>
                    <div style="font-weight: bold; font-size: 18px;">${days} days/week</div>
                </div>
            </div>
    `;
    
    // Generate weekly split
    planHTML += `
        <h4 style="color: var(--dark); margin-bottom: 15px;">Your Weekly Schedule</h4>
        <div style="display: grid; gap: 10px;">
    `;
    
    if (days === '3') {
        planHTML += `
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Monday:</strong> ${goal === 'muscle' ? 'Full Body Strength' : 'Total Body Circuit'}
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Wednesday:</strong> ${goal === 'muscle' ? 'Upper Body Focus' : 'Cardio & Core'}
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Friday:</strong> ${goal === 'muscle' ? 'Lower Body & Core' : 'HIIT & Strength'}
            </div>
        `;
    } else if (days === '4') {
        planHTML += `
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Monday:</strong> Upper Body Push
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Tuesday:</strong> Lower Body
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Thursday:</strong> Upper Body Pull
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Friday:</strong> Full Body Circuit
            </div>
        `;
    } else if (days === '5') {
        planHTML += `
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Monday:</strong> Upper Push
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Tuesday:</strong> Lower Body
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Wednesday:</strong> Upper Pull
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Friday:</strong> Lower Body
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Saturday:</strong> Full Body/Conditioning
            </div>
        `;
    } else if (days === '6') {
        planHTML += `
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Monday:</strong> Push (Chest, Shoulders, Triceps)
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Tuesday:</strong> Pull (Back, Biceps)
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Wednesday:</strong> Legs & Core
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Thursday:</strong> Push (Volume)
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Friday:</strong> Pull (Volume)
            </div>
            <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                <strong>Saturday:</strong> Legs & Conditioning
            </div>
        `;
    }
    
    planHTML += '</div>';
    
    // Add injury modifications if needed
    if (injuries.length > 0 && !injuries.includes('none')) {
        planHTML += `
            <div style="background: #fff3e0; padding: 20px; border-radius: 15px; margin-top: 20px;">
                <h4 style="color: #f57c00; margin-bottom: 10px;">⚠️ Injury Modifications</h4>
                <p style="color: #666;">Your program has been adjusted for: ${injuries.join(', ')}. Alternative exercises have been included.</p>
            </div>
        `;
    }
    
    planHTML += '</div>';
    
    // Add today's workout preview
    planHTML += `
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 20px;">Today's Workout Preview</h3>
            <div style="display: grid; gap: 15px;">
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                    <div style="font-weight: bold;">Warm-up</div>
                    <div style="color: #666; font-size: 14px;">5 min dynamic stretching</div>
                </div>
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                    <div style="font-weight: bold;">Exercise 1: ${style === 'weights' ? 'Bench Press' : 'Push-ups'}</div>
                    <div style="color: #666; font-size: 14px;">3 sets × ${level === 'beginner' ? '8-10' : '10-12'} reps</div>
                </div>
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px;">
                    <div style="font-weight: bold;">Exercise 2: ${style === 'weights' ? 'Dumbbell Rows' : 'Bodyweight Rows'}</div>
                    <div style="color: #666; font-size: 14px;">3 sets × ${level === 'beginner' ? '8-10' : '10-12'} reps</div>
                </div>
            </div>
        </div>
    `;
    
    return planHTML;
}

// Save workout plan with 3-workout limit
function saveWorkoutPlan() {
    // Get existing saved workouts
    const savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    
    // Check if at 3-workout limit
    if (savedWorkouts.length >= 3) {
        const confirmDelete = confirm(
            'You already have 3 saved workouts (maximum limit).\n\n' +
            'Would you like to delete your oldest workout to save this new one?\n\n' +
            'Oldest workout: ' + (savedWorkouts[0].workoutName || 'Unnamed Workout')
        );
        
        if (confirmDelete) {
            // Remove oldest workout
            savedWorkouts.shift();
        } else {
            alert('Workout not saved. Please delete a workout from your Saved Workouts page first.');
            return;
        }
    }
    
    // Add new workout
    savedWorkouts.push({
        ...workoutData,
        id: Date.now(),
        createdAt: new Date().toISOString()
    });
    
    localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    
    alert('Workout saved successfully! You can find it in your Saved Workouts.');
    closeGeneratedWorkout();
    showScreen('saved-workouts');
}

// Load saved workouts
function loadSavedWorkouts() {
    const savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    const container = document.getElementById('saved-workouts-list');
    
    if (savedWorkouts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: var(--card-bg); border-radius: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <h3 style="color: var(--dark); margin-bottom: 10px;">No Saved Workouts Yet</h3>
                <p style="color: var(--primary-dark);">Create your first custom workout to see it here!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = savedWorkouts.map((workout, index) => `
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px; position: relative;">
            <button onclick="deleteWorkout('${workout.id}')" style="position: absolute; top: 15px; right: 15px; background: #ff5252; color: white; border: none; padding: 8px 12px; border-radius: 15px; font-size: 12px; cursor: pointer;">
                🗑️ Delete
            </button>
            
            <h3 style="color: var(--dark); margin-bottom: 15px; padding-right: 80px;">${workout.workoutName || workout.name || 'Custom Workout'}</h3>
            
            ${workout.type === 'preset' ? `
                <div style="background: var(--lighter-bg); padding: 12px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="color: var(--primary-dark); font-size: 12px;">Type</div>
                    <div style="font-weight: bold;">${workout.difficulty} - ${workout.duration}</div>
                </div>
            ` : `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                    <div style="background: var(--lighter-bg); padding: 12px; border-radius: 12px;">
                        <div style="color: var(--primary-dark); font-size: 12px;">Goal</div>
                        <div style="font-weight: bold;">${workout.goal === 'muscle' ? 'Build Muscle' : workout.goal === 'fat-loss' ? 'Lose Fat' : workout.goal === 'endurance' ? 'Endurance' : 'Overall Fitness'}</div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 12px; border-radius: 12px;">
                        <div style="color: var(--primary-dark); font-size: 12px;">Frequency</div>
                        <div style="font-weight: bold;">${workout.days} days/week</div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 12px; border-radius: 12px;">
                        <div style="color: var(--primary-dark); font-size: 12px;">Duration</div>
                        <div style="font-weight: bold;">${workout.duration} min</div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 12px; border-radius: 12px;">
                        <div style="color: var(--primary-dark); font-size: 12px;">Level</div>
                        <div style="font-weight: bold;">${workout.level ? workout.level.charAt(0).toUpperCase() + workout.level.slice(1) : 'Custom'}</div>
                    </div>
                </div>
            `}
            
            <div style="color: #666; font-size: 12px; margin-bottom: 15px;">
                ${workout.type === 'preset' ? 'Saved: ' : 'Created: '}${new Date(workout.createdAt || workout.savedAt).toLocaleDateString()}
            </div>
            
            <button onclick="loadWorkout('${workout.id}')" style="background: var(--gradient-1); color: white; border: none; padding: 12px 25px; border-radius: 20px; font-weight: bold; cursor: pointer; width: 100%;">
                🔥 Start This Workout
            </button>
        </div>
    `).join('');
    
    // Show workout count
    const countText = savedWorkouts.length === 3 ? ' (Maximum Reached)' : ` (${savedWorkouts.length}/3)`;
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="background: var(--lighter-bg); padding: 8px 16px; border-radius: 20px; font-size: 14px; color: var(--primary-dark);">
                Saved Workouts${countText}
            </span>
        </div>
    ` + container.innerHTML;
}

// Delete workout
function deleteWorkout(workoutId) {
    if (confirm('Are you sure you want to delete this workout?')) {
        let savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
        
        // Log for debugging
        console.log('Deleting workout with ID:', workoutId);
        console.log('Current workouts:', savedWorkouts);
        
        // Filter out the workout with matching ID
        savedWorkouts = savedWorkouts.filter(w => {
            return String(w.id) !== String(workoutId);
        });
        
        // Save the updated array
        localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
        
        // Reload the saved workouts display immediately
        loadSavedWorkouts();
    }
}

// Load specific workout
function loadWorkout(workoutId) {
    const savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    const workout = savedWorkouts.find(w => String(w.id) === String(workoutId));
    
    if (workout) {
        localStorage.setItem('activeWorkout', JSON.stringify(workout));
        showScreen('track-workouts');
        displayWorkoutTracker(workout);
    }
}

// Display workout tracker with days and exercises
function displayWorkoutTracker(workout) {
    const container = document.getElementById('workout-tracker-content');
    
    // Get today's day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    let trackerHTML = `
        <div style="background: var(--gradient-1); color: white; padding: 25px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 24px; margin-bottom: 10px;">${workout.workoutName || workout.name || 'Your Workout'}</h2>
            <p style="opacity: 0.9;">Let's crush today's session! 💪</p>
        </div>
    `;
    
    // Add workout week view
    trackerHTML += `
        <div style="margin-bottom: 25px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">📅 Weekly Schedule</h3>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 20px;">
    `;
    
    // Create weekly calendar view
    days.forEach(day => {
        const isToday = day === today;
        const isWorkoutDay = checkIfWorkoutDay(day, workout);
        
        trackerHTML += `
            <div style="background: ${isToday ? 'var(--gradient-1)' : isWorkoutDay ? 'var(--carolina-light)' : 'var(--lighter-bg)'}; 
                        color: ${isToday || isWorkoutDay ? 'white' : 'var(--primary-dark)'}; 
                        padding: 12px 8px; 
                        border-radius: 12px; 
                        text-align: center; 
                        font-size: 12px;
                        ${isToday ? 'transform: scale(1.1); box-shadow: 0 4px 15px rgba(75, 156, 211, 0.4);' : ''}">
                <div style="font-weight: bold;">${day.substring(0, 3)}</div>
                ${isWorkoutDay ? '<div style="font-size: 10px; margin-top: 4px;">Workout</div>' : ''}
            </div>
        `;
    });
    
    trackerHTML += '</div></div>';
    
    // Add today's workout details
    const todaysWorkout = getTodaysWorkout(today, workout);
    
    if (todaysWorkout) {
        trackerHTML += `
            <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; margin-bottom: 20px;">
                <h3 style="color: var(--dark); margin-bottom: 20px;">🎯 Today's Workout: ${todaysWorkout.name}</h3>
                <div style="display: grid; gap: 15px;">
        `;
        
        // Add exercises
        todaysWorkout.exercises.forEach((exercise, index) => {
            trackerHTML += `
                <div style="background: var(--lighter-bg); padding: 20px; border-radius: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="color: var(--dark); font-size: 18px;">
                            ${index + 1}. ${exercise.name}
                        </h4>
                        <span style="background: var(--gradient-1); color: white; padding: 6px 12px; border-radius: 12px; font-size: 14px;">
                            ${exercise.sets} × ${exercise.reps}
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 60px 1fr 1fr 1fr; gap: 10px; align-items: center;">
                        <div style="font-weight: bold; color: var(--primary-dark); font-size: 14px;">Set</div>
                        <div style="font-weight: bold; color: var(--primary-dark); font-size: 14px; text-align: center;">Weight (lbs)</div>
                        <div style="font-weight: bold; color: var(--primary-dark); font-size: 14px; text-align: center;">Reps</div>
                        <div style="font-weight: bold; color: var(--primary-dark); font-size: 14px; text-align: center;">✓</div>
            `;
            
            // Add input rows for each set
            for (let set = 1; set <= parseInt(exercise.sets); set++) {
                trackerHTML += `
                    <div style="text-align: center; font-weight: bold;">${set}</div>
                    <input type="number" placeholder="${exercise.suggestedWeight || '---'}" 
                           style="padding: 8px; border: 2px solid var(--lighter-bg); border-radius: 8px; text-align: center; background: white;">
                    <input type="number" placeholder="${exercise.targetReps || exercise.reps.split('-')[1]}" 
                           style="padding: 8px; border: 2px solid var(--lighter-bg); border-radius: 8px; text-align: center; background: white;">
                    <input type="checkbox" style="width: 20px; height: 20px; cursor: pointer;">
                `;
            }
            
            trackerHTML += `
                    </div>
                    ${exercise.notes ? `<p style="color: #666; font-size: 13px; margin-top: 10px; font-style: italic;">💡 ${exercise.notes}</p>` : ''}
                </div>
            `;
        });
        
        trackerHTML += `
                </div>
                
                <button onclick="completeWorkout()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 25px; font-size: 18px;">
                    ✅ Complete Workout
                </button>
            </div>
        `;
    } else {
        trackerHTML += `
            <div style="background: var(--card-bg); padding: 40px; border-radius: 20px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">😴</div>
                <h3 style="color: var(--dark); margin-bottom: 10px;">Rest Day</h3>
                <p style="color: var(--primary-dark);">No workout scheduled for today. Rest and recover!</p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">Your next workout is tomorrow.</p>
            </div>
        `;
    }
    
    // Add progress summary
    trackerHTML += `
        <div style="background: var(--gradient-light); padding: 20px; border-radius: 20px; margin-top: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">📊 This Week's Progress</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--carolina-blue);">3</div>
                    <div style="font-size: 12px; color: var(--primary-dark);">Workouts Complete</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--carolina-blue);">12,450</div>
                    <div style="font-size: 12px; color: var(--primary-dark);">Total Volume (lbs)</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--carolina-blue);">92%</div>
                    <div style="font-size: 12px; color: var(--primary-dark);">Completion Rate</div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = trackerHTML;
}

// Check if a specific day has a workout
function checkIfWorkoutDay(day, workout) {
    // This is a simplified check - you would enhance this based on the workout program
    const workoutDays = {
        '3': ['Monday', 'Wednesday', 'Friday'],
        '4': ['Monday', 'Tuesday', 'Thursday', 'Friday'],
        '5': ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
        '6': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    
    if (workout.days && workoutDays[workout.days]) {
        return workoutDays[workout.days].includes(day);
    }
    
    // Default schedule for preset workouts
    return ['Monday', 'Wednesday', 'Friday'].includes(day);
}

// Get today's workout details
function getTodaysWorkout(day, workout) {
    // Check if it's a preset workout with stored program data
    if (workout.id && workoutPrograms[workout.id]) {
        const program = workoutPrograms[workout.id];
        
        // For 75 Hard, show both morning and evening workouts
        if (workout.id === '75hard') {
            return {
                name: 'Daily Double (75 HARD)',
                exercises: [
                    ...program.schedule['Morning'].exercises.map(ex => ({...ex, session: 'Morning (Outdoor)'})),
                    ...program.schedule['Evening'].exercises.map(ex => ({...ex, session: 'Evening (Gym)'}))
                ]
            };
        }
        
        // For other programs, return the day's workout
        if (program.schedule[day]) {
            return program.schedule[day];
        }
    }
    
    // For custom workouts, use generic templates based on the split
    if (workout.days) {
        const customWorkouts = {
            'Monday': {
                name: workout.style === 'cardio' ? 'Cardio & Core' : 'Upper Body Push',
                exercises: workout.style === 'cardio' ? [
                    { name: 'Treadmill Run', sets: '1', reps: '20 min', rest: 'N/A', suggestedWeight: 'N/A', notes: 'Moderate pace, 1% incline' },
                    { name: 'Rowing Machine', sets: '3', reps: '5 min', rest: '2 min', suggestedWeight: 'N/A', notes: 'Focus on form and power' },
                    { name: 'Mountain Climbers', sets: '4', reps: '30 sec', rest: '30 sec', suggestedWeight: 'Bodyweight', notes: 'Keep hips low' },
                    { name: 'Plank to Push-up', sets: '3', reps: '10-12', rest: '60 sec', suggestedWeight: 'Bodyweight', notes: 'Controlled movement' },
                    { name: 'Bicycle Crunches', sets: '3', reps: '20 each side', rest: '45 sec', suggestedWeight: 'Bodyweight', notes: 'Slow and controlled' },
                    { name: 'Cool-down Walk', sets: '1', reps: '5 min', rest: 'N/A', suggestedWeight: 'N/A', notes: 'Gradually decrease pace' }
                ] : [
                    { name: 'Bench Press', sets: '4', reps: '8-10', rest: '2 min', suggestedWeight: '135', notes: 'Control the weight down' },
                    { name: 'Overhead Press', sets: '3', reps: '8-10', rest: '2 min', suggestedWeight: '95', notes: 'Core tight throughout' },
                    { name: 'Incline Dumbbell Press', sets: '3', reps: '10-12', rest: '90 sec', suggestedWeight: '50', notes: '30-45 degree angle' },
                    { name: 'Dips', sets: '3', reps: '8-12', rest: '90 sec', suggestedWeight: 'BW', notes: 'Lean forward for chest' },
                    { name: 'Lateral Raises', sets: '4', reps: '12-15', rest: '60 sec', suggestedWeight: '20', notes: 'Control the weight' },
                    { name: 'Tricep Extensions', sets: '3', reps: '12-15', rest: '60 sec', suggestedWeight: '60', notes: 'Keep elbows in' }
                ]
            },
            'Tuesday': {
                name: 'Lower Body',
                exercises: [
                    { name: 'Squats', sets: '4', reps: '8-10', rest: '3 min', suggestedWeight: '185', notes: 'Hip crease below knees' },
                    { name: 'Romanian Deadlifts', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '135', notes: 'Feel hamstring stretch' },
                    { name: 'Leg Press', sets: '3', reps: '12-15', rest: '2 min', suggestedWeight: '270', notes: 'Full range of motion' },
                    { name: 'Walking Lunges', sets: '3', reps: '12 each', rest: '90 sec', suggestedWeight: '40', notes: 'Big steps, stay upright' },
                    { name: 'Leg Curls', sets: '3', reps: '12-15', rest: '60 sec', suggestedWeight: '80', notes: 'Squeeze at the top' },
                    { name: 'Calf Raises', sets: '4', reps: '15-20', rest: '45 sec', suggestedWeight: '135', notes: 'Full range, pause at top' }
                ]
            },
            'Wednesday': {
                name: workout.style === 'cardio' ? 'HIIT & Abs' : 'Rest or Active Recovery',
                exercises: workout.style === 'cardio' ? [
                    { name: 'Sprint Intervals', sets: '8', reps: '30 sec', rest: '90 sec', suggestedWeight: 'N/A', notes: '90% effort sprints' },
                    { name: 'Burpees', sets: '4', reps: '10', rest: '60 sec', suggestedWeight: 'Bodyweight', notes: 'Full extension at top' },
                    { name: 'Box Jumps', sets: '4', reps: '8-10', rest: '90 sec', suggestedWeight: 'N/A', notes: 'Land softly, step down' },
                    { name: 'Battle Ropes', sets: '3', reps: '30 sec', rest: '60 sec', suggestedWeight: 'N/A', notes: 'Alternating waves' },
                    { name: 'Russian Twists', sets: '3', reps: '20 each side', rest: '45 sec', suggestedWeight: '25', notes: 'Touch ground each side' },
                    { name: 'Hanging Knee Raises', sets: '3', reps: '12-15', rest: '60 sec', suggestedWeight: 'Bodyweight', notes: 'Control the swing' }
                ] : []
            },
            'Thursday': {
                name: 'Upper Body Pull',
                exercises: [
                    { name: 'Deadlifts', sets: '4', reps: '6-8', rest: '3 min', suggestedWeight: '225', notes: 'Reset each rep' },
                    { name: 'Pull-ups', sets: '3', reps: '6-10', rest: '2 min', suggestedWeight: 'BW', notes: 'Full dead hang' },
                    { name: 'Barbell Rows', sets: '3', reps: '8-10', rest: '2 min', suggestedWeight: '135', notes: 'Pull to stomach' },
                    { name: 'Lat Pulldowns', sets: '3', reps: '10-12', rest: '90 sec', suggestedWeight: '120', notes: 'Squeeze lats' },
                    { name: 'Face Pulls', sets: '3', reps: '15-20', rest: '60 sec', suggestedWeight: '40', notes: 'Pull to face level' },
                    { name: 'Bicep Curls', sets: '3', reps: '10-12', rest: '60 sec', suggestedWeight: '30', notes: 'No swinging' }
                ]
            },
            'Friday': {
                name: workout.style === 'cardio' ? 'Long Cardio Day' : 'Full Body',
                exercises: workout.style === 'cardio' ? [
                    { name: 'Steady State Run', sets: '1', reps: '45 min', rest: 'N/A', suggestedWeight: 'N/A', notes: 'Conversational pace' },
                    { name: 'Dynamic Stretching', sets: '1', reps: '10 min', rest: 'N/A', suggestedWeight: 'N/A', notes: 'Full body mobility' }
                ] : [
                    { name: 'Front Squats', sets: '3', reps: '8-10', rest: '2 min', suggestedWeight: '135', notes: 'Elbows high' },
                    { name: 'Dumbbell Press', sets: '3', reps: '10-12', rest: '90 sec', suggestedWeight: '60', notes: 'Full range' },
                    { name: 'Romanian Deadlifts', sets: '3', reps: '10-12', rest: '2 min', suggestedWeight: '135', notes: 'Hip hinge pattern' },
                    { name: 'Pull-ups', sets: '3', reps: '6-10', rest: '90 sec', suggestedWeight: 'BW', notes: 'Vary grip width' },
                    { name: 'Overhead Press', sets: '3', reps: '8-10', rest: '90 sec', suggestedWeight: '75', notes: 'Lock out at top' },
                    { name: 'Plank', sets: '3', reps: '45-60 sec', rest: '60 sec', suggestedWeight: 'BW', notes: 'Perfect form' }
                ]
            },
            'Saturday': {
                name: 'Active Recovery or Sport',
                exercises: [
                    { name: 'Light Activity', sets: '1', reps: '30-60 min', rest: 'N/A', suggestedWeight: 'N/A', notes: 'Swimming, hiking, sports, yoga' }
                ]
            }
        };
        
        if (checkIfWorkoutDay(day, workout) && customWorkouts[day]) {
            return customWorkouts[day];
        }
    }
    
    return null;
}

// Complete workout function
function completeWorkout() {
    alert('Great job completing your workout! 💪 Your progress has been saved.');
    showScreen('home');
}

// Update showScreen to load saved workouts
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen-content').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    document.getElementById(screenId).classList.add('active');
    
    // Load saved workouts if showing that screen
    if (screenId === 'saved-workouts') {
        loadSavedWorkouts();
    }
    
    // Update menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and highlight the correct menu item
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.textContent.includes(getMenuTextForScreen(screenId))) {
            item.classList.add('active');
        }
    });
    
    // Update header
    const titles = {
        'home': 'FuelFire',
        'create-workout': 'Create Workout',
        'saved-workouts': 'Saved Workouts',
        'track-workouts': 'Track Workouts',
        'diet-tracker': 'Diet Tracker',
        'diet-creation': 'Diet Creation',
        'progress': 'Progress & Analytics',
        'workout-muscle-30': '30-Min Muscle',
        'workout-hiit-20': '20-Min HIIT',
        'workout-mobility-15': '15-Min Mobility',
        'workout-core-10': '10-Min Core'
    };
    document.querySelector('.header-title').textContent = titles[screenId] || 'FuelFire';
    
    // Load screen-specific content
    if (screenId === 'track-workouts') {
        loadWorkoutHistory();
    } else if (screenId === 'diet-tracker') {
        loadDietTracker();
    } else if (screenId === 'diet-creation') {
        loadDietCreation();
    }
    
    // Close sidebar if it's open
    if (document.getElementById('sidebar').classList.contains('open')) {
        toggleSidebar();
    }
}

// Helper function to get menu text for screen
function getMenuTextForScreen(screenId) {
    const screenToMenu = {
        'home': 'Home',
        'create-workout': 'Create Workout',
        'saved-workouts': 'Saved Workouts',
        'track-workouts': 'Track Workouts',
        'diet-tracker': 'Diet Tracker',
        'diet-creation': 'Diet Creation',
        'progress': 'Progress & Analytics'
    };
    return screenToMenu[screenId] || '';
}

// Close generated workout
function closeGeneratedWorkout() {
    document.getElementById('generated-workout').style.display = 'none';
}

// Start workout now
function startWorkoutNow() {
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    closeGeneratedWorkout();
    showScreen('track-workouts');
}

// Quick start workout function
function quickStartWorkout(workoutType) {
    // Map workout types to screen IDs
    const workoutScreens = {
        'muscle-30': 'workout-muscle-30',
        'hiit-20': 'workout-hiit-20',
        'mobility-15': 'workout-mobility-15',
        'core-10': 'workout-core-10'
    };
    
    const screenId = workoutScreens[workoutType];
    if (screenId) {
        showScreen(screenId);
    }
}

// Start quick workout tracker
function startQuickWorkout(workoutType) {
    const workoutDetails = {
        'muscle-30': {
            name: '30-Minute Muscle Builder',
            duration: 30,
            exercises: [
                { name: 'Push-Ups', sets: 3, reps: '45 sec' },
                { name: 'Squats', sets: 3, reps: '45 sec' },
                { name: 'Dumbbell Rows', sets: 3, reps: '45 sec' },
                { name: 'Lunges', sets: 3, reps: '45 sec' },
                { name: 'Shoulder Press', sets: 3, reps: '45 sec' },
                { name: 'Plank', sets: 3, reps: '45 sec' },
                { name: 'Bicep Curls', sets: 3, reps: '45 sec' },
                { name: 'Tricep Dips', sets: 3, reps: '45 sec' }
            ]
        },
        'hiit-20': {
            name: '20-Minute HIIT Blast',
            duration: 20,
            exercises: [
                { name: 'Burpees', sets: 4, reps: '40 sec' },
                { name: 'Mountain Climbers', sets: 4, reps: '40 sec' },
                { name: 'Jump Squats', sets: 4, reps: '40 sec' },
                { name: 'High Knees', sets: 4, reps: '40 sec' },
                { name: 'Push-Up to T', sets: 4, reps: '40 sec' },
                { name: 'Jumping Lunges', sets: 4, reps: '40 sec' },
                { name: 'Plank Jacks', sets: 4, reps: '40 sec' },
                { name: 'Star Jumps', sets: 4, reps: '40 sec' }
            ]
        },
        'mobility-15': {
            name: '15-Minute Mobility Flow',
            duration: 15,
            exercises: [
                { name: 'Cat-Cow Stretch', sets: 1, reps: '45-60 sec' },
                { name: 'Downward Dog', sets: 1, reps: '45-60 sec' },
                { name: 'Hip Circles', sets: 1, reps: '45-60 sec' },
                { name: 'Pigeon Pose', sets: 1, reps: '30 sec each' },
                { name: 'Thread the Needle', sets: 1, reps: '45-60 sec' },
                { name: 'Seated Forward Fold', sets: 1, reps: '45-60 sec' },
                { name: 'Ankle Circles', sets: 1, reps: '45-60 sec' },
                { name: 'Child\'s Pose', sets: 1, reps: '45-60 sec' }
            ]
        },
        'core-10': {
            name: '10-Minute Core Crusher',
            duration: 10,
            exercises: [
                { name: 'Plank', sets: 1, reps: '45 sec' },
                { name: 'Bicycle Crunches', sets: 1, reps: '45 sec' },
                { name: 'Russian Twists', sets: 1, reps: '45 sec' },
                { name: 'Mountain Climbers', sets: 1, reps: '45 sec' },
                { name: 'Leg Raises', sets: 1, reps: '45 sec' },
                { name: 'Flutter Kicks', sets: 1, reps: '45 sec' },
                { name: 'Side Plank (Right)', sets: 1, reps: '45 sec' },
                { name: 'Side Plank (Left)', sets: 1, reps: '45 sec' },
                { name: 'Hollow Body Hold', sets: 1, reps: '45 sec' }
            ]
        }
    };
    
    const workout = workoutDetails[workoutType];
    if (workout) {
        localStorage.setItem('activeWorkout', JSON.stringify(workout));
        showScreen('track-workouts');
    }
}

// Saved Workouts Functions
function startSavedWorkout(workoutId) {
    const program = workoutPrograms[workoutId];
    if (program) {
        if (workoutId === '75hard') {
            show75HardTracker();
        } else {
            // Get selected day from dropdown or use today
            const daySelect = document.getElementById(`day-${workoutId}`);
            let selectedDay;
            
            if (daySelect) {
                selectedDay = daySelect.value;
            } else {
                selectedDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            }
            
            const selectedWorkout = program.schedule[selectedDay];
            
            if (selectedWorkout) {
                showWorkoutTracker(workoutId, selectedDay, selectedWorkout);
            } else {
                alert(`📅 No workout available for ${selectedDay}!`);
            }
        }
    } else {
        alert(`Starting ${workoutId} workout! (This would load the workout tracker)`);
    }
}

function viewSavedWorkout(workoutId) {
    const program = workoutPrograms[workoutId];
    if (program) {
        // Show the full program details
        displayWorkoutProgram(workoutId);
    } else {
        alert(`Viewing ${workoutId} workout details! (This would show the workout details)`);
    }
}

function deleteSavedWorkout(workoutId) {
    const savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    const workout = savedWorkouts.find(w => w.id === workoutId);
    
    if (workout && confirm(`Are you sure you want to delete "${workout.name}"?`)) {
        // Remove from saved workouts
        const updatedWorkouts = savedWorkouts.filter(w => w.id !== workoutId);
        localStorage.setItem('savedWorkouts', JSON.stringify(updatedWorkouts));
        
        // Refresh the display
        loadSavedWorkouts();
        
        alert(`✅ "${workout.name}" removed from saved workouts!`);
    }
}

// Workout Tracker Functions
function showWorkoutTracker(programId, day, workout) {
    currentWorkoutProgramId = programId;
    const program = workoutPrograms[programId];
    document.getElementById('tracker-title').textContent = `${day} - ${workout.name}`;
    
    let trackerHTML = `
        <div style="background: var(--gradient-1); color: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">${workout.name}</h3>
            <p style="opacity: 0.9; margin: 0;">${program.name} • ${workout.exercises.length} exercises</p>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">💪 Today's Exercises</h4>
    `;
    
    workout.exercises.forEach((exercise, index) => {
        trackerHTML += `
            <div class="exercise-container" style="background: var(--lighter-bg); border-radius: 15px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h5 class="exercise-name" style="margin: 0; color: var(--dark);">${exercise.name}</h5>
                    <span style="background: var(--primary); color: white; padding: 4px 8px; border-radius: 8px; font-size: 12px;">${exercise.sets} sets</span>
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 10px;">Target: ${exercise.reps} • Rest: ${exercise.rest}</div>
                <div style="font-size: 11px; color: #888; margin-bottom: 15px;">${exercise.notes}</div>
                
                <!-- Set tracking -->
                <div style="display: grid; grid-template-columns: repeat(${exercise.sets}, 1fr); gap: 8px;">
        `;
        
        for (let i = 1; i <= parseInt(exercise.sets); i++) {
            trackerHTML += `
                <div class="set-inputs" style="text-align: center;">
                    <div style="font-size: 10px; color: #666; margin-bottom: 5px;">Set ${i}</div>
                    <input type="number" placeholder="Reps" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; text-align: center; margin-bottom: 4px;">
                    <input type="number" placeholder="Lbs" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; text-align: center;">
                </div>
            `;
        }
        
        trackerHTML += `
                </div>
            </div>
        `;
    });
    
    trackerHTML += `
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">📝 Workout Notes</h4>
            <textarea placeholder="How did the workout feel? Any notes for next time?" style="width: 100%; height: 80px; padding: 15px; border: 1px solid #ddd; border-radius: 12px; font-size: 14px; resize: none;"></textarea>
        </div>
    `;
    
    document.getElementById('tracker-content').innerHTML = trackerHTML;
    document.getElementById('workout-tracker').style.display = 'block';
}

function show75HardTracker() {
    // Get current day from localStorage
    const startDate = localStorage.getItem('75hardStartDate');
    let currentDay = 1;
    
    if (startDate) {
        const start = new Date(startDate);
        const today = new Date();
        const diffTime = Math.abs(today - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        currentDay = Math.min(diffDays, 75);
    } else {
        localStorage.setItem('75hardStartDate', new Date().toISOString());
    }
    
    document.getElementById('hard-day').textContent = currentDay;
    
    const trackerHTML = `
        <div style="background: linear-gradient(135deg, #C44569, #8B1538); color: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">75 HARD Challenge</h3>
            <p style="opacity: 0.9; margin: 0;">Day ${currentDay} of 75 • No compromises, no excuses</p>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">📋 Today's Tasks</h4>
            
            <div style="display: grid; gap: 12px;">
                <label style="display: flex; align-items: center; background: var(--lighter-bg); padding: 15px; border-radius: 12px; cursor: pointer;">
                    <input type="checkbox" style="margin-right: 12px; transform: scale(1.2);">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">🥗 Follow structured diet</div>
                        <div style="color: #666; font-size: 12px;">No cheat meals or alcohol</div>
                    </div>
                </label>
                
                <label style="display: flex; align-items: center; background: var(--lighter-bg); padding: 15px; border-radius: 12px; cursor: pointer;">
                    <input type="checkbox" style="margin-right: 12px; transform: scale(1.2);">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">💪 First workout (45 min)</div>
                        <div style="color: #666; font-size: 12px;">Any type of workout</div>
                    </div>
                </label>
                
                <label style="display: flex; align-items: center; background: var(--lighter-bg); padding: 15px; border-radius: 12px; cursor: pointer;">
                    <input type="checkbox" style="margin-right: 12px; transform: scale(1.2);">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">🌞 Second workout (45 min)</div>
                        <div style="color: #666; font-size: 12px;">Must be outdoors</div>
                    </div>
                </label>
                
                <label style="display: flex; align-items: center; background: var(--lighter-bg); padding: 15px; border-radius: 12px; cursor: pointer;">
                    <input type="checkbox" style="margin-right: 12px; transform: scale(1.2);">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">💧 Drink 1 gallon of water</div>
                        <div style="color: #666; font-size: 12px;">128 oz throughout the day</div>
                    </div>
                </label>
                
                <label style="display: flex; align-items: center; background: var(--lighter-bg); padding: 15px; border-radius: 12px; cursor: pointer;">
                    <input type="checkbox" style="margin-right: 12px; transform: scale(1.2);">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">📚 Read 10 pages</div>
                        <div style="color: #666; font-size: 12px;">Non-fiction book only</div>
                    </div>
                </label>
                
                <label style="display: flex; align-items: center; background: var(--lighter-bg); padding: 15px; border-radius: 12px; cursor: pointer;">
                    <input type="checkbox" style="margin-right: 12px; transform: scale(1.2);">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">📸 Take progress photo</div>
                        <div style="color: #666; font-size: 12px;">Document your journey</div>
                    </div>
                </label>
            </div>
        </div>
        
        <div style="background: #ff4757; color: white; padding: 15px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 5px;">⚠️ REMEMBER</div>
            <div style="font-size: 12px;">Miss ANY task = Start over at Day 1</div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">📝 Daily Notes</h4>
            <textarea placeholder="How are you feeling today? Any challenges or wins?" style="width: 100%; height: 80px; padding: 15px; border: 1px solid #ddd; border-radius: 12px; font-size: 14px; resize: none;"></textarea>
        </div>
    `;
    
    document.getElementById('75hard-content').innerHTML = trackerHTML;
    document.getElementById('75hard-tracker').style.display = 'block';
}

function closeWorkoutTracker() {
    document.getElementById('workout-tracker').style.display = 'none';
}

function close75HardTracker() {
    document.getElementById('75hard-tracker').style.display = 'none';
}

function finishWorkout() {
    if (confirm('Mark this workout as completed?')) {
        // Collect workout data
        const trackerTitle = document.getElementById('tracker-title').textContent;
        const exercises = [];
        const notes = document.querySelector('#tracker-content textarea').value;
        
        // Get all exercise data from inputs
        const exerciseContainers = document.querySelectorAll('#tracker-content .exercise-container');
        exerciseContainers.forEach((container, index) => {
            const exerciseName = container.querySelector('.exercise-name').textContent;
            const sets = [];
            
            container.querySelectorAll('.set-inputs').forEach((setDiv, setIndex) => {
                const reps = setDiv.querySelector('input[placeholder="Reps"]').value;
                const weight = setDiv.querySelector('input[placeholder="Lbs"]').value;
                
                if (reps || weight) {
                    sets.push({
                        set: setIndex + 1,
                        reps: parseInt(reps) || 0,
                        weight: parseInt(weight) || 0
                    });
                }
            });
            
            if (sets.length > 0) {
                exercises.push({
                    name: exerciseName,
                    sets: sets
                });
            }
        });
        
        // Create workout history entry
        const completedWorkout = {
            id: Date.now().toString(),
            programId: currentWorkoutProgramId,
            workoutName: trackerTitle,
            date: new Date().toISOString(),
            duration: Math.floor(Math.random() * 30) + 45, // Random duration 45-75 min
            exercises: exercises,
            notes: notes,
            completed: true
        };
        
        // Save to workout history
        let workoutHistory = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
        workoutHistory.unshift(completedWorkout); // Add to beginning
        localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
        
        alert('🎉 Workout completed and saved to history! Great job!');
        closeWorkoutTracker();
        showScreen('track-workouts');
    }
}

let currentWorkoutProgramId = null;

function loadWorkoutHistory() {
    const workoutHistory = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
    const content = document.getElementById('workout-tracker-content');
    
    // Calculate stats from history
    const stats = calculateWorkoutStats(workoutHistory);
    
    let html = `
        <style>
            .workout-card { animation: slideInUp 0.5s ease-out; }
            .progress-bar { animation: fillProgress 1s ease-out; }
            .stat-number { animation: countUp 1.5s ease-out; }
            .chart-bar { animation: growBar 1s ease-out; }
            
            @keyframes slideInUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes fillProgress {
                from { width: 0%; }
                to { width: var(--target-width); }
            }
            
            @keyframes countUp {
                from { opacity: 0; transform: scale(0.5); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes growBar {
                from { height: 0; transform: scaleY(0); }
                to { height: var(--target-height); transform: scaleY(1); }
            }
            
            .workout-history-item:hover {
                transform: scale(1.02);
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .glow-effect {
                box-shadow: 0 0 20px rgba(75, 156, 211, 0.3);
                transition: all 0.3s ease;
            }
        </style>
        
        <div class="workout-card glow-effect" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 25px; margin-bottom: 25px; text-align: center; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -50%; right: -50%; width: 100%; height: 100%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);"></div>
            <div style="position: relative; z-index: 1;">
                <h3 style="font-size: 24px; margin-bottom: 10px; font-weight: 700;">🏆 Workout History</h3>
                <p style="opacity: 0.9; font-size: 16px; margin: 0;">Your fitness journey in data</p>
            </div>
        </div>
    `;
    
    if (workoutHistory.length === 0) {
        html += `
            <div class="workout-card" style="background: var(--card-bg); border-radius: 20px; padding: 40px; text-align: center; margin-bottom: 20px;">
                <div style="font-size: 60px; margin-bottom: 20px;">💪</div>
                <h4 style="color: var(--dark); margin-bottom: 10px;">No workouts completed yet!</h4>
                <p style="color: #666; margin-bottom: 20px;">Start tracking your workouts to see amazing progress charts here!</p>
                <button onclick="showScreen('saved-workouts')" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; cursor: pointer;">
                    🚀 Start Your First Workout
                </button>
            </div>
        `;
    } else {
        // Running Total Banner
        html += `
            <div class="workout-card glow-effect" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 20px; margin-bottom: 15px; text-align: center; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -50%; right: -50%; width: 100%; height: 100%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);"></div>
                <div style="position: relative; z-index: 1;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">🏆 WORKOUTS COMPLETED</div>
                    <div class="stat-number" style="font-size: 48px; font-weight: 900; margin-bottom: 5px;">${stats.totalWorkouts}</div>
                    <div style="font-size: 12px; opacity: 0.8;">Keep crushing it, champion!</div>
                </div>
            </div>
        `;

        // Stats Overview
        html += `
            <div class="workout-card" style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: var(--dark); margin-bottom: 20px; text-align: center;">📊 Your Stats</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
                    <div style="background: var(--lighter-bg); padding: 20px; border-radius: 15px;">
                        <div class="stat-number" style="font-size: 28px; font-weight: bold; color: #27ae60; margin-bottom: 5px;">${stats.totalMinutes}m</div>
                        <div style="font-size: 12px; color: #666;">Total Time</div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 20px; border-radius: 15px;">
                        <div class="stat-number" style="font-size: 28px; font-weight: bold; color: #f39c12; margin-bottom: 5px;">${stats.streak}</div>
                        <div style="font-size: 12px; color: #666;">Day Streak</div>
                    </div>
                </div>
            </div>
        `;
        
        // Progress Charts
        html += `
            <div class="workout-card" style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: var(--dark); margin-bottom: 20px;">📈 Progress Charts</h4>
                ${generateProgressCharts(workoutHistory)}
            </div>
        `;
        
        // Recent Workouts
        html += `
            <div class="workout-card" style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: var(--dark); margin-bottom: 15px;">🔥 Recent Completed Workouts</h4>
        `;
        
        workoutHistory.slice(0, 5).forEach((workout, index) => {
            const date = new Date(workout.date);
            const timeAgo = getTimeAgo(date);
            const programInfo = workoutPrograms[workout.programId] || { name: 'Custom Workout' };
            
            html += `
                <div class="workout-history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: var(--lighter-bg); border-radius: 15px; margin-bottom: 10px; animation-delay: ${index * 0.1}s;">
                    <div>
                        <div style="font-weight: bold; color: var(--dark);">${getWorkoutIcon(workout.programId)} ${workout.workoutName}</div>
                        <div style="color: #666; font-size: 12px;">${timeAgo} • ${workout.duration} min • ${programInfo.name}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--primary); font-weight: bold;">${workout.exercises.length} exercises</div>
                        <div style="color: #666; font-size: 12px;">${getPRs(workout)}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        // Weekly Activity Chart
        html += `
            <div class="workout-card" style="background: var(--card-bg); border-radius: 20px; padding: 20px;">
                <h4 style="color: var(--dark); margin-bottom: 15px;">📅 Weekly Activity</h4>
                ${generateWeeklyChart(workoutHistory)}
            </div>
        `;
    }
    
    content.innerHTML = html;
    
    // Trigger animations
    setTimeout(() => {
        document.querySelectorAll('.workout-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }, 100);
}

function calculateWorkoutStats(history) {
    const totalWorkouts = history.length;
    const totalMinutes = history.reduce((sum, w) => sum + w.duration, 0);
    const streak = calculateStreak(history);
    
    return { totalWorkouts, totalMinutes, streak };
}

function calculateStreak(history) {
    if (history.length === 0) return 0;
    
    let streak = 0;
    const today = new Date().toDateString();
    let currentDate = new Date();
    
    for (let i = 0; i < 30; i++) {
        const dateStr = currentDate.toDateString();
        const hasWorkout = history.some(w => new Date(w.date).toDateString() === dateStr);
        
        if (hasWorkout) {
            streak++;
        } else if (streak > 0 || dateStr === today) {
            break;
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
}

function generateProgressCharts(history) {
    const exercises = ['Bench Press', 'Squat', 'Deadlift'];
    let chartsHTML = '';
    
    exercises.forEach(exercise => {
        const data = getExerciseProgressData(history, exercise);
        if (data.length > 0) {
            const maxWeight = Math.max(...data.map(d => d.weight));
            const improvement = data.length > 1 ? data[data.length - 1].weight - data[0].weight : 0;
            
            chartsHTML += `
                <div style="background: var(--lighter-bg); border-radius: 15px; padding: 15px; margin-bottom: 15px;">
                    <h5 style="color: var(--dark); margin-bottom: 10px;">🏋️ ${exercise} Progress</h5>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 12px; color: #666;">Last ${data.length} workouts</span>
                        <span style="font-size: 12px; color: #666;">Current: ${data[data.length - 1]?.weight || 0} lbs</span>
                    </div>
                    <div style="display: flex; align-items: end; height: 60px; gap: 4px;">
                        ${data.map(point => {
                            const height = (point.weight / maxWeight) * 60;
                            return `<div class="chart-bar" style="--target-height: ${height}px; background: var(--primary); width: ${Math.max(100 / data.length - 2, 8)}%; border-radius: 2px;" title="${point.weight} lbs"></div>`;
                        }).join('')}
                    </div>
                    <div style="font-size: 10px; color: #666; margin-top: 5px;">
                        ${improvement > 0 ? `+${improvement} lbs improvement` : improvement < 0 ? `${improvement} lbs change` : 'No change'}
                    </div>
                </div>
            `;
        }
    });
    
    return chartsHTML || '<div style="text-align: center; color: #666; padding: 20px;">Complete more workouts to see progress charts!</div>';
}

function generateWeeklyChart(history) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const thisWeek = getThisWeekWorkouts(history);
    
    let chartHTML = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 15px;">';
    
    days.forEach((day, index) => {
        const workoutCount = thisWeek[index] || 0;
        const intensity = Math.min(workoutCount / 2, 1); // Max intensity at 2 workouts
        const bgColor = workoutCount > 0 ? `rgba(75, 156, 211, ${0.3 + intensity * 0.7})` : 'var(--lighter-bg)';
        
        chartHTML += `
            <div style="text-align: center;">
                <div style="font-size: 10px; color: #666; margin-bottom: 5px;">${day}</div>
                <div style="background: ${bgColor}; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${workoutCount > 0 ? 'white' : '#666'}; font-weight: bold;">
                    ${workoutCount || ''}
                </div>
            </div>
        `;
    });
    
    chartHTML += '</div>';
    chartHTML += `<div style="text-align: center; color: #666; font-size: 12px;">This week: ${thisWeek.reduce((a, b) => a + b, 0)} workouts completed</div>`;
    
    return chartHTML;
}

function getExerciseProgressData(history, exerciseName) {
    const data = [];
    
    history.forEach(workout => {
        workout.exercises.forEach(exercise => {
            if (exercise.name.toLowerCase().includes(exerciseName.toLowerCase())) {
                const maxWeight = Math.max(...exercise.sets.map(set => set.weight));
                if (maxWeight > 0) {
                    data.push({
                        date: workout.date,
                        weight: maxWeight
                    });
                }
            }
        });
    });
    
    return data.slice(-10); // Last 10 data points
}

function getThisWeekWorkouts(history) {
    const thisWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    history.forEach(workout => {
        const workoutDate = new Date(workout.date);
        if (workoutDate >= startOfWeek) {
            const dayOfWeek = workoutDate.getDay();
            thisWeek[dayOfWeek]++;
        }
    });
    
    return thisWeek;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function getPRs(workout) {
    const prs = [];
    workout.exercises.forEach(exercise => {
        const maxWeight = Math.max(...exercise.sets.map(set => set.weight));
        if (maxWeight > 200) { // Arbitrary PR threshold
            prs.push(`${maxWeight} lbs PR`);
        }
    });
    
    return prs.length > 0 ? prs[0] : 'Completed';
}

function complete75HardDay() {
    const checkboxes = document.querySelectorAll('#75hard-content input[type="checkbox"]');
    const completed = Array.from(checkboxes).every(cb => cb.checked);
    
    if (!completed) {
        alert('❌ You must complete ALL 5 tasks to finish the day!');
        return;
    }
    
    const currentDay = parseInt(document.getElementById('hard-day').textContent);
    if (currentDay >= 75) {
        alert('🏆 CONGRATULATIONS! You completed 75 HARD! You are mentally tough!');
    } else {
        alert(`🔥 Day ${currentDay} completed! Only ${75 - currentDay} days left!`);
    }
    
    close75HardTracker();
    showScreen('track-workouts');
}

// Diet System State
let dietQuizStep = 1;
let dietData = {};
let currentDietPlan = JSON.parse(localStorage.getItem('currentDietPlan') || 'null');
let dailyFoodLog = JSON.parse(localStorage.getItem('dailyFoodLog') || '[]');

// Simple food database
const foods = {
    breakfast: [
        { name: 'Scrambled Eggs', calories: 200, protein: 18, carbs: 2, fat: 14 },
        { name: 'Oatmeal with Berries', calories: 300, protein: 10, carbs: 45, fat: 8 },
        { name: 'Greek Yogurt Parfait', calories: 250, protein: 20, carbs: 30, fat: 6 },
        { name: 'Avocado Toast', calories: 320, protein: 8, carbs: 35, fat: 18 }
    ],
    lunch: [
        { name: 'Grilled Chicken Salad', calories: 400, protein: 35, carbs: 20, fat: 20 },
        { name: 'Turkey Sandwich', calories: 450, protein: 30, carbs: 45, fat: 15 },
        { name: 'Quinoa Bowl', calories: 500, protein: 20, carbs: 65, fat: 18 },
        { name: 'Salmon & Rice', calories: 550, protein: 40, carbs: 50, fat: 20 }
    ],
    dinner: [
        { name: 'Steak & Vegetables', calories: 600, protein: 45, carbs: 30, fat: 35 },
        { name: 'Chicken Stir Fry', calories: 500, protein: 35, carbs: 55, fat: 15 },
        { name: 'Pasta Primavera', calories: 480, protein: 15, carbs: 70, fat: 16 },
        { name: 'Fish Tacos', calories: 450, protein: 30, carbs: 40, fat: 20 }
    ],
    snack: [
        { name: 'Protein Shake', calories: 150, protein: 25, carbs: 10, fat: 3 },
        { name: 'Apple with Almond Butter', calories: 200, protein: 5, carbs: 25, fat: 12 },
        { name: 'Trail Mix', calories: 180, protein: 6, carbs: 20, fat: 10 },
        { name: 'Cottage Cheese & Fruit', calories: 160, protein: 18, carbs: 15, fat: 4 }
    ]
};

// Diet Tracker Functions
function addFood(mealType) {
    const mealFoods = foods[mealType];
    let html = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; border-radius: 20px; padding: 25px; max-width: 90%; width: 350px;">
                <h3 style="margin: 0 0 20px 0; color: var(--dark);">Add ${mealType}</h3>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${mealFoods.map((food, index) => `
                        <div onclick="selectFood('${mealType}', ${index})" style="background: var(--lighter-bg); padding: 15px; border-radius: 12px; margin-bottom: 10px; cursor: pointer;">
                            <div style="font-weight: bold; color: var(--dark);">${food.name}</div>
                            <div style="font-size: 12px; color: #666;">${food.calories} cal • ${food.protein}g protein • ${food.carbs}g carbs • ${food.fat}g fat</div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="closeModal()" style="background: #e74c3c; color: white; border: none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 15px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.innerHTML = html;
    document.body.appendChild(modal.firstElementChild);
}

function selectFood(mealType, index) {
    const food = foods[mealType][index];
    const entry = {
        ...food,
        mealType,
        timestamp: new Date().toISOString()
    };
    
    dailyFoodLog.push(entry);
    localStorage.setItem('dailyFoodLog', JSON.stringify(dailyFoodLog));
    
    closeModal();
    loadDietTracker();
    showNotification(`Added ${food.name} to ${mealType}!`);
}

function closeModal() {
    const modal = document.querySelector('div[style*="position: fixed"]');
    if (modal) modal.remove();
}

// Diet Creation Functions
function loadDietCreation() {
    console.log('loadDietCreation called');
    // Reset quiz to beginning
    dietQuizStep = 1;
    dietData = {};
    
    // Show the main diet creation page with create button
    const content = document.getElementById('diet-creation-content');
    if (!content) {
        console.error('Could not find diet-creation-content element');
        return;
    }
    
    content.innerHTML = `
        <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">🎯 Diet Creation</h2>
            <p style="opacity: 0.9;">Create your personalized meal plan</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 20px; padding: 60px 40px; margin-bottom: 20px; text-align: center;">
            <h2 style="font-size: 36px; margin-bottom: 15px;">🔥 Custom AI Diet Plan</h2>
            <p style="font-size: 20px; margin-bottom: 30px; opacity: 0.9;">Get a personalized 2-week meal plan based on your unique preferences</p>
            
            <button onclick="window.location.href='enhanced-diet-quiz.html'" style="background: white; color: #667eea; border: none; padding: 20px 60px; border-radius: 30px; font-weight: bold; cursor: pointer; font-size: 22px; box-shadow: 0 6px 20px rgba(0,0,0,0.3); transition: all 0.3s;">
                ✨ Enhanced Diet Quiz (NEW!)
            </button>
            
            <p style="margin-top: 25px; font-size: 16px; opacity: 0.8;">
                <strong>9-step detailed quiz</strong> • Takes 3-5 minutes • AI-powered recommendations
            </p>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 30px; text-align: center;">
            <h3 style="color: var(--dark); margin-bottom: 20px;">🎯 What You'll Get</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left;">
                <div>
                    <div style="font-weight: bold; color: var(--primary); margin-bottom: 5px;">✅ 2-Week Meal Plan</div>
                    <div style="color: #666; font-size: 14px;">Personalized daily meals with recipes</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: var(--primary); margin-bottom: 5px;">✅ Shopping Lists</div>
                    <div style="color: #666; font-size: 14px;">Organized by category with budget estimates</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: var(--primary); margin-bottom: 5px;">✅ Macro Breakdown</div>
                    <div style="color: #666; font-size: 14px;">Optimized for your specific goals</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: var(--primary); margin-bottom: 5px;">✅ AI Personalization</div>
                    <div style="color: #666; font-size: 14px;">Based on your preferences and restrictions</div>
                </div>
            </div>
        </div>
    `;
}

function showDietQuiz() {
    console.log('showDietQuiz called, step:', dietQuizStep);
    const content = document.getElementById('diet-creation-content');
    if (!content) {
        console.error('Could not find diet-creation-content element');
        return;
    }
    
    let html = '';
    
    if (dietQuizStep === 1) {
        // Step 1: Goals and Basics
        html = `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🎯 Your Goals</h2>
                <p style="opacity: 0.9;">Step 1 of 9 - Let's start with your objectives</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">What's your primary goal?</label>
                    <select id="diet-goal" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; font-size: 16px;">
                        <option value="">Select your goal...</option>
                        <option value="weight-loss">🔥 Weight Loss</option>
                        <option value="muscle-gain">💪 Muscle Gain</option>
                        <option value="maintenance">⚖️ Maintenance</option>
                        <option value="recomp">🔄 Body Recomposition</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Daily calorie target (we'll calculate this for you later)</label>
                    <input type="number" id="calorie-target" placeholder="Leave blank for automatic calculation" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                </div>
                
                <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; width: 100%; font-weight: bold; cursor: pointer; font-size: 18px;">
                    Let's Get Started →
                </button>
            </div>
        `;
    } else if (dietQuizStep === 2) {
        // Step 2: Personal Information
        html = `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">👤 Personal Information</h2>
                <p style="opacity: 0.9;">Step 2 of 9 - Help us understand your needs</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Age</label>
                        <input type="number" id="quiz-age" placeholder="25" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                    </div>
                    <div>
                        <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Gender</label>
                        <select id="quiz-gender" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Weight (lbs)</label>
                        <input type="number" id="quiz-weight" placeholder="150" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                    </div>
                    <div>
                        <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Height</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" id="quiz-feet" placeholder="5" min="3" max="8" style="width: 50%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                            <span style="padding: 12px;">ft</span>
                            <input type="number" id="quiz-inches" placeholder="8" min="0" max="11" style="width: 50%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                            <span style="padding: 12px;">in</span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Activity Level</label>
                    <select id="quiz-activity" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="">Select your activity level...</option>
                        <option value="sedentary">Sedentary (little/no exercise)</option>
                        <option value="light">Light (exercise 1-3 days/week)</option>
                        <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                        <option value="very-active">Very Active (exercise 6-7 days/week)</option>
                        <option value="extra-active">Extra Active (physical job + exercise)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Body Type</label>
                    <select id="quiz-bodytype" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="">Select your body type...</option>
                        <option value="ectomorph">Ectomorph (Naturally thin, fast metabolism)</option>
                        <option value="mesomorph">Mesomorph (Athletic build, gains muscle easily)</option>
                        <option value="endomorph">Endomorph (Stocky build, slower metabolism)</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer;">
                        Continue →
                    </button>
                </div>
            </div>
        `;
    } else if (dietQuizStep === 3) {
        // Step 3: Dietary Restrictions
        html = getAllQuizSteps().step3;
    } else if (dietQuizStep === 4) {
        // Step 4: Meat Preferences
        html = getAllQuizSteps().step4;
    } else if (dietQuizStep === 5) {
        // Step 5: Vegetable Preferences
        html = getAllQuizSteps().step5;
    } else if (dietQuizStep === 6) {
        // Step 6: Seafood & Other Proteins
        html = getAllQuizSteps().step6;
    } else if (dietQuizStep === 7) {
        // Step 7: Meal Preferences
        html = getAllQuizSteps().step7;
    } else if (dietQuizStep === 8) {
        // Step 8: Food Preferences
        html = getAllQuizSteps().step8;
    } else if (dietQuizStep === 9) {
        // Step 9: Final Details
        html = getAllQuizSteps().step9;
    }
    
    content.innerHTML = html;
}

// Get all quiz steps HTML  
function getAllQuizSteps() {
    return {
        step3: `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🥗 Dietary Restrictions</h2>
                <p style="opacity: 0.9;">Step 3 of 9 - What should we avoid?</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Food Allergies (check all that apply)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${['None', 'Peanuts', 'Tree Nuts', 'Dairy', 'Gluten', 'Eggs', 'Shellfish', 'Fish', 'Soy', 'Sesame'].map(allergy => `
                            <label style="background: var(--lighter-bg); padding: 12px; border-radius: 10px; cursor: pointer; display: flex; align-items: center;">
                                <input type="checkbox" class="allergy-check" value="${allergy}" style="margin-right: 8px;" ${allergy === 'None' ? 'onchange="handleNoneAllergy(this)"' : ''}>
                                <span>${allergy}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Dietary Lifestyle</label>
                    <select id="quiz-dietary-lifestyle" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="omnivore">Omnivore (eat everything)</option>
                        <option value="vegetarian">Vegetarian (no meat)</option>
                        <option value="vegan">Vegan (no animal products)</option>
                        <option value="pescatarian">Pescatarian (fish only)</option>
                        <option value="keto">Keto (very low carb)</option>
                        <option value="paleo">Paleo (whole foods only)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Religious/Cultural Restrictions</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${['None', 'Halal', 'Kosher', 'No Beef', 'No Pork', 'Hindu Vegetarian'].map(restriction => `
                            <label style="background: var(--lighter-bg); padding: 12px; border-radius: 10px; cursor: pointer; display: flex; align-items: center;">
                                <input type="checkbox" class="restriction-check" value="${restriction}" style="margin-right: 8px;">
                                <span>${restriction}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer;">
                        Continue →
                    </button>
                </div>
            </div>
        `,
        step4: `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🥩 Meat Preferences</h2>
                <p style="opacity: 0.9;">Step 4 of 9 - What meats do you enjoy?</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="color: var(--dark); font-weight: bold;">Select all meats you enjoy eating</label>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" onclick="selectAllMeats()" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                Check All
                            </button>
                            <button type="button" onclick="selectNoMeats()" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                Check None
                            </button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 280px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 10px;">
                        ${[
                            '🐓 Chicken Breast', '🐓 Chicken Thighs', '🐓 Chicken Wings', '🐓 Whole Chicken',
                            '🦃 Turkey Breast', '🦃 Ground Turkey', '🦃 Turkey Thighs',
                            '🥩 Ribeye Steak', '🥩 Sirloin Steak', '🥩 Ground Beef (Lean)', '🥩 Ground Beef (80/20)', 
                            '🥩 Beef Tenderloin', '🥩 Brisket', '🥩 Beef Roast',
                            '🐖 Pork Chops', '🐖 Pork Tenderloin', '🐖 Ground Pork', '🐖 Bacon', '🐖 Ham',
                            '🐑 Lamb Chops', '🐑 Ground Lamb', '🦌 Venison', '🦆 Duck',
                            '🌭 Sausages', '🥓 Deli Meats'
                        ].map(meat => `
                            <label style="background: var(--lighter-bg); padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 13px;">
                                <input type="checkbox" class="meat-check" value="${meat}" style="margin-right: 8px;">
                                <span>${meat}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">How often do you want to eat meat?</label>
                    <select id="quiz-meat-frequency" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="every-meal">Every meal</option>
                        <option value="twice-daily">Twice per day</option>
                        <option value="once-daily">Once per day</option>
                        <option value="few-times-week">Few times per week</option>
                        <option value="rarely">Rarely</option>
                        <option value="never">Never (plant-based only)</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer;">
                        Continue →
                    </button>
                </div>
            </div>
        `,
        step5: `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🥬 Vegetable Preferences</h2>
                <p style="opacity: 0.9;">Step 5 of 9 - Choose your vegetables</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label style="color: var(--dark); font-weight: bold;">Select vegetables you enjoy</label>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" onclick="selectAllVeggies()" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                Check All
                            </button>
                            <button type="button" onclick="selectNoVeggies()" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                Check None
                            </button>
                        </div>
                    </div>
                    <p style="font-style: italic; color: #666; margin-bottom: 12px; font-size: 14px;">
                        <em>Recommended: Choose at least 5-8 vegetables for variety</em>
                    </p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 320px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 10px;">
                        ${[
                            '🥬 Spinach', '🥬 Kale', '🥬 Lettuce (Romaine)', '🥬 Lettuce (Iceberg)', '🥬 Arugula',
                            '🥦 Broccoli', '🥦 Cauliflower', '🥦 Brussels Sprouts', '🥦 Cabbage',
                            '🥕 Carrots', '🥕 Sweet Potatoes', '🥔 Potatoes (White)', '🥔 Potatoes (Red)',
                            '🌶️ Bell Peppers (Red)', '🌶️ Bell Peppers (Green)', '🌶️ Bell Peppers (Yellow)',
                            '🍅 Tomatoes', '🍅 Cherry Tomatoes', '🥒 Cucumbers', '🥒 Zucchini', '🥒 Yellow Squash',
                            '🧅 Onions (Yellow)', '🧅 Onions (Red)', '🧅 Green Onions', '🧄 Garlic',
                            '🍄 Mushrooms (Button)', '🍄 Mushrooms (Portobello)', '🍄 Mushrooms (Shiitake)',
                            '🌽 Corn', '🥑 Avocados', '🫒 Olives', '🥒 Pickles',
                            '🥒 Celery', '🥬 Bok Choy', '🥬 Swiss Chard', '🫑 Jalapeños',
                            '🍆 Eggplant', '🥒 Asparagus', '🌿 Green Beans', '🌿 Snap Peas',
                            '🥕 Beets', '🥕 Radishes', '🥕 Turnips', '🥕 Parsnips'
                        ].map(veggie => `
                            <label style="background: var(--lighter-bg); padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 13px;">
                                <input type="checkbox" class="veggie-check" value="${veggie}" style="margin-right: 8px;" checked>
                                <span>${veggie}</span>
                            </label>
                        `).join('')}
                    </div>
                    <p style="font-style: italic; color: #888; margin-top: 8px; font-size: 12px;">
                        <em>All vegetables are pre-selected. Uncheck any you don't want in your meal plans.</em>
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer;">
                        Continue →
                    </button>
                </div>
            </div>
        `,
        step6: `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🐟 Seafood & Other Proteins</h2>
                <p style="opacity: 0.9;">Step 6 of 9 - Seafood, eggs, dairy & plant proteins</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Seafood you enjoy</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        ${[
                            '🐟 Salmon', '🐟 Tuna', '🐟 Cod', '🐟 Tilapia', '🐟 Mahi Mahi', '🐟 Halibut',
                            '🦐 Shrimp', '🦞 Lobster', '🦀 Crab', '🐙 Octopus', '🦪 Oysters', '🦑 Squid',
                            '🐟 Sardines', '🐟 Mackerel', '🐟 Trout', '🍤 Scallops'
                        ].map(seafood => `
                            <label style="background: var(--lighter-bg); padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 13px;">
                                <input type="checkbox" class="seafood-check" value="${seafood}" style="margin-right: 8px;">
                                <span>${seafood}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Eggs & Dairy</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        ${[
                            '🥚 Whole Eggs', '🥚 Egg Whites', '🧀 Greek Yogurt', '🧀 Cottage Cheese',
                            '🧀 Cheese (Regular)', '🥛 Milk', '🧈 Butter', '🧀 Cream Cheese'
                        ].map(dairy => `
                            <label style="background: var(--lighter-bg); padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 13px;">
                                <input type="checkbox" class="dairy-check" value="${dairy}" style="margin-right: 8px;">
                                <span>${dairy}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Plant-Based Proteins</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        ${[
                            '🌱 Tofu', '🌱 Tempeh', '🌱 Seitan', '🌱 Black Beans', '🌱 Kidney Beans',
                            '🌱 Chickpeas', '🌱 Lentils', '🥜 Almonds', '🥜 Walnuts', '🥜 Peanuts',
                            '🌰 Cashews', '🌰 Pistachios', '🥛 Protein Powder', '🌰 Seeds (Chia/Hemp)'
                        ].map(plant => `
                            <label style="background: var(--lighter-bg); padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 13px;">
                                <input type="checkbox" class="plant-check" value="${plant}" style="margin-right: 8px;">
                                <span>${plant}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer;">
                        Continue →
                    </button>
                </div>
            </div>
        `,
        step7: `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🍳 Meal Preferences</h2>
                <p style="opacity: 0.9;">Step 7 of 9 - How do you like to eat?</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Meals per day</label>
                    <select id="quiz-meals-per-day" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="2">2 meals (intermittent fasting)</option>
                        <option value="3">3 meals</option>
                        <option value="4">3 meals + 1 snack</option>
                        <option value="5">3 meals + 2 snacks</option>
                        <option value="6">6 small meals</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Cooking time available per day</label>
                    <select id="quiz-cooking-time" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="minimal">< 30 minutes (need quick meals)</option>
                        <option value="moderate">30-60 minutes</option>
                        <option value="plenty">1-2 hours (love cooking)</option>
                        <option value="meal-prep">Meal prep on weekends</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Kitchen skill level</label>
                    <select id="quiz-skill-level" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="beginner">Beginner (simple recipes only)</option>
                        <option value="intermediate">Intermediate (can follow most recipes)</option>
                        <option value="advanced">Advanced (bring on complex dishes)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Meal variety preference</label>
                    <div style="display: grid; gap: 10px;">
                        <label style="background: var(--lighter-bg); padding: 12px; border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="variety" value="high" style="margin-right: 8px;">
                            High variety - Different meals every day
                        </label>
                        <label style="background: var(--lighter-bg); padding: 12px; border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="variety" value="moderate" style="margin-right: 8px;">
                            Moderate - Some repetition is fine
                        </label>
                        <label style="background: var(--lighter-bg); padding: 12px; border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="variety" value="low" style="margin-right: 8px;">
                            Low - Happy eating the same meals
                        </label>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer;">
                        Continue →
                    </button>
                </div>
            </div>
        `,
        step8: `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🌮 Food Preferences</h2>
                <p style="opacity: 0.9;">Step 8 of 9 - What do you love and hate?</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 12px; font-weight: bold;">Favorite Cuisines (check all you enjoy)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${['🇺🇸 American', '🇲🇽 Mexican', '🇮🇹 Italian', '🇨🇳 Chinese', 
                           '🇯🇵 Japanese', '🇹🇭 Thai', '🇮🇳 Indian', '🇬🇷 Greek',
                           '🇫🇷 French', '🇰🇷 Korean', '🇻🇳 Vietnamese', '🏴 British'].map(cuisine => `
                            <label style="background: var(--lighter-bg); padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center;">
                                <input type="checkbox" class="cuisine-check" value="${cuisine}" style="margin-right: 8px;">
                                <span style="font-size: 14px;">${cuisine}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Foods you LOVE (helps AI personalize)</label>
                    <textarea id="quiz-loved-foods" placeholder="e.g., grilled chicken, sweet potatoes, berries, Greek yogurt..." 
                        style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; min-height: 80px; resize: vertical;"></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Foods you HATE (we'll avoid these)</label>
                    <textarea id="quiz-hated-foods" placeholder="e.g., mushrooms, olives, liver, brussels sprouts..." 
                        style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; min-height: 80px; resize: vertical;"></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Spice tolerance</label>
                    <select id="quiz-spice-level" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="none">No spice please</option>
                        <option value="mild">Mild is fine</option>
                        <option value="medium">Medium heat</option>
                        <option value="hot">Love it spicy!</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="nextDietStep()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer;">
                        Continue →
                    </button>
                </div>
            </div>
        `,
        step9: `
            <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
                <h2 style="font-size: 28px; margin-bottom: 10px;">🎯 Final Details</h2>
                <p style="opacity: 0.9;">Step 9 of 9 - Almost done!</p>
            </div>
            
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Budget per week for groceries</label>
                    <select id="quiz-budget" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;">
                        <option value="low">$50-75 (budget conscious)</option>
                        <option value="moderate">$75-150 (moderate)</option>
                        <option value="high">$150-250 (premium ingredients ok)</option>
                        <option value="unlimited">$250+ (no budget constraints)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Special health conditions</label>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                        ${['None', 'Diabetes', 'High Blood Pressure', 'High Cholesterol', 'PCOS', 'IBS', 'Acid Reflux'].map(condition => `
                            <label style="background: var(--lighter-bg); padding: 12px; border-radius: 10px; cursor: pointer; display: flex; align-items: center;">
                                <input type="checkbox" class="condition-check" value="${condition}" style="margin-right: 8px;">
                                <span>${condition}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--dark); margin-bottom: 8px; font-weight: bold;">Any other notes for the AI?</label>
                    <textarea id="quiz-notes" placeholder="e.g., I work night shifts, prefer cold breakfasts, need portable lunches..." 
                        style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; min-height: 80px; resize: vertical;"></textarea>
                </div>
                
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>🤖 AI Integration:</strong> Your responses will be sent to Claude AI to generate a personalized 2-week meal plan with shopping lists. This may take 30-60 seconds.
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="prevDietStep()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 1; font-weight: bold; cursor: pointer;">
                        ← Back
                    </button>
                    <button onclick="generateAIDietPlan()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 30px; border-radius: 25px; flex: 2; font-weight: bold; cursor: pointer; font-size: 18px;">
                        🚀 Generate My AI Meal Plan
                    </button>
                </div>
            </div>
        `
    };
}

function nextDietStep() {
    console.log('nextDietStep called, current step:', dietQuizStep);
    // Save data based on current step
    if (dietQuizStep === 1) {
        dietData.goal = document.getElementById('diet-goal').value;
        dietData.calories = document.getElementById('calorie-target').value || 2000;
        
        if (!dietData.goal) {
            alert('Please select your goal');
            return;
        }
    } else if (dietQuizStep === 2) {
        // Save personal info
        dietData.age = document.getElementById('quiz-age').value;
        dietData.gender = document.getElementById('quiz-gender').value;
        dietData.weight = document.getElementById('quiz-weight').value;
        dietData.feet = document.getElementById('quiz-feet').value;
        dietData.inches = document.getElementById('quiz-inches').value;
        dietData.activity = document.getElementById('quiz-activity').value;
        dietData.bodyType = document.getElementById('quiz-bodytype').value;
    } else if (dietQuizStep === 3) {
        // Save restrictions
        dietData.allergies = Array.from(document.querySelectorAll('.allergy-check:checked')).map(cb => cb.value);
        dietData.dietaryLifestyle = document.getElementById('quiz-dietary-lifestyle').value;
        dietData.restrictions = Array.from(document.querySelectorAll('.restriction-check:checked')).map(cb => cb.value);
    } else if (dietQuizStep === 4) {
        // Save meat preferences
        dietData.meats = Array.from(document.querySelectorAll('.meat-check:checked')).map(cb => cb.value);
        dietData.meatFrequency = document.getElementById('quiz-meat-frequency').value;
    } else if (dietQuizStep === 5) {
        // Save vegetable preferences
        dietData.vegetables = Array.from(document.querySelectorAll('.veggie-check:checked')).map(cb => cb.value);
    } else if (dietQuizStep === 6) {
        // Save seafood and other proteins
        dietData.seafood = Array.from(document.querySelectorAll('.seafood-check:checked')).map(cb => cb.value);
        dietData.dairy = Array.from(document.querySelectorAll('.dairy-check:checked')).map(cb => cb.value);
        dietData.plantProteins = Array.from(document.querySelectorAll('.plant-check:checked')).map(cb => cb.value);
    } else if (dietQuizStep === 7) {
        // Save meal preferences
        dietData.mealsPerDay = document.getElementById('quiz-meals-per-day').value;
        dietData.cookingTime = document.getElementById('quiz-cooking-time').value;
        dietData.skillLevel = document.getElementById('quiz-skill-level').value;
        dietData.variety = document.querySelector('input[name="variety"]:checked')?.value;
    } else if (dietQuizStep === 8) {
        // Save food preferences
        dietData.cuisines = Array.from(document.querySelectorAll('.cuisine-check:checked')).map(cb => cb.value);
        dietData.lovedFoods = document.getElementById('quiz-loved-foods').value;
        dietData.hatedFoods = document.getElementById('quiz-hated-foods').value;
        dietData.spiceLevel = document.getElementById('quiz-spice-level').value;
    }
    
    if (dietQuizStep < 9) {
        dietQuizStep++;
        showDietQuiz();
    }
}

function prevDietStep() {
    if (dietQuizStep > 1) {
        dietQuizStep--;
        showDietQuiz();
    }
}

function handleNoneAllergy(checkbox) {
    if (checkbox.checked) {
        document.querySelectorAll('.allergy-check').forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
    }
}

// Helper functions for check all/none buttons
function selectAllMeats() {
    document.querySelectorAll('.meat-check').forEach(cb => cb.checked = true);
}

function selectNoMeats() {
    document.querySelectorAll('.meat-check').forEach(cb => cb.checked = false);
}

function selectAllVeggies() {
    document.querySelectorAll('.veggie-check').forEach(cb => cb.checked = true);
}

function selectNoVeggies() {
    document.querySelectorAll('.veggie-check').forEach(cb => cb.checked = false);
}

// Start the diet quiz fresh
function startDietQuiz() {
    dietQuizStep = 1;
    dietData = {};
    showDietQuiz();
}

// Reset the diet quiz
function resetDietQuiz() {
    dietQuizStep = 1;
    dietData = {};
    showScreen('diet-creation');
}

// AI Diet Plan Generation Function
async function generateAIDietPlan() {
    // Save step 7 data
    dietData.budget = document.getElementById('quiz-budget').value;
    dietData.healthConditions = Array.from(document.querySelectorAll('.condition-check:checked')).map(cb => cb.value);
    dietData.specialNotes = document.getElementById('quiz-notes').value;
    
    // Show loading state
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '🤖 Generating AI Plan...';
    button.disabled = true;
    
    try {
        // Format all collected data for AI prompt
        const promptData = formatDataForAI(dietData);
        
        // For now, we'll simulate the AI response since we don't have API keys set up
        // In production, this would make an actual API call to Claude
        const aiResponse = await simulateAIResponse(promptData);
        
        // Process the AI response into our meal plan format
        currentDietPlan = {
            ...dietData,
            ...aiResponse,
            createdAt: new Date().toISOString(),
            isAIGenerated: true
        };
        
        // Save to localStorage
        localStorage.setItem('currentDietPlan', JSON.stringify(currentDietPlan));
        
        // Show the generated plan
        showAIDietPlan();
        
    } catch (error) {
        console.error('Error generating AI diet plan:', error);
        alert('Sorry, there was an error generating your meal plan. Please try again.');
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

function formatDataForAI(data) {
    return {
        personalInfo: {
            age: data.age,
            gender: data.gender,
            weight: `${data.weight} lbs`,
            height: `${data.feet}'${data.inches}"`,
            activityLevel: data.activity,
            bodyType: data.bodyType
        },
        goals: {
            primaryGoal: data.goal,
            targetCalories: data.calories
        },
        restrictions: {
            allergies: data.allergies || [],
            dietaryLifestyle: data.dietaryLifestyle,
            religiousCultural: data.restrictions || []
        },
        preferences: {
            meats: data.meats || [],
            meatFrequency: data.meatFrequency,
            vegetables: data.vegetables || [],
            seafood: data.seafood || [],
            dairy: data.dairy || [],
            plantProteins: data.plantProteins || [],
            mealsPerDay: data.mealsPerDay,
            cookingTime: data.cookingTime,
            skillLevel: data.skillLevel,
            varietyPreference: data.variety,
            favoriteCuisines: data.cuisines || [],
            lovedFoods: data.lovedFoods,
            hatedFoods: data.hatedFoods,
            spiceLevel: data.spiceLevel
        },
        lifestyle: {
            budget: data.budget,
            healthConditions: data.healthConditions,
            specialNotes: data.specialNotes
        }
    };
}

async function simulateAIResponse(promptData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Calculate macros based on goals and body type
    const calories = parseInt(promptData.goals.targetCalories);
    let macros = {};
    
    if (promptData.goals.primaryGoal === 'muscle-gain') {
        macros = { 
            protein: Math.round(calories * 0.3 / 4), 
            carbs: Math.round(calories * 0.45 / 4), 
            fat: Math.round(calories * 0.25 / 9) 
        };
    } else if (promptData.goals.primaryGoal === 'weight-loss') {
        macros = { 
            protein: Math.round(calories * 0.35 / 4), 
            carbs: Math.round(calories * 0.35 / 4), 
            fat: Math.round(calories * 0.3 / 9) 
        };
    } else {
        macros = { 
            protein: Math.round(calories * 0.25 / 4), 
            carbs: Math.round(calories * 0.45 / 4), 
            fat: Math.round(calories * 0.3 / 9) 
        };
    }
    
    // Generate personalized 2-week meal plan
    const mealPlan = generatePersonalizedMealPlan(promptData);
    const shoppingList = generatePersonalizedShoppingList(promptData, mealPlan);
    
    return {
        macros,
        mealPlan,
        shoppingList,
        aiSummary: generateAISummary(promptData)
    };
}

function generatePersonalizedMealPlan(data) {
    const weeks = ['Week 1', 'Week 2'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const plan = {};
    
    // Create meal templates based on preferences
    const mealTemplates = createMealTemplates(data);
    
    weeks.forEach(week => {
        plan[week] = {};
        days.forEach(day => {
            plan[week][day] = {
                breakfast: mealTemplates.breakfast[Math.floor(Math.random() * mealTemplates.breakfast.length)],
                lunch: mealTemplates.lunch[Math.floor(Math.random() * mealTemplates.lunch.length)],
                dinner: mealTemplates.dinner[Math.floor(Math.random() * mealTemplates.dinner.length)]
            };
            
            // Add snacks if needed
            if (parseInt(data.preferences.mealsPerDay) > 3) {
                plan[week][day].snack = mealTemplates.snacks[Math.floor(Math.random() * mealTemplates.snacks.length)];
            }
        });
    });
    
    return plan;
}

function createMealTemplates(data) {
    const isVegetarian = data.restrictions.dietaryLifestyle === 'vegetarian' || data.restrictions.dietaryLifestyle === 'vegan';
    const isKeto = data.restrictions.dietaryLifestyle === 'keto';
    const skillLevel = data.preferences.skillLevel;
    
    return {
        breakfast: [
            { name: 'Greek Yogurt Parfait', calories: 320, protein: 25, carbs: 35, fat: 8, difficulty: 'beginner' },
            { name: 'Scrambled Eggs with Avocado Toast', calories: 380, protein: 18, carbs: 25, fat: 22, difficulty: 'beginner' },
            { name: 'Protein Smoothie Bowl', calories: 350, protein: 30, carbs: 40, fat: 12, difficulty: 'beginner' },
            { name: 'Overnight Oats with Berries', calories: 340, protein: 15, carbs: 55, fat: 8, difficulty: 'beginner' },
            { name: 'Veggie Omelet', calories: 280, protein: 20, carbs: 8, fat: 18, difficulty: 'intermediate' }
        ],
        lunch: [
            { name: 'Grilled Chicken Salad', calories: 420, protein: 35, carbs: 15, fat: 25, difficulty: 'beginner' },
            { name: 'Quinoa Buddha Bowl', calories: 450, protein: 18, carbs: 65, fat: 15, difficulty: 'intermediate' },
            { name: 'Turkey Wrap with Hummus', calories: 380, protein: 25, carbs: 45, fat: 12, difficulty: 'beginner' },
            { name: 'Salmon with Sweet Potato', calories: 480, protein: 30, carbs: 35, fat: 22, difficulty: 'intermediate' },
            { name: 'Chickpea Curry with Rice', calories: 440, protein: 16, carbs: 70, fat: 12, difficulty: 'intermediate' }
        ],
        dinner: [
            { name: 'Baked Cod with Vegetables', calories: 350, protein: 30, carbs: 25, fat: 15, difficulty: 'intermediate' },
            { name: 'Lean Beef Stir-fry', calories: 420, protein: 32, carbs: 35, fat: 18, difficulty: 'intermediate' },
            { name: 'Grilled Chicken with Quinoa', calories: 450, protein: 38, carbs: 40, fat: 16, difficulty: 'beginner' },
            { name: 'Lentil Bolognese with Pasta', calories: 380, protein: 18, carbs: 65, fat: 8, difficulty: 'intermediate' },
            { name: 'Turkey Meatballs with Zucchini Noodles', calories: 320, protein: 28, carbs: 12, fat: 18, difficulty: 'intermediate' }
        ],
        snacks: [
            { name: 'Apple with Almond Butter', calories: 180, protein: 6, carbs: 20, fat: 12, difficulty: 'beginner' },
            { name: 'Greek Yogurt with Nuts', calories: 150, protein: 15, carbs: 8, fat: 8, difficulty: 'beginner' },
            { name: 'Protein Smoothie', calories: 200, protein: 25, carbs: 15, fat: 5, difficulty: 'beginner' },
            { name: 'Hummus with Veggies', calories: 120, protein: 5, carbs: 12, fat: 6, difficulty: 'beginner' }
        ]
    };
}

function generatePersonalizedShoppingList(data, mealPlan) {
    const proteins = [];
    const vegetables = [];
    const carbs = [];
    const fats = [];
    const other = [];
    
    // Analyze meal plan to create shopping list based on detailed preferences
    
    // Add selected meats
    data.preferences.meats.forEach(meat => {
        if (meat.includes('Chicken Breast')) proteins.push('Chicken breast (2-3 lbs)');
        if (meat.includes('Ground Beef')) proteins.push('Ground beef (2 lbs)');
        if (meat.includes('Turkey')) proteins.push('Turkey (1-2 lbs)');
        if (meat.includes('Pork')) proteins.push('Pork (1-2 lbs)');
    });
    
    // Add selected seafood
    data.preferences.seafood.forEach(seafood => {
        if (seafood.includes('Salmon')) proteins.push('Salmon fillets (1 lb)');
        if (seafood.includes('Shrimp')) proteins.push('Shrimp (1 lb)');
        if (seafood.includes('Tuna')) proteins.push('Tuna steaks (8 oz)');
    });
    
    // Add selected dairy
    data.preferences.dairy.forEach(dairy => {
        if (dairy.includes('Eggs')) proteins.push('Eggs (2 dozen)');
        if (dairy.includes('Greek Yogurt')) proteins.push('Greek yogurt (large container)');
        if (dairy.includes('Cottage Cheese')) proteins.push('Cottage cheese (large container)');
    });
    
    // Add plant proteins if selected
    data.preferences.plantProteins.forEach(plant => {
        if (plant.includes('Tofu')) proteins.push('Tofu (2 blocks)');
        if (plant.includes('Beans')) proteins.push('Beans/legumes (variety)');
        if (plant.includes('Protein Powder')) proteins.push('Protein powder');
    });
    
    // Add selected vegetables (use first 8-10 for shopping list)
    const selectedVeggies = data.preferences.vegetables.slice(0, 10).map(veggie => {
        // Clean up emoji and formatting for shopping list
        return veggie.replace(/🥬|🥦|🥕|🥔|🌶️|🍅|🥒|🧅|🧄|🍄|🌽|🥑|🫒|🫑|🍆|🌿/g, '').trim();
    });
    vegetables.push(...selectedVeggies);
    
    // Add carbs based on lifestyle
    if (data.restrictions.dietaryLifestyle !== 'keto') {
        carbs.push('Quinoa', 'Brown rice', 'Sweet potatoes', 'Oats', 'Whole grain bread');
    }
    
    // Add healthy fats
    fats.push('Olive oil', 'Almonds', 'Almond butter', 'Chia seeds');
    
    // Add other items
    other.push('Protein powder', 'Seasonings & spices', 'Lemon', 'Garlic', 'Onions');
    
    return {
        proteins,
        vegetables, 
        carbs,
        fats,
        other,
        estimatedCost: calculateEstimatedCost(data.lifestyle.budget)
    };
}

function calculateEstimatedCost(budget) {
    switch(budget) {
        case 'budget': return '$80-120/week';
        case 'moderate': return '$120-180/week';
        case 'flexible': return '$180-250/week';
        default: return '$120-180/week';
    }
}

function generateAISummary(data) {
    return `Based on your ${data.personalInfo.age}-year-old ${data.personalInfo.gender} profile with ${data.personalInfo.activityLevel} activity level, I've created a personalized ${data.goals.targetCalories}-calorie meal plan focused on ${data.goals.primaryGoal}. The plan considers your ${data.restrictions.dietaryLifestyle} lifestyle, accommodates your ${data.preferences.skillLevel} cooking skills, and includes your favorite cuisines while avoiding foods you dislike. Each meal is designed to fit your ${data.preferences.cookingTime} cooking schedule and ${data.preferences.varietyPreference} variety preference.`;
}

function showAIDietPlan() {
    const content = document.getElementById('diet-creation-content');
    const plan = currentDietPlan;
    
    const html = `
        <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">🤖 Your AI-Generated Meal Plan</h2>
            <p style="opacity: 0.9;">Personalized 2-week plan ready!</p>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">📊 AI Summary</h3>
            <p style="color: #666; line-height: 1.5; margin-bottom: 20px;">${plan.aiSummary}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="text-align: center; padding: 15px; background: var(--lighter-bg); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: bold; color: var(--primary);">${plan.macros.protein}g</div>
                    <div style="font-size: 12px; color: #666;">Protein</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--lighter-bg); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: bold; color: var(--primary);">${plan.macros.carbs}g</div>
                    <div style="font-size: 12px; color: #666;">Carbs</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--lighter-bg); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: bold; color: var(--primary);">${plan.macros.fat}g</div>
                    <div style="font-size: 12px; color: #666;">Fat</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="showAIMealPlan()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 25px; border-radius: 20px; flex: 1; font-weight: bold; cursor: pointer;">
                    📅 View 2-Week Plan
                </button>
                <button onclick="showAIShoppingList()" style="background: #28a745; color: white; border: none; padding: 15px 25px; border-radius: 20px; flex: 1; font-weight: bold; cursor: pointer;">
                    🛒 Shopping List
                </button>
            </div>
            
            <div style="margin-top: 15px;">
                <button onclick="showScreen('diet-creation')" style="background: #6c757d; color: white; border: none; padding: 12px 25px; border-radius: 20px; width: 100%; font-weight: bold; cursor: pointer;">
                    ← Back to Diet Creation
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function showAIMealPlan() {
    const content = document.getElementById('diet-creation-content');
    const plan = currentDietPlan;
    
    let html = `
        <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">📅 Your 2-Week Meal Plan</h2>
            <p style="opacity: 0.9;">AI-generated personalized meals</p>
        </div>
    `;
    
    Object.keys(plan.mealPlan).forEach(week => {
        html += `
            <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
                <h3 style="color: var(--dark); margin-bottom: 20px; text-align: center;">${week}</h3>
        `;
        
        Object.keys(plan.mealPlan[week]).forEach(day => {
            const dayMeals = plan.mealPlan[week][day];
            html += `
                <div style="margin-bottom: 20px; padding: 15px; background: var(--lighter-bg); border-radius: 15px;">
                    <h4 style="color: var(--dark); margin-bottom: 15px;">${day}</h4>
                    <div style="display: grid; gap: 10px;">
                        <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: between; align-items: center;">
                            <div>
                                <strong>Breakfast:</strong> ${dayMeals.breakfast.name}
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                ${dayMeals.breakfast.calories} cal
                            </div>
                        </div>
                        <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: between; align-items: center;">
                            <div>
                                <strong>Lunch:</strong> ${dayMeals.lunch.name}
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                ${dayMeals.lunch.calories} cal
                            </div>
                        </div>
                        <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: between; align-items: center;">
                            <div>
                                <strong>Dinner:</strong> ${dayMeals.dinner.name}
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                ${dayMeals.dinner.calories} cal
                            </div>
                        </div>
                        ${dayMeals.snack ? `
                            <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: between; align-items: center;">
                                <div>
                                    <strong>Snack:</strong> ${dayMeals.snack.name}
                                </div>
                                <div style="font-size: 12px; color: #666;">
                                    ${dayMeals.snack.calories} cal
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    html += `
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <div style="display: flex; gap: 10px;">
                <button onclick="showAIDietPlan()" style="background: #6c757d; color: white; border: none; padding: 15px 25px; border-radius: 20px; flex: 1; font-weight: bold; cursor: pointer;">
                    ← Back to Summary
                </button>
                <button onclick="showAIShoppingList()" style="background: #28a745; color: white; border: none; padding: 15px 25px; border-radius: 20px; flex: 1; font-weight: bold; cursor: pointer;">
                    🛒 Shopping List
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function showAIShoppingList() {
    const content = document.getElementById('diet-creation-content');
    const plan = currentDietPlan;
    
    const html = `
        <div style="background: var(--gradient-1); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">🛒 Your Shopping List</h2>
            <p style="opacity: 0.9;">Everything you need for 2 weeks</p>
            <div style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.2); border-radius: 10px;">
                <strong>Estimated Cost: ${plan.shoppingList.estimatedCost}</strong>
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <div style="display: grid; gap: 20px;">
                <div>
                    <h4 style="color: var(--dark); margin-bottom: 12px;">🥩 Proteins</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        ${plan.shoppingList.proteins.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                    </ul>
                </div>
                
                <div>
                    <h4 style="color: var(--dark); margin-bottom: 12px;">🥬 Vegetables</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        ${plan.shoppingList.vegetables.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                    </ul>
                </div>
                
                ${plan.shoppingList.carbs.length > 0 ? `
                    <div>
                        <h4 style="color: var(--dark); margin-bottom: 12px;">🍞 Carbohydrates</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #666;">
                            ${plan.shoppingList.carbs.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div>
                    <h4 style="color: var(--dark); margin-bottom: 12px;">🥑 Healthy Fats</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        ${plan.shoppingList.fats.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                    </ul>
                </div>
                
                <div>
                    <h4 style="color: var(--dark); margin-bottom: 12px;">🧂 Other Items</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        ${plan.shoppingList.other.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div style="margin-top: 25px; display: flex; gap: 10px;">
                <button onclick="showAIDietPlan()" style="background: #6c757d; color: white; border: none; padding: 15px 25px; border-radius: 20px; flex: 1; font-weight: bold; cursor: pointer;">
                    ← Back to Summary
                </button>
                <button onclick="showAIMealPlan()" style="background: var(--gradient-1); color: white; border: none; padding: 15px 25px; border-radius: 20px; flex: 1; font-weight: bold; cursor: pointer;">
                    📅 View Meal Plan
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function generateDietPlan() {
    // Save step 2 data
    const allergies = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    dietData.allergies = allergies.includes('None') ? [] : allergies;
    dietData.dietType = document.getElementById('diet-type').value;
    
    // Calculate macros based on goals
    const calories = parseInt(dietData.calories);
    let macros = {};
    
    if (dietData.goal === 'muscle-gain') {
        macros = { protein: Math.round(calories * 0.3 / 4), carbs: Math.round(calories * 0.45 / 4), fat: Math.round(calories * 0.25 / 9) };
    } else if (dietData.goal === 'weight-loss') {
        macros = { protein: Math.round(calories * 0.35 / 4), carbs: Math.round(calories * 0.35 / 4), fat: Math.round(calories * 0.3 / 9) };
    } else {
        macros = { protein: Math.round(calories * 0.25 / 4), carbs: Math.round(calories * 0.45 / 4), fat: Math.round(calories * 0.3 / 9) };
    }
    
    // Generate weekly meal plan
    const mealPlan = generateWeeklyMeals();
    const shoppingList = generateShoppingList(mealPlan);
    
    currentDietPlan = {
        ...dietData,
        macros,
        mealPlan,
        shoppingList,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('currentDietPlan', JSON.stringify(currentDietPlan));
    showDietPlan();
}

function generateWeeklyMeals() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const meals = {};
    
    days.forEach(day => {
        meals[day] = {
            breakfast: foods.breakfast[Math.floor(Math.random() * foods.breakfast.length)],
            lunch: foods.lunch[Math.floor(Math.random() * foods.lunch.length)],
            dinner: foods.dinner[Math.floor(Math.random() * foods.dinner.length)],
            snack: foods.snack[Math.floor(Math.random() * foods.snack.length)]
        };
    });
    
    return meals;
}

function generateShoppingList(mealPlan) {
    return [
        '🥩 Proteins: Chicken breast, Salmon, Eggs, Greek yogurt, Turkey',
        '🥬 Vegetables: Broccoli, Spinach, Bell peppers, Tomatoes, Lettuce',
        '🍞 Carbs: Brown rice, Quinoa, Oatmeal, Whole wheat bread, Sweet potatoes',
        '🥑 Fats: Avocado, Olive oil, Almonds, Almond butter',
        '🧂 Other: Seasonings, Low-fat dressing, Protein powder'
    ];
}

function showDietPlan() {
    const content = document.getElementById('diet-creation-content');
    const plan = currentDietPlan;
    
    let totalDayCalories = 0;
    const todayMeals = plan.mealPlan['Monday'];
    Object.values(todayMeals).forEach(meal => totalDayCalories += meal.calories);
    
    let html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">🎉 Your Custom Meal Plan!</h2>
            <p style="opacity: 0.9;">Tailored for ${dietData.goal.replace('-', ' ')}</p>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 20px;">📊 Daily Targets</h3>
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; font-weight: bold; color: var(--primary);">${plan.calories}</div>
                <div style="color: #666;">calories per day</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">${plan.macros.protein}g</div>
                    <div style="font-size: 12px; color: #666;">Protein</div>
                </div>
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: bold; color: #f39c12;">${plan.macros.carbs}g</div>
                    <div style="font-size: 12px; color: #666;">Carbs</div>
                </div>
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${plan.macros.fat}g</div>
                    <div style="font-size: 12px; color: #666;">Fat</div>
                </div>
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 20px;">📅 This Week's Meals</h3>
            <div style="max-height: 400px; overflow-y: auto;">
                ${Object.entries(plan.mealPlan).map(([day, meals]) => `
                    <div style="background: var(--lighter-bg); padding: 20px; border-radius: 15px; margin-bottom: 15px;">
                        <h4 style="color: var(--primary); margin-bottom: 15px;">${day}</h4>
                        <div style="display: grid; gap: 10px;">
                            <div>🌅 <strong>Breakfast:</strong> ${meals.breakfast.name} (${meals.breakfast.calories} cal)</div>
                            <div>☀️ <strong>Lunch:</strong> ${meals.lunch.name} (${meals.lunch.calories} cal)</div>
                            <div>🌙 <strong>Dinner:</strong> ${meals.dinner.name} (${meals.dinner.calories} cal)</div>
                            <div>🥜 <strong>Snack:</strong> ${meals.snack.name} (${meals.snack.calories} cal)</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 20px;">🛒 Shopping List</h3>
            <div style="white-space: pre-line; color: #666; line-height: 1.8;">${plan.shoppingList.join('\n')}</div>
        </div>
        
        <button onclick="resetDietPlan()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; width: 100%; font-weight: bold; cursor: pointer;">
            🔄 Create New Plan
        </button>
    `;
    
    content.innerHTML = html;
}

function resetDietPlan() {
    currentDietPlan = null;
    dietQuizStep = 1;
    dietData = {};
    localStorage.removeItem('currentDietPlan');
    showDietQuiz();
}

// Measurement system toggle
let measurementSystem = 'imperial';

function setMeasurementSystem(system) {
    measurementSystem = system;
    
    const imperialBtn = document.getElementById('imperial-btn');
    const metricBtn = document.getElementById('metric-btn');
    const weightUnit = document.getElementById('weight-unit');
    const heightImperial = document.getElementById('height-imperial');
    const heightMetric = document.getElementById('height-metric');
    const weightInput = document.getElementById('calc-weight');
    
    if (system === 'imperial') {
        imperialBtn.style.background = 'var(--primary)';
        imperialBtn.style.color = 'white';
        imperialBtn.style.border = 'none';
        metricBtn.style.background = 'var(--lighter-bg)';
        metricBtn.style.color = 'var(--dark)';
        metricBtn.style.border = '1px solid #ddd';
        
        weightUnit.textContent = '(lbs)';
        weightInput.placeholder = '150';
        heightImperial.style.display = 'block';
        heightMetric.style.display = 'none';
    } else {
        metricBtn.style.background = 'var(--primary)';
        metricBtn.style.color = 'white';
        metricBtn.style.border = 'none';
        imperialBtn.style.background = 'var(--lighter-bg)';
        imperialBtn.style.color = 'var(--dark)';
        imperialBtn.style.border = '1px solid #ddd';
        
        weightUnit.textContent = '(kg)';
        weightInput.placeholder = '68';
        heightImperial.style.display = 'none';
        heightMetric.style.display = 'block';
    }
}

// Calorie Calculator Function
function calculateCalories() {
    const age = parseInt(document.getElementById('calc-age').value);
    const gender = document.getElementById('calc-gender').value;
    const weight = parseFloat(document.getElementById('calc-weight').value);
    const activity = parseFloat(document.getElementById('calc-activity').value);
    const bodyType = document.getElementById('calc-bodytype').value;
    
    let height;
    if (measurementSystem === 'imperial') {
        const feet = parseFloat(document.getElementById('calc-feet').value) || 0;
        const inches = parseFloat(document.getElementById('calc-inches').value) || 0;
        height = (feet * 12) + inches; // Convert to total inches
        
        if (!feet || (!inches && inches !== 0)) {
            alert('Please enter both feet and inches for height');
            return;
        }
    } else {
        height = parseFloat(document.getElementById('calc-height-cm').value);
    }
    
    if (!age || !gender || !weight || !height || !activity || !bodyType) {
        alert('Please fill in all fields including body type');
        return;
    }
    
    // Convert to metric for calculation
    let weightKg, heightCm;
    if (measurementSystem === 'imperial') {
        weightKg = weight * 0.453592;
        heightCm = height * 2.54;
    } else {
        weightKg = weight;
        heightCm = height;
    }
    
    // Calculate BMR using Mifflin-St Jeor equation
    let bmr;
    if (gender === 'male') {
        bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    } else {
        bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    }
    
    // Calculate TDEE with body type adjustment
    let tdeeAdjustment = 1.0;
    if (bodyType === 'ectomorph') {
        tdeeAdjustment = 1.05; // +5% for fast metabolism
    } else if (bodyType === 'endomorph') {
        tdeeAdjustment = 0.95; // -5% for slower metabolism
    }
    
    const tdee = Math.round(bmr * activity * tdeeAdjustment);
    
    // Calculate macros based on body type
    let proteinRatio, carbRatio, fatRatio;
    
    if (bodyType === 'ectomorph') {
        // Higher carbs for ectomorphs
        proteinRatio = 0.25;
        carbRatio = 0.50;
        fatRatio = 0.25;
    } else if (bodyType === 'mesomorph') {
        // Balanced macros for mesomorphs
        proteinRatio = 0.30;
        carbRatio = 0.40;
        fatRatio = 0.30;
    } else if (bodyType === 'endomorph') {
        // Lower carbs for endomorphs
        proteinRatio = 0.35;
        carbRatio = 0.25;
        fatRatio = 0.40;
    }
    
    const protein = Math.round((tdee * proteinRatio) / 4);
    const carbs = Math.round((tdee * carbRatio) / 4);
    const fat = Math.round((tdee * fatRatio) / 9);
    
    // Show results
    const resultsDiv = document.getElementById('calc-results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${tdee}</div>
            <div style="color: #666; font-size: 14px;">Daily Maintenance Calories</div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center; margin-bottom: 15px;">
            <div style="background: white; padding: 12px; border-radius: 8px;">
                <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">${protein}g</div>
                <div style="font-size: 12px; color: #666;">Protein</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 8px;">
                <div style="font-size: 20px; font-weight: bold; color: #f39c12;">${carbs}g</div>
                <div style="font-size: 12px; color: #666;">Carbs</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 8px;">
                <div style="font-size: 20px; font-weight: bold; color: #27ae60;">${fat}g</div>
                <div style="font-size: 12px; color: #666;">Fat</div>
            </div>
        </div>
        
        <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <div style="font-size: 14px; font-weight: bold; color: var(--dark); margin-bottom: 5px;">Body Type: ${bodyType.charAt(0).toUpperCase() + bodyType.slice(1)}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                ${bodyType === 'ectomorph' ? 'High carbs (50%), moderate protein/fat. +5% metabolism boost.' : 
                  bodyType === 'mesomorph' ? 'Balanced macros (30/40/30). Optimal for muscle building.' :
                  'Lower carbs (25%), higher protein/fat. -5% for slower metabolism.'}
            </div>
            <div style="font-size: 12px; color: #666;">
                • Weight Loss: ${tdee - 500} calories (-500)<br>
                • Muscle Gain: ${tdee + 300} calories (+300)<br>
                • Maintenance: ${tdee} calories
            </div>
        </div>
        
        <button onclick="useCalculatedCalories(${tdee})" style="background: var(--gradient-1); color: white; border: none; padding: 10px 20px; border-radius: 10px; width: 100%; font-weight: bold; cursor: pointer;">
            Use These Results in Custom Plan
        </button>
    `;
}

function useCalculatedCalories(calories) {
    document.getElementById('calorie-target').value = calories;
    showNotification('Calories added to your custom plan!');
}

// Popular Diet Selection
function selectPopularDiet(dietType) {
    const dietPlans = {
        keto: {
            name: 'Ketogenic Diet',
            calories: 1800,
            macros: { protein: 135, carbs: 23, fat: 140 },
            description: 'High-fat, very low-carb diet for rapid weight loss',
            foods: ['Avocado', 'Salmon', 'Eggs', 'Cheese', 'Olive oil', 'Leafy greens', 'Nuts', 'MCT oil'],
            rules: ['<20g carbs daily', 'High fat intake', 'Moderate protein', 'No grains/sugar']
        },
        paleo: {
            name: 'Paleo Diet',
            calories: 2000,
            macros: { protein: 150, carbs: 125, fat: 89 },
            description: 'Eat like our ancestors - whole foods only',
            foods: ['Grass-fed meat', 'Wild fish', 'Vegetables', 'Fruits', 'Nuts', 'Seeds', 'Sweet potatoes'],
            rules: ['No grains', 'No dairy', 'No processed foods', 'No legumes']
        },
        intermittent: {
            name: 'Intermittent Fasting 16:8',
            calories: 1900,
            macros: { protein: 142, carbs: 213, fat: 63 },
            description: 'Eat within 8-hour window, fast for 16 hours',
            foods: ['Balanced meals', 'Nutrient-dense foods', 'Proper hydration during fasts'],
            rules: ['16-hour fast', '8-hour eating window', 'No calories during fast', 'Stay hydrated']
        },
        vegan: {
            name: 'Vegan Diet',
            calories: 2000,
            macros: { protein: 125, carbs: 275, fat: 67 },
            description: 'Plant-based nutrition for health and ethics',
            foods: ['Legumes', 'Tofu', 'Quinoa', 'Vegetables', 'Fruits', 'Nuts', 'Seeds', 'Plant milk'],
            rules: ['No animal products', 'B12 supplement needed', 'Protein combining', 'Iron-rich foods']
        },
        carnivore: {
            name: 'Carnivore Diet',
            calories: 2200,
            macros: { protein: 165, carbs: 0, fat: 146 },
            description: 'Animal products only - ultimate elimination diet',
            foods: ['Beef', 'Pork', 'Chicken', 'Fish', 'Eggs', 'Organ meats', 'Bone marrow'],
            rules: ['Animals only', 'No plants', 'Salt allowed', 'Water only']
        },
        flexible: {
            name: 'Flexible Dieting (IIFYM)',
            calories: 2000,
            macros: { protein: 150, carbs: 200, fat: 78 },
            description: 'Track macros, eat any foods that fit',
            foods: ['Any foods that fit your macros', 'Focus on whole foods 80% of time'],
            rules: ['Hit macro targets', '80/20 rule', 'Track everything', 'Flexible food choices']
        }
    };
    
    const plan = dietPlans[dietType];
    if (!plan) return;
    
    // Create and save the diet plan
    currentDietPlan = {
        name: plan.name,
        calories: plan.calories,
        macros: plan.macros,
        description: plan.description,
        foods: plan.foods,
        rules: plan.rules,
        type: 'popular',
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('currentDietPlan', JSON.stringify(currentDietPlan));
    showSelectedDiet(plan);
}

function showSelectedDiet(plan) {
    const content = document.getElementById('diet-creation-content');
    
    let html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 25px; margin-bottom: 25px; text-align: center;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">🎉 ${plan.name} Selected!</h2>
            <p style="opacity: 0.9;">${plan.description}</p>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 20px;">📊 Your Daily Targets</h3>
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; font-weight: bold; color: var(--primary);">${plan.calories}</div>
                <div style="color: #666;">calories per day</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">${plan.macros.protein}g</div>
                    <div style="font-size: 12px; color: #666;">Protein</div>
                </div>
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: bold; color: #f39c12;">${plan.macros.carbs}g</div>
                    <div style="font-size: 12px; color: #666;">Carbs</div>
                </div>
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${plan.macros.fat}g</div>
                    <div style="font-size: 12px; color: #666;">Fat</div>
                </div>
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">🥗 Recommended Foods</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                ${plan.foods.map(food => `
                    <div style="background: var(--lighter-bg); padding: 10px; border-radius: 8px; text-align: center; color: var(--dark);">
                        ${food}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: var(--dark); margin-bottom: 15px;">📋 Key Rules</h3>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
                ${plan.rules.map(rule => `<li style="margin-bottom: 8px;">${rule}</li>`).join('')}
            </ul>
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button onclick="resetDietPlan()" style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; cursor: pointer; flex: 1;">
                🔄 Choose Different Diet
            </button>
            <button onclick="showScreen('diet-tracker')" style="background: var(--gradient-1); color: white; border: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; cursor: pointer; flex: 2;">
                🚀 Start Tracking
            </button>
        </div>
    `;
    
    content.innerHTML = html;
}

// Load diet tracker
function loadDietTracker() {
    const content = document.getElementById('diet-tracker-content');
    const todayLog = dailyFoodLog.filter(entry => {
        return new Date(entry.timestamp).toDateString() === new Date().toDateString();
    });
    
    const totals = todayLog.reduce((acc, food) => {
        acc.calories += food.calories;
        acc.protein += food.protein;
        acc.carbs += food.carbs;
        acc.fat += food.fat;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    const targetCalories = currentDietPlan?.calories || 2000;
    const remaining = targetCalories - totals.calories;
    const percent = (totals.calories / targetCalories) * 100;
    
    let html = `
        <div style="background: var(--gradient-1); color: white; padding: 20px; border-radius: 20px; margin-bottom: 25px; text-align: center;">
            <h3 style="font-size: 20px; margin-bottom: 10px;">🥗 Diet Tracker</h3>
            <p style="opacity: 0.9; font-size: 14px;">Track your daily nutrition</p>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">📊 Today's Progress</h4>
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 36px; font-weight: bold; color: var(--primary);">${totals.calories}</div>
                <div style="color: #666;">of ${targetCalories} calories</div>
            </div>
            <div style="background: var(--lighter-bg); border-radius: 10px; height: 20px; overflow: hidden;">
                <div style="background: ${percent > 100 ? '#e74c3c' : 'var(--gradient-1)'}; height: 100%; width: ${Math.min(percent, 100)}%; transition: width 0.3s ease;"></div>
            </div>
            <div style="text-align: center; margin-top: 10px; color: ${remaining >= 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                ${Math.abs(remaining)} calories ${remaining >= 0 ? 'remaining' : 'over'}
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">➕ Add Meal</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                ${['breakfast', 'lunch', 'dinner', 'snack'].map(meal => `
                    <button onclick="addFood('${meal}')" style="background: var(--primary); color: white; border: none; padding: 15px; border-radius: 12px; font-weight: bold; cursor: pointer; text-transform: capitalize;">
                        ${meal === 'breakfast' ? '🌅' : meal === 'lunch' ? '☀️' : meal === 'dinner' ? '🌙' : '🥜'} ${meal}
                    </button>
                `).join('')}
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 20px; padding: 20px;">
            <h4 style="color: var(--dark); margin-bottom: 15px;">🍽️ Today's Meals</h4>
            ${todayLog.length === 0 ? 
                '<p style="text-align: center; color: #666; padding: 20px;">No meals logged yet. Start by adding breakfast!</p>' :
                todayLog.map(food => `
                    <div style="background: var(--lighter-bg); padding: 15px; border-radius: 12px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: bold; color: var(--dark);">${food.name}</div>
                                <div style="font-size: 12px; color: #666;">${food.mealType} • ${new Date(food.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: var(--primary); font-weight: bold;">${food.calories} cal</div>
                                <div style="font-size: 11px; color: #666;">P: ${food.protein}g | C: ${food.carbs}g | F: ${food.fat}g</div>
                            </div>
                        </div>
                    </div>
                `).join('')
            }
        </div>
        
        ${!currentDietPlan ? `
            <div style="background: var(--lighter-bg); padding: 20px; border-radius: 20px; text-align: center; margin-top: 20px;">
                <p style="color: var(--primary-dark); margin-bottom: 15px;">Create a personalized meal plan!</p>
                <button onclick="showScreen('diet-creation')" style="background: var(--gradient-1); color: white; border: none; padding: 12px 30px; border-radius: 25px; font-weight: bold; cursor: pointer;">
                    🎯 Create Diet Plan
                </button>
            </div>
        ` : ''}
    `;
    
    content.innerHTML = html;
}

// Workout Program Functions
let currentWorkoutProgram = null;

function startWorkoutProgram(programId) {
    currentWorkoutProgram = programId;
    displayWorkoutProgram(programId);
}

function startWorkoutProgramFromInfo() {
    if (currentWorkoutProgram) {
        displayWorkoutProgram(currentWorkoutProgram);
    }
}

function displayWorkoutProgram(programId) {
    const program = workoutPrograms[programId];
    if (!program) return;
    
    document.getElementById('program-title').textContent = program.name;
    
    let contentHTML = `
        <div style="background: var(--gradient-1); color: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">${program.name}</h3>
            <p style="opacity: 0.9; margin: 0;">${program.duration} • ${program.daysPerWeek} days/week</p>
        </div>
    `;
    
    if (programId === '75hard') {
        contentHTML += `
            <div style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: var(--dark); margin-bottom: 15px;">📋 Daily Requirements</h4>
                <div style="display: grid; gap: 12px;">
                    <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 12px;">🥗</span>
                        <div>
                            <div style="font-weight: bold; color: var(--dark);">Follow a structured diet</div>
                            <div style="color: #666; font-size: 12px;">No cheat meals or alcohol</div>
                        </div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 12px;">💪</span>
                        <div>
                            <div style="font-weight: bold; color: var(--dark);">2 workouts (45 min each)</div>
                            <div style="color: #666; font-size: 12px;">One must be outdoors</div>
                        </div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 12px;">💧</span>
                        <div>
                            <div style="font-weight: bold; color: var(--dark);">Drink 1 gallon of water</div>
                            <div style="color: #666; font-size: 12px;">Every single day</div>
                        </div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 12px;">📚</span>
                        <div>
                            <div style="font-weight: bold; color: var(--dark);">Read 10 pages</div>
                            <div style="color: #666; font-size: 12px;">Non-fiction book only</div>
                        </div>
                    </div>
                    <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 12px;">📸</span>
                        <div>
                            <div style="font-weight: bold; color: var(--dark);">Take progress photo</div>
                            <div style="color: #666; font-size: 12px;">Document your journey</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="background: #ff4757; color: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; text-align: center;">
                <h4 style="margin: 0 0 10px 0;">⚠️ WARNING</h4>
                <p style="margin: 0; font-size: 14px;">Miss ANY task on ANY day = START OVER at Day 1</p>
            </div>
        `;
    } else {
        // Show weekly schedule for other programs
        contentHTML += `
            <div style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: var(--dark); margin-bottom: 15px;">📅 Weekly Schedule</h4>
        `;
        
        // Display each day's workout
        Object.entries(program.schedule).forEach(([day, workout]) => {
            contentHTML += `
                <div style="background: var(--lighter-bg); padding: 15px; border-radius: 15px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h5 style="margin: 0; color: var(--dark); font-weight: bold;">${day}</h5>
                        <span style="background: var(--primary); color: white; padding: 4px 8px; border-radius: 8px; font-size: 12px;">${workout.name}</span>
                    </div>
                    <div style="display: grid; gap: 8px;">
            `;
            
            // Show first few exercises as preview
            workout.exercises.slice(0, 3).forEach(exercise => {
                contentHTML += `
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
                        <span>${exercise.name}</span>
                        <span>${exercise.sets} x ${exercise.reps}</span>
                    </div>
                `;
            });
            
            if (workout.exercises.length > 3) {
                contentHTML += `
                    <div style="text-align: center; color: var(--primary); font-size: 12px;">
                        +${workout.exercises.length - 3} more exercises
                    </div>
                `;
            }
            
            contentHTML += `
                    </div>
                </div>
            `;
        });
        
        contentHTML += `
            </div>
        `;
    }
    
    // Add action buttons
    contentHTML += `
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button onclick="addProgramToSaved('${programId}')" style="background: var(--primary); color: white; border: none; padding: 15px; border-radius: 15px; font-weight: bold; cursor: pointer; flex: 1;">
                📚 Save Program
            </button>
            <button onclick="startProgramToday('${programId}')" style="background: var(--gradient-1); color: white; border: none; padding: 15px; border-radius: 15px; font-weight: bold; cursor: pointer; flex: 1;">
                🚀 Start Today
            </button>
        </div>
    `;
    
    document.getElementById('program-content').innerHTML = contentHTML;
    document.getElementById('workout-program').style.display = 'block';
}

function closeWorkoutProgram() {
    document.getElementById('workout-program').style.display = 'none';
}

function addProgramToSaved(programId) {
    const program = workoutPrograms[programId];
    
    // Get existing saved workouts
    let savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    
    // Check if program already exists
    const existingIndex = savedWorkouts.findIndex(w => w.id === programId);
    if (existingIndex !== -1) {
        alert(`"${program.name}" is already in your saved programs!`);
        closeWorkoutProgram();
        showScreen('saved-workouts');
        return;
    }
    
    // Add new program
    const savedProgram = {
        id: programId,
        name: program.name,
        duration: program.duration,
        daysPerWeek: program.daysPerWeek,
        type: program.type || 'Program',
        color: getWorkoutColor(programId),
        dateAdded: new Date().toISOString()
    };
    
    savedWorkouts.push(savedProgram);
    localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
    
    alert(`✅ "${program.name}" added to your saved programs!`);
    closeWorkoutProgram();
    showScreen('saved-workouts');
    loadSavedWorkouts(); // Refresh the display
}

function startProgramToday(programId) {
    const program = workoutPrograms[programId];
    
    // Automatically add to saved workouts (silently)
    let savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    const existingIndex = savedWorkouts.findIndex(w => w.id === programId);
    
    if (existingIndex === -1) {
        const savedProgram = {
            id: programId,
            name: program.name,
            duration: program.duration,
            daysPerWeek: program.daysPerWeek,
            type: program.type || 'Program',
            color: getWorkoutColor(programId),
            dateAdded: new Date().toISOString()
        };
        savedWorkouts.push(savedProgram);
        localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
    }
    
    if (programId === '75hard') {
        alert(`🔥 Starting 75 HARD Challenge today! Remember: ALL 5 tasks EVERY day for 75 days.\n\n✅ Program automatically added to your saved workouts!`);
    } else {
        // Get today's workout
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayWorkout = program.schedule[today];
        
        if (todayWorkout) {
            alert(`💪 Starting today's workout: ${todayWorkout.name}\n\n✅ Program automatically added to your saved workouts!`);
        } else {
            alert(`📅 Today is a rest day! Check back tomorrow for your next workout.\n\n✅ Program automatically added to your saved workouts!`);
        }
    }
    closeWorkoutProgram();
    showScreen('track-workouts');
}

function getWorkoutColor(programId) {
    const colors = {
        'cbum': '#4B9CD3',
        '75hard': '#C44569',
        'arnold': '#f39c12',
        'summershred': '#e74c3c',
        'beginner': '#27ae60',
        'chloe': '#e91e63',
        'amateur': '#9b59b6'
    };
    return colors[programId] || '#4B9CD3';
}

function loadSavedWorkouts() {
    const savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts') || '[]');
    const savedWorkoutsList = document.getElementById('saved-workouts-list');
    
    if (savedWorkouts.length === 0) {
        savedWorkoutsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h4>No saved workouts yet!</h4>
                <p>Start a workout program to add it here automatically.</p>
                <button onclick="showScreen('create-workout')" style="background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 20px; cursor: pointer; margin-top: 15px;">
                    Browse Workouts
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    savedWorkouts.forEach(workout => {
        const program = workoutPrograms[workout.id];
        const dayOptions = program && program.schedule ? Object.keys(program.schedule) : [];
        
        html += `
            <div class="workout-card" style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 15px; border-left: 4px solid ${workout.color};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="color: var(--dark); margin: 0;">${getWorkoutIcon(workout.id)} ${workout.name}</h4>
                    <span style="background: ${workout.color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${workout.duration}</span>
                </div>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">${workout.type} • ${workout.daysPerWeek} days/week</p>
                
                ${dayOptions.length > 0 ? `
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 12px; color: #666; margin-bottom: 5px; display: block;">Choose workout day:</label>
                        <select id="day-${workout.id}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                            ${dayOptions.map(day => `<option value="${day}">${day} - ${program.schedule[day].name}</option>`).join('')}
                        </select>
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="startSavedWorkout('${workout.id}')" style="background: ${workout.color}; color: white; border: none; padding: 8px 15px; border-radius: 15px; font-size: 14px; cursor: pointer;">
                        ▶️ Start
                    </button>
                    <button onclick="viewSavedWorkout('${workout.id}')" style="background: var(--lighter-bg); color: ${workout.color}; border: none; padding: 8px 15px; border-radius: 15px; font-size: 14px; cursor: pointer;">
                        👁️ View
                    </button>
                    <button onclick="deleteSavedWorkout('${workout.id}')" style="background: #ff4757; color: white; border: none; padding: 8px 15px; border-radius: 15px; font-size: 14px; cursor: pointer;">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    savedWorkoutsList.innerHTML = html;
}

function getWorkoutIcon(programId) {
    const icons = {
        'cbum': '🏆',
        '75hard': '🔥',
        'arnold': '💪',
        'summershred': '🌞',
        'beginner': '🌱',
        'chloe': '💃',
        'amateur': '⚡'
    };
    return icons[programId] || '💪';
}

// Initialize
window.onload = function() {
    updateTime();
    setInterval(updateTime, 1000);
    updateDailyQuote();
    
    // Show notification after 2 seconds
    setTimeout(showNotification, 2000);
};