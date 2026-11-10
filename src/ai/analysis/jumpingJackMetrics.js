import { calculateAngle, normalizeROM } from './rom.js';
import { calculateSymmetry } from './symmetry.js';
import { validateLandmarks } from '../pose/landmarks.js';

export const JUMPING_JACK_METRIC_LANDMARKS = [11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

export function analyzeJumpingJackMetrics(landmarks, movement) {
    if (!validateLandmarks(landmarks, JUMPING_JACK_METRIC_LANDMARKS).valid) return null;
    // Shoulder elevation relative to the torso. Elbow extension stays near 180°
    // both overhead and at rest, so it cannot measure a jumping jack's arm range.
    const leftArmAngle = calculateAngle(landmarks[23], landmarks[11], landmarks[15]);
    const rightArmAngle = calculateAngle(landmarks[24], landmarks[12], landmarks[16]);
    const leftLegAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
    const rightLegAngle = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
    if (!(movement?.shoulderWidth > 0)) return null;
    const armROM = normalizeROM((leftArmAngle + rightArmAngle) / 2, 45, 145);
    const legROM = normalizeROM(movement.footWidth / movement.shoulderWidth, 1.1, 1.35);
    const symmetry = (calculateSymmetry(leftArmAngle, rightArmAngle).score + calculateSymmetry(leftLegAngle, rightLegAngle).score) / 2;
    return Object.fromEntries(Object.entries({ leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle,
        armROM, legROM, symmetry, quality: (armROM + legROM + symmetry) / 3 }).map(([key, value]) => [key, Math.round(value)]));
}
