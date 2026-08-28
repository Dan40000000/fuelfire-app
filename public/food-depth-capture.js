(function (root, factory) {
    const bridge = factory(root);

    if (typeof module === 'object' && module.exports) {
        module.exports = bridge;
    }
    if (root) {
        root.FoodDepthCaptureBridge = bridge;
        // Keep the helper convenient for static pages while leaving
        // Capacitor's own plugin registry untouched.
        if (!root.FoodDepthCapture) root.FoodDepthCapture = bridge;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    let cachedPlugin = null;

    function capacitor() {
        return root && (root.Capacitor || root.capacitor) || null;
    }

    function isNative(cap) {
        if (!cap) return false;
        if (typeof cap.isNativePlatform === 'function') {
            try {
                return Boolean(cap.isNativePlatform());
            } catch (_) {
                return false;
            }
        }
        if (typeof cap.getPlatform === 'function') {
            try {
                return cap.getPlatform() !== 'web';
            } catch (_) {
                return false;
            }
        }
        return Boolean(cap.Plugins);
    }

    function resolvePlugin() {
        if (cachedPlugin) return cachedPlugin;

        const cap = capacitor();
        if (!cap) return null;

        if (cap.Plugins && cap.Plugins.FoodDepthCapture) {
            cachedPlugin = cap.Plugins.FoodDepthCapture;
            return cachedPlugin;
        }

        // registerPlugin is intentionally only attempted for a native
        // Capacitor runtime. In a normal browser this module should be a
        // harmless, structured fallback rather than a rejected proxy call.
        if (isNative(cap) && typeof cap.registerPlugin === 'function') {
            try {
                cachedPlugin = cap.registerPlugin('FoodDepthCapture');
                return cachedPlugin;
            } catch (_) {
                return null;
            }
        }

        return null;
    }

    function errorDetails(code, message) {
        return { code, message };
    }

    function unsupportedResult(message, code) {
        const reasonCode = code || 'UNAVAILABLE';
        return {
            supported: false,
            captureSupported: false,
            cancelled: false,
            worldTrackingAvailable: false,
            worldTrackingSupported: false,
            arWorldTrackingSupported: false,
            sceneDepthAvailable: false,
            sceneDepthSupported: false,
            smoothedSceneDepthAvailable: false,
            smoothedSceneDepthSupported: false,
            lidarAvailable: false,
            rearCameraAvailable: false,
            cameraAuthorizationStatus: 'unknown',
            captureMode: 'unsupported',
            reason: reasonCode,
            error: errorDetails(reasonCode, message)
        };
    }

    function normalizeCapabilities(result) {
        if (!result || typeof result !== 'object') {
            return unsupportedResult('The native food depth capability response was empty.', 'INVALID_CAPABILITIES');
        }

        const worldTrackingAvailable = Boolean(
            result.worldTrackingAvailable
                ?? result.worldTrackingSupported
                ?? result.arWorldTrackingSupported
        );
        const sceneDepthAvailable = Boolean(result.sceneDepthAvailable ?? result.sceneDepthSupported);
        const smoothedSceneDepthAvailable = Boolean(
            result.smoothedSceneDepthAvailable ?? result.smoothedSceneDepthSupported
        );
        const captureSupported = result.captureSupported !== undefined
            ? Boolean(result.captureSupported)
            : Boolean(result.supported && worldTrackingAvailable);

        return {
            ...result,
            supported: captureSupported,
            captureSupported,
            worldTrackingAvailable,
            worldTrackingSupported: worldTrackingAvailable,
            arWorldTrackingSupported: worldTrackingAvailable,
            sceneDepthAvailable,
            sceneDepthSupported: sceneDepthAvailable,
            smoothedSceneDepthAvailable,
            smoothedSceneDepthSupported: smoothedSceneDepthAvailable,
            lidarAvailable: Boolean(result.lidarAvailable || sceneDepthAvailable || smoothedSceneDepthAvailable),
            rearCameraAvailable: result.rearCameraAvailable !== false,
            cameraAuthorizationStatus: result.cameraAuthorizationStatus || 'unknown',
            captureMode: result.captureMode || (captureSupported
                ? (sceneDepthAvailable || smoothedSceneDepthAvailable ? 'lidarSceneDepth' : 'arWorldTracking')
                : 'unsupported')
        };
    }

    function messageFor(error, fallback) {
        return error && (error.message || error.localizedDescription) || fallback;
    }

    async function getCapabilities() {
        const plugin = resolvePlugin();
        if (!plugin || typeof plugin.getCapabilities !== 'function') {
            return unsupportedResult(
                'LiDAR/AR food depth capture is available only in the native iOS build.',
                'NATIVE_PLUGIN_UNAVAILABLE'
            );
        }

        try {
            return normalizeCapabilities(await plugin.getCapabilities());
        } catch (error) {
            return unsupportedResult(
                messageFor(error, 'The native food depth capability check failed.'),
                error && error.code || 'CAPABILITIES_FAILED'
            );
        }
    }

    function normalizeCaptureResult(result, capabilities) {
        if (!result || typeof result !== 'object') {
            return {
                ...unsupportedResult('The native food depth capture response was empty.', 'INVALID_CAPTURE_RESULT'),
                capabilities
            };
        }

        return {
            ...result,
            supported: result.supported !== false,
            cancelled: Boolean(result.cancelled),
            spatialContext: result.spatialContext || null,
            capabilities: result.capabilities || capabilities
        };
    }

    async function capture(options) {
        const plugin = resolvePlugin();
        if (!plugin || typeof plugin.capture !== 'function') {
            return unsupportedResult(
                'Food depth capture is unavailable in this browser or native build.',
                'NATIVE_PLUGIN_UNAVAILABLE'
            );
        }

        const capabilities = await getCapabilities();
        if (capabilities.captureSupported === false) {
            return {
                ...capabilities,
                cancelled: false,
                capabilities
            };
        }

        try {
            return normalizeCaptureResult(await plugin.capture(options || {}), capabilities);
        } catch (error) {
            const nativeData = error && (error.data || error.details);
            return {
                supported: capabilities.supported,
                captureSupported: capabilities.captureSupported,
                cancelled: false,
                capabilities,
                ...(nativeData && typeof nativeData === 'object' ? nativeData : {}),
                error: errorDetails(
                    error && error.code || 'CAPTURE_FAILED',
                    messageFor(error, 'Food depth capture failed.')
                )
            };
        }
    }

    async function isSupported() {
        const result = await getCapabilities();
        return Boolean(result.captureSupported);
    }

    function isCancellation(error) {
        const code = error && (error.code || error.error?.code || error.data?.error?.code);
        return code === 'CANCELLED' || code === 'CANCELED' || code === 'USER_CANCELLED';
    }

    return Object.freeze({
        getPlugin: resolvePlugin,
        getCapabilities,
        capture,
        isSupported,
        isCancellation
    });
});
