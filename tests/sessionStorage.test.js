import assert from "node:assert/strict";
import {
    createSession,
    validateSession
} from "../src/core/session.js";
import {
    SESSION_STORAGE_KEY,
    saveSession,
    getSessions,
    getSessionById,
    deleteSession,
    clearSessions
} from "../src/core/storage.js";


function createMemoryStorage(
    initialValue = null
) {
    const values = new Map();

    if (initialValue !== null) {
        values.set(
            SESSION_STORAGE_KEY,
            initialValue
        );
    }

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


const session = createSession({
    id: "session-1",
    exerciseId: "jumping-jack",
    startedAt: "2026-08-24T10:00:00.000Z",
    completedAt: "2026-08-24T10:05:00.000Z",
    duration: 300,
    repetitions: 10,
    quality: 88,
    accuracy: 90,
    rom: 86,
    symmetry: 92,
    repRecords: [{ rep: 1, quality: 88 }]
});

assert.equal(
    session.id,
    "session-1"
);
assert.equal(
    validateSession(session),
    true
);
assert.equal(
    validateSession({ ...session, exerciseId: "" }),
    false
);
assert.equal(
    validateSession({ ...session, startedAt: "invalid" }),
    false
);
assert.equal(
    validateSession({ ...session, repetitions: "10" }),
    false
);
assert.equal(
    validateSession({ ...session, duration: -1 }),
    false
);
assert.equal(
    validateSession({ ...session, quality: 101 }),
    false
);

const storage = createMemoryStorage();

assert.equal(
    saveSession(session, storage),
    true
);
assert.deepEqual(
    getSessions(storage),
    [session]
);
assert.deepEqual(
    getSessionById("session-1", storage),
    session
);
assert.equal(
    getSessionById("missing", storage),
    null
);
assert.equal(
    saveSession({ ...session, quality: 91 }, storage),
    true
);
assert.equal(
    getSessions(storage)[0].quality,
    91
);
assert.equal(
    saveSession({ ...session, id: "" }, storage),
    false
);
assert.equal(
    deleteSession("session-1", storage),
    true
);
assert.deepEqual(
    getSessions(storage),
    []
);
assert.equal(
    deleteSession("missing", storage),
    false
);

assert.equal(
    saveSession(session, storage),
    true
);
assert.equal(
    clearSessions(storage),
    true
);
assert.deepEqual(
    getSessions(storage),
    []
);

const invalidStorage = createMemoryStorage(
    "{invalid json"
);
assert.deepEqual(
    getSessions(invalidStorage),
    []
);

const unavailableStorage = {
    getItem() {
        throw new Error("unavailable");
    },
    setItem() {
        throw new Error("unavailable");
    },
    removeItem() {
        throw new Error("unavailable");
    }
};
assert.deepEqual(
    getSessions(unavailableStorage),
    []
);
assert.equal(
    saveSession(session, unavailableStorage),
    false
);
assert.equal(
    clearSessions(unavailableStorage),
    false
);

console.log("Session and storage tests passed");
