import assert from "node:assert/strict";
import test from "node:test";

import {
    getExerciseProgress
} from "../src/core/progress/exerciseProgress.js";


function session(id, exerciseId, completedAt, values = {}) {
    return {
        id,
        exerciseId,
        completedAt,
        repetitions: 0,
        quality: null,
        accuracy: null,
        ...values
    };
}


test("exercise progress returns an empty array without matching sessions", () => {
    assert.deepEqual(getExerciseProgress([], "squat"), []);
    assert.deepEqual(getExerciseProgress(null, "squat"), []);
    assert.deepEqual(
        getExerciseProgress([
            session("pending", "squat", null, { quality: 90 })
        ], "squat"),
        []
    );
});


test("exercise progress selects only completed sessions for the requested exercise", () => {
    const sessions = [
        session("jj", "jumping-jack", "2026-10-01T10:00:00Z", {
            quality: 80,
            accuracy: 90,
            movementMetrics: {
                armROM: 70,
                legROM: 75,
                symmetry: 95,
                depth: 99
            }
        }),
        session("squat", "squat", "2026-10-02T10:00:00Z", {
            quality: 82,
            movementMetrics: {
                depth: 78,
                symmetry: 91
            }
        }),
        session("jj-late", "jumping-jack", "2026-10-03T10:00:00Z", {
            repetitions: 25,
            quality: 91,
            movementMetrics: {
                armROM: 82
            }
        })
    ];

    assert.deepEqual(
        getExerciseProgress(sessions, "jumping-jack"),
        [
            {
                date: "2026-10-01T10:00:00Z",
                repetitions: 0,
                quality: 80,
                accuracy: 90,
                metrics: {
                    armROM: 70,
                    legROM: 75,
                    symmetry: 95
                }
            },
            {
                date: "2026-10-03T10:00:00Z",
                repetitions: 25,
                quality: 91,
                accuracy: null,
                metrics: {
                    armROM: 82,
                    legROM: null,
                    symmetry: null
                }
            }
        ]
    );
});


test("exercise progress is chronological and exposes absent metrics as null", () => {
    const sessions = [
        session("newer", "squat", "2026-10-03T10:00:00Z", {
            quality: 78,
            movementMetrics: { depth: 75 }
        }),
        session("legacy", "squat", "2026-10-01T10:00:00Z", {
            quality: 82,
            repetitions: 10
        }),
        session("middle", "squat", "2026-10-02T10:00:00Z", {
            quality: null,
            movementMetrics: { kneeAngle: 90, symmetry: 88 }
        })
    ];

    const progress = getExerciseProgress(sessions, "squat");
    assert.deepEqual(
        progress.map(item => item.date),
        [
            "2026-10-01T10:00:00Z",
            "2026-10-02T10:00:00Z",
            "2026-10-03T10:00:00Z"
        ]
    );
    assert.deepEqual(progress[0], {
        date: "2026-10-01T10:00:00Z",
        repetitions: 10,
        quality: 82,
        accuracy: null,
        metrics: {
            kneeAngle: null,
            depth: null,
            symmetry: null
        }
    });
    assert.equal(progress[1].quality, null);
    assert.equal(progress[1].metrics.symmetry, 88);
    assert.equal(progress[2].metrics.depth, 75);
});


test("exercise progress supports each supported exercise metric set", () => {
    const metricKeys = {
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

    Object.entries(metricKeys).forEach(([exerciseId, keys]) => {
        const [progress] = getExerciseProgress(
            [session("one", exerciseId, "2026-10-01T10:00:00Z")],
            exerciseId
        );
        assert.deepEqual(Object.keys(progress.metrics), keys);
        assert.ok(Object.values(progress.metrics).every(value => value === null));
    });
});


test("legacy top-level metrics are used only when present and unknown exercises are retained", () => {
    const sessions = [
        session("legacy", "bicep-curl", "2026-10-01T10:00:00Z", {
            rom: 68,
            symmetry: 84
        }),
        session("unknown", "custom-exercise", "2026-10-02T10:00:00Z", {
            quality: 77,
            movementMetrics: { custom: 4 }
        })
    ];

    assert.equal(
        getExerciseProgress(sessions, "bicep-curl")[0].metrics.rom,
        68
    );
    assert.equal(
        getExerciseProgress(sessions, "bicep-curl")[0].metrics.symmetry,
        84
    );
    assert.deepEqual(
        getExerciseProgress(sessions, "custom-exercise"),
        [{
            date: "2026-10-02T10:00:00Z",
            repetitions: 0,
            quality: 77,
            accuracy: null,
            metrics: {}
        }]
    );
});
