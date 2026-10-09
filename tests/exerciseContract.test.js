import assert from "node:assert/strict";
import { createJumpingJackAnalyzer } from "../src/exercises/jumpingJack.js";
import { createSquatAnalyzer } from "../src/exercises/squat.js";
import { createPushUpAnalyzer } from "../src/exercises/pushUp.js";
import { createLungeAnalyzer } from "../src/exercises/lunge.js";
import { createBicepCurlAnalyzer } from "../src/exercises/bicepCurl.js";
import { createSixSevenAnalyzer } from "../src/exercises/sixSeven.js";


const ANALYZER_METHODS = [
    "analyze",
    "process",
    "reset",
    "resetMovementState",
    "getState"
];


const analyzers = [
    {
        name: "Jumping Jack",
        create: createJumpingJackAnalyzer,
        initialState: "CLOSED",
        required: [11, 12, 15, 16, 27, 28]
    },
    {
        name: "Squat",
        create: createSquatAnalyzer,
        initialState: "STANDING",
        required: [23, 24, 25, 26, 27, 28]
    },
    {
        name: "Push-up",
        create: createPushUpAnalyzer,
        initialState: "UP",
        required: [11, 12, 13, 14, 15, 16, 23, 24, 27, 28]
    },
    {
        name: "Lunge",
        create: createLungeAnalyzer,
        initialState: "STANDING",
        required: [23, 24, 25, 26, 27, 28]
    },
    {
        name: "Bicep Curl",
        create: createBicepCurlAnalyzer,
        initialState: "EXTENDED",
        required: [11, 12, 13, 14, 15, 16]
    },
    {
        name: "Six Seven",
        create: createSixSevenAnalyzer,
        initialState: "READY",
        required: [11, 12, 13, 14, 15, 16]
    }
];


function validLandmarks() {
    return Array.from(
        { length: 29 },
        () => ({ x: 0, y: 0 })
    );
}


function invalidLandmarks(required, value) {
    const landmarks = validLandmarks();
    landmarks[required[0]] = value;
    return landmarks;
}


for (const definition of analyzers) {
    const analyzer = definition.create();

    for (const method of ANALYZER_METHODS) {
        assert.equal(
            typeof analyzer[method],
            "function",
            `${definition.name} is missing ${method}`
        );
    }

    assert.equal(
        analyzer.getState().state,
        definition.initialState
    );
    assert.equal(analyzer.getState().repetitions, 0);

    const movement = analyzer.analyze(validLandmarks());
    const result = analyzer.process(
        movement,
        { quality: 0 },
        1000
    );

    for (const field of [
        "state",
        "repCompleted",
        "repetitions",
        "attempts",
        "validReps",
        "score",
        "quality",
        "feedback",
        "metrics",
        "record",
        "valid"
    ]) {
        assert.ok(
            Object.hasOwn(result, field),
            `${definition.name} is missing process field ${field}`
        );
    }

    assert.equal(typeof result.repetitions, "number");
    assert.equal(typeof result.quality, "number");
    assert.equal(typeof result.score, "number");
    assert.equal(result.repCompleted, false);
    assert.equal(result.record, null);
    assert.equal(typeof result.feedback.type, "string");
    assert.equal(typeof result.feedback.severity, "string");
    assert.equal(typeof result.feedback.message, "string");

    for (const invalid of [
        [],
        invalidLandmarks(definition.required, {
            x: NaN,
            y: undefined
        }),
        invalidLandmarks(definition.required, {
            x: 0,
            y: 0,
            visibility: 0.1
        })
    ]) {
        assert.doesNotThrow(() => analyzer.analyze(invalid));

        const invalidMovement = analyzer.analyze(invalid);
        assert.equal(invalidMovement.hasRequiredLandmarks, false);

        const before = analyzer.getState();
        const invalidResult = analyzer.process(
            invalidMovement,
            { quality: 0 },
            2000
        );
        const after = analyzer.getState();

        assert.equal(invalidResult.repCompleted, false);
        assert.equal(invalidResult.valid, false);
        assert.equal(invalidResult.repetitions, before.repetitions);
        assert.equal(after.repetitions, before.repetitions);
        assert.equal(after.repRecords.length, before.repRecords.length);
    }

    analyzer.resetMovementState();
    assert.equal(
        analyzer.getState().state,
        definition.initialState
    );
    assert.equal(analyzer.getState().repetitions, 0);

    analyzer.reset();
    assert.equal(
        analyzer.getState().state,
        definition.initialState
    );
    assert.equal(analyzer.getState().repetitions, 0);
}


console.log("Exercise contract tests passed");
