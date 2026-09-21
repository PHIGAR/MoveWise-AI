import {
    calculateAngle,
    normalizeROM
} from "../ai/analysis/rom.js";
import { calculateSymmetry } from "../ai/analysis/symmetry.js";
import { calculateQuality } from "../ai/analysis/quality.js";
import {
    validateLandmarks
} from "../ai/pose/landmarks.js";


const DEFAULT_CONFIG = {
    standingElbowAngle: 155,
    bottomElbowAngle: 90,
    alignmentTolerance: 25,
    repCooldown: 700
};


const REQUIRED_LANDMARKS = [
    11,
    12,
    13,
    14,
    15,
    16,
    23,
    24,
    27,
    28
];


function createInitialState() {
    return {
        state: "UP",
        repetitions: 0,
        attempts: 0,
        validReps: 0,
        lastRepTime: 0,
        currentRepStartTime: null,
        maxDepth: 0,
        repRecords: [],
        qualityScores: [],
        repStartTimes: []
    };
}


function hasRequiredLandmarks(landmarks) {
    return validateLandmarks(
        landmarks,
        REQUIRED_LANDMARKS
    ).valid;
}


function calculateAlignment(leftAngle, rightAngle, tolerance) {
    if (!leftAngle || !rightAngle) {
        return 0;
    }

    const average = (leftAngle + rightAngle) / 2;
    const deviation = Math.abs(180 - average);

    return Math.max(
        0,
        Math.min(100, 100 - (deviation / tolerance) * 100)
    );
}


