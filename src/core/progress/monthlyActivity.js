// Calendar-day buckets preserve local dates across DST and month boundaries.
export function getMonthlyActivity(sessions, reference = new Date()) {
    const now = new Date(reference);
    if (!Number.isFinite(now.getTime())) throw new RangeError('Invalid reference date');
    const days = Array.from({length:28},(_,index)=>{
        const date = new Date(now.getFullYear(),now.getMonth(),now.getDate()-27+index);
        return {date:dateKey(date),workouts:0,repetitions:0};
    });
    const byDate = new Map(days.map(day=>[day.date,day]));
    for (const session of Array.isArray(sessions)?sessions:[]) {
        const completed = new Date(session?.completedAt ?? NaN);
        if (!Number.isFinite(completed.getTime()) || completed>now) continue;
        const bucket = byDate.get(dateKey(completed));
        if (!bucket) continue;
        bucket.workouts++;
        if (Number.isFinite(session.repetitions) && session.repetitions>=0) bucket.repetitions+=session.repetitions;
    }
    return {days,workouts:days.reduce((sum,day)=>sum+day.workouts,0),activeDays:days.filter(day=>day.workouts>0).length};
}
function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
