export function bindEffectButton(element,{next,toggle,delay=550,clock={set:setTimeout,clear:clearTimeout}}){
 let timer=null,suppressClick=false;
 const clear=()=>{if(timer!==null)clock.clear(timer);timer=null;};
 element.addEventListener('pointerdown',e=>{clear();suppressClick=false;element.setPointerCapture?.(e.pointerId);timer=clock.set(()=>{timer=null;suppressClick=true;toggle();},delay);});
 element.addEventListener('pointerup',clear);
 element.addEventListener('pointercancel',()=>{clear();suppressClick=true;});
 element.addEventListener('contextmenu',e=>e.preventDefault());
 element.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}next();});
 return clear;
}
