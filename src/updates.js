import {newer} from './core.js';
export function releaseForUpdates(releases){
 if(!Array.isArray(releases))return null;
 return releases.filter(r=>!r.draft&&/^v?\d+\.\d+\.\d+$/.test(r.tag_name)&&typeof r.html_url==='string'&&r.html_url.startsWith('https://github.com/cammo22/DaProdMusica/releases/tag/')).reduce((a,b)=>!a||newer(b.tag_name,a.tag_name)?b:a,null);
}

export function androidAsset(release){
 const version=release?.tag_name?.replace(/^v/,'');
 return release?.assets?.find(a=>a.name===`DaProdMusica-${version}-Android-arm64.apk`&&a.browser_download_url===`https://github.com/cammo22/DaProdMusica/releases/download/${release.tag_name}/${a.name}`&&/^sha256:[a-f0-9]{64}$/i.test(a.digest||''))||null;
}
