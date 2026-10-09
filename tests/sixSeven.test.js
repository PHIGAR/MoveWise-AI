import assert from "node:assert/strict";
import {
    createSixSevenAnalyzer,
    SIX_SEVEN_REQUIRED_LANDMARKS,
    validateSixSevenLandmarks
} from "../src/exercises/sixSeven.js";
import {
    createMovementVisual,
    getMovementMetricDefinitions,
    isValidMovementVisual,
    summarizeMovementMetrics
} from "../src/core/movementVisual.js";
import { createSession, validateSession } from "../src/core/session.js";


function makePose(endpoint) {
    const landmarks = Array.from(
        { length: 33 },
        () => ({ x: 0.5, y: 0.5, visibility: 0.95 })
    );

    landmarks[11] = { x: 0.4, y: 0.3, visibility: 0.95 };
    landmarks[12] = { x: 0.6, y: 0.3, visibility: 0.95 };
    landmarks[13] = { x: 0.4, y: 0.36, visibility: 0.95 };
    landmarks[14] = { x: 0.6, y: 0.36, visibility: 0.95 };
    landmarks[23] = { x: 0.44, y: 0.7, visibility: 0.95 };
    landmarks[24] = { x: 0.56, y: 0.7, visibility: 0.95 };

    if (endpoint === "LEFT_HIGH") {
        landmarks[15] = { x: 0.4, y: 0.18, visibility: 0.95 };
        landmarks[16] = { x: 0.6, y: 0.42, visibility: 0.95 };
    }
    else if (endpoint === "RIGHT_HIGH") {
        landmarks[15] = { x: 0.4, y: 0.42, visibility: 0.95 };
        landmarks[16] = { x: 0.6, y: 0.18, visibility: 0.95 };
    }
    else {
        landmarks[15] = { x: 0.4, y: 0.3, visibility: 0.95 };
        landmarks[16] = { x: 0.6, y: 0.3, visibility: 0.95 };
    }

    return landmarks;
}


function makePoseAtLevels(leftLevel, rightLevel) {
    const landmarks = makePose(null);
    const shoulderWidth = Math.hypot(
        landmarks[12].x - landmarks[11].x,
        landmarks[12].y - landmarks[11].y
    );

    landmarks[15].y = landmarks[11].y - leftLevel * shoulderWidth;
    landmarks[16].y = landmarks[12].y - rightLevel * shoulderWidth;
    return landmarks;
}


function feed(analyzer, endpoint, timestamp) {
    const movement = analyzer.analyze(makePose(endpoint));
    return analyzer.process(movement, movement, timestamp);
}


function feedAtLevels(analyzer, leftLevel, rightLevel, timestamp) {
    const movement = analyzer.analyze(
        makePoseAtLevels(leftLevel, rightLevel)
    );
    return analyzer.process(movement, movement, timestamp);
}

function feedUpperBody(analyzer, leftLevel, rightLevel, timestamp) {
    const upperBodyLandmarks =
        makePoseAtLevels(leftLevel, rightLevel).slice(0, 17);
    const movement = analyzer.analyze(upperBodyLandmarks);
    return analyzer.process(movement, movement, timestamp);
}


{
    assert.deepEqual(
        SIX_SEVEN_REQUIRED_LANDMARKS,
        [11, 12, 13, 14, 15, 16]
    );

    const upperBodyPose = makePoseAtLevels(0.2, 0).slice(0, 17);
    assert.equal(
        validateSixSevenLandmarks(upperBodyPose).valid,
        true
    );
    assert.equal(
        validateSixSevenLandmarks(upperBodyPose).missing.length,
        0
    );

    const analyzer = createSixSevenAnalyzer();
    feedUpperBody(analyzer, 0.2, 0, 1000);
    feedUpperBody(analyzer, 0.2, 0, 1100);
    feedUpperBody(analyzer, 0, 0.2, 1500);
    const result = feedUpperBody(analyzer, 0, 0.2, 1900);
    assert.equal(result.repCompleted, true);
    assert.equal(result.repetitions, 1);
}

{
    const analyzer = createSixSevenAnalyzer();
    let result = feed(analyzer, "LEFT_HIGH", 1000);
    assert.equal(result.repCompleted, false);
    result = feed(analyzer, "LEFT_HIGH", 1100);
    assert.equal(result.state, "LEFT_HIGH");
    assert.equal(result.repetitions, 0);

    feed(analyzer, "RIGHT_HIGH", 1500);
    result = feed(analyzer, "RIGHT_HIGH", 1900);
    assert.equal(result.repCompleted, true);
    assert.equal(result.repetitions, 1);
    assert.equal(result.record.alternation, 100);
    assert.equal(result.record.symmetry, 100);
    assert.equal(result.record.rhythm, 100);
    assert.equal(result.record.quality, 100);
}

{
    const analyzer = createSixSevenAnalyzer();

    feedAtLevels(analyzer, 0.2, 0, 1000);
    feedAtLevels(analyzer, 0.2, 0, 1100);
    feedAtLevels(analyzer, 0, 0.2, 1500);
    const result = feedAtLevels(analyzer, 0, 0.2, 1900);

    assert.equal(result.repCompleted, true);
    assert.equal(result.repetitions, 1);
    assert.equal(result.record.endpoint, "RIGHT_HIGH");
}

