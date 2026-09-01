import assert from "node:assert/strict";
import {
    SESSION_STORAGE_KEY,
    saveSession,
    clearSessions
} from "../src/core/storage.js";
import {
    getTotalSessions,
    getTotalRepetitions,
    getAverageQuality,
    getAverageAccuracy,
    getBestQuality,
    getAverageDuration,
    getRecentSessions,
    getQualityTrend,
    getProgressSummary
} from "../src/core/progress.js";


function createMemoryStorage() {
    const values = new Map();

    return {
        getItem(key) {
            return values.has(key)
                ? values.get(key)
                : null;
        },
        setItem(key, value) {
            values.set(key, value);
        },
        removeItem(key) {
            values.delete(key);
        }
    };
}


const storage = createMemoryStorage();

assert.equal(getTotalSessions(storage), 0);
assert.equal(getTotalRepetitions(storage), 0);
assert.equal(getAverageQuality(storage), null);
assert.equal(getAverageAccuracy(storage), null);
assert.equal(getBestQuality(storage), null);
assert.equal(getAverageDuration(storage), null);
assert.deepEqual(getRecentSessions(storage), []);
assert.deepEqual(getQualityTrend(storage), []);

const sessions = [
    {
        id: "session-1",
        exerciseId: "jumping-jack",
        startedAt: "2026-08-24T10:00:00.000Z",
        completedAt: "2026-08-24T10:05:00.000Z",
        duration: 300,
        repetitions: 10,
        quality: 80,
        accuracy: 90,
        rom: 82,
        symmetry: 88,
        repRecords: []
    },
    {
        id: "session-2",
        exerciseId: "jumping-jack",
        startedAt: "2026-08-25T10:00:00.000Z",
        completedAt: "2026-08-25T10:04:00.000Z",
        duration: 240,
        repetitions: 8,
        quality: 92,
        accuracy: 94,
        rom: 90,
        symmetry: 95,
        repRecords: []
    },
    {
        id: "session-3",
        exerciseId: "jumping-jack",
        startedAt: "2026-08-26T10:00:00.000Z",
        completedAt: "2026-08-26T10:06:00.000Z",
        duration: 360,
        repetitions: 12,
        quality: null,
        accuracy: null,
        rom: null,
        symmetry: null,
        repRecords: []
    }
];

for (const session of sessions) {
    assert.equal(saveSession(session, storage), true);
}

assert.equal(getTotalSessions(storage), 3);
assert.equal(getTotalRepetitions(storage), 30);
assert.equal(getAverageQuality(storage), 86);
assert.equal(getAverageAccuracy(storage), 92);
assert.equal(getBestQuality(storage), 92);
assert.equal(getAverageDuration(storage), 300);
assert.deepEqual(
    getRecentSessions(storage, 2).map(session => session.id),
    ["session-3", "session-2"]
);
assert.deepEqual(
    getQualityTrend(storage).map(item => item.quality),
    [80, 92]
);
assert.deepEqual(
    getProgressSummary(storage),
    {
        totalSessions: 3,
        totalRepetitions: 30,
        averageQuality: 86,
        averageAccuracy: 92,
        bestQuality: 92,
        averageDuration: 300,
        recentSessions: sessions.slice(1).reverse(),
        qualityTrend: [
            {
                sessionId: "session-1",
                date: "2026-08-24T10:05:00.000Z",
                quality: 80
            },
            {
                sessionId: "session-2",
                date: "2026-08-25T10:04:00.000Z",
                quality: 92
            }
        ]
    }
);

assert.equal(clearSessions(storage), true);
assert.equal(storage.getItem(SESSION_STORAGE_KEY), null);

console.log("Progress tests passed");
