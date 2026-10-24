uniform float uSpeed;
void main(){vec2 p=centered();float t=uTime*uSpeed;vec2 q=p;float a=0.;for(int i=0;i<5;i++){q=abs(q)/(dot(q,q)+.3)-vec2(.72+uBass*.12,.7);q*=rot(.2+t*.015);a+=exp(-abs(q.x*q.y)*12.)/5.;}vec3 c=paletteCold(a*.6+t*.025)*a*a*1.8;gl_FragColor=vec4(max(c,vec3(0.)),1.);}
