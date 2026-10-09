const SUPPORTED_EXERCISES = new Set([
    "jumping-jack",
    "squat",
    "push-up",
    "lunge",
    "bicep-curl",
    "six-seven"
]);

const MIN_VISIBLE_LANDMARKS = 8;
const MIN_LANDMARK_VISIBILITY = 0.25;
const MIN_NORMALIZED_COORDINATE = -1;
const MAX_NORMALIZED_COORDINATE = 2;
const MAX_REPRESENTATIVE_REPS = 8;
const MAX_TRAIL_POSES_PER_REP = 6;
const MAX_LANDMARKS = 33;

const MOVEMENT_METRICS = {
    "jumping-jack": [
        { key: "armROM", label: "Arm ROM", unit: "%" },
        { key: "legROM", label: "Leg ROM", unit: "%" },
        { key: "symmetry", label: "Symmetry", unit: "%" },
        { key: "quality", label: "Quality", unit: "%" }
    ],
    squat: [
        { key: "kneeAngle", label: "Knee Angle", unit: "°" },
        { key: "depth", label: "Depth", unit: "%" },
        { key: "symmetry", label: "Symmetry", unit: "%" },
        { key: "quality", label: "Quality", unit: "%" }
    ],
    "push-up": [
        { key: "elbowAngle", label: "Elbow Angle", unit: "°" },
        { key: "depth", label: "Depth", unit: "%" },
        { key: "alignment", label: "Alignment", unit: "%" },
        { key: "symmetry", label: "Symmetry", unit: "%" },
        { key: "quality", label: "Quality", unit: "%" }
    ],
    lunge: [
        { key: "kneeAngle", label: "Knee Angle", unit: "°" },
        { key: "depth", label: "Depth", unit: "%" },
        { key: "alignment", label: "Alignment", unit: "%" },
        { key: "stability", label: "Stability", unit: "%" },
        { key: "symmetry", label: "Symmetry", unit: "%" },
        { key: "quality", label: "Quality", unit: "%" }
    ],
    "bicep-curl": [
        { key: "elbowAngle", label: "Elbow Angle", unit: "°" },
        { key: "rom", label: "ROM", unit: "%" },
        { key: "stability", label: "Stability", unit: "%" },
        { key: "speed", label: "Speed", unit: "%/s" },
        { key: "symmetry", label: "Symmetry", unit: "%" },
        { key: "quality", label: "Quality", unit: "%" }
    ],
    "six-seven": [
        { key: "alternation", label: "Alternation", unit: "%" },
        { key: "rhythm", label: "Rhythm", unit: "%" },
        { key: "symmetry", label: "Symmetry", unit: "%" },
        { key: "quality", label: "Quality", unit: "%" }
    ]
};


export function createLandmarkPose(landmarks) {
    if (!Array.isArray(landmarks)) {
        return null;
    }

    const points = landmarks.slice(0, MAX_LANDMARKS).map(landmark => {
        if (
            !landmark ||
            typeof landmark.x !== "number" ||
            !Number.isFinite(landmark.x) ||
            landmark.x < MIN_NORMALIZED_COORDINATE ||
            landmark.x > MAX_NORMALIZED_COORDINATE ||
            typeof landmark.y !== "number" ||
            !Number.isFinite(landmark.y) ||
            landmark.y < MIN_NORMALIZED_COORDINATE ||
            landmark.y > MAX_NORMALIZED_COORDINATE
        ) {
            return null;
        }

        const visibility = landmark.visibility;

        if (
            typeof visibility !== "number" ||
            !Number.isFinite(visibility) ||
            visibility < MIN_LANDMARK_VISIBILITY ||
            visibility > 1
        ) {
            return null;
        }

        return {
            x: landmark.x,
            y: landmark.y,
            visibility
        };
    });

    return countVisiblePoints(points) >= MIN_VISIBLE_LANDMARKS
        ? points
        : null;
}


export function getMovementMetricDefinitions(exerciseId) {
    return MOVEMENT_METRICS[exerciseId] || [];
}


