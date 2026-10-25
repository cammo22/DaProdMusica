/** Touch-safe tap/hold: Android can cancel a pointer when its native context menu
 * wins. Finish a matured hold on contextmenu too; never turn release into a tap. */
export function bindEffectButton(element,{next,hold,toggle,delay=420,clock={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),now:()=>performance.now()}}){
 const open=hold||toggle;let timer=null,pointer=null,held=false,suppress=false,started=0,startX=0,startY=0;
 const now=()=>clock.now?.()??performance.now();
 const clear=()=>{if(timer!==null)clock.clear(timer);timer=null;};
 const fire=()=>{clear();if(held||pointer===null)return;held=true;suppress=true;open?.();};
 element.addEventListener('pointerdown',e=>{
  if(e.button>0)return;clear();pointer=e.pointerId??0;held=false;suppress=false;started=now();startX=e.clientX||0;startY=e.clientY||0;
  try{element.setPointerCapture?.(e.pointerId);}catch{}
  timer=clock.set(fire,delay);
 });
 element.addEventListener('pointermove',e=>{if(pointer!==null&&Math.hypot((e.clientX||0)-startX,(e.clientY||0)-startY)>18){clear();pointer=null;suppress=true;}});
 element.addEventListener('pointerup',()=>{if(pointer!==null&&!held&&now()-started>=delay)fire();clear();pointer=null;});
 element.addEventListener('pointercancel',()=>{clear();pointer=null;suppress=true;});
 element.addEventListener('contextmenu',e=>{e.preventDefault();if(pointer!==null)fire();});
 element.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();e.stopPropagation();return;}next?.();});
 element.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||(e.shiftKey&&e.key==='Enter')){e.preventDefault();open?.();}});
 return ()=>{clear();pointer=null;};
}

/** A backdrop tap must both start and finish outside the panel. */
export function bindDialogDismiss(dialog){
 let outside=false;
 const isOutside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 dialog.addEventListener('pointerdown',e=>outside=e.target===dialog&&isOutside(e));
 dialog.addEventListener('pointerup',e=>{if(outside&&e.target===dialog&&isOutside(e))dialog.close();outside=false;});
 dialog.addEventListener('pointercancel',()=>outside=false);
}
