import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,access,readdir} from 'node:fs/promises';
const repo='cammo22/DaProdMusica';
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const tag='v'+pkg.version,notes='releases/'+pkg.version+'.md';await access(notes);
for(const entry of await readdir(new URL('../src/suite-presets/',import.meta.url),{withFileTypes:true})){
 if(!entry.isDirectory())continue;
 const preset=JSON.parse(await readFile(new URL('../src/suite-presets/'+entry.name+'/preset.json',import.meta.url),'utf8'));
 const png=await readFile(new URL('../public/effect-previews/'+preset.id+'.png',import.meta.url));
 if(png.subarray(1,4).toString()!=='PNG'||png.readUInt32BE(16)<96||png.readUInt32BE(20)<96)throw Error('Missing or invalid preview: '+preset.id);
}

const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({repo,tag,commit,notes,workflow:'release.yml',ref:'main'},null,2));process.exit(0);}
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Commit and push changes before preparing the release.');
const remote=execFileSync('git',['ls-remote','origin','refs/heads/main'],{encoding:'utf8'}).trim().split(/\s/)[0];
if(remote!==commit)throw Error('The local commit must match origin/main before dispatching a release.');
const run=args=>execFileSync('gh',[...args,'--repo',repo],{stdio:'inherit'});
const existing=spawnSync('gh',['release','view',tag,'--repo',repo,'--json','tagName'],{encoding:'utf8'});
if(existing.status===0)throw Error('This version already has a release. Bump the version.');
if(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()!=='main')throw Error('Releases must be built from main.');
// Build artifacts first. Publication is a single stable release after validation.
run(['workflow','run','release.yml','--ref','main']);
