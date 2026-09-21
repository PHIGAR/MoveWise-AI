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
    extendedElbowAngle: 160,
    contractedElbowAngle: 55,
    armDifference: 15,
    repCooldown: 700
};


const REQUIRED_LANDMARKS = [
    11,
    12,
    13,
    14,
    15,
    16
];


function createInitialState() {
    return {
        state: "EXTENDED",
        activeArm: null,
        repetitions: 0,
        attempts: 0,
        validReps: 0,
        lastRepTime: 0,
        currentRepStartTime: null,
        maxROM: 0,
        bestSymmetry: 0,
        bestStability: 0,
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


function getAnglesForArm(movement, arm) {
    if (arm === "left") {
        return [movement.leftElbowAngle];
    }

    if (arm === "right") {
        return [movement.rightElbowAngle];
    }

    return [
        movement.leftElbowAngle,
        movement.rightElbowAngle
    ];
}


function allAnglesMatch(movement, arm, predicate) {
    return getAnglesForArm(movement, arm).every(predicate);
}


export function createBicepCurlAnalyzer(config = {}) {
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
                rom: 0,
                activeArm: null,
                symmetry: 0,
                stability: 0,
                movementQuality: 0,
                quality: 0,
                speed: 0,
                isExtended: false,
                isCurling: false,
                isContracted: false,
                isExtending: false
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
        const activeArm = selectActiveArm(
            leftElbowAngle,
            rightElbowAngle
        );
        const activeAngles = activeArm === "left"
            ? [leftElbowAngle]
            : activeArm === "right"
                ? [rightElbowAngle]
                : activeArm === "both"
                    ? [leftElbowAngle, rightElbowAngle]
                    : [];
        const movementAngle = activeAngles.length
            ? activeAngles.reduce((sum, value) => sum + value, 0) /
                activeAngles.length
            : elbowAngle;
        const rom = activeArm
            ? normalizeROM(
                settings.extendedElbowAngle - movementAngle,
                0,
                settings.extendedElbowAngle - settings.contractedElbowAngle
            )
            : 0;
        const symmetry = activeArm === "both"
            ? calculateSymmetry(
                leftElbowAngle,
                rightElbowAngle
            ).score
            : 100;
        const stability = calculateStability(
            activeAngles.length
                ? activeAngles
                : [leftElbowAngle, rightElbowAngle]
        );
        const isExtended = activeArm
            ? allAnglesMatch(
                { leftElbowAngle, rightElbowAngle },
                activeArm,
                angle => angle >= settings.extendedElbowAngle
            )
            : leftElbowAngle >= settings.extendedElbowAngle &&
                rightElbowAngle >= settings.extendedElbowAngle;
        const isContracted = activeArm
            ? allAnglesMatch(
                { leftElbowAngle, rightElbowAngle },
                activeArm,
                angle => angle <= settings.contractedElbowAngle
            )
            : false;
        const isCurling = Boolean(
            activeArm &&
            !isExtended &&
            !isContracted &&
            activeAngles.some(
                angle => angle < settings.extendedElbowAngle
            )
        );
        const isExtending = Boolean(
            activeArm &&
            !isExtended &&
            !isContracted &&
            activeAngles.some(
                angle => angle > settings.contractedElbowAngle
            )
        );
        const romScore = isExtended ? 100 : rom;
        const baseQuality = calculateQuality({
            armROM: romScore,
            legROM: stability,
            symmetry
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
            rom,
            activeArm,
            symmetry,
            stability,
            movementQuality: quality,
            quality,
            consistency,
            speed: 0,
            isExtended,
            isCurling,
            isContracted,
            isExtending
        };
    }

    function selectActiveArm(leftElbowAngle, rightElbowAngle) {
        const leftIsMoving =
            leftElbowAngle < settings.extendedElbowAngle;
        const rightIsMoving =
            rightElbowAngle < settings.extendedElbowAngle;

        if (!leftIsMoving && !rightIsMoving) {
            return null;
        }

        if (
            leftIsMoving &&
            rightIsMoving &&
            Math.abs(leftElbowAngle - rightElbowAngle) <= settings.armDifference
        ) {
            return "both";
        }

        return leftElbowAngle < rightElbowAngle
            ? "left"
            : "right";
    }

    function calculateStability(angles) {
        if (!angles.length) {
            return 0;
        }

        const scores = angles.map(angle => {
            const distanceFromRange = Math.max(
                settings.contractedElbowAngle - angle,
                angle - settings.extendedElbowAngle,
                0
            );

            return Math.max(
                0,
                100 - distanceFromRange * 2
            );
        });

        return scores.reduce((sum, value) => sum + value, 0) /
            scores.length;
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

        exerciseState.maxROM = Math.max(
            exerciseState.maxROM,
            movement.rom
        );
        exerciseState.bestSymmetry = Math.max(
            exerciseState.bestSymmetry,
            movement.symmetry
        );
        exerciseState.bestStability = Math.max(
            exerciseState.bestStability,
            movement.stability
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

        const speed = duration > 0
            ? exerciseState.maxROM / duration
            : 0;
        const record = {
            rep: exerciseState.repetitions,
            activeArm: exerciseState.activeArm,
            quality: metrics.quality,
            duration: Number(duration.toFixed(2)),
            speed: Number(speed.toFixed(2)),
            rom: Math.round(exerciseState.maxROM),
            symmetry: Math.round(exerciseState.bestSymmetry),
            stability: Math.round(exerciseState.bestStability)
        };

        exerciseState.repRecords.push(record);
        exerciseState.currentRepStartTime = null;
        exerciseState.activeArm = null;
        exerciseState.maxROM = 0;
        exerciseState.bestSymmetry = 0;
        exerciseState.bestStability = 0;
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
            message: "Extend your arms to begin"
        };
        let repCompleted = false;
        let record = null;

        updateRepMetrics(movement);

        if (!movement?.hasRequiredLandmarks) {
            feedback = {
                type: "form",
                severity: "warning",
                message: "Keep both arms visible to the camera"
            };
        }
        else if (exerciseState.state === "EXTENDED") {
            if (movement.isCurling && movement.activeArm) {
                exerciseState.state = "CURLING";
                exerciseState.activeArm = movement.activeArm;
                exerciseState.attempts++;
                exerciseState.currentRepStartTime = timestamp;
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "Control the movement"
                };
            }
        }
        else if (exerciseState.state === "CURLING") {
            if (movement.activeArm !== exerciseState.activeArm) {
                feedback = {
                    type: "form",
                    severity: "warning",
                    message: "Keep your movement controlled"
                };
            }
            else if (isArmContracted(movement, exerciseState.activeArm)) {
                exerciseState.state = "CONTRACTED";
                feedback = {
                    type: "depth",
                    severity: "success",
                    message: "Good curl, squeeze at the top"
                };
            }
            else {
                feedback = {
                    type: "depth",
                    severity: "warning",
                    message: "Curl your arm through the full range"
                };
            }
        }
        else if (exerciseState.state === "CONTRACTED") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "Control the movement down"
            };

            if (isArmExtending(movement, exerciseState.activeArm)) {
                exerciseState.state = "EXTENDING";
            }
        }
        else if (exerciseState.state === "EXTENDING") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "Extend your arm fully"
            };

            if (isArmExtended(movement, exerciseState.activeArm)) {
                record = completeRep(metrics, timestamp);
                repCompleted = record !== null;
                exerciseState.state = "EXTENDED";
                feedback = {
                    type: "ready",
                    severity: "success",
                    message: "Good curl, one repetition completed"
                };
            }
        }

        return {
            state: exerciseState.state,
            activeArm: exerciseState.activeArm || movement?.activeArm || null,
            repCompleted,
            repetitions: exerciseState.repetitions,
            attempts: exerciseState.attempts,
            validReps: exerciseState.validReps,
            valid: movement?.isExtended || movement?.isContracted || false,
            score: metrics?.quality ?? 0,
            quality: metrics?.quality ?? 0,
            feedback,
            metrics,
            record
        };
    }

    function isArmContracted(movement, arm) {
        return allAnglesMatch(
            movement,
            arm,
            angle => angle <= settings.contractedElbowAngle
        );
    }

    function isArmExtending(movement, arm) {
        return allAnglesMatch(
            movement,
            arm,
            angle => angle > settings.contractedElbowAngle &&
                angle < settings.extendedElbowAngle
        );
    }

    function isArmExtended(movement, arm) {
        return allAnglesMatch(
            movement,
            arm,
            angle => angle >= settings.extendedElbowAngle
        );
    }

    function reset() {
        exerciseState = createInitialState();
    }

    function resetMovementState() {
        exerciseState.state = "EXTENDED";
        exerciseState.activeArm = null;
        exerciseState.currentRepStartTime = null;
        exerciseState.maxROM = 0;
        exerciseState.bestSymmetry = 0;
        exerciseState.bestStability = 0;
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
