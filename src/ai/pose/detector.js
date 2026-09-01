import {
    PoseLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";


const DEFAULT_WASM_PATH =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const DEFAULT_MODEL_PATH =
    "./public/models/pose_landmarker_lite.task";


let poseLandmarker = null;
let detectorStatus = "idle";
let detectorError = null;


export async function initializePoseDetector(
    options = {}
) {
    detectorStatus = "loading";
    detectorError = null;

    try {
        const vision =
            await FilesetResolver.forVisionTasks(
                options.wasmPath || DEFAULT_WASM_PATH
            );

        poseLandmarker =
            await PoseLandmarker.createFromOptions(
                vision,
                {
                    baseOptions: {
                        modelAssetPath:
                            options.modelPath || DEFAULT_MODEL_PATH
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                }
            );

        detectorStatus = "ready";
        return poseLandmarker;
    }
    catch (error) {
        detectorStatus = "error";
        detectorError = error;
        throw error;
    }
}


export function detectPose(
    video,
    timestamp
) {
    if (!poseLandmarker) {
        return null;
    }

    return poseLandmarker.detectForVideo(
        video,
        timestamp
    );
}


export function getPoseDetectorStatus() {
    return {
        ready: detectorStatus === "ready",
        status: detectorStatus,
        error: detectorError
    };
}
