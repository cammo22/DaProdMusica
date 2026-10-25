import {invoke,isTauri} from '@tauri-apps/api/core';
import {AudioFeatures,FeatureEnvelope} from './audio-features.js';
export class AudioEngine extends EventTarget{
 constructor(){super();this.native=isTauri()&&/android/i.test(navigator.userAgent);this.queue=[];this.index=-1;this.playing=false;this.position=0;this.duration=0;this.features={};this.volume=.8;this.repeat=true;this.generation=Date.now();this.audio=new Audio();this.audio.crossOrigin='anonymous';this.audio.preload='metadata';this.analysis=new AudioFeatures();this.nativeEnvelope=new FeatureEnvelope();this.analysisVisible=false;this.visualMode='full';this.polling=false;this.lastUiAt=0;
 if(!this.native){for(const event of ['play','pause','timeupdate','loadedmetadata','ended','error'])this.audio.addEventListener(event,()=>{if(event==='ended'){this.next();return;}if(event==='error'){this.fail('Il file audio non è disponibile o non può essere letto.');return;}this.playing=!this.audio.paused;this.position=this.audio.currentTime;this.duration=Number.isFinite(this.audio.duration)?this.audio.duration:0;this.emit();});}}
 emit(){this.dispatchEvent(new Event('state'));}
 fail(message){this.dispatchEvent(new CustomEvent('failure',{detail:message}));}
 async command(op,extra={}){if(op==='analysis')this.analysisVisible=!!extra.enabled;return invoke('plugin:music|execute',{payload:{op,...extra}});}
 async init(){if(this.native){this.apply(await this.command('init'));if(!this.polling){this.polling=true;this.schedule();}}else this.setMediaActions();}
 schedule(){setTimeout(async()=>{try{if(!document.hidden&&!this.pendingQueue){const generation=this.generation,state=await this.command('state');if(generation===this.generation&&!this.pendingQueue)this.apply(state);}}catch(e){this.fail(String(e));}this.schedule();},document.hidden?1000:this.analysisVisible?(this.visualMode==='reduced'?65:32):180);}
 apply(s){
  const oldId=this.current?.id,oldPlaying=this.playing,oldError=this.lastError;
  if(s.queue?.length)this.queue=s.queue;this.index=s.index??this.index;this.playing=!!s.playing;this.position=s.position||0;this.duration=s.duration||0;
  const now=performance.now();if(oldId!==this.current?.id)this.nativeEnvelope.reset();
  this.nativeEnvelope.push(s.features||{},now);this.featureAt=now;
  if(!s.error)this.lastError=null;if(s.error&&s.error!==this.lastError){this.lastError=s.error;this.fail(s.error);}
  // Spectrum packets run at30Hz; text, seek and transport DOM need only6Hz.
  if(oldId!==this.current?.id||oldPlaying!==this.playing||oldError!==this.lastError||now-this.lastUiAt>=150){this.lastUiAt=now;this.emit();}
 }

 get current(){return this.queue[this.index];}
 async setup(){if(this.native)return;if(!this.context){this.context=new AudioContext();this.analyser=this.context.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=.08;this.analyser.minDecibels=-85;this.analyser.maxDecibels=-12;this.frequency=new Uint8Array(1024);this.wave=new Uint8Array(2048);this.context.createMediaElementSource(this.audio).connect(this.analyser);this.analyser.connect(this.context.destination);}if(this.context.state==='suspended')await this.context.resume();}
 async setQueue(queue,index=0){const generation=++this.generation;if(this.native){this.pendingQueue=generation;try{const state=await this.command('queue',{items:JSON.stringify(queue),index,requestId:generation});if(generation===this.generation){this.apply(state);if(!this.polling){this.polling=true;this.schedule();}}}finally{if(this.pendingQueue===generation)this.pendingQueue=0;}return;}await this.setup();if(generation!==this.generation)return;this.queue=[...queue];this.index=index;await this.start();}
 async start(){if(!this.current)return;this.audio.src=this.current.src;this.position=0;this.metadata();await this.audio.play();this.emit();}
 async toggle(){try{if(this.native){this.apply(await this.command(this.playing?'pause':'play'));return;}if(this.audio.paused){await this.setup();await this.audio.play();}else this.audio.pause();}catch(e){this.fail(String(e));}}
 async next(direction=1){if(this.native){this.apply(await this.command(direction>0?'next':'prev'));return;}if(direction<0&&this.position>3){this.seek(0);return;}let next=this.index+direction;if(next>=this.queue.length){if(!this.repeat){this.audio.pause();this.playing=false;this.emit();return;}next=0;}this.index=(next+this.queue.length)%this.queue.length;await this.start();}
 async seek(position){if(this.native)this.apply(await this.command('seek',{position}));else if(Number.isFinite(this.audio.duration))this.audio.currentTime=Math.max(0,Math.min(position,this.audio.duration));}
 async setRepeat(value){this.repeat=value;if(this.native)await this.command('repeat',{enabled:value});}
 async setVolume(value){this.volume=value;if(this.native)await this.command('volume',{volume:value});else this.audio.volume=value;}
 readFeatures(){const now=performance.now();if(this.native)return this.nativeEnvelope.read(now,this.playing);if(!this.analyser)return {};if(now-(this.lastFeatureRead||0)<12)return this.features;this.lastFeatureRead=now;if(this.playing){this.analyser.getByteFrequencyData(this.frequency);this.analyser.getByteTimeDomainData(this.wave);}else{this.frequency.fill(0);this.wave.fill(128);}return this.features=this.analysis.update(this.frequency,this.wave,this.context.sampleRate,2048,now/1000);}
 metadata(){if(!('mediaSession'in navigator)||!this.current)return;const t=this.current;navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album,artwork:t.artwork?[{src:new URL(t.artwork,location.href).href}]:[]});}
 setMediaActions(){if(!('mediaSession'in navigator))return;for(const [action,handler]of Object.entries({play:()=>{if(!this.playing)this.toggle();},pause:()=>{if(this.playing)this.toggle();},previoustrack:()=>this.next(-1),nexttrack:()=>this.next(),seekto:e=>this.seek(e.seekTime)}))try{navigator.mediaSession.setActionHandler(action,handler);}catch{}}
}






