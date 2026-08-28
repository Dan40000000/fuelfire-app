import ARKit
import CoreImage
import CoreVideo
import Foundation
import ImageIO
import SceneKit
import UIKit
import simd

enum FoodDepthCaptureOutcome {
    case captured([String: Any])
    case cancelled
    case failed(code: String, message: String, data: [String: Any])
}

final class FoodDepthCaptureViewController: UIViewController, ARSessionDelegate {
    private let capabilities: FoodDepthCaptureCapabilities
    private let jpegQuality: CGFloat
    private let completion: (FoodDepthCaptureOutcome) -> Void

    private let sceneView = ARSCNView(frame: .zero)
    private let captureButton = UIButton(type: .system)
    private let cancelButton = UIButton(type: .system)
    private let statusLabel = UILabel()
    private let titleLabel = UILabel()
    private let guideView = UIView()

    private var sessionHasStarted = false
    private var isFinishing = false

    init(
        capabilities: FoodDepthCaptureCapabilities,
        jpegQuality: CGFloat,
        completion: @escaping (FoodDepthCaptureOutcome) -> Void
    ) {
        self.capabilities = capabilities
        self.jpegQuality = jpegQuality
        self.completion = completion
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        return nil
    }

    override var prefersStatusBarHidden: Bool {
        true
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureSceneView()
        configureOverlay()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startSession()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if !isFinishing {
            stopSession()
        }
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        guard !isFinishing,
              isBeingDismissed || navigationController?.isBeingDismissed == true else {
            return
        }
        isFinishing = true
        stopSession()
        completion(.cancelled)
    }

