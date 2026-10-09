import assert from "node:assert/strict";
import test from "node:test";

import {
    getPersonalBests
} from "../src/core/progress/personalBest.js";


function session(
    id,
    exerciseId,
    values = {}
) {
    return {
        id,
        exerciseId,
        startedAt: "2026-10-01T10:00:00.000Z",
        completedAt: "2026-10-01T10:05:00.000Z",
        quality: null,
        symmetry: null,
        ...values
    };
}


test("personal bests return no invented metrics for empty input", () => {
    assert.deepEqual(getPersonalBests([]), {});
    assert.deepEqual(getPersonalBests(null), {});
});


test("personal bests use historical maxima per exercise", () => {
    const sessions = [
        session("jj-1", "jumping-jack", {
            repetitions: 25,
            quality: 91,
            symmetry: 96
        }),
        session("jj-2", "jumping-jack", {
            repetitions: 30,
            quality: 88,
            symmetry: 93
        }),
        session("squat-1", "squat", {
            repetitions: 10,
            quality: 95,
            symmetry: null
        }),
        session("push-1", "push-up", {
            quality: 82
        }),
        session("incomplete", "jumping-jack", {
            completedAt: null,
            repetitions: 100,
            quality: 100,
            symmetry: 100
        }),
        null,
        { exerciseId: "squat", completedAt: "invalid" }
    ];
    const snapshot = JSON.stringify(sessions);

    assert.deepEqual(getPersonalBests(sessions), {
        "jumping-jack": {
            bestRepetitions: 30,
            bestQuality: 91,
            bestSymmetry: 96
        },
        squat: {
            bestRepetitions: 10,
            bestQuality: 95
        },
        "push-up": {
            bestQuality: 82
        }
    });
    assert.equal(JSON.stringify(sessions), snapshot);
});


test("personal bests accept legacy sessions and ignore invalid metrics", () => {
    assert.deepEqual(
        getPersonalBests([{
            exerciseId: "lunge",
            completedAt: "2026-10-02T12:00:00.000Z",
            repetitions: 4,
            quality: null,
            symmetry: Number.NaN
        }]),
        {
            lunge: {
                bestRepetitions: 4
            }
        }
    );
});
