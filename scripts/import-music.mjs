import { readdir, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parseFile, selectCover } from 'music-metadata';
const root = resolve(process.argv[2] || 'C:/Users/cammo/Desktop/dapmusica');
const out = resolve('public');
const themes = {
  'vesuvio quantico': { color: '#99efd8', world: 'Memoria liquida', subtitle: 'Un ricordo del futuro, anno 2000.', description: 'Vetro azzurro, vecchie radio e pomeriggi che non finiscono. Le voci di ieri galleggiano in un mare digitale: Napoli, come la ricordi in un sogno.', art: 'vesuvio', preset:'musica.aero-tides', era:'2000 / MEMORIE SOMMERSE' },
  'sistema.exe': { color: '#79d9ff', world: 'Nucleo sintetico', subtitle: 'Connessione stabilita. Entra nel nucleo.', description: 'Architetture impossibili, metallo liquido e segnali che attraversano la rete. Ogni traccia è una porta: il sistema ti sta ascoltando.', art: 'sistema', preset:'daprod.neon-tunnel', era:'2099 / SISTEMA ONLINE' },
  'DaProdSelecta': { color: '#edb584', world: 'Archivio sepolto', subtitle: 'Segnali recuperati. Qualcuno era qui.', description: 'Secoli dopo il lampo, sotto la cenere resta una memoria. Nastri ossidati, frequenze spezzate, voci sopravvissute alla terra. Premi play: riporta alla luce ciò che resta.', art: 'selecta', preset:'daprod.glitch-tape', era:'2476 / ARCHIVIO RIESUMATO' }
};
const id = text => createHash('sha256').update(text).digest('hex').slice(0,16);
const albums = [];
for (const folder of (await readdir(root, { withFileTypes: true })).filter(x=>x.isDirectory())) {
  const aid = id(folder.name); const tracks = [];
  await mkdir(join(out, 'media', aid), { recursive: true });
  for (const name of (await readdir(join(root,folder.name))).sort((a,b)=>a.localeCompare(b,'it',{numeric:true}))) {
    if (!['.mp3','.wav','.flac','.ogg','.m4a'].includes(extname(name).toLowerCase())) continue;
    const tid = id(folder.name + '/' + name), file = tid + extname(name).toLowerCase();
    await copyFile(join(root,folder.name,name), join(out,'media',aid,file));
    const meta=await parseFile(join(root,folder.name,name));
    const picture=selectCover(meta.common.picture);let artwork;
    if(picture){const hash=createHash('sha256').update(picture.data).digest('hex').slice(0,20),extension=picture.format.includes('png')?'png':picture.format.includes('webp')?'webp':'jpg';artwork=`artwork/${hash}.${extension}`;await mkdir(join(out,'artwork'),{recursive:true});await writeFile(join(out,artwork),picture.data);}
    tracks.push({ id: tid, title: meta.common.title?.trim() || basename(name,extname(name)).replace(/^SinteticoMC - /,'').replace(/_/g,' ').replace(/\s+/g,' ').trim(), artist: meta.common.artist || (folder.name === 'sistema.exe' ? 'Sintetico MC · DaProd' : 'DaProd'), src: `media/${aid}/${file}`, artwork, duration:meta.format.duration||0 });
  }
  if(tracks.length) albums.push({ id: aid, title: folder.name, ...(themes[folder.name] || {color:'#c3a1ff',world:'Orbita',subtitle:'Un nuovo universo.',description:'La tua musica, una nuova dimensione.',art:'selecta'}), artwork:tracks.find(t=>t.artwork)?.artwork, tracks });
}
albums.sort((a,b)=> (a.art==='vesuvio'?-1:b.art==='vesuvio'?1:0));
await writeFile(join(out,'catalog.json'), JSON.stringify({ version:1, albums }, null,2));
console.log(`Importati ${albums.length} album e ${albums.reduce((s,a)=>s+a.tracks.length,0)} brani. Gli originali non sono stati modificati.`);