    func stopSession() {
        if Thread.isMainThread {
            sceneView.session.pause()
            sessionHasStarted = false
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.stopSession()
            }
        }
    }

    private func configureSceneView() {
        sceneView.translatesAutoresizingMaskIntoConstraints = false
        sceneView.scene = SCNScene()
        sceneView.session.delegate = self
        sceneView.automaticallyUpdatesLighting = false
        sceneView.backgroundColor = .black
        sceneView.contentMode = .scaleAspectFill
        view.addSubview(sceneView)

        NSLayoutConstraint.activate([
            sceneView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            sceneView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            sceneView.topAnchor.constraint(equalTo: view.topAnchor),
            sceneView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func configureOverlay() {
        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.backgroundColor = .clear
        view.addSubview(overlay)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "Capture your meal"
        titleLabel.textColor = .white
        titleLabel.font = UIFont.preferredFont(forTextStyle: .headline)
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 1

        let instructionLabel = UILabel()
        instructionLabel.translatesAutoresizingMaskIntoConstraints = false
        instructionLabel.text = capabilities.lidarAvailable
            ? "Move slowly over the plate, then tap Capture"
            : "Hold the phone steady over the plate, then tap Capture"
        instructionLabel.textColor = UIColor.white.withAlphaComponent(0.9)
        instructionLabel.font = UIFont.preferredFont(forTextStyle: .subheadline)
        instructionLabel.adjustsFontForContentSizeCategory = true
        instructionLabel.textAlignment = .center
        instructionLabel.numberOfLines = 2

        let header = UIStackView(arrangedSubviews: [titleLabel, instructionLabel])
        header.translatesAutoresizingMaskIntoConstraints = false
        header.axis = .vertical
        header.alignment = .fill
        header.spacing = 4
        header.isLayoutMarginsRelativeArrangement = true
        header.layoutMargins = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
        header.backgroundColor = UIColor.black.withAlphaComponent(0.52)
        header.layer.cornerRadius = 14
        header.layer.cornerCurve = .continuous
        overlay.addSubview(header)

        guideView.translatesAutoresizingMaskIntoConstraints = false
        guideView.backgroundColor = UIColor.white.withAlphaComponent(0.08)
        guideView.layer.borderColor = UIColor.white.withAlphaComponent(0.92).cgColor
        guideView.layer.borderWidth = 2
        guideView.layer.cornerRadius = 20
        guideView.layer.cornerCurve = .continuous
        guideView.isUserInteractionEnabled = false
        overlay.addSubview(guideView)

        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.text = capabilities.lidarAvailable
            ? "LiDAR depth active"
            : "AR world tracking active"
        statusLabel.textColor = .white
        statusLabel.font = UIFont.preferredFont(forTextStyle: .footnote)
        statusLabel.adjustsFontForContentSizeCategory = true
        statusLabel.textAlignment = .center
        statusLabel.numberOfLines = 2
        statusLabel.backgroundColor = UIColor.black.withAlphaComponent(0.52)
        statusLabel.layer.cornerRadius = 10
        statusLabel.layer.cornerCurve = .continuous
        statusLabel.clipsToBounds = true
        overlay.addSubview(statusLabel)

        configureButtons()
        let buttons = UIStackView(arrangedSubviews: [cancelButton, captureButton])
        buttons.translatesAutoresizingMaskIntoConstraints = false
        buttons.axis = .horizontal
        buttons.alignment = .fill
        buttons.distribution = .fillEqually
        buttons.spacing = 12
        overlay.addSubview(buttons)

        let safeArea = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            header.topAnchor.constraint(equalTo: safeArea.topAnchor, constant: 18),
            header.leadingAnchor.constraint(equalTo: safeArea.leadingAnchor, constant: 20),
            header.trailingAnchor.constraint(equalTo: safeArea.trailingAnchor, constant: -20),

            guideView.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            guideView.centerYAnchor.constraint(equalTo: overlay.centerYAnchor, constant: -12),
            guideView.widthAnchor.constraint(equalTo: overlay.widthAnchor, multiplier: 0.72),
            guideView.heightAnchor.constraint(equalTo: overlay.heightAnchor, multiplier: 0.27),
            guideView.leadingAnchor.constraint(greaterThanOrEqualTo: safeArea.leadingAnchor, constant: 24),
            guideView.trailingAnchor.constraint(lessThanOrEqualTo: safeArea.trailingAnchor, constant: -24),

            buttons.leadingAnchor.constraint(equalTo: safeArea.leadingAnchor, constant: 20),
            buttons.trailingAnchor.constraint(equalTo: safeArea.trailingAnchor, constant: -20),
            buttons.bottomAnchor.constraint(equalTo: safeArea.bottomAnchor, constant: -18),
            buttons.heightAnchor.constraint(equalToConstant: 54),

            statusLabel.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            statusLabel.bottomAnchor.constraint(equalTo: buttons.topAnchor, constant: -12),
            statusLabel.leadingAnchor.constraint(greaterThanOrEqualTo: safeArea.leadingAnchor, constant: 28),
            statusLabel.trailingAnchor.constraint(lessThanOrEqualTo: safeArea.trailingAnchor, constant: -28),
            statusLabel.heightAnchor.constraint(greaterThanOrEqualToConstant: 32)
        ])
    }

    private func configureButtons() {
        captureButton.translatesAutoresizingMaskIntoConstraints = false
        captureButton.setTitle("Capture", for: .normal)
        captureButton.setTitleColor(.white, for: .normal)
        captureButton.titleLabel?.font = UIFont.preferredFont(forTextStyle: .headline)
        captureButton.backgroundColor = .systemGreen
        captureButton.layer.cornerRadius = 16
        captureButton.layer.cornerCurve = .continuous
        captureButton.accessibilityLabel = "Capture food depth image"
        captureButton.accessibilityHint = "Captures a rear-camera JPEG and depth context"
        captureButton.addTarget(self, action: #selector(captureTapped), for: .touchUpInside)

        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.setTitleColor(.white, for: .normal)
        cancelButton.titleLabel?.font = UIFont.preferredFont(forTextStyle: .headline)
        cancelButton.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        cancelButton.layer.borderColor = UIColor.white.withAlphaComponent(0.82).cgColor
        cancelButton.layer.borderWidth = 1.5
        cancelButton.layer.cornerRadius = 16
        cancelButton.layer.cornerCurve = .continuous
        cancelButton.accessibilityLabel = "Cancel food depth capture"
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
    }

    private func startSession() {
        guard !isFinishing, !sessionHasStarted else { return }

        let configuration = ARWorldTrackingConfiguration()
        if capabilities.sceneDepthAvailable {
            configuration.frameSemantics.insert(.sceneDepth)
        }
        if capabilities.smoothedSceneDepthAvailable {
            configuration.frameSemantics.insert(.smoothedSceneDepth)
        }

        sceneView.session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
        sessionHasStarted = true
    }

    @objc private func captureTapped() {
        guard !isFinishing else { return }

        guard let frame = sceneView.session.currentFrame else {
            statusLabel.text = "Still starting the camera. Hold steady for a moment."
            return
        }

        isFinishing = true
        captureButton.isEnabled = false
        cancelButton.isEnabled = false
        statusLabel.text = "Preparing image and depth context…"
        stopSession()

        let snapshot = FoodDepthFrameSnapshot(
            frame: frame,
            capabilities: capabilities,
            jpegQuality: jpegQuality
        )

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            do {
                let payload = try FoodDepthCapturePayloadBuilder.build(snapshot)
                DispatchQueue.main.async {
                    self?.completion(.captured(payload))
                }
            } catch {
                let data: [String: Any] = [
                    "supported": true,
                    "cancelled": false,
                    "capabilities": snapshot.capabilities.dictionary,
                    "error": [
                        "code": "CAPTURE_ENCODING_FAILED",
                        "message": error.localizedDescription
                    ]
                ]
                DispatchQueue.main.async {
                    self?.completion(.failed(
                        code: "CAPTURE_ENCODING_FAILED",
                        message: error.localizedDescription,
                        data: data
                    ))
                }
            }
        }
    }

    @objc private func cancelTapped() {
        guard !isFinishing else { return }
        isFinishing = true
        stopSession()
        completion(.cancelled)
    }

    private func failSession(with error: Error) {
        guard !isFinishing else { return }
        isFinishing = true
        stopSession()
        let message = "AR camera session failed: " + error.localizedDescription
        let data: [String: Any] = [
            "supported": capabilities.captureSupported,
            "cancelled": false,
            "capabilities": capabilities.dictionary,
            "error": [
                "code": "AR_SESSION_FAILED",
                "message": message
            ]
        ]
        completion(.failed(code: "AR_SESSION_FAILED", message: message, data: data))
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        performOnMain { [weak self] in
            self?.failSession(with: error)
        }
    }

    func sessionWasInterrupted(_ session: ARSession) {
        performOnMain { [weak self] in
            guard let self, !self.isFinishing else { return }
            self.sessionHasStarted = false
            self.statusLabel.text = "Camera interrupted. Move back into view to continue."
        }
    }

    func sessionInterruptionEnded(_ session: ARSession) {
        performOnMain { [weak self] in
            guard let self, !self.isFinishing else { return }
            self.statusLabel.text = self.capabilities.lidarAvailable
                ? "LiDAR depth active"
                : "AR world tracking active"
            self.startSession()
        }
    }

    private func performOnMain(_ block: @escaping () -> Void) {
        if Thread.isMainThread {
            block()
        } else {
            DispatchQueue.main.async(execute: block)
        }
    }
}

