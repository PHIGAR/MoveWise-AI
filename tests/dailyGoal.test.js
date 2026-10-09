import assert from "node:assert/strict";
import test from "node:test";

import {
    DAILY_GOAL_STORAGE_KEY,
    DEFAULT_DAILY_GOAL,
    MAX_DAILY_GOAL,
    getDailyGoal,
    getDailyGoalProgress,
    isDailyGoalComplete,
    setDailyGoal
} from "../src/core/progress/dailyGoal.js";


function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        }
    };
}


const referenceDate = new Date(2026, 9, 7, 12);


function session(completedAt, repetitions) {
    return { completedAt, repetitions };
}


test("daily goal defaults to 20 and persists a custom goal under its own key", () => {
    const storage = createStorage();

    assert.equal(getDailyGoal(storage), DEFAULT_DAILY_GOAL);
    assert.equal(setDailyGoal(35, storage), true);
    assert.equal(getDailyGoal(storage), 35);
    assert.equal(storage.getItem(DAILY_GOAL_STORAGE_KEY), "35");
});


test("daily goal rejects values outside the allowed positive integer range", () => {
    const storage = createStorage();

    for (const invalid of [0, -1, 1.5, "20", NaN, Infinity, MAX_DAILY_GOAL + 1]) {
        assert.equal(setDailyGoal(invalid, storage), false);
    }
    assert.equal(getDailyGoal(storage), DEFAULT_DAILY_GOAL);
});


test("missing and malformed local storage values safely use the default", () => {
    assert.equal(getDailyGoal(), DEFAULT_DAILY_GOAL);
    assert.equal(
        getDailyGoal(createStorage({
            [DAILY_GOAL_STORAGE_KEY]: "{broken"
        })),
        DEFAULT_DAILY_GOAL
    );
    assert.equal(
        getDailyGoal(createStorage({
            [DAILY_GOAL_STORAGE_KEY]: JSON.stringify("25")
        })),
        DEFAULT_DAILY_GOAL
    );
    assert.equal(
        getDailyGoal(createStorage({
            [DAILY_GOAL_STORAGE_KEY]: JSON.stringify(MAX_DAILY_GOAL + 1)
        })),
        DEFAULT_DAILY_GOAL
    );
});


test("daily goal progress counts only completed sessions from the local day", () => {
    const progress = getDailyGoalProgress(
        [
            session("2026-10-07T08:00:00", 6),
            session("2026-10-07T19:00:00", 4),
            session("2026-10-06T23:59:00", 100),
            session(null, 100),
            null,
            { completedAt: "not-a-date", repetitions: 100 }
        ],
        20,
        referenceDate
    );

    assert.deepEqual(progress, {
        goal: 20,
        repetitions: 10,
        remaining: 10,
        percentage: 50,
        isComplete: false
    });
});


test("multiple workouts on the same day are summed and progress caps at 100 percent", () => {
    const progress = getDailyGoalProgress(
        [
            session("2026-10-07T08:00:00", 12),
            session("2026-10-07T18:00:00", 10)
        ],
        20,
        referenceDate
    );

    assert.equal(progress.repetitions, 22);
    assert.equal(progress.remaining, 0);
    assert.equal(progress.percentage, 100);
    assert.equal(progress.isComplete, true);
    assert.equal(
        isDailyGoalComplete(
            [
                session("2026-10-07T08:00:00", 12),
                session("2026-10-07T18:00:00", 10)
            ],
            20,
            referenceDate
        ),
        true
    );
    assert.equal(
        isDailyGoalComplete(
            [session("2026-10-07T08:00:00", 20)],
            20,
            referenceDate
        ),
        true
    );
});


test("empty sessions and invalid repetition values produce zero progress", () => {
    assert.equal(
        getDailyGoalProgress([], 20, referenceDate).repetitions,
        0
    );
    assert.equal(
        getDailyGoalProgress(
            [session("2026-10-07T08:00:00", -4)],
            20,
            referenceDate
        ).repetitions,
        0
    );
    assert.equal(
        isDailyGoalComplete([], 20, referenceDate),
        false
    );
});
