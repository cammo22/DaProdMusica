import test from 'node:test';
import assert from 'node:assert/strict';
import {sheetDestination} from '../src/player-sheet.js';

test('Opening the player accepts an intentional upward drag or fling and rejects a small pull',()=>{
 const height=800;
 assert.equal(sheetDestination(500,0,height,true),0,'A substantial upward pull must finish opening');
 assert.equal(sheetDestination(760,0,height,true),height,'A small pull should return to the mini player');
 assert.equal(sheetDestination(760,-1,height,true),0,'A quick upward fling should finish opening');
 assert.equal(sheetDestination(760,1,height,true),height,'A downward movement should not complete a small opening');
});

test('Closing the player requires a substantial downward drag or an intentional downward fling',()=>{
 const height=800;
 assert.equal(sheetDestination(20,0,height),0,'A small accidental drag must snap back');
 assert.equal(sheetDestination(320,0,height),height,'A substantial downward pull must close');
 assert.equal(sheetDestination(100,1,height),height,'A downward fling should close');
 assert.equal(sheetDestination(100,-1,height),0,'An upward fling must keep a mostly open player');
 assert.equal(sheetDestination(10,4,height),0,'A very short touch must not close the player solely from velocity');
});

test('Sheet settling always lands on an endpoint across short, tall and over-pulled viewports',()=>{
 for(const height of [0,160,540,800,1400]){
  for(const opening of [false,true]){
   for(const offset of [-height,0,1,height*.25,height*.5,height,height*2]){
    for(const velocity of [-3,-.1,0,.1,3]){
     const destination=sheetDestination(offset,velocity,height,opening);
     assert.ok(destination===0||destination===height,`Partial settled sheet: ${JSON.stringify({height,opening,offset,velocity,destination})}`);
    }
   }
  }
  assert.equal(sheetDestination(0,0,height),0);
  assert.equal(sheetDestination(height,0,height,true),height);
 }
});
