import AVFoundation
import ARKit
import Capacitor
import Foundation

/// The hardware and ARKit capabilities used by the food depth capture flow.
struct FoodDepthCaptureCapabilities {
    let worldTrackingAvailable: Bool
    let sceneDepthAvailable: Bool
    let smoothedSceneDepthAvailable: Bool
    let lidarAvailable: Bool
    let rearCameraAvailable: Bool
    let cameraAuthorizationStatus: String

    var captureSupported: Bool {
        worldTrackingAvailable && rearCameraAvailable
    }

    var captureMode: String {
        if !captureSupported {
            return "unsupported"
        }
        return lidarAvailable ? "lidarSceneDepth" : "arWorldTracking"
    }

    var dictionary: [String: Any] {
        [
            "supported": captureSupported,
            "captureSupported": captureSupported,
            "worldTrackingAvailable": worldTrackingAvailable,
            "worldTrackingSupported": worldTrackingAvailable,
            "arWorldTrackingSupported": worldTrackingAvailable,
            "sceneDepthAvailable": sceneDepthAvailable,
            "sceneDepthSupported": sceneDepthAvailable,
            "smoothedSceneDepthAvailable": smoothedSceneDepthAvailable,
            "smoothedSceneDepthSupported": smoothedSceneDepthAvailable,
            "lidarAvailable": lidarAvailable,
            "rearCameraAvailable": rearCameraAvailable,
            "cameraAuthorizationStatus": cameraAuthorizationStatus,
            "captureMode": captureMode
        ]
    }

    static func current() -> FoodDepthCaptureCapabilities {
        let worldTrackingAvailable = ARWorldTrackingConfiguration.isSupported
        let sceneDepthAvailable = worldTrackingAvailable
            && ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
        let smoothedSceneDepthAvailable = worldTrackingAvailable
            && ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth)
        let rearCameraAvailable = AVCaptureDevice.default(
            .builtInWideAngleCamera,
            for: .video,
            position: .back
        ) != nil

        return FoodDepthCaptureCapabilities(
            worldTrackingAvailable: worldTrackingAvailable,
            sceneDepthAvailable: sceneDepthAvailable,
            smoothedSceneDepthAvailable: smoothedSceneDepthAvailable,
            lidarAvailable: sceneDepthAvailable || smoothedSceneDepthAvailable,
            rearCameraAvailable: rearCameraAvailable,
            cameraAuthorizationStatus: authorizationStatusName(
                AVCaptureDevice.authorizationStatus(for: .video)
            )
        )
    }

    private static func authorizationStatusName(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .authorized:
            return "authorized"
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .restricted:
            return "restricted"
        @unknown default:
            return "unknown"
        }
    }
}

