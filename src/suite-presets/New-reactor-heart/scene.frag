uniform float uSpeed;
void main(){vec2 p=centered();float t=uTime*uSpeed;float r=length(p),a=atan(p.y,p.x);float coils=pow(max(0.,sin(a*16.+t)*sin(r*30.-t*2.)),8.);float core=glow(r,.09+uBass*.15,1.4);vec3 c=vec3(.1,.7,1.)*(coils+core);c+=vec3(.6,.1,1.)*exp(-abs(r-.55-uBass*.1)*40.);c*=.6+.4*noise2(p*5.+t);gl_FragColor=vec4(max(c,vec3(0.)),1.);}
