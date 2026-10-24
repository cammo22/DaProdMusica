import {readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const config=JSON.parse(await readFile('media-bundle.json','utf8'));
execFileSync('gh',['release','download',config.tag,'--repo','cammo22/DaProdMusica','--pattern',config.asset,'--dir','.media-cache','--skip-existing'],{stdio:'inherit'});
const file='.media-cache/'+config.asset,hash=createHash('sha256');
for await(const chunk of createReadStream(file))hash.update(chunk);
if(hash.digest('hex')!==config.sha256)throw Error('Catalogo audio corrotto: checksum non valido');
execFileSync('python',['-c',`import zipfile, pathlib, sys
root=pathlib.Path('public').resolve()
with zipfile.ZipFile(sys.argv[1]) as z:
 for name in z.namelist():
  target=(root/name).resolve()
  if not target.is_relative_to(root) or not name.startswith('media/'): raise ValueError('Invalid archive path')
 z.extractall(root)
`,file],{stdio:'inherit'});
console.log('Catalogo audio verificato e pronto per la release.');
