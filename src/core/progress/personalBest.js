function isCompleted(session) {
    return (
        session &&
        typeof session === "object" &&
        typeof session.completedAt === "string" &&
        Number.isFinite(Date.parse(session.completedAt))
    );
}


function isValidMetric(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
    );
}


export function getPersonalBests(sessions) {
    const bests = new Map();

    if (!Array.isArray(sessions)) {
        return {};
    }

    sessions.forEach(session => {
        if (
            !isCompleted(session) ||
            typeof session.exerciseId !== "string" ||
            !session.exerciseId.trim()
        ) {
            return;
        }

        let best = bests.get(session.exerciseId);
        if (!best) {
            best = {};
            bests.set(session.exerciseId, best);
        }

        if (
            typeof session.repetitions === "number" &&
            Number.isFinite(session.repetitions) &&
            session.repetitions >= 0
        ) {
            best.bestRepetitions = Math.max(
                best.bestRepetitions ?? session.repetitions,
                session.repetitions
            );
        }
        if (isValidMetric(session.quality)) {
            best.bestQuality = Math.max(
                best.bestQuality ?? session.quality,
                session.quality
            );
        }
        if (isValidMetric(session.symmetry)) {
            best.bestSymmetry = Math.max(
                best.bestSymmetry ?? session.symmetry,
                session.symmetry
            );
        }
    });

    return Object.fromEntries(bests);
}
