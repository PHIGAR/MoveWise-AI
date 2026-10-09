import { randomBytes, timingSafeEqual } from "node:crypto";
import {
    createBattleState,
    transitionBattleState
} from "./battleState.js";
import {
    BATTLE_COUNTDOWN_SECONDS,
    BATTLE_DISCONNECT_TTL_MS,
    BATTLE_DURATION_SECONDS,
    BATTLE_RESULT_TTL_MS,
    BATTLE_ROOM_TTL_MS
} from "./battleConfig.js";
import { calculateBattleOutcome } from "./battleScoring.js";


export function createBattleService(options = {}) {
    const rooms = new Map();
    const now = options.now ?? Date.now;
    const createId = options.createId ?? (() =>
        randomBytes(18).toString("hex")
    );
    const createCode = options.createCode ?? (() =>
        randomBytes(6).toString("hex").toUpperCase()
    );
    const countdownSeconds =
        options.countdownSeconds ?? BATTLE_COUNTDOWN_SECONDS;
    const durationSeconds =
        options.durationSeconds ?? BATTLE_DURATION_SECONDS;
    const roomTtlMs = options.roomTtlMs ?? BATTLE_ROOM_TTL_MS;
    const disconnectTtlMs =
        options.disconnectTtlMs ?? BATTLE_DISCONNECT_TTL_MS;
    const resultTtlMs =
        options.resultTtlMs ?? BATTLE_RESULT_TTL_MS;
    let shuttingDown = false;

    function createRoom() {
        let code;
        do {
            code = createCode();
        } while (rooms.has(code));

        const playerId = createId();
        const playerToken = createId();
        const room = makeRoom(
            code,
            now() + roomTtlMs,
            countdownSeconds,
            durationSeconds
        );
        room.state = transitionBattleState(
            room.state,
            "CREATE_ROOM",
            { roomCode: code, playerId }
        );
        room.players.set(playerId, makePlayer(playerToken));
        rooms.set(code, room);
        return credentials(room, playerId, playerToken);
    }

    function joinRoom(rawCode) {
        const room = findRoom(rawCode);
        const playerId = createId();
        const playerToken = createId();
        room.state = transitionBattleState(
            room.state,
            "JOIN_ROOM",
            { playerId }
        );
        room.state = transitionBattleState(
            room.state,
            "START_SELECTION"
        );
        room.players.set(playerId, makePlayer(playerToken));
        room.expiresAt = now() + roomTtlMs;
        publish(room);
        return credentials(room, playerId, playerToken);
    }

    function getSnapshot(code, playerId, token) {
        const room = findRoom(code);
        authorize(room, playerId, token);
        room.players.get(playerId).lastSeenAt = now();
        return snapshot(room);
    }

    function subscribe(code, playerId, token, response) {
        const room = findRoom(code);
        const player = authorize(room, playerId, token);
        player.lastSeenAt = now();
        player.connected = true;
        clearTimeout(room.disconnectTimers.get(playerId));
        room.disconnectTimers.delete(playerId);
        if (!room.connections.has(playerId)) {
            room.connections.set(playerId, new Set());
        }
        room.connections.get(playerId).add(response);
        room.state = transitionBattleState(
            room.state,
            "RECONNECT",
            { playerId }
        );
        writeEvent(response, snapshot(room));
        publish(room);

        return () => {
            const connections = room.connections.get(playerId);
            connections?.delete(response);
            if (connections?.size) return;
            room.connections.delete(playerId);
            disconnect(room, playerId);
        };
    }

    function selectExercise(code, playerId, token, exerciseId) {
        const room = authorizedRoom(code, playerId, token);
        room.state = transitionBattleState(
            room.state,
            "SELECT_EXERCISE",
            { playerId, exerciseId }
        );
        publish(room);
        return snapshot(room);
    }

    function setReady(code, playerId, token, ready) {
        const room = authorizedRoom(code, playerId, token);
        if (typeof ready !== "boolean") {
            throw serviceError(400, "ready must be a boolean");
        }
        room.state = transitionBattleState(
            room.state,
            "SET_READY",
            { playerId, ready }
        );

        if (
            room.state.players.length === 2 &&
            room.state.players.every(player => player.ready)
        ) {
            const countdownStartsAt =
                now() + countdownSeconds * 1000;
            room.state = transitionBattleState(
                room.state,
                "START_COUNTDOWN",
                { countdownStartsAt }
            );
            clearTimeout(room.timers.countdown);
            room.timers.countdown = setTimeout(() => {
                if (room.state.status !== "countdown") return;
                room.state = transitionBattleState(
                    room.state,
                    "START_BATTLE",
                    { startedAt: now() }
                );
                room.expiresAt = now() +
                    durationSeconds * 1000 +
                    disconnectTtlMs;
                publish(room);
                room.timers.duration = setTimeout(
                    () => finish(room, "time"),
                    durationSeconds * 1000
                );
                room.timers.duration.unref?.();
            }, countdownSeconds * 1000);
            room.timers.countdown.unref?.();
        }

        publish(room);
        return snapshot(room);
    }

    function submitMetrics(code, playerId, token, metrics) {
        const room = authorizedRoom(code, playerId, token);
        if (room.state.status !== "active") {
            throw serviceError(409, "Battle is not active");
        }
        const validationError = validateMetrics(metrics);
        if (validationError) {
            throw serviceError(400, validationError);
        }
        const player = room.players.get(playerId);
        player.metrics = {
            repetitions: metrics.repetitions,
            quality: metrics.quality,
            accuracy: metrics.accuracy
        };
        player.lastSeenAt = now();
        publish(room);
        return snapshot(room);
    }

    function disconnect(room, playerId) {
        if (shuttingDown) return;
        const player = room.players.get(playerId);
        if (!player || room.state.status === "result") return;
        player.connected = false;
        if (room.state.players.some(item => item.id === playerId)) {
            room.state = transitionBattleState(
                room.state,
                "DISCONNECT",
                { playerId, disconnectedAt: now() }
            );
        }
        if (room.state.status === "finished") {
            const first = room.players.get(room.state.players[0]?.id);
            const second = room.players.get(room.state.players[1]?.id);
            room.outcome = calculateBattleOutcome(
                first?.metrics ?? emptyMetrics(),
                second?.metrics ?? emptyMetrics()
            );
            if (room.state.winnerId) {
                room.outcome = {
                    ...room.outcome,
                    result: room.state.winnerId === room.state.players[0]?.id
                        ? "win"
                        : "loss"
                };
            }
            room.state = transitionBattleState(
                room.state,
                "SHOW_RESULT"
            );
            room.expiresAt = now() + resultTtlMs;
            publish(room);
            return;
        }
        publish(room);
        const timer = setTimeout(() => {
            if (player.connected || room.state.status === "result") return;
            if (room.state.status === "active") {
                finish(room, "opponent-disconnected");
                return;
            }
            expireRoom(room);
        }, disconnectTtlMs);
        timer.unref?.();
        room.disconnectTimers.set(playerId, timer);
    }

    function finish(room, reason) {
        if (room.state.status !== "active") return;
        clearTimeout(room.timers.duration);
        const first = room.players.get(room.state.players[0]?.id);
        const second = room.players.get(room.state.players[1]?.id);
        const outcome = calculateBattleOutcome(
            first?.metrics ?? emptyMetrics(),
            second?.metrics ?? emptyMetrics()
        );
        room.outcome = outcome;
        room.state = transitionBattleState(
            room.state,
            "FINISH_BATTLE",
            {
                finishedAt: now(),
                reason,
                winnerId: outcome.result === "draw"
                    ? null
                    : outcome.result === "win"
                        ? room.state.players[0]?.id
                        : room.state.players[1]?.id
            }
        );
        room.state = transitionBattleState(room.state, "SHOW_RESULT");
        room.expiresAt = now() + resultTtlMs;
        publish(room);
    }

    function expireRoom(room) {
        clearRoomTimers(room);
        for (const responses of room.connections.values()) {
            for (const response of responses) {
                response.end();
            }
        }
        rooms.delete(room.code);
    }

    function sweepExpiredRooms() {
        const timestamp = now();
        for (const room of rooms.values()) {
            if (room.expiresAt <= timestamp) expireRoom(room);
        }
    }

    const cleanupTimer = setInterval(sweepExpiredRooms, 30_000);
    cleanupTimer.unref?.();

    return {
        createRoom,
        joinRoom,
        getSnapshot,
        subscribe,
        selectExercise,
        setReady,
        submitMetrics,
        close() {
            shuttingDown = true;
            clearInterval(cleanupTimer);
            for (const room of rooms.values()) expireRoom(room);
        }
    };

    function authorizedRoom(code, playerId, token) {
        const room = findRoom(code);
        authorize(room, playerId, token);
        room.players.get(playerId).lastSeenAt = now();
        return room;
    }

    function findRoom(rawCode) {
        const code = typeof rawCode === "string"
            ? rawCode.trim().toUpperCase()
            : "";
        const room = rooms.get(code);
        if (!room || room.expiresAt <= now()) {
            if (room) expireRoom(room);
            throw serviceError(404, "Battle room was not found");
        }
        return room;
    }
}


