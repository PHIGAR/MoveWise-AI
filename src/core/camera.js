const DEFAULT_CAMERA_OPTIONS = {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false
};
let cameraStream = null;
let generation = 0;

export function cameraErrorMessage(error) {
    const messages = {
        NotAllowedError: 'ไม่ได้รับอนุญาตให้ใช้กล้อง โปรดอนุญาตกล้องในเบราว์เซอร์แล้วลองอีกครั้ง',
        NotFoundError: 'ไม่พบกล้อง โปรดเชื่อมต่อกล้องแล้วลองอีกครั้ง',
        NotReadableError: 'กล้องอาจถูกใช้โดยแอปอื่น โปรดปิดแอปนั้นแล้วลองอีกครั้ง',
        OverconstrainedError: 'กล้องไม่รองรับการตั้งค่านี้ โปรดลองกล้องอื่น',
        TimeoutError: 'กล้องยังไม่พร้อม โปรดตรวจสอบสิทธิ์และลองอีกครั้ง',
        AbortError: 'ยกเลิกการเปิดกล้องแล้ว'
    };
    return messages[error?.name] ?? 'เตรียมกล้องไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อและลองอีกครั้ง';
}

export async function initializeCamera(videoElement, options = {}) {
    stopCamera(videoElement);
    const requestGeneration = generation;
    const media = globalThis.navigator?.mediaDevices;
    if (!media?.getUserMedia) throw new Error('กล้องต้องใช้ HTTPS หรือ localhost และเบราว์เซอร์ที่รองรับ Camera API');
    let stream;
    let permissionTimer;
    let metadataTimer;
    let metadataHandler;
    const dispose = value => value?.getTracks().forEach(track => track.stop());
    try {
        // A late permission grant must never reopen a camera after navigation or timeout.
        let expired = false;
        const permission = media.getUserMedia({ ...DEFAULT_CAMERA_OPTIONS, ...options, audio: false });
        permission.then(value => {
            if (expired || requestGeneration !== generation) dispose(value);
        }, () => {});
        try {
            stream = await Promise.race([permission, new Promise((_, reject) => {
                permissionTimer = setTimeout(() => { expired = true; reject(new DOMException('Camera timeout', 'TimeoutError')); }, 30000);
            })]);
        } finally { clearTimeout(permissionTimer); }
        if (requestGeneration !== generation) throw new DOMException('Cancelled', 'AbortError');
        cameraStream = stream;
        videoElement.srcObject = stream;
        await new Promise((resolve, reject) => {
            if (videoElement.readyState >= 1) return resolve();
            metadataHandler = resolve;
            videoElement.addEventListener('loadedmetadata', metadataHandler, { once: true });
            metadataTimer = setTimeout(() => reject(new DOMException('Camera timeout', 'TimeoutError')), 10000);
        });
        await videoElement.play();
        if (requestGeneration !== generation) throw new DOMException('Cancelled', 'AbortError');
        return stream;
    } catch (error) {
        dispose(stream);
        if (cameraStream === stream) cameraStream = null;
        if (videoElement.srcObject === stream) videoElement.srcObject = null;
        const friendly = new Error(cameraErrorMessage(error), { cause: error });
        friendly.name = error.name;
        throw friendly;
    } finally {
        clearTimeout(metadataTimer);
        if (metadataHandler) videoElement.removeEventListener('loadedmetadata', metadataHandler);
    }
}

export function stopCamera(videoElement) {
    generation++;
    const streams = new Set([cameraStream, videoElement?.srcObject]);
    streams.forEach(stream => stream?.getTracks().forEach(track => track.stop()));
    if (videoElement) videoElement.srcObject = null;
    cameraStream = null;
}
export function getCameraStream() { return cameraStream; }
export function isCameraActive() { return Boolean(cameraStream?.getTracks().some(track => track.readyState === 'live')); }
