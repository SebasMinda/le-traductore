import {TranscriptionEngine} from './engine.js?v=1.1.0';
const engine=new TranscriptionEngine({post:data=>self.postMessage(data)});
let running=false;
self.onmessage=async({data})=>{
 if(data.type!=='transcribe'||running)return;
 running=true;
 try{const result=await engine.transcribe(data);self.postMessage({type:'result',...result});}
 catch(error){self.postMessage({type:error?.code==='GPU_FALLBACK'?'fallback':'error',message:error?.message||String(error)});}
 finally{running=false;}
};
