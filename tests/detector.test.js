import assert from 'node:assert/strict';
import { test } from 'node:test';

test('detector loads once for concurrent starts and preserves pose detection/count controls',async()=>{
    const detector=await import('../src/ai/pose/detector.js?success');
    let loads=0;
    const counts=[];
    const instance={setOptions:async options=>counts.push(options.numPoses),detectForVideo:(video,time)=>({video,time})};
    const visionModule={
        FilesetResolver:{forVisionTasks:async()=>({})},
        PoseLandmarker:{createFromOptions:async()=>{loads++;return instance}}
    };
    const results=await Promise.all([detector.initializePoseDetector({visionModule}),detector.initializePoseDetector({visionModule})]);
    assert.equal(loads,1);
    assert.equal(results[0],instance);
    assert.equal(detector.getPoseDetectorStatus().ready,true);
    await Promise.all([detector.setPoseCount(2),detector.setPoseCount(1)]);
    assert.deepEqual(counts,[2,1]);
    assert.deepEqual(detector.detectPose('video',42),{video:'video',time:42});
});

test('detector initialization failure is observable and can be retried',async()=>{
    const detector=await import('../src/ai/pose/detector.js?retry');
    let attempts=0;
    const visionModule={
        FilesetResolver:{forVisionTasks:async()=>({})},
        PoseLandmarker:{createFromOptions:async()=>{if(++attempts===1)throw new Error('network unavailable');return {}}}
    };
    await assert.rejects(detector.initializePoseDetector({visionModule}),/network unavailable/);
    assert.equal(detector.getPoseDetectorStatus().status,'error');
    await detector.initializePoseDetector({visionModule});
    assert.equal(detector.getPoseDetectorStatus().ready,true);
    assert.equal(attempts,2);
});

test('an explicitly selected GPU delegate falls back to CPU on incompatible devices', async () => {
    const detector = await import('../src/ai/pose/detector.js?gpu-fallback');
    const delegates = [];
    await detector.initializePoseDetector({ delegate: 'GPU', visionModule: {
        FilesetResolver: { forVisionTasks: async () => ({}) },
        PoseLandmarker: { createFromOptions: async (_, options) => {
            delegates.push(options.baseOptions.delegate);
            if (options.baseOptions.delegate === 'GPU') throw new Error('WebGL unavailable');
            return {};
        } }
    } });
    assert.deepEqual(delegates, ['GPU', 'CPU']);
    assert.equal(detector.getPoseDetectorStatus().delegate, 'CPU');
});
