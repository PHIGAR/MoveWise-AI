export function calculateQuality(
    metrics
) {
    const {
        armROM,
        legROM,
        symmetry
    } = metrics;

    const score = Math.round(
        (
            armROM +
            legROM +
            symmetry
        ) / 3
    );

    return {
        score,
        breakdown: {
            armROM,
            legROM,
            symmetry,
        }
    };
}
