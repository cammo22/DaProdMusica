uniform float uSpeed;
void main(){
 vec2 p=centered();float t=uTime*uSpeed;vec3 c=vec3(.002,.009,.012);
 for(int i=0;i<28;i++){
  float f=float(i),n=f/28.;vec2 q=rot(sin(t*.07)*.3)*p;
  float bend=sin(q.y*2.7+t*.21+n*6.28)*(.25+uBass*.2)+sin(q.y*6.-t*.17+n*9.)*.1;
  float stem=(n-.5)*1.8*(.32+.6*pow(abs(q.y),.65));
  float distance=abs(q.x-stem-bend);float pulse=.4+band(n)*1.4;
  vec3 ink=mix(vec3(.03,.25,.2),vec3(.35,.65,.12),n);
  c+=ink*(.003/(distance+.006))*pulse;
  float bead=exp(-pow((q.y-sin(n*12.+t*.2)) * 50.,2.))*exp(-distance*130.);
  c+=vec3(.55,.8,.35)*bead*(.5+uTreble);
 }
 gl_FragColor=vec4(max(c,vec3(0.)),1.);
}
