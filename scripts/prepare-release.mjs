import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,access} from 'node:fs/promises';
const repo='cammo22/DaProdMusica';
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const tag='v'+pkg.version,notes='releases/'+pkg.version+'.md';await access(notes);
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({repo,tag,commit,notes,workflow:'release.yml',ref:'main'},null,2));process.exit(0);}
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Commit and push changes before preparing the release.');
const remote=execFileSync('git',['ls-remote','origin','refs/heads/main'],{encoding:'utf8'}).trim().split(/\s/)[0];
if(remote!==commit)throw Error('The local commit must match origin/main before dispatching a release.');
const run=args=>execFileSync('gh',[...args,'--repo',repo],{stdio:'inherit'});
const existing=spawnSync('gh',['release','view',tag,'--repo',repo,'--json','isDraft,targetCommitish'],{encoding:'utf8'});
if(existing.status===0){const release=JSON.parse(existing.stdout);if(!release.isDraft)throw Error('This release is already published. Bump the version.');if(release.targetCommitish!==commit)throw Error('The existing draft targets a different commit. Inspect it before changing release contents.');}
else run(['release','create',tag,'--draft','--prerelease','--target',commit,'--title',`DaProd Musica ${pkg.version} — Universi sonori`,'--notes-file',notes]);
// The local gh login can prepare a draft even when the Actions token cannot
// create a release for a commit that changed workflow definitions. No PAT is stored.
run(['workflow','run','release.yml','--ref','main']);
