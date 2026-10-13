// Library loading is injectable so fallback and reuse can be tested without downloading models.
export const ENGINE_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js';
export class TranscriptionEngine {
 constructor({loadLibrary=()=>import(ENGINE_URL),getGPU=()=>globalThis.navigator?.gpu,post=()=>{},now=()=>Date.now()}={}){this.loadLibrary=loadLibrary;this.getGPU=getGPU;this.post=post;this.now=now;this.pipe=null;this.key=null;this.gpuFailed=false;}
 async selectDevice(mode){if(mode==='cpu'||this.gpuFailed)return 'wasm';try{return await this.getGPU()?.requestAdapter()?'webgpu':'wasm';}catch{return 'wasm';}}
 async load(model,device){const key=`${model}:${device}`;if(this.pipe&&this.key===key)return this.pipe;
  if(this.pipe){await this.pipe.dispose();this.pipe=null;this.key=null;}
  const {pipeline,env}=await this.loadLibrary();env.allowLocalModels=false;
  // GitHub Pages does not provide cross-origin isolation. Keep WASM compatible there.
  env.backends.onnx.wasm.numThreads=globalThis.crossOriginIsolated?Math.min(4,globalThis.navigator?.hardwareConcurrency||1):1;
  this.post({type:'status',phase:'loading',message:'Preparando el modelo. La primera vez necesita descargar archivos.'});
  this.pipe=await pipeline('automatic-speech-recognition',model,{device,dtype:device==='webgpu'?{encoder_model:'fp32',decoder_model_merged:'q4'}:'q8',progress_callback:progress=>this.post({type:'download',progress})});this.key=key;return this.pipe;
 }
 async runOnDevice(data,device){const pipe=await this.load(data.model,device);const {WhisperTextStreamer}=await this.loadLibrary();const started=this.now(),duration=data.audio.length/16000;
  const total=Math.max(1,Math.ceil(Math.max(0,duration-30)/20)+1);let completed=0,tokens=0,lastUpdate=0;
  this.post({type:'backend',device});this.post({type:'status',phase:'inference',message:`Transcribiendo con ${device==='webgpu'?'aceleración gráfica':'el procesador'}…`});
  const streamer=new WhisperTextStreamer(pipe.tokenizer,{skip_prompt:true,callback_function:()=>{},token_callback_function:()=>{tokens++;const t=this.now();if(t-lastUpdate>800){lastUpdate=t;this.post({type:'activity',tokens,elapsed:(t-started)/1000});}},on_finalize:()=>{completed++;this.post({type:'chunk',completed,total,elapsed:(this.now()-started)/1000});}});
  const options={task:'transcribe',return_timestamps:data.speakers?'word':!!data.timestamps,chunk_length_s:duration>30?30:0,stride_length_s:5,num_beams:1,do_sample:false,streamer};
  if(data.language!=='auto')options.language=data.language;
  const output=await pipe(data.audio,options);
  // Release Whisper before loading speaker models on memory-limited devices.
  if(data.speakers){await this.pipe.dispose();this.pipe=null;this.key=null;}
  return {output,device,elapsed:(this.now()-started)/1000};
 }
 async transcribe(data){let device=await this.selectDevice(data.engine);try{return await this.runOnDevice(data,device);}catch(error){if(device!=='webgpu')throw error;this.gpuFailed=true;const fallback=new Error('La aceleración gráfica no funcionó. Continuando con el procesador…');fallback.code='GPU_FALLBACK';throw fallback;}}
}
