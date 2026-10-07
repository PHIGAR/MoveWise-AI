export async function requestAICoaching(
    payload,
    fetchImpl = globalThis.fetch
) {
    if (typeof fetchImpl !== "function") {
        throw new Error("AI coaching is unavailable");
    }

    if (isLocalDevelopmentOrigin()) {
        console.info("[MoveWise AI Coach] Sending feedback request", {
            endpoint: "/api/ai/feedback",
            method: "POST",
            payload
        });
    }

    const response = await fetchImpl("/api/ai/feedback", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (isLocalDevelopmentOrigin()) {
        console.info("[MoveWise AI Coach] Feedback response", {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get("content-type")
        });
    }

    if (!response.ok) {
        let reason = "AI coaching request failed";
        try {
            const body = await response.json();
            if (typeof body?.error === "string") {
                reason = body.error;
            }
        }
        catch {
            reason = "AI coaching endpoint did not return JSON";
        }

        const error = new Error(reason);
        error.status = response.status;
        throw error;
    }

    const coaching = await response.json();
    if (
        !coaching ||
        typeof coaching.summary !== "string" ||
        !Array.isArray(coaching.strengths) ||
        !coaching.strengths.every(strength => typeof strength === "string") ||
        !Array.isArray(coaching.improvement) ||
        !coaching.improvement.every(item => typeof item === "string") ||
        typeof coaching.next_tip !== "string"
    ) {
        const error = new Error("AI coaching response was invalid");
        error.status = response.status;
        throw error;
    }

    if (isLocalDevelopmentOrigin()) {
        console.info("[MoveWise AI Coach] Coaching fields received", {
            fields: Object.keys(coaching)
        });
    }

    return coaching;
}


export async function getOptionalAICoaching(
    payload,
    fallback,
    fetchImpl = globalThis.fetch
) {
    try {
        return {
            coaching: await requestAICoaching(payload, fetchImpl),
            available: true,
            status: 200
        };
    }
    catch (error) {
        if (isLocalDevelopmentOrigin()) {
            console.warn("[MoveWise AI Coach] Using existing MoveWise feedback", {
                status: error?.status ?? null,
                reason: error?.message ?? "Network request failed"
            });
        }
        return {
            coaching: fallback,
            available: false,
            status: error?.status ?? null
        };
    }
}


function isLocalDevelopmentOrigin() {
    return typeof location !== "undefined" &&
        (
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1"
        );
}
