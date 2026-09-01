export function calculateAngle(
    a,
    b,
    c
) {
    if (!a || !b || !c) {
        return 0;
    }

    const radians =
        Math.atan2(
            c.y - b.y,
            c.x - b.x
        ) -
        Math.atan2(
            a.y - b.y,
            a.x - b.x
        );

    let angle = Math.abs(
        radians * 180 / Math.PI
    );

    if (angle > 180) {
        angle = 360 - angle;
    }

    return angle;
}


export function calculateRange(
    values
) {
    if (!values || values.length === 0) {
        return 0;
    }

    return Math.max(...values) - Math.min(...values);
}


export function normalizeROM(
    value,
    min,
    max
) {
    const score = (
        (value - min) /
        (max - min)
    ) * 100;

    return Math.max(
        0,
        Math.min(100, score)
    );
}
