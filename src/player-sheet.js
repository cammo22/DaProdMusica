export function sheetDestination(offset,velocity,height,opening=false){
 if(opening)return offset<height*.8||velocity<-.5?0:height;
 return offset>height*.32||(offset>48&&velocity>.6)?height:0;
}

/** Translate the actual player and its GL surface together, directly under the
 * finger. Only the settling phase animates; pointermove never causes layout. */
export function createPlayerSheet({sheet,stage,mini,zones,onOpen,onClose,onDrag=()=>{}}){
 let opened=false,offset=0,drag=null,timer,serial=0,suppressUntil=0;
 const height=()=>window.innerHeight;
 const set=y=>{offset=Math.max(0,Math.min(height(),y));for(const el of [sheet,stage])el.style.transform=`translate3d(0,${offset}px,0)`;};
 const reset=()=>{for(const el of [sheet,stage]){el.style.transition='';el.style.transform='';}document.body.classList.remove('sheet-moving');onDrag(false);};
 function settle(target){
  clearTimeout(timer);const token=++serial;
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.round(Math.min(320,Math.max(160,Math.abs(target-offset)*.35)));
  for(const el of [sheet,stage])el.style.transition=`transform ${duration}ms cubic-bezier(.22,.8,.25,1)`;
  set(target);
  timer=setTimeout(()=>{if(token!==serial)return;if(target>0){opened=false;onClose();}else opened=true;reset();},duration+16);
 }
 function show(){if(opened&&!drag)return;opened=true;onOpen();for(const el of [sheet,stage])el.style.transition='none';set(height());sheet.getBoundingClientRect();settle(0);}
 function hide(){if(!opened)return;document.body.classList.add('sheet-moving');onDrag(true);settle(height());}
 function down(e){
  if(drag||e.button>0)return;
  const fromMini=mini.contains(e.target);
  if(e.target.closest('input,select,a,button')&&!e.target.closest('#mini-open'))return;
  if(!fromMini&&!opened)return;
  const transform=getComputedStyle(sheet).transform;let current=offset;
  if(opened&&transform!=='none'){try{current=new DOMMatrixReadOnly(transform).m42;}catch{}}
  clearTimeout(timer);serial++;for(const el of [sheet,stage])el.style.transition='none';
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastY:e.clientY,lastT:performance.now(),velocity:0,fromMini,active:false,origin:fromMini?height():current};
 }
 const move=e=>{
  if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.active){if(Math.abs(dy)<7)return;if(Math.abs(dx)>Math.abs(dy)||drag.fromMini&&dy>0){drag=null;return;}drag.active=true;try{document.body.setPointerCapture(e.pointerId);}catch{}if(drag.fromMini){opened=true;onOpen();}document.body.classList.add('sheet-moving');onDrag(true);}
  e.preventDefault();const now=performance.now(),dt=now-drag.lastT;
  if(dt>0)drag.velocity=drag.velocity*.35+(e.clientY-drag.lastY)/dt*.65;
  drag.lastY=e.clientY;drag.lastT=now;set(drag.origin+dy);
 };
 const up=(e,cancelled=false)=>{
  if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;
  if(d.active){suppressUntil=performance.now()+400;const v=performance.now()-d.lastT>100?0:d.velocity;settle(cancelled?(d.fromMini?height():0):sheetDestination(offset,v,height(),d.fromMini));}
  else if(opened)settle(0);
 };
 for(const el of [mini,...zones])el.addEventListener('pointerdown',down);
 window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',e=>up(e));window.addEventListener('pointercancel',e=>up(e,true));
 document.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopPropagation();}},true);
 window.addEventListener('resize',()=>{if(drag){drag=null;settle(opened?0:height());}});
 return {show,hide,get isOpen(){return opened;}};
}
