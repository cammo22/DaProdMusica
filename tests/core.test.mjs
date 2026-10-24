import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLRC,parseEditableLRC,toLRC,lyricIndex,newer,validateLyrics,escapeHTML} from '../src/core.js';
test('LRC supports repeated tags, fractions and chronological sorting',()=>{
  const lines=parseLRC('[ar:DaProd]\n[01:03.125][00:02.5]Voce\n[00:01]Prima\n[00:99]invalid');
  assert.deepEqual(lines,[{time:1,text:'Prima'},{time:2.5,text:'Voce'},{time:63.125,text:'Voce'}]);
  assert.equal(lyricIndex(lines,0),-1);assert.equal(lyricIndex(lines,2.5),1);assert.equal(lyricIndex(lines,99),2);
});
test('LRC export round trip retains words and centisecond timestamps',()=>{const lines=[{time:0,text:'Ciao'},{time:72.34,text:'È musica'}];assert.deepEqual(parseLRC(toLRC(lines)),lines);});
test('LRC rounding carries seconds into the next minute',()=>assert.equal(toLRC([{time:59.999,text:'Voce'}]),'[01:00.00]Voce'));
test('Studio refuses a partially untimed document rather than silently dropping lines',()=>{
 assert.throws(()=>parseEditableLRC('[00:01]Prima\nDa sincronizzare'),/riga 2/);
 assert.throws(()=>parseEditableLRC('[00:99]Errore'),/riga 1/);
 assert.deepEqual(parseEditableLRC('[ar:DaProd]\n[00:01]Voce'),[{time:1,text:'Voce'}]);
});
test('Only stable newer releases trigger updates',()=>{assert.equal(newer('v0.2.0'),true);assert.equal(newer('v0.1.0'),false);assert.equal(newer('0.0.9'),false);assert.equal(newer('v1.0.0-beta'),false);assert.equal(newer('junk'),false);assert.equal(newer('0.10.0','0.9.0'),true);});
test('Imported lyrics reject malformed or unsafe time data',()=>{assert.throws(()=>validateLyrics({version:1,tracks:{song:[{time:-1,text:'x'}]}}));assert.throws(()=>validateLyrics({version:1,tracks:{song:[{time:NaN,text:'x'}]}}));assert.throws(()=>validateLyrics({version:2,tracks:{}}));assert.deepEqual(validateLyrics({version:1,tracks:{song:[{time:2,text:'b'},{time:0,text:'a'}]}}).song[0],{time:0,text:'a'});});
test('Titles cannot inject markup',()=>assert.equal(escapeHTML('<img src="x">'), '&lt;img src=&quot;x&quot;&gt;'));
