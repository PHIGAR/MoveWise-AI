// Isolated localhost fixture server. Never served by the production allowlist.
// Exercises the real app, analyzers and storage with synthetic landmarks only.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createMoveWiseServer } from '../server.mjs';

const camera = `
let active=false;
let generatedStream=null,generatedTimer=null;
export async function initializeCamera(video) {
    const scenario=new URLSearchParams(location.search).get('camera');
    if(scenario==='denied') throw new Error('ไม่ได้รับอนุญาตให้ใช้กล้อง โปรดอนุญาตกล้องในเบราว์เซอร์แล้วลองอีกครั้ง');
    if(scenario==='missing') throw new Error('ไม่พบกล้อง โปรดเชื่อมต่อกล้องแล้วลองอีกครั้ง');
    active=true;
    if(new URLSearchParams(location.search).get('model')==='real') {
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
        const context=canvas.getContext('2d');let frame=0;
        const paint=()=>{context.fillStyle='#b8c8d8';context.fillRect(0,0,640,480);context.fillStyle='#234';context.fillRect((frame++%100)*5,220,40,40);};
        paint();generatedStream=canvas.captureStream(30);video.srcObject=generatedStream;await video.play();generatedTimer=setInterval(paint,33);return generatedStream;
    }
    const cameraStart=performance.now();
    Object.defineProperties(video, {
        videoWidth:{configurable:true,get:()=>1280},
        videoHeight:{configurable:true,get:()=>720},
        currentTime:{configurable:true,get:()=>Math.floor((scenario==='frozen'?Math.min(3500,performance.now()-cameraStart):performance.now()-cameraStart)/33)/30}
    });
    return {getTracks:()=>[]};
}
export function stopCamera(video) { active=false;clearInterval(generatedTimer);generatedStream?.getTracks().forEach(track=>track.stop());if(video)video.srcObject=null; }
export function isCameraActive() { return active; }
`;
const detector = `
let start=0; let count=1;
export async function initializePoseDetector() { start=performance.now(); }
export async function setPoseCount(value) { count=value; }
export function getPoseDetectorStatus() {return {ready:true,status:'ready',error:null};}
export function detectPose(video,timestamp) {
    const entered=performance.now();globalThis.fixtureFirstAt??=entered;
    queueMicrotask(()=>{const elapsed=performance.now()-entered;globalThis.fixturePipeline??=[];globalThis.fixturePipeline.push(elapsed);if(globalThis.fixturePipeline.length>300)globalThis.fixturePipeline.shift();const rep=document.getElementById('rep')?.textContent;if(rep!==globalThis.fixtureLastRep&&Number(rep)>0)globalThis.fixtureRepLatency=elapsed;globalThis.fixtureLastRep=rep;});
    globalThis.fixtureFrames=(globalThis.fixtureFrames||0)+1;
    const tracking=new URLSearchParams(location.search).get('tracking');
    if(tracking==='none'||(tracking==='loss'&&timestamp-start>3000&&timestamp-start<4500)) return {landmarks:[]};
    const angle=new URLSearchParams(location.search).get('movement')==='standing'?180:[180,135,90,135][Math.floor((timestamp-start)/450)%4];
    const radians=angle*Math.PI/180;
    const pose=Array.from({length:33},()=>({x:.5,y:.3,z:0,visibility:1,presence:1}));
    pose[0]={x:.5,y:.12,visibility:1};
    for (const [hip,knee,ankle,x] of [[23,25,27,.38],[24,26,28,.58]]) {
        pose[hip]={x,y:.43,visibility:1};
        pose[knee]={x,y:.63,visibility:1};
        pose[ankle]={x:x+Math.sin(radians)*.2,y:.63-Math.cos(radians)*.2,visibility:1};
    }
    pose[11]={x:.38,y:.27,visibility:1}; pose[12]={x:.58,y:.27,visibility:1};
    pose[15]={x:.28,y:.45,visibility:1}; pose[16]={x:.68,y:.45,visibility:1};
    if(tracking==='missing') pose[25].visibility=0;
    const output={landmarks:Array.from({length:count},(_,index)=>count===1?pose:pose.map(point=>({...point,x:point.x*.55+(index===0?.05:.5)})))};
    return new URLSearchParams(location.search).get('slow')==='1'?new Promise(resolve=>setTimeout(()=>resolve(output),1000)):output;
}
`;
const app = createMoveWiseServer({apiKey:''});
const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const path=url.pathname;
    if (/^\/_qa\/(workerBridge|poseWorker)\.js$/.test(path)) {
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        res.end(await readFile(new URL('../src/ai/pose/'+path.split('/').at(-1),import.meta.url),'utf8'));return;
    }
    if(path==='/app.js' && url.searchParams.get('realModel')==='1') {
        const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        res.end(source.replace('./src/ai/pose/detector.js','./src/ai/pose/detector.js?realModel=1'));return;
    }
    if(path==='/_qa/real-detector.js') {
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        res.end(await readFile(new URL('../src/ai/pose/detector.js',import.meta.url),'utf8'));return;
    }
    if (path === '/qa') {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        res.end(await readFile(new URL('./browser-regression.html', import.meta.url), 'utf8')); return;
    }
    if(path==='/src/core/camera.js'||path==='/src/ai/pose/detector.js') {
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        const wrapper=`import * as real from '/_qa/real-detector.js';
        export const setPoseCount=real.setPoseCount,getPoseDetectorStatus=real.getPoseDetectorStatus;
        export async function initializePoseDetector(options={}) {const result=await real.initializePoseDetector({...options,delegate:new URLSearchParams(location.search).get('delegate')==='GPU'?'GPU':'CPU'});globalThis.fixtureExecution=real.getPoseDetectorStatus().execution||'main-thread';return result;}
        export async function detectPose(...args) {
            const entered=performance.now();globalThis.fixtureFrames=(globalThis.fixtureFrames||0)+1;
            const result=await real.detectPose(...args);globalThis.fixtureExecution=real.getPoseDetectorStatus().execution||'main-thread';globalThis.fixtureFallback=real.getPoseDetectorStatus().workerFallbackReason;globalThis.fixtureFirstAt??=performance.now();globalThis.fixtureInference??=[];globalThis.fixtureInference.push(result?.inferenceMs??performance.now()-entered);if(globalThis.fixtureInference.length>300)globalThis.fixtureInference.shift();
            queueMicrotask(()=>{globalThis.fixturePipeline??=[];globalThis.fixturePipeline.push(performance.now()-entered);if(globalThis.fixturePipeline.length>300)globalThis.fixturePipeline.shift();});return result;
        }`;
        const realModel=url.searchParams.get('realModel')==='1';
        res.end(path.includes('camera')?camera:realModel?wrapper:detector);
        return;
    }
    if(path==='/') {
        let html=await readFile(new URL('../index.html',import.meta.url),'utf8');
        if(url.searchParams.get('capture')==='1') html=html.replace('</head>','<style>#qa-performance,#qa-resample{display:none!important}#qa-banner{position:static!important;display:block;padding:4px 12px!important}</style></head>');
        if(url.searchParams.get('model')==='real') html=html.replace('src="./app.js"','src="./app.js?realModel=1"');
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
        res.end(html.replace('<body>',`<body><script>
        if(new URLSearchParams(location.search).get('testStorage')==='1') for(const name of ['localStorage','sessionStorage']) {
            const data=new Map();Object.defineProperty(window,name,{value:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)}});
        }</script><div id="qa-banner" style="position:fixed;z-index:1000;bottom:80px;left:10px;padding:6px;background:#fbe5a0;color:#302a13;font:11px sans-serif;pointer-events:none">TEST FIXTURE · ${url.searchParams.get('model')==='real'?'GENERATED VIDEO · REAL MEDIAPIPE':'SYNTHETIC POSE'} · NO CAMERA</div>`).replace('</body>', `<script>
        let sampleStart=0,mutations=0,frameStart=0,lag=[],lastTick=performance.now();
        document.getElementById('start').addEventListener('click',()=>{globalThis.fixtureClickAt=performance.now()},{capture:true});
        const report=document.createElement('output');report.id='qa-performance';report.style='position:fixed;bottom:0;left:0;z-index:1001;background:white;color:black;font:11px monospace;padding:4px;max-width:100%;overflow-wrap:anywhere';document.body.append(report);
        const resample=document.createElement('button');resample.id='qa-resample';resample.textContent='Sample next 10 seconds';resample.style='position:fixed;bottom:30px;left:10px;z-index:1001;font:11px system-ui';resample.onclick=()=>{sampleStart=performance.now();mutations=0;frameStart=globalThis.fixtureFrames||0;lag=[];globalThis.fixturePipeline=[];globalThis.fixtureInference=[];lastTick=performance.now();delete report.dataset.complete;report.textContent='';};document.body.append(resample);
        new MutationObserver(records=>{mutations+=records.length}).observe(document.querySelector('.control-panel'),{subtree:true,childList:true,characterData:true,attributes:true});
        setInterval(()=>{const now=performance.now();lag.push(Math.max(0,now-lastTick-100));lastTick=now;if(lag.length>100)lag.shift();
        if(!sampleStart && document.body.classList.contains('workout-running') && (new URLSearchParams(location.search).get('model')==='real'||document.getElementById('timer').textContent.trim()!=='00:00')){sampleStart=now;mutations=0;frameStart=globalThis.fixtureFrames||0;}
        if(sampleStart && now-sampleStart>=10000 && !report.dataset.complete){report.dataset.complete='true';report.textContent=JSON.stringify({seconds:(now-sampleStart)/1000,frames:(globalThis.fixtureFrames||0)-frameStart,mutations,meanTimerLagMs:lag.reduce((a,b)=>a+b,0)/lag.length,maxTimerLagMs:Math.max(...lag),heapMB:performance.memory?performance.memory.usedJSHeapSize/1048576:null,startupMs:globalThis.fixtureFirstAt-globalThis.fixtureClickAt,meanProcessingMs:globalThis.fixturePipeline?.reduce((a,b)=>a+b,0)/globalThis.fixturePipeline?.length,meanInferenceMs:globalThis.fixtureInference?.reduce((a,b)=>a+b,0)/globalThis.fixtureInference?.length,repFeedbackMs:globalThis.fixtureRepLatency,execution:globalThis.fixtureExecution,workerFallback:globalThis.fixtureFallback});}
        },100);
        </script></body>`));
        return;
    }
    app.emit('request',req,res);
});
const port=Number(process.env.PORT)||4174;
server.listen(port,'127.0.0.1',()=>console.log(`Synthetic workout QA: http://127.0.0.1:${port}`));
process.on('SIGINT',()=>{server.close();app.close();});
