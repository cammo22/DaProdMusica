export function random(seed) { let n=seed>>>0; return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export function shuffled(items, rng=Math.random) { const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
export function genome(manifest, seed) {
 const rng=random(seed);const parameters={};
 for(const [key,p] of Object.entries(manifest.parameters))if(p.type==='number')parameters[key]=Math.max(p.min,Math.min(p.max,p.default+(rng()-.5)*(p.max-p.min)*.65));
 return {version:1,preset:manifest.id,seed:seed>>>0,parameters,hue:rng()*6.283,kaleido:rng()<.4?2+Math.floor(rng()*6):0,zoom:.8+rng()*.6,warp:rng()*.4,feedback:.18+rng()*.4};
}
export function validateGenome(value,presets){
 const manifest=presets.find(p=>p.id===value?.preset);if(value?.version!==1||!manifest||!Number.isInteger(value.seed))throw Error('Universo non valido');
 return genome(manifest,value.seed);
}
export function seedNumber(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0];}
