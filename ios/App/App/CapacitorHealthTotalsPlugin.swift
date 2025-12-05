import Foundation
import Capacitor
import HealthKit

@objc(HealthTotalsPlugin)
public class HealthTotalsPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()
    private let calendar = Calendar.current

    @objc func getDailyTotals(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data not available on this device.")
            return
        }

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withFullDate, .withDashSeparatorInDate]

        let requestedDateString = call.getString("date")
        let referenceDate: Date
        if let dateString = requestedDateString,
           let parsedDate = isoFormatter.date(from: dateString) {
            referenceDate = parsedDate
        } else {
            referenceDate = Date()
        }

        let startOfDay = calendar.startOfDay(for: referenceDate)
        guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
            call.reject("Unable to compute date range.")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)

        var stepsResult: Double = 0
        var distanceResult: Double = 0
        var activeEnergyResult: Double = 0
        var heartRateAverage: Double?
        var heartRateMin: Double?
        var heartRateMax: Double?

        var capturedError: Error?
        let dispatchGroup = DispatchGroup()

        func executeCumulativeQuery(identifier: HKQuantityTypeIdentifier, unit: HKUnit, completion: @escaping (Double) -> Void) {
            guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
                completion(0)
                return
            }

            dispatchGroup.enter()
            let query = HKStatisticsQuery(quantityType: quantityType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, statistics, error in
                defer { dispatchGroup.leave() }
                if let error = error {
                    capturedError = error
                    completion(0)
                    return
                }
                if let quantity = statistics?.sumQuantity() {
                    completion(quantity.doubleValue(for: unit))
                } else {
                    completion(0)
                }
            }
            self.healthStore.execute(query)
        }

        func executeHeartRateQuery() {
            guard let quantityType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
                return
            }

            dispatchGroup.enter()
            let hrUnit = HKUnit.count().unitDivided(by: HKUnit.minute())
            let options: HKStatisticsOptions = [.discreteAverage, .discreteMin, .discreteMax]
            let query = HKStatisticsQuery(quantityType: quantityType, quantitySamplePredicate: predicate, options: options) { _, statistics, error in
                defer { dispatchGroup.leave() }
                if let error = error {
                    capturedError = error
                    return
                }
                if let average = statistics?.averageQuantity()?.doubleValue(for: hrUnit) {
                    heartRateAverage = average
                }
                if let min = statistics?.minimumQuantity()?.doubleValue(for: hrUnit) {
                    heartRateMin = min
                }
                if let max = statistics?.maximumQuantity()?.doubleValue(for: hrUnit) {
                    heartRateMax = max
                }
            }
            self.healthStore.execute(query)
        }

        executeCumulativeQuery(identifier: .stepCount, unit: HKUnit.count()) { total in
            stepsResult = total
        }

        executeCumulativeQuery(identifier: .distanceWalkingRunning, unit: HKUnit.meter()) { total in
            distanceResult = total
        }

        executeCumulativeQuery(identifier: .activeEnergyBurned, unit: HKUnit.kilocalorie()) { total in
            activeEnergyResult = total
        }

        executeHeartRateQuery()

        dispatchGroup.notify(queue: .main) {
            if let error = capturedError {
                call.reject("Health query failed: \(error.localizedDescription)")
                return
            }

            let response: [String: Any] = [
                "steps": stepsResult,
                "distanceMeters": distanceResult,
                "activeEnergy": activeEnergyResult,
                "heartRate": [
                    "average": heartRateAverage as Any,
                    "min": heartRateMin as Any,
                    "max": heartRateMax as Any
                ]
            ]

            call.resolve(response)
        }
    }
}

@objc(HealthTotalsPluginPlugin)
public class HealthTotalsPluginPlugin: NSObject {
    @objc public static func register(with registrar: CAPPluginRegistrar) {
        registrar.register(plugin: "HealthTotals", clazz: HealthTotalsPlugin.self)
    }
}
