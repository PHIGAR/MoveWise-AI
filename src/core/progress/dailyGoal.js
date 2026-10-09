export const DAILY_GOAL_STORAGE_KEY =
    "movewise_daily_goal";

export const DEFAULT_DAILY_GOAL = 20;
export const MAX_DAILY_GOAL = 1000;


function isValidGoal(goal) {
    return (
        Number.isInteger(goal) &&
        goal > 0 &&
        goal <= MAX_DAILY_GOAL
    );
}


function getStorageArea(storage) {
    if (storage) {
        return storage;
    }

    try {
        return globalThis.localStorage || null;
    }
    catch (error) {
        return null;
    }
}


function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


export function getDailyGoal(storage) {
    const storageArea = getStorageArea(storage);

    if (!storageArea) {
        return DEFAULT_DAILY_GOAL;
    }

    try {
        const stored = storageArea.getItem(DAILY_GOAL_STORAGE_KEY);
        if (stored === null) {
            return DEFAULT_DAILY_GOAL;
        }

        const goal = JSON.parse(stored);
        return isValidGoal(goal) ? goal : DEFAULT_DAILY_GOAL;
    }
    catch (error) {
        return DEFAULT_DAILY_GOAL;
    }
}


export function setDailyGoal(goal, storage) {
    if (!isValidGoal(goal)) {
        return false;
    }

    const storageArea = getStorageArea(storage);
    if (!storageArea) {
        return false;
    }

    try {
        storageArea.setItem(
            DAILY_GOAL_STORAGE_KEY,
            JSON.stringify(goal)
        );
        return true;
    }
    catch (error) {
        return false;
    }
}


export function getDailyGoalProgress(
    sessions,
    goal = getDailyGoal(),
    referenceDate = new Date()
) {
    const target = isValidGoal(goal)
        ? goal
        : DEFAULT_DAILY_GOAL;
    const reference = new Date(referenceDate);
    const today = Number.isFinite(reference.getTime())
        ? localDateKey(reference)
        : localDateKey(new Date());
    const repetitions = Array.isArray(sessions)
        ? sessions.reduce((total, session) => {
            if (
                !session ||
                typeof session !== "object" ||
                typeof session.completedAt !== "string" ||
                !Number.isFinite(Date.parse(session.completedAt)) ||
                localDateKey(new Date(session.completedAt)) !== today
            ) {
                return total;
            }

            const count = session.repetitions;
            return typeof count === "number" &&
                Number.isFinite(count) &&
                count >= 0
                ? total + count
                : total;
        }, 0)
        : 0;

    return {
        goal: target,
        repetitions,
        remaining: Math.max(0, target - repetitions),
        percentage: Math.min(
            100,
            Math.round((repetitions / target) * 100)
        ),
        isComplete: repetitions >= target
    };
}


export function isDailyGoalComplete(
    sessions,
    goal = getDailyGoal(),
    referenceDate = new Date()
) {
    return getDailyGoalProgress(
        sessions,
        goal,
        referenceDate
    ).isComplete;
}
