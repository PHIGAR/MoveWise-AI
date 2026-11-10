// A bounded, local diagnostic window. Timings describe this pipeline, not pose accuracy.
export function createPosePerformance({ interval = 50, adaptive = true } = {}) {
    let lastAt = -Infinity, lastVideoTime = -1, average = 0, frames = [], started = 0;
    let startupMs = null, errors = 0, repLatencyMs = null;
    let observer = null, longTasks = null, maxLongTaskMs = null;
    let workerInference = false;
    // Main-thread inference reserves time for controls/rendering. A serial worker
    // already keeps inference off the UI thread, so do not halve its useful FPS.
    const pacingInterval = () => adaptive ? Math.max(interval, Math.min(125, average / (workerInference ? .95 : .55))) : interval;
    function observeLongTasks() {
        observer?.disconnect(); observer = null; longTasks = maxLongTaskMs = null;
        if (!globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) return;
        try {
            observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) { longTasks++; maxLongTaskMs = Math.max(maxLongTaskMs, entry.duration); }
            });
            observer.observe({ type: 'longtask' }); longTasks = maxLongTaskMs = 0;
        } catch { observer?.disconnect(); observer = null; }
    }
    return {
        setFPS(fps) { if (![15, 20, 30].includes(fps)) throw new RangeError('Supported inference caps: 15, 20, 30 FPS'); interval = 1000 / fps; },
        reset(now = performance.now()) { lastAt = -Infinity; lastVideoTime = -1; average = 0; workerInference = false; frames = []; started = now; startupMs = null; errors = 0; repLatencyMs = null; observeLongTasks(); },
        stop() { observer?.disconnect(); observer = null; },
        shouldRun(now, videoTime) {
            if (!Number.isFinite(videoTime) || videoTime === lastVideoTime) return false;
            const pace = pacingInterval();
            if (now - lastAt < pace) return false;
            lastAt = now; lastVideoTime = videoTime;
            return true;
        },
        record(start, inferenceEnd, end, rep = false, measuredInferenceMs = null) {
            const inference = Number.isFinite(measuredInferenceMs) ? measuredInferenceMs : inferenceEnd - start;
            workerInference = Number.isFinite(measuredInferenceMs);
            average = average ? average * 0.9 + inference * 0.1 : inference;
            startupMs ??= end - started;
            frames.push({ at: start, inference, pipeline: end - start });
            if (frames.length > 300) frames.shift();
            if (rep) repLatencyMs = end - start;
        },
        error() { errors++; },
        snapshot() {
            const mean = key => frames.length ? frames.reduce((sum, item) => sum + item[key], 0) / frames.length : null;
            const span = frames.length > 1 ? frames.at(-1).at - frames[0].at : 0;
            return { frames: frames.length, fps: span > 0 ? (frames.length - 1) * 1000 / span : null,
                inferenceMs: mean('inference'), pipelineMs: mean('pipeline'), startupMs, repLatencyMs, errors, longTasks, maxLongTaskMs,
                heapMB: Number.isFinite(globalThis.performance?.memory?.usedJSHeapSize) ? performance.memory.usedJSHeapSize / 1048576 : null,
                intervalMs: pacingInterval() };
        }
    };
}
