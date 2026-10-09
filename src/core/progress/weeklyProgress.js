function completedAt(session) {
    if (
        !session ||
        typeof session !== "object" ||
        typeof session.completedAt !== "string" ||
        !Number.isFinite(Date.parse(session.completedAt))
    ) {
        return null;
    }

    return new Date(session.completedAt);
}


function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getWeekStart(date) {
    const start = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    return start;
}


function isValidMetric(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
    );
}


function average(values) {
    if (!values.length) {
        return null;
    }

    return Math.round(
        values.reduce((total, value) => total + value, 0) /
        values.length
    );
}


function summarizeWeek(sessions, start) {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const dailyActivity = Array.from(
        { length: 7 },
        (_, index) => {
            const date = new Date(start);
            date.setDate(date.getDate() + index);
            return {
                date: localDateKey(date),
                workoutCount: 0,
                repetitions: 0
            };
        }
    );
    const dailyByDate = new Map(
        dailyActivity.map(day => [day.date, day])
    );
    const qualityValues = [];
    const accuracyValues = [];
    const exercises = new Map();
    let workoutCount = 0;
    let totalRepetitions = 0;

    sessions.forEach(session => {
        const date = completedAt(session);
        if (!date || date < start || date >= end) {
            return;
        }

        const day = dailyByDate.get(localDateKey(date));
        if (!day) {
            return;
        }

        const repetitions =
            typeof session.repetitions === "number" &&
            Number.isFinite(session.repetitions) &&
            session.repetitions >= 0
                ? session.repetitions
                : 0;

        workoutCount += 1;
        totalRepetitions += repetitions;
        day.workoutCount += 1;
        day.repetitions += repetitions;

        if (isValidMetric(session.quality)) {
            qualityValues.push(session.quality);
        }
        if (isValidMetric(session.accuracy)) {
            accuracyValues.push(session.accuracy);
        }
        if (
            typeof session.exerciseId === "string" &&
            session.exerciseId.trim()
        ) {
            exercises.set(
                session.exerciseId,
                (exercises.get(session.exerciseId) || 0) + 1
            );
        }
    });

    let mostFrequentExercise = null;
    let highestExerciseCount = 0;
    for (const [exerciseId, count] of exercises) {
        if (count > highestExerciseCount) {
            mostFrequentExercise = exerciseId;
            highestExerciseCount = count;
        }
    }

    return {
        workoutCount,
        totalRepetitions,
        activeDays: dailyActivity.filter(day => day.workoutCount > 0).length,
        averageQuality: average(qualityValues),
        averageAccuracy: average(accuracyValues),
        mostFrequentExercise,
        dailyActivity
    };
}


export function getWeeklyProgress(
    sessions,
    referenceDate = new Date()
) {
    const reference = new Date(referenceDate);
    const validReference = Number.isFinite(reference.getTime())
        ? reference
        : new Date();
    const currentWeekStart = getWeekStart(validReference);
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    const currentWeek = summarizeWeek(safeSessions, currentWeekStart);
    const previousSummary = summarizeWeek(safeSessions, previousWeekStart);

    return {
        ...currentWeek,
        previousWeek: previousSummary.workoutCount
            ? {
                workoutCount: previousSummary.workoutCount,
                totalRepetitions: previousSummary.totalRepetitions,
                averageQuality: previousSummary.averageQuality
            }
            : null
    };
}
