import { createWorkerDetector } from './workerBridge.js';

let visionModule;
let initialization;

const DEFAULT_WASM_PATH =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

const DEFAULT_MODEL_PATH =
    "./public/models/pose_landmarker_lite.task";


let poseLandmarker = null;
let detectorStatus = "idle";
let detectorError = null;
let configuredPoseCount = 1;
let poseCountTransition = Promise.resolve();
let activeDelegate = 'CPU';
let workerFallbackReason = null;


export async function initializePoseDetector(
    options = {}
) {
    if (poseLandmarker?.closed) { poseLandmarker = null; detectorStatus = 'idle'; }
    if (poseLandmarker) return poseLandmarker;
    if (initialization) return initialization;
    initialization = loadDetector(options).finally(() => { initialization = null; });
    return initialization;
}

async function loadDetector(options) {
    detectorStatus = "loading";
    detectorError = null;

    try {
        if (!options.visionModule && !options.forceMainThread && typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function') {
            try {
                poseLandmarker = await createWorkerDetector({
                    wasmPath: options.wasmPath || DEFAULT_WASM_PATH,
                    modelPath: new URL(options.modelPath || DEFAULT_MODEL_PATH, location.href).href,
                    delegate: options.delegate === 'GPU' ? 'GPU' : 'CPU', numPoses: configuredPoseCount
                });
                activeDelegate = poseLandmarker.delegate;
                detectorStatus = 'ready';
                return poseLandmarker;
            } catch (error) {
                workerFallbackReason = error.message;
                // Older browsers may expose OffscreenCanvas without the required WebGL support.
                // Keep the existing MediaPipe path functional on those devices.
            }
        }
        visionModule ??= options.visionModule ?? await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/+esm");
        const { FilesetResolver, PoseLandmarker } = visionModule;
        const vision =
            await FilesetResolver.forVisionTasks(
                options.wasmPath || DEFAULT_WASM_PATH
            );

        const detectorOptions = {
                    baseOptions: {
                        modelAssetPath:
                            options.modelPath || DEFAULT_MODEL_PATH,
                        delegate: options.delegate === 'GPU' ? 'GPU' : 'CPU'
                    },
                    runningMode: "VIDEO",
                    numPoses: configuredPoseCount,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                };
        try {
            poseLandmarker = await PoseLandmarker.createFromOptions(vision, detectorOptions);
        } catch (error) {
            if (detectorOptions.baseOptions.delegate !== 'GPU') throw error;
            detectorOptions.baseOptions.delegate = 'CPU';
            poseLandmarker = await PoseLandmarker.createFromOptions(vision, detectorOptions);
        }
        activeDelegate = detectorOptions.baseOptions.delegate;

        detectorStatus = "ready";
        return poseLandmarker;
    }
    catch (error) {
        detectorStatus = "error";
        detectorError = error;
        throw error;
    }
}


export function setPoseCount(count) {
    if (poseLandmarker?.closed) { poseLandmarker = null; detectorStatus = 'idle'; }
    if (!Number.isSafeInteger(count) || count < 1) {
        throw new RangeError("Pose count must be a positive integer");
    }
    if (!poseLandmarker) {
        if (detectorStatus === "error") {
            throw new Error("Pose detector initialization failed");
        }
        configuredPoseCount = count;
        return Promise.resolve();
    }

    const update = async () => {
        if (count === configuredPoseCount) {
            return;
        }

        await poseLandmarker.setOptions({ numPoses: count });
        configuredPoseCount = count;
    };
    poseCountTransition = poseCountTransition.then(update, update);
    return poseCountTransition;
}


export function detectPose(
    video,
    timestamp
) {
    if (!poseLandmarker) {
        return null;
    }

    const detector = poseLandmarker;
    const result = detector.detectForVideo(
        video,
        timestamp
    );
    if (!detector.worker) return result;
    return result.catch(async () => {
        detector.close();
        if (poseLandmarker === detector) {
            poseLandmarker = null;
            initialization = loadDetector({ forceMainThread: true }).finally(() => { initialization = null; });
        }
        const fallback = await (initialization || initializePoseDetector({ forceMainThread: true }));
        return fallback.detectForVideo(video, timestamp);
    });
}


export function getPoseDetectorStatus() {
    return {
        ready: detectorStatus === "ready" && !poseLandmarker?.closed,
        status: poseLandmarker?.closed ? 'error' : detectorStatus,
        error: detectorError,
        delegate: activeDelegate,
        execution: poseLandmarker?.worker ? 'worker' : 'main-thread',
        workerFallbackReason
    };
}
