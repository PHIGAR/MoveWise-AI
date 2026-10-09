import assert from "node:assert/strict";
import {
    getExercises,
    getExerciseById,
    getAvailableExercises,
    getAvailableWorkoutExercises,
    isExerciseAvailable,
    createExerciseAnalyzer
} from "../src/exercises/exerciseRegistry.js";


const allExercises = getExercises();

assert.equal(
    allExercises.length,
    7
);

assert.equal(
    getExerciseById("jumping-jack").name,
    "Jumping Jack"
);

assert.equal(
    getAvailableExercises().length,
    5
);

assert.equal(
    getAvailableWorkoutExercises().length,
    6
);

assert.equal(
    getAvailableExercises()[0].id,
    "jumping-jack"
);

assert.equal(
    isExerciseAvailable("jumping-jack"),
    true
);

assert.equal(
    isExerciseAvailable("squat"),
    true
);

assert.equal(
    isExerciseAvailable("push-up"),
    true
);

assert.equal(
    isExerciseAvailable("lunge"),
    true
);

assert.equal(
    isExerciseAvailable("bicep-curl"),
    true
);

assert.equal(
    getExerciseById("six-seven").name,
    "Six Seven (67) Challenge"
);

assert.equal(
    isExerciseAvailable("six-seven"),
    true
);

assert.equal(
    getAvailableExercises().some(exercise => exercise.id === "six-seven"),
    false
);

const sixSevenAnalyzer =
    createExerciseAnalyzer("six-seven");

const pushUpAnalyzer =
    createExerciseAnalyzer("push-up");

const lungeAnalyzer =
    createExerciseAnalyzer("lunge");

const bicepCurlAnalyzer =
    createExerciseAnalyzer("bicep-curl");

for (const method of [
    "analyze",
    "process",
    "reset",
    "resetMovementState",
    "getState"
]) {
    assert.equal(
        typeof pushUpAnalyzer[method],
        "function"
    );
    assert.equal(
        typeof lungeAnalyzer[method],
        "function"
    );
    assert.equal(
        typeof bicepCurlAnalyzer[method],
        "function"
    );
    assert.equal(
        typeof sixSevenAnalyzer[method],
        "function"
    );
}

const analyzer =
    createExerciseAnalyzer("jumping-jack");

for (const method of [
    "analyze",
    "process",
    "reset",
    "resetMovementState",
    "getState"
]) {
    assert.equal(
        typeof analyzer[method],
        "function"
    );
}

assert.throws(
    () => createExerciseAnalyzer("missing"),
    /Unknown exercise/
);

console.log("Exercise registry tests passed");
