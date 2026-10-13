// Classic worker: Emscripten's browser build uses importScripts, not ES modules.
// Models are pinned and downloaded only when speaker recognition is requested.
const MODEL_BASE='https://huggingface.co/Transcripta/sherpa-onnx-speaker-diarization-wasm/resolve/e978abbb67d995f48e26a9950db4025e297574d5/';
const PREFIX='sherpa-onnx-wasm-main-speaker-diarization';
let active=false,prepared=null;
function status(message){self.postMessage({type:'status',message});}
async function resource(name){
 const url=MODEL_BASE+name;let cache;
 try{cache=await caches.open('voz-studio-speakers-v1');const hit=await cache.match(url);if(hit){status('Cargando el modelo de hablantes guardado…');return hit.arrayBuffer();}}catch{}
 const response=await fetch(url);if(!response.ok)throw new Error(`Descarga del modelo: HTTP ${response.status}`);
 const cached=cache?response.clone():null;const total=Number(response.headers.get('content-length'))|| (name.endsWith('.data')?45587685:12364192);
 const chunks=[];let loaded=0,last=0;
 const reader=response.body.getReader();
 while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;if(Date.now()-last>500){last=Date.now();status(`Descargando modelo de hablantes · ${Math.round(loaded/1048576)} de ~${Math.round(total/1048576)} MB`);}}
 const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{await cache?.put(url,cached);}catch{} // Full caches must not prevent recognition.
 return bytes.buffer;
}
function prepare(){
 // Download both assets together, while Whisper is already transcribing.
 // Keep only file buffers here: model sessions are created after Whisper finishes.
 if(!prepared)prepared=Promise.all([resource(`${PREFIX}.data`),resource(`${PREFIX}.wasm`)]).catch(error=>{prepared=null;throw error;});
 return prepared;
}
async function runtime(){
 status('Preparando identificación de personas. La primera vez descarga unos 55 MB adicionales.');
 const [data,wasm]=await prepare();prepared=null;
 return new Promise((resolve,reject)=>{
  let preload=data;
  self.Module={
   wasmBinary:new Uint8Array(wasm),
   locateFile:name=>MODEL_BASE+name,
   getPreloadedPackage:()=>{const buffer=preload;preload=null;return buffer;},
   print:()=>{},printErr:()=>{},
   onAbort:reason=>reject(new Error(String(reason))),
   onRuntimeInitialized:()=>resolve(self.Module)
  };
  try{importScripts('./vendor/sherpa-onnx-speaker-diarization.js','./vendor/sherpa-onnx-wasm-main-speaker-diarization.js');}catch(error){reject(error);}
 });
}
self.onmessage=async({data})=>{
 if(data.type==='prepare'){try{await prepare();self.postMessage({type:'prepared'});}catch(error){self.postMessage({type:'error',message:error?.message||String(error)});}return;}
 if(data.type!=='identify'||active)return;active=true;
 let recognizer;
 try{
  const module=await runtime();
  recognizer=createOfflineSpeakerDiarization(module,{
   // Two-person dialogs tolerate less overlap; larger/unknown groups use a safer step.
   segmentation:{pyannote:{model:'./segmentation.onnx',windowShiftRatio:data.speed==='detailed'?0.1:Number(data.count)===2?0.25:0.15},numThreads:1,debug:0,provider:'cpu'},
   embedding:{model:'./embedding.onnx',numThreads:1,debug:0,provider:'cpu'},
   clustering:{numClusters:Number(data.count)>0?Number(data.count):-1,threshold:0.5},
   minDurationOn:0.3,minDurationOff:0.5
  });
  if(!recognizer.handle||recognizer.sampleRate!==16000)throw new Error('El modelo de hablantes no se pudo iniciar.');
  status('Analizando las voces de todo el audio para reconocer quién habla…');
  const segments=recognizer.process(data.audio);
  self.postMessage({type:'speakers',segments});
 }catch(error){self.postMessage({type:'error',message:error?.message||String(error)});}
 finally{recognizer?.free();active=false;}
};
