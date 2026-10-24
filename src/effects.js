export function effectForTrack(album,track,presets){
 const pools={vesuvio:['musica.aero-tides','daprod.retro-grid','daprod.audio-bloom','musica.memory-ribbon','musica.opal-caustics'],sistema:['daprod.neon-tunnel','daprod.fractal-pulse','daprod.liquid-chrome','musica.hypercity','musica.reactor-heart','musica.wormhole-orchestra'],selecta:['daprod.glitch-tape','daprod.inchiostro','daprod.electric-storm','musica.buried-signal','musica.solar-archive']};
 const pool=(pools[album.art]||presets.map(p=>p.id)).filter(id=>presets.some(p=>p.id===id));const seed=parseInt(track.id.slice(0,8),16)>>>0;return pool[seed%pool.length];
}
export function randomEffect(current,presets,rng=Math.random){const choices=presets.filter(p=>p.id!==current);return choices[Math.floor(rng()*choices.length)]?.id||current;}