private struct FoodDepthFrameSnapshot {
    let capturedImage: CVPixelBuffer
    let depthMap: CVPixelBuffer?
    let confidenceMap: CVPixelBuffer?
    let depthSource: String
    let rawImageWidth: Int
    let rawImageHeight: Int
    let cameraIntrinsics: [Double]
    let cameraTransform: [Double]
    let frameTimestamp: TimeInterval
    let capturedAt: Date
    let capabilities: FoodDepthCaptureCapabilities
    let jpegQuality: CGFloat

    init(
        frame: ARFrame,
        capabilities: FoodDepthCaptureCapabilities,
        jpegQuality: CGFloat
    ) {
        let smoothedDepthData = frame.smoothedSceneDepth
        let depthData = smoothedDepthData ?? frame.sceneDepth
        let capturedImage = frame.capturedImage
        self.capturedImage = capturedImage
        self.depthMap = depthData?.depthMap
        self.confidenceMap = depthData?.confidenceMap
        self.depthSource = smoothedDepthData != nil
            ? "smoothedSceneDepth"
            : (depthData != nil ? "sceneDepth" : "none")
        self.rawImageWidth = CVPixelBufferGetWidth(capturedImage)
        self.rawImageHeight = CVPixelBufferGetHeight(capturedImage)
        self.cameraIntrinsics = FoodDepthFrameSnapshot.flatten(frame.camera.intrinsics)
        self.cameraTransform = FoodDepthFrameSnapshot.flatten(frame.camera.transform)
        self.frameTimestamp = frame.timestamp
        self.capturedAt = Date()
        self.capabilities = capabilities
        self.jpegQuality = jpegQuality
    }

