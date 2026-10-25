import {readFile,writeFile,readdir,cp,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const root='src-tauri/gen/android/app/src/main';
const manifest=root+'/AndroidManifest.xml';let xml=await readFile(manifest,'utf8');
xml=xml.replace(/android:supportsPictureInPicture="true"\s*/g,'');
if(!xml.includes('android:enableOnBackInvokedCallback'))xml=xml.replace('<application','<application android:enableOnBackInvokedCallback="true"');
await writeFile(manifest,xml);
await cp('src-tauri/icons/android',root+'/res',{recursive:true});
const gradle='src-tauri/gen/android/app/build.gradle.kts';let build=await readFile(gradle,'utf8');if(!build.includes('DaProd native audio'))build+='\n// DaProd native audio: allow efficient seeking without decompressing songs.\nandroid { androidResources { noCompress += listOf("mp3", "flac", "wav", "ogg", "m4a") } }\n';await writeFile(gradle,build);
async function find(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await find(path);else if(entry.name==='MainActivity.kt'){
 const source=await readFile(path,'utf8'),pkg=source.match(/package\s+([\w.]+)/)[1];
 await writeFile(path,`package ${pkg}
import android.os.Bundle
import androidx.activity.OnBackPressedCallback
import io.github.cammo22.music.MusicPlugin
class MainActivity:TauriActivity(){
 override fun onCreate(savedInstanceState:Bundle?){
  super.onCreate(savedInstanceState)
  onBackPressedDispatcher.addCallback(this,object:OnBackPressedCallback(true){override fun handleOnBackPressed(){MusicPlugin.back()}})
 }
}

`);
}}}
await find(root+'/java');
await mkdir(root+'/assets',{recursive:true});
await cp('public/media',root+'/assets/media',{recursive:true});
await cp('public/artwork',root+'/assets/artwork',{recursive:true});
await cp('public/catalog.json',root+'/assets/catalog.json');
console.log('Native audio, widget, launcher icons and Back navigation configured.');
