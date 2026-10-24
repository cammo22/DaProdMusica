export const vertexSource='attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
export const displaySource='precision mediump float; varying vec2 vUv; uniform sampler2D image; void main(){gl_FragColor=texture2D(image,vUv);}';
export function composeShader(common,body){
 const uniforms=`uniform float uTime; uniform vec2 uPointer; uniform float uTouch; uniform float uSeed; uniform float uEvolutionKaleido; uniform float uEvolutionZoom; uniform float uEvolutionWarp; uniform float uEvolutionHue;`;
 const transform=`p/=max(.4,uEvolutionZoom);p-=uPointer*vec2(uAspect,1.)*.55;
 float twist=uTouch*.3*sin(length(p)*5.-uTime*2.);p=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*p;
 p+=uEvolutionWarp*.14*vec2(sin(p.y*4.+uTime*.2),cos(p.x*4.-uTime*.2));
 if(uEvolutionKaleido>1.){float r=length(p);float sector=6.2831853/uEvolutionKaleido;float a=abs(mod(atan(p.y,p.x),sector)-sector*.5);p=vec2(cos(a),sin(a))*r;}return p;`;
 const header=common.replace('uniform float uTime;',uniforms).replace('return p;',transform);
 return header+'\n'+body.replace('void main()', 'void sceneMain()')+`
 uniform sampler2D uPrevious; uniform float uFeedback;
 void main(){sceneMain();vec3 current=max(gl_FragColor.rgb,vec3(0.));
 vec3 axis=normalize(vec3(1.));current=current*cos(uEvolutionHue)+cross(axis,current)*sin(uEvolutionHue)+axis*dot(axis,current)*(1.-cos(uEvolutionHue));
 current=max(current,vec3(0.));current=current/(1.+current*.45);
 vec2 drift=(vUv-.5)*(.998-uEvolutionWarp*.002)+.5;vec3 history=texture2D(uPrevious,drift).rgb;
 gl_FragColor=vec4(mix(current,history,clamp(uFeedback,0.,.94)),1.);}`;
}