@objc(FoodDepthCapturePlugin)
public class FoodDepthCapturePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FoodDepthCapturePlugin"
    public let jsName = "FoodDepthCapture"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "capture", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private weak var captureViewController: FoodDepthCaptureViewController?

    @objc public func getCapabilities(_ call: CAPPluginCall) {
        performOnMain { call.resolve(FoodDepthCaptureCapabilities.current().dictionary) }
    }

    @objc public func capture(_ call: CAPPluginCall) {
        performOnMain { [weak self] in
            self?.beginCapture(call)
        }
    }

    private func beginCapture(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            call.reject(
                "A food depth capture is already in progress.",
                "CAPTURE_IN_PROGRESS"
            )
            return
        }

        // Claim the call before requesting permission. A permission prompt is
        // asynchronous, so without this guard two callers could both present
        // a capture controller when the prompt completes.
        pendingCall = call
        let capabilities = FoodDepthCaptureCapabilities.current()
        guard capabilities.captureSupported else {
            rejectUnsupported(
                call,
                capabilities: capabilities,
                code: "UNSUPPORTED",
                reason: unsupportedReason(for: capabilities)
            )
            return
        }

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            presentCapture(call, capabilities: capabilities)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                self?.performOnMain {
                    guard let self, self.pendingCall === call else { return }

                    guard granted else {
                        let currentCapabilities = FoodDepthCaptureCapabilities.current()
                        self.rejectUnsupported(
                            call,
                            capabilities: currentCapabilities,
                            code: "CAMERA_PERMISSION_DENIED",
                            reason: "Camera access is required for food depth capture."
                        )
                        return
                    }

                    let currentCapabilities = FoodDepthCaptureCapabilities.current()
                    guard currentCapabilities.captureSupported else {
                        self.rejectUnsupported(
                            call,
                            capabilities: currentCapabilities,
                            code: "UNSUPPORTED",
                            reason: self.unsupportedReason(for: currentCapabilities)
                        )
                        return
                    }
                    self.presentCapture(call, capabilities: currentCapabilities)
                }
            }
        case .denied, .restricted:
            rejectUnsupported(
                call,
                capabilities: capabilities,
                code: "CAMERA_PERMISSION_DENIED",
                reason: "Camera access is required for food depth capture."
            )
        @unknown default:
            rejectUnsupported(
                call,
                capabilities: capabilities,
                code: "CAMERA_PERMISSION_UNKNOWN",
                reason: "Camera access could not be determined."
            )
        }
    }

    private func presentCapture(
        _ call: CAPPluginCall,
        capabilities: FoodDepthCaptureCapabilities
    ) {
        guard pendingCall === call else { return }

        guard let presentingViewController = bridge?.viewController else {
            rejectPresentationFailure(
                call,
                message: "Unable to present the food depth capture view."
            )
            return
        }

        guard presentingViewController.presentedViewController == nil,
              !presentingViewController.isBeingDismissed,
              !presentingViewController.isBeingPresented,
              presentingViewController.transitionCoordinator == nil else {
            rejectPresentationFailure(
                call,
                message: "The app is already presenting another screen. Try food depth capture again."
            )
            return
        }

        let jpegQuality = captureJPEGQuality(from: call)
        let viewController = FoodDepthCaptureViewController(
            capabilities: capabilities,
            jpegQuality: jpegQuality
        ) { [weak self] outcome in
            self?.finishCapture(outcome)
        }

        pendingCall = call
        captureViewController = viewController
        viewController.modalPresentationStyle = .fullScreen
        presentingViewController.present(viewController, animated: true) { [weak self, weak viewController, weak presentingViewController] in
            guard let self, let viewController, let presentingViewController else { return }
            guard self.pendingCall === call,
                  self.captureViewController === viewController else {
                return
            }

            guard viewController.presentingViewController === presentingViewController else {
                self.rejectPresentationFailure(
                    call,
                    message: "The food depth capture screen could not be presented. Try again."
                )
                return
            }
        }

        // UIKit normally invokes the presentation completion block, but a
        // presentation rejected during a transition can leave it unresolved.
        // Re-check after the animation window so that the bridge call cannot
        // remain pending and a subsequent retry is possible.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self, weak viewController, weak presentingViewController] in
            guard let self, let viewController, let presentingViewController,
                  self.pendingCall === call,
                  self.captureViewController === viewController else {
                return
            }
            guard viewController.presentingViewController === presentingViewController else {
                self.rejectPresentationFailure(
                    call,
                    message: "The food depth capture screen could not be presented. Try again."
                )
                return
            }
        }
    }

    private func finishCapture(_ outcome: FoodDepthCaptureOutcome) {
        performOnMain { [weak self] in
            guard let self, let call = self.pendingCall else { return }

            let viewController = self.captureViewController
            viewController?.stopSession()
            self.pendingCall = nil
            self.captureViewController = nil

            let finishCall = {
                switch outcome {
                case .captured(let payload):
                    call.resolve(payload)
                case .cancelled:
                    call.resolve([
                        "supported": true,
                        "cancelled": true,
                        "capabilities": FoodDepthCaptureCapabilities.current().dictionary
                    ])
                case .failed(let code, let message, let data):
                    call.reject(message, code, nil, data)
                }
            }

            if let viewController, viewController.presentingViewController != nil {
                viewController.dismiss(animated: true, completion: finishCall)
            } else {
                finishCall()
            }
        }
    }

    private func rejectPresentationFailure(_ call: CAPPluginCall, message: String) {
        guard pendingCall === call else { return }

        pendingCall = nil
        captureViewController = nil
        let data: [String: Any] = [
            "supported": true,
            "cancelled": false,
            "capabilities": FoodDepthCaptureCapabilities.current().dictionary,
            "error": [
                "code": "PRESENTATION_FAILED",
                "message": message
            ]
        ]
        call.reject(message, "PRESENTATION_FAILED", nil, data)
    }

    private func rejectUnsupported(
        _ call: CAPPluginCall,
        capabilities: FoodDepthCaptureCapabilities,
        code: String,
        reason: String
    ) {
        guard pendingCall === call else { return }

        pendingCall = nil
        captureViewController = nil
        let data: [String: Any] = [
            "supported": false,
            "cancelled": false,
            "reason": code == "UNSUPPORTED"
                ? "arWorldTrackingUnavailable"
                : (code == "CAMERA_PERMISSION_DENIED" ? "cameraPermissionDenied" : "cameraAuthorizationUnknown"),
            "capabilities": capabilities.dictionary,
            "error": [
                "code": code,
                "message": reason
            ]
        ]
        call.reject(reason, code, nil, data)
    }

    private func unsupportedReason(for capabilities: FoodDepthCaptureCapabilities) -> String {
        if !capabilities.worldTrackingAvailable {
            return "AR world tracking is not supported on this device."
        }
        if !capabilities.rearCameraAvailable {
            return "A rear camera is not available on this device."
        }
        return "Food depth capture is not supported on this device."
    }

    private func captureJPEGQuality(from call: CAPPluginCall) -> CGFloat {
        let requestedQuality = call.getDouble("jpegQuality") ?? 0.82
        return CGFloat(min(max(requestedQuality, 0.5), 0.95))
    }

    private func performOnMain(_ block: @escaping () -> Void) {
        if Thread.isMainThread {
            block()
        } else {
            DispatchQueue.main.async(execute: block)
        }
    }
}
