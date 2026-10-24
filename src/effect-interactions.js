const coordinate={
 'daprod.neon-tunnel':'p-=focus*uTouch*.8;',
 'daprod.fractal-pulse':'p=focus+(p-focus)/(1.+uTouch*1.8);',
 'daprod.liquid-chrome':'p+=delta/(.15+dot(delta,delta))*uTouch*.035;',
 'daprod.retro-grid':'p.y+=uPointer.y*uTouch*.6;p.x+=p.y*uPointer.x*uTouch*.35;',
 'daprod.inchiostro':'float turn=uTouch*exp(-dot(delta,delta)*2.)*(uTime-uTouchAge)*1.4;p=focus+mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*delta;',
 'daprod.glitch-tape':'p.x+=uTouch*.2*sin(floor(p.y*30.)+uPointer.x*30.);',
 'daprod.minimal-rings':'p-=focus*uTouch;',
 'daprod.electric-storm':'p.x+=sin(p.y*12.+uTime*7.)*uTouch*.012;',
 'daprod.napoli-lava':'p.y+=uTouch*.12*exp(-pow((p.x-focus.x)*3.,2.));',
 'musica.aero-tides':'float ring=length(delta)-uTouchAge*.65;p+=normalize(delta+vec2(.0001))*sin(ring*45.)*exp(-ring*ring*80.)*.075*exp(-uTouchAge*.65);',
 'musica.buried-signal':'p.y+=uTouch*.15*step(abs(p.x-focus.x),.25);',
 'musica.chrome-wings':'p.x*=1.+uTouch*(uPointer.x*1.8);p.y+=sin(p.x*3.)*uTouch*.2;',
 'musica.hypercity':'p.x+=uTouch*p.y*uPointer.x*.55;',
 'musica.magnetic-garden':'p+=uTouch*vec2(delta.y,-delta.x)*exp(-dot(delta,delta)*3.)*.7;',
 'musica.memory-ribbon':'p.y-=uTouch*focus.y*exp(-pow((p.x-focus.x)*2.,2.));',
 'musica.opal-caustics':'p=focus+delta*(1.+uTouch*.4*vec2(sin(delta.y*8.),cos(delta.x*8.)));',
 'musica.quantum-foam':'p+=normalize(delta+vec2(.001))*uTouch*.3*exp(-dot(delta,delta)*8.);',
 'musica.reactor-heart':'float spin=uTouch*uTime*.7;p=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*p;p*=1.-uTouch*.2;',
 'musica.solar-archive':'p-=delta*uTouch*.3*exp(-dot(delta,delta)*3.);',
 'musica.wormhole-orchestra':'p-=focus*uTouch*.5;p*=1.+uTouch*.25;'
};
const color={
 'daprod.glitch-tape':'current.rb+=uTouch*exp(-abs(vUv.y-(uPointer.y+.5))*40.)*vec2(.35,.7);',
 'daprod.electric-storm':'current+=vec3(.4,.6,1.)*uTouch*exp(-abs((vUv.x-.5)*2.*uAspect-uPointer.x*2.*uAspect)*80.);',
 'daprod.napoli-lava':'current+=vec3(1.,.2,.02)*uTouch*exp(-dot(touchDelta,touchDelta)*7.);',
 'musica.buried-signal':'float dig=exp(-dot(touchDelta,touchDelta)*14.)*uTouch;current=mix(current,current*.2+vec3(.05,.2,.15),dig);',
 'musica.hypercity':'current+=vec3(.05,.5,1.)*uTouch*exp(-abs(touchDelta.x)*28.)*.5;',
 'musica.quantum-foam':'current*=1.-uTouch*exp(-dot(touchDelta,touchDelta)*16.)*.9;',
 'musica.solar-archive':'float flare=exp(-dot(touchDelta,touchDelta)*20.)*uTouch;current+=vec3(1.,.45,.08)*flare*2.;'
};
export function interactionCode(id){return {coordinates:coordinate[id]||'',color:color[id]||''};}
