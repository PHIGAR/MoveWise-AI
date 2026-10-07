import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
    createMoveWiseServer
} from "../server.mjs";
import {
    getOptionalAICoaching,
    requestAICoaching
} from "../src/api/aiCoach.js";

const validInput = {
    exercise: "Squat",
    repetitions: 10,
    quality: 82,
    metrics: {
        kneeAngle: 84,
        depth: 91,
        symmetry: 88
    },
    feedback: ["รักษาแนวเข่าให้ตรงกับปลายเท้า"]
};

const mockCoaching = {
    summary: "ควบคุมท่าได้ดี",
    strengths: ["ทำได้ครบ 10 ครั้ง"],
    improvement: ["รักษาแนวเข่าให้มั่นคง"],
    next_tip: "ฝึกต่อด้วยจังหวะเดิม"
};

const servers = new Set();

after(async () => {
    await Promise.all([...servers].map(server =>
        new Promise(resolve => server.close(resolve))
    ));
});


async function startServer(options) {
    const server = createMoveWiseServer(options);
    servers.add(server);
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    return `http://127.0.0.1:${server.address().port}`;
}


test("rejects malformed and invalid feedback input", async () => {
    const baseUrl = await startServer({
        apiKey: "test-key",
        fetchImpl: async () => {
            throw new Error("Gemini must not be called");
        }
    });

    const malformed = await fetch(`${baseUrl}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{"
    });
    assert.equal(malformed.status, 400);

    const invalid = await fetch(`${baseUrl}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validInput, quality: 101 })
    });
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /quality/i);
});


test("returns service unavailable when the API key is missing", async () => {
    const baseUrl = await startServer({
        apiKey: "",
        fetchImpl: async () => {
            throw new Error("Gemini must not be called");
        }
    });

    const response = await fetch(`${baseUrl}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput)
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
        error: "AI coaching is not configured"
    });
});


test("sends localized movement data to a mocked Gemini API", async () => {
    let request;
    const baseUrl = await startServer({
        apiKey: "test-key",
        model: "gemini-test-model",
        fetchImpl: async (url, options) => {
            request = { url, options };
            return new Response(JSON.stringify({
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify(mockCoaching)
                        }]
                    }
                }]
            }), { status: 200 });
        }
    });

    const response = await fetch(`${baseUrl}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput)
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), mockCoaching);
    assert.equal(
        request.url,
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent"
    );
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers["x-goog-api-key"], "test-key");
    const requestBody = JSON.parse(request.options.body);
    const prompt = JSON.parse(requestBody.contents[0].parts[0].text);
    assert.deepEqual(prompt.metrics, {
        "มุมเข่า": 84,
        "ความลึก": 91,
        "สมดุลซ้าย–ขวา": 88
    });
    assert.equal(requestBody.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(
        requestBody.generationConfig.responseSchema.properties.improvement,
        { type: "ARRAY", items: { type: "STRING" } }
    );
    assert.match(
        requestBody.systemInstruction.parts[0].text,
        /Do not perform pose detection/
    );
});


test("normalizes Gemini JSON wrapped in a markdown code fence", async () => {
    const baseUrl = await startServer({
        apiKey: "test-key",
        fetchImpl: async () => new Response(JSON.stringify({
            candidates: [{
                content: {
                    parts: [{
                        text: `\`\`\`json\n${JSON.stringify({
                            ...mockCoaching,
                            improvement: "เพิ่มการควบคุมแนวเข่า"
                        })}\n\`\`\``
                    }]
                }
            }]
        }), { status: 200 })
    });

    const response = await fetch(`${baseUrl}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput)
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        ...mockCoaching,
        improvement: ["เพิ่มการควบคุมแนวเข่า"]
    });
});


test("maps Gemini quota and malformed responses to a handled fallback status", async () => {
    const quotaServer = await startServer({
        apiKey: "test-key",
        fetchImpl: async () => new Response(JSON.stringify({
            error: { code: 429, status: "RESOURCE_EXHAUSTED" }
        }), { status: 429 })
    });

    const quotaResponse = await fetch(`${quotaServer}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput)
    });
    assert.equal(quotaResponse.status, 502);
    assert.deepEqual(await quotaResponse.json(), {
        error: "AI coaching is temporarily unavailable"
    });

    const malformedServer = await startServer({
        apiKey: "test-key",
        fetchImpl: async () => new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: "not json" }] } }]
        }), { status: 200 })
    });
    const malformedResponse = await fetch(`${malformedServer}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput)
    });
    assert.equal(malformedResponse.status, 502);
});


test("times out through the same optional fallback response", async () => {
    const baseUrl = await startServer({
        apiKey: "test-key",
        fetchImpl: async () => {
            throw Object.assign(new Error("timed out"), {
                name: "TimeoutError"
            });
        }
    });

    const response = await fetch(`${baseUrl}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput)
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
        error: "AI coaching is temporarily unavailable"
    });
});


test("serves the existing app without exposing environment files", async () => {
    const baseUrl = await startServer({ apiKey: "" });
    const homeResponse = await fetch(baseUrl);
    assert.equal(homeResponse.status, 200);
    assert.match(await homeResponse.text(), /MoveWise/);

    const envResponse = await fetch(`${baseUrl}/.env.example`);
    assert.equal(envResponse.status, 404);
});


test("frontend API helper sends the payload and parses coaching", async () => {
    let request;
    const coaching = await requestAICoaching(validInput, async (url, options) => {
        request = { url, options };
        return new Response(JSON.stringify(mockCoaching), { status: 200 });
    });

    assert.deepEqual(coaching, mockCoaching);
    assert.equal(request.url, "/api/ai/feedback");
    assert.equal(request.options.method, "POST");
    assert.deepEqual(JSON.parse(request.options.body), validInput);
});


test("frontend retains its existing feedback when the API request fails", async () => {
    const existingFeedback = {
        summary: "MoveWise local summary",
        recommendation: "MoveWise local recommendation"
    };

    const result = await getOptionalAICoaching(
        validInput,
        existingFeedback,
        async () => new Response("unavailable", { status: 503 })
    );

    assert.equal(result.available, false);
    assert.equal(result.coaching, existingFeedback);
    assert.equal(result.status, 503);
});


test("frontend fallback exposes the endpoint HTTP status for local diagnosis", async () => {
    const result = await getOptionalAICoaching(
        validInput,
        null,
        async () => new Response("Not found", { status: 404 })
    );

    assert.equal(result.available, false);
    assert.equal(result.status, 404);
});


test("frontend accepts the Gemini coaching schema with improvement arrays", async () => {
    const coaching = await requestAICoaching(
        validInput,
        async () => new Response(JSON.stringify(mockCoaching), { status: 200 })
    );

    assert.deepEqual(coaching, mockCoaching);
});
