import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeCamera, stopCamera, isCameraActive, cameraErrorMessage } from '../src/core/camera.js';

function mockVideo(play = async () => {}) {
    return { readyState:1,srcObject:null,play,addEventListener(){},removeEventListener(){} };
}
function mockStream() {
    const track = {readyState:'live',stops:0,stop(){this.stops++;this.readyState='ended';}};
    return {getTracks:()=>[track],track};
}
async function withMedia(getUserMedia, run) {
    const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia}}});
    try { await run(); } finally {
        stopCamera();
        if(previous) Object.defineProperty(globalThis,'navigator',previous);
        else delete globalThis.navigator;
    }
}

test('camera denial and missing device errors are actionable',async()=>{
    for(const name of ['NotAllowedError','NotFoundError','NotReadableError']) {
        await withMedia(async()=>{throw new DOMException('device error',name)},async()=>{
            const video=mockVideo();
            await assert.rejects(initializeCamera(video), error=>error.name===name && error.message===cameraErrorMessage({name}));
            assert.equal(video.srcObject,null);
            assert.equal(isCameraActive(),false);
        });
    }
});

test('camera closes on playback failure and always requests audio off',async()=>{
    const stream=mockStream();
    await withMedia(async options=>{assert.equal(options.audio,false);return stream},async()=>{
        const video=mockVideo(async()=>{throw new Error('play failed')});
        await assert.rejects(initializeCamera(video,{audio:true}));
        assert.equal(stream.track.readyState,'ended');
        assert.equal(video.srcObject,null);
        assert.equal(isCameraActive(),false);
    });
});

test('late camera permission cannot reopen camera after leaving workout',async()=>{
    let grant;
    const permission=new Promise(resolve=>{grant=resolve});
    const stream=mockStream();
    await withMedia(()=>permission,async()=>{
        const video=mockVideo();
        const pending=initializeCamera(video);
        stopCamera(video);
        grant(stream);
        await assert.rejects(pending,{name:'AbortError'});
        assert.equal(stream.track.readyState,'ended');
        assert.equal(video.srcObject,null);
        assert.equal(isCameraActive(),false);
    });
});

test('successful camera session releases tracks and video source on stop',async()=>{
    const stream=mockStream();
    await withMedia(async()=>stream,async()=>{
        const video=mockVideo();
        assert.equal(await initializeCamera(video),stream);
        assert.equal(isCameraActive(),true);
        stopCamera(video);
        assert.equal(stream.track.readyState,'ended');
        assert.equal(video.srcObject,null);
        assert.equal(isCameraActive(),false);
    });
});
