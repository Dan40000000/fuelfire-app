// FuelFire Apple Health Integration
// Syncs steps, heart rate, workouts, calories burned, and more

class HealthSync {
    constructor() {
        this.isAvailable = false;
        this.Health = null;
        this.lastSync = null;
    }

    resolveHealthPlugin() {
        if (this.Health) {
            return this.Health;
        }

        if (typeof Capacitor === 'undefined') {
            return null;
        }

        // Prefer the plugin instance registered on Capacitor.Plugins (Capacitor <=6 compatibility)
        const pluginContainer = Capacitor.Plugins;
        if (pluginContainer && pluginContainer.Health) {
            this.Health = pluginContainer.Health;
            return this.Health;
        }

        // Capacitor 7+ exposes registerPlugin on the global Capacitor object
        if (typeof Capacitor.registerPlugin === 'function') {
            try {
                this.Health = Capacitor.registerPlugin('Health');
                if (this.Health) {
                    return this.Health;
                }
            } catch (error) {
                console.warn('⚠️ Failed to register Health plugin dynamically:', error);
            }
        }

        // Fallback: some builds expose the plugin on a global namespace
        if (typeof window !== 'undefined' && window.CapgoCapacitorHealth && window.CapgoCapacitorHealth.Health) {
            this.Health = window.CapgoCapacitorHealth.Health;
            return this.Health;
        }

        return null;
    }

    async initialize() {
        try {
            console.log('🔍 Checking Capacitor availability...');
            if (typeof Capacitor === 'undefined') {
                console.log('❌ Capacitor is undefined');
                return false;
            }

            console.log('✅ Capacitor available, platform:', Capacitor.getPlatform());

            const platform = typeof Capacitor.getPlatform === 'function' ? Capacitor.getPlatform() : 'unknown';
            const isNative = platform === 'ios' || platform === 'android' || platform === 'mac';
            const isNativeOverride = typeof Capacitor.isNativePlatform === 'function' ? Capacitor.isNativePlatform() : isNative;

            if (!isNativeOverride) {
                console.log('❌ Running on web - Health sync disabled');
                return false;
            }

            // Get the Health plugin from Capacitor.Plugins
            console.log('🔍 Looking for Health plugin...');
            if (Capacitor.Plugins) {
                try {
                    console.log('Available plugins:', Object.keys(Capacitor.Plugins));
                } catch (pluginLogError) {
                    console.log('ℹ️ Unable to enumerate Capacitor.Plugins:', pluginLogError);
                }
            } else {
                console.log('ℹ️ Capacitor.Plugins container is not defined (Capacitor 7+ uses registerPlugin).');
            }

            const Health = this.resolveHealthPlugin();

            if (!Health || typeof Health.isAvailable !== 'function') {
                console.error('❌ Health plugin not found in Capacitor.Plugins');
                return false;
            }

            console.log('✅ Health plugin found:', Health);
            this.Health = Health;

            // Check if Health is available on this device
            console.log('🔍 Checking if Health is available on device...');
            const availability = await Health.isAvailable();
            console.log('Health availability result:', availability);

            this.isAvailable = availability.available;

            if (!this.isAvailable) {
                console.warn('❌ Health unavailable:', availability.reason || availability);
                return false;
            }

            console.log('✅ Health plugin loaded and available');
            return true;
        } catch (error) {
            console.error('❌ Health plugin error:', error);
            console.error('Error stack:', error.stack);
            return false;
        }
    }

    async requestPermissions() {
        if (!this.isAvailable && !this.resolveHealthPlugin()) {
            console.log('❌ Health not available - cannot request permissions');
            return false;
        }

        try {
            const Health = this.resolveHealthPlugin();
            if (!Health || typeof Health.requestAuthorization !== 'function') {
                console.warn('❌ Health plugin is not ready to request permissions');
                return false;
            }

            console.log('🔐 Requesting health permissions...');
            console.log('Health object:', Health);
            console.log('Health.requestAuthorization exists?', typeof Health.requestAuthorization);

            // Request all health permissions
            // Note: Only use data types supported by @capgo/capacitor-health
            const permissionRequest = {
                read: ['steps', 'distance', 'calories', 'heartRate', 'weight', 'sleep'],
                write: ['steps', 'calories', 'weight']
            };

            console.log('Permission request:', JSON.stringify(permissionRequest));

            const permissions = await Health.requestAuthorization(permissionRequest);

            console.log('✅ requestAuthorization returned:', JSON.stringify(permissions));

            // Check if permission was granted
            if (permissions && permissions.granted === false) {
                console.log('❌ User denied permission');
                return false;
            }

            console.log('✅ Permissions appear to be granted');
            return true;
        } catch (error) {
            console.error('❌ Permission request error:', error);
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            return false;
        }
    }

