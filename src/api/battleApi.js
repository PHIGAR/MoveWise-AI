const API_PREFIX = "/api/battle/rooms";
const CREDENTIALS_KEY = "movewise_battle_credentials";


export async function createBattleRoom(durationSeconds = 60) {
    return request(API_PREFIX, { method: "POST", body: { durationSeconds } });
}


export async function joinBattleRoom(roomCode) {
    if (!/^[A-Z0-9]{12}$/i.test(roomCode)) throw new Error("กรอกรหัสห้อง 12 ตัวอักษรให้ครบ");
    return request(
        `${API_PREFIX}/${encodeURIComponent(roomCode)}/join`,
        { method: "POST" }
    );
}


export async function getBattleSnapshot(credentials) {
    return request(
        `${API_PREFIX}/${encodeURIComponent(credentials.roomCode)}`,
        { credentials }
    );
}


export async function selectBattleExercise(credentials, exerciseId) {
    return request(
        `${roomPath(credentials)}/exercise`,
        { method: "POST", credentials, body: { exerciseId } }
    );
}


export async function setBattleReady(credentials, ready) {
    return request(
        `${roomPath(credentials)}/ready`,
        { method: "POST", credentials, body: { ready } }
    );
}

export async function leaveBattleRoom(credentials) {
    return request(`${roomPath(credentials)}/leave`, { method: 'POST', credentials, body: {} });
}


export async function submitBattleMetrics(credentials, metrics) {
    return request(
        `${roomPath(credentials)}/metrics`,
        { method: "POST", credentials, body: metrics }
    );
}


export function subscribeToBattle(credentials, onState, onError) {
    const url = new URL(
        `${roomPath(credentials)}/events`,
        window.location.href
    );
    url.searchParams.set("playerId", credentials.playerId);
    url.searchParams.set("token", credentials.token);
    const events = new EventSource(url);
    events.addEventListener("battle", event => {
        try {
            onState(JSON.parse(event.data));
        }
        catch (error) {
            events.close();
            onError(error);
        }
    });
    events.addEventListener("error", () => {
        onError(new Error(events.readyState === EventSource.CLOSED
            ? "การเชื่อมต่อ Battle ปิดแล้ว โปรดกลับเข้าห้องอีกครั้ง"
            : "การเชื่อมต่อสะดุด กำลังเชื่อมต่อใหม่อัตโนมัติ…"));
    });
    return () => events.close();
}


export function saveBattleCredentials(credentials) {
    try { sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials)); } catch { /* In-memory room remains usable. */ }
}


export function getSavedBattleCredentials() {
    let value;
    try { value = sessionStorage.getItem(CREDENTIALS_KEY); } catch { return null; }
    if (!value) return null;
    try {
        const credentials = JSON.parse(value);
        if (
            typeof credentials?.roomCode === "string" &&
            typeof credentials?.playerId === "string" &&
            typeof credentials?.token === "string"
        ) {
            return credentials;
        }
        clearBattleCredentials();
    }
    catch {
        clearBattleCredentials();
    }
    return null;
}


export function clearBattleCredentials() {
    try { sessionStorage.removeItem(CREDENTIALS_KEY); } catch { /* Storage may be blocked. */ }
}


function roomPath(credentials) {
    return `${API_PREFIX}/${encodeURIComponent(credentials.roomCode)}`;
}


async function request(path, options = {}) {
    const headers = new Headers();
    if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }
    if (options.credentials) {
        headers.set(
            "Authorization",
            `Bearer ${options.credentials.token}`
        );
        headers.set(
            "X-Battle-Player",
            options.credentials.playerId
        );
    }
    const response = await fetch(path, {
        method: options.method ?? "GET",
        headers,
        signal: AbortSignal.timeout(12000),
        body: options.body === undefined
            ? undefined
            : JSON.stringify(options.body)
    });
    let result;
    try {
        result = await response.json();
    }
    catch {
        throw new Error("เซิร์ฟเวอร์ส่งข้อมูล Battle ไม่ถูกต้อง");
    }
    if (!response.ok) {
        throw new Error(result.error ?? "ไม่สามารถเชื่อมต่อ Battle ได้");
    }
    return result;
}
