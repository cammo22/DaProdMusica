// Geometry and vertex programs ported from the Suite's actual mesh scenes.
import bloom from './suite-presets/AudioBloom/bloom.vert?raw';
import dust from './suite-presets/CosmicDust/dust.vert?raw';
import {random} from './evolution.js';
export function meshScene(gl,id,mobile){
 const isDust=id==='daprod.cosmic-dust';if(!isDust&&id!=='daprod.audio-bloom')return null;
 const geometry={};const buffer=(name,data,size)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);geometry[name]={b,size};};
 let count;
 if(isDust){count=mobile?14000:30000;const rng=random(22062026),seeds=new Float32Array(count*3),rands=new Float32Array(count);for(let i=0;i<count;i++){const r=Math.sqrt(rng());seeds.set([r,rng()*Math.PI*2,(rng()+rng()+rng()-1.5)*.8*(1.1-r*.7)],i*3);rands[i]=rng();}buffer('position',new Float32Array(count*3),3);buffer('aSeed',seeds,3);buffer('aRand',rands,1);
 }else{const points=[],segments=mobile?160:320,rings=12;const point=(r,a)=>points.push(Math.cos(a)*r,Math.sin(a)*r,0);for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,r=.04+j/rings*.96,s=.04+(j+1)/rings*.96;point(r,a);point(s,a);point(s,b);point(r,a);point(s,b);point(r,b);}count=points.length/3;buffer('position',new Float32Array(points),3);}
 return {vertex:'attribute vec3 position;uniform mat4 projectionMatrix;uniform mat4 modelViewMatrix;\n'+(isDust?dust:bloom),geometry,count,isDust};
}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function view(eye){const normalize=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],z=normalize(eye),x=normalize(cross([0,1,0],z)),y=cross(z,x),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
export function drawMesh(gl,scene,time,aspect,pointer,height){
 const u=scene.uniforms,m=scene.mesh;
 for(const [name,{b,size}]of Object.entries(m.geometry)){const a=gl.getAttribLocation(scene.p,name);if(a<0)continue;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,0,0);}
 gl.clearColor(.005,.008,.025,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 if(m.isDust){const orbit=time*.035+pointer[0]*.5,eye=[Math.sin(orbit)*12,5+pointer[1]*4,Math.cos(orbit)*12];gl.uniformMatrix4fv(u.projectionMatrix,false,perspective(58*Math.PI/180,aspect,.1,220));gl.uniformMatrix4fv(u.modelViewMatrix,false,view(eye));gl.uniform1f(u.uHeightScale,Math.min(1.5,height/800));gl.drawArrays(gl.POINTS,0,m.count);
 }else{const scale=aspect<1?aspect:1;gl.uniformMatrix4fv(u.projectionMatrix,false,new Float32Array([scale/aspect,0,0,0,0,scale,0,0,0,0,-1,0,0,0,0,1]));for(let i=0;i<3;i++){const s=1-i*.14;gl.uniform1f(u.uLayer,i);gl.uniformMatrix4fv(u.modelViewMatrix,false,new Float32Array([s,0,0,0,0,s,0,0,0,0,1,0,pointer[0]*.2,pointer[1]*.2,0,1]));gl.drawArrays(gl.TRIANGLES,0,m.count);}}
 gl.disable(gl.BLEND);
 for(const name of Object.keys(m.geometry)){const a=gl.getAttribLocation(scene.p,name);if(a>=0)gl.disableVertexAttribArray(a);}
}
