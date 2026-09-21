import assert from "node:assert/strict";
import { createBicepCurlAnalyzer } from "../src/exercises/bicepCurl.js";


function landmarksForElbowAngles(leftAngle, rightAngle) {
    const landmarks = Array.from(
        { length: 29 },
        () => ({ x: 0, y: 0 })
    );

    for (const [angle, shoulder, elbow, wrist] of [
        [leftAngle, 11, 13, 15],
        [rightAngle, 12, 14, 16]
    ]) {
        const radians = angle * Math.PI / 180;
        const offset = wrist === 16 ? 2 : 0;

        landmarks[shoulder] = { x: offset, y: 0 };
        landmarks[elbow] = { x: offset, y: 1 };
        landmarks[wrist] = {
            x: offset + Math.sin(radians),
            y: 1 - Math.cos(radians)
        };
    }

    return landmarks;
}


const analyzer = createBicepCurlAnalyzer();

for (const method of [
    "analyze",
    "process",
    "reset",
    "resetMovementState",
    "getState"
]) {
    assert.equal(typeof analyzer[method], "function");
}

assert.equal(analyzer.getState().state, "EXTENDED");
assert.equal(analyzer.getState().activeArm, null);
assert.equal(analyzer.getState().repetitions, 0);

const invalid = analyzer.analyze([]);
assert.equal(invalid.hasRequiredLandmarks, false);
assert.equal(analyzer.process(invalid, invalid, 0).state, "EXTENDED");
assert.equal(analyzer.getState().repetitions, 0);

const extended = analyzer.analyze(
    landmarksForElbowAngles(180, 180)
);
const leftCurling = analyzer.analyze(
    landmarksForElbowAngles(120, 180)
);
const leftContracted = analyzer.analyze(
    landmarksForElbowAngles(45, 180)
);
const leftExtending = analyzer.analyze(
    landmarksForElbowAngles(120, 180)
);

assert.equal(extended.isExtended, true);
assert.equal(leftCurling.isCurling, true);
assert.equal(leftCurling.activeArm, "left");
assert.equal(leftContracted.isContracted, true);
assert.equal(leftExtending.isExtending, true);
assert.equal(Math.round(leftContracted.rom), 100);

assert.equal(analyzer.process(extended, extended, 0).state, "EXTENDED");
assert.equal(analyzer.process(leftCurling, leftCurling, 1000).state, "CURLING");
assert.equal(analyzer.getState().activeArm, "left");
assert.equal(analyzer.process(leftContracted, leftContracted, 1100).state, "CONTRACTED");
assert.equal(analyzer.process(leftExtending, leftExtending, 1200).state, "EXTENDING");

const leftCompleted = analyzer.process(extended, extended, 2000);
assert.equal(leftCompleted.state, "EXTENDED");
assert.equal(leftCompleted.repCompleted, true);
assert.equal(leftCompleted.repetitions, 1);
assert.equal(leftCompleted.record.activeArm, "left");
assert.equal(leftCompleted.record.rom, 100);
assert.equal(leftCompleted.record.speed > 0, true);

const duplicate = analyzer.process(extended, extended, 2100);
assert.equal(duplicate.repCompleted, false);
assert.equal(duplicate.repetitions, 1);

const rightAnalyzer = createBicepCurlAnalyzer();
const rightCurling = rightAnalyzer.analyze(
    landmarksForElbowAngles(180, 120)
);
const rightContracted = rightAnalyzer.analyze(
    landmarksForElbowAngles(180, 45)
);
const rightExtending = rightAnalyzer.analyze(
    landmarksForElbowAngles(180, 120)
);

assert.equal(rightCurling.activeArm, "right");
assert.equal(rightAnalyzer.process(rightCurling, rightCurling, 1000).state, "CURLING");
assert.equal(rightAnalyzer.process(rightContracted, rightContracted, 1100).state, "CONTRACTED");
assert.equal(rightAnalyzer.process(rightExtending, rightExtending, 1200).state, "EXTENDING");
assert.equal(
    rightAnalyzer.process(extended, extended, 2000).record.activeArm,
    "right"
);

const bothAnalyzer = createBicepCurlAnalyzer();
const bothCurling = bothAnalyzer.analyze(
    landmarksForElbowAngles(120, 125)
);
assert.equal(bothCurling.activeArm, "both");

const incomplete = createBicepCurlAnalyzer();
incomplete.process(leftCurling, leftCurling, 1000);
incomplete.process(leftExtending, leftExtending, 1100);
assert.equal(incomplete.getState().repetitions, 0);

incomplete.process(leftContracted, leftContracted, 2000);
incomplete.resetMovementState();
assert.equal(incomplete.getState().state, "EXTENDED");
assert.equal(incomplete.getState().activeArm, null);
assert.equal(incomplete.getState().repetitions, 0);

const state = analyzer.getState();
state.repRecords.push({ rep: 99 });
state.qualityScores.push(0);
state.repStartTimes.push(0);
assert.equal(analyzer.getState().repRecords.length, 1);
assert.equal(analyzer.getState().qualityScores.length, 1);
assert.equal(analyzer.getState().repStartTimes.length, 1);

analyzer.reset();
assert.equal(analyzer.getState().state, "EXTENDED");
assert.equal(analyzer.getState().activeArm, null);
assert.equal(analyzer.getState().repetitions, 0);
assert.deepEqual(analyzer.getState().repRecords, []);

console.log("Bicep Curl tests passed");
