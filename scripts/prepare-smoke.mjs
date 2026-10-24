import {readFile,mkdir,cp,writeFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('public/catalog.json','utf8'));
const root='native-smoke/app/src/main';await mkdir(root+'/assets',{recursive:true});
await cp('src-tauri/plugins/music/android/src/main/java/PlaybackService.kt',root+'/java/io/github/cammo22/smoke/PlaybackService.kt');
await cp('public/media',root+'/assets/media',{recursive:true});await cp('public/artwork',root+'/assets/artwork',{recursive:true});
await cp('src-tauri/plugins/music/android/src/main/java/PipController.kt',root+'/java/io/github/cammo22/smoke/PipController.kt');
const tracks=[];const indices=[];
for(const album of catalog.albums){indices.push(tracks.length);tracks.push(...album.tracks.map(track=>({...track,album:album.title})));}
await writeFile(root+'/assets/samples.json',JSON.stringify({tracks,indices}));

