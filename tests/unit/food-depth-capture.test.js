import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const bridgeSource = fs.readFileSync(
    new URL('../../public/food-depth-capture.js', import.meta.url),
    'utf8'
);

function loadBridge(extraGlobals = {}) {
    const sandbox = {
        console,
        ...extraGlobals,
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(bridgeSource, sandbox, { filename: 'food-depth-capture.js' });
    return sandbox.FoodDepthCaptureBridge;
}

describe('food depth capture bridge', () => {
    it('returns a structured unsupported result in a web browser', async () => {
        const bridge = loadBridge();
        const capabilities = await bridge.getCapabilities();
        const capture = await bridge.capture();

        expect(capabilities).toMatchObject({
            supported: false,
            captureSupported: false,
            lidarAvailable: false,
            captureMode: 'unsupported',
        });
        expect(capture).toMatchObject({
            supported: false,
            captureSupported: false,
            error: { code: 'NATIVE_PLUGIN_UNAVAILABLE' },
        });
    });

    it('normalizes native capabilities and preserves compact spatial context', async () => {
        const nativePlugin = {
            getCapabilities: vi.fn().mockResolvedValue({
                supported: true,
                worldTrackingAvailable: true,
                sceneDepthAvailable: true,
                smoothedSceneDepthAvailable: true,
                lidarAvailable: true,
            }),
            capture: vi.fn().mockResolvedValue({
                supported: true,
                cancelled: false,
                imageBase64: 'anBlZw==',
                mimeType: 'image/jpeg',
                spatialContext: {
                    captureMode: 'lidarSceneDepth',
                    centerDistanceMeters: 0.42,
                    platePlaneDistanceMeters: 0.47,
                },
            }),
        };
        const bridge = loadBridge({
            Capacitor: {
                isNativePlatform: () => true,
                Plugins: { FoodDepthCapture: nativePlugin },
            },
        });

        const capabilities = await bridge.getCapabilities();
        const capture = await bridge.capture();

        expect(capabilities).toMatchObject({
            supported: true,
            captureSupported: true,
            lidarAvailable: true,
            sceneDepthAvailable: true,
        });
        expect(capture).toMatchObject({
            cancelled: false,
            imageBase64: 'anBlZw==',
            spatialContext: {
                centerDistanceMeters: 0.42,
                platePlaneDistanceMeters: 0.47,
            },
        });
        expect(nativePlugin.capture).toHaveBeenCalledOnce();
    });
});
