import {
    getSessions
} from "./storage.js";


function readProgressSessions(
    storage
) {
    return getSessions(storage);
}


function average(values) {
    if (!values.length) {
        return null;
    }

    return Math.round(
        values.reduce(
            (sum, value) => sum + value,
            0
        ) / values.length
    );
}


export function getTotalSessions(
    storage
) {
    return readProgressSessions(storage).length;
}


export function getTotalRepetitions(
    storage
) {
    return readProgressSessions(storage)
        .reduce(
            (total, session) =>
                total + session.repetitions,
            0
        );
}


export function getAverageQuality(
    storage
) {
    return average(
        readProgressSessions(storage)
            .map(session => session.quality)
            .filter(value => typeof value === "number")
    );
}


export function getAverageAccuracy(
    storage
) {
    return average(
        readProgressSessions(storage)
            .map(session => session.accuracy)
            .filter(value => typeof value === "number")
    );
}


export function getBestQuality(
    storage
) {
    const qualities =
        readProgressSessions(storage)
            .map(session => session.quality)
            .filter(value => typeof value === "number");

    return qualities.length
        ? Math.max(...qualities)
        : null;
}


export function getAverageDuration(
    storage
) {
    return average(
        readProgressSessions(storage)
            .map(session => session.duration)
            .filter(value => typeof value === "number")
    );
}


export function getRecentSessions(
    storage,
    limit = 5
) {
    return readProgressSessions(storage)
        .sort(
            (left, right) =>
                Date.parse(right.completedAt || right.startedAt) -
                Date.parse(left.completedAt || left.startedAt)
        )
        .slice(0, limit);
}


export function getQualityTrend(
    storage
) {
    return readProgressSessions(storage)
        .filter(session => typeof session.quality === "number")
        .sort(
            (left, right) =>
                Date.parse(left.completedAt || left.startedAt) -
                Date.parse(right.completedAt || right.startedAt)
        )
        .map(session => ({
            sessionId: session.id,
            date: session.completedAt || session.startedAt,
            quality: session.quality
        }));
}


export function getProgressSummary(
    storage
) {
    return {
        totalSessions: getTotalSessions(storage),
        totalRepetitions: getTotalRepetitions(storage),
        averageQuality: getAverageQuality(storage),
        averageAccuracy: getAverageAccuracy(storage),
        bestQuality: getBestQuality(storage),
        averageDuration: getAverageDuration(storage),
        recentSessions: getRecentSessions(storage),
        qualityTrend: getQualityTrend(storage)
    };
}
