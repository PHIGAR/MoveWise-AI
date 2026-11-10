export async function createWorkerDetector(options, {
    // MediaPipe's WASM loader uses importScripts, which requires a classic worker.
    workerFactory = () => new Worker(new URL('./poseWorker.js', import.meta.url)),
    makeBitmap = globalThis.createImageBitmap
} = {}) {
    const worker = workerFactory();
    let sequence = 0, closed = false, inference = null;
    const pending = new Map();
    function close(reason = new Error('Pose worker closed')) {
        if (closed) return;
        closed = true; worker.terminate();
        for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(reason); }
        pending.clear();
    }
    worker.onmessage = ({ data }) => {
        const request = pending.get(data.id);
        if (!request) return;
        pending.delete(data.id); clearTimeout(request.timer);
        if (data.error) request.reject(new Error(data.error)); else request.resolve(data.result);
    };
    worker.onerror = () => close(new Error('Pose worker stopped unexpectedly'));
    function request(type, payload = {}, transfer = []) {
        if (closed) return Promise.reject(new Error('Pose worker is closed'));
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => close(new Error('Pose worker timed out')), type === 'initialize' ? 45000 : 10000);
            pending.set(id, { resolve, reject, timer });
            try { worker.postMessage({ id, type, ...payload }, transfer); }
            catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
        });
    }
    try {
        const initialized = await request('initialize', { options });
        return {
            delegate: initialized.delegate,
            worker: true,
            get closed() { return closed; },
            setOptions: options => request('options', { options }),
            detectForVideo(video, timestamp) {
                // A navigation/restart may overlap an old frame. Never queue video frames.
                if (inference) return Promise.resolve(null);
                inference = (async () => {
                    const bitmap = await makeBitmap(video);
                    try { return await request('detect', { bitmap, timestamp }, [bitmap]); }
                    catch (error) { bitmap.close(); throw error; }
                })().finally(() => { inference = null; });
                return inference;
            },
            close
        };
    } catch (error) { close(error); throw error; }
}
