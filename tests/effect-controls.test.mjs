import test from 'node:test';import assert from 'node:assert/strict';import {bindEffectButton} from '../src/gestures.js';import {randomEffect,effectForTrack} from '../src/effects.js';import {readFile,readdir} from 'node:fs/promises';
import {interactions,effectDescription,interactionCode} from '../src/effect-interactions.js';
function control(){const el=new EventTarget();let callback=null,next=0,toggle=0;bindEffectButton(el,{next:()=>next++,hold:()=>toggle++,toggle:()=>toggle++,clock:{set:fn=>{callback=fn;return 1;},clear:()=>callback=null}});return {el,tick:()=>{const fn=callback;callback=null;fn?.();},state:()=>({next,toggle})};}
test('A normal effect click changes exactly one effect',()=>{const c=control();c.el.dispatchEvent(new Event('pointerdown'));c.el.dispatchEvent(new Event('pointerup'));c.el.dispatchEvent(new Event('click'));c.tick();assert.deepEqual(c.state(),{next:1,toggle:0});});
test('Holding the effect control opens its menu once without changing the effect on release',()=>{const c=control();c.el.dispatchEvent(new Event('pointerdown'));c.tick();c.el.dispatchEvent(new Event('pointerup'));c.el.dispatchEvent(new Event('click'));assert.deepEqual(c.state(),{next:0,toggle:1});c.el.dispatchEvent(new Event('pointerdown'));c.tick();c.el.dispatchEvent(new Event('pointerup'));c.el.dispatchEvent(new Event('click'));assert.deepEqual(c.state(),{next:0,toggle:2});});
test('Cancelled presses cannot accidentally open the effects menu',()=>{const c=control();c.el.dispatchEvent(new Event('pointerdown'));c.el.dispatchEvent(new Event('pointercancel'));c.tick();assert.deepEqual(c.state(),{next:0,toggle:0});});
const manifests=[];for(const dir of await readdir(new URL('../src/suite-presets/',import.meta.url),{withFileTypes:true}))if(dir.isDirectory())manifests.push(JSON.parse(await readFile(new URL('../src/suite-presets/'+dir.name+'/preset.json',import.meta.url),'utf8')));

test('Every registered scene has its own clear gesture description',()=>{
 assert.equal(manifests.length,22);
 for(const preset of manifests){assert.ok(interactions[preset.id],preset.id);assert.equal(effectDescription(preset.id),interactions[preset.id]);assert.match(effectDescription(preset.id),/^(Tocca|Trascina|Tieni premuto)/);}
 assert.equal(new Set(manifests.map(p=>effectDescription(p.id))).size,22);
});

test('All twenty fragment scenes have distinct coordinate and color interactions',()=>{
 const meshes=new Set(['daprod.audio-bloom','daprod.cosmic-dust']);
 const fragments=manifests.filter(p=>!meshes.has(p.id));
 assert.equal(fragments.length,20);
 const codes=fragments.map(p=>{const code=interactionCode(p.id);assert.ok(code.coordinates.trim(),p.id);assert.ok(code.color.trim(),p.id);assert.match(code.coordinates,/uTouch/);assert.match(code.color,/uTouch/);return code;});
 assert.equal(new Set(codes.map(c=>c.coordinates)).size,20);
 assert.equal(new Set(codes.map(c=>c.color)).size,20);
});
test('Random effect selection changes the current effect and tracks choose an album-specific default',()=>{for(const p of manifests)assert.notEqual(randomEffect(p.id,manifests,()=>.5),p.id);const track={id:'643d82de7ba99094'};const ids=['vesuvio','sistema','selecta'].map(art=>effectForTrack({art},track,manifests));assert.equal(new Set(ids).size,3);assert.equal(effectForTrack({art:'vesuvio'},track,manifests),ids[0]);});

test('Default gesture timers retain the Window-compatible receiver',()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let timer,held=0,next=0;
 const validReceiver=value=>assert.ok(value===undefined||value===globalThis,'Browser timers reject a clock object as their receiver');
 globalThis.setTimeout=function(fn){validReceiver(this);timer=fn;return 17;};
 globalThis.clearTimeout=function(){validReceiver(this);};
 try{
  const button=new EventTarget();bindEffectButton(button,{hold:()=>held++,next:()=>next++});
  button.dispatchEvent(new Event('pointerdown'));timer();button.dispatchEvent(new Event('pointerup'));button.dispatchEvent(new Event('click'));
  assert.equal(held,1);assert.equal(next,0);
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
