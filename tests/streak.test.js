import assert from "node:assert/strict";
import test from "node:test";

import {
    getCurrentStreak,
    getLongestStreak,
    getWorkoutDates
} from "../src/core/progress/streak.js";


function session(completedAt, values = {}) {
    return {
        completedAt,
        ...values
    };
}


test("streak helpers handle empty and malformed input", () => {
    assert.deepEqual(getWorkoutDates([]), []);
    assert.equal(getCurrentStreak([], new Date(2026, 9, 7)), 0);
    assert.equal(getLongestStreak([]), 0);
    assert.deepEqual(getWorkoutDates(null), []);
});


test("multiple workouts on the same local day count once", () => {
    const sessions = [
        session("2026-10-07T08:00:00"),
        session("2026-10-07T20:00:00"),
        session(null),
        null,
        session("invalid")
    ];

    assert.deepEqual(getWorkoutDates(sessions), ["2026-10-07"]);
    assert.equal(
        getCurrentStreak(sessions, new Date(2026, 9, 7, 12)),
        1
    );
    assert.equal(getLongestStreak(sessions), 1);
});


test("current and longest streaks count consecutive local dates", () => {
    const sessions = [
        session("2026-10-03T12:00:00"),
        session("2026-10-04T12:00:00"),
        session("2026-10-05T12:00:00"),
        session("2026-10-06T12:00:00"),
        session("2026-10-07T12:00:00")
    ];

    assert.equal(
        getCurrentStreak(sessions, new Date(2026, 9, 7, 18)),
        5
    );
    assert.equal(getLongestStreak(sessions), 5);
});


test("current streak continues through yesterday but expires after a gap", () => {
    const sessions = [
        session("2026-10-04T12:00:00"),
        session("2026-10-05T12:00:00"),
        session("2026-10-06T12:00:00"),
        session("2026-10-07T12:00:00")
    ];

    assert.equal(
        getCurrentStreak(sessions, new Date(2026, 9, 8, 12)),
        4
    );
    assert.equal(
        getCurrentStreak(sessions, new Date(2026, 9, 7, 12)),
        4
    );
    assert.equal(
        getCurrentStreak(sessions, new Date(2026, 9, 10, 12)),
        0
    );
});


test("longest streak is retained across a broken recent streak", () => {
    const sessions = [
        session("2026-09-27T12:00:00"),
        session("2026-09-28T12:00:00"),
        session("2026-09-29T12:00:00"),
        session("2026-10-01T12:00:00"),
        session("2026-10-02T12:00:00")
    ];

    assert.equal(getLongestStreak(sessions), 3);
    assert.equal(
        getCurrentStreak(sessions, new Date(2026, 9, 2, 12)),
        2
    );
    assert.equal(
        getCurrentStreak(sessions, new Date(2026, 9, 5, 12)),
        0
    );
});


test("streak date arithmetic crosses month and year boundaries", () => {
    const sessions = [
        session("2025-12-31T12:00:00"),
        session("2026-01-01T12:00:00"),
        session("2026-01-02T12:00:00")
    ];

    assert.deepEqual(getWorkoutDates(sessions), [
        "2025-12-31",
        "2026-01-01",
        "2026-01-02"
    ]);
    assert.equal(getLongestStreak(sessions), 3);
});
