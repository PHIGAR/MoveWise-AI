// Isolated localhost fixture server. Never served by the production allowlist.
// Exercises the real app, analyzers and storage with synthetic landmarks only.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createMoveWiseServer } from '../server.mjs';

const camera = `
let active=false;
export async function initializeCamera(video) {
    const scenario=new URLSearchParams(location.search).get('camera');
    if(scenario==='denied') throw new Error('ไม่ได้รับอนุญาตให้ใช้กล้อง โปรดอนุญาตกล้องในเบราว์เซอร์แล้วลองอีกครั้ง');
    if(scenario==='missing') throw new Error('ไม่พบกล้อง โปรดเชื่อมต่อกล้องแล้วลองอีกครั้ง');
    active=true;
    let frame=0;
    Object.defineProperties(video, {
        videoWidth:{configurable:true,get:()=>1280},
        videoHeight:{configurable:true,get:()=>720},
        currentTime:{configurable:true,get:()=>++frame/30}
    });
    return {getTracks:()=>[]};
}
export function stopCamera() { active=false; }
export function isCameraActive() { return active; }
`;
const detector = `
let start=0; let count=1;
export async function initializePoseDetector() { start=performance.now(); }
export async function setPoseCount(value) { count=value; }
export function getPoseDetectorStatus() {return {ready:true,status:'ready',error:null};}
export function detectPose(video,timestamp) {
    const angle=[180,135,90,135][Math.floor((timestamp-start)/450)%4];
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
    return {landmarks:Array.from({length:count},(_,index)=>count===1?pose:pose.map(point=>({...point,x:point.x*.55+(index===0?.05:.5)})))};
}
`;
const app = createMoveWiseServer({apiKey:''});
const server=createServer(async(req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/src/core/camera.js'||path==='/src/ai/pose/detector.js') {
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        res.end(path.includes('camera')?camera:detector);
        return;
    }
    if(path==='/') {
        const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
        res.end(html.replace('<body>','<body><div style="position:fixed;z-index:1000;bottom:80px;left:10px;padding:6px;background:#fbe5a0;color:#302a13;font:11px sans-serif;pointer-events:none">TEST FIXTURE · SYNTHETIC POSE · NO CAMERA</div>'));
        return;
    }
    app.emit('request',req,res);
});
server.listen(4174,'127.0.0.1',()=>console.log('Synthetic workout QA: http://127.0.0.1:4174'));
process.on('SIGINT',()=>{server.close();app.close();});
