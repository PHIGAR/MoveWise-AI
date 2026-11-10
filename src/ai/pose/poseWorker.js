// Video pixels stay on this device. Only numeric landmarks cross the worker boundary.
let detector;
let delegate = 'CPU';
self.onmessage = async ({ data }) => {
    const { id, type, options, bitmap, timestamp } = data;
    try {
        let result;
        if (type === 'initialize') {
            const { FilesetResolver, PoseLandmarker } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/+esm');
            const vision = await FilesetResolver.forVisionTasks(options.wasmPath);
            const settings = {
                canvas: new OffscreenCanvas(1, 1),
                baseOptions: { modelAssetPath: options.modelPath, delegate: options.delegate },
                runningMode: 'VIDEO', numPoses: options.numPoses,
                minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5
            };
            try { detector = await PoseLandmarker.createFromOptions(vision, settings); }
            catch (error) {
                if (options.delegate !== 'GPU') throw error;
                settings.baseOptions.delegate = 'CPU';
                detector = await PoseLandmarker.createFromOptions(vision, settings);
            }
            delegate = settings.baseOptions.delegate;
            result = { delegate };
        } else if (type === 'options') {
            await detector.setOptions(options);
        } else if (type === 'detect') {
            const started = performance.now();
            const output = detector.detectForVideo(bitmap, timestamp);
            result = { landmarks: output.landmarks, inferenceMs: performance.now() - started };
        } else if (type === 'close') {
            detector?.close(); self.close(); return;
        } else throw new Error('Unknown pose worker request');
        self.postMessage({ id, result });
    } catch (error) {
        self.postMessage({ id, error: error.message || 'Pose worker failed' });
    } finally { bitmap?.close(); }
};
