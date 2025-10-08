// Exercise image mapping
const exerciseImages = {
    // Chest
    "Barbell Bench Press": "https://media.giphy.com/media/inVvfuomoD31K/giphy.gif",
    "Dumbbell Bench Press": "https://media.giphy.com/media/82W7N8dpXkQy3KIQvF/giphy.gif",
    "Incline Barbell Press": "https://media.giphy.com/media/KCcneND5SPvEd1gCxW/giphy.gif",
    "Push-ups": "https://media.giphy.com/media/3ohzdQ0aPaDbyD2Zry/giphy.gif",
    "Dumbbell Flyes": "https://media.giphy.com/media/XgOYSbU0pZ5qrVgHfD/giphy.gif",
    "Dips": "https://media.giphy.com/media/aTGZc1WENbMRy/giphy.gif",
    "Cable Crossovers": "https://media.giphy.com/media/CjmvTCZf2U3p09Cn0h/giphy.gif",
    "Decline Bench Press": "https://media.giphy.com/media/S9nOEjPeJxpj3Yyjzl/giphy.gif",
    
    // Back
    "Deadlift": "https://media.giphy.com/media/l44QjgeQ5ium91n9K/giphy.gif",
    "Pull-ups": "https://media.giphy.com/media/lNY0a117Jc3Vm/giphy.gif",
    "Barbell Rows": "https://media.giphy.com/media/6EUl7bx8d8dCdzsAiB/giphy.gif",
    "Lat Pulldowns": "https://media.giphy.com/media/SvQ7tWn8zeY2k/giphy.gif",
    "T-Bar Rows": "https://media.giphy.com/media/XzeJ5pGvl8JpK2FC10/giphy.gif",
    "Cable Rows": "https://media.giphy.com/media/xUySTCy0JHxUxw4fao/giphy.gif",
    "Face Pulls": "https://media.giphy.com/media/hpF9R9M1PHN5e5liSx/giphy.gif",
    "Shrugs": "https://media.giphy.com/media/l396Pm0GgH0SCqR32/giphy.gif",
    
    // Legs
    "Squats": "https://media.giphy.com/media/1qfKUnnWlaCHeiMyDa/giphy.gif",
    "Leg Press": "https://media.giphy.com/media/xT8qB3OUmM1c1Azsju/giphy.gif",
    "Lunges": "https://media.giphy.com/media/l0MYAoMdxUe5BONqM/giphy.gif",
    "Romanian Deadlift": "https://media.giphy.com/media/l378juKkfz46R8fF6/giphy.gif",
    "Leg Curls": "https://media.giphy.com/media/xTiTny5Iu2g1fQ5pSw/giphy.gif",
    "Leg Extensions": "https://media.giphy.com/media/3ohzdVnPF1MDW3pOAE/giphy.gif",
    "Calf Raises": "https://media.giphy.com/media/xT8qBpRm4bVGBF5cRy/giphy.gif",
    "Walking Lunges": "https://media.giphy.com/media/3oKIPvND7eI0FPc5Hi/giphy.gif",
    
    // Arms
    "Barbell Curls": "https://media.giphy.com/media/tJjqU5LkyMfYI/giphy.gif",
    "Hammer Curls": "https://media.giphy.com/media/l0MYKL1o9RDgHjfNK/giphy.gif",
    "Preacher Curls": "https://media.giphy.com/media/xT8qBtae5FfD7KaT6w/giphy.gif",
    "Cable Curls": "https://media.giphy.com/media/3ohhwHqYNy6LqPpZYY/giphy.gif",
    "Tricep Pushdowns": "https://media.giphy.com/media/3o7aD5tv1ogNBgVgK4/giphy.gif",
    "Overhead Extension": "https://media.giphy.com/media/YPKIJdwYWJ3Ik/giphy.gif",
    "Close-Grip Bench": "https://media.giphy.com/media/l3q2JnJPNUsDQBK3m/giphy.gif",
    "Diamond Push-ups": "https://media.giphy.com/media/xT8qBqNiYhTKxVE3N6/giphy.gif",
    
    // Shoulders
    "Overhead Press": "https://media.giphy.com/media/tsTsgmmuqTm9Pikluz/giphy.gif",
    "Lateral Raises": "https://media.giphy.com/media/3ohhwLqVHkK8hfzLgY/giphy.gif",
    "Front Raises": "https://media.giphy.com/media/xUySTEJYS5F1Cayg92/giphy.gif",
    "Rear Delt Flyes": "https://media.giphy.com/media/xT9IgvD3N8f7Fe7xQs/giphy.gif",
    "Arnold Press": "https://media.giphy.com/media/26FxypEb8iAjmgXE4/giphy.gif",
    "Upright Rows": "https://media.giphy.com/media/3oKIPrz8S1OhZ8ryFi/giphy.gif",
    "Shrugs": "https://media.giphy.com/media/l396Pm0GgH0SCqR32/giphy.gif",
    "Cable Lateral Raises": "https://media.giphy.com/media/26FL7sCtLHEifTmvK/giphy.gif",
    
    // Core
    "Plank": "https://media.giphy.com/media/xT8qBff8cRRFf7k2u4/giphy.gif",
    "Crunches": "https://media.giphy.com/media/3ohzdJlyD9MqcNfbKU/giphy.gif",
    "Russian Twists": "https://media.giphy.com/media/Ke8JKfxe83FpLrra4E/giphy.gif",
    "Leg Raises": "https://media.giphy.com/media/5t22Xgf9RzDBgIowhn/giphy.gif",
    "Mountain Climbers": "https://media.giphy.com/media/bWYc47O3jSef6/giphy.gif",
    "Bicycle Crunches": "https://media.giphy.com/media/TMNCtgJGJnV8k/giphy.gif",
    "Dead Bug": "https://media.giphy.com/media/l3q2EaEHFpcQZBRK0/giphy.gif",
    "Side Plank": "https://media.giphy.com/media/13HOBYoIMGe4QE/giphy.gif",
    
    // Cardio
    "Treadmill Running": "https://media.giphy.com/media/l0HlNO1F9qteMLTDa/giphy.gif",
    "Stationary Bike": "https://media.giphy.com/media/xT8qBlAFVao46DiH0k/giphy.gif",
    "Rowing Machine": "https://media.giphy.com/media/xT9IgKWjw37RgkYTUk/giphy.gif",
    "Jump Rope": "https://media.giphy.com/media/l2SpNtHdgOA9AFH6E/giphy.gif",
    "Burpees": "https://media.giphy.com/media/23hPPMRgPxbNBlPQe3/giphy.gif",
    "High Knees": "https://media.giphy.com/media/l0MYOK5QDQoya73IA/giphy.gif",
    "Box Jumps": "https://media.giphy.com/media/3o6ZtjVtr71Zkiw1P2/giphy.gif",
    "Battle Ropes": "https://media.giphy.com/media/xT9IgFLH8OnWAUraho/giphy.gif"
};

// Export for use in workout pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = exerciseImages;
}