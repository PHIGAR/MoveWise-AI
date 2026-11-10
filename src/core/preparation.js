// Progress only on fresh, valid inference results, never on a countdown timer alone.
export function createPreparation({ stableMs = 2000, countdownMs = 5000, maxGapMs = 750 } = {}) {
    let phase = 'idle', stableAt = null, countdownAt = null, lastFrameAt = null;
    function arm() { phase = 'preparing'; stableAt = countdownAt = lastFrameAt = null; }
    return {
        arm,
        cancel() { phase = 'idle'; stableAt = countdownAt = lastFrameAt = null; },
        update(valid, now) {
            if (phase === 'idle' || phase === 'active') return { phase, remaining: 0 };
            if (!valid || (lastFrameAt !== null && now - lastFrameAt > maxGapMs)) {
                phase = 'preparing'; stableAt = countdownAt = null;
            }
            lastFrameAt = now;
            if (valid) {
                stableAt ??= now;
                if (phase === 'preparing' && now - stableAt >= stableMs) {
                    phase = 'countdown'; countdownAt = now;
                }
                if (phase === 'countdown' && now - countdownAt >= countdownMs) phase = 'active';
            }
            return { phase, remaining: phase === 'countdown' ? Math.ceil((countdownMs - (now - countdownAt)) / 1000) : 0 };
        },
        get phase() { return phase; }
    };
}

export function reachedTarget({ duration = 0, repetitions = 0 }, { seconds = 0, reps = 0 }) {
    return (seconds > 0 && duration >= seconds) || (reps > 0 && repetitions >= reps);
}
