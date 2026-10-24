import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioFeatures} from '../src/audio-features.js';
test('Silence stays silent with neutral waveform and no false beat',()=>{
 const f=new AudioFeatures().update(new Uint8Array(1024),new Uint8Array(2048).fill(128),48000,2048,1);
 assert.equal(f.rms,0);assert.equal(f.beat,0);assert.equal(f.energy,0);assert.equal(f.centroid,0);assert.equal(f.wave[0],128);
});
test('A transient drives onset and has a refractory period',()=>{
 const analyzer=new AudioFeatures(),frequency=new Uint8Array(1024).fill(180),wave=new Uint8Array(2048).fill(192);
 const a=analyzer.update(frequency,wave,48000,2048,1);const b=analyzer.update(frequency,wave,48000,2048,1.01);
 assert.equal(a.beat,1);assert.equal(b.beat,0);assert.equal(a.rms,.5);assert.ok(a.onset>0);assert.equal(a.spectrum.length,256);
});
