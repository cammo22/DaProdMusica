export const VERSION = '0.6.0';
export function time(seconds) { const s = Math.max(0,Math.floor(Number(seconds)||0)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
export function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function parseLRC(text) {
  const lines = [];
  for (const row of text.split(/\r?\n/)) {
    const matches = [...row.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const lyric = row.replace(/\[[^\]]*\]/g,'').trim();
    for(const match of matches) {
      if(Number(match[2])>=60) continue;
      lines.push({time:Number(match[1])*60+Number(match[2])+Number('0.'+(match[3]||'0')),text:lyric});
    }
  }
  return lines.sort((a,b)=>a.time-b.time);
}
export function parseEditableLRC(text) {
  const invalid = text.split(/\r?\n/).findIndex(row => {
    if (!row.trim() || /^\[(ar|al|ti|by|re|ve|length):[^\]]*\]\s*$/i.test(row)) return false;
    return !/^\[\d+:\d{2}(?:[.:]\d{1,3})?\]/.test(row) || !parseLRC(row).length;
  });
  if (invalid !== -1) throw Error(`La riga ${invalid + 1} non ha un tempo valido. Usa [00:12.50]Testo.`);
  return parseLRC(text);
}
export function toLRC(lines) { return lines.map(l=>{const cs=Math.round(l.time*100);return `[${String(Math.floor(cs/6000)).padStart(2,'0')}:${(cs%6000/100).toFixed(2).padStart(5,'0')}]${l.text}`;}).join('\n'); }
export function lyricIndex(lines, t) { let found=-1; for(let i=0;i<lines.length;i++) {if(lines[i].time<=t) found=i; else break;} return found; }
export function newer(remote, current=VERSION) {
  if(!/^v?\d+\.\d+\.\d+$/.test(remote)) return false;
  const a=remote.replace(/^v/,'').split('.').map(Number), b=current.replace(/^v/,'').split('.').map(Number);
  for(let i=0;i<3;i++) { if(a[i]!==b[i]) return a[i]>b[i]; } return false;
}
export function validateLyrics(data) {
  if(!data || data.version!==1 || !data.tracks || typeof data.tracks!=='object' || Array.isArray(data.tracks)) throw Error('Catalogo testi non valido');
  const result={};
  for(const [id,lines] of Object.entries(data.tracks)) {
    if(!Array.isArray(lines) || lines.some(l=>!Number.isFinite(l.time)||l.time<0||typeof l.text!=='string'||(l.words!==undefined&&(!Array.isArray(l.words)||l.words.some(w=>!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<0||w.end<w.start||typeof w.text!=='string'))))) throw Error('Tempi o righe non validi');
    result[id]=[...lines].sort((a,b)=>a.time-b.time);
  } return result;
}
export function download(name, content, mime='application/json') { const url=URL.createObjectURL(new Blob([content],{type:mime})); const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }

