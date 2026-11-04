/** Skip duplicate DOM mutations and pace main-thread pose inference. */
export function setText(element, value) {
    if (!element) return;
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
}
export function createFrameGate(interval = 50) {
    let previous = -Infinity;
    return {
        shouldRun(now) {
            if (now - previous < interval) return false;
            previous = now;
            return true;
        },
        reset() { previous = -Infinity; }
    };
}