    private static func flatten(_ matrix: simd_float3x3) -> [Double] {
        [
            Double(matrix.columns.0.x), Double(matrix.columns.1.x), Double(matrix.columns.2.x),
            Double(matrix.columns.0.y), Double(matrix.columns.1.y), Double(matrix.columns.2.y),
            Double(matrix.columns.0.z), Double(matrix.columns.1.z), Double(matrix.columns.2.z)
        ]
    }

    private static func flatten(_ matrix: simd_float4x4) -> [Double] {
        [
            Double(matrix.columns.0.x), Double(matrix.columns.1.x), Double(matrix.columns.2.x), Double(matrix.columns.3.x),
            Double(matrix.columns.0.y), Double(matrix.columns.1.y), Double(matrix.columns.2.y), Double(matrix.columns.3.y),
            Double(matrix.columns.0.z), Double(matrix.columns.1.z), Double(matrix.columns.2.z), Double(matrix.columns.3.z),
            Double(matrix.columns.0.w), Double(matrix.columns.1.w), Double(matrix.columns.2.w), Double(matrix.columns.3.w)
        ]
    }
}

private enum FoodDepthCapturePayloadBuilder {
    private struct EncodedImage {
        let data: Data
        let width: Int
        let height: Int
    }

    static func build(_ snapshot: FoodDepthFrameSnapshot) throws -> [String: Any] {
        let encodedImage = try encodeImage(snapshot)
        let analysis = DepthAnalyzer.analyze(
            depthMap: snapshot.depthMap,
            confidenceMap: snapshot.confidenceMap,
            depthSource: snapshot.depthSource,
            cameraIntrinsics: snapshot.cameraIntrinsics,
            rawImageWidth: snapshot.rawImageWidth,
            rawImageHeight: snapshot.rawImageHeight
        )

        let spatialContext: [String: Any] = [
            "captureMode": snapshot.capabilities.captureMode,
            "lidarAvailable": snapshot.capabilities.lidarAvailable,
            "sceneDepthAvailable": snapshot.capabilities.sceneDepthAvailable,
            "smoothedSceneDepthAvailable": snapshot.capabilities.smoothedSceneDepthAvailable,
            "confidenceAvailable": analysis.confidenceAvailable,
            "imageResolution": [
                "width": encodedImage.width,
                "height": encodedImage.height
            ],
            "depthMapResolution": [
                "width": analysis.width,
                "height": analysis.height
            ],
            "cameraIntrinsics": orientedIntrinsics(
                snapshot.cameraIntrinsics,
                rawImageHeight: snapshot.rawImageHeight
            ),
            "cameraTransform": snapshot.cameraTransform,
            "centerDistanceMeters": jsonNumber(analysis.centerDistanceMeters),
            "platePlaneDistanceMeters": jsonNumber(analysis.platePlaneDistanceMeters),
            "estimatedFoodHeightMeters": jsonNumber(analysis.estimatedFoodHeightMeters),
            "depthStats": analysis.depthStats,
            "timestamp": iso8601String(snapshot.capturedAt),
            "depthSource": analysis.depthSource,
            "frameTimestampSeconds": rounded(snapshot.frameTimestamp),
            "rawImageResolution": [
                "width": snapshot.rawImageWidth,
                "height": snapshot.rawImageHeight
            ],
            "imageOrientation": "right",
            "depthValuesAreCameraZMeters": true,
            "platePlaneEstimateMethod": analysis.platePlaneEstimateMethod
        ]

        return [
            "supported": true,
            "cancelled": false,
            "imageBase64": encodedImage.data.base64EncodedString(),
            "mimeType": "image/jpeg",
            "spatialContext": spatialContext
        ]
    }

    private static func encodeImage(_ snapshot: FoodDepthFrameSnapshot) throws -> EncodedImage {
        let source = CIImage(cvPixelBuffer: snapshot.capturedImage)
        let oriented = source.oriented(.right)
        let extent = oriented.extent.integral
        let output = oriented.cropped(to: extent)
        let context = CIContext(options: nil)
        let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()
        let compressionKey = CIImageRepresentationOption(
            rawValue: kCGImageDestinationLossyCompressionQuality as String
        )
        let options: [CIImageRepresentationOption: Any] = [
            compressionKey: snapshot.jpegQuality
        ]

        guard let data = context.jpegRepresentation(
            of: output,
            colorSpace: colorSpace,
            options: options
        ) else {
            throw FoodDepthCapturePayloadError.imageEncodingFailed
        }

        return EncodedImage(
            data: data,
            width: max(1, Int(extent.width)),
            height: max(1, Int(extent.height))
        )
    }

