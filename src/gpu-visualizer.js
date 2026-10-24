import {composeShader,vertexSource as vertex,displaySource as display} from './shader-source.js';
import common from './suite-presets/common.glsl?raw';
import { FallbackVisualizer } from './visualizer-fallback.js';
const bodies=import.meta.glob('./suite-presets/*/*.frag',{query:'?raw',import:'default',eager:true});
const manifests=import.meta.glob('./suite-presets/*/preset.json',{import:'default',eager:true});
export const PRESETS=Object.values(manifests).map(manifest=>({manifest,body:bodies[Object.keys(bodies).find(path=>path.includes('/'+Object.keys(manifests).find(p=>manifests[p]===manifest).split('/')[2]+'/'))]}));
const aliases={Magma:'daprod.fractal-pulse',Circuito:'daprod.neon-tunnel',Orbita:'daprod.inchiostro'};
const uniformName=name=>'u'+name.charAt(0).toUpperCase()+name.slice(1);

// GPU scenes adapted from DaProdSuite, with touch warping and feedback trails.
// See third-party/DaProdSuite-LICENSE.txt and THIRD_PARTY.md.
export class Visualizer {
  constructor(canvas,readAudio,onError=()=>{}) {
    this.canvas=canvas;this.readAudio=readAudio;this.onError=onError;
    this.mode='Magma';this.intensity=.65;this.enabled=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.quality=matchMedia('(pointer:coarse)').matches?.65:1;this.time=0;this.last=0;this.pointer=[0,0];this.press=0;this.programs=new Map();this.targets=[];this.front=0;this.values={};
    this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
    if(!this.gl){return new FallbackVisualizer(canvas,readAudio);}
    this.init();
    canvas.addEventListener('pointermove',e=>this.move(e));
    canvas.addEventListener('pointerdown',e=>{this.move(e);this.press=1;canvas.setPointerCapture(e.pointerId);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>this.press=0);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});
    canvas.addEventListener('webglcontextrestored',()=>{this.programs.clear();this.targets=[];this.init();this.size();this.lost=false;});
    this.resize=new ResizeObserver(()=>this.size());this.resize.observe(canvas);this.size();
    this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  move(e){const r=this.canvas.getBoundingClientRect();this.pointer=[(e.clientX-r.left)/r.width-.5,.5-(e.clientY-r.top)/r.height];}
  shader(type,source){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message);}return s;}
  program(fragment){const gl=this.gl,p=gl.createProgram(),v=this.shader(gl.VERTEX_SHADER,vertex),f=this.shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));const uniforms={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);uniforms[u.name]=gl.getUniformLocation(p,u.name);}return {p,uniforms};}
  texture(width,height,data=null){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,data);return t;}
  init(){const gl=this.gl;this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);this.blit=this.program(display);this.spectrum=this.texture(64,1,new Uint8Array(256));const wave=new Uint8Array(1024).fill(128);this.wave=this.texture(256,1,wave);}
  size(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const scale=Math.min(devicePixelRatio||1,1.5)*this.quality,cap=Math.min(1,1200/(r.width*scale));const width=Math.max(1,Math.round(r.width*scale*cap)),height=Math.max(1,Math.round(r.height*scale*cap));if(this.canvas.width===width&&this.canvas.height===height&&this.targets.length)return;this.canvas.width=width;this.canvas.height=height;const gl=this.gl;for(const target of this.targets){gl.deleteTexture(target.t);gl.deleteFramebuffer(target.f);}this.targets=[0,1].map(()=>{const t=this.texture(width,height),f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Framebuffer non disponibile');gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);return {t,f};});gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
  bind(program){const gl=this.gl;gl.useProgram(program.p);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);const a=gl.getAttribLocation(program.p,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);}
  scene(){const id=aliases[this.mode]||this.mode,entry=PRESETS.find(p=>p.manifest.id===id)||PRESETS[0];if(!this.programs.has(id)){
    const fragment=composeShader(common,entry.body);
    this.programs.set(id,{...this.program(fragment),manifest:entry.manifest});
  }return this.programs.get(id);}
  frame(now){requestAnimationFrame(this.frame);if(this.lost||document.hidden||!this.enabled||!this.targets.length||now-this.last<(this.reduced?100:33))return;const dt=Math.min(.1,(now-this.last)/1000);this.last=now;this.time+=dt*(this.reduced?.15:1);try{const gl=this.gl,scene=this.scene(),u=scene.uniforms,a=this.readAudio();this.bind(scene);const set=(name,value)=>{if(u[name]!=null)gl.uniform1f(u[name],value);};
    for(const [name,parameter]of Object.entries(scene.manifest.parameters))set(uniformName(name),parameter.default);
    for(const name of ['bass','mid','treble','rms','peak','beat','onset','centroid','energy','beatCount'])set(uniformName(name),(a[name]||0)*(this.reduced&&['beat','onset'].includes(name)?0:1));
    for(const mapping of scene.manifest.audioMappings){const key=scene.manifest.id+mapping.target,old=this.values[key]||0,value=(a[mapping.source]||0)*mapping.amount;this.values[key]=old+(value-old)*(1-Math.exp(-dt/Math.max(.001,mapping.smoothing)));set(uniformName(mapping.target),this.reduced&&['beat','onset'].includes(mapping.source)?0:this.values[key]);}
    set('uTime',this.time);set('uDelta',dt);set('uIntensity',.5+this.intensity*.8);set('uAspect',this.canvas.width/this.canvas.height);set('uPosition',a.position||0);set('uTouch',this.press);set('uFeedback',this.reduced?0:.28);
    if(u.uResolution!=null)gl.uniform2f(u.uResolution,this.canvas.width,this.canvas.height);if(u.uPointer!=null)gl.uniform2f(u.uPointer,...this.pointer);
    for(const [unit,name,texture,pixels,width]of [[0,'uSpectrum',this.spectrum,a.spectrum,64],[1,'uWave',this.wave,a.wave,256],[2,'uPrevious',this.targets[this.front].t,null,0]]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);if(pixels)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);if(u[name]!=null)gl.uniform1i(u[name],unit);}
    const target=this.targets[1-this.front];gl.bindFramebuffer(gl.FRAMEBUFFER,target.f);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.bind(this.blit);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,target.t);gl.uniform1i(this.blit.uniforms.image,0);gl.drawArrays(gl.TRIANGLES,0,6);this.front=1-this.front;
  }catch(error){this.enabled=false;this.onError('Il dispositivo non riesce ad avviare questo effetto. Prova un altro ambiente.');console.error(error);}}
}
