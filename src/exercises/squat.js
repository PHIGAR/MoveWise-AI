import {
    calculateAngle,
    normalizeROM
} from "../ai/analysis/rom.js";
import { calculateSymmetry } from "../ai/analysis/symmetry.js";
import { calculateQuality } from "../ai/analysis/quality.js";


const DEFAULT_CONFIG = {
    standingKneeAngle: 160,
    bottomKneeAngle: 100,
    repCooldown: 700
};


function createInitialState() {
    return {
        state: "STANDING",
        repetitions: 0,
        attempts: 0,
        validReps: 0,
        lastRepTime: 0,
        currentRepStartTime: null,
        repRecords: [],
        qualityScores: [],
        repStartTimes: []
    };
}


export function createSquatAnalyzer(
    config = {}
) {
    const settings = {
        ...DEFAULT_CONFIG,
        ...config
    };

    let exerciseState = createInitialState();

    function analyze(landmarks) {
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
        const symmetry = calculateSymmetry(
            leftKneeAngle,
            rightKneeAngle
        );
        const depth = normalizeROM(
            settings.standingKneeAngle - kneeAngle,
            0,
            settings.standingKneeAngle - settings.bottomKneeAngle
        );
        const quality = calculateQuality({
            armROM: depth,
            legROM: depth,
            symmetry: symmetry.score
        });

        return {
            leftKneeAngle,
            rightKneeAngle,
            kneeAngle,
            symmetry: symmetry.score,
            depth,
            quality: quality.score,
            isStanding: kneeAngle >= settings.standingKneeAngle,
            isBottom: kneeAngle <= settings.bottomKneeAngle
        };
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
                timestamp -
                exerciseState.currentRepStartTime
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
            kneeAngle: Math.round(metrics.kneeAngle),
            symmetry: Math.round(metrics.symmetry),
            depth: Math.round(metrics.depth)
        };

        exerciseState.repRecords.push(record);
        exerciseState.currentRepStartTime = null;
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
            message: "ยืนตัวตรงเพื่อเริ่มสควอต"
        };
        let repCompleted = false;
        let record = null;

        if (exerciseState.state === "STANDING") {
            if (!movement.isStanding) {
                exerciseState.state = "DESCENDING";
                exerciseState.attempts++;
                exerciseState.currentRepStartTime = timestamp;
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "กำลังย่อตัวลง"
                };
            }
        }
        else if (exerciseState.state === "DESCENDING") {
            feedback = {
                type: "depth",
                severity: "warning",
                message: "ย่อตัวลงอีกเล็กน้อย"
            };

            if (movement.isBottom) {
                exerciseState.state = "BOTTOM";
                feedback = {
                    type: "depth",
                    severity: "success",
                    message: "ถึงระดับล่างแล้ว ดันตัวกลับขึ้น"
                };
            }
        }
        else if (exerciseState.state === "BOTTOM") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "ดันตัวกลับขึ้นอย่างควบคุม"
            };

            if (!movement.isBottom) {
                exerciseState.state = "ASCENDING";
            }
        }
        else if (exerciseState.state === "ASCENDING") {
            feedback = {
                type: "movement",
                severity: "info",
                message: "กลับสู่ท่ายืน"
            };

            if (movement.isStanding) {
                record = completeRep(metrics, timestamp);
                repCompleted = record !== null;
                exerciseState.state = "STANDING";
                feedback = {
                    type: "ready",
                    severity: "success",
                    message: "ทำสำเร็จ 1 ครั้ง พร้อมทำครั้งต่อไป"
                };
            }
        }

        return {
            state: exerciseState.state,
            repCompleted,
            repetitions: exerciseState.repetitions,
            valid: movement.isStanding || movement.isBottom,
            score: metrics.quality,
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
        exerciseState.currentRepStartTime = null;
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
