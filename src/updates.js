import {newer} from './core.js';
export function releaseForUpdates(releases){
 if(!Array.isArray(releases))return null;
 return releases.filter(r=>!r.draft&&/^v?\d+\.\d+\.\d+$/.test(r.tag_name)&&typeof r.html_url==='string'&&r.html_url.startsWith('https://github.com/cammo22/DaProdMusica/releases/tag/')).reduce((a,b)=>!a||newer(b.tag_name,a.tag_name)?b:a,null);
}
