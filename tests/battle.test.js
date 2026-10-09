import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
    calculateBattleOutcome,
    calculateBattleScore
} from "../src/core/battle/battleScoring.js";
import {
    createBattleState,
    transitionBattleState
} from "../src/core/battle/battleState.js";
import { createMoveWiseServer } from "../server.mjs";

const servers = new Set();

after(async () => {
    await Promise.all([...servers].map(server =>
        new Promise(resolve => server.close(resolve))
    ));
});


async function startServer(battleOptions = {}) {
    const server = createMoveWiseServer({ battleOptions });
    servers.add(server);
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    return `http://127.0.0.1:${server.address().port}`;
}


async function battleRequest(baseUrl, path, options = {}) {
    const headers = new Headers(options.headers);
    if (options.credentials) {
        headers.set("Authorization", `Bearer ${options.credentials.token}`);
        headers.set("X-Battle-Player", options.credentials.playerId);
    }
    if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined
            ? undefined
            : JSON.stringify(options.body)
    });
    return {
        status: response.status,
        body: await response.json()
    };
}


async function waitForSnapshot(baseUrl, credentials, status) {
    const deadline = Date.now() + 1500;
    while (Date.now() < deadline) {
        const result = await battleRequest(
            baseUrl,
            `/api/battle/rooms/${credentials.roomCode}`,
            { credentials }
        );
        if (result.body.status === status) return result.body;
        await new Promise(resolve => setTimeout(resolve, 5));
    }
    throw new Error(`Battle did not reach ${status}`);
}


test("Battle state requires matching, ready players and permits reconnection", () => {
    let state = createBattleState();
    state = transitionBattleState(state, "CREATE_ROOM", {
        roomCode: "A1B2C3",
        playerId: "first"
    });
    state = transitionBattleState(state, "JOIN_ROOM", {
        playerId: "second"
    });
    state = transitionBattleState(state, "START_SELECTION");
    state = transitionBattleState(state, "SELECT_EXERCISE", {
        playerId: "first",
        exerciseId: "squat"
    });
    state = transitionBattleState(state, "SELECT_EXERCISE", {
        playerId: "second",
        exerciseId: "squat"
    });
    state = transitionBattleState(state, "SET_READY", {
        playerId: "first",
        ready: true
    });
    assert.throws(
        () => transitionBattleState(state, "START_COUNTDOWN", {
            countdownStartsAt: 1
        }),
        /Both players/
    );
    state = transitionBattleState(state, "SET_READY", {
        playerId: "second",
        ready: true
    });
    state = transitionBattleState(state, "START_COUNTDOWN", {
        countdownStartsAt: 1
    });
    state = transitionBattleState(state, "START_BATTLE", {
        startedAt: 2
    });
    state = transitionBattleState(state, "DISCONNECT", {
        playerId: "second",
        disconnectedAt: 3
    });
    assert.equal(state.status, "active");
    state = transitionBattleState(state, "RECONNECT", {
        playerId: "second"
    });
    assert.equal(state.players[1].connected, true);
});


test("Battle score handles zero reps, missing metrics, and draws", () => {
    assert.deepEqual(
        calculateBattleScore(
            { repetitions: 0, quality: null, accuracy: null },
            { repetitions: 0, quality: null, accuracy: null }
        ),
        { score: 0, breakdown: { repetitions: 0 } }
    );
    assert.deepEqual(
        calculateBattleOutcome(
            { repetitions: 10, quality: 80, accuracy: null },
            { repetitions: 10, quality: 80, accuracy: null }
        ),
        {
            playerScore: 93,
            opponentScore: 93,
            result: "draw"
        }
    );
    assert.equal(
        calculateBattleOutcome(
            { repetitions: 12, quality: null, accuracy: null },
            { repetitions: 8, quality: null, accuracy: null }
        ).result,
        "win"
    );
});


test("Battle API authenticates players and returns a server-timed result", async () => {
    const baseUrl = await startServer({
        countdownSeconds: 0.02,
        durationSeconds: 0.12,
        disconnectTtlMs: 100,
        roomTtlMs: 10_000,
        resultTtlMs: 10_000
    });
    const created = await battleRequest(
        baseUrl,
        "/api/battle/rooms",
        { method: "POST" }
    );
    assert.equal(created.status, 201);
    const first = created.body;
    const joined = await battleRequest(
        baseUrl,
        `/api/battle/rooms/${first.roomCode}/join`,
        { method: "POST" }
    );
    assert.equal(joined.status, 201);
    const second = joined.body;

    const unauthorized = await battleRequest(
        baseUrl,
        `/api/battle/rooms/${first.roomCode}`,
        {
            credentials: {
                roomCode: first.roomCode,
                playerId: first.playerId,
                token: "incorrect"
            }
        }
    );
    assert.equal(unauthorized.status, 401);

    for (const credentials of [first, second]) {
        const selection = await battleRequest(
            baseUrl,
            `/api/battle/rooms/${first.roomCode}/exercise`,
            {
                method: "POST",
                credentials,
                body: { exerciseId: "squat" }
            }
        );
        assert.equal(selection.status, 200);
    }
    for (const credentials of [first, second]) {
        const ready = await battleRequest(
            baseUrl,
            `/api/battle/rooms/${first.roomCode}/ready`,
            {
                method: "POST",
                credentials,
                body: { ready: true }
            }
        );
        assert.equal(ready.status, 200);
    }

    await waitForSnapshot(baseUrl, first, "active");
    const invalidMetrics = await battleRequest(
        baseUrl,
        `/api/battle/rooms/${first.roomCode}/metrics`,
        {
            method: "POST",
            credentials: first,
            body: { repetitions: -1, quality: 150, accuracy: null }
        }
    );
    assert.equal(invalidMetrics.status, 400);

    for (const [credentials, metrics] of [
        [first, { repetitions: 12, quality: 80, accuracy: 90 }],
        [second, { repetitions: 8, quality: 72, accuracy: 85 }]
    ]) {
        const submitted = await battleRequest(
            baseUrl,
            `/api/battle/rooms/${first.roomCode}/metrics`,
            { method: "POST", credentials, body: metrics }
        );
        assert.equal(submitted.status, 200);
    }

    const result = await waitForSnapshot(baseUrl, first, "result");
    assert.equal(result.reason, "time");
    assert.equal(result.outcome.result, "win");
    assert.equal(result.winnerId, first.playerId);
    assert.equal(result.players[0].repetitions, 12);
});


test("expired rooms cannot be rejoined or read", async () => {
    const baseUrl = await startServer({ roomTtlMs: 25 });
    const created = await battleRequest(
        baseUrl,
        "/api/battle/rooms",
        { method: "POST" }
    );
    await new Promise(resolve => setTimeout(resolve, 35));
    const expired = await battleRequest(
        baseUrl,
        `/api/battle/rooms/${created.body.roomCode}`,
        { credentials: created.body }
    );
    assert.equal(expired.status, 404);
});