    async getTodaySteps() {
        if (!this.isAvailable) return 0;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'steps',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1000
            });

            console.log('📊 Step samples received:', samples?.length || 0);

            // Log ALL sources for debugging
            if (samples && samples.length > 0) {
                const sources = {};
                samples.forEach(s => {
                    const source = s.sourceName || 'Unknown';
                    if (!sources[source]) sources[source] = { count: 0, steps: 0 };
                    sources[source].count++;
                    sources[source].steps += parseFloat(s.value) || 0;
                });
                console.log('📱 Data sources found:', sources);
            }

            const allSamples = Array.isArray(samples) ? samples : [];
            let totalSteps = 0;
            allSamples.forEach(sample => {
                const value = parseFloat(sample?.value);
                if (!Number.isNaN(value) && Number.isFinite(value)) {
                    totalSteps += value;
                }
            });

            console.log(`🚶 Today's steps: ${totalSteps}`);
            return Math.round(totalSteps);
        } catch (error) {
            console.error('❌ Error fetching steps:', error);
            return 0;
        }
    }

    async getTodayAverageHeartRate() {
        if (!this.isAvailable) return null;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'heartRate',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1000
            });

            if (samples && samples.length > 0) {
                // PRIORITY: Filter to iPhone data only
                let filteredSamples = samples;
                const iphoneSamples = samples.filter(s =>
                    s.sourceName && (
                        s.sourceName.toLowerCase().includes('iphone') ||
                        s.sourceName.toLowerCase().includes('phone')
                    )
                );

                if (iphoneSamples.length > 0) {
                    filteredSamples = iphoneSamples;
                    console.log(`❤️ Using iPhone heart rate data only: ${iphoneSamples.length} samples`);
                }

                // Calculate average heart rate for the day
                const total = filteredSamples.reduce((sum, sample) => sum + parseFloat(sample.value), 0);
                const average = Math.round(total / filteredSamples.length);
                console.log(`❤️ Average heart rate today: ${average} bpm (${filteredSamples.length} readings)`);
                return average;
            }

            return null;
        } catch (error) {
            console.error('❌ Error fetching heart rate:', error);
            return null;
        }
    }

    async getTodayCaloriesBurned() {
        if (!this.isAvailable) return 0;

        try {
            // Get steps, weight, and height for calculation
            const steps = await this.getTodaySteps();
            const weight = await this.getWeight();
            const userProfile = JSON.parse(localStorage.getItem('fuelfire_user_profile') || '{}');
            const height = userProfile.height || 170; // Default to 170cm if not set

            // Calculate active calories from steps
            // Formula: Stride length = Height × 0.43
            //          Distance (km) = (Steps × Stride length) / 100000
            //          Active Calories = Distance × Weight × 1.036

            const strideLength = height * 0.43; // in cm
            const distanceKm = (steps * strideLength) / 100000;
            const activeCalories = distanceKm * weight * 1.036;

            console.log(`🔥 Active calories from steps: ${Math.round(activeCalories)} (${steps} steps, ${weight}kg, ${height}cm)`);
            return Math.round(activeCalories);
        } catch (error) {
            console.error('❌ Error calculating calories:', error);
            return 0;
        }
    }

    async getTodayWorkouts() {
        if (!this.isAvailable) return [];

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'workout',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 50
            });

            let filteredSamples = samples || [];

            // PRIORITY: Filter to iPhone data only
            if (filteredSamples.length > 0) {
                const iphoneSamples = filteredSamples.filter(s =>
                    s.sourceName && (
                        s.sourceName.toLowerCase().includes('iphone') ||
                        s.sourceName.toLowerCase().includes('phone')
                    )
                );

                if (iphoneSamples.length > 0) {
                    filteredSamples = iphoneSamples;
                    console.log(`💪 Using iPhone workouts only: ${iphoneSamples.length} samples`);
                }
            }

            const workouts = [];
            if (filteredSamples && Array.isArray(filteredSamples)) {
                filteredSamples.forEach(workout => {
                    workouts.push({
                        type: workout.workoutActivityType || 'Unknown',
                        duration: workout.duration || 0,
                        calories: workout.totalEnergyBurned || 0,
                        distance: workout.totalDistance || 0,
                        startDate: workout.startDate,
                        endDate: workout.endDate
                    });
                });
            }

            console.log(`💪 Today's workouts: ${workouts.length}`);
            return workouts;
        } catch (error) {
            console.error('❌ Error fetching workouts:', error);
            return [];
        }
    }

    async getDistance() {
        if (!this.isAvailable) return 0;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'distance',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1000
            });

            let filteredSamples = samples || [];

            // PRIORITY: Filter to iPhone data only
            if (filteredSamples.length > 0) {
                const iphoneSamples = filteredSamples.filter(s =>
                    s.sourceName && (
                        s.sourceName.toLowerCase().includes('iphone') ||
                        s.sourceName.toLowerCase().includes('phone')
                    )
                );

                if (iphoneSamples.length > 0) {
                    filteredSamples = iphoneSamples;
                    console.log(`🏃 Using iPhone distance only: ${iphoneSamples.length} samples`);
                }
            }

            let totalDistance = 0;
            if (filteredSamples && Array.isArray(filteredSamples)) {
                totalDistance = filteredSamples.reduce((sum, sample) => {
                    return sum + (parseFloat(sample.value) || 0);
                }, 0);
            }

            // Convert meters to miles
            const miles = totalDistance * 0.000621371;
            console.log(`🏃 Distance: ${miles.toFixed(2)} miles`);
            return miles;
        } catch (error) {
            console.error('❌ Error fetching distance:', error);
            return 0;
        }
    }

    async getWeight() {
        if (!this.isAvailable) return null;

        try {
            const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

            const { samples } = await this.Health.readSamples({
                dataType: 'weight',
                startDate: thirtyDaysAgo.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1
            });

            if (samples && samples.length > 0) {
                const weightKg = parseFloat(samples[0].value);
                const weightLbs = weightKg * 2.20462;
                console.log(`⚖️ Weight: ${weightLbs.toFixed(1)} lbs`);
                return weightLbs;
            }

            return null;
        } catch (error) {
            console.error('❌ Error fetching weight:', error);
            return null;
        }
    }

    async getTodaySleep() {
        if (!this.isAvailable) return 0;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'sleep',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 100
            });

            let filteredSamples = samples || [];

            // PRIORITY: Filter to iPhone data only
            if (filteredSamples.length > 0) {
                const iphoneSamples = filteredSamples.filter(s =>
                    s.sourceName && (
                        s.sourceName.toLowerCase().includes('iphone') ||
                        s.sourceName.toLowerCase().includes('phone')
                    )
                );

                if (iphoneSamples.length > 0) {
                    filteredSamples = iphoneSamples;
                    console.log(`😴 Using iPhone sleep data only: ${iphoneSamples.length} samples`);
                }
            }

            let totalSleepMinutes = 0;
            if (filteredSamples && Array.isArray(filteredSamples)) {
                filteredSamples.forEach(sample => {
                    const start = new Date(sample.startDate);
                    const end = new Date(sample.endDate);
                    const minutes = (end - start) / (1000 * 60);
                    totalSleepMinutes += minutes;
                });
            }

            const hours = totalSleepMinutes / 60;
            console.log(`😴 Sleep today: ${hours.toFixed(1)} hours`);
            return hours;
        } catch (error) {
            console.error('❌ Error fetching sleep:', error);
            return 0;
        }
    }

    calculateBMR(weight, height, age, sex) {
        // Mifflin-St Jeor Equation for BMR
        // Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
        // Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161

        if (!weight || !height || !age) {
            console.log('⚠️ Missing profile data for BMR calculation');
            return 0;
        }

        // Convert weight from lbs to kg
        const weightKg = weight / 2.20462;
        // Convert height from inches to cm
        const heightCm = height * 2.54;

        let bmr;
        if (sex && sex.toLowerCase() === 'female') {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        } else {
            // Default to male formula
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        }

        console.log(`🔥 Calculated BMR: ${Math.round(bmr)} calories/day`);
        return Math.round(bmr);
    }

    async syncAllData() {
        if (!this.isAvailable) {
            console.log('❌ Health sync not available');
            return null;
        }

        console.log('🔄 Syncing all health data...');

        try {
            // Get active energy from Apple Health
            const activeEnergy = await this.getTodayCaloriesBurned();
            let weight = await this.getWeight();

            // Try to get user profile for BMR calculation
            const userProfile = JSON.parse(localStorage.getItem('fuelfire_user_profile') || '{}');
            let bmr = 0;
            let totalCaloriesBurned = activeEnergy;

            if ((!weight || Number.isNaN(weight)) && userProfile && userProfile.weight) {
                const profileWeight = parseFloat(userProfile.weight);
                if (!Number.isNaN(profileWeight) && profileWeight > 0) {
                    weight = profileWeight;
                    console.log('⚖️ Using profile weight for BMR calculation:', profileWeight);
                }
            }

            if (weight && userProfile.age && userProfile.height) {
                // Calculate BMR from user profile
                bmr = this.calculateBMR(weight, userProfile.height, userProfile.age, userProfile.sex);
                totalCaloriesBurned = activeEnergy + bmr;
                console.log(`🔥 Total calories: ${activeEnergy} (active) + ${bmr} (BMR) = ${totalCaloriesBurned}`);
            } else {
                console.log('⚠️ Missing profile data for BMR (need weight, height, age). Using active energy only.');
                totalCaloriesBurned = activeEnergy;
            }

            const data = {
                steps: await this.getTodaySteps(),
                heartRate: await this.getTodayAverageHeartRate(),
                activeEnergy: activeEnergy,
                bmr: bmr,
                caloriesBurned: totalCaloriesBurned,
                workouts: await this.getTodayWorkouts(),
                distance: await this.getDistance(),
                weight: weight,
                sleep: await this.getTodaySleep(),
                syncTime: new Date().toISOString()
            };

            // Check if we got any real data (not just zeros/nulls)
            // This helps detect permission issues
            const hasRealData = data.steps > 0 ||
                               data.heartRate !== null ||
                               data.caloriesBurned > 0 ||
                               data.workouts.length > 0 ||
                               data.distance > 0 ||
                               data.weight !== null ||
                               data.sleep > 0;

            if (!hasRealData) {
                console.log('⚠️ No health data returned - permissions may not be granted');
                return null;
            }

            this.lastSync = data.syncTime;
            console.log('✅ Health sync complete:', data);

            // Store in localStorage for quick access
            localStorage.setItem('healthData', JSON.stringify(data));

            return data;
        } catch (error) {
            console.error('❌ Error during health sync:', error);
            return null;
        }
    }

    async writeWorkout(workoutData) {
        if (!this.isAvailable) return false;

        try {
            await this.Health.saveSample({
                dataType: 'workout',
                startDate: workoutData.startDate || new Date().toISOString(),
                endDate: workoutData.endDate || new Date().toISOString(),
                value: {
                    workoutActivityType: workoutData.type || 'other',
                    totalEnergyBurned: workoutData.calories || 0,
                    totalDistance: workoutData.distance || 0,
                    duration: workoutData.duration || 0
                }
            });

            console.log('✅ Workout written to Apple Health');
            return true;
        } catch (error) {
            console.error('❌ Error writing workout:', error);
            return false;
        }
    }
}

// Create global instance
window.healthSync = new HealthSync();

// Global helper function to easily log workouts to Apple Health
window.logWorkoutToAppleHealth = async function(workoutType, durationMinutes, calories = 0) {
    try {
        // Initialize if not already done
        if (!window.healthSync.isAvailable) {
            await window.healthSync.initialize();
        }

        const now = new Date();
        const durationSeconds = durationMinutes * 60;
        const startDate = new Date(now.getTime() - (durationSeconds * 1000));

        const workoutData = {
            type: workoutType, // e.g., 'weightlifting', 'running', 'cycling'
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            duration: durationSeconds,
            calories: calories,
            distance: 0
        };

        const success = await window.healthSync.writeWorkout(workoutData);

        if (success) {
            console.log(`✅ ${workoutType} workout (${durationMinutes} min) logged to Apple Health`);
            return true;
        } else {
            console.log('❌ Failed to log workout to Apple Health');
            return false;
        }
    } catch (error) {
        console.error('Error logging workout:', error);
        return false;
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealthSync;
}
