import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const catalog=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
test('Every imported track has a unique id and a readable audio file',{skip:!existsSync(new URL('../public/media',import.meta.url))},async()=>{
 const seen=new Set();for(const album of catalog.albums){assert.ok(album.tracks.length>0);for(const track of album.tracks){assert.ok(!seen.has(track.id));seen.add(track.id);assert.ok(!track.src.includes('..'));const file=await stat(new URL('../public/'+track.src,import.meta.url));assert.ok(file.size>0);}}assert.ok(seen.size>0);
});
