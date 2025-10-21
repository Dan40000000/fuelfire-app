// FuelFire Apple Health Integration
// Syncs steps, heart rate, workouts, calories burned, and more

class HealthSync {
    constructor() {
        this.isAvailable = false;
        this.Health = null;
        this.lastSync = null;
    }

    async initialize() {
        try {
            if (typeof Capacitor === 'undefined') {
                console.log('❌ Capacitor not available - Health sync disabled');
                return false;
            }

            // Import the health plugin
            const { Health } = await import('@capgo/capacitor-health');
            this.Health = Health;
            this.isAvailable = true;

            console.log('✅ Health plugin loaded');
            return true;
        } catch (error) {
            console.error('❌ Health plugin error:', error);
            return false;
        }
    }

    async requestPermissions() {
        if (!this.isAvailable) {
            console.log('❌ Health not available');
            return false;
        }

        try {
            // Request all health permissions
            const permissions = await this.Health.requestAuthorization({
                read: [
                    'steps',
                    'distance',
                    'calories',
                    'heart_rate',
                    'activity',
                    'workout',
                    'weight',
                    'body_fat_percentage',
                    'active_energy_burned'
                ],
                write: [
                    'steps',
                    'calories',
                    'workout',
                    'weight',
                    'body_fat_percentage',
                    'active_energy_burned'
                ]
            });

            console.log('✅ Health permissions granted:', permissions);
            return true;
        } catch (error) {
            console.error('❌ Permission error:', error);
            alert('Please enable Health access in Settings to track your fitness data');
            return false;
        }
    }

    async getTodaySteps() {
        if (!this.isAvailable) return 0;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await this.Health.queryHKitSampleType({
                sampleName: 'steps',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1000
            });

            // Sum up all step counts for today
            let totalSteps = 0;
            if (result.resultData && Array.isArray(result.resultData)) {
                totalSteps = result.resultData.reduce((sum, record) => {
                    return sum + (parseFloat(record.value) || 0);
                }, 0);
            }

            console.log(`🚶 Today's steps: ${totalSteps}`);
            return Math.round(totalSteps);
        } catch (error) {
            console.error('❌ Error fetching steps:', error);
            return 0;
        }
    }

    async getLatestHeartRate() {
        if (!this.isAvailable) return null;

        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));

            const result = await this.Health.queryHKitSampleType({
                sampleName: 'heart_rate',
                startDate: oneHourAgo.toISOString(),
                endDate: now.toISOString(),
                limit: 1
            });

            if (result.resultData && result.resultData.length > 0) {
                const heartRate = Math.round(parseFloat(result.resultData[0].value));
                console.log(`❤️ Heart rate: ${heartRate} bpm`);
                return heartRate;
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
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await this.Health.queryHKitSampleType({
                sampleName: 'active_energy_burned',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1000
            });

            let totalCalories = 0;
            if (result.resultData && Array.isArray(result.resultData)) {
                totalCalories = result.resultData.reduce((sum, record) => {
                    return sum + (parseFloat(record.value) || 0);
                }, 0);
            }

            console.log(`🔥 Calories burned: ${totalCalories}`);
            return Math.round(totalCalories);
        } catch (error) {
            console.error('❌ Error fetching calories:', error);
            return 0;
        }
    }

    async getTodayWorkouts() {
        if (!this.isAvailable) return [];

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await this.Health.queryHKitSampleType({
                sampleName: 'workout',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 50
            });

            const workouts = [];
            if (result.resultData && Array.isArray(result.resultData)) {
                result.resultData.forEach(workout => {
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

            const result = await this.Health.queryHKitSampleType({
                sampleName: 'distance',
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1000
            });

            let totalDistance = 0;
            if (result.resultData && Array.isArray(result.resultData)) {
                totalDistance = result.resultData.reduce((sum, record) => {
                    return sum + (parseFloat(record.value) || 0);
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

            const result = await this.Health.queryHKitSampleType({
                sampleName: 'weight',
                startDate: thirtyDaysAgo.toISOString(),
                endDate: new Date().toISOString(),
                limit: 1
            });

            if (result.resultData && result.resultData.length > 0) {
                const weightKg = parseFloat(result.resultData[0].value);
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

    async syncAllData() {
        if (!this.isAvailable) {
            console.log('❌ Health sync not available');
            return null;
        }

        console.log('🔄 Syncing all health data...');

        const data = {
            steps: await this.getTodaySteps(),
            heartRate: await this.getLatestHeartRate(),
            caloriesBurned: await this.getTodayCaloriesBurned(),
            workouts: await this.getTodayWorkouts(),
            distance: await this.getDistance(),
            weight: await this.getWeight(),
            syncTime: new Date().toISOString()
        };

        this.lastSync = data.syncTime;
        console.log('✅ Health sync complete:', data);

        // Store in localStorage for quick access
        localStorage.setItem('healthData', JSON.stringify(data));

        return data;
    }

    async writeWorkout(workoutData) {
        if (!this.isAvailable) return false;

        try {
            await this.Health.writeData({
                sampleName: 'workout',
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