export function summarizeMovementMetrics(
    exerciseId,
    metricRecords
) {
    if (!Array.isArray(metricRecords)) {
        return {};
    }

    const summary = {};

    getMovementMetricDefinitions(exerciseId).forEach(definition => {
        const values = metricRecords
            .map(record => {
                if (!record || typeof record !== "object") {
                    return null;
                }

                const value = record[definition.key];
                return typeof value === "number" &&
                    Number.isFinite(value)
                    ? value
                    : null;
            })
            .filter(value => value !== null);

        if (values.length) {
            summary[definition.key] = Number(
                (
                    values.reduce((total, value) => total + value, 0) /
                    values.length
                ).toFixed(1)
            );
        }
    });

    return summary;
}


export function createMovementVisual(
    exerciseId,
    completedReps,
    repetitions
) {
    if (
        !SUPPORTED_EXERCISES.has(exerciseId) ||
        !Array.isArray(completedReps) ||
        typeof repetitions !== "number" ||
        !Number.isInteger(repetitions) ||
        repetitions < 1
    ) {
        return null;
    }

    const reps = completedReps
        .filter(rep =>
            rep &&
            Number.isInteger(rep.rep) &&
            rep.rep > 0 &&
            rep.rep <= repetitions
        )
        .slice(-MAX_REPRESENTATIVE_REPS)
        .map(rep => {
            const representativePose = sanitizePose(
                rep.representativePose
            );
            const trail = Array.isArray(rep.trail)
                ? rep.trail
                    .map(sanitizePose)
                    .filter(Boolean)
                    .slice(-MAX_TRAIL_POSES_PER_REP)
                : [];

            if (!representativePose || !trail.length) {
                return null;
            }

            return {
                rep: rep.rep,
                trail,
                representativePose
            };
        })
        .filter(Boolean);

    if (!reps.length) {
        return null;
    }

    return {
        version: 1,
        exerciseId,
        repetitions,
        reps
    };
}


export function isValidMovementVisual(
    visual,
    exerciseId,
    repetitions
) {
    if (
        !visual ||
        typeof visual !== "object" ||
        visual.version !== 1 ||
        !SUPPORTED_EXERCISES.has(visual.exerciseId) ||
        (exerciseId && visual.exerciseId !== exerciseId) ||
        !Number.isInteger(visual.repetitions) ||
        visual.repetitions < 1 ||
        (typeof repetitions === "number" &&
            visual.repetitions !== repetitions) ||
        !Array.isArray(visual.reps) ||
        visual.reps.length === 0
    ) {
        return false;
    }

    return visual.reps.every(rep =>
        rep &&
        Number.isInteger(rep.rep) &&
        rep.rep > 0 &&
        rep.rep <= visual.repetitions &&
        isValidPose(rep.representativePose) &&
        Array.isArray(rep.trail) &&
        rep.trail.length > 0 &&
        rep.trail.every(isValidPose)
    );
}


function sanitizePose(points) {
    if (!Array.isArray(points)) {
        return null;
    }

    const sanitized = points.slice(0, MAX_LANDMARKS).map(point => {
        if (
            !point ||
            typeof point.x !== "number" ||
            !Number.isFinite(point.x) ||
            point.x < MIN_NORMALIZED_COORDINATE ||
            point.x > MAX_NORMALIZED_COORDINATE ||
            typeof point.y !== "number" ||
            !Number.isFinite(point.y) ||
            point.y < MIN_NORMALIZED_COORDINATE ||
            point.y > MAX_NORMALIZED_COORDINATE ||
            typeof point.visibility !== "number" ||
            !Number.isFinite(point.visibility) ||
            point.visibility < MIN_LANDMARK_VISIBILITY ||
            point.visibility > 1
        ) {
            return null;
        }

        return {
            x: Number(point.x.toFixed(4)),
            y: Number(point.y.toFixed(4)),
            visibility: Number(point.visibility.toFixed(2))
        };
    });

    return countVisiblePoints(sanitized) >= MIN_VISIBLE_LANDMARKS
        ? sanitized
        : null;
}


function isValidPose(points) {
    return Boolean(sanitizePose(points));
}


function countVisiblePoints(points) {
    return points.filter(Boolean).length;
}