import test from 'node:test';
import assert from 'node:assert/strict';
import {FramePacer} from '../src/frame-pacer.js';

function displayFrames(pacer,hz,fps,{start=1000,seconds=10}={}){
 const drawn=[];
 for(let frame=0;frame<hz*seconds;frame++){
  const now=start+frame*1000/hz;
  if(pacer.due(now,fps))drawn.push(now);
 }
 return drawn;
}

for(const hz of [60,90,120,144])for(const fps of [60,30]){
 test(`${hz} Hz display sustains ${fps} rendered frames per second without fractional-refresh slowdown`,()=>{
  const frames=displayFrames(new FramePacer(),hz,fps);
  assert.ok(Math.abs(frames.length-fps*10)<=1,`${hz} Hz produced ${frames.length/10} fps instead of ${fps}`);
  // Check sustained output, so an initial burst cannot conceal later starvation.
  for(let second=0;second<10;second++){
   const start=1000+second*1000;
   const count=frames.filter(now=>now>=start-.001&&now<start+1000-.001).length;
   assert.ok(Math.abs(count-fps)<=1,`Second ${second}: ${count} frames at ${hz} Hz/${fps} fps`);
  }
  // Quantization may move a draw by one display refresh, never several.
  const largestGap=Math.max(...frames.slice(1).map((now,i)=>now-frames[i]));
  assert.ok(largestGap<=1000/fps+1000/hz+.001,`Visible pacing stall of ${largestGap} ms`);
 });
}

test('Rendering resumes immediately after a hidden-page pause without replaying missed frames',()=>{
 for(const fps of [60,30]){
  const pacer=new FramePacer();
  displayFrames(pacer,120,fps,{seconds:1});
  const resumedAt=60000;
  assert.equal(pacer.due(resumedAt,fps),true,'The first visible frame must render immediately');
  for(let retry=0;retry<10;retry++){
   assert.equal(pacer.due(resumedAt,fps),false,'The pacer replayed accumulated hidden-page frames');
  }
  assert.equal(pacer.due(resumedAt+1,fps),false,'A resumed frame must not be followed by a catch-up burst');
  const frames=displayFrames(pacer,120,fps,{start:resumedAt+1000/120,seconds:2});
  assert.ok(Math.abs(frames.length-fps*2)<=1,`Resume did not restore the ${fps} fps cadence`);
 }
});

test('A delayed display callback skips its backlog and preserves the following normal cadence',()=>{
 for(const fps of [60,30]){
  const pacer=new FramePacer();
  displayFrames(pacer,144,fps,{seconds:1});
  const delayedAt=2700;
  assert.equal(pacer.due(delayedAt,fps),true);
  assert.equal(pacer.due(delayedAt+.1,fps),false);
  assert.equal(pacer.due(delayedAt+1,fps),false);
  const following=displayFrames(pacer,144,fps,{start:delayedAt+1000/144,seconds:1});
  assert.ok(Math.abs(following.length-fps)<=1,`Delayed frame caused a burst or starvation: ${following.length} frames`);
 }
});

test('Reset allows a fresh timestamp origin and applies the newly selected frame rate',()=>{
 const pacer=new FramePacer();
 displayFrames(pacer,90,60,{start:100000,seconds:1});
 pacer.reset();
 const reduced=displayFrames(pacer,90,30,{start:0,seconds:2});
 assert.equal(reduced[0],0,'Reset retained the previous animation clock');
 assert.equal(reduced.length,60);
 pacer.reset();
 const full=displayFrames(pacer,90,60,{start:0,seconds:2});
 assert.equal(full[0],0);
 assert.equal(full.length,120);
});
