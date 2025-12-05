// FuelFire Apple Health Integration
// Syncs steps, heart rate, workouts, calories burned, and more

class HealthSync {
    constructor() {
        this.isAvailable = false;
        this.Health = null;
        this.HealthTotals = null;
        this.lastSync = null;
        this.dailyTotalsCache = null;
        this.dailyTotalsCacheDate = null;
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

    resolveTotalsPlugin() {
        if (this.HealthTotals) {
            return this.HealthTotals;
        }

        if (typeof Capacitor === 'undefined') {
            return null;
        }

        const pluginsContainer = Capacitor.Plugins;
        if (pluginsContainer && pluginsContainer.HealthTotals) {
            this.HealthTotals = pluginsContainer.HealthTotals;
            return this.HealthTotals;
        }

        if (typeof Capacitor.registerPlugin === 'function') {
            try {
                this.HealthTotals = Capacitor.registerPlugin('HealthTotals');
                if (this.HealthTotals) {
                    return this.HealthTotals;
                }
            } catch (error) {
                console.warn('⚠️ Failed to register HealthTotals plugin dynamically:', error);
            }
        }

        if (typeof window !== 'undefined' && window.HealthTotals) {
            this.HealthTotals = window.HealthTotals;
            return this.HealthTotals;
        }

        return null;
    }

    async getAggregatedTotals(force = false) {
        if (!this.isAvailable) {
            return null;
        }

        const totalsPlugin = this.resolveTotalsPlugin();
        if (!totalsPlugin || typeof totalsPlugin.getDailyTotals !== 'function') {
            return null;
        }

        const todayKey = new Date().toISOString().split('T')[0];
        if (!force && this.dailyTotalsCache && this.dailyTotalsCacheDate === todayKey) {
            return this.dailyTotalsCache;
        }

        try {
            const response = await totalsPlugin.getDailyTotals({ date: todayKey });
            if (response && typeof response === 'object') {
                this.dailyTotalsCache = response;
                this.dailyTotalsCacheDate = todayKey;
                console.log('📈 Aggregated health totals:', response);
                return response;
            }
        } catch (error) {
            console.error('❌ Failed to fetch aggregated health totals:', error);
        }

        return null;
    }

    getStoredUserProfile() {
        let profile = {};
        let legacyProfile = {};
        try {
            profile = JSON.parse(localStorage.getItem('fuelfire_user_profile') || '{}') || {};
        } catch (error) {
            profile = {};
        }
        try {
            legacyProfile = JSON.parse(localStorage.getItem('userProfile') || '{}') || {};
        } catch (error) {
            legacyProfile = {};
        }
        return { ...legacyProfile, ...profile };
    }

    getLatestLoggedWeightFromStorage() {
        const profile = this.getStoredUserProfile();
        const parseNumber = (value) => {
            const num = Number(value);
            return Number.isFinite(num) && num > 0 ? num : null;
        };

        const directWeight = parseNumber(profile.weightLbs || profile.weight || profile.currentWeight);
        if (directWeight) {
            return directWeight;
        }

        const weightKg = parseNumber(profile.weightKg || profile.weightKG || profile.weight_kg);
        if (weightKg) {
            return weightKg * 2.20462;
        }

        try {
            const weightEntries = JSON.parse(localStorage.getItem('fuelfire_weight_entries') || '[]');
            if (Array.isArray(weightEntries) && weightEntries.length > 0) {
                for (let i = weightEntries.length - 1; i >= 0; i -= 1) {
                    const entry = weightEntries[i];
                    const entryWeight = parseNumber(entry?.weight);
                    if (entryWeight) {
                        return entryWeight;
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Unable to read stored weight entries:', error);
        }

        return null;
    }

    getProfileMetricsFromStorage() {
        const profile = this.getStoredUserProfile();
        const parseNumber = (value) => {
            const num = Number(value);
            return Number.isFinite(num) && num > 0 ? num : null;
        };

        let heightInches = parseNumber(profile.heightInches || profile.height);
        if (!heightInches) {
            const heightFeet = parseNumber(profile.heightFeet || profile.height_feet);
            const heightInchesPart = parseNumber(profile.heightInches || profile.height_inches);
            if (heightFeet || heightInchesPart) {
                heightInches = (heightFeet || 0) * 12 + (heightInchesPart || 0);
            }
        }
        if (!heightInches) {
            const heightCm = parseNumber(profile.heightCm || profile.height_cm || profile.heightCentimeters);
            if (heightCm) {
                heightInches = heightCm / 2.54;
            }
        }

        let age = parseNumber(profile.ageYears || profile.age || profile.age_years);
        if (!age) {
            const birthYear = parseNumber(profile.birthYear || profile.birth_year);
            if (birthYear) {
                const currentYear = new Date().getFullYear();
                const computedAge = currentYear - birthYear;
                if (computedAge > 0 && computedAge < 120) {
                    age = computedAge;
                }
            }
        }

        let weightLbs = parseNumber(profile.weightLbs || profile.weight || profile.currentWeight);
        if (!weightLbs) {
            const weightKg = parseNumber(profile.weightKg || profile.weightKG || profile.weight_kg);
            if (weightKg) {
                weightLbs = weightKg * 2.20462;
            }
        }
        if (!weightLbs) {
            weightLbs = this.getLatestLoggedWeightFromStorage();
        }

        const sex = (profile.sex || profile.gender || 'male').toString().toLowerCase();

        return {
            profile,
            heightInches: heightInches || null,
            age: age || null,
            weightLbs: weightLbs || null,
            sex
        };
    }

    async initialize() {
        if (this.shouldSkipInitialization()) {
            console.log('ℹ️ Health sync disabled for this context (tour/web preview).');
            return false;
        }
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

            const totalsPlugin = this.resolveTotalsPlugin();
            if (totalsPlugin) {
                console.log('📊 HealthTotals plugin available:', totalsPlugin);
            } else {
                console.warn('⚠️ HealthTotals plugin not detected (aggregated metrics will fall back to sample sums).');
            }

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

    shouldSkipInitialization() {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search || '');
        if (params.get('tourPreview') === '1') {
            return true;
        }
        return Boolean(window.__DISABLE_HEALTH_SYNC__);
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
            const totals = await this.getAggregatedTotals();
            if (totals && typeof totals.steps === 'number' && Number.isFinite(totals.steps)) {
                const rounded = Math.round(totals.steps);
                console.log(`🚶 Aggregated steps total: ${rounded}`);
                return rounded;
            }
        } catch (error) {
            console.warn('⚠️ Aggregated steps unavailable, falling back to sample summation:', error);
        }

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'steps',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 60000
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

            console.log(`🚶 Today's steps (summed): ${totalSteps}`);
            return Math.round(totalSteps);
        } catch (error) {
            console.error('❌ Error fetching steps:', error);
            return 0;
        }
    }

    async getTodayAverageHeartRate() {
        if (!this.isAvailable) return null;

        try {
            const totals = await this.getAggregatedTotals();
            const aggregatedHeart = totals?.heartRate;
            const average = aggregatedHeart && typeof aggregatedHeart.average === 'number' ? aggregatedHeart.average : null;
            const min = aggregatedHeart && typeof aggregatedHeart.min === 'number' ? aggregatedHeart.min : null;
            const max = aggregatedHeart && typeof aggregatedHeart.max === 'number' ? aggregatedHeart.max : null;

            if (average !== null || min !== null || max !== null) {
                const summary = {
                    average: average !== null ? Math.round(average) : null,
                    min: min !== null ? Math.round(min) : null,
                    max: max !== null ? Math.round(max) : null
                };
                console.log('❤️ Aggregated heart rate summary:', summary);
                return summary;
            }
        } catch (error) {
            console.warn('⚠️ Aggregated heart rate unavailable, falling back to sample averaging:', error);
        }

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'heartRate',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 2000
            });

            if (!samples || samples.length === 0) {
                return null;
            }

            let sum = 0;
            let count = 0;
            let min = Number.POSITIVE_INFINITY;
            let max = Number.NEGATIVE_INFINITY;

            samples.forEach(sample => {
                const value = parseFloat(sample.value);
                if (!Number.isNaN(value) && Number.isFinite(value)) {
                    sum += value;
                    count++;
                    if (value < min) min = value;
                    if (value > max) max = value;
                }
            });

            if (count === 0) {
                return null;
            }

            const average = Math.round(sum / count);
            const summary = {
                average,
                min: Math.round(min),
                max: Math.round(max)
            };

            console.log(`❤️ Heart rate summary: avg ${average} bpm (${count} samples), range ${summary.min}-${summary.max}`);
            return summary;
        } catch (error) {
            console.error('❌ Error fetching heart rate:', error);
            return null;
        }
    }

    async getTodayCaloriesBurned() {
        if (!this.isAvailable) return 0;

        try {
            const totals = await this.getAggregatedTotals();
            if (totals && typeof totals.activeEnergy === 'number' && Number.isFinite(totals.activeEnergy)) {
                const rounded = Math.round(totals.activeEnergy);
                console.log(`🔥 Aggregated active energy: ${rounded} kcal`);
                return rounded;
            }
        } catch (error) {
            console.warn('⚠️ Aggregated active energy unavailable, falling back to derived estimate:', error);
        }

        try {
            // Get steps, weight, and height for calculation
            const steps = await this.getTodaySteps();
            const weightFromHealth = await this.getWeight();
            const profileMetrics = this.getProfileMetricsFromStorage();

            const heightCm = (() => {
                if (profileMetrics.heightInches) {
                    return profileMetrics.heightInches * 2.54;
                }
                const storedProfile = profileMetrics.profile || {};
                const candidate = Number(storedProfile.heightCm || storedProfile.height_cm || storedProfile.height);
                if (Number.isFinite(candidate) && candidate > 0) {
                    return candidate;
                }
                return 170;
            })();

            const weightLbs = weightFromHealth || profileMetrics.weightLbs;
            const weightKg = weightLbs ? (weightLbs / 2.20462) : 80;

            // Calculate active calories from steps
            // Formula: Stride length = Height × 0.43
            //          Distance (km) = (Steps × Stride length) / 100000
            //          Active Calories = Distance × Weight × 1.036

            const strideLength = heightCm * 0.43; // in cm
            const distanceKm = (steps * strideLength) / 100000;
            const activeCalories = distanceKm * weightKg * 1.036;

            console.log(`🔥 Active calories (fallback) from steps: ${Math.round(activeCalories)} (${steps} steps, ${weightKg.toFixed(1)}kg, ${heightCm}cm)`);
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
                limit: 200
            });

            const filteredSamples = Array.isArray(samples) ? samples : [];

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
            const totals = await this.getAggregatedTotals();
            if (totals && typeof totals.distanceMeters === 'number' && Number.isFinite(totals.distanceMeters)) {
                const miles = totals.distanceMeters * 0.000621371;
                console.log(`🏃 Aggregated distance: ${miles.toFixed(2)} miles`);
                return miles;
            }
        } catch (error) {
            console.warn('⚠️ Aggregated distance unavailable, falling back to sample summation:', error);
        }

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { samples } = await this.Health.readSamples({
                dataType: 'distance',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 5000
            });

            const totalDistanceMeters = (Array.isArray(samples) ? samples : [])
                .reduce((sum, sample) => {
                    const value = parseFloat(sample?.value);
                    return !Number.isNaN(value) && Number.isFinite(value) ? sum + value : sum;
                }, 0);

            const miles = totalDistanceMeters * 0.000621371;
            console.log(`🏃 Distance (summed): ${miles.toFixed(2)} miles`);
            return miles;
        } catch (error) {
            console.error('❌ Error fetching distance:', error);
            return 0;
        }
    }

    async getWeight() {
        const fallbackWeight = this.getLatestLoggedWeightFromStorage();

        if (!this.isAvailable) {
            if (fallbackWeight) {
                console.log(`⚖️ Using stored weight (no native health available): ${fallbackWeight.toFixed(1)} lbs`);
            }
            return fallbackWeight;
        }

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

            if (fallbackWeight) {
                console.log(`⚖️ Falling back to stored weight: ${fallbackWeight.toFixed(1)} lbs`);
            }
            return fallbackWeight;
        } catch (error) {
            console.error('❌ Error fetching weight:', error);
            return fallbackWeight;
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
                limit: 500
            });

            let totalSleepMinutes = 0;
            (Array.isArray(samples) ? samples : []).forEach(sample => {
                const start = new Date(sample.startDate);
                const end = new Date(sample.endDate);
                const minutes = (end - start) / (1000 * 60);
                if (!Number.isNaN(minutes) && Number.isFinite(minutes)) {
                    totalSleepMinutes += minutes;
                }
            });

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
            const aggregatedTotals = await this.getAggregatedTotals(true);

            const [steps, heartRateSummary, activeEnergy, distanceMiles, workouts, sleepHours] = await Promise.all([
                this.getTodaySteps(),
                this.getTodayAverageHeartRate(),
                this.getTodayCaloriesBurned(),
                this.getDistance(),
                this.getTodayWorkouts(),
                this.getTodaySleep()
            ]);

            let weight = await this.getWeight();
            const profileMetrics = this.getProfileMetricsFromStorage();

            if ((!weight || Number.isNaN(weight)) && profileMetrics.weightLbs) {
                weight = profileMetrics.weightLbs;
                console.log(`⚖️ Using stored profile weight for BMR calculation: ${weight.toFixed(1)} lbs`);
            }

            weight = Number(weight);
            if (Number.isFinite(weight)) {
                weight = Math.round(weight * 10) / 10;
            } else {
                weight = null;
            }

            const hasMetricsForBmr = weight && profileMetrics.heightInches && profileMetrics.age;
            let bmr = hasMetricsForBmr
                ? this.calculateBMR(weight, profileMetrics.heightInches, profileMetrics.age, profileMetrics.sex)
                : 0;

            if (!hasMetricsForBmr) {
                console.log('⚠️ Missing metrics for BMR calculation.', {
                    hasWeight: Boolean(weight),
                    heightInches: profileMetrics.heightInches || null,
                    age: profileMetrics.age || null
                });
            }

            if (!bmr || !Number.isFinite(bmr) || bmr <= 0) {
                const cachedBmr = parseInt(localStorage.getItem('fuelfire_last_bmr') || '0', 10);
                if (cachedBmr > 0) {
                    bmr = cachedBmr;
                    console.log(`📦 Using cached BMR from storage: ${cachedBmr}`);
                } else if (weight) {
                    const assumedHeight = profileMetrics.heightInches || 70;
                    const assumedAge = profileMetrics.age || 30;
                    bmr = this.calculateBMR(weight, assumedHeight, assumedAge, profileMetrics.sex);
                    console.log(`🧮 Estimated fallback BMR using assumptions: ${bmr}`);
                }
            }

            if (bmr && Number.isFinite(bmr) && bmr > 0) {
                localStorage.setItem('fuelfire_last_bmr', String(Math.round(bmr)));
            }

            const totalCaloriesBurned = activeEnergy + (bmr || 0);

            if (weight && Number.isFinite(weight) && weight > 0) {
                try {
                    const profile = { ...(profileMetrics.profile || {}) };
                    const storedWeight = Number(profile.weight);
                    if (!Number.isFinite(storedWeight) || Math.abs(storedWeight - weight) > 0.01) {
                        profile.weight = Math.round(weight * 10) / 10;
                        profile.updatedAt = new Date().toISOString();
                        profile.weightSource = 'apple-health';
                        localStorage.setItem('fuelfire_user_profile', JSON.stringify(profile));
                        localStorage.setItem('fuelfire_profile_updated', Date.now().toString());
                        console.log(`🗂️ Stored weight updated from Health: ${profile.weight} lbs`);
                    }
                } catch (error) {
                    console.warn('⚠️ Unable to persist weight to profile:', error);
                }
            }

            const data = {
                steps,
                heartRate: heartRateSummary,
                activeEnergy,
                bmr,
                caloriesBurned: totalCaloriesBurned,
                workouts,
                distance: distanceMiles,
                distanceMeters: aggregatedTotals?.distanceMeters ?? null,
                weight: weight ?? null,
                sleep: sleepHours,
                syncTime: new Date().toISOString(),
                aggregatedTotals: aggregatedTotals || null
            };

            // Check if we got any real data (not just zeros/nulls)
            // This helps detect permission issues
            const hasRealData = Boolean(aggregatedTotals) ||
                               (Number.isFinite(steps) && steps > 0) ||
                               (heartRateSummary && (Number.isFinite(heartRateSummary.average) ||
                                                     Number.isFinite(heartRateSummary.min) ||
                                                     Number.isFinite(heartRateSummary.max))) ||
                               (Number.isFinite(activeEnergy) && activeEnergy > 0) ||
                               (Array.isArray(workouts) && workouts.length > 0) ||
                               (Number.isFinite(distanceMiles) && distanceMiles > 0) ||
                               (Number.isFinite(weight) && weight > 0) ||
                               (Number.isFinite(sleepHours) && sleepHours > 0);

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
