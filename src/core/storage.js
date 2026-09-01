import {
    validateSession
} from "./session.js";


export const SESSION_STORAGE_KEY =
    "movewise_sessions";


function getStorageArea(
    storage
) {
    if (storage) {
        return storage;
    }

    try {
        return typeof localStorage !== "undefined"
            ? localStorage
            : null;
    }
    catch (error) {
        return null;
    }
}


function readSessions(
    storage
) {
    const storageArea = getStorageArea(storage);

    if (!storageArea) {
        return [];
    }

    try {
        const raw = storageArea.getItem(
            SESSION_STORAGE_KEY
        );

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed.filter(validateSession)
            : [];
    }
    catch (error) {
        return [];
    }
}


function writeSessions(
    sessions,
    storage
) {
    const storageArea = getStorageArea(storage);

    if (!storageArea) {
        return false;
    }

    try {
        storageArea.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify(sessions)
        );
        return true;
    }
    catch (error) {
        return false;
    }
}


export function saveSession(
    session,
    storage
) {
    if (!validateSession(session)) {
        return false;
    }

    const sessions = readSessions(storage);
    const existingIndex = sessions.findIndex(
        item => item.id === session.id
    );

    if (existingIndex >= 0) {
        sessions[existingIndex] = {
            ...session,
            repRecords: Array.isArray(session.repRecords)
                ? session.repRecords.map(record => ({ ...record }))
                : []
        };
    }
    else {
        sessions.push({
            ...session,
            repRecords: Array.isArray(session.repRecords)
                ? session.repRecords.map(record => ({ ...record }))
                : []
        });
    }

    return writeSessions(sessions, storage);
}


export function getSessions(
    storage
) {
    return readSessions(storage).map(session => ({
        ...session,
        repRecords: session.repRecords.map(record => ({ ...record }))
    }));
}


export function getSessionById(
    id,
    storage
) {
    const session = getSessions(storage).find(
        item => item.id === id
    );

    return session || null;
}


export function deleteSession(
    id,
    storage
) {
    const sessions = readSessions(storage);
    const remaining = sessions.filter(
        session => session.id !== id
    );

    if (remaining.length === sessions.length) {
        return false;
    }

    return writeSessions(remaining, storage);
}


export function clearSessions(
    storage
) {
    const storageArea = getStorageArea(storage);

    if (!storageArea) {
        return false;
    }

    try {
        storageArea.removeItem(
            SESSION_STORAGE_KEY
        );
        return true;
    }
    catch (error) {
        return false;
    }
}
