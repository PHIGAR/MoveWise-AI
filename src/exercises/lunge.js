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
    standingKneeAngle: 160,
    bottomKneeAngle: 100,
    activeLegDifference: 12,
    alignmentTolerance: 0.25,
    repCooldown: 700
};


const REQUIRED_LANDMARKS = [
    23,
    24,
    25,
    26,
    27,
    28
];


function createInitialState() {
    return {
        state: "STANDING",
        activeLeg: null,
        repetitions: 0,
        attempts: 0,
        validReps: 0,
        lastRepTime: 0,
        currentRepStartTime: null,
        maxDepth: 0,
        deepestKneeAngle: null,
        bestAlignment: 0,
        bestSymmetry: 0,
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


function calculateLegAlignment(hip, knee, ankle, tolerance) {
    if (!hip || !knee || !ankle) {
        return 0;
    }

    const bodyLength = Math.max(
        Math.hypot(hip.x - ankle.x, hip.y - ankle.y),
        0.1
    );
    const lateralOffset = Math.abs(knee.x - ankle.x) / bodyLength;

    return Math.max(
        0,
        Math.min(100, 100 - (lateralOffset / tolerance) * 100)
    );
}


export function createLungeAnalyzer(config = {}) {
    const settings = {
        ...DEFAULT_CONFIG,
        ...config
    };

    let exerciseState = createInitialState();

    function analyze(landmarks) {
        if (!hasRequiredLandmarks(landmarks)) {
            return {
                hasRequiredLandmarks: false,
                leftKneeAngle: 0,
                rightKneeAngle: 0,
                kneeAngle: 0,
                depth: 0,
                alignment: 0,
                symmetry: 0,
                stability: 0,
                movementQuality: 0,
                quality: 0,
                activeLeg: null,
                isStanding: false,
                isDescending: false,
                isBottom: false,
                isAscending: false
            };
        }

        const leftKneeAngle = calculateAngle(
            landmarks[23],
            landmarks[25],
            landmarks[27]
        );
        const rightKneeAngle = calculateAngle(
            landmarks[24],
            landmarks[26],
            landmarks[28]
        );
        const kneeAngle = (
            leftKneeAngle + rightKneeAngle
        ) / 2;
        const leftAlignment = calculateLegAlignment(
            landmarks[23],
            landmarks[25],
            landmarks[27],
            settings.alignmentTolerance
        );
        const rightAlignment = calculateLegAlignment(
            landmarks[24],
            landmarks[26],
            landmarks[28],
            settings.alignmentTolerance
        );
        const alignment = (
            leftAlignment + rightAlignment
        ) / 2;
        const symmetry = calculateSymmetry(
            leftAlignment,
            rightAlignment
        ).score;
        const isStanding =
            leftKneeAngle >= settings.standingKneeAngle &&
            rightKneeAngle >= settings.standingKneeAngle;
        const activeLeg = isStanding
            ? null
            : leftKneeAngle + settings.activeLegDifference < rightKneeAngle
                ? "left"
                : rightKneeAngle + settings.activeLegDifference < leftKneeAngle
                    ? "right"
                    : null;
        const activeKneeAngle = activeLeg === "left"
            ? leftKneeAngle
            : activeLeg === "right"
                ? rightKneeAngle
                : kneeAngle;
        const depth = activeLeg
            ? normalizeROM(
                settings.standingKneeAngle - activeKneeAngle,
                0,
                settings.standingKneeAngle - settings.bottomKneeAngle
            )
            : 0;
        const isBottom = Boolean(
            activeLeg &&
            activeKneeAngle <= settings.bottomKneeAngle
        );
        const isDescending = Boolean(
            activeLeg &&
            !isBottom &&
            !isStanding &&
            activeKneeAngle < settings.standingKneeAngle
        );
        const isAscending = Boolean(
            activeLeg &&
            !isBottom &&
            !isStanding &&
            activeKneeAngle > settings.bottomKneeAngle
        );
        const depthScore = isStanding ? 100 : depth;
        const baseQuality = calculateQuality({
            armROM: depthScore,
            legROM: alignment,
            symmetry
        });
        const consistency = calculateConsistency();
        const quality = Math.round(
            baseQuality.score * 0.85 + consistency * 0.15
        );

        return {
            hasRequiredLandmarks: true,
            leftKneeAngle,
            rightKneeAngle,
            kneeAngle,
            depth,
            alignment,
            symmetry,
            stability: alignment,
            movementQuality: quality,
            quality,
            activeLeg,
            isStanding,
            isDescending,
            isBottom,
            isAscending,
            leftAlignment,
            rightAlignment,
            consistency
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

    function updateRepMetrics(movement) {
        if (!movement?.hasRequiredLandmarks) {
            return;
        }

        if (movement.depth > exerciseState.maxDepth) {
            exerciseState.maxDepth = movement.depth;
            exerciseState.deepestKneeAngle = movement.activeLeg === "left"
                ? movement.leftKneeAngle
                : movement.rightKneeAngle;
        }

        exerciseState.bestAlignment = Math.max(
            exerciseState.bestAlignment,
            movement.alignment
        );
        exerciseState.bestSymmetry = Math.max(
            exerciseState.bestSymmetry,
            movement.symmetry
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
            activeLeg: exerciseState.activeLeg,
            quality: metrics.quality,
            duration: Number(duration.toFixed(2)),
            kneeAngle: Math.round(
                exerciseState.deepestKneeAngle ?? metrics.kneeAngle
            ),
            depth: Math.round(exerciseState.maxDepth),
            alignment: Math.round(exerciseState.bestAlignment),
            symmetry: Math.round(exerciseState.bestSymmetry)
        };

        exerciseState.repRecords.push(record);
        exerciseState.currentRepStartTime = null;
        exerciseState.activeLeg = null;
        exerciseState.maxDepth = 0;
        exerciseState.deepestKneeAngle = null;
        exerciseState.bestAlignment = 0;
        exerciseState.bestSymmetry = 0;
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
            message: "Stand tall to begin your lunge"
        };
        let repCompleted = false;
        let record = null;

        updateRepMetrics(movement);

        if (!movement?.hasRequiredLandmarks) {
            feedback = {
                type: "form",
                severity: "warning",
                message: "Keep both legs visible to the camera"
            };
        }
        else if (exerciseState.state === "STANDING") {
            if (movement.isDescending && movement.activeLeg) {
                exerciseState.state = "DESCENDING";
                exerciseState.activeLeg = movement.activeLeg;
                exerciseState.attempts++;
                exerciseState.currentRepStartTime = timestamp;
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "Control your movement down"
                };
            }
        }
        else if (exerciseState.state === "DESCENDING") {
            if (movement.activeLeg !== exerciseState.activeLeg) {
                feedback = {
                    type: "form",
                    severity: "warning",
                    message: "Keep your movement balanced"
                };
            }
            else if (movement.isBottom) {
                exerciseState.state = "BOTTOM";
                feedback = {
                    type: "depth",
                    severity: "success",
                    message: "Good lunge depth, drive back up"
                };
            }
            else {
                feedback = {
                    type: "depth",
                    severity: "warning",
                    message: "Lower your body more"
                };
            }
        }
        else if (exerciseState.state === "BOTTOM") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "Control your movement up"
            };

            if (
                movement.activeLeg === exerciseState.activeLeg &&
                movement.isAscending
            ) {
                exerciseState.state = "ASCENDING";
            }
        }
        else if (exerciseState.state === "ASCENDING") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "Return to the standing position"
            };

            if (movement.isStanding) {
                record = completeRep(metrics, timestamp);
                repCompleted = record !== null;
                exerciseState.state = "STANDING";
                feedback = {
                    type: "ready",
                    severity: "success",
                    message: "Good lunge, one repetition completed"
                };
            }
        }

        return {
            state: exerciseState.state,
            activeLeg: exerciseState.activeLeg || movement?.activeLeg || null,
            repCompleted,
            repetitions: exerciseState.repetitions,
            attempts: exerciseState.attempts,
            validReps: exerciseState.validReps,
            valid: movement?.isStanding || movement?.isBottom || false,
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
        exerciseState.state = "STANDING";
        exerciseState.activeLeg = null;
        exerciseState.currentRepStartTime = null;
        exerciseState.maxDepth = 0;
        exerciseState.deepestKneeAngle = null;
        exerciseState.bestAlignment = 0;
        exerciseState.bestSymmetry = 0;
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
