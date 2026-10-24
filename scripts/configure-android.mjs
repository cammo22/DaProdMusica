import {readFile,writeFile,readdir,cp,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const root='src-tauri/gen/android/app/src/main';
const manifest=root+'/AndroidManifest.xml';let xml=await readFile(manifest,'utf8');
if(!xml.includes('android:supportsPictureInPicture'))xml=xml.replace(/<activity\s/,'<activity android:supportsPictureInPicture="true" android:resizeableActivity="true" ');
await writeFile(manifest,xml);
const gradle='src-tauri/gen/android/app/build.gradle.kts';let build=await readFile(gradle,'utf8');if(!build.includes('DaProd native audio'))build+='\n// DaProd native audio: allow efficient seeking without decompressing songs.\nandroid { androidResources { noCompress += listOf("mp3", "flac", "wav", "ogg", "m4a") } }\n';await writeFile(gradle,build);
async function find(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await find(path);else if(entry.name==='MainActivity.kt'){
 const source=await readFile(path,'utf8'),pkg=source.match(/package\s+([\w.]+)/)[1];
 await writeFile(path,`package ${pkg}
import android.content.res.Configuration
import io.github.cammo22.music.MusicPlugin
class MainActivity:TauriActivity(){
 override fun onUserLeaveHint(){super.onUserLeaveHint();MusicPlugin.leave(this)}
 override fun onPictureInPictureModeChanged(value:Boolean,config:Configuration){super.onPictureInPictureModeChanged(value,config);MusicPlugin.pipChanged(value)}
}
`);
}}}
await find(root+'/java');
await mkdir(root+'/assets',{recursive:true});
await cp('public/media',root+'/assets/media',{recursive:true});
await cp('public/artwork',root+'/assets/artwork',{recursive:true});
console.log('Native audio assets and PiP activity configured.');
