export class Galaxy {
 constructor(canvas,tracks,onSelect){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.tracks=tracks;this.onSelect=onSelect;this.yaw=.2;this.pitch=-.1;this.velocity=[.00015,0];this.zoom=1;this.points=[];this.images=new Map();this.hit=[];this.drag=null;this.selected=null;this.enabled=true;this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  tracks.forEach((track,i)=>{const y=1-2*(i+.5)/tracks.length,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));this.points.push({track,x:Math.cos(a)*r,y,z:Math.sin(a)*r});const image=new Image();image.src=track.artwork||'icon.svg';image.onload=()=>this.images.set(track.id,image);});
  this.resize=new ResizeObserver(()=>this.size());this.resize.observe(canvas);this.size();
  canvas.addEventListener('pointerdown',e=>{this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};this.velocity=[0,0];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag||this.drag.id!==e.pointerId)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.drag.x=e.clientX;this.drag.y=e.clientY;this.drag.moved ||=Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)>6;this.yaw+=dx*.008;this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch+dy*.006));this.velocity=[dx*.00025,dy*.0002];});
  canvas.addEventListener('pointerup',e=>{if(!this.drag)return;if(!this.drag.moved){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=[...this.hit].reverse().find(p=>Math.hypot(p.x-x,p.y-y)<Math.max(25,p.r));if(hit)this.onSelect(hit.track);}this.drag=null;});
  canvas.addEventListener('pointercancel',()=>this.drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.7,Math.min(1.5,this.zoom-e.deltaY*.001));},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')this.yaw-=.18;if(e.key==='ArrowRight')this.yaw+=.18;if(e.key==='ArrowUp')this.pitch-=.12;if(e.key==='ArrowDown')this.pitch+=.12;if(e.key==='Enter'&&this.hit.length)this.onSelect([...this.hit].sort((a,b)=>b.z-a.z)[0].track);if(e.key.startsWith('Arrow'))e.preventDefault();});
  this.last=0;this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
 }
 size(){const rect=this.canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);this.width=rect.width;this.height=rect.height;this.canvas.width=Math.round(rect.width*d);this.canvas.height=Math.round(rect.height*d);this.ctx.setTransform(d,0,0,d,0,0);}
 frame(now){requestAnimationFrame(this.frame);if(!this.enabled||document.hidden||now-this.last<33)return;const dt=Math.min(50,now-this.last);this.last=now;if(!this.drag){this.yaw+=this.reduce?0:this.velocity[0]*dt;this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch+this.velocity[1]*dt));this.velocity[0]*=.975;this.velocity[1]*=.975;}
  const c=this.ctx,w=this.width,h=this.height;if(!w||!h)return;c.clearRect(0,0,w,h);const radius=Math.min(w*.43,h*.41)*this.zoom,cx=w/2,cy=h*.48;
  const glow=c.createRadialGradient(cx,cy,radius*.3,cx,cy,radius*1.4);glow.addColorStop(0,'#28465545');glow.addColorStop(.65,'#18374624');glow.addColorStop(1,'#09101800');c.fillStyle=glow;c.fillRect(0,0,w,h);
  c.strokeStyle='#cce4ee12';c.lineWidth=1;for(let i=1;i<4;i++){c.beginPath();c.ellipse(cx,cy,radius,radius*Math.cos(i*Math.PI/9),.3,0,Math.PI*2);c.stroke();}
  const cos=Math.cos(this.yaw),sin=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
  const projected=this.points.map(p=>{const x=p.x*cos+p.z*sin,z0=p.z*cos-p.x*sin,y=p.y*cp-z0*sp,z=p.y*sp+z0*cp,scale=2.8/(2.8-z);return {track:p.track,x:cx+x*radius*scale,y:cy+y*radius*scale,z,r:Math.max(14,Math.min(w*.064,32))*scale};}).sort((a,b)=>a.z-b.z);
  this.hit=[];
  for(const p of projected){const image=this.images.get(p.track.id);c.save();c.globalAlpha=p.z<-.25?.15:.48+(p.z+1)*.26;c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.clip();if(image)c.drawImage(image,p.x-p.r,p.y-p.r,p.r*2,p.r*2);else{c.fillStyle='#23434a';c.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);}const shade=c.createRadialGradient(p.x-p.r*.35,p.y-p.r*.35,0,p.x,p.y,p.r);shade.addColorStop(0,'#ffffff1c');shade.addColorStop(.6,'#00000000');shade.addColorStop(1,'#00000080');c.fillStyle=shade;c.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);c.restore();if(p.track.id===this.selected){c.beginPath();c.arc(p.x,p.y,p.r+4,0,Math.PI*2);c.strokeStyle='#c4ffee';c.lineWidth=2;c.stroke();}if(p.z>-.25)this.hit.push(p);}
 }
}


