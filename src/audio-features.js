export class AudioFeatures {
  constructor() { this.previous = new Float32Array(64); this.spectrum = new Uint8Array(64 * 4); this.wave = new Uint8Array(256 * 4); this.average = 0; this.lastBeat = -1; this.beatCount = 0; this.slowLevel=new Float32Array([.1,.1,.1]);this.lastTime=0; }
  update(frequency, waveform, sampleRate, fftSize, now) {
    const mean = (lo, hi) => {
      const start = Math.max(1, Math.floor(lo * fftSize / sampleRate));
      const end = Math.min(frequency.length, Math.max(start + 1, Math.ceil(hi * fftSize / sampleRate)));
      let sum = 0; for (let i = start; i < end; i++) sum += frequency[i] / 255;
      return end > start ? sum / (end - start) : 0;
    };
    const dt=Math.min(.1,Math.max(.001,now-(this.lastTime||now-.016)));this.lastTime=now;
    const response=(level,i)=>{const baseline=this.slowLevel[i];this.slowLevel[i]+=(level-baseline)*(1-Math.exp(-dt/2));return Math.min(1,level*.45+Math.max(0,Math.min(1,(level-baseline*.58)/(baseline*.65+.025)))*.55);};
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
    return {bass:response(mean(35,200),0),mid:response(mean(200,2500),1),treble:response(mean(2500,12000),2),rms:Math.sqrt(rms/Math.max(1,waveform.length)),peak,beat:beat?1:0,onset:Math.min(1,flux*10),centroid:total?weighted/total:0,energy:total/64,beatCount:this.beatCount,spectrum:this.spectrum,wave:this.wave};
  }
}

// Bridge cadence and render cadence are independent. Hold monotonic beat events
// until the renderer sees them, then release over time rather than dropping pulses.
export class FeatureEnvelope {
 constructor(){
  this.target={};this.output={spectrum:new Uint8Array(256),wave:new Uint8Array(1024)};
  this.levels=new Float32Array(64);this.waveTarget=new Uint8Array(256).fill(128);
  this.bandTarget=new Uint8Array(64);this.receivedAt=-Infinity;this.lastRead=0;this.beatAt=-Infinity;this.count=0;
  for(let i=0;i<256;i++)this.output.wave.set([128,128,128,255],i*4);
 }
 push(packet={},now=performance.now()){
  if(packet.sequence===this.sequence)return;
  this.sequence=packet.sequence;this.receivedAt=now;this.target=packet;
  if(Number.isFinite(packet.beatCount)&&packet.beatCount>this.count){this.beatAt=now;this.count=packet.beatCount;}
  if(packet.beatCount<this.count)this.count=packet.beatCount;
  for(let i=0;i<64;i++)this.bandTarget[i]=packet.bands?.[i]||0;
  for(let i=0;i<256;i++)this.waveTarget[i]=packet.waveform?.[i]??128;
 }
 read(now=performance.now(),playing=true){
  if(now-this.lastRead<7)return this.output;
  const dt=Math.min(.1,Math.max(.001,(now-(this.lastRead||now-16))/1000));this.lastRead=now;
  const active=playing&&now-this.receivedAt<350,attack=1-Math.exp(-dt/.015),release=1-Math.exp(-dt/.105);
  for(const key of ['bass','mid','treble','rms','peak','energy','centroid','onset']){
   const target=active?(Number(this.target[key])||0):0,previous=this.output[key]||0;
   this.output[key]=previous+(target-previous)*(target>previous?attack:release);
  }
  for(let i=0;i<64;i++){
   const target=active?this.bandTarget[i]:0,old=this.levels[i];this.levels[i]=old+(target-old)*(target>old?attack:release);
   const v=this.levels[i],o=i*4;this.output.spectrum[o]=v;this.output.spectrum[o+1]=Math.max(v,old);this.output.spectrum[o+2]=v;this.output.spectrum[o+3]=255;
  }
  for(let i=0;i<256;i++){const x=active?this.waveTarget[i]:128,o=i*4;this.output.wave[o]=x;this.output.wave[o+1]=x;this.output.wave[o+2]=x;this.output.wave[o+3]=255;}
  this.output.beat=active?Math.exp(-Math.max(0,now-this.beatAt)/105):0;
  this.output.beatCount=this.count;this.output.sequence=this.sequence;
  return this.output;
 }
 reset(){this.sequence=undefined;this.target={};this.receivedAt=-Infinity;this.beatAt=-Infinity;this.count=0;this.bandTarget.fill(0);}
}
