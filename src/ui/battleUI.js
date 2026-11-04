import { calculateBattleOutcome } from "../core/battle/battleScoring.js";
import {
    clearBattleCredentials,
    createBattleRoom,
    getBattleSnapshot,
    getSavedBattleCredentials,
    joinBattleRoom,
    saveBattleCredentials,
    selectBattleExercise,
    setBattleReady,
    submitBattleMetrics,
    subscribeToBattle
} from "../api/battleApi.js";
import { getAvailableExercises } from "../exercises/exerciseRegistry.js";


export function createBattleUI({
    screen,
    showScreen,
    onStart,
    onResult
}) {
    const liveHud = document.getElementById("online-battle-hud");
    const message = document.getElementById("battle-message");
    const setup = document.querySelector(".battle-setup");
    const lobby = document.getElementById("battle-lobby");
    const roomCodeElement = document.getElementById("battle-room-code");
    const statusElement = document.getElementById("battle-status");
    const playersElement = document.getElementById("battle-players");
    const exerciseSelect = document.getElementById("battle-exercises");
    const readyButton = document.getElementById("battle-ready");
    const resultElement = document.getElementById("battle-result");
    const createButton = document.getElementById("battle-create");
    const joinButton = document.getElementById("battle-join");
    const joinInput = document.getElementById("battle-code-input");
    const homeButton = document.getElementById("battle-home");
    let credentials = null;
    let unsubscribe = null;
    let currentState = null;
    let activeStarted = false;
    let resultShown = false;
    let statusTimer = null;
    let actionPending = false;
    let connectionError = "";

    function setMessage(text, isError = false) {
        connectionError = isError ? text : "";
        if (!message) return;
        message.textContent = text;
        message.classList.toggle("is-error", isError);
        message.hidden = !text;
        if (isError && liveHud && !liveHud.hidden) document.getElementById("online-match-status").textContent = text;
    }

    function showBattle() {
        showScreen(screen);
        const saved = getSavedBattleCredentials();
        if (saved && !credentials) {
            runAction(async () => {
                try { connect(saved, await getBattleSnapshot(saved)); }
                catch (error) { clearBattleCredentials(); throw error; }
            });
        }
    }

    function connect(nextCredentials, initialSnapshot) {
        credentials = nextCredentials;
        currentState = initialSnapshot ?? null;
        activeStarted = false;
        resultShown = false;
        saveBattleCredentials(credentials);
        if (unsubscribe) unsubscribe();
        unsubscribe = subscribeToBattle(
            credentials,
            updateState,
            error => setMessage(error.message, true)
        );
        if (initialSnapshot) updateState(initialSnapshot);
    }

    function updateState(state) {
        currentState = state;
        if (setup) setup.hidden = state.status !== "result";
        if (roomCodeElement) {
            roomCodeElement.textContent = state.roomCode;
        }
        if (lobby) lobby.hidden = false;
        if (resultElement) resultElement.hidden = state.status !== "result";
        renderPlayers(state);
        renderExercises(state);
        if (statusElement) {
            statusElement.textContent = statusText(state);
        }
        clearInterval(statusTimer);
        if (liveHud) liveHud.hidden = state.status !== "active";
        if (["countdown", "active"].includes(state.status)) {
            const tick = () => {
                if (statusElement) statusElement.textContent = statusText(state);
                if (state.status === "active") renderLiveMatch(state);
            };
            tick();
            statusTimer = setInterval(tick, 250);
        }
        setMessage("");
        if (state.status === "active" && !activeStarted) {
            activeStarted = true;
            onStart(state);
        }
        if (state.status === "result" && !resultShown) {
            resultShown = true;
            renderResult(state);
            onResult(state);
            clearBattleCredentials();
        }
    }

    function renderLiveMatch(state) {
        if (!liveHud) return;
        const own = state.players.find(player => player.id === credentials?.playerId);
        const other = state.players.find(player => player.id !== credentials?.playerId);
        if (!own || !other) return;
        const outcome = calculateBattleOutcome(own, other);
        document.getElementById("online-own-score").textContent = `${outcome.playerScore} คะแนน`;
        document.getElementById("online-other-score").textContent = `${outcome.opponentScore} คะแนน`;
        document.getElementById("online-own-reps").textContent = `${own.repetitions} ครั้ง`;
        document.getElementById("online-other-reps").textContent = `${other.repetitions} ครั้ง`;
        const seconds = Math.max(0, Math.ceil((state.startedAt + state.durationSeconds * 1000 - Date.now()) / 1000));
        document.getElementById("online-match-timer").textContent = `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;
        document.getElementById("online-match-status").textContent = connectionError || (other.connected ? "กำลังแข่งขัน · คะแนนสด" : "รอคู่แข่งเชื่อมต่อใหม่");
    }

    function renderPlayers(state) {
        if (!playersElement) return;
        playersElement.replaceChildren(...state.players.map((player, index) => {
            const item = document.createElement("div");
            item.className = "battle-player";
            const name = document.createElement("strong");
            name.textContent = player.id === credentials?.playerId
                ? "คุณ"
                : `ผู้เล่น ${index + 1}`;
            const detail = document.createElement("span");
            detail.textContent = state.status === "active"
                ? `${player.repetitions ?? 0} ครั้ง · ${player.connected ? "เชื่อมต่อแล้ว" : "กำลังเชื่อมต่อใหม่"}`
                : player.connected
                ? player.ready ? "พร้อมแล้ว" : "เชื่อมต่อแล้ว"
                : "กำลังเชื่อมต่อใหม่";
            item.append(name, detail);
            return item;
        }));
    }

    function renderExercises(state) {
        if (!exerciseSelect) return;
        const choosing = [
            "exercise-selection",
            "ready"
        ].includes(state.status);
        exerciseSelect.hidden = !choosing;
        readyButton.hidden = state.status !== "ready";
        exerciseSelect.replaceChildren(...getAvailableExercises().map(exercise => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "battle-exercise-option";
            button.textContent = exercise.name;
            button.setAttribute(
                "aria-pressed",
                String(state.players.find(player =>
                    player.id === credentials?.playerId
                )?.exerciseId === exercise.id)
            );
            button.disabled = !choosing;
            button.addEventListener("click", () => runAction(async () => {
                updateState(await selectBattleExercise(
                    credentials,
                    exercise.id
                ));
            }));
            return button;
        }));
        if (readyButton) {
            const player = state.players.find(item =>
                item.id === credentials?.playerId
            );
            readyButton.textContent = player?.ready
                ? "ยกเลิกความพร้อม"
                : "พร้อมเริ่ม";
            readyButton.disabled = !state.exerciseId;
        }
    }

    function renderResult(state) {
        const headline = document.getElementById("battle-result-title");
        const score = document.getElementById("battle-result-score");
        const summary = document.getElementById("battle-result-summary");
        const playerIndex = state.players.findIndex(player =>
            player.id === credentials?.playerId
        );
        const ownScore = playerIndex === 0
            ? state.outcome?.playerScore
            : state.outcome?.opponentScore;
        const otherScore = playerIndex === 0
            ? state.outcome?.opponentScore
            : state.outcome?.playerScore;
        const ownResult = state.outcome?.result === "draw"
            ? "เสมอกัน"
            : state.winnerId === credentials?.playerId
                ? "คุณชนะ!"
                : "ครั้งหน้าลองใหม่";
        if (headline) headline.textContent = ownResult;
        if (score) score.textContent =
            `${ownScore ?? 0} – ${otherScore ?? 0}`;
        if (summary) {
            const ownPlayer = state.players[playerIndex];
            summary.textContent =
                `${ownPlayer?.repetitions ?? 0} ครั้ง · ${state.reason === "time" ? "ครบเวลา" : "คู่แข่งออกจาก Battle"}`;
        }
    }

    async function runAction(action) {
        if (actionPending) return;
        actionPending = true;
        [createButton, joinButton, readyButton].forEach(button => { if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); } });
        try {
            setMessage("");
            await action();
        }
        catch (error) {
            setMessage(error.name === "TimeoutError" ? "เซิร์ฟเวอร์ตอบช้า โปรดลองอีกครั้ง" : error.message, true);
        } finally {
            actionPending = false;
            [createButton, joinButton, readyButton].forEach(button => { if (button) { button.disabled = false; button.removeAttribute("aria-busy"); } });
            if (currentState) renderExercises(currentState);
        }
    }
    joinInput?.addEventListener("keydown", event => {
        if (event.key === "Enter") joinButton.click();
    });

    createButton?.addEventListener("click", () => runAction(async () => {
        const result = await createBattleRoom();
        connect(result, result.snapshot);
        showBattle();
    }));
    joinButton?.addEventListener("click", () => runAction(async () => {
        const result = await joinBattleRoom(
            (joinInput?.value ?? "").trim().toUpperCase()
        );
        connect(result, result.snapshot);
        showBattle();
    }));
    readyButton?.addEventListener("click", () => runAction(async () => {
        const player = currentState?.players.find(item =>
            item.id === credentials?.playerId
        );
        updateState(await setBattleReady(credentials, !player?.ready));
    }));
    homeButton?.addEventListener("click", () => showScreen(
        document.getElementById("home-screen")
    ));

    document.getElementById("home-battle-button")?.addEventListener("click", showBattle);
    document.getElementById("battle-reconnect")?.addEventListener("click", () => runAction(async () => {
        const saved = credentials ?? getSavedBattleCredentials();
        if (!saved) throw new Error("ยังไม่มีห้อง โปรดสร้างหรือเข้าร่วมห้องก่อน");
        try { connect(saved, await getBattleSnapshot(saved)); }
        catch (error) { clearBattleCredentials(); credentials = null; throw error; }
    }));

    return {
        open: showBattle,
        reportMetrics(metrics) {
            if (!credentials || currentState?.status !== "active") return;
            return submitBattleMetrics(credentials, metrics);
        },
        isActive() {
            return currentState?.status === "active";
        }
    };
}


function statusText(state) {
    if (state.status === "waiting") return "กำลังรอผู้เล่นอีกคน";
    if (state.status === "exercise-selection") return "เลือกท่าที่จะฝึกให้ตรงกัน";
    if (state.status === "ready") return "เลือกท่าเดียวกันแล้ว พร้อมเริ่มได้เลย";
    if (state.status === "countdown") {
        const remaining = Math.max(
            1,
            Math.ceil((state.countdownStartsAt - Date.now()) / 1000)
        );
        return `เตรียมตัว · ${remaining}`;
    }
    if (state.status === "active") return "Battle กำลังดำเนินอยู่";
    if (state.status === "result") return "จบการแข่งขัน";
    return "กำลังเชื่อมต่อ";
}
