export function calculateSymmetry(
    leftValue,
    rightValue
) {
    const max = Math.max(
        Math.abs(leftValue),
        Math.abs(rightValue),
        1
    );

    const difference = Math.abs(
        leftValue - rightValue
    );

    const score = Math.max(
        0,
        Math.min(
            100,
            100 - (
                difference / max
            ) * 100
        )
    );

    return {
        score,
        leftValue,
        rightValue,
        difference
    };
}
