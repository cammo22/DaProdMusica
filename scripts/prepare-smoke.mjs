import {readFile,mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {basename} from 'node:path';
// Exercise the production bundle in Android WebView, rather than a DOM fixture.
// Fail early if the caller forgot `npm run build:player`.
await readFile('dist/index.html');
const catalog=JSON.parse(await readFile('public/catalog.json','utf8'));
const root='native-smoke/app/src/main';await mkdir(root+'/assets',{recursive:true});
await cp('public/catalog.json',root+'/assets/catalog.json');
for(const file of ['PlaybackService.kt','PlaybackWidget.kt','BackNavigation.kt','UpdateController.kt']){
 await cp('src-tauri/plugins/music/android/src/main/java/'+file,root+'/java/io/github/cammo22/smoke/'+file);
}
await cp('src-tauri/plugins/music/android/src/main/res',root+'/res',{recursive:true});
await cp('public/media',root+'/assets/media',{recursive:true});await cp('public/artwork',root+'/assets/artwork',{recursive:true});
await rm(root+'/assets/player',{recursive:true,force:true});
await cp('dist',root+'/assets/player',{recursive:true,filter:path=>!['media','artwork'].includes(basename(path))});
await rm(root+'/java/io/github/cammo22/smoke/PipController.kt',{force:true});
const tracks=[];const indices=[];
for(const album of catalog.albums){indices.push(tracks.length);tracks.push(...album.tracks.map(track=>({...track,album:album.title})));}
await writeFile(root+'/assets/samples.json',JSON.stringify({tracks,indices}));

