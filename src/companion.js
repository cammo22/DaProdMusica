import {openExternal} from './external-links.js';
export function setupCompanion(engine,updateVisual,toast){
 const $=s=>document.querySelector(s);let asset,status='idle',timer;
 async function poll(){
  try{const s=await engine.command('updateState',{target:'gallery'});status=s.status;const busy=['downloading','waiting'].includes(status);$('#gallery-progress').hidden=!busy;$('#gallery-progress').value=s.progress||0;$('#gallery-install').disabled=busy;$('#gallery-install').textContent=status==='installed'?'Apri DapGalleria':status==='ready'?'Installa DapGalleria':'Scarica e installa';if(busy)$('#gallery-status').textContent=`Download · ${s.progress||0}%`;else if(status==='ready')$('#gallery-status').textContent='Download verificato. Pronto per installare.';else if(status==='installed')$('#gallery-status').textContent='DapGalleria è installata.';else if(status==='failed')$('#gallery-status').textContent='Download non riuscito. Riprova.';}
  catch(e){$('#gallery-status').textContent=String(e);$('#gallery-install').disabled=false;}
  if($('#gallery-dialog').open)timer=setTimeout(poll,1500);
 }
 $('#gallery-promo').onclick=async()=>{
  try{asset=(await(await fetch('./gallery-release.json')).json()).asset;}catch{toast('Download non disponibile.');return;}
  if(!engine.native){await openExternal(asset.browser_download_url).catch(e=>toast(String(e)));return;}
  $('#gallery-dialog').showModal();updateVisual();clearTimeout(timer);poll();
 };
 $('#gallery-install').onclick=async()=>{
  try{if(status==='installed')await engine.command('updateOpen',{target:'gallery'});else if(status==='ready'){const s=await engine.command('updateInstall',{target:'gallery'});if(s.status==='permission')$('#gallery-status').textContent='Consenti l’installazione, poi torna qui e tocca Installa.';}else{await engine.command('updateDownload',{target:'gallery',url:asset.browser_download_url,digest:asset.digest});clearTimeout(timer);poll();}}
  catch(e){$('#gallery-status').textContent=String(e);}
 };
 $('#gallery-dialog').addEventListener('close',()=>clearTimeout(timer));
}
