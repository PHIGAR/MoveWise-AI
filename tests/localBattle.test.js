import assert from "node:assert/strict";
import { test } from "node:test";
import {
    assignLocalBattlePoses,
    calculateLocalBattleResult,
    createLocalBattleAnalyzers,
    hasDistinctLocalBattlePlayers,
    isLocalBattlePoseValid,
    summarizeLocalBattlePlayer,
    updateLocalBattlePresence
} from "../src/core/battle/localBattle.js";
import {
    createBattleState,
    transitionBattleState
} from "../src/core/battle/battleState.js";


function poseAt(centerX) {
    const landmarks = Array.from({ length: 33 }, () => ({
        x: centerX,
        y: 0.5,
        visibility: 1
    }));
    landmarks[11].x = centerX - 0.04;
    landmarks[12].x = centerX + 0.04;
    landmarks[23].x = centerX - 0.03;
    landmarks[24].x = centerX + 0.03;
    return landmarks;
}


function recordSquatRep(analyzer, quality, startTime) {
    analyzer.process({
        hasRequiredLandmarks: true,
        isStanding: false,
        isBottom: false,
        quality
    }, { quality }, startTime);
    analyzer.process({
        hasRequiredLandmarks: true,
        isStanding: false,
        isBottom: true,
        quality
    }, { quality }, startTime + 100);
    analyzer.process({
        hasRequiredLandmarks: true,
        isStanding: false,
        isBottom: false,
        quality
    }, { quality }, startTime + 200);
    analyzer.process({
        hasRequiredLandmarks: true,
        isStanding: true,
        isBottom: false,
        quality
    }, { quality }, startTime + 1000);
}


test("Local Battle assignment handles zero, one, and two people", () => {
    assert.equal(assignLocalBattlePoses([]).detectedCount, 0);
    assert.deepEqual(
        assignLocalBattlePoses([poseAt(0.4)]).players,
        [null, null]
    );

    const assigned = assignLocalBattlePoses([
        poseAt(0.72),
        poseAt(0.28)
    ]);
    assert.equal(assigned.detectedCount, 2);
    assert.equal(
        assigned.centers[0] < assigned.centers[1],
        true
    );
    assert.equal(hasDistinctLocalBattlePlayers(assigned.centers), true);
    assert.equal(hasDistinctLocalBattlePlayers([0.4, 0.42]), false);
    assert.equal(
        isLocalBattlePoseValid(assigned.players[0], [11, 12, 23, 24]),
        true
    );
    assert.equal(
        isLocalBattlePoseValid([{}], [11, 12, 23, 24]),
        false
    );
});


test("Local Battle keeps left/right player assignment stable when detector order changes", () => {
    const first = assignLocalBattlePoses([
        poseAt(0.28),
        poseAt(0.72)
    ]);
    const reordered = assignLocalBattlePoses(
        [poseAt(0.71), poseAt(0.29)],
        first.centers
    );

    assert.ok(reordered.players[0][11].x < reordered.players[1][11].x);
    assert.ok(Math.abs(reordered.centers[0] - first.centers[0]) < 0.05);
    assert.ok(Math.abs(reordered.centers[1] - first.centers[1]) < 0.05);
});


test("Local Battle preserves a player's slot during disappearance and return", () => {
    const both = assignLocalBattlePoses([
        poseAt(0.28),
        poseAt(0.72)
    ]);
    const one = assignLocalBattlePoses(
        [poseAt(0.7)],
        both.centers
    );
    assert.equal(one.players[0], null);
    assert.ok(one.players[1]);

    const presence = updateLocalBattlePresence(
        [{ visible: true }, { visible: true }],
        one.players,
        1000,
        1500
    );
    assert.equal(presence[0].graceExpired, false);
    const expiredPresence = updateLocalBattlePresence(
        presence,
        one.players,
        2600,
        1500
    );
    assert.equal(expiredPresence[0].graceExpired, true);

    const returned = assignLocalBattlePoses(
        [poseAt(0.29), poseAt(0.71)],
        one.centers
    );
    const returnedPresence = updateLocalBattlePresence(
        presence,
        returned.players,
        1200,
        1500
    );
    assert.equal(returnedPresence[0].visible, true);
    assert.equal(returnedPresence[1].visible, true);
});


test("Local Battle uses independent exercise analyzers and quality histories", () => {
    const [playerOne, playerTwo] = createLocalBattleAnalyzers("squat");
    assert.notEqual(playerOne, playerTwo);
    recordSquatRep(playerOne, 86, 1000);
    assert.equal(playerOne.getState().repetitions, 1);
    assert.equal(playerTwo.getState().repetitions, 0);
    assert.deepEqual(playerOne.getState().qualityScores, [86]);
    assert.deepEqual(playerTwo.getState().qualityScores, []);

    recordSquatRep(playerTwo, 71, 1000);
    assert.equal(playerOne.getState().repetitions, 1);
    assert.equal(playerTwo.getState().repetitions, 1);
    assert.deepEqual(playerTwo.getState().qualityScores, [71]);

    const playerOneMetrics = summarizeLocalBattlePlayer(playerOne, 0);
    const playerTwoMetrics = summarizeLocalBattlePlayer(playerTwo, 0);
    assert.equal(playerOneMetrics.quality, 86);
    assert.equal(playerTwoMetrics.quality, 71);
});


test("Local Battle countdown, simultaneous start/finish, winner and draw use battle state/scoring", () => {
    let state = createBattleState();
    state = transitionBattleState(state, "CREATE_ROOM", {
        roomCode: "LOCAL",
        playerId: "player-one"
    });
    state = transitionBattleState(state, "JOIN_ROOM", {
        playerId: "player-two"
    });
    state = transitionBattleState(state, "START_SELECTION");
    for (const playerId of ["player-one", "player-two"]) {
        state = transitionBattleState(state, "SELECT_EXERCISE", {
            playerId,
            exerciseId: "squat"
        });
    }
    for (const playerId of ["player-one", "player-two"]) {
        state = transitionBattleState(state, "SET_READY", {
            playerId,
            ready: true
        });
    }
    state = transitionBattleState(state, "START_COUNTDOWN", {
        countdownStartsAt: 1000
    });
    const startsTogether = transitionBattleState(
        state,
        "START_BATTLE",
        { startedAt: 4000 }
    );
    assert.equal(startsTogether.players[0].ready, true);
    assert.equal(startsTogether.players[1].ready, true);

    const finished = transitionBattleState(
        startsTogether,
        "FINISH_BATTLE",
        { finishedAt: 64000, reason: "time" }
    );
    assert.equal(finished.status, "finished");

    const winner = calculateLocalBattleResult(
        {
            name: "Player 1",
            metrics: { repetitions: 10, quality: 100, accuracy: 100 }
        },
        {
            name: "Player 2",
            metrics: { repetitions: 11, quality: 0, accuracy: 0 }
        }
    );
    assert.equal(winner.winnerIndex, 0);

    const draw = calculateLocalBattleResult(
        {
            name: "Player 1",
            metrics: { repetitions: 10, quality: 80, accuracy: null }
        },
        {
            name: "Player 2",
            metrics: { repetitions: 10, quality: 80, accuracy: null }
        }
    );
    assert.equal(draw.winnerIndex, null);
    assert.equal(draw.outcome.result, "draw");
});