    private static func orientedIntrinsics(_ intrinsics: [Double], rawImageHeight: Int) -> [Double] {
        guard intrinsics.count == 9 else { return intrinsics }

        // The rear-camera buffer is rotated clockwise before encoding. This
        // keeps the returned calibration matrix in the JPEG's pixel space.
        let height = Double(rawImageHeight)
        let fx = intrinsics[0]
        let fy = intrinsics[4]
        let cx = intrinsics[2]
        let cy = intrinsics[5]
        return [
            fy, 0, height - 1 - cy,
            0, fx, cx,
            0, 0, 1
        ]
    }

    private static func iso8601String(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    private static func jsonNumber(_ value: Double?) -> Any {
        guard let value, value.isFinite else { return NSNull() }
        return rounded(value)
    }

    private static func rounded(_ value: Double) -> Double {
        guard value.isFinite else { return 0 }
        return (value * 1000).rounded() / 1000
    }
}

private enum FoodDepthCapturePayloadError: LocalizedError {
    case imageEncodingFailed

    var errorDescription: String? {
        switch self {
        case .imageEncodingFailed:
            return "The camera image could not be encoded as JPEG."
        }
    }
}

private struct DepthAnalysis {
    let width: Int
    let height: Int
    let confidenceAvailable: Bool
    let depthSource: String
    let minMeters: Double?
    let maxMeters: Double?
    let medianMeters: Double?
    let validSampleRatio: Double
    let highConfidenceRatio: Double
    let centerDistanceMeters: Double?
    let platePlaneDistanceMeters: Double?
    let estimatedFoodHeightMeters: Double?
    let platePlaneEstimateMethod: String

    var depthStats: [String: Any] {
        [
            "minMeters": optionalNumber(minMeters),
            "maxMeters": optionalNumber(maxMeters),
            "medianMeters": optionalNumber(medianMeters),
            "validSampleRatio": rounded(validSampleRatio),
            "highConfidenceRatio": rounded(highConfidenceRatio),
            "p05Meters": optionalNumber(p05Meters),
            "p95Meters": optionalNumber(p95Meters)
        ]
    }

    let p05Meters: Double?
    let p95Meters: Double?

    private func optionalNumber(_ value: Double?) -> Any {
        guard let value, value.isFinite else { return NSNull() }
        return rounded(value)
    }

    private func rounded(_ value: Double) -> Double {
        (value * 1000).rounded() / 1000
    }
}

private enum DepthAnalyzer {
    private struct Point {
        let x: Double
        let y: Double
        let z: Double
    }

    private struct Plane {
        let normal: Point
        let offset: Double
        let centerRayDistance: Double
        let inlierCount: Int
        let meanResidual: Double
    }

