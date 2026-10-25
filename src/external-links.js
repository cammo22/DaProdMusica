export function setupExternalLinks(onError) {
  document.addEventListener('click', async event => {
    const anchor = event.target.closest('a[target="_blank"]');
    if (!anchor || !window.__TAURI_INTERNALS__) return;
    event.preventDefault();
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(anchor.href);
    } catch { onError('Non riesco ad aprire il browser. La pagina è disponibile su GitHub, nelle release DaProd.'); }
  });
}
export async function openExternal(url){
 if(window.__TAURI_INTERNALS__){const {openUrl}=await import('@tauri-apps/plugin-opener');await openUrl(url);}
 else window.location.assign(url);
}
