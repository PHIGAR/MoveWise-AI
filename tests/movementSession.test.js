import assert from "node:assert/strict";
import {
    createSession,
    validateSession
} from "../src/core/session.js";
import {
    getSessionById,
    getSessions,
    saveSession,
    SESSION_STORAGE_KEY
} from "../src/core/storage.js";
import {
    createLandmarkPose,
    createMovementVisual,
    isValidMovementVisual
} from "../src/core/movementVisual.js";
import {
    resetWorkout
} from "../src/core/workout.js";


function createMemoryStorage() {
    const values = new Map();
    return {
        getItem(key) {
            return values.get(key) || null;
        },
        setItem(key, value) {
            values.set(key, value);
        }
    };
}


function makePose(offset = 0) {
    return createLandmarkPose(
        Array.from({ length: 33 }, (_, index) => ({
            x: 0.15 + index / 100 + offset,
            y: 0.2 + index / 100,
            visibility: 0.9
        }))
    );
}


const storage = createMemoryStorage();
const movementVisual = createMovementVisual(
    "push-up",
    [{
        rep: 1,
        trail: [makePose(), makePose(0.04)],
        representativePose: makePose(0.04)
    }],
    1
);
const session = createSession({
    id: "visual-session",
    exerciseId: "push-up",
    startedAt: "2026-10-05T01:00:00.000Z",
    completedAt: "2026-10-05T01:02:00.000Z",
    duration: 120,
    repetitions: 1,
    quality: 91,
    accuracy: 100,
    movementMetrics: {
        elbowAngle: 83,
        depth: 76,
        alignment: 94,
        symmetry: 89,
        quality: 91
    },
    movementVisual,
    repRecords: [{ rep: 1, quality: 91 }]
});

assert.equal(validateSession(session), true);
assert.equal(saveSession(session, storage), true);
assert.equal(
    isValidMovementVisual(
        getSessionById("visual-session", storage).movementVisual,
        "push-up",
        1
    ),
    true
);

const retrieved = getSessionById("visual-session", storage);
retrieved.movementVisual.reps[0].representativePose[11].x = 99;
assert.notEqual(
    getSessions(storage)[0].movementVisual.reps[0].representativePose[11].x,
    99
);

const legacySession = {
    id: "legacy-session",
    exerciseId: "squat",
    startedAt: "2026-10-04T01:00:00.000Z",
    completedAt: "2026-10-04T01:01:00.000Z",
    duration: 60,
    repetitions: 3,
    quality: 75,
    accuracy: 80,
    rom: null,
    symmetry: null,
    repRecords: []
};
assert.equal(validateSession(legacySession), true);
assert.equal(saveSession(legacySession, storage), true);
assert.equal(
    isValidMovementVisual(
        getSessionById("legacy-session", storage)?.movementVisual,
        "squat",
        3
    ),
    false
);

const malformed = createSession({
    id: "malformed-visual",
    exerciseId: "squat",
    startedAt: "2026-10-03T01:00:00.000Z",
    completedAt: null,
    duration: 5,
    repetitions: 1,
    quality: 70,
    movementVisual: {
        version: 1,
        exerciseId: "squat",
        repetitions: 1,
        reps: [{ rep: 1, trail: [], representativePose: [{ x: NaN }] }]
    }
});
assert.equal(validateSession(malformed), true);
assert.equal(saveSession(malformed, storage), true);
assert.equal(getSessionById("malformed-visual", storage).repetitions, 1);
assert.equal(getSessionById("malformed-visual", storage).movementVisual, null);
assert.equal(JSON.parse(storage.getItem(SESSION_STORAGE_KEY)).length, 3);

const analyzer = {
    repetitions: 17,
    reset() {
        this.repetitions = 0;
    }
};
const classes = new Set(["rep-updated"]);
const repCounter = {
    textContent: "17",
    classList: {
        remove(name) {
            classes.delete(name);
        }
    }
};
resetWorkout([analyzer], repCounter);
assert.equal(analyzer.repetitions, 0);
assert.equal(repCounter.textContent, "0");
assert.equal(classes.has("rep-updated"), false);
assert.equal(getSessions(storage).length, 3);
assert.throws(
    () => resetWorkout([{}], repCounter),
    /support reset/
);

console.log("Movement session, legacy data, and retry reset tests passed");