    static func analyze(
        depthMap: CVPixelBuffer?,
        confidenceMap: CVPixelBuffer?,
        depthSource: String,
        cameraIntrinsics: [Double],
        rawImageWidth: Int,
        rawImageHeight: Int
    ) -> DepthAnalysis {
        guard let depthMap else {
            return DepthAnalysis(
                width: 0,
                height: 0,
                confidenceAvailable: false,
                depthSource: depthSource,
                minMeters: nil,
                maxMeters: nil,
                medianMeters: nil,
                validSampleRatio: 0,
                highConfidenceRatio: 0,
                centerDistanceMeters: nil,
                platePlaneDistanceMeters: nil,
                estimatedFoodHeightMeters: nil,
                platePlaneEstimateMethod: "unavailable",
                p05Meters: nil,
                p95Meters: nil
            )
        }

        let width = CVPixelBufferGetWidth(depthMap)
        let height = CVPixelBufferGetHeight(depthMap)
        guard width > 0, height > 0 else {
            return DepthAnalysis(
                width: width,
                height: height,
                confidenceAvailable: false,
                depthSource: depthSource,
                minMeters: nil,
                maxMeters: nil,
                medianMeters: nil,
                validSampleRatio: 0,
                highConfidenceRatio: 0,
                centerDistanceMeters: nil,
                platePlaneDistanceMeters: nil,
                estimatedFoodHeightMeters: nil,
                platePlaneEstimateMethod: "unavailable",
                p05Meters: nil,
                p95Meters: nil
            )
        }

        let depthFormat = CVPixelBufferGetPixelFormatType(depthMap)
        let isReadableDepthFormat = depthFormat == kCVPixelFormatType_DepthFloat32
            || depthFormat == kCVPixelFormatType_DepthFloat16
        guard isReadableDepthFormat else {
            return DepthAnalysis(
                width: width,
                height: height,
                confidenceAvailable: false,
                depthSource: depthSource,
                minMeters: nil,
                maxMeters: nil,
                medianMeters: nil,
                validSampleRatio: 0,
                highConfidenceRatio: 0,
                centerDistanceMeters: nil,
                platePlaneDistanceMeters: nil,
                estimatedFoodHeightMeters: nil,
                platePlaneEstimateMethod: "unavailable",
                p05Meters: nil,
                p95Meters: nil
            )
        }

        let confidenceDimensions: (width: Int, height: Int)?
        let confidenceFormat: OSType
        if let confidenceMap,
           CVPixelBufferGetWidth(confidenceMap) > 0,
           CVPixelBufferGetHeight(confidenceMap) > 0 {
            confidenceDimensions = (
                CVPixelBufferGetWidth(confidenceMap),
                CVPixelBufferGetHeight(confidenceMap)
            )
            confidenceFormat = CVPixelBufferGetPixelFormatType(confidenceMap)
        } else {
            confidenceDimensions = nil
            confidenceFormat = 0
        }

        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        guard let depthBaseAddress = CVPixelBufferGetBaseAddress(depthMap) else {
            CVPixelBufferUnlockBaseAddress(depthMap, .readOnly)
            return DepthAnalysis(
                width: width,
                height: height,
                confidenceAvailable: false,
                depthSource: depthSource,
                minMeters: nil,
                maxMeters: nil,
                medianMeters: nil,
                validSampleRatio: 0,
                highConfidenceRatio: 0,
                centerDistanceMeters: nil,
                platePlaneDistanceMeters: nil,
                estimatedFoodHeightMeters: nil,
                platePlaneEstimateMethod: "unavailable",
                p05Meters: nil,
                p95Meters: nil
            )
        }
        if let confidenceMap, confidenceDimensions != nil {
            CVPixelBufferLockBaseAddress(confidenceMap, .readOnly)
        }
        let confidenceBaseAddress = confidenceMap.flatMap {
            CVPixelBufferGetBaseAddress($0)
        }
        let confidenceAvailable = confidenceDimensions != nil
            && confidenceBaseAddress != nil
            && (confidenceFormat == kCVPixelFormatType_OneComponent8
                || confidenceFormat == kCVPixelFormatType_OneComponent16)

        defer {
            CVPixelBufferUnlockBaseAddress(depthMap, .readOnly)
            if let confidenceMap, confidenceDimensions != nil {
                CVPixelBufferUnlockBaseAddress(confidenceMap, .readOnly)
            }
        }

        let totalPixels = width * height
        let sampleStep = max(1, Int(ceil(sqrt(Double(totalPixels) / 6000.0))))
        let bytesPerRow = CVPixelBufferGetBytesPerRow(depthMap)
        let confidenceBytesPerRow = confidenceMap.map { CVPixelBufferGetBytesPerRow($0) } ?? 0
        let centerX = width / 2
        let centerY = height / 2
        let centerRadiusX = max(2, width / 12)
        let centerRadiusY = max(2, height / 12)

        let canProject = cameraIntrinsics.count == 9
            && cameraIntrinsics[0] > 0
            && cameraIntrinsics[4] > 0
        let scaleX = Double(rawImageWidth) / Double(width)
        let scaleY = Double(rawImageHeight) / Double(height)
        let fx = canProject ? cameraIntrinsics[0] : 1
        let fy = canProject ? cameraIntrinsics[4] : 1
        let cx = canProject ? cameraIntrinsics[2] : 0
        let cy = canProject ? cameraIntrinsics[5] : 0

        var values: [Double] = []
        var centerValues: [Double] = []
        var points: [Point] = []
        values.reserveCapacity(min(totalPixels, 6000))
        points.reserveCapacity(min(totalPixels, 3000))
        var sampledCount = 0
        var validCount = 0
        var highConfidenceCount = 0

        for y in stride(from: 0, to: height, by: sampleStep) {
            let depthRow = depthBaseAddress.advanced(by: y * bytesPerRow)
            for x in stride(from: 0, to: width, by: sampleStep) {
                sampledCount += 1
                guard let depth = readDepth(
                    rowAddress: depthRow,
                    x: x,
                    format: depthFormat
                ), depth.isFinite, depth > 0.01, depth <= 10 else {
                    continue
                }

                let value = Double(depth)
                values.append(value)
                validCount += 1

                if abs(x - centerX) <= centerRadiusX && abs(y - centerY) <= centerRadiusY {
                    centerValues.append(value)
                }

                if confidenceAvailable,
                   let confidenceDimensions,
                   let confidenceBaseAddress,
                   let confidence = readConfidence(
                       baseAddress: confidenceBaseAddress,
                       bytesPerRow: confidenceBytesPerRow,
                       x: min(confidenceDimensions.width - 1, Int(Double(x) * Double(confidenceDimensions.width) / Double(width))),
                       y: min(confidenceDimensions.height - 1, Int(Double(y) * Double(confidenceDimensions.height) / Double(height))),
                       format: confidenceFormat
                   ), confidence >= UInt8(ARConfidenceLevel.high.rawValue) {
                    highConfidenceCount += 1
                }

                if canProject {
                    let u = (Double(x) + 0.5) * scaleX
                    let v = (Double(y) + 0.5) * scaleY
                    points.append(Point(
                        x: ((u - cx) / fx) * value,
                        y: ((v - cy) / fy) * value,
                        z: value
                    ))
                }
            }
        }

        guard !values.isEmpty else {
            return DepthAnalysis(
                width: width,
                height: height,
                confidenceAvailable: confidenceAvailable,
                depthSource: depthSource,
                minMeters: nil,
                maxMeters: nil,
                medianMeters: nil,
                validSampleRatio: sampledCount > 0 ? Double(validCount) / Double(sampledCount) : 0,
                highConfidenceRatio: 0,
                centerDistanceMeters: nil,
                platePlaneDistanceMeters: nil,
                estimatedFoodHeightMeters: nil,
                platePlaneEstimateMethod: "unavailable",
                p05Meters: nil,
                p95Meters: nil
            )
        }

        values.sort()
        centerValues.sort()
        let median = percentile(values, 0.5)
        let p05 = percentile(values, 0.05)
        let p95 = percentile(values, 0.95)
        let centerDistance = centerValues.isEmpty ? median : percentile(centerValues, 0.5)
        let plane = estimatePlatePlane(points)
        let fallbackPlaneDistance = percentile(values, 0.85)
        let plateDistance = plane?.centerRayDistance ?? fallbackPlaneDistance
        let planeMethod = plane == nil ? "depthPercentile" : "ransacPlane"
        let heightEstimate: Double?
        if let plateDistance, let centerDistance, plateDistance > centerDistance {
            heightEstimate = min(max(plateDistance - centerDistance, 0), 1.5)
        } else {
            heightEstimate = nil
        }

        return DepthAnalysis(
            width: width,
            height: height,
            confidenceAvailable: confidenceAvailable,
            depthSource: depthSource,
            minMeters: values.first,
            maxMeters: values.last,
            medianMeters: median,
            validSampleRatio: sampledCount > 0 ? Double(validCount) / Double(sampledCount) : 0,
            highConfidenceRatio: confidenceAvailable && validCount > 0
                ? Double(highConfidenceCount) / Double(validCount)
                : 0,
            centerDistanceMeters: centerDistance,
            platePlaneDistanceMeters: plateDistance,
            estimatedFoodHeightMeters: heightEstimate,
            platePlaneEstimateMethod: planeMethod,
            p05Meters: p05,
            p95Meters: p95
        )
    }

