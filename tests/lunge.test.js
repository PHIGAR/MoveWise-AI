import assert from "node:assert/strict";
import { createLungeAnalyzer } from "../src/exercises/lunge.js";


function landmarksForKneeAngles(leftAngle, rightAngle) {
    const landmarks = Array.from(
        { length: 29 },
        () => ({ x: 0, y: 0 })
    );

    for (const [angle, hip, knee, ankle] of [
        [leftAngle, 23, 25, 27],
        [rightAngle, 24, 26, 28]
    ]) {
        const radians = angle * Math.PI / 180;
        const offset = ankle === 28 ? 2 : 0;

        landmarks[hip] = { x: offset, y: 0 };
        landmarks[knee] = { x: offset, y: 1 };
        landmarks[ankle] = {
            x: offset + Math.sin(radians),
            y: 1 - Math.cos(radians)
        };
    }

    return landmarks;
}


const analyzer = createLungeAnalyzer();

for (const method of [
    "analyze",
    "process",
    "reset",
    "resetMovementState",
    "getState"
]) {
    assert.equal(typeof analyzer[method], "function");
}

assert.equal(analyzer.getState().state, "STANDING");
assert.equal(analyzer.getState().activeLeg, null);
assert.equal(analyzer.getState().repetitions, 0);

const invalid = analyzer.analyze([]);
assert.equal(invalid.hasRequiredLandmarks, false);
assert.equal(analyzer.process(invalid, invalid, 0).state, "STANDING");
assert.equal(analyzer.getState().repetitions, 0);

const standing = analyzer.analyze(
    landmarksForKneeAngles(180, 180)
);
const leftDescending = analyzer.analyze(
    landmarksForKneeAngles(130, 175)
);
const leftBottom = analyzer.analyze(
    landmarksForKneeAngles(90, 175)
);
const leftAscending = analyzer.analyze(
    landmarksForKneeAngles(130, 175)
);

assert.equal(standing.isStanding, true);
assert.equal(leftDescending.isDescending, true);
assert.equal(leftDescending.activeLeg, "left");
assert.equal(leftBottom.isBottom, true);
assert.equal(leftAscending.isAscending, true);

assert.equal(analyzer.process(standing, standing, 0).state, "STANDING");
assert.equal(analyzer.process(leftDescending, leftDescending, 1000).state, "DESCENDING");
assert.equal(analyzer.getState().activeLeg, "left");
assert.equal(analyzer.process(leftBottom, leftBottom, 1100).state, "BOTTOM");
assert.equal(analyzer.process(leftAscending, leftAscending, 1200).state, "ASCENDING");

const leftCompleted = analyzer.process(standing, standing, 2000);
assert.equal(leftCompleted.state, "STANDING");
assert.equal(leftCompleted.repCompleted, true);
assert.equal(leftCompleted.repetitions, 1);
assert.equal(leftCompleted.record.activeLeg, "left");
assert.equal(leftCompleted.record.depth, 100);

const duplicate = analyzer.process(standing, standing, 2100);
assert.equal(duplicate.repCompleted, false);
assert.equal(duplicate.repetitions, 1);

const rightAnalyzer = createLungeAnalyzer();
const rightDescending = rightAnalyzer.analyze(
    landmarksForKneeAngles(175, 130)
);
const rightBottom = rightAnalyzer.analyze(
    landmarksForKneeAngles(175, 90)
);
const rightAscending = rightAnalyzer.analyze(
    landmarksForKneeAngles(175, 130)
);

assert.equal(rightDescending.activeLeg, "right");
assert.equal(rightBottom.isBottom, true);
assert.equal(rightAnalyzer.process(rightDescending, rightDescending, 1000).state, "DESCENDING");
assert.equal(rightAnalyzer.process(rightBottom, rightBottom, 1100).state, "BOTTOM");
assert.equal(rightAnalyzer.process(rightAscending, rightAscending, 1200).state, "ASCENDING");
assert.equal(
    rightAnalyzer.process(standing, standing, 2000).record.activeLeg,
    "right"
);

const incomplete = createLungeAnalyzer();
incomplete.process(leftDescending, leftDescending, 1000);
incomplete.process(leftAscending, leftAscending, 1100);
assert.equal(incomplete.getState().repetitions, 0);

incomplete.process(leftBottom, leftBottom, 2000);
incomplete.resetMovementState();
assert.equal(incomplete.getState().state, "STANDING");
assert.equal(incomplete.getState().activeLeg, null);
assert.equal(incomplete.getState().repetitions, 0);

const state = analyzer.getState();
state.repRecords.push({ rep: 99 });
state.qualityScores.push(0);
state.repStartTimes.push(0);
assert.equal(analyzer.getState().repRecords.length, 1);
assert.equal(analyzer.getState().qualityScores.length, 1);
assert.equal(analyzer.getState().repStartTimes.length, 1);

analyzer.reset();
assert.equal(analyzer.getState().state, "STANDING");
assert.equal(analyzer.getState().activeLeg, null);
assert.equal(analyzer.getState().repetitions, 0);
assert.deepEqual(analyzer.getState().repRecords, []);

console.log("Lunge tests passed");
