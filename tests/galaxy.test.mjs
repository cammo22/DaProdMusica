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
function sphere(){
 const canvas=new Canvas(),galaxy=new Galaxy(canvas,[],()=>{});
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