    private static func readDepth(
        rowAddress: UnsafeMutableRawPointer,
        x: Int,
        format: OSType
    ) -> Float? {
        switch format {
        case kCVPixelFormatType_DepthFloat32:
            return rowAddress.assumingMemoryBound(to: Float32.self)[x]
        case kCVPixelFormatType_DepthFloat16:
            let bits = rowAddress.assumingMemoryBound(to: UInt16.self)[x]
            return Float(Float16(bitPattern: bits))
        default:
            return nil
        }
    }

    private static func readConfidence(
        baseAddress: UnsafeMutableRawPointer,
        bytesPerRow: Int,
        x: Int,
        y: Int,
        format: OSType
    ) -> UInt8? {
        let rowAddress = baseAddress.advanced(by: y * bytesPerRow)
        switch format {
        case kCVPixelFormatType_OneComponent8:
            return rowAddress.assumingMemoryBound(to: UInt8.self)[x]
        case kCVPixelFormatType_OneComponent16:
            return UInt8(min(255, rowAddress.assumingMemoryBound(to: UInt16.self)[x] >> 8))
        default:
            return nil
        }
    }

    private static func percentile(_ sortedValues: [Double], _ fraction: Double) -> Double? {
        guard !sortedValues.isEmpty else { return nil }
        let position = min(max(fraction, 0), 1) * Double(sortedValues.count - 1)
        let lowerIndex = Int(floor(position))
        let upperIndex = Int(ceil(position))
        if lowerIndex == upperIndex {
            return sortedValues[lowerIndex]
        }
        let weight = position - Double(lowerIndex)
        return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
    }

