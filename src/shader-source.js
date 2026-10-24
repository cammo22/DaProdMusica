export const vertexSource='attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
export const displaySource='precision mediump float; varying vec2 vUv; uniform sampler2D image; void main(){gl_FragColor=texture2D(image,vUv);}';
export function composeShader(common,body){
 const header=common.replace('uniform float uTime;','uniform float uTime;\nuniform vec2 uPointer;\nuniform float uTouch;').replace('return p;','p -= uPointer * vec2(uAspect,1.0) * 0.55;\n  p = rotTouch(p);\n  return p;');
 const warped=header.replace('/** Coordinate centrate', 'vec2 rotTouch(vec2 p) {float a=uTouch*0.22*sin(length(p)*5.0-uTime*2.0);return mat2(cos(a),-sin(a),sin(a),cos(a))*p;}\n\n/** Coordinate centrate');
 return warped+'\n'+body.replace('void main()', 'void sceneMain()')+'\nuniform sampler2D uPrevious; uniform float uFeedback; void main(){sceneMain();vec3 current=max(gl_FragColor.rgb,vec3(0.));current=current/(1.+current*.45);vec3 history=texture2D(uPrevious,(vUv-.5)*.998+.5).rgb;gl_FragColor=vec4(mix(current,history,uFeedback),1.);}';
}
