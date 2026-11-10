// Keep the actual metric tuple at the greatest observed range, rather than
// grading a completed rep from the neutral return frame (whose ROM is zero).
export function createRepEvidence() {
    let peak = -Infinity, metricsAtPeak = null;
    return {
        observe(movement, metrics) {
            if (!movement?.hasRequiredLandmarks) { peak = -Infinity; metricsAtPeak = null; return; }
            const range = movement.depth ?? movement.rom ??
                (Number.isFinite(metrics.armROM) && Number.isFinite(metrics.legROM) ? (metrics.armROM + metrics.legROM) / 2 : null);
            if (Number.isFinite(range) && range > peak) { peak = range; metricsAtPeak = { ...metrics }; }
        },
        metrics(fallback) { return metricsAtPeak ?? fallback; },
        reset() { peak = -Infinity; metricsAtPeak = null; }
    };
}
