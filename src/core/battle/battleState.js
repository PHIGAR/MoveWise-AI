export const BATTLE_STATES = Object.freeze([
    "idle",
    "creating",
    "waiting",
    "joined",
    "exercise-selection",
    "ready",
    "countdown",
    "active",
    "finished",
    "result"
]);

export const BATTLE_EXERCISES = Object.freeze([
    "jumping-jack",
    "squat",
    "push-up",
    "lunge",
    "bicep-curl"
]);


export function createBattleState() {
    return {
        status: "idle",
        roomCode: null,
        players: [],
        exerciseId: null,
        countdownStartsAt: null,
        startedAt: null,
        finishedAt: null,
        reason: null,
        winnerId: null
    };
}


export function transitionBattleState(state, event, payload = {}) {
    if (
        !state ||
        !BATTLE_STATES.includes(state.status) ||
        !Array.isArray(state.players)
    ) {
        throw new TypeError("Invalid Battle state");
    }

    const next = {
        ...state,
        players: state.players.map(player => ({ ...player }))
    };

    switch (event) {
        case "CREATE_ROOM": {
            requireStatus(state, "idle", event);
            requireString(payload.roomCode, "roomCode");
            requireString(payload.playerId, "playerId");
            next.status = "waiting";
            next.roomCode = payload.roomCode;
            next.players = [{
                id: payload.playerId,
                connected: true,
                ready: false,
                exerciseId: null
            }];
            break;
        }
        case "JOIN_ROOM": {
            requireStatus(state, "waiting", event);
            if (state.players.length !== 1) {
                throw new RangeError("Battle room is full");
            }
            requireString(payload.playerId, "playerId");
            if (payload.playerId === state.players[0].id) {
                throw new RangeError("Player is already in this room");
            }
            next.status = "joined";
            next.players.push({
                id: payload.playerId,
                connected: true,
                ready: false,
                exerciseId: null
            });
            break;
        }
        case "START_SELECTION": {
            requireStatus(state, "joined", event);
            next.status = "exercise-selection";
            break;
        }
        case "SELECT_EXERCISE": {
            if (!["exercise-selection", "ready"].includes(state.status)) {
                invalidTransition(state.status, event);
            }
            if (!BATTLE_EXERCISES.includes(payload.exerciseId)) {
                throw new RangeError("Exercise is not supported in Battle");
            }
            const player = requirePlayer(next, payload.playerId);
            player.exerciseId = payload.exerciseId;
            next.players.forEach(item => {
                item.ready = false;
            });
            next.exerciseId = next.players.length === 2 &&
                next.players.every(item =>
                    item.exerciseId === payload.exerciseId
                )
                ? payload.exerciseId
                : null;
            next.status = next.exerciseId
                ? "ready"
                : "exercise-selection";
            break;
        }
        case "SET_READY": {
            requireStatus(state, "ready", event);
            const player = requirePlayer(next, payload.playerId);
            player.ready = Boolean(payload.ready);
            break;
        }
        case "START_COUNTDOWN": {
            requireStatus(state, "ready", event);
            if (
                next.players.length !== 2 ||
                !next.exerciseId ||
                next.players.some(player =>
                    !player.connected ||
                    !player.ready ||
                    player.exerciseId !== next.exerciseId
                )
            ) {
                throw new RangeError("Both players must be connected, ready, and on the same exercise");
            }
            if (!Number.isFinite(payload.countdownStartsAt)) {
                throw new TypeError("countdownStartsAt must be a timestamp");
            }
            next.status = "countdown";
            next.countdownStartsAt = payload.countdownStartsAt;
            break;
        }
        case "START_BATTLE": {
            requireStatus(state, "countdown", event);
            if (!Number.isFinite(payload.startedAt)) {
                throw new TypeError("startedAt must be a timestamp");
            }
            next.status = "active";
            next.startedAt = payload.startedAt;
            break;
        }
        case "FINISH_BATTLE": {
            requireStatus(state, "active", event);
            next.status = "finished";
            next.finishedAt = Number.isFinite(payload.finishedAt)
                ? payload.finishedAt
                : Date.now();
            next.reason = payload.reason || "completed";
            next.winnerId = payload.winnerId ?? null;
            break;
        }
        case "SHOW_RESULT": {
            requireStatus(state, "finished", event);
            next.status = "result";
            break;
        }
        case "DISCONNECT": {
            const player = requirePlayer(next, payload.playerId);
            player.connected = false;
            player.ready = false;
            if (state.status === "countdown") {
                next.status = "finished";
                next.finishedAt = Number.isFinite(payload.disconnectedAt)
                    ? payload.disconnectedAt
                    : Date.now();
                next.reason = "opponent-disconnected";
                next.winnerId = next.players.find(item =>
                    item.id !== payload.playerId && item.connected
                )?.id ?? null;
            }
            break;
        }
        case "RECONNECT": {
            const player = requirePlayer(next, payload.playerId);
            if (["finished", "result"].includes(state.status)) {
                throw new RangeError("Finished Battle cannot be reconnected");
            }
            player.connected = true;
            break;
        }
        default:
            throw new RangeError(`Unknown Battle event: ${event}`);
    }

    return next;
}


function requireStatus(state, expected, event) {
    if (state.status !== expected) {
        invalidTransition(state.status, event);
    }
}


function invalidTransition(status, event) {
    throw new RangeError(`Cannot ${event} while Battle is ${status}`);
}


function requirePlayer(state, playerId) {
    const player = state.players.find(item => item.id === playerId);
    if (!player) {
        throw new RangeError("Player is not part of this Battle");
    }
    return player;
}


function requireString(value, field) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${field} must be a non-empty string`);
    }
}
