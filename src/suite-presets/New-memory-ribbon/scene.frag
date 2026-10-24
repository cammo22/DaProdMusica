uniform float uSpeed;
void main(){vec2 p=centered();float t=uTime*uSpeed;vec3 c=vec3(.015,.03,.06);for(int i=0;i<9;i++){float f=float(i);float y=sin(p.x*(1.5+f*.13)+t*.3+f*.5)*.45+(f-4.)*.08;float d=abs(p.y-y-wave(vUv.x)*uBass*.1);c+=paletteCold(f*.08+t*.01)*glow(d,.008,.9)*(.3+band(f/9.));}c+=vec3(.12,.18,.1)*fbm(p*4.+t*.03);gl_FragColor=vec4(max(c,vec3(0.)),1.);}
