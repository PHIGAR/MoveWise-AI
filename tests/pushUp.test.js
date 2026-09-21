import assert from "node:assert/strict";
import { createPushUpAnalyzer } from "../src/exercises/pushUp.js";


function landmarksForElbowAngle(angle) {
    const radians = angle * Math.PI / 180;
    const landmarks = Array.from(
        { length: 29 },
        () => ({ x: 0, y: 0 })
    );

    landmarks[11] = { x: 0, y: 0 };
    landmarks[13] = { x: 0, y: 1 };
    landmarks[15] = {
        x: Math.sin(radians),
        y: 1 - Math.cos(radians)
    };
    landmarks[23] = { x: 0, y: 2 };
    landmarks[27] = { x: 0, y: 3 };

    landmarks[12] = { x: 2, y: 0 };
    landmarks[14] = { x: 2, y: 1 };
    landmarks[16] = {
        x: 2 + Math.sin(radians),
        y: 1 - Math.cos(radians)
    };
    landmarks[24] = { x: 2, y: 2 };
    landmarks[28] = { x: 2, y: 3 };

    return landmarks;
}


const analyzer = createPushUpAnalyzer();

for (const method of [
    "analyze",
    "process",
    "reset",
    "resetMovementState",
    "getState"
]) {
    assert.equal(typeof analyzer[method], "function");
}

assert.equal(analyzer.getState().state, "UP");
assert.equal(analyzer.getState().repetitions, 0);

const invalid = analyzer.analyze([]);
assert.equal(invalid.hasRequiredLandmarks, false);
assert.equal(
    analyzer.process(invalid, invalid, 0).repetitions,
    0
);

const up = analyzer.analyze(landmarksForElbowAngle(180));
const down = analyzer.analyze(landmarksForElbowAngle(120));
const bottom = analyzer.analyze(landmarksForElbowAngle(80));

assert.equal(up.isUp, true);
assert.equal(down.isDescending, true);
assert.equal(bottom.isBottom, true);
assert.equal(Math.round(bottom.alignment), 100);
assert.equal(Math.round(bottom.elbowSymmetry), 100);

assert.equal(analyzer.process(up, up, 0).state, "UP");
assert.equal(analyzer.process(down, down, 1000).state, "DOWN");
assert.equal(analyzer.process(bottom, bottom, 1100).state, "BOTTOM");
assert.equal(analyzer.process(down, down, 1200).state, "ASCENDING");

const completed = analyzer.process(up, up, 2000);
assert.equal(completed.state, "UP");
assert.equal(completed.repCompleted, true);
assert.equal(completed.repetitions, 1);
assert.equal(completed.quality, completed.score);
assert.equal(completed.record.depth, 100);

const duplicate = analyzer.process(up, up, 2100);
assert.equal(duplicate.repCompleted, false);
assert.equal(duplicate.repetitions, 1);

const incomplete = createPushUpAnalyzer();
incomplete.process(down, down, 1000);
incomplete.process(up, up, 1100);
assert.equal(incomplete.getState().repetitions, 0);

incomplete.process(bottom, bottom, 2000);
incomplete.resetMovementState();
assert.equal(incomplete.getState().state, "UP");
assert.equal(incomplete.getState().repetitions, 0);

const state = analyzer.getState();
state.repRecords.push({ rep: 99 });
state.qualityScores.push(0);
state.repStartTimes.push(0);
assert.equal(analyzer.getState().repRecords.length, 1);
assert.equal(analyzer.getState().qualityScores.length, 1);
assert.equal(analyzer.getState().repStartTimes.length, 1);

analyzer.reset();
assert.equal(analyzer.getState().state, "UP");
assert.equal(analyzer.getState().repetitions, 0);
assert.deepEqual(analyzer.getState().repRecords, []);

console.log("Push-up tests passed");
