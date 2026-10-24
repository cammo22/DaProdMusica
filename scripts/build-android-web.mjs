import {execFileSync} from 'node:child_process';
import {rm} from 'node:fs/promises';
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build:player'],{stdio:'inherit',shell:process.platform==='win32'});
// Audio is in native Android assets. Do not embed a duplicate in the Rust binary.
await rm(new URL('../dist/media',import.meta.url),{recursive:true,force:true});
