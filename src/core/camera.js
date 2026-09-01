const DEFAULT_CAMERA_OPTIONS = {
    video: {
        width: {
            ideal: 1280
        },
        height: {
            ideal: 720
        },
        facingMode: "user"
    },
    audio: false
};


let cameraStream = null;


export async function initializeCamera(
    videoElement,
    options = {}
) {
    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {
        throw new Error(
            "Browser ไม่รองรับ Camera API"
        );
    }

    const stream =
        await navigator.mediaDevices.getUserMedia({
            ...DEFAULT_CAMERA_OPTIONS,
            ...options
        });

    cameraStream = stream;
    videoElement.srcObject = stream;

    await new Promise(
        resolve => {
            if (videoElement.readyState >= 1) {
                resolve();
            }
            else {
                videoElement.onloadedmetadata =
                    resolve;
            }
        }
    );

    await videoElement.play();

    return stream;
}


export function stopCamera(
    videoElement
) {
    const stream =
        cameraStream || videoElement?.srcObject;

    if (stream) {
        stream
            .getTracks()
            .forEach(
                track => {
                    track.stop();
                }
            );
    }

    if (
        videoElement &&
        videoElement.srcObject === stream
    ) {
        videoElement.srcObject = null;
    }

    cameraStream = null;
}


export function getCameraStream() {
    return cameraStream;
}


export function isCameraActive() {
    return Boolean(
        cameraStream &&
        cameraStream
            .getTracks()
            .some(track => track.readyState === "live")
    );
}
