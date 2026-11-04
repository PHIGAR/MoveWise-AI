import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { getMonthlyActivity } from '../src/core/progress/monthlyActivity.js';
import { createFrameGate, setText } from '../src/ui/liveUpdates.js';
import { renderMovementVisual } from '../src/ai/visualization/movementVisualizer.js';
import { createMovementVisual } from '../src/core/movementVisual.js';

test('monthly activity uses 28 local dates, ignores incomplete/future sessions and counts real zeros',()=>{
 const now=new Date(2026,0,4,18);
 const sessions=[
  {completedAt:new Date(2025,11,8,0).toISOString(),repetitions:8},
  {completedAt:new Date(2025,11,7,23).toISOString(),repetitions:99},
  {completedAt:new Date(2026,0,4,10).toISOString(),repetitions:12},
  {completedAt:new Date(2026,0,4,11).toISOString(),repetitions:3},
  {completedAt:new Date(2026,0,5,1).toISOString(),repetitions:50},
  {completedAt:null,repetitions:6},{completedAt:'bad',repetitions:4}
 ];
 const summary=getMonthlyActivity(sessions,now);
 assert.equal(summary.days.length,28);
 assert.equal(summary.days[0].date,'2025-12-08');
 assert.equal(summary.days.at(-1).date,'2026-01-04');
 assert.equal(summary.workouts,3);assert.equal(summary.activeDays,2);
 assert.equal(summary.days.at(-1).repetitions,15);
 assert.equal(summary.days[1].workouts,0);
 assert.equal(getMonthlyActivity([],now).workouts,0);
});

test('frame gate caps inference without losing time-based analyzer timestamps',()=>{
 const gate=createFrameGate(50);
 assert.equal(gate.shouldRun(0),true);
 assert.equal(gate.shouldRun(16),false);
 assert.equal(gate.shouldRun(32),false);
 assert.equal(gate.shouldRun(50),true);
 assert.equal(gate.shouldRun(500),true);
 gate.reset();assert.equal(gate.shouldRun(501),true);
});

test('unchanged live text skips DOM mutation',()=>{
 let writes=0,value='5';
 const element={get textContent(){return value},set textContent(next){writes++;value=next}};
 setText(element,5);assert.equal(writes,0);
 setText(element,6);assert.equal(writes,1);
 setText(element,6);assert.equal(writes,1);
});

const css=readFileSync(new URL('../styles/tokens.css',import.meta.url),'utf8');
function luminance(hex){const parts=hex.replace('#','').match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*parts[0]+.7152*parts[1]+.0722*parts[2];}
function ratio(first,second){const values=[luminance(first),luminance(second)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);}
for(const [name,block] of [['light',css.split(':root[data-theme')[0]],['dark',css.split(":root[data-theme='dark']")[1]]]) {
 test(`${name} semantic text/surface pairs meet 4.5:1 contrast`,()=>{
  const tokens=Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]));
  for(const [fg,bg] of [['ink','bg'],['ink','surface'],['ink','surface-soft'],['muted','surface'],['muted','surface-soft'],['subtle','surface'],['accent','accent-soft'],['on-primary','primary'],['warning','warning-soft'],['danger','danger-soft'],['success','success-soft']]) {
   assert.ok(ratio(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg} = ${ratio(tokens[fg],tokens[bg]).toFixed(2)}`);
  }
 });
}

test('movement preview bounds trails and clears stale visuals for a legacy session',()=>{
 const previous=globalThis.document;
 const make=()=>({children:[],classes:[],attrs:{},classList:{add(){}},setAttribute(k,v){this.attrs[k]=v},appendChild(child){this.children.push(child)}});
 globalThis.document={createElementNS:make};
 try {
  const pose=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
  const visual=createMovementVisual('jumping-jack',Array.from({length:8},(_,i)=>({rep:i+1,representativePose:pose,trail:[pose,pose]})),8);
  const container={hidden:true,children:[],replaceChildren(...children){this.children=children}};
  assert.equal(renderMovementVisual(container,visual,'jumping-jack'),true);
  assert.ok(container.children[0].children.length<=50);
  assert.equal(renderMovementVisual(container,null,'jumping-jack'),false);
  assert.equal(container.hidden,true);assert.equal(container.children.length,0);
 }finally{globalThis.document=previous}
});