function makeRoom(
    code,
    expiresAt,
    countdownSeconds,
    durationSeconds
) {
    return {
        code,
        state: createBattleState(),
        players: new Map(),
        connections: new Map(),
        disconnectTimers: new Map(),
        timers: {},
        outcome: null,
        countdownSeconds,
        durationSeconds,
        expiresAt
    };
}


function makePlayer(token) {
    return {
        token,
        connected: true,
        metrics: emptyMetrics(),
        lastSeenAt: Date.now()
    };
}


function credentials(room, playerId, token) {
    return {
        roomCode: room.code,
        playerId,
        token,
        snapshot: snapshot(room)
    };
}


function snapshot(room) {
    return {
        ...room.state,
        players: room.state.players.map(item => {
            const player = room.players.get(item.id);
            return {
                ...item,
                repetitions: player?.metrics.repetitions ?? 0,
                quality: player?.metrics.quality ?? null,
                accuracy: player?.metrics.accuracy ?? null
            };
        }),
        countdownSeconds: room.countdownSeconds,
        durationSeconds: room.durationSeconds,
        outcome: room.outcome
    };
}


function authorize(room, playerId, token) {
    const player = room.players.get(playerId);
    if (!player || !safeEqual(player.token, token)) {
        throw serviceError(401, "Invalid Battle credentials");
    }
    return player;
}


