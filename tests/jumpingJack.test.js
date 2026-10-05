import assert from "node:assert/strict";
import { createJumpingJackAnalyzer } from "../src/exercises/jumpingJack.js";


function landmarksForPose(open) {
    const landmarks = Array.from(
        { length: 33 },
        () => ({ x: 0.5, y: 0.5, visibility: 0.9 })
    );

    landmarks[11] = { x: 0.4, y: 0.2, visibility: 0.9 };
    landmarks[12] = { x: 0.6, y: 0.2, visibility: 0.9 };
    landmarks[15] = {
        x: 0.4,
        y: open ? 0.1 : 0.5,
        visibility: 0.9
    };
    landmarks[16] = {
        x: 0.6,
        y: open ? 0.1 : 0.5,
        visibility: 0.9
    };
    landmarks[27] = {
        x: open ? 0.3 : 0.45,
        y: 0.9,
        visibility: 0.9
    };
    landmarks[28] = {
        x: open ? 0.7 : 0.55,
        y: 0.9,
        visibility: 0.9
    };

    return landmarks;
}


const analyzer = createJumpingJackAnalyzer();
const closed = analyzer.analyze(landmarksForPose(false));
const open = analyzer.analyze(landmarksForPose(true));
const metrics = {
    armROM: 90,
    legROM: 90,
    symmetry: 100,
    quality: 93
};

assert.equal(closed.hasRequiredLandmarks, true);
assert.equal(analyzer.process(closed, metrics, 0).state, "CLOSED");
assert.equal(analyzer.process(open, metrics, 100).state, "OPENING");
assert.equal(analyzer.process(open, metrics, 200).state, "OPEN");
assert.equal(analyzer.process(closed, metrics, 300).state, "CLOSING");

const completed = analyzer.process(closed, metrics, 1000);
assert.equal(completed.repCompleted, true);
assert.equal(completed.repetitions, 1);
assert.equal(analyzer.getState().repetitions, 1);

console.log("Jumping Jack repetition test passed");
