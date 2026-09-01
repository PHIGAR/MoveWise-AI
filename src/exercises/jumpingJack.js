const DEFAULT_CONFIG = {
    handUpOffset: 0.03,
    footOpenRatio: 1.35,
    footClosedRatio: 1.10,
    repCooldown: 700
};


function createInitialState() {
    return {
        state: "CLOSED",
        repetitions: 0,
        attempts: 0,
        validReps: 0,
        lastRepTime: 0,
        currentRepStartTime: null,
        qualityScores: [],
        repRecords: [],
        repStartTimes: [],
        repMovementMetrics: []
    };
}


export function createJumpingJackAnalyzer(
    config = {}
) {
    const settings = {
        ...DEFAULT_CONFIG,
        ...config
    };

    let exerciseState = createInitialState();

    function analyze(landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        const shoulderWidth = Math.abs(
            leftShoulder.x - rightShoulder.x
        );

        const footWidth = Math.abs(
            leftAnkle.x - rightAnkle.x
        );

        const leftHandUp =
            leftWrist.y <
            leftShoulder.y - settings.handUpOffset;

        const rightHandUp =
            rightWrist.y <
            rightShoulder.y - settings.handUpOffset;

        const handsUp = leftHandUp && rightHandUp;

        const handsDown =
            leftWrist.y > leftShoulder.y &&
            rightWrist.y > rightShoulder.y;

        const feetOpen =
            footWidth >
            shoulderWidth * settings.footOpenRatio;

        const feetClosed =
            footWidth <
            shoulderWidth * settings.footClosedRatio;

        return {
            leftHandUp,
            rightHandUp,
            handsUp,
            handsDown,
            feetOpen,
            feetClosed,
            isOpen: handsUp && feetOpen,
            isClosed: handsDown && feetClosed,
            shoulderWidth,
            footWidth
        };
    }

    function calculateMovementScore(data) {
        let score = 0;

        if (data.handsUp) {
            score += 50;
        }
        else if (data.leftHandUp || data.rightHandUp) {
            score += 25;
        }

        if (data.feetOpen) {
            score += 50;
        }

        return score;
    }

    function calculateRepQuality(metrics) {
        const quality = Math.round(
            (
                metrics.armROM +
                metrics.legROM +
                metrics.symmetry
            ) / 3
        );

        exerciseState.repMovementMetrics.push({
            rep: exerciseState.repetitions + 1,
            armROM: metrics.armROM,
            legROM: metrics.legROM,
            symmetry: metrics.symmetry,
            quality
        });

        return quality;
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

        const quality = calculateRepQuality(metrics);

        exerciseState.repetitions++;
        exerciseState.validReps++;

        const record = {
            rep: exerciseState.repetitions,
            quality,
            duration: Number(duration.toFixed(2)),
            armROM: metrics.armROM,
            legROM: metrics.legROM,
            symmetry: metrics.symmetry
        };

        exerciseState.repRecords.push(record);
        exerciseState.qualityScores.push(quality);
        exerciseState.repStartTimes.push(duration);
        exerciseState.currentRepStartTime = null;

        return record;
    }

    function process(data, metrics, timestamp = performance.now()) {
        let score = 0;
        let feedback = {
            title: "",
            message: ""
        };
        let repCompleted = false;
        let record = null;

        if (exerciseState.state === "CLOSED") {
            score = 100;
            feedback = {
                title: "พร้อมเริ่ม",
                message: "กระโดดกางแขนและขา"
            };

            if (data.handsUp || data.feetOpen) {
                exerciseState.state = "OPENING";
                exerciseState.attempts++;
                exerciseState.currentRepStartTime = timestamp;
                feedback = {
                    title: "กำลังกาง",
                    message: "กางแขนและขาให้เต็มที่"
                };
            }
        }
        else if (exerciseState.state === "OPENING") {
            score = Math.max(
                calculateMovementScore(data),
                metrics.quality
            );
            feedback = {
                title: "กำลังกาง",
                message: `ROM แขน ${metrics.armROM}% · ROM ขา ${metrics.legROM}%`
            };

            if (data.isOpen) {
                exerciseState.state = "OPEN";
                score = metrics.quality;
                feedback = {
                    title: "✓ ท่าถูกต้อง",
                    message: `Symmetry ${metrics.symmetry}% · หุบกลับ`
                };
            }
        }
        else if (exerciseState.state === "OPEN") {
            score = metrics.quality;
            feedback = {
                title: "✓ ท่าถูกต้อง",
                message: "หุบแขนและขากลับ"
            };

            if (data.handsDown || data.feetClosed) {
                exerciseState.state = "CLOSING";
                feedback = {
                    title: "กำลังหุบ",
                    message: "กลับสู่ท่าเริ่มต้น"
                };
            }
        }
        else if (exerciseState.state === "CLOSING") {
            if (data.isClosed) {
                record = completeRep(metrics, timestamp);
                repCompleted = record !== null;
                exerciseState.state = "CLOSED";
                score = metrics.quality;
                feedback = {
                    title: "✓ ทำสำเร็จ 1 ครั้ง",
                    message: "ยอดเยี่ยม! พร้อมทำครั้งต่อไป"
                };
            }
            else {
                feedback = {
                    title: "กำลังหุบ",
                    message: "นำมือและเท้ากลับสู่ตำแหน่งเริ่มต้น"
                };
            }
        }

        return {
            state: exerciseState.state,
            isValid: data.isOpen || data.isClosed,
            repCompleted,
            repetitions: exerciseState.repetitions,
            attempts: exerciseState.attempts,
            validReps: exerciseState.validReps,
            score,
            quality: metrics.quality,
            feedback,
            metrics,
            record
        };
    }

    function reset() {
        exerciseState = createInitialState();
    }

    function resetMovementState() {
        exerciseState.state = "CLOSED";
        exerciseState.currentRepStartTime = null;
    }

    function getState() {
        return {
            ...exerciseState,
            qualityScores: [...exerciseState.qualityScores],
            repRecords: [...exerciseState.repRecords],
            repStartTimes: [...exerciseState.repStartTimes],
            repMovementMetrics: [...exerciseState.repMovementMetrics]
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