function safeEqual(expected, actual) {
    if (typeof actual !== "string") return false;
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);
    return expectedBuffer.length === actualBuffer.length &&
        timingSafeEqual(expectedBuffer, actualBuffer);
}


function validateMetrics(metrics) {
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
        return "Metrics must be an object";
    }
    if (
        !Number.isSafeInteger(metrics.repetitions) ||
        metrics.repetitions < 0 ||
        metrics.repetitions > 10_000
    ) {
        return "repetitions must be an integer from 0 to 10000";
    }
    for (const field of ["quality", "accuracy"]) {
        if (
            metrics[field] !== null &&
            (!Number.isFinite(metrics[field]) ||
                metrics[field] < 0 ||
                metrics[field] > 100)
        ) {
            return `${field} must be null or a percentage from 0 to 100`;
        }
    }
    return null;
}


function emptyMetrics() {
    return {
        repetitions: 0,
        quality: null,
        accuracy: null
    };
}


function publish(room) {
    const event = snapshot(room);
    for (const responses of room.connections.values()) {
        for (const response of responses) writeEvent(response, event);
    }
}


function writeEvent(response, event) {
    if (response.destroyed || response.writableEnded) return;
    response.write(`event: battle\n`);
    response.write(`data: ${JSON.stringify(event)}\n\n`);
}


function clearRoomTimers(room) {
    Object.values(room.timers).forEach(clearTimeout);
    for (const timer of room.disconnectTimers.values()) {
        clearTimeout(timer);
    }
}


function serviceError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
