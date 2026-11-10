// Only summarize supported, stored measurements. Tracking loss is not a technique issue.
const rules = [
    { key: 'depth', below: 75, exercises: ['squat', 'push-up', 'lunge'], label: 'ช่วงการเคลื่อนไหวยังไม่เต็ม' },
    { key: 'symmetry', below: 80, label: 'การเคลื่อนไหวซ้าย–ขวาต่างกัน' },
    { key: 'alignment', below: 75, exercises: ['push-up', 'lunge'], label: 'แนวลำตัวเปลี่ยนระหว่างการเคลื่อนไหว' },
    { key: 'stability', below: 75, exercises: ['bicep-curl', 'lunge'], label: 'ตำแหน่งข้อต่อยังไม่นิ่ง' }
];
export function summarizeIssues(exerciseId, sessions) {
    const completed = sessions.filter(item => item.exerciseId === exerciseId && item.completedAt && item.repetitions > 0 && item.repRecords?.length > 0 && item.repRecords.every(record => record.measurementVersion === 2));
    return rules.filter(rule => !rule.exercises || rule.exercises.includes(exerciseId)).flatMap(rule => {
        const measured = completed.filter(item => Number.isFinite(item.movementMetrics?.[rule.key]));
        const affected = measured.filter(item => item.movementMetrics[rule.key] < rule.below);
        if (!affected.length) return [];
        return [{ key: rule.key, label: rule.label, sessions: affected.length, measuredSessions: measured.length,
            recurring: affected.length >= 2, sessionIds: affected.map(item => item.id) }];
    });
}
