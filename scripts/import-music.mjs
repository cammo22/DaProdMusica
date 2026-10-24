import { readdir, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || 'C:/Users/cammo/Desktop/dapmusica');
const out = resolve('public');
const themes = {
  'vesuvio quantico': { color: '#ff875b', world: 'Magma', subtitle: 'Radici antiche. Frequenze future.', description: 'La voce di Napoli attraversa una nuova dimensione. Un viaggio tra memoria, lava e frequenze elettroniche.', art: 'vesuvio' },
  'sistema.exe': { color: '#a6f777', world: 'Circuito', subtitle: 'Umano. Sintetico. Fuori controllo.', description: 'Accendi il sistema. Tra identità digitali e impulsi elettrici, ogni traccia apre una nuova connessione.', art: 'sistema' },
  'DaProdSelecta': { color: '#c3a1ff', world: 'Orbita', subtitle: 'Nessuna regola. Solo vibrazioni.', description: 'La selezione DaProd: incontri inattesi, traiettorie libere e suoni da abitare.', art: 'selecta' }
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
    tracks.push({ id: tid, title: basename(name,extname(name)).replace(/^SinteticoMC - /,'').replace(/_/g,' ').replace(/\s+/g,' ').trim(), artist: folder.name === 'sistema.exe' ? 'Sintetico MC · DaProd' : 'DaProd', src: `media/${aid}/${file}` });
  }
  if(tracks.length) albums.push({ id: aid, title: folder.name, ...(themes[folder.name] || {color:'#c3a1ff',world:'Orbita',subtitle:'Un nuovo universo.',description:'La tua musica, una nuova dimensione.',art:'selecta'}), tracks });
}
albums.sort((a,b)=> (a.art==='vesuvio'?-1:b.art==='vesuvio'?1:0));
await writeFile(join(out,'catalog.json'), JSON.stringify({ version:1, albums }, null,2));
console.log(`Importati ${albums.length} album e ${albums.reduce((s,a)=>s+a.tracks.length,0)} brani. Gli originali non sono stati modificati.`);
