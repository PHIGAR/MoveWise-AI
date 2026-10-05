import assert from "node:assert/strict";
import {
    createLandmarkPose,
    createMovementVisual,
    getMovementMetricDefinitions,
    isValidMovementVisual,
    summarizeMovementMetrics
} from "../src/core/movementVisual.js";
import {
    getExerciseEmphasis
} from "../src/ai/visualization/movementVisualizer.js";


const EXERCISES = [
    "jumping-jack",
    "squat",
    "push-up",
    "lunge",
    "bicep-curl"
];


function landmarks(offset = 0) {
    return Array.from({ length: 33 }, (_, index) => ({
        x: 0.2 + index / 100 + offset,
        y: 0.2 + index / 100,
        visibility: 0.95,
        z: 10,
        name: "must-not-be-stored"
    }));
}


const firstPose = createLandmarkPose(landmarks());
const secondPose = createLandmarkPose(landmarks(0.05));
assert.ok(firstPose);
assert.deepEqual(
    Object.keys(firstPose[0]).sort(),
    ["visibility", "x", "y"]
);
assert.equal(createLandmarkPose([]), null);
assert.equal(
    createLandmarkPose(landmarks().map(point => ({
        ...point,
        visibility: 0.1
    }))),
    null
);

for (const exerciseId of EXERCISES) {
    const visual = createMovementVisual(
        exerciseId,
        [{
            rep: 1,
            trail: [firstPose, secondPose],
            representativePose: secondPose
        }],
        1
    );

    assert.equal(isValidMovementVisual(visual, exerciseId, 1), true);
    assert.equal(isValidMovementVisual(visual, "squat", 1), exerciseId === "squat");
    assert.equal(getExerciseEmphasis(exerciseId) !== null, true);
}

const validVisual = createMovementVisual(
    "squat",
    [{ rep: 1, trail: [firstPose], representativePose: secondPose }],
    1
);
const boundedVisual = createMovementVisual(
    "squat",
    Array.from({ length: 10 }, (_, index) => ({
        rep: index + 1,
        trail: Array.from({ length: 8 }, () => firstPose),
        representativePose: secondPose
    })),
    10
);
assert.equal(boundedVisual.reps.length, 8);
assert.equal(boundedVisual.reps[0].rep, 3);
assert.equal(boundedVisual.reps[0].trail.length, 6);
assert.equal(createMovementVisual("squat", [], 1), null);
assert.equal(createMovementVisual("shoulder-raise", [], 1), null);
assert.equal(
    isValidMovementVisual(
        { ...validVisual, exerciseId: "push-up" },
        "squat",
        1
    ),
    false
);
assert.equal(
    isValidMovementVisual(
        {
            ...validVisual,
            reps: [{
                rep: 1,
                trail: [],
                representativePose: [{ x: NaN, y: 0, visibility: 1 }]
            }]
        },
        "squat",
        1
    ),
    false
);
assert.equal(
    isValidMovementVisual(validVisual, "squat", 2),
    false
);

const expectedMetricLabels = {
    "jumping-jack": ["Arm ROM", "Leg ROM", "Symmetry", "Quality"],
    squat: ["Knee Angle", "Depth", "Symmetry", "Quality"],
    "push-up": ["Elbow Angle", "Depth", "Alignment", "Symmetry", "Quality"],
    lunge: ["Knee Angle", "Depth", "Alignment", "Stability", "Symmetry", "Quality"],
    "bicep-curl": ["Elbow Angle", "ROM", "Stability", "Speed", "Symmetry", "Quality"]
};

Object.entries(expectedMetricLabels).forEach(([exerciseId, labels]) => {
    assert.deepEqual(
        getMovementMetricDefinitions(exerciseId).map(metric => metric.label),
        labels
    );
});

assert.deepEqual(
    summarizeMovementMetrics("squat", [
        { kneeAngle: 90, depth: 70, symmetry: 80, quality: 88 },
        { kneeAngle: 80, depth: Infinity, symmetry: 90, quality: "90" },
        { kneeAngle: NaN, quality: 92 }
    ]),
    { kneeAngle: 85, depth: 70, symmetry: 85, quality: 90 }
);
assert.deepEqual(
    summarizeMovementMetrics("lunge", [
        { kneeAngle: 95, depth: 60, alignment: 80, stability: 75, symmetry: 88, quality: 90 }
    ]),
    { kneeAngle: 95, depth: 60, alignment: 80, stability: 75, symmetry: 88, quality: 90 }
);

console.log("Movement visual and metric tests passed");