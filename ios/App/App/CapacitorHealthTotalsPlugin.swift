import Foundation
import Capacitor
import HealthKit
import WatchConnectivity

@objc(HealthTotalsPlugin)
public class HealthTotalsPlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "HealthTotalsPlugin"
    public let jsName = "HealthTotals"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDailyTotals", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWorkouts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWatchStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()
    private let calendar = Calendar.current

    public override func load() {
        super.load()
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    @objc func getWatchStatus(_ call: CAPPluginCall) {
        guard WCSession.isSupported() else {
            call.resolve([
                "supported": false,
                "paired": false,
                "watchAppInstalled": false,
                "activationState": "unsupported"
            ])
            return
        }

        let session = WCSession.default
        call.resolve([
            "supported": true,
            "paired": session.isPaired,
            "watchAppInstalled": session.isWatchAppInstalled,
            "activationState": activationStateName(session.activationState)
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device.")
            return
        }

        var readTypes = Set<HKObjectType>()
        readTypes.insert(HKObjectType.workoutType())
        if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            readTypes.insert(sleepType)
        }
        [
            HKQuantityTypeIdentifier.stepCount,
            .distanceWalkingRunning,
            .activeEnergyBurned,
            .heartRate,
            .bodyMass
        ].forEach { identifier in
            if let quantityType = HKObjectType.quantityType(forIdentifier: identifier) {
                readTypes.insert(quantityType)
            }
        }

        let writeTypes: Set<HKSampleType> = [HKObjectType.workoutType()]
        healthStore.requestAuthorization(toShare: writeTypes, read: readTypes) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Health authorization failed: \(error.localizedDescription)", nil, error)
                    return
                }
                call.resolve(["granted": success])
            }
        }
    }

    @objc func getDailyTotals(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device.")
            return
        }

        let referenceDate = parseDate(call.getString("date")) ?? Date()
        let startOfDay = calendar.startOfDay(for: referenceDate)
        guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
            call.reject("Unable to compute date range.")
            return
        }
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: endOfDay,
            options: .strictStartDate
        )

        let group = DispatchGroup()
        let lock = NSLock()
        var steps = 0.0
        var distanceMeters = 0.0
        var activeEnergy = 0.0
        var heartRateAverage: Double?
        var heartRateMin: Double?
        var heartRateMax: Double?
        var queryErrors: [String] = []
        var successfulMetrics = Set<String>()

        func recordError(_ metric: String, _ error: Error) {
            lock.lock()
            queryErrors.append("\(metric): \(error.localizedDescription)")
            lock.unlock()
        }

        func recordSuccess(_ metric: String) {
            lock.lock()
            successfulMetrics.insert(metric)
            lock.unlock()
        }

        func cumulative(
            _ metric: String,
            identifier: HKQuantityTypeIdentifier,
            unit: HKUnit,
            assign: @escaping (Double) -> Void
        ) {
            guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
                lock.withLock { queryErrors.append("\(metric): unavailable on this device") }
                return
            }
            group.enter()
            let query = HKStatisticsQuery(
                quantityType: quantityType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, statistics, error in
                defer { group.leave() }
                if let error = error {
                    recordError(metric, error)
                    return
                }
                assign(statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0)
                recordSuccess(metric)
            }
            healthStore.execute(query)
        }

        cumulative("steps", identifier: .stepCount, unit: .count()) { total in lock.withLock { steps = total } }
        cumulative("distance", identifier: .distanceWalkingRunning, unit: .meter()) { total in lock.withLock { distanceMeters = total } }
        cumulative("activeEnergy", identifier: .activeEnergyBurned, unit: .kilocalorie()) { total in lock.withLock { activeEnergy = total } }

        if let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) {
            group.enter()
            let unit = HKUnit.count().unitDivided(by: .minute())
            let query = HKStatisticsQuery(
                quantityType: heartRateType,
                quantitySamplePredicate: predicate,
                options: [.discreteAverage, .discreteMin, .discreteMax]
            ) { _, statistics, error in
                defer { group.leave() }
                if let error = error {
                    recordError("heartRate", error)
                    return
                }
                lock.withLock {
                    heartRateAverage = statistics?.averageQuantity()?.doubleValue(for: unit)
                    heartRateMin = statistics?.minimumQuantity()?.doubleValue(for: unit)
                    heartRateMax = statistics?.maximumQuantity()?.doubleValue(for: unit)
                }
                recordSuccess("heartRate")
            }
            healthStore.execute(query)
        }

        group.notify(queue: .main) {
            lock.lock()
            let errors = queryErrors
            let successes = successfulMetrics
            let stepTotal = steps
            let distanceTotal = distanceMeters
            let activeEnergyTotal = activeEnergy
            let heartAverage = heartRateAverage
            let heartMin = heartRateMin
            let heartMax = heartRateMax
            lock.unlock()

            var response: [String: Any] = [
                "partial": !errors.isEmpty,
                "errors": errors,
                "successfulMetrics": successes.sorted()
            ]
            if successes.contains("steps") { response["steps"] = stepTotal }
            if successes.contains("distance") { response["distanceMeters"] = distanceTotal }
            if successes.contains("activeEnergy") { response["activeEnergy"] = activeEnergyTotal }
            if successes.contains("heartRate") {
                var heartRate: [String: Double] = [:]
                if let heartAverage { heartRate["average"] = heartAverage }
                if let heartMin { heartRate["min"] = heartMin }
                if let heartMax { heartRate["max"] = heartMax }
                response["heartRate"] = heartRate
            }
            call.resolve(response)
        }
    }

    @objc func getWorkouts(_ call: CAPPluginCall) {
        let startDate = parseDate(call.getString("startDate")) ?? calendar.startOfDay(for: Date())
        let endDate = parseDate(call.getString("endDate")) ?? Date()
        let workoutType = HKObjectType.workoutType()
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: workoutType, predicate: predicate, limit: 200, sortDescriptors: [sort]) {
            _, samples, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Workout query failed: \(error.localizedDescription)", nil, error)
                    return
                }
                let workouts = (samples as? [HKWorkout] ?? []).map { workout in
                    [
                        "type": self.workoutName(workout.workoutActivityType),
                        "duration": workout.duration,
                        "calories": workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0,
                        "distance": workout.totalDistance?.doubleValue(for: .meter()) ?? 0,
                        "startDate": self.isoString(workout.startDate),
                        "endDate": self.isoString(workout.endDate)
                    ] as [String: Any]
                }
                call.resolve(["workouts": workouts])
            }
        }
        healthStore.execute(query)
    }

    @objc func getSleep(_ call: CAPPluginCall) {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.resolve(["hours": 0])
            return
        }
        let endDate = parseDate(call.getString("endDate")) ?? Date()
        let startDate = parseDate(call.getString("startDate")) ?? endDate.addingTimeInterval(-24 * 60 * 60)
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictEndDate
        )
        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: 500, sortDescriptors: nil) {
            _, samples, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Sleep query failed: \(error.localizedDescription)", nil, error)
                    return
                }
                let intervals = (samples as? [HKCategorySample] ?? []).compactMap { sample -> DateInterval? in
                    let value = HKCategoryValueSleepAnalysis(rawValue: sample.value)
                    switch value {
                    case .asleepUnspecified, .asleepCore, .asleepDeep, .asleepREM:
                        return DateInterval(start: sample.startDate, end: sample.endDate)
                    default:
                        return nil
                    }
                }
                call.resolve(["hours": self.mergedDuration(intervals) / 3600])
            }
        }
        healthStore.execute(query)
    }

    @objc func saveWorkout(_ call: CAPPluginCall) {
        let endDate = parseDate(call.getString("endDate")) ?? Date()
        let duration = max(0, call.getDouble("duration") ?? 0)
        let startDate = parseDate(call.getString("startDate")) ?? endDate.addingTimeInterval(-duration)
        let calories = max(0, call.getDouble("calories") ?? 0)
        let distance = max(0, call.getDouble("distance") ?? 0)
        let activity = workoutActivity(call.getString("type") ?? "other")
        let energy = calories > 0 ? HKQuantity(unit: .kilocalorie(), doubleValue: calories) : nil
        let distanceQuantity = distance > 0 ? HKQuantity(unit: .meter(), doubleValue: distance) : nil
        let workout = HKWorkout(
            activityType: activity,
            start: startDate,
            end: endDate,
            duration: max(duration, endDate.timeIntervalSince(startDate)),
            totalEnergyBurned: energy,
            totalDistance: distanceQuantity,
            metadata: [HKMetadataKeyIndoorWorkout: true]
        )
        healthStore.save(workout) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Unable to save workout: \(error.localizedDescription)", nil, error)
                    return
                }
                call.resolve(["saved": success])
            }
        }
    }

    private func parseDate(_ value: String?) -> Date? {
        guard let value, !value.isEmpty else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        if let date = ISO8601DateFormatter().date(from: value) { return date }

        let dateOnly = DateFormatter()
        dateOnly.calendar = calendar
        dateOnly.locale = Locale(identifier: "en_US_POSIX")
        dateOnly.timeZone = calendar.timeZone
        dateOnly.dateFormat = "yyyy-MM-dd"
        dateOnly.isLenient = false
        return dateOnly.date(from: value)
    }

    private func isoString(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    private func mergedDuration(_ intervals: [DateInterval]) -> TimeInterval {
        let sorted = intervals.sorted { $0.start < $1.start }
        guard var current = sorted.first else { return 0 }
        var total: TimeInterval = 0
        for interval in sorted.dropFirst() {
            if interval.start <= current.end {
                current = DateInterval(start: current.start, end: max(current.end, interval.end))
            } else {
                total += current.duration
                current = interval
            }
        }
        return total + current.duration
    }

    private func workoutActivity(_ value: String) -> HKWorkoutActivityType {
        let normalized = value.lowercased()
        if normalized.contains("run") { return .running }
        if normalized.contains("walk") { return .walking }
        if normalized.contains("cycl") || normalized.contains("bike") { return .cycling }
        if normalized.contains("swim") { return .swimming }
        if normalized.contains("yoga") { return .yoga }
        if normalized.contains("hiit") || normalized.contains("interval") { return .highIntensityIntervalTraining }
        if normalized.contains("strength") || normalized.contains("weight") || normalized.contains("lift") {
            return .traditionalStrengthTraining
        }
        return .other
    }

    private func workoutName(_ value: HKWorkoutActivityType) -> String {
        switch value {
        case .running: return "Running"
        case .walking: return "Walking"
        case .cycling: return "Cycling"
        case .swimming: return "Swimming"
        case .yoga: return "Yoga"
        case .highIntensityIntervalTraining: return "HIIT"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "Strength Training"
        default: return "Workout"
        }
    }

    private func activationStateName(_ state: WCSessionActivationState) -> String {
        switch state {
        case .notActivated: return "notActivated"
        case .inactive: return "inactive"
        case .activated: return "activated"
        @unknown default: return "unknown"
        }
    }

    public func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        if let error {
            print("Apple Watch session activation failed: \(error.localizedDescription)")
        }
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {}

    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
}

private extension NSLock {
    func withLock(_ body: () -> Void) {
        lock()
        defer { unlock() }
        body()
    }
}

final class WellFitBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(HealthTotalsPlugin())
        if let foodDepthPluginClass = NSClassFromString("FoodDepthCapturePlugin") as? CAPPlugin.Type {
            bridge?.registerPluginInstance(foodDepthPluginClass.init())
        }
    }
}
