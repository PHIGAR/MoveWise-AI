import assert from "node:assert/strict";
import { generateRecommendation } from "../src/ai/recommendation/recommendation.js";


function session(overrides = {}) {
    return {
        id: "current",
        exerciseId: "jumping-jack",
        quality: 86,
        accuracy: 92,
        symmetry: 94,
        armROM: 88,
        legROM: 90,
        consistency: 90,
        ...overrides
    };
}


assert.equal(
    generateRecommendation(session({ quality: 95 })).strengths.includes("คุณภาพการเคลื่อนไหวอยู่ในระดับดีมาก"),
    true
);
assert.equal(
    generateRecommendation(session({ quality: 95 })).priority,
    "general"
);
assert.equal(
    generateRecommendation(session({ quality: 65 })).priority,
    "quality"
);
assert.equal(
    generateRecommendation(session({ accuracy: 70 })).priority,
    "accuracy"
);
assert.equal(
    generateRecommendation(session({ symmetry: 70 })).priority,
    "symmetry"
);
assert.equal(
    generateRecommendation(session({ armROM: 70 })).priority,
    "arm-rom"
);
assert.equal(
    generateRecommendation(session({ legROM: 70 })).priority,
    "leg-rom"
);
assert.equal(
    generateRecommendation(
        session({ quality: 86 }),
        [
            session({ id: "old-1", quality: 70 }),
            session({ id: "old-2", quality: 78 })
        ]
    ).trend.direction,
    "up"
);
assert.equal(
    generateRecommendation(
        session({ quality: 70 }),
        [
            session({ id: "old-1", quality: 86 }),
            session({ id: "old-2", quality: 82 })
        ]
    ).trend.direction,
    "down"
);
assert.equal(
    generateRecommendation(
        session({ quality: 80 }),
        [
            session({ id: "old-1", quality: 80 }),
            session({ id: "old-2", quality: 80 })
        ]
    ).trend.direction,
    "stable"
);
assert.equal(
    generateRecommendation(session(), []).trend.status,
    "insufficient-data"
);
assert.equal(
    generateRecommendation(null, []).recommendations.length,
    0
);
assert.equal(
    generateRecommendation(
        session({ symmetry: 70, armROM: 60, accuracy: 70, quality: 65 })
    ).priority,
    "symmetry"
);
assert.deepEqual(
    generateRecommendation(
        session({ quality: null, accuracy: null, symmetry: null, armROM: null, legROM: null })
    ).focusAreas,
    []
);

console.log("Recommendation tests passed");