export function createPushUpAnalyzer(config = {}) {
    const settings = {
        ...DEFAULT_CONFIG,
        ...config
    };

    let exerciseState = createInitialState();

    function analyze(landmarks) {
        if (!hasRequiredLandmarks(landmarks)) {
            return {
                hasRequiredLandmarks: false,
                leftElbowAngle: 0,
                rightElbowAngle: 0,
                elbowAngle: 0,
                leftAlignment: 0,
                rightAlignment: 0,
                alignment: 0,
                depth: 0,
                elbowSymmetry: 0,
                quality: 0,
                isUp: false,
                isDescending: false,
                isBottom: false,
                isAscending: false
            };
        }

        const leftElbowAngle = calculateAngle(
            landmarks[11],
            landmarks[13],
            landmarks[15]
        );
        const rightElbowAngle = calculateAngle(
            landmarks[12],
            landmarks[14],
            landmarks[16]
        );
        const elbowAngle = (
            leftElbowAngle + rightElbowAngle
        ) / 2;

        const leftAlignment = calculateAngle(
            landmarks[11],
            landmarks[23],
            landmarks[27]
        );
        const rightAlignment = calculateAngle(
            landmarks[12],
            landmarks[24],
            landmarks[28]
        );
        const alignment = calculateAlignment(
            leftAlignment,
            rightAlignment,
            settings.alignmentTolerance
        );
        const depth = normalizeROM(
            settings.standingElbowAngle - elbowAngle,
            0,
            settings.standingElbowAngle - settings.bottomElbowAngle
        );
        const elbowSymmetry = calculateSymmetry(
            leftElbowAngle,
            rightElbowAngle
        ).score;
        const isUp =
            leftElbowAngle >= settings.standingElbowAngle &&
            rightElbowAngle >= settings.standingElbowAngle;
        const isDescending =
            elbowAngle < settings.standingElbowAngle &&
            elbowAngle > settings.bottomElbowAngle;
        const isBottom =
            leftElbowAngle <= settings.bottomElbowAngle &&
            rightElbowAngle <= settings.bottomElbowAngle;
        const isAscending =
            elbowAngle > settings.bottomElbowAngle &&
            elbowAngle < settings.standingElbowAngle;
        const depthScore = isUp ? 100 : depth;
        const baseQuality = calculateQuality({
            armROM: depthScore,
            legROM: alignment,
            symmetry: elbowSymmetry
        });
        const consistency = calculateConsistency();
        const quality = Math.round(
            baseQuality.score * 0.85 + consistency * 0.15
        );

        return {
            hasRequiredLandmarks: true,
            leftElbowAngle,
            rightElbowAngle,
            elbowAngle,
            leftAlignment,
            rightAlignment,
            alignment,
            depth,
            depthScore,
            elbowSymmetry,
            consistency,
            quality,
            isUp,
            isDescending,
            isBottom,
            isAscending
        };
    }

    function calculateConsistency() {
        if (exerciseState.repStartTimes.length < 2) {
            return 100;
        }

        const average = exerciseState.repStartTimes.reduce(
            (sum, value) => sum + value,
            0
        ) / exerciseState.repStartTimes.length;
        const deviation = exerciseState.repStartTimes.reduce(
            (sum, value) => sum + Math.abs(value - average),
            0
        ) / exerciseState.repStartTimes.length;

        return Math.max(
            0,
            Math.min(
                100,
                Math.round(100 - (deviation / Math.max(average, 0.1)) * 100)
            )
        );
    }

    function completeRep(metrics, timestamp) {
        if (
            timestamp - exerciseState.lastRepTime <
            settings.repCooldown
        ) {
            return null;
        }

        exerciseState.lastRepTime = timestamp;
        let duration = 0;

        if (exerciseState.currentRepStartTime !== null) {
            duration = (
                timestamp - exerciseState.currentRepStartTime
            ) / 1000;
        }

        exerciseState.repetitions++;
        exerciseState.validReps++;
        exerciseState.qualityScores.push(metrics.quality);
        exerciseState.repStartTimes.push(duration);

        const record = {
            rep: exerciseState.repetitions,
            quality: metrics.quality,
            duration: Number(duration.toFixed(2)),
            depth: Math.round(exerciseState.maxDepth),
            alignment: Math.round(metrics.alignment),
            elbowSymmetry: Math.round(metrics.elbowSymmetry)
        };

        exerciseState.repRecords.push(record);
        exerciseState.currentRepStartTime = null;
        exerciseState.maxDepth = 0;
        return record;
    }

    function process(
        movement,
        metrics = movement,
        timestamp = performance.now()
    ) {
        let feedback = {
            type: "ready",
            severity: "info",
            message: "Start in the up position"
        };
        let repCompleted = false;
        let record = null;

        if (
            movement?.hasRequiredLandmarks &&
            typeof movement.depth === "number"
        ) {
            exerciseState.maxDepth = Math.max(
                exerciseState.maxDepth,
                movement.depth
            );
        }

        if (!movement?.hasRequiredLandmarks) {
            feedback = {
                type: "form",
                severity: "warning",
                message: "Keep your body visible to the camera"
            };
        }
        else if (exerciseState.state === "UP") {
            if (movement.isDescending) {
                exerciseState.state = "DOWN";
                exerciseState.attempts++;
                exerciseState.currentRepStartTime = timestamp;
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "Control your movement down"
                };
            }
        }
        else if (exerciseState.state === "DOWN") {
            feedback = {
                type: "depth",
                severity: "warning",
                message: "Lower your body more"
            };

            if (movement.isBottom) {
                exerciseState.state = "BOTTOM";
                feedback = {
                    type: "depth",
                    severity: "success",
                    message: "Good depth, push back up"
                };
            }
        }
        else if (exerciseState.state === "BOTTOM") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "Control your movement up"
            };

            if (movement.isAscending || movement.isUp) {
                exerciseState.state = "ASCENDING";
            }
        }
        else if (exerciseState.state === "ASCENDING") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "Return to the up position"
            };

            if (movement.isUp) {
                record = completeRep(metrics, timestamp);
                repCompleted = record !== null;
                exerciseState.state = "UP";
                feedback = {
                    type: "ready",
                    severity: "success",
                    message: "Good form, one push-up completed"
                };
            }
        }

        return {
            state: exerciseState.state,
            repCompleted,
            repetitions: exerciseState.repetitions,
            attempts: exerciseState.attempts,
            validReps: exerciseState.validReps,
            valid: movement?.isUp || movement?.isBottom || false,
            score: metrics?.quality ?? 0,
            quality: metrics?.quality ?? 0,
            feedback,
            metrics,
            record
        };
    }

    function reset() {
        exerciseState = createInitialState();
    }

    function resetMovementState() {
        exerciseState.state = "UP";
        exerciseState.currentRepStartTime = null;
        exerciseState.maxDepth = 0;
    }

    function getState() {
        return {
            ...exerciseState,
            repRecords: [...exerciseState.repRecords],
            qualityScores: [...exerciseState.qualityScores],
            repStartTimes: [...exerciseState.repStartTimes]
        };
    }

    return {
        analyze,
        process,
        reset,
        resetMovementState,
        getState
    };
}
