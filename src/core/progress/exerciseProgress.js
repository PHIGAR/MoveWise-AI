const EXERCISE_METRICS = {
    "jumping-jack": ["armROM", "legROM", "symmetry"],
    squat: ["kneeAngle", "depth", "symmetry"],
    "push-up": ["elbowAngle", "depth", "alignment", "symmetry"],
    lunge: [
        "kneeAngle",
        "depth",
        "alignment",
        "stability",
        "symmetry"
    ],
    "bicep-curl": [
        "elbowAngle",
        "rom",
        "stability",
        "speed",
        "symmetry"
    ]
};


function isCompleted(session) {
    return (
        session &&
        typeof session === "object" &&
        typeof session.completedAt === "string" &&
        Number.isFinite(Date.parse(session.completedAt))
    );
}


function finiteMetric(value) {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : null;
}


export function getExerciseProgress(sessions, exerciseId) {
    if (!Array.isArray(sessions) || typeof exerciseId !== "string") {
        return [];
    }

    const metricKeys = EXERCISE_METRICS[exerciseId] || [];

    return sessions
        .filter(session =>
            isCompleted(session) &&
            session.exerciseId === exerciseId
        )
        .map(session => {
            const movementMetrics =
                session.movementMetrics &&
                typeof session.movementMetrics === "object" &&
                !Array.isArray(session.movementMetrics)
                    ? session.movementMetrics
                    : {};
            const metrics = {};

            metricKeys.forEach(key => {
                metrics[key] =
                    finiteMetric(movementMetrics[key]) ??
                    finiteMetric(session[key]);
            });

            return {
                date: session.completedAt,
                repetitions: finiteMetric(session.repetitions),
                quality: finiteMetric(session.quality),
                accuracy: finiteMetric(session.accuracy),
                metrics
            };
        })
        .sort((left, right) =>
            Date.parse(left.date) - Date.parse(right.date)
        );
}
