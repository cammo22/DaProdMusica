uniform float uSpeed;
void main(){
 vec2 p=centered();float t=uTime*uSpeed;
 vec2 current=p+vec2(sin(p.y*3.+t*.2),cos(p.x*2.-t*.16))*.2;
 float caustic=0.;vec2 q=current;
 for(int i=0;i<5;i++){float n=float(i);q=rot(.7)*q*1.38+vec2(t*.025,-t*.018);float v=sin(q.x*5.+n)+sin(q.y*4.-n+t*.15);caustic+=exp(-abs(v)*12.)/(2.+n);}
 vec3 c=mix(vec3(.006,.028,.07),vec3(.025,.17,.22),.5+.5*sin(p.y+t*.12));
 c+=vec3(.18,.65,.63)*caustic*(.4+uMid);
 for(int i=0;i<9;i++){
  float f=float(i),depth=.35+f*.07;vec2 center=vec2(sin(f*2.4+t*.09),cos(f*1.7+t*.12))*.78;
  vec2 d=p-center;float radius=(.11+hash11(f)*.13)*(1.+uBass*.28),r=length(d)/radius;
  float rim=exp(-abs(r-1.)*38.);float inside=1.-smoothstep(.9,1.,r);
  vec3 bubble=mix(vec3(.025,.13,.2),vec3(.08,.32,.36),d.y/radius*.5+.5);
  c=mix(c,bubble,inside*.65);c+=rim*vec3(.25,.7,.8)*depth;
  c+=vec3(.7,.95,1.)*exp(-dot(d-vec2(-.3,.4)*radius,d-vec2(-.3,.4)*radius)/(radius*radius*.012))*depth;
 }
 c*=1.-.2*length(p);gl_FragColor=vec4(max(c,vec3(0.)),1.);
}
