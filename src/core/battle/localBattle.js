import { createExerciseAnalyzer } from "../../exercises/exerciseRegistry.js";
import { validateLandmarks } from "../../ai/pose/landmarks.js";
import { calculateBattleOutcome } from "./battleScoring.js";

const CENTER_LANDMARKS = [11, 12, 23, 24];

export const LOCAL_BATTLE_DURATION_SECONDS = 60;
export const LOCAL_BATTLE_LOST_GRACE_MS = 1500;


export function createLocalBattleAnalyzers(exerciseId) {
    return [
        createExerciseAnalyzer(exerciseId),
        createExerciseAnalyzer(exerciseId)
    ];
}


export function getPoseCenterX(landmarks) {
    if (!Array.isArray(landmarks)) {
        return null;
    }

    const centerPoints = CENTER_LANDMARKS
        .map(index => landmarks[index])
        .filter(isUsableLandmark);
    const points = centerPoints.length
        ? centerPoints
        : landmarks.filter(isUsableLandmark);

    if (!points.length) {
        return null;
    }

    return points.reduce((sum, point) => sum + point.x, 0) /
        points.length;
}


export function isLocalBattlePoseValid(
    landmarks,
    requiredIndexes,
    minVisibility = 0.25
) {
    return validateLandmarks(
        landmarks,
        requiredIndexes,
        minVisibility
    ).valid;
}


export function hasDistinctLocalBattlePlayers(
    centers,
    minimumSeparation = 0.12
) {
    return Boolean(
        Array.isArray(centers) &&
        centers.length === 2 &&
        Number.isFinite(centers[0]) &&
        Number.isFinite(centers[1]) &&
        Math.abs(centers[1] - centers[0]) >= minimumSeparation
    );
}


export function assignLocalBattlePoses(
    poses,
    previousCenters = [null, null]
) {
    const candidates = (Array.isArray(poses) ? poses : [])
        .map(landmarks => ({
            landmarks,
            centerX: getPoseCenterX(landmarks)
        }))
        .filter(candidate => Number.isFinite(candidate.centerX));
    const centers = [...previousCenters];
    const players = [null, null];

    if (candidates.length === 0) {
        return {
            players,
            centers,
            detectedCount: 0
        };
    }

    if (candidates.length === 1) {
        const [firstCenter, secondCenter] = previousCenters;
        if (
            Number.isFinite(firstCenter) &&
            Number.isFinite(secondCenter)
        ) {
            const playerIndex =
                Math.abs(candidates[0].centerX - firstCenter) <=
                Math.abs(candidates[0].centerX - secondCenter)
                    ? 0
                    : 1;
            players[playerIndex] = candidates[0].landmarks;
            centers[playerIndex] = candidates[0].centerX;
        }

        return {
            players,
            centers,
            detectedCount: 1
        };
    }

    const [first, second] = candidates
        .slice(0, 2)
        .sort((a, b) => a.centerX - b.centerX);
    const [previousFirst, previousSecond] = previousCenters;
    let firstBelongsToPlayerOne = true;

    if (
        Number.isFinite(previousFirst) &&
        Number.isFinite(previousSecond)
    ) {
        const directDistance =
            Math.abs(first.centerX - previousFirst) +
            Math.abs(second.centerX - previousSecond);
        const swappedDistance =
            Math.abs(second.centerX - previousFirst) +
            Math.abs(first.centerX - previousSecond);
        firstBelongsToPlayerOne = directDistance <= swappedDistance;
    }
    else if (Number.isFinite(previousFirst)) {
        firstBelongsToPlayerOne =
            Math.abs(first.centerX - previousFirst) <=
            Math.abs(second.centerX - previousFirst);
    }
    else if (Number.isFinite(previousSecond)) {
        firstBelongsToPlayerOne =
            Math.abs(first.centerX - previousSecond) >
            Math.abs(second.centerX - previousSecond);
    }

    const playerOne = firstBelongsToPlayerOne ? first : second;
    const playerTwo = firstBelongsToPlayerOne ? second : first;
    players[0] = playerOne.landmarks;
    players[1] = playerTwo.landmarks;
    centers[0] = playerOne.centerX;
    centers[1] = playerTwo.centerX;

    return {
        players,
        centers,
        detectedCount: candidates.length
    };
}


export function updateLocalBattlePresence(
    previousPresence,
    playerPoses,
    timestamp,
    gracePeriodMs = LOCAL_BATTLE_LOST_GRACE_MS
) {
    return playerPoses.map((pose, index) => {
        const previous = previousPresence[index] || {};

        if (pose) {
            return {
                visible: true,
                lostAt: null,
                graceExpired: false,
                lastSeenAt: timestamp
            };
        }

        const lostAt = previous.lostAt ?? timestamp;
        return {
            visible: false,
            lostAt,
            graceExpired: timestamp - lostAt >= gracePeriodMs,
            lastSeenAt: previous.lastSeenAt ?? null
        };
    });
}


export function summarizeLocalBattlePlayer(analyzer, currentQuality) {
    const state = analyzer.getState();
    const quality = state.qualityScores.length
        ? Math.round(state.qualityScores.reduce(
            (sum, value) => sum + value,
            0
        ) / state.qualityScores.length)
        : validPercentage(currentQuality)
            ? Math.round(currentQuality)
            : null;

    return {
        repetitions: state.repetitions,
        quality,
        accuracy: state.attempts > 0
            ? Math.round(state.validReps / state.attempts * 100)
            : null
    };
}


export function calculateLocalBattleResult(
    playerOne,
    playerTwo
) {
    const outcome = calculateBattleOutcome(
        playerOne.metrics,
        playerTwo.metrics
    );

    return {
        outcome,
        players: [
            {
                name: playerOne.name,
                ...playerOne.metrics,
                score: outcome.playerScore
            },
            {
                name: playerTwo.name,
                ...playerTwo.metrics,
                score: outcome.opponentScore
            }
        ],
        winnerIndex: outcome.result === "draw"
            ? null
            : outcome.result === "win"
                ? 0
                : 1
    };
}


function isUsableLandmark(point) {
    return Boolean(
        point &&
        Number.isFinite(point.x) &&
        (
            point.visibility === undefined ||
            (
                Number.isFinite(point.visibility) &&
                point.visibility >= 0.25
            )
        )
    );
}


function validPercentage(value) {
    return Number.isFinite(value) && value >= 0 && value <= 100;
}
