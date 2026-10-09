export const SIX_SEVEN_REQUIRED_LANDMARKS = Object.freeze([
    11, 12, 13, 14, 15, 16
]);

export const SIX_SEVEN_MIN_LANDMARK_VISIBILITY = 0.25;

const DEFAULT_CONFIG = {
    minLandmarkVisibility: SIX_SEVEN_MIN_LANDMARK_VISIBILITY,
    endpointEntryDifferenceRatio: 0.18,
    endpointHoldDifferenceRatio: 0.12,
    minShoulderWidth: 0.04,
    stableFrames: 2,
    targetTransitionSeconds: 0.8
};


function createInitialState() {
    return {
        state: "READY",
        activeEndpoint: null,
        candidateEndpoint: null,
        candidateFrames: 0,
        repetitions: 0,
        attempts: 0,
        validReps: 0,
        lastRepTime: null,
        rhythm: 0,
        repRecords: [],
        qualityScores: []
    };
}


function distance(first, second) {
    return Math.hypot(
        first.x - second.x,
        first.y - second.y
    );
}


function classifyEndpoint(leftLevel, rightLevel, threshold) {
    const difference = leftLevel - rightLevel;

    if (difference >= threshold) {
        return "LEFT_HIGH";
    }

    if (difference <= -threshold) {
        return "RIGHT_HIGH";
    }

    return null;
}


function calculateSymmetry(leftLevel, rightLevel) {
    const leftMagnitude = Math.abs(leftLevel);
    const rightMagnitude = Math.abs(rightLevel);
    const maximum = Math.max(leftMagnitude, rightMagnitude);

    if (maximum === 0) {
        return 0;
    }

    return Math.round(
        Math.max(
            0,
            100 - (
                Math.abs(leftMagnitude - rightMagnitude) /
                maximum
            ) * 100
        )
    );
}


export function validateSixSevenLandmarks(
    landmarks,
    minVisibility = SIX_SEVEN_MIN_LANDMARK_VISIBILITY
) {
    const missing = [];
    const invalid = [];

    if (!Array.isArray(landmarks)) {
        return {
            valid: false,
            missing: [...SIX_SEVEN_REQUIRED_LANDMARKS],
            invalid
        };
    }

    for (const index of SIX_SEVEN_REQUIRED_LANDMARKS) {
        const landmark = landmarks[index];

        if (!landmark) {
            missing.push(index);
            continue;
        }

        if (
            typeof landmark.x !== "number" ||
            !Number.isFinite(landmark.x) ||
            typeof landmark.y !== "number" ||
            !Number.isFinite(landmark.y)
        ) {
            invalid.push(index);
            continue;
        }

        if (
            typeof landmark.visibility !== "number" ||
            !Number.isFinite(landmark.visibility) ||
            landmark.visibility < minVisibility ||
            landmark.visibility > 1
        ) {
            invalid.push(index);
        }
    }

    return {
        valid: missing.length === 0 && invalid.length === 0,
        missing,
        invalid
    };
}


