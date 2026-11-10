export function createMetricAverage() {
    let count = 0, sum = 0;
    return {
        add(value) { if (Number.isFinite(value)) { count++; sum += value; } },
        value() { return count ? Math.round(sum / count) : null; },
        get count() { return count; }
    };
}
