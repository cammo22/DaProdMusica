/** Keep fractional refresh periods: restarting at each draw turns 90 Hz into 45 fps. */
export class FramePacer {
 constructor(){this.next=0;}
 due(now,fps=60){
  const interval=1000/fps;
  if(now+.5<this.next)return false;
  if(now-this.next>interval)this.next=now;
  this.next+=interval;
  return true;
 }
 reset(){this.next=0;}
}
