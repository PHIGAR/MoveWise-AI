// Wall-clock timestamps remain unchanged; elapsed workout time excludes pauses.
export function createSessionClock(now = Date.now) {
    let started = null;
    let pausedAt = null;
    let pausedMs = 0;
    return {
        start() { started = now(); pausedAt = null; pausedMs = 0; },
        pause() { if (started !== null && pausedAt === null) pausedAt = now(); },
        resume() { if (pausedAt !== null) { pausedMs += now() - pausedAt; pausedAt = null; } },
        reset() { started = null; pausedAt = null; pausedMs = 0; },
        seconds() { return started === null ? 0 : Math.max(0, Math.floor(((pausedAt ?? now()) - started - pausedMs) / 1000)); }
    };
}
