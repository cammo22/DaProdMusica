import test from 'node:test';
import assert from 'node:assert/strict';
import {Galaxy} from '../src/galaxy.js';

// Exercise the actual event handlers and projection without a browser or GPU.
globalThis.matchMedia=()=>({matches:false});
globalThis.ResizeObserver=class{observe(){}};
globalThis.Image=class{};
globalThis.devicePixelRatio=1;
globalThis.document={hidden:false};
globalThis.requestAnimationFrame=()=>0;
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>gradient:()=>{}});
class Canvas extends EventTarget {
 getContext(){return context;}
 getBoundingClientRect(){return {left:0,top:0,width:500,height:500};}
 setPointerCapture(){}
}
function event(canvas,type,values){canvas.dispatchEvent(Object.assign(new Event(type),values));}
function sphere(onSelect=()=>{}){
 const canvas=new Canvas(),galaxy=new Galaxy(canvas,[],onSelect);
 galaxy.yaw=0;galaxy.pitch=0;galaxy.velocity=[0,0];
 galaxy.points=[{track:{id:'front'},x:0,y:0,z:1}];
 galaxy.frame(100);
 return {canvas,galaxy,front:()=>galaxy.hit.find(p=>p.track.id==='front')};
}

test('The visible front of the sphere follows dragging in all four directions and keeps that inertia',()=>{
 for(const [dx,dy] of [[40,0],[-40,0],[0,40],[0,-40]]){
  const {canvas,galaxy,front}=sphere(),before=front();
  event(canvas,'pointerdown',{pointerId:1,clientX:100,clientY:100});
  event(canvas,'pointermove',{pointerId:1,clientX:100+dx,clientY:100+dy});
  galaxy.frame(200);
  const dragged=front();
  assert.ok(dragged,'Front point disappeared during a small drag');
  if(dx)assert.ok((dragged.x-before.x)*dx>0,`Front did not follow horizontal drag ${dx}`);
  if(dy)assert.ok((dragged.y-before.y)*dy>0,`Front did not follow vertical drag ${dy}`);
  event(canvas,'pointerup',{pointerId:1,clientX:100+dx,clientY:100+dy});
  galaxy.frame(250);
  const released=front();
  if(dx)assert.ok((released.x-dragged.x)*dx>0,'Horizontal inertia reversed the gesture');
  if(dy)assert.ok((released.y-dragged.y)*dy>0,'Vertical inertia reversed the gesture');
 }
});

test('Arrow keys move the front of the sphere in the indicated screen direction',()=>{
 for(const [key,axis,sign] of [['ArrowRight','x',1],['ArrowLeft','x',-1],['ArrowDown','y',1],['ArrowUp','y',-1]]){
  const {canvas,galaxy,front}=sphere(),before=front()[axis];
  event(canvas,'keydown',{key});galaxy.frame(200);
  assert.ok((front()[axis]-before)*sign>0,`${key} moved the sphere in the wrong direction`);
 }
});

test('Two-finger pinch scales the sphere within bounds without rotating or selecting a cover',()=>{
 const selected=[],{canvas,galaxy}=sphere(track=>selected.push(track.id));
 const initialYaw=galaxy.yaw;
 const send=(type,id,x,y=240)=>event(canvas,type,{pointerId:id,clientX:x,clientY:y});
 send('pointerdown',1,250);send('pointerdown',2,350);
 send('pointermove',2,400);
 assert.equal(galaxy.zoom,1.5);
 assert.equal(galaxy.yaw,initialYaw);assert.equal(galaxy.pitch,0);
 assert.deepEqual(galaxy.velocity,[0,0]);
 send('pointermove',2,1250);assert.equal(galaxy.zoom,1.8);
 send('pointermove',2,251);assert.equal(galaxy.zoom,.7);
 send('pointerup',2,251);send('pointerup',1,250);
 assert.deepEqual(selected,[],'Releasing a pinch unexpectedly played the front cover');
 send('pointerdown',1,250);send('pointerup',1,250);
 assert.deepEqual(selected,['front'],'A normal tap should work after a pinch');
});

test('Cancelling a pinch clears both pointers and allows a fresh one-finger gesture',()=>{
 const selected=[],{canvas,galaxy}=sphere(track=>selected.push(track.id));
 event(canvas,'pointerdown',{pointerId:1,clientX:250,clientY:240});
 event(canvas,'pointerdown',{pointerId:2,clientX:350,clientY:240});
 event(canvas,'pointercancel',{pointerId:1});
 assert.equal(galaxy.touches.size,0);assert.equal(galaxy.pinch,null);assert.equal(galaxy.drag,null);
 event(canvas,'pointerdown',{pointerId:3,clientX:250,clientY:240});
 event(canvas,'pointerup',{pointerId:3,clientX:250,clientY:240});
 assert.deepEqual(selected,['front']);
});

test('The idle galaxy keeps rotating gently and Off freezes automatic motion',()=>{const {galaxy}=sphere();galaxy.velocity=[0,0];const before=galaxy.yaw;galaxy.frame(200);galaxy.frame(300);assert.ok(galaxy.yaw>before);galaxy.motion='off';const stopped=galaxy.yaw;galaxy.frame(400);assert.equal(galaxy.yaw,stopped);});
