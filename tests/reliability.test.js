import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBattleService } from '../src/core/battle/battleService.js';
import { subscribeToBattle, getSavedBattleCredentials, saveBattleCredentials, clearBattleCredentials, joinBattleRoom } from '../src/api/battleApi.js';
import { createMoveWiseServer } from '../server.mjs';

test('battle subscription recovers the same player after a dropped stream', () => {
    const service=createBattleService({disconnectTtlMs:10000});
    try {
        const first=service.createRoom();
        const response=()=>({destroyed:false,writableEnded:false,write(){},end(){}});
        const stop=service.subscribe(first.roomCode,first.playerId,first.token,response());
        stop();
        assert.equal(service.getSnapshot(first.roomCode,first.playerId,first.token).players[0].connected,false);
        const stopAgain=service.subscribe(first.roomCode,first.playerId,first.token,response());
        const recovered=service.getSnapshot(first.roomCode,first.playerId,first.token);
        assert.equal(recovered.players.length,1);
        assert.equal(recovered.players[0].id,first.playerId);
        assert.equal(recovered.players[0].connected,true);
        stopAgain();
    } finally { service.close(); }
});

test('battle client reports transient disconnection while allowing EventSource retry', () => {
    const oldWindow=globalThis.window,oldSource=globalThis.EventSource;
    let instance;
    class MockSource {
        static CLOSED=2;
        readyState=0; closed=false; handlers=new Map();
        constructor(){instance=this;}
        addEventListener(name,handler){this.handlers.set(name,handler);}
        close(){this.closed=true;}
    }
    globalThis.window={location:{href:'http://localhost:4173/'}};
    globalThis.EventSource=MockSource;
    try {
        const states=[],errors=[];
        const stop=subscribeToBattle({roomCode:'ABC123ABC123',playerId:'player',token:'test'},s=>states.push(s),e=>errors.push(e));
        instance.handlers.get('error')();
        assert.equal(errors.length,1);
        assert.equal(instance.closed,false);
        instance.handlers.get('battle')({data:JSON.stringify({status:'ready'})});
        assert.equal(states[0].status,'ready');
        instance.handlers.get('battle')({data:'invalid json'});
        assert.equal(instance.closed,true);
        assert.equal(errors.length,2);
        stop();
    } finally { globalThis.window=oldWindow;globalThis.EventSource=oldSource; }
});

test('battle remains usable when session storage is blocked and invalid room codes fail before fetch',async()=>{
    const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
    Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw new Error('blocked')}});
    try {
        assert.doesNotThrow(()=>saveBattleCredentials({}));
        assert.equal(getSavedBattleCredentials(),null);
        assert.doesNotThrow(clearBattleCredentials);
        await assert.rejects(joinBattleRoom('bad'),/12/);
    } finally {
        if(previous) Object.defineProperty(globalThis,'sessionStorage',previous);
        else delete globalThis.sessionStorage;
    }
});

test('new styles, modules and model are served while QA fixtures and secrets stay private',async()=>{
    const server=createMoveWiseServer({apiKey:''});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    try {
        for(const path of ['/styles/product.css','/styles/workspace.css','/src/ui/preferences.js','/src/ai/coachingSession.js','/public/media/hero/movewise-runner.jpg','/public/models/pose_landmarker_lite.task']) {
            const result=await fetch(base+path,{method:'HEAD'});
            assert.equal(result.status,200,path);
            assert.equal(result.headers.get('x-content-type-options'),'nosniff');
        }
        for(const path of ['/tests/browser-server.mjs','/tests/browser-regression.html','/qa','/_qa/real-detector.js','/.env','/package.json','/.git/config']) {
            assert.equal((await fetch(base+path)).status,404,path);
        }
    } finally { await new Promise(resolve=>server.close(resolve)); }
});
