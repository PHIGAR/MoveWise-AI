function isCompleted(session) {
    return (
        session &&
        typeof session === "object" &&
        typeof session.completedAt === "string" &&
        Number.isFinite(Date.parse(session.completedAt))
    );
}


function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function dateFromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
}


function isPreviousDay(previous, current) {
    const expected = dateFromKey(previous);
    expected.setDate(expected.getDate() + 1);
    return localDateKey(expected) === current;
}


export function getWorkoutDates(sessions) {
    if (!Array.isArray(sessions)) {
        return [];
    }

    return [...new Set(
        sessions
            .filter(isCompleted)
            .map(session => localDateKey(new Date(session.completedAt)))
    )].sort();
}


export function getCurrentStreak(
    sessions,
    referenceDate = new Date()
) {
    const dates = getWorkoutDates(sessions);
    if (!dates.length) {
        return 0;
    }

    const reference = new Date(referenceDate);
    const today = Number.isFinite(reference.getTime())
        ? localDateKey(reference)
        : localDateKey(new Date());
    const yesterdayDate = dateFromKey(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = localDateKey(yesterdayDate);
    let index = dates.length - 1;
    let streak = 0;

    if (dates[index] !== today && dates[index] !== yesterday) {
        return 0;
    }

    streak += 1;
    while (
        index > 0 &&
        isPreviousDay(dates[index - 1], dates[index])
    ) {
        streak += 1;
        index -= 1;
    }

    return streak;
}


export function getLongestStreak(sessions) {
    const dates = getWorkoutDates(sessions);
    let longest = 0;
    let current = 0;

    dates.forEach((date, index) => {
        current = index > 0 && isPreviousDay(dates[index - 1], date)
            ? current + 1
            : 1;
        longest = Math.max(longest, current);
    });

    return longest;
}
