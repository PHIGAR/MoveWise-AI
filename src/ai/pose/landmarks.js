const DEFAULT_MIN_VISIBILITY = 0.25;


export function validateLandmarks(
    landmarks,
    requiredIndexes,
    minVisibility = DEFAULT_MIN_VISIBILITY
) {
    if (!Array.isArray(landmarks)) {
        return {
            valid: false,
            missing: [...requiredIndexes],
            invalid: []
        };
    }

    const missing = [];
    const invalid = [];

    for (const index of requiredIndexes) {
        const landmark = landmarks[index];

        if (!landmark) {
            missing.push(index);
            continue;
        }

        if (
            typeof landmark.x !== "number" ||
            typeof landmark.y !== "number" ||
            !Number.isFinite(landmark.x) ||
            !Number.isFinite(landmark.y)
        ) {
            invalid.push(index);
            continue;
        }

        if (
            landmark.visibility !== undefined &&
            (
                typeof landmark.visibility !== "number" ||
                !Number.isFinite(landmark.visibility) ||
                landmark.visibility < minVisibility
            )
        ) {
            invalid.push(index);
        }
    }

    return {
        valid: missing.length === 0 && invalid.length === 0,
        missing,
        invalid
    };
}
