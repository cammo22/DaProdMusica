import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioFeatures,FeatureEnvelope} from '../src/audio-features.js';
test('Silence stays silent with neutral waveform and no false beat',()=>{
 const f=new AudioFeatures().update(new Uint8Array(1024),new Uint8Array(2048).fill(128),48000,2048,1);
 assert.equal(f.rms,0);assert.equal(f.beat,0);assert.equal(f.energy,0);assert.equal(f.centroid,0);assert.equal(f.wave[0],128);
});
test('A transient drives onset and has a refractory period',()=>{
 const analyzer=new AudioFeatures(),frequency=new Uint8Array(1024).fill(180),wave=new Uint8Array(2048).fill(192);
 const a=analyzer.update(frequency,wave,48000,2048,1);const b=analyzer.update(frequency,wave,48000,2048,1.01);
 assert.equal(a.beat,1);assert.equal(b.beat,0);assert.equal(a.rms,.5);assert.ok(a.onset>0);assert.equal(a.spectrum.length,256);
});

const packet=(sequence,extra={})=>({sequence,beatCount:1,bass:1,mid:.6,treble:.3,rms:.5,energy:.7,bands:new Array(64).fill(180),waveform:new Array(256).fill(192),...extra});

test('A beat survives intervening bridge polls until rendering sees it, and repeated counts do not retrigger it',()=>{
 const envelope=new FeatureEnvelope();
 envelope.push(packet(1,{beat:1}),1000);
 // A new native poll can replace a transient beat flag before the next frame.
 envelope.push(packet(2,{beat:0}),1032);
 const first=envelope.read(1048);
 assert.equal(first.beatCount,1);
 assert.ok(first.beat>.4,'The native beat disappeared before its first rendered frame');
 const initial=first.beat;
 envelope.push(packet(3,{beat:0}),1064);
 const faded=envelope.read(1080).beat;
 assert.ok(faded>0&&faded<initial,'A duplicate beat count must continue fading rather than start another pulse');
 // Detect a missed event from the cumulative counter even if its flag is gone.
 envelope.push(packet(4,{beat:0,beatCount:2}),1096);
 const second=envelope.read(1112);
 assert.equal(second.beatCount,2);
 assert.ok(second.beat>faded,'A newly counted native beat did not produce a fresh pulse');
});

test('Repeated stale packets cannot keep the visualizer alive, and silence decays to a neutral waveform',()=>{
 const envelope=new FeatureEnvelope();
 const fresh=packet(10);
 envelope.push(fresh,1000);
 for(let now=1016;now<=1256;now+=16)envelope.read(now);
 const loud=envelope.read(1272).bass;
 assert.ok(loud>.9);
 envelope.push(fresh,1300);
 envelope.push({...fresh,bass:1,beat:1},1450);
 const fading=envelope.read(1464);
 assert.ok(fading.bass>0&&fading.bass<loud,'Stale input must release smoothly rather than jump or stay loud');
 assert.equal(fading.beat,0,'A stale beat must not remain active');
 for(let now=1480;now<=2600;now+=16)envelope.read(now);
 const silent=envelope.read(2616);
 assert.ok(silent.bass<.001&&silent.energy<.001);
 assert.equal(silent.beatCount,1,'Silence must retain the cumulative event count');
 for(let i=0;i<64;i++)assert.equal(silent.spectrum[i*4],0);
 for(let i=0;i<256;i++)assert.deepEqual(Array.from(silent.wave.subarray(i*4,i*4+4)),[128,128,128,255]);
 envelope.push(packet(11,{beatCount:2}),2632);
 assert.ok(envelope.read(2648).bass>.5,'Fresh analysis should recover promptly after an interruption');
});

test('Pausing suppresses beats and wave motion even while fresh analysis packets arrive',()=>{
 const envelope=new FeatureEnvelope();
 envelope.push(packet(1),1000);
 assert.ok(envelope.read(1016,true).beat>0);
 envelope.push(packet(2,{beatCount:2}),1032);
 const paused=envelope.read(1048,false);
 assert.equal(paused.beat,0);
 assert.equal(paused.wave[0],128);
 assert.equal(paused.beatCount,2);
 assert.ok(paused.bass>=0&&Number.isFinite(paused.bass));
});

test('Repeated render frames reuse output and texture buffers while updating their audio content',()=>{
 const envelope=new FeatureEnvelope();
 envelope.push(packet(1),1000);
 const output=envelope.read(1016),spectrum=output.spectrum,wave=output.wave;
 assert.equal(spectrum.length,64*4);
 assert.equal(wave.length,256*4);
 assert.equal(wave[0],192);
 const before=spectrum[0];
 for(let i=0;i<120;i++){
  const now=1032+i*16;
  if(i%2===0)envelope.push(packet(2+i,{bands:new Array(64).fill(20),waveform:new Array(256).fill(144)}),now);
  const next=envelope.read(now);
  assert.strictEqual(next,output);
  assert.strictEqual(next.spectrum,spectrum);
  assert.strictEqual(next.wave,wave);
 }
 assert.ok(spectrum[0]<before,'The reused spectrum must contain the new quieter input');
 assert.equal(wave[0],144,'The reused waveform must contain the latest native samples');
});
