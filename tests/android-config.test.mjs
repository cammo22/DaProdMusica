import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('Android generation installs the Back dispatcher and native catalog idempotently',async()=>{
 const fixture=await mkdtemp(join(tmpdir(),'dap-config-'));
 const main='src-tauri/gen/android/app/src/main';
 try{
  for(const dir of [`${main}/java/io/github/test`, 'src-tauri/icons/android','public/media','public/artwork'])await mkdir(join(fixture,dir),{recursive:true});
  await writeFile(join(fixture,main,'AndroidManifest.xml'),'<manifest><application><activity android:supportsPictureInPicture="true" /></application></manifest>');
  await writeFile(join(fixture,'src-tauri/gen/android/app/build.gradle.kts'),'plugins {}\n');
  await writeFile(join(fixture,main,'java/io/github/test/MainActivity.kt'),'package io.github.test\nclass MainActivity:TauriActivity()');
  await writeFile(join(fixture,'public/catalog.json'),'{"albums":[]}');
  const script=fileURLToPath(new URL('../scripts/configure-android.mjs',import.meta.url));
  for(let i=0;i<2;i++){
   const result=spawnSync(process.execPath,[script],{cwd:fixture,encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);
  }
  const manifest=await readFile(join(fixture,main,'AndroidManifest.xml'),'utf8');
  assert.equal((manifest.match(/android:enableOnBackInvokedCallback="true"/g)||[]).length,1);
  assert.doesNotMatch(manifest,/supportsPictureInPicture/);
  const activity=await readFile(join(fixture,main,'java/io/github/test/MainActivity.kt'),'utf8');
  assert.match(activity,/package io\.github\.test/);
  assert.match(activity,/onBackPressedDispatcher\.addCallback/);
  assert.match(activity,/handleOnBackPressed\(\)\{MusicPlugin\.back\(\)\}/);
  assert.equal(await readFile(join(fixture,main,'assets/catalog.json'),'utf8'),'{"albums":[]}');
  const build=await readFile(join(fixture,'src-tauri/gen/android/app/build.gradle.kts'),'utf8');
  assert.equal((build.match(/DaProd native audio/g)||[]).length,1);
 }finally{
  assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep));
  await rm(fixture,{recursive:true,force:true});
 }
});
