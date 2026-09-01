export function createSession(
    data = {}
) {
    const startedAt =
        data.startedAt || new Date().toISOString();

    const completedAt =
        data.completedAt || null;

    return {
        id: data.id || createSessionId(),
        exerciseId: data.exerciseId || "",
        startedAt,
        completedAt,
        duration: data.duration ?? 0,
        repetitions: data.repetitions ?? 0,
        quality: data.quality ?? null,
        accuracy: data.accuracy ?? null,
        rom: data.rom ?? null,
        symmetry: data.symmetry ?? null,
        repRecords: Array.isArray(data.repRecords)
            ? data.repRecords.map(record => ({ ...record }))
            : []
    };
}


export function validateSession(
    session
) {
    if (!session || typeof session !== "object") {
        return false;
    }

    if (
        typeof session.id !== "string" ||
        session.id.trim() === ""
    ) {
        return false;
    }

    if (
        typeof session.exerciseId !== "string" ||
        session.exerciseId.trim() === ""
    ) {
        return false;
    }

    if (!isValidTimestamp(session.startedAt)) {
        return false;
    }

    if (
        session.completedAt !== null &&
        !isValidTimestamp(session.completedAt)
    ) {
        return false;
    }

    if (!isValidNumber(session.repetitions, 0)) {
        return false;
    }

    if (!isValidNumber(session.duration, 0)) {
        return false;
    }

    for (const metric of [
        "quality",
        "accuracy",
        "rom",
        "symmetry"
    ]) {
        if (
            session[metric] !== null &&
            !isValidNumber(session[metric], 0, 100)
        ) {
            return false;
        }
    }

    return (
        session.repRecords === undefined ||
        Array.isArray(session.repRecords)
    );
}


function isValidTimestamp(
    value
) {
    return (
        typeof value === "string" &&
        Number.isFinite(Date.parse(value))
    );
}


function isValidNumber(
    value,
    minimum,
    maximum = Number.POSITIVE_INFINITY
) {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= minimum &&
        value <= maximum
    );
}


function createSessionId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `session-${Date.now()}`;
}
