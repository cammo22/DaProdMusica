import {interactionCode} from './effect-interactions.js';
export const vertexSource='attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
export const displaySource='precision mediump float; varying vec2 vUv; uniform sampler2D image; void main(){gl_FragColor=texture2D(image,vUv);}';
export function composeShader(common,body,id=''){
 const interaction=interactionCode(id);
 const uniforms=`uniform float uTime;uniform vec2 uPointer;uniform vec2 uTouchOrigin;uniform vec2 uTouchVelocity;uniform float uTouchAge;uniform float uTouch;uniform vec3 uTrackTint;uniform float uSeed;uniform float uEvolutionKaleido;uniform float uEvolutionZoom;uniform float uEvolutionWarp;uniform float uEvolutionHue;mat2 rot(float a);`;
 const transform=`p/=max(.4,uEvolutionZoom);vec2 focus=uPointer*vec2(uAspect*2.,2.);vec2 origin=uTouchOrigin*vec2(uAspect*2.,2.);vec2 delta=p-${id==='musica.aero-tides'?'origin':'focus'};
 ${interaction.coordinates}
 p+=uEvolutionWarp*.14*vec2(sin(p.y*4.+uTime*.2),cos(p.x*4.-uTime*.2));
 if(uEvolutionKaleido>1.){float r=length(p);float sector=6.2831853/uEvolutionKaleido;float a=abs(mod(atan(p.y,p.x),sector)-sector*.5);p=vec2(cos(a),sin(a))*r;}return p;`;
 const header=common.replace('uniform float uTime;',uniforms).replace('return p;',transform);
 let scene=body;
 if(id==='daprod.glitch-tape')scene=scene.replace('vec2 uv = vUv;',`vec2 uv = vUv;uv.x+=uTouch*.08*sin(floor(uv.y*60.)+uPointer.x*40.)*exp(-abs(uv.y-(uPointer.y+.5))*8.);`);
 if(id==='daprod.electric-storm')scene=scene.replace('float x0 = (hash11(seed) - 0.5) * 2.4 * uAspect;','float x0 = mix((hash11(seed) - 0.5) * 2.4 * uAspect,uPointer.x*2.*uAspect,uTouch);');
 return header+'\n'+scene.replace('void main()', 'void sceneMain()')+`
 uniform sampler2D uPrevious; uniform float uFeedback;
 void main(){sceneMain();vec3 current=max(gl_FragColor.rgb,vec3(0.));vec2 touchDelta=(vUv-.5)*vec2(uAspect*2.,2.)-uTouchOrigin*vec2(uAspect*2.,2.);
 ${interaction.color}
 vec3 axis=normalize(vec3(1.));current=current*cos(uEvolutionHue)+cross(axis,current)*sin(uEvolutionHue)+axis*dot(axis,current)*(1.-cos(uEvolutionHue));
 current=max(current,vec3(0.));current=mix(current,current*(.45+uTrackTint),.18);current=current/(1.+current*.45);
 vec2 drift=(vUv-.5)*(.998-uEvolutionWarp*.002)+.5;vec3 history=texture2D(uPrevious,drift).rgb;
 gl_FragColor=vec4(mix(current,history,clamp(uFeedback,0.,.94)),1.);}`;
}
