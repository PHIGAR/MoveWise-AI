import assert from "node:assert/strict";
import { createSquatAnalyzer } from "../src/exercises/squat.js";


function landmarksForKneeAngle(angle) {
    const radians = angle * Math.PI / 180;
    const landmarks = Array.from(
        { length: 29 },
        () => ({ x: 0, y: 0 })
    );

    landmarks[23] = { x: 0, y: 0 };
    landmarks[25] = { x: 0, y: 1 };
    landmarks[27] = {
        x: Math.sin(radians),
        y: 1 - Math.cos(radians)
    };
    landmarks[24] = { x: 2, y: 0 };
    landmarks[26] = { x: 2, y: 1 };
    landmarks[28] = {
        x: 2 + Math.sin(radians),
        y: 1 - Math.cos(radians)
    };

    return landmarks;
}


const analyzer = createSquatAnalyzer();
const standing = analyzer.analyze(landmarksForKneeAngle(180));
const descending = analyzer.analyze(landmarksForKneeAngle(135));
const bottom = analyzer.analyze(landmarksForKneeAngle(90));

assert.equal(standing.isStanding, true);
assert.equal(descending.isStanding, false);
assert.equal(bottom.isBottom, true);
assert.equal(Math.round(standing.leftKneeAngle), 180);
assert.equal(Math.round(standing.rightKneeAngle), 180);
assert.equal(bottom.symmetry, 100);

assert.equal(analyzer.process(standing, standing, 0).state, "STANDING");
assert.equal(analyzer.process(descending, descending, 100).state, "DESCENDING");
assert.equal(analyzer.process(bottom, bottom, 200).state, "BOTTOM");
assert.equal(analyzer.process(descending, descending, 300).state, "ASCENDING");
const completed = analyzer.process(standing, standing, 1000);
assert.equal(completed.state, "STANDING");
assert.equal(completed.repCompleted, true);
assert.equal(completed.repetitions, 1);

const duplicate = analyzer.process(standing, standing, 1100);
assert.equal(duplicate.repetitions, 1);

analyzer.process(descending, descending, 2000);
analyzer.process(bottom, bottom, 2100);
analyzer.process(descending, descending, 2200);
const second = analyzer.process(standing, standing, 3000);
assert.equal(second.repetitions, 2);

const incomplete = createSquatAnalyzer();
incomplete.process(descending, descending, 100);
incomplete.process(bottom, bottom, 200);
assert.equal(incomplete.getState().repetitions, 0);

incomplete.resetMovementState();
assert.equal(incomplete.getState().state, "STANDING");
incomplete.reset();
assert.equal(incomplete.getState().repetitions, 0);
assert.equal(incomplete.getState().state, "STANDING");

console.log("Squat tests passed");
