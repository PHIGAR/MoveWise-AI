import assert from "node:assert/strict";
import test from "node:test";

import {
    getWeeklyProgress
} from "../src/core/progress/weeklyProgress.js";


const referenceDate = new Date(2026, 9, 7, 12);


function session(
    completedAt,
    values = {}
) {
    return {
        id: completedAt,
        exerciseId: "jumping-jack",
        startedAt: completedAt,
        completedAt,
        repetitions: 0,
        quality: null,
        accuracy: null,
        ...values
    };
}


test("weekly progress handles empty input and returns the local week", () => {
    const progress = getWeeklyProgress([], referenceDate);

    assert.equal(progress.workoutCount, 0);
    assert.equal(progress.totalRepetitions, 0);
    assert.equal(progress.activeDays, 0);
    assert.equal(progress.averageQuality, null);
    assert.equal(progress.averageAccuracy, null);
    assert.equal(progress.mostFrequentExercise, null);
    assert.equal(progress.previousWeek, null);
    assert.deepEqual(
        progress.dailyActivity.map(day => day.date),
        [
            "2026-10-05",
            "2026-10-06",
            "2026-10-07",
            "2026-10-08",
            "2026-10-09",
            "2026-10-10",
            "2026-10-11"
        ]
    );
});


test("weekly progress counts completed sessions and averages only available metrics", () => {
    const sessions = [
        session("2026-10-05T10:00:00", {
            repetitions: 12,
            quality: 80,
            accuracy: 90
        }),
        session("2026-10-05T20:00:00", {
            repetitions: 8,
            quality: null
        }),
        session("2026-10-06T12:00:00", {
            exerciseId: "squat",
            repetitions: 5,
            quality: 90,
            accuracy: 95
        }),
        session("2026-09-28T10:00:00", {
            repetitions: 10,
            quality: 70
        }),
        session(null, {
            completedAt: null,
            repetitions: 99,
            quality: 100
        }),
        null,
        { completedAt: "not-a-date", repetitions: 100 }
    ];
    const progress = getWeeklyProgress(sessions, referenceDate);

    assert.equal(progress.workoutCount, 3);
    assert.equal(progress.totalRepetitions, 25);
    assert.equal(progress.activeDays, 2);
    assert.equal(progress.averageQuality, 85);
    assert.equal(progress.averageAccuracy, 93);
    assert.equal(progress.mostFrequentExercise, "jumping-jack");
    assert.deepEqual(progress.dailyActivity[0], {
        date: "2026-10-05",
        workoutCount: 2,
        repetitions: 20
    });
    assert.deepEqual(progress.previousWeek, {
        workoutCount: 1,
        totalRepetitions: 10,
        averageQuality: 70
    });
    assert.equal(sessions[0].repetitions, 12);
});


test("weekly progress supports legacy sessions with optional metrics missing", () => {
    const legacySession = {
        exerciseId: "squat",
        completedAt: "2026-10-07T12:00:00",
        repetitions: 4
    };

    const progress = getWeeklyProgress(
        [legacySession],
        referenceDate
    );

    assert.equal(progress.workoutCount, 1);
    assert.equal(progress.totalRepetitions, 4);
    assert.equal(progress.averageQuality, null);
    assert.equal(progress.averageAccuracy, null);
    assert.equal(progress.dailyActivity[2].workoutCount, 1);
});


test("weekly progress tolerates non-array input and invalid metrics", () => {
    assert.equal(
        getWeeklyProgress(null, referenceDate).workoutCount,
        0
    );

    const progress = getWeeklyProgress(
        [session("2026-10-07T12:00:00", {
            repetitions: Number.NaN,
            quality: 101,
            accuracy: Number.POSITIVE_INFINITY
        })],
        referenceDate
    );

    assert.equal(progress.workoutCount, 1);
    assert.equal(progress.totalRepetitions, 0);
    assert.equal(progress.averageQuality, null);
    assert.equal(progress.averageAccuracy, null);
});
