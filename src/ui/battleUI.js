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
    leaveBattleRoom,
    submitBattleMetrics,
    subscribeToBattle
} from "../api/battleApi.js";
import { getAvailableExercises } from "../exercises/exerciseRegistry.js";


export function createBattleUI({
    screen,
    showScreen,
    onPrepare,
    onCancel,
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
    let readyIntent = false;
    let trackingValid = false;
    let readyTimer = null;
    let readyRequest = false;
    let serverOffset = 0;
    let pendingMetrics = null;
    let metricsUpload = null;
    let lastPlayersSignature = '';
    let lastExerciseSignature = '';
    let connectionGeneration = 0;

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
        const generation = ++connectionGeneration;
        readyRequest = false; pendingMetrics = null; metricsUpload = null;
        credentials = nextCredentials;
        currentState = initialSnapshot ?? null;
        activeStarted = false;
        resultShown = false;
        saveBattleCredentials(credentials);
        if (unsubscribe) unsubscribe();
        unsubscribe = subscribeToBattle(
            credentials,
            state => { if (generation === connectionGeneration) updateState(state); },
            error => { if (generation === connectionGeneration) setMessage(error.message, true); }
        );
        if (initialSnapshot) updateState(initialSnapshot);
    }

    function updateState(state) {
        if (currentState?.revision > state.revision) return;
        if (Number.isFinite(state.serverNow)) serverOffset = state.serverNow - Date.now();
        currentState = state;
        const duration = document.getElementById('battle-duration');
        if (duration) { duration.value = String(state.durationSeconds); duration.disabled = state.status !== 'result'; }
        const localButton = document.getElementById('battle-local-button');
        if (localButton) localButton.hidden = state.status !== 'result';
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
        if (liveHud) liveHud.hidden = !["ready", "countdown", "active"].includes(state.status) || !readyIntent;
        if (["countdown", "active"].includes(state.status)) {
            const tick = () => {
                if (statusElement) statusElement.textContent = statusText(state);
                renderLiveMatch(state);
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
            clearInterval(readyTimer);
            readyIntent = trackingValid = false;
            resultShown = true;
            renderResult(state);
            onResult(state);
            clearBattleCredentials();
            unsubscribe?.(); unsubscribe = null;
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
        const now = Date.now() + serverOffset;
        const seconds = state.status === 'countdown'
            ? Math.max(0, Math.ceil((state.countdownStartsAt - now) / 1000))
            : state.status === 'ready' ? state.durationSeconds
            : Math.max(0, Math.ceil((state.startedAt + state.durationSeconds * 1000 - now) / 1000));
        document.getElementById("online-match-timer").textContent = `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;
        document.getElementById("online-match-status").textContent = connectionError || (state.status === 'countdown' ? `เริ่มใน ${seconds}` : state.status === 'ready' ? (trackingValid ? 'พร้อม · รออีกคน' : 'อยู่ในเฟรมให้มั่นคง 2 วินาที') : (other.connected ? "กำลังแข่งขัน · คะแนนสด" : "รอคู่แข่งเชื่อมต่อใหม่"));
    }

    function renderPlayers(state) {
        if (!playersElement) return;
        const signature = JSON.stringify(state.players);
        if (signature === lastPlayersSignature) return;
        lastPlayersSignature = signature;
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
        const signature = JSON.stringify([state.roomCode, state.status, state.exerciseId, state.players.map(player => [player.id, player.exerciseId, player.ready]), readyIntent]);
        if (signature === lastExerciseSignature) return;
        lastExerciseSignature = signature;
        const choosing = [
            "exercise-selection",
            "ready"
        ].includes(state.status);
        exerciseSelect.hidden = !choosing;
        readyButton.hidden = state.status !== "ready" && !(state.status === 'active' && !readyIntent);
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
            if (state.status === 'active' && !readyIntent) readyButton.textContent = 'เปิดกล้องเพื่อกลับเข้าการฝึก';
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
        const result = await createBattleRoom(Number(document.getElementById('battle-duration').value));
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
        readyIntent = true;
        trackingValid = false;
        if (!await onPrepare(currentState)) { readyIntent = false; onCancel?.(); throw new Error('เตรียมกล้องไม่สำเร็จ โปรดลองอีกครั้ง'); }
        if (currentState.status === 'active') onStart(currentState);
        if (liveHud) liveHud.hidden = false;
        renderLiveMatch(currentState);
        clearInterval(readyTimer);
        readyTimer = setInterval(sendTracking, 400);
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

    const controller = {
        open: showBattle,
        reportMetrics(metrics) {
            if (!credentials || currentState?.status !== "active") return;
            const generation = connectionGeneration;
            pendingMetrics = metrics;
            metricsUpload ??= (async () => {
                while (generation === connectionGeneration && pendingMetrics && credentials && currentState?.status === 'active') {
                    const next = pendingMetrics; pendingMetrics = null;
                    try { await submitBattleMetrics(credentials, next); }
                    catch (error) { if (generation === connectionGeneration) setMessage('ส่งคะแนนสะดุด กำลังลองใหม่…', true); throw error; }
                }
            })().finally(() => { if (generation === connectionGeneration) metricsUpload = null; });
            return metricsUpload;
        },
        isActive() {
            return currentState?.status === "active";
        },
        tracking(valid) {
            if (valid === trackingValid) return;
            trackingValid = valid;
            void sendTracking();
            if (currentState && readyIntent) renderLiveMatch(currentState);
        },
        async cancel() {
            connectionGeneration++;
            readyRequest = false; metricsUpload = null;
            clearInterval(readyTimer);
            readyIntent = trackingValid = false;
            pendingMetrics = null;
            const leaving = credentials;
            credentials = null;
            unsubscribe?.(); unsubscribe = null;
            clearInterval(statusTimer);
            clearBattleCredentials();
            if (liveHud) liveHud.hidden = true;
            onCancel?.();
            if (leaving) { try { await leaveBattleRoom(leaving); } catch (error) { setMessage(error.message, true); } }
            currentState = null;
            if (setup) setup.hidden = false;
            if (lobby) lobby.hidden = true;
            document.getElementById('battle-duration').disabled = false;
            document.getElementById('battle-local-button').hidden = false;
        }
    };
    document.getElementById('battle-leave')?.addEventListener('click', () => void controller.cancel());
    return controller;

    async function sendTracking() {
        if (!readyIntent || !credentials || readyRequest || !['ready', 'countdown'].includes(currentState?.status)) return;
        const generation = connectionGeneration;
        readyRequest = true;
        try {
            const state = await setBattleReady(credentials, trackingValid && !document.hidden);
            if (readyIntent && generation === connectionGeneration) updateState(state);
        } catch (error) { if (generation === connectionGeneration) setMessage(error.message, true); }
        finally { if (generation === connectionGeneration) readyRequest = false; }
    }
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
