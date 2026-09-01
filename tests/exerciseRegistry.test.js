import assert from "node:assert/strict";
import {
    getExercises,
    getExerciseById,
    getAvailableExercises,
    isExerciseAvailable,
    createExerciseAnalyzer
} from "../src/exercises/exerciseRegistry.js";


const allExercises = getExercises();

assert.equal(
    allExercises.length,
    5
);

assert.equal(
    getExerciseById("jumping-jack").name,
    "Jumping Jack"
);

assert.equal(
    getAvailableExercises().length,
    2
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

assert.throws(
    () => createExerciseAnalyzer("push-up"),
    /not available/
);

console.log("Exercise registry tests passed");
