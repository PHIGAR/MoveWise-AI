import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerDetector } from '../src/ai/pose/workerBridge.js';

test('worker bridge transfers one frame, drops overlap and preserves numeric results', async () => {
    let worker, finishDetection, terminated = false, bitmapClosed = 0;
    const sent = [];
    const detector = await createWorkerDetector({}, {
        workerFactory: () => worker = {
            postMessage(message, transfer) {
                sent.push({ message, transfer });
                if (message.type === 'detect') finishDetection = () => this.onmessage({ data: { id: message.id, result: { landmarks: [[{ x: .2, y: .3 }]], inferenceMs: 12 } } });
                else queueMicrotask(() => this.onmessage({ data: { id: message.id, result: { delegate: 'CPU' } } }));
            }, terminate() { terminated = true; }
        },
        makeBitmap: async () => ({ close() { bitmapClosed++; } })
    });
    const first = detector.detectForVideo({}, 100);
    assert.equal(await detector.detectForVideo({}, 101), null);
    await Promise.resolve(); finishDetection();
    assert.deepEqual((await first).landmarks[0][0], { x: .2, y: .3 });
    const request = sent.find(item => item.message.type === 'detect');
    assert.equal(request.transfer[0], request.message.bitmap);
    assert.equal(bitmapClosed, 0); // Ownership was transferred to the worker, which closes it.
    await detector.setOptions({ numPoses: 2 });
    detector.close(); assert.equal(terminated, true);
});

test('worker initialization failure terminates the worker for detector fallback', async () => {
    let terminated = false;
    await assert.rejects(createWorkerDetector({}, {
        workerFactory: () => ({ postMessage(message) { queueMicrotask(() => this.onmessage({ data: { id: message.id, error: 'Offscreen WebGL unsupported' } })); }, terminate() { terminated = true; } })
    }), /Offscreen WebGL unsupported/);
    assert.equal(terminated, true);
});

test('worker crash rejects the outstanding frame and releases pending requests', async () => {
    let worker;
    const detector = await createWorkerDetector({}, {
        workerFactory: () => worker = {
            postMessage(message) { if (message.type === 'initialize') queueMicrotask(() => this.onmessage({ data: { id: message.id, result: { delegate: 'CPU' } } })); }, terminate() {}
        }, makeBitmap: async () => ({ close() {} })
    });
    const detection = detector.detectForVideo({}, 100);
    await Promise.resolve(); worker.onerror();
    await assert.rejects(detection, /stopped unexpectedly/);
    await assert.rejects(detector.setOptions({ numPoses: 2 }), /closed/);
});