export function createSixSevenAnalyzer(config = {}) {
    const settings = {
        ...DEFAULT_CONFIG,
        ...config
    };
    let exerciseState = createInitialState();

    function analyze(landmarks) {
        const validation = validateSixSevenLandmarks(
            landmarks,
            settings.minLandmarkVisibility
        );

        if (!validation.valid) {
            return invalidMovement();
        }

        const shoulderWidth = distance(landmarks[11], landmarks[12]);

        if (
            !Number.isFinite(shoulderWidth) ||
            shoulderWidth < settings.minShoulderWidth
        ) {
            return invalidMovement();
        }

        const leftLevel = (
            landmarks[11].y - landmarks[15].y
        ) / shoulderWidth;
        const rightLevel = (
            landmarks[12].y - landmarks[16].y
        ) / shoulderWidth;
        const endpoint = classifyEndpoint(
            leftLevel,
            rightLevel,
            settings.endpointEntryDifferenceRatio
        );

        return {
            hasRequiredLandmarks: true,
            leftLevel,
            rightLevel,
            endpoint,
            symmetry: calculateSymmetry(leftLevel, rightLevel)
        };
    }

    function invalidMovement() {
        return {
            hasRequiredLandmarks: false,
            leftLevel: 0,
            rightLevel: 0,
            endpoint: null,
            symmetry: 0
        };
    }

    function process(
        movement,
        metrics = movement,
        timestamp = performance.now()
    ) {
        let repCompleted = false;
        let record = null;
        let feedback = {
            type: "ready",
            severity: "info",
            message: "ยกมือข้างหนึ่งให้สูง อีกข้างลดต่ำ แล้วสลับระดับ"
        };

        if (
            !movement?.hasRequiredLandmarks ||
            !Number.isFinite(movement.leftLevel) ||
            !Number.isFinite(movement.rightLevel)
        ) {
            resetMovementState();
            feedback = {
                type: "form",
                severity: "warning",
                message: "ขยับกล้องให้เห็นไหล่ ข้อศอก และมือทั้งสองข้างชัดเจน"
            };
        }
        else {
            const endpoint = getEndpointWithHysteresis(movement);

            if (!endpoint) {
                exerciseState.candidateEndpoint = null;
                exerciseState.candidateFrames = 0;
                exerciseState.state = exerciseState.activeEndpoint || "READY";
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "จัดแขนให้ข้อมืออยู่คนละระดับ"
                };
            }
            else if (!exerciseState.activeEndpoint) {
                trackInitialEndpoint(endpoint);
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "ค้างตำแหน่งนี้ แล้วเตรียมสลับมือ"
                };
            }
            else if (endpoint === exerciseState.activeEndpoint) {
                exerciseState.candidateEndpoint = null;
                exerciseState.candidateFrames = 0;
                exerciseState.state = exerciseState.activeEndpoint;
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "สลับไปยังระดับตรงข้าม"
                };
            }
            else {
                trackOppositeEndpoint(endpoint);
                feedback = {
                    type: "movement",
                    severity: "info",
                    message: "ค้างระดับใหม่เพื่อยืนยันการสลับ"
                };

                if (
                    exerciseState.candidateFrames >=
                    settings.stableFrames
                ) {
                    record = completeRep(
                        movement,
                        timestamp
                    );
                    repCompleted = true;
                    feedback = {
                        type: "movement",
                        severity: "success",
                        message: "สลับระดับสำเร็จ"
                    };
                }
            }
        }

        const calculatedMetrics = createMetrics(movement);
        const resultMetrics = {
            ...(metrics && typeof metrics === "object" ? metrics : {}),
            ...calculatedMetrics
        };

        return {
            state: exerciseState.state,
            repCompleted,
            repetitions: exerciseState.repetitions,
            attempts: exerciseState.attempts,
            validReps: exerciseState.validReps,
            score: resultMetrics.quality,
            quality: resultMetrics.quality,
            feedback,
            metrics: resultMetrics,
            record,
            valid: Boolean(
                movement?.hasRequiredLandmarks &&
                getEndpointWithHysteresis(movement)
            )
        };
    }

    function getEndpointWithHysteresis(movement) {
        if (!movement?.hasRequiredLandmarks) {
            return null;
        }

        const endpoint = classifyEndpoint(
            movement.leftLevel,
            movement.rightLevel,
            settings.endpointEntryDifferenceRatio
        );

        if (endpoint) {
            return endpoint;
        }

        const levelDifference =
            movement.leftLevel - movement.rightLevel;

        if (exerciseState.activeEndpoint === "LEFT_HIGH") {
            return levelDifference >=
                settings.endpointHoldDifferenceRatio
                ? "LEFT_HIGH"
                : null;
        }

        if (exerciseState.activeEndpoint === "RIGHT_HIGH") {
            return levelDifference <=
                -settings.endpointHoldDifferenceRatio
                ? "RIGHT_HIGH"
                : null;
        }

        return null;
    }

    function trackInitialEndpoint(endpoint) {
        if (exerciseState.candidateEndpoint !== endpoint) {
            exerciseState.candidateEndpoint = endpoint;
            exerciseState.candidateFrames = 1;
        }
        else {
            exerciseState.candidateFrames++;
        }

        exerciseState.state = `CANDIDATE_${endpoint}`;

        if (
            exerciseState.candidateFrames >=
            settings.stableFrames
        ) {
            exerciseState.activeEndpoint = endpoint;
            exerciseState.candidateEndpoint = null;
            exerciseState.candidateFrames = 0;
            exerciseState.state = endpoint;
        }
    }

    function trackOppositeEndpoint(endpoint) {
        if (exerciseState.candidateEndpoint !== endpoint) {
            exerciseState.candidateEndpoint = endpoint;
            exerciseState.candidateFrames = 1;
            exerciseState.attempts++;
        }
        else {
            exerciseState.candidateFrames++;
        }

        exerciseState.state = `TRANSITION_TO_${endpoint}`;
    }

    function completeRep(movement, timestamp) {
        const interval = exerciseState.lastRepTime === null
            ? null
            : (timestamp - exerciseState.lastRepTime) / 1000;
        const rhythm = interval === null
            ? 100
            : Math.round(
                Math.max(
                    0,
                    100 - Math.abs(
                        interval - settings.targetTransitionSeconds
                    ) * 60
                )
            );
        const symmetry = Math.round(movement.symmetry);
        const quality = Math.round(
            (100 + rhythm + symmetry) / 3
        );

        exerciseState.repetitions++;
        exerciseState.validReps++;
        exerciseState.lastRepTime = timestamp;
        exerciseState.rhythm = rhythm;
        exerciseState.qualityScores.push(quality);

        const record = {
            rep: exerciseState.repetitions,
            endpoint: movement.endpoint,
            alternation: 100,
            rhythm,
            symmetry,
            quality
        };
        exerciseState.repRecords.push(record);
        exerciseState.activeEndpoint = movement.endpoint;
        exerciseState.candidateEndpoint = null;
        exerciseState.candidateFrames = 0;
        exerciseState.state = movement.endpoint;
        return record;
    }

    function createMetrics(movement) {
        const symmetry = movement?.hasRequiredLandmarks
            ? Math.round(movement.symmetry)
            : 0;
        const alternation = exerciseState.attempts
            ? Math.round(
                (exerciseState.validReps / exerciseState.attempts) * 100
            )
            : 0;
        const rhythm = exerciseState.rhythm;
        return {
            alternation,
            rhythm,
            symmetry,
            leftLevel: movement?.hasRequiredLandmarks
                ? movement.leftLevel
                : 0,
            rightLevel: movement?.hasRequiredLandmarks
                ? movement.rightLevel
                : 0,
            quality: Math.round(
                (alternation + rhythm + symmetry) / 3
            )
        };
    }

    function reset() {
        exerciseState = createInitialState();
    }

    function resetMovementState() {
        exerciseState.state = "READY";
        exerciseState.activeEndpoint = null;
        exerciseState.candidateEndpoint = null;
        exerciseState.candidateFrames = 0;
        exerciseState.lastRepTime = null;
        exerciseState.rhythm = 0;
    }

    function getState() {
        return {
            ...exerciseState,
            repRecords: exerciseState.repRecords.map(record => ({
                ...record
            })),
            qualityScores: [...exerciseState.qualityScores]
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
