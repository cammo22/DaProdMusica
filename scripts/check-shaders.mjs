import {readFile,readdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {composeShader,vertexSource,displaySource} from '../src/shader-source.js';
const root='src/suite-presets',common=await readFile(root+'/common.glsl','utf8'),out=await mkdtemp(join(tmpdir(),'dap-shaders-'));
const vert=join(out,'scene.vert');await writeFile(vert,vertexSource);
execFileSync('glslangValidator',[vert],{stdio:'inherit'});
for(const dir of await readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory())continue;
 for(const file of await readdir(root+'/'+dir.name))if(file.endsWith('.frag')){
  const fragment=join(out,dir.name+'.frag');await writeFile(fragment,composeShader(common,await readFile(root+'/'+dir.name+'/'+file,'utf8')));
  execFileSync('glslangValidator',['-l',vert,fragment],{stdio:'inherit'});
 }
}
const final=join(out,'display.frag');await writeFile(final,displaySource);execFileSync('glslangValidator',['-l',vert,final],{stdio:'inherit'});
