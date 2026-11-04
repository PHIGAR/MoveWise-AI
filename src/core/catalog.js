export function matchesExercise(exercise, query = '', category = 'all') {
    const text = `${exercise.name ?? ''} ${exercise.nameThai ?? ''}`.toLocaleLowerCase();
    return text.includes(query.trim().toLocaleLowerCase()) &&
        (category === 'all' || (category === 'full-body'
            ? ['jumping-jack', 'lunge'].includes(exercise.id)
            : exercise.category === category));
}

export function filterHistory(sessions, { exerciseId = '', days = 0 } = {}, now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Math.max(0, days - 1));
    return sessions.filter(session => {
        const date = Date.parse(session.completedAt);
        return Number.isFinite(date) && (!exerciseId || session.exerciseId === exerciseId) &&
            (!days || date >= start.getTime()) && date <= now.getTime();
    }).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
}
