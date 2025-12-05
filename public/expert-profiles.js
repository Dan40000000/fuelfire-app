// Expert Profiles Database
const expertProfiles = {
    trainers: [
        {
            id: 'trainer-1',
            name: 'Dr. Sarah Mitchell',
            credentials: 'PhD Exercise Science, CSCS, NSCA-CPT',
            specialty: 'Strength & Hypertrophy',
            experience: '15+ years',
            clients: '500+',
            rating: 4.9,
            hourlyRate: 100,
            avatar: '💪',
            bio: 'Former Olympic strength coach specializing in muscle building and performance optimization. Published researcher in hypertrophy training.',
            achievements: [
                'Trained 12 Olympic athletes',
                'Published 40+ research papers',
                'Certified Strength & Conditioning Specialist'
            ]
        },
        {
            id: 'trainer-2',
            name: 'Marcus Chen',
            credentials: 'MS Kinesiology, ACSM-EP, FMS',
            specialty: 'Endurance & Conditioning',
            experience: '12+ years',
            clients: '400+',
            rating: 4.8,
            hourlyRate: 100,
            avatar: '🏃',
            bio: 'Marathon coach and endurance specialist. Helps athletes break PRs and build sustainable conditioning programs.',
            achievements: [
                'Coached 50+ Boston Marathon qualifiers',
                'Former D1 Track & Field athlete',
                'Functional Movement Specialist'
            ]
        },
        {
            id: 'trainer-3',
            name: 'Jessica Rodriguez',
            credentials: 'BS Exercise Physiology, NASM-PES, CES',
            specialty: 'Fat Loss & Mobility',
            experience: '10+ years',
            clients: '350+',
            rating: 4.9,
            hourlyRate: 100,
            avatar: '🔥',
            bio: 'Specializes in sustainable fat loss and mobility work. Expert in creating lifestyle-based transformations.',
            achievements: [
                'Helped 200+ clients lose 50+ lbs',
                'Corrective Exercise Specialist',
                'Mobility & Recovery expert'
            ]
        }
    ],
    nutritionists: [
        {
            id: 'nutritionist-1',
            name: 'Dr. Amanda Foster, RD',
            credentials: 'PhD Nutritional Sciences, RD, CSSD',
            specialty: 'Sports Nutrition & Performance',
            experience: '18+ years',
            clients: '600+',
            rating: 5.0,
            hourlyRate: 100,
            avatar: '🥗',
            bio: 'Board-certified sports dietitian working with professional athletes. Expert in macro optimization and nutrient timing.',
            achievements: [
                'Team nutritionist for NFL franchise',
                'Board Certified Sports Dietitian',
                'Published author of 3 nutrition books'
            ]
        },
        {
            id: 'nutritionist-2',
            name: 'Kevin Park, MS, RDN',
            credentials: 'MS Nutrition, RDN, CNSC',
            specialty: 'Weight Management & Metabolic Health',
            experience: '14+ years',
            clients: '450+',
            rating: 4.9,
            hourlyRate: 100,
            avatar: '📊',
            bio: 'Metabolic health specialist focusing on sustainable weight loss and blood sugar optimization. Clinical nutrition expert.',
            achievements: [
                'Clinical Nutrition Specialist',
                'Reversed pre-diabetes in 300+ clients',
                'Expert in metabolic syndrome'
            ]
        },
        {
            id: 'nutritionist-3',
            name: 'Dr. Lisa Thompson, RD',
            credentials: 'PhD Nutrition, RD, FAND',
            specialty: 'Meal Planning & Lifestyle Change',
            experience: '20+ years',
            clients: '700+',
            rating: 4.9,
            hourlyRate: 100,
            avatar: '🍽️',
            bio: 'Creates personalized meal plans that fit your lifestyle. Expert in making nutrition sustainable and enjoyable.',
            achievements: [
                'Fellow of the Academy of Nutrition',
                '20 years clinical experience',
                'Meal planning systems expert'
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
        popular: false
    },
    starter: {
        sessions: 4,
        price: 360,
        pricePerSession: 90,
        savings: 40,
        popular: true
    },
    transformation: {
        sessions: 8,
        price: 640,
        pricePerSession: 80,
        savings: 160,
        popular: false
    },
    elite: {
        sessions: 12,
        price: 840,
        pricePerSession: 70,
        savings: 360,
        popular: false
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

// Calculate session cost
function calculateSessionCost(packageType, sessions = 1) {
    const pkg = sessionPackages[packageType];
    if (!pkg) return sessionPackages.single.price;
    return pkg.price;
}

export { expertProfiles, sessionPackages, getExpertById, getExpertsByType, calculateSessionCost };
