import test from 'node:test';
import assert from 'node:assert/strict';
import {PlaybackController,nextTrackIndex} from '../src/playback.js';
import {readPreference,writePreference} from '../src/storage.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('Rapid track changes keep the newest selection even if preparation resolves out of order',async()=>{
 const waits=[deferred(),deferred()];let calls=0;const played=[],errors=[];
 const audio={src:'',async play(){played.push(this.src);},pause(){}};
 const controller=new PlaybackController(audio,()=>waits[calls++].promise,e=>errors.push(e));
 const first=controller.play(()=>audio.src='old'),second=controller.play(()=>audio.src='new');
 waits[1].resolve();await second;waits[0].resolve();await first;
 assert.deepEqual(played,['new']);assert.deepEqual(errors,[]);
});
test('Pause cancels a pending play request before it can start sound',async()=>{
 const ready=deferred();let plays=0,pauses=0;
 const controller=new PlaybackController({play(){plays++;},pause(){pauses++;}},()=>ready.promise,()=>{});
 const pending=controller.play();controller.pause();ready.resolve();await pending;
 assert.equal(plays,0);assert.equal(pauses,1);
});
test('Track completion stops at album end unless repeat is enabled',()=>{
 assert.equal(nextTrackIndex(2,3,{ended:true}),null);
 assert.equal(nextTrackIndex(2,3,{ended:true,repeat:true}),0);
 assert.equal(nextTrackIndex(0,3,{direction:-1}),2);
 assert.equal(nextTrackIndex(0,0),null);
});
test('Shuffle never picks the current track, including two-track albums',()=>{
 for(let i=0;i<3;i++)for(const random of [()=>0,()=>.999])assert.notEqual(nextTrackIndex(i,3,{shuffle:true,random}),i);
 assert.equal(nextTrackIndex(0,2,{shuffle:true,random:()=>0}),1);
});
test('Broken storage and invalid preferences fall back without breaking playback',()=>{
 assert.equal(readPreference({getItem:()=> '3'},'volume',.8,n=>n>=0&&n<=1),.8);
 assert.deepEqual(readPreference({getItem:()=> '{'},'favorites',[]),[]);
 assert.equal(writePreference({setItem(){throw Error('quota');}},'test',1),false);
});
