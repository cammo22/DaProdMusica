export class AudioFeatures {
  constructor() { this.previous = new Float32Array(64); this.spectrum = new Uint8Array(64 * 4); this.wave = new Uint8Array(256 * 4); this.average = 0; this.lastBeat = -1; this.beatCount = 0; }
  update(frequency, waveform, sampleRate, fftSize, now) {
    const mean = (lo, hi) => {
      const start = Math.max(1, Math.floor(lo * fftSize / sampleRate));
      const end = Math.min(frequency.length, Math.max(start + 1, Math.ceil(hi * fftSize / sampleRate)));
      let sum = 0; for (let i = start; i < end; i++) sum += frequency[i] / 255;
      return end > start ? sum / (end - start) : 0;
    };
    let flux=0, weighted=0, total=0, rms=0, peak=0;
    for(let i=0;i<64;i++) {
      const lo=30*Math.pow(600,i/64), hi=30*Math.pow(600,(i+1)/64), level=mean(lo,hi);
      flux+=Math.max(0,level-this.previous[i]);
      this.previous[i]+=(level-this.previous[i])*.35;
      this.spectrum.set([level*255,level*255,this.previous[i]*255,255],i*4);
      total+=level;weighted+=level*i/63;
    }
    for(let i=0;i<waveform.length;i++){const x=(waveform[i]-128)/128;rms+=x*x;peak=Math.max(peak,Math.abs(x));}
    for(let i=0;i<256;i++){const x=waveform[Math.floor(i*waveform.length/256)]??128;this.wave.set([x,x,x,255],i*4);}
    flux/=64; const beat=flux>Math.max(.018,this.average*1.7)&&now-this.lastBeat>.24;
    this.average+= (flux-this.average)*.08;
    if(beat){this.lastBeat=now;this.beatCount++;}
    return {bass:mean(35,200),mid:mean(200,2500),treble:mean(2500,12000),rms:Math.sqrt(rms/Math.max(1,waveform.length)),peak,beat:beat?1:0,onset:Math.min(1,flux*10),centroid:total?weighted/total:0,energy:total/64,beatCount:this.beatCount,spectrum:this.spectrum,wave:this.wave};
  }
}
