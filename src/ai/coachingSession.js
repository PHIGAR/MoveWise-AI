import { getMovementMetricDefinitions } from '../core/movementVisual.js';

// The live dashboard has legacy aliases. Coaching must use exercise-specific measurements.
export function createCoachingSession({ exerciseId, repetitions, quality, accuracy, movementMetrics, consistency }) {
    const metrics = {};
    for (const { key } of getMovementMetricDefinitions(exerciseId)) {
        const value = movementMetrics?.[key];
        if (typeof value === 'number' && Number.isFinite(value)) metrics[key] = value;
    }
    return {
        exerciseId, repetitions, quality, accuracy,
        ...metrics,
        ...(Number.isFinite(consistency) ? { consistency } : {}),
        movementMetrics: metrics
    };
}