{
    const analyzer = createSixSevenAnalyzer();

    feedAtLevels(analyzer, -0.02, -0.22, 1000);
    feedAtLevels(analyzer, -0.02, -0.22, 1100);
    feedAtLevels(analyzer, -0.22, -0.02, 1500);
    const result = feedAtLevels(analyzer, -0.22, -0.02, 1900);

    assert.equal(result.repCompleted, true);
    assert.equal(result.repetitions, 1);
}

{
    const analyzer = createSixSevenAnalyzer();

    for (let frame = 0; frame < 6; frame++) {
        const result = feedAtLevels(
            analyzer,
            0.02,
            0.02,
            1000 + frame * 100
        );
        assert.equal(result.repCompleted, false);
    }

    assert.equal(analyzer.getState().repetitions, 0);
    assert.equal(analyzer.getState().attempts, 0);
}

{
    const analyzer = createSixSevenAnalyzer();

    feedAtLevels(analyzer, 0.2, 0, 1000);
    feedAtLevels(analyzer, 0.2, 0, 1100);
    feedAtLevels(analyzer, 0.2, 0, 1200);

    for (let frame = 0; frame < 8; frame++) {
        const drift = frame % 2 === 0 ? 0.015 : -0.015;
        const result = feedAtLevels(
            analyzer,
            0.2 + drift,
            drift,
            1300 + frame * 100
        );
        assert.equal(result.repCompleted, false);
    }
    assert.equal(analyzer.getState().repetitions, 0);

    feedAtLevels(analyzer, 0, 0.2, 2200);
    const result = feedAtLevels(analyzer, 0, 0.2, 2300);
    assert.equal(result.repCompleted, true);
    assert.equal(result.repetitions, 1);

    for (let frame = 0; frame < 8; frame++) {
        const drift = frame % 2 === 0 ? 0.015 : -0.015;
        const held = feedAtLevels(
            analyzer,
            drift,
            0.2 + drift,
            2400 + frame * 100
        );
        assert.equal(held.repCompleted, false);
        assert.equal(held.repetitions, 1);
    }
}

{
    const analyzer = createSixSevenAnalyzer();
    feed(analyzer, "LEFT_HIGH", 1000);
    feed(analyzer, "LEFT_HIGH", 1100);
    feed(analyzer, null, 1200);
    feed(analyzer, "RIGHT_HIGH", 1300);
    const result = feed(analyzer, null, 1400);

    assert.equal(result.repCompleted, false);
    assert.equal(result.repetitions, 0);
    assert.equal(analyzer.getState().validReps, 0);
}

{
    const analyzer = createSixSevenAnalyzer();
    for (let frame = 0; frame < 12; frame++) {
        const result = feed(analyzer, "LEFT_HIGH", 1000 + frame * 100);
        assert.equal(result.repCompleted, false);
    }
    assert.equal(analyzer.getState().repetitions, 0);
    assert.equal(analyzer.getState().attempts, 0);
}

{
    const analyzer = createSixSevenAnalyzer();
    feed(analyzer, "LEFT_HIGH", 1000);
    feed(analyzer, "LEFT_HIGH", 1100);
    feed(analyzer, "RIGHT_HIGH", 1400);
    let result = feed(analyzer, "RIGHT_HIGH", 1800);
    assert.equal(result.repetitions, 1);

    for (let frame = 0; frame < 10; frame++) {
        result = feed(analyzer, "RIGHT_HIGH", 1900 + frame * 100);
        assert.equal(result.repCompleted, false);
        assert.equal(result.repetitions, 1);
    }
    assert.equal(analyzer.getState().attempts, 1);
}

{
    const analyzer = createSixSevenAnalyzer();
    feed(analyzer, "LEFT_HIGH", 1000);
    feed(analyzer, "LEFT_HIGH", 1100);

    const heldPose = makePose("LEFT_HIGH");
    heldPose[15].y = 0.236;
    heldPose[16].y = 0.332;
    let movement = analyzer.analyze(heldPose);
    let result = analyzer.process(movement, movement, 1200);
    assert.equal(result.state, "LEFT_HIGH");
    assert.equal(result.repetitions, 0);

    feed(analyzer, "RIGHT_HIGH", 1300);
    movement = analyzer.analyze(heldPose);
    result = analyzer.process(movement, movement, 1400);
    assert.equal(result.repetitions, 0);

    feed(analyzer, "RIGHT_HIGH", 1500);
    result = feed(analyzer, "RIGHT_HIGH", 1600);
    assert.equal(result.repetitions, 1);
}

