import assert from "node:assert/strict";
import {
    calculateAngle,
    calculateRange,
    normalizeROM
} from "../src/ai/analysis/rom.js";
import { calculateSymmetry } from "../src/ai/analysis/symmetry.js";
import { calculateQuality } from "../src/ai/analysis/quality.js";


assert.equal(
    calculateAngle(
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 }
    ),
    90
);

assert.equal(
    calculateAngle(null, { x: 0, y: 0 }, { x: 1, y: 0 }),
    0
);

assert.equal(
    calculateRange([10, 4, 7]),
    6
);

assert.equal(
    calculateRange([]),
    0
);

assert.equal(
    normalizeROM(35, 20, 50),
    50
);

assert.equal(
    normalizeROM(10, 20, 50),
    0
);

assert.equal(
    normalizeROM(60, 20, 50),
    100
);

assert.deepEqual(
    calculateSymmetry(80, 70),
    {
        score: 87.5,
        leftValue: 80,
        rightValue: 70,
        difference: 10
    }
);

assert.deepEqual(
    calculateQuality({
        armROM: 80,
        legROM: 90,
        symmetry: 100
    }),
    {
        score: 90,
        breakdown: {
            armROM: 80,
            legROM: 90,
            symmetry: 100
        }
    }
);

console.log("Analysis utility tests passed");
