let transcriber=null, currentModel=null;
self.onmessage=async({data})=>{
 if(data.type!=='transcribe')return;
 try{
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
  env.allowLocalModels=false;
  env.backends.onnx.wasm.numThreads=1;
  if(!transcriber || currentModel!==data.model){
   if(transcriber)await transcriber.dispose();
   transcriber=null;currentModel=null;
   self.postMessage({type:'status',message:'Descargando el modelo de voz. La primera vez puede tardar varios minutos.'});
   transcriber=await pipeline('automatic-speech-recognition',data.model,{device:'wasm',dtype:'q8',progress_callback:p=>self.postMessage({type:'download',progress:p})});
   currentModel=data.model;
  }
  self.postMessage({type:'status',message:'Escuchando y convirtiendo tu audio en texto…'});
  const options={task:'transcribe',return_timestamps:true,chunk_length_s:30,stride_length_s:5,chunk_callback:chunk=>{
   const end=chunk.chunks?.at(-1)?.timestamp?.[1];
   self.postMessage({type:'chunk',end});
  }};
  if(data.language!=='auto')options.language=data.language;
  const output=await transcriber(data.audio,options);
  self.postMessage({type:'result',output});
 }catch(error){self.postMessage({type:'error',message:error?.message||String(error)});}
};