{
    const analyzer = createSixSevenAnalyzer();
    feed(analyzer, "LEFT_HIGH", 1000);
    feed(analyzer, "LEFT_HIGH", 1100);
    feed(analyzer, "RIGHT_HIGH", 1400);
    feed(analyzer, "RIGHT_HIGH", 1800);
    const before = analyzer.getState();

    const missing = analyzer.analyze([]);
    const result = analyzer.process(missing, missing, 1900);
    const after = analyzer.getState();
    assert.equal(result.repCompleted, false);
    assert.equal(after.repetitions, before.repetitions);
    assert.equal(after.repRecords.length, before.repRecords.length);
    assert.equal(after.state, "READY");
}

{
    const analyzer = createSixSevenAnalyzer();
    feedUpperBody(analyzer, 0.2, 0, 1000);
    feedUpperBody(analyzer, 0.2, 0, 1100);
    feedUpperBody(analyzer, 0, 0.2, 1500);
    feedUpperBody(analyzer, 0, 0.2, 1900);
    const lowVisibilityPose = makePose("RIGHT_HIGH");
    lowVisibilityPose[15].visibility = 0.1;

    const movement = analyzer.analyze(lowVisibilityPose);
    const result = analyzer.process(movement, movement, 2000);
    assert.equal(movement.hasRequiredLandmarks, false);
    assert.equal(result.repCompleted, false);
    assert.equal(result.repetitions, 1);
    assert.equal(analyzer.getState().repRecords.length, 1);
    assert.equal(analyzer.getState().state, "READY");
}

{
    const analyzer = createSixSevenAnalyzer();
    feedUpperBody(analyzer, 0.2, 0, 1000);
    feedUpperBody(analyzer, 0.2, 0, 1100);
    feedUpperBody(analyzer, 0, 0.2, 1500);
    feedUpperBody(analyzer, 0, 0.2, 1900);
    assert.equal(analyzer.getState().repetitions, 1);

    const missingWrist = makePoseAtLevels(0.2, 0).slice(0, 16);
    let movement;
    assert.doesNotThrow(() => {
        movement = analyzer.analyze(missingWrist);
    });
    assert.equal(movement.hasRequiredLandmarks, false);

    const result = analyzer.process(movement, movement, 2000);
    const state = analyzer.getState();
    assert.equal(result.repCompleted, false);
    assert.equal(state.repetitions, 1);
    assert.equal(state.repRecords.length, 1);
}

{
    const analyzer = createSixSevenAnalyzer();
    feed(analyzer, "LEFT_HIGH", 1000);
    feed(analyzer, "LEFT_HIGH", 1100);
    feed(analyzer, "RIGHT_HIGH", 1500);
    feed(analyzer, "RIGHT_HIGH", 1900);
    analyzer.resetMovementState();

    const state = analyzer.getState();
    assert.equal(state.state, "READY");
    assert.equal(state.activeEndpoint, null);
    assert.equal(state.repetitions, 1);
    assert.equal(state.attempts, 1);
    assert.equal(state.validReps, 1);
    assert.equal(state.repRecords.length, 1);

    analyzer.reset();
    assert.equal(analyzer.getState().repetitions, 0);
    assert.equal(analyzer.getState().repRecords.length, 0);
}

{
    const analyzer = createSixSevenAnalyzer();
    let timestamp = 1000;
    feed(analyzer, "LEFT_HIGH", timestamp);
    feed(analyzer, "LEFT_HIGH", timestamp += 100);
    feed(analyzer, "RIGHT_HIGH", timestamp += 400);
    let result = feed(analyzer, "RIGHT_HIGH", timestamp += 400);
    assert.equal(result.repetitions, 1);

    feed(analyzer, "LEFT_HIGH", timestamp += 400);
    result = feed(analyzer, "LEFT_HIGH", timestamp += 400);
    assert.equal(result.repetitions, 2);
    assert.equal(result.repCompleted, true);

    feed(analyzer, "RIGHT_HIGH", timestamp += 400);
    result = feed(analyzer, "RIGHT_HIGH", timestamp += 400);
    assert.equal(result.repetitions, 3);
    assert.equal(result.attempts, 3);
    assert.equal(analyzer.getState().validReps, 3);
    assert.equal(analyzer.getState().repRecords.length, 3);
}

{
    const metrics = {
        alternation: 90,
        rhythm: 82,
        symmetry: 96,
        quality: 89
    };
    const visual = createMovementVisual(
        "six-seven",
        [{
            rep: 1,
            trail: [makePose("LEFT_HIGH"), makePose("RIGHT_HIGH")],
            representativePose: makePose("RIGHT_HIGH")
        }],
        1
    );
    const session = createSession({
        exerciseId: "six-seven",
        repetitions: 1,
        quality: 89,
        symmetry: 96,
        movementMetrics: metrics,
        movementVisual: visual,
        repRecords: [{ rep: 1, quality: 89 }]
    });

    assert.equal(validateSession(session), true);
    assert.equal(isValidMovementVisual(visual, "six-seven", 1), true);
    assert.deepEqual(
        getMovementMetricDefinitions("six-seven")
            .map(definition => definition.key),
        ["alternation", "rhythm", "symmetry", "quality"]
    );
    assert.deepEqual(
        summarizeMovementMetrics("six-seven", [metrics]),
        metrics
    );
}

console.log("Six Seven analyzer tests passed");