    private static func estimatePlatePlane(_ points: [Point]) -> Plane? {
        guard points.count >= 20 else { return nil }

        let candidateCount = min(points.count, 1200)
        let threshold = 0.025
        var bestPlane: Plane?

        for iteration in 0..<min(240, candidateCount) {
            let firstIndex = iteration % candidateCount
            let secondIndex = (iteration * 37 + 17) % candidateCount
            let thirdIndex = (iteration * 91 + 43) % candidateCount
            guard firstIndex != secondIndex,
                  firstIndex != thirdIndex,
                  secondIndex != thirdIndex else {
                continue
            }

            let first = points[firstIndex]
            let second = points[secondIndex]
            let third = points[thirdIndex]
            let normalUnscaled = cross(subtract(second, first), subtract(third, first))
            let normalLength = length(normalUnscaled)
            guard normalLength > 0.0001 else { continue }
            let normal = scale(normalUnscaled, 1 / normalLength)
            guard abs(normal.z) > 0.35 else { continue }

            let offset = -dot(normal, first)
            let centerRayDistance = -offset / normal.z
            guard centerRayDistance.isFinite,
                  centerRayDistance > 0.05,
                  centerRayDistance <= 10 else {
                continue
            }

            var inlierCount = 0
            var residualSum = 0.0
            for point in points {
                let residual = abs(dot(normal, point) + offset)
                if residual <= threshold {
                    inlierCount += 1
                    residualSum += residual
                }
            }
            guard inlierCount > 0 else { continue }

            let meanResidual = residualSum / Double(inlierCount)
            if bestPlane == nil
                || inlierCount > bestPlane!.inlierCount
                || (inlierCount == bestPlane!.inlierCount && meanResidual < bestPlane!.meanResidual) {
                bestPlane = Plane(
                    normal: normal,
                    offset: offset,
                    centerRayDistance: centerRayDistance,
                    inlierCount: inlierCount,
                    meanResidual: meanResidual
                )
            }
        }

        guard let bestPlane,
              bestPlane.inlierCount >= max(20, points.count / 30) else {
            return nil
        }
        return bestPlane
    }

    private static func subtract(_ lhs: Point, _ rhs: Point) -> Point {
        Point(x: lhs.x - rhs.x, y: lhs.y - rhs.y, z: lhs.z - rhs.z)
    }

    private static func cross(_ lhs: Point, _ rhs: Point) -> Point {
        Point(
            x: lhs.y * rhs.z - lhs.z * rhs.y,
            y: lhs.z * rhs.x - lhs.x * rhs.z,
            z: lhs.x * rhs.y - lhs.y * rhs.x
        )
    }

    private static func dot(_ lhs: Point, _ rhs: Point) -> Double {
        lhs.x * rhs.x + lhs.y * rhs.y + lhs.z * rhs.z
    }

    private static func length(_ point: Point) -> Double {
        sqrt(dot(point, point))
    }

    private static func scale(_ point: Point, _ factor: Double) -> Point {
        Point(x: point.x * factor, y: point.y * factor, z: point.z * factor)
    }
}
