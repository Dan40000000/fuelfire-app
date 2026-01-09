// Expert Profiles Database - Dan Perry
const expertProfiles = {
    trainers: [
        {
            id: 'dan-perry',
            name: 'Dan Perry',
            credentials: 'Certified Personal Trainer & Nutrition Coach',
            specialty: 'Body Transformation & Sustainable Fat Loss',
            experience: '10+ years',
            clients: '100+',
            rating: 5.0,
            hourlyRate: 100,
            avatar: '💪',
            profileImage: 'images/dan-perry-profile.webp',
            transformationImages: {
                before: ['images/dan-perry-before-1.jpg', 'images/dan-perry-before-2.jpg'],
                after: ['images/dan-perry-abs.jpg', 'images/dan-perry-back.jpg', 'images/dan-perry-gym.jpg']
            },
            bio: `I've been where you are. I know what it's like to look in the mirror and not recognize yourself. I was naturally a bigger guy—the kind of person who gains weight just looking at food. For years, I struggled with my body, tried every diet, and felt like I was fighting a losing battle.

But I refused to give up. Through years of trial and error, I discovered what actually works: focused training, clean eating, and most importantly—consistency. No magic pills. No shortcuts. Just discipline and the right knowledge.

Today, I'm in the best shape of my life. I built real muscle and lost the fat that held me back for years. And now, my mission is to help you do the same.

I'm not here to sell you a dream. I'm here to give you the roadmap that changed my life. If I can transform my body starting from where I was, I know you can too. Let's do this together.`,
            shortBio: "Former heavyweight turned fitness coach. I transformed my own body through clean eating and focused training—now I help others do the same.",
            achievements: [
                'Personal transformation: Lost 50+ lbs and built lean muscle',
                'Helped 100+ clients achieve their fitness goals',
                'Specializes in sustainable, real-world results',
                'No fads, no BS—just proven methods that work'
            ],
            specialties: [
                'Fat Loss & Body Recomposition',
                'Strength Training & Muscle Building',
                'Clean Eating & Macro-Based Nutrition',
                'Sustainable Lifestyle Changes',
                'Mindset & Consistency Coaching'
            ],
            philosophy: "Fitness isn't about being perfect—it's about being better than yesterday. I believe everyone deserves to feel strong, confident, and proud of their body. My job is to show you the path and walk it with you."
        }
    ],
    nutritionists: [
        {
            id: 'dan-perry-nutrition',
            name: 'Dan Perry',
            credentials: 'Nutrition Coach & Body Transformation Specialist',
            specialty: 'Clean Eating & Sustainable Nutrition',
            experience: '10+ years',
            clients: '100+',
            rating: 5.0,
            hourlyRate: 100,
            avatar: '🥗',
            profileImage: 'images/dan-perry-profile.webp',
            bio: `Nutrition was the game-changer for me. I spent years in the gym grinding hard, but my body didn't change until I fixed what I was eating. As someone who was naturally heavy, I had to learn the hard way that you can't out-train a bad diet.

I've tried it all—keto, intermittent fasting, meal replacements—you name it. What I discovered is that sustainable results come from understanding your body, tracking your macros, and eating real food. No extreme diets. No starving yourself. Just smart, clean eating that you can maintain for life.

Now I teach others the same principles that transformed my body. Whether you're trying to lose fat, build muscle, or just feel better in your own skin, I'll create a nutrition plan that fits YOUR life—not some cookie-cutter diet that you'll quit in two weeks.`,
            shortBio: "Transformed my body through nutrition. Now I help others build sustainable eating habits that actually work.",
            achievements: [
                'Mastered nutrition through personal transformation',
                'Developed sustainable meal planning systems',
                'Expert in macros, meal prep & clean eating',
                'Real results without extreme dieting'
            ],
            specialties: [
                'Macro-Based Nutrition Planning',
                'Meal Prep & Planning',
                'Fat Loss Nutrition',
                'Muscle Building Diet',
                'Sustainable Eating Habits'
            ]
        }
    ]
};

// Session packages with pricing
const sessionPackages = {
    single: {
        sessions: 1,
        price: 100,
        pricePerSession: 100,
        savings: 0,
        popular: false,
        description: 'One-on-one session to kickstart your journey'
    },
    starter: {
        sessions: 4,
        price: 360,
        pricePerSession: 90,
        savings: 40,
        popular: true,
        description: 'Perfect for building momentum and habits'
    },
    transformation: {
        sessions: 8,
        price: 640,
        pricePerSession: 80,
        savings: 160,
        popular: false,
        description: 'Complete transformation program'
    },
    elite: {
        sessions: 12,
        price: 840,
        pricePerSession: 70,
        savings: 360,
        popular: false,
        description: 'Full accountability and maximum results'
    }
};

// Get expert by ID
function getExpertById(id) {
    const allExperts = [...expertProfiles.trainers, ...expertProfiles.nutritionists];
    return allExperts.find(expert => expert.id === id);
}

// Get experts by type
function getExpertsByType(type) {
    return type === 'trainer' ? expertProfiles.trainers : expertProfiles.nutritionists;
}

// Get the main coach (Dan Perry)
function getMainCoach() {
    return expertProfiles.trainers[0];
}

// Calculate session cost
function calculateSessionCost(packageType, sessions = 1) {
    const pkg = sessionPackages[packageType];
    if (!pkg) return sessionPackages.single.price;
    return pkg.price;
}

export { expertProfiles, sessionPackages, getExpertById, getExpertsByType, getMainCoach, calculateSessionCost };
