// Original procedural renderer. Low frequencies change geometry, mids drive
// turbulence, highs illuminate particles. Pointer bends the field, press adds force.
export class Visualizer {
  constructor(canvas, readAudio) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false}); this.readAudio=readAudio;
    this.mode='Magma';this.intensity=0.65;this.quality=1;this.enabled=true;this.pointer={x:0,y:0,down:false};this.energy=0;this.t=0;this.last=0;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();this.pointer.x=(e.clientX-r.left)/r.width-.5;this.pointer.y=(e.clientY-r.top)/r.height-.5;});
    canvas.addEventListener('pointerdown',e=>{this.pointer.down=true;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointerup',()=>this.pointer.down=false);
    canvas.addEventListener('pointercancel',()=>this.pointer.down=false);
    canvas.addEventListener('pointerleave',()=>{this.pointer.down=false;});
    this.resize=new ResizeObserver(()=>this.size());this.resize.observe(canvas);this.size();
    this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  size(){const r=this.canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,1.5)*this.quality;this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));}
  frame(now){requestAnimationFrame(this.frame);if(document.hidden||!this.enabled||now-this.last<(this.reduced?100:30))return;
    const dt=Math.min((now-this.last)/1000,.1);this.last=now;
    const {bass=0,mid=0,high=0}=this.readAudio();this.energy+=(bass-this.energy)*.18;
    this.t+=dt*(this.reduced?.12:.35+this.energy*.7);const t=this.t,c=this.ctx,w=this.canvas.width,h=this.canvas.height;
    const power=this.energy*this.intensity, hue=this.mode==='Magma'?20:this.mode==='Circuito'?112:266;
    c.fillStyle='rgba(7,8,13,0.26)';c.fillRect(0,0,w,h);
    const cx=w*(.53+this.pointer.x*.12),cy=h*(.49+this.pointer.y*.12),r=Math.min(w*.31,h*.37);
    let g=c.createRadialGradient(cx,cy,0,cx,cy,r*2.3);g.addColorStop(0,`hsla(${hue},80%,23%,.13)`);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.save();c.translate(cx,cy);c.globalCompositeOperation='lighter';
    const rings=this.mode==='Circuito'?28:48;
    for(let j=0;j<rings;j++){
      c.beginPath();const depth=j/rings;
      const radius=r*(.39+depth*.75)*(1+power*.18);
      for(let i=0;i<=180;i++){
        const a=i/180*Math.PI*2;
        const wave=Math.sin(a*3+t*1.4+depth*6)*(.07+power*.2)+Math.sin(a*7-t*2+depth*3)*(.015+mid*.025);
        let x=Math.cos(a)*(radius+radius*wave),y=Math.sin(a)*(radius+radius*wave);
        if(this.mode==='Magma'){x+=Math.sin(a*2+t+depth*5)*r*.12;y*=.73;}
        else if(this.mode==='Circuito'){const k=Math.pow(Math.abs(Math.cos(a*4)),.18);x*=k;y*=k;y*=.78;}
        else {y*=.5+Math.sin(depth*3+t*.2)*.16;x+=Math.cos(a+t*.4)*r*.2;}
        const rotation=-.35+Math.sin(t*.2)*.13;
        const xx=x*Math.cos(rotation)-y*Math.sin(rotation),yy=x*Math.sin(rotation)+y*Math.cos(rotation);
        if(i===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);
      }
      c.closePath();c.strokeStyle=`hsla(${hue+depth*35},${75+power*20}%,${43+depth*23}%,${.1+depth*.37})`;c.lineWidth=(depth>.85?1.4:.6)*(w/1200+.4);c.stroke();
    }
    for(let i=0;i<210*this.quality;i++){
      const seed=Math.sin(i*127.1)*43758.54, f=seed-Math.floor(seed),a=i*2.39996+t*(.06+f*.08);
      const rad=r*(.25+f*1.85+(this.pointer.down?.2:0));
      const x=Math.cos(a)*rad*1.35,y=Math.sin(a)*rad*.8;
      c.fillStyle=`hsla(${hue+f*70},85%,${60+high*30}%,${.16+f*.6})`;
      c.beginPath();c.arc(x,y,(.4+f*1.2)*(1+high*this.intensity),0,Math.PI*2);c.fill();
    }
    if(this.pointer.down){c.strokeStyle=`hsla(${hue},90%,75%,.5)`;c.beginPath();c.arc(this.pointer.x*w*.7,this.pointer.y*h*.7,r*(.1+(t%1)*.25),0,Math.PI*2);c.stroke();}
    c.restore();
  }
}
