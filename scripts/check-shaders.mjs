import {readFile,readdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {composeShader,vertexSource,displaySource} from '../src/shader-source.js';
const root='src/suite-presets',common=await readFile(root+'/common.glsl','utf8'),out=await mkdtemp(join(tmpdir(),'dap-shaders-'));
const vert=join(out,'scene.vert');await writeFile(vert,vertexSource);
execFileSync(process.env.GLSLANG || 'glslangValidator',[vert],{stdio:'inherit'});
for(const dir of await readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory())continue;
 for(const file of await readdir(root+'/'+dir.name))if(file.endsWith('.frag')){
  const fragment=join(out,dir.name+'.frag'),source=await readFile(root+'/'+dir.name+'/'+file,'utf8');
  const meshVertex=(await readdir(root+'/'+dir.name)).find(f=>f.endsWith('.vert'));
  let vertex=vert;
  if(meshVertex){vertex=join(out,dir.name+'.vert');await writeFile(vertex,'attribute vec3 position;uniform mat4 projectionMatrix;uniform mat4 modelViewMatrix;\n'+await readFile(root+'/'+dir.name+'/'+meshVertex,'utf8'));await writeFile(fragment,source);}
  else await writeFile(fragment,composeShader(common,source,JSON.parse(await readFile(root+'/'+dir.name+'/preset.json','utf8')).id));
  execFileSync(process.env.GLSLANG || 'glslangValidator',['-l',vertex,fragment],{stdio:'inherit'});
 }
}
const final=join(out,'display.frag');await writeFile(final,displaySource);execFileSync(process.env.GLSLANG || 'glslangValidator',['-l',vert,final],{stdio:'inherit'});

