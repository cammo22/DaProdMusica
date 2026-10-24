import { pipeline, env } from '@huggingface/transformers';
env.allowLocalModels=false;
let transcriber;
self.onmessage=async({data})=>{try{
  transcriber??=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{dtype:'q8',device:'wasm',progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'progress',message:`Download modello: ${p.file} · ${Math.round(p.progress||0)}%`});}});
  self.postMessage({type:'progress',message:'Trascrizione locale in corso. Può richiedere alcuni minuti…'});
  const result=await transcriber(data.audio,{language:'italian',task:'transcribe',return_timestamps:true,chunk_length_s:30,stride_length_s:5});
  self.postMessage({type:'result',lines:(result.chunks||[]).filter(c=>Number.isFinite(c.timestamp?.[0])).map(c=>({time:c.timestamp[0],text:c.text.trim()}))});
}catch(e){self.postMessage({type:'error',message:e.message});}};
