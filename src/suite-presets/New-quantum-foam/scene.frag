uniform float uSpeed;
void main(){
 vec2 p=centered();float t=uTime*uSpeed;vec3 c=vec3(.005,.008,.025);
 for(int i=0;i<18;i++){
  float f=float(i),depth=.3+hash11(f+2.)*.7;
  vec2 center=vec2(sin(f*2.39+t*.07*depth)*uAspect,mod(f*.31+t*.06*depth,2.8)-1.4);
  float radius=.055+depth*.19+band(f/18.)*.06;vec2 d=p-center;float r=length(d)/radius;
  float angle=atan(d.y,d.x);vec3 film=.45+.5*cos(vec3(0.,2.,4.)+angle*2.+r*5.+t*.15);
  float rim=exp(-abs(r-1.)*50.),inside=1.-smoothstep(.9,1.,r);
  c=mix(c,c*.45+film*.025,inside*.7);c+=film*rim*(.35+depth*.55);
  c+=vec3(.7,.8,1.)*exp(-length(d-vec2(-.35,.4)*radius)/radius*35.)*.9;
 }
 gl_FragColor=vec4(max(c,vec3(0.)),1.);
}
