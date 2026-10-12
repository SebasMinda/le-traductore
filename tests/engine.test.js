import test from 'node:test';
import assert from 'node:assert/strict';
import {TranscriptionEngine} from '../dist/engine.js';
function fixture({gpu=false,loadFail=false,runFail=false}={}){
 const calls=[],posts=[],runs=[],disposed=[];
 class Streamer{constructor(tokenizer,options){this.options=options;}}
 const lib={env:{backends:{onnx:{wasm:{}}}},WhisperTextStreamer:Streamer,pipeline:async(task,model,options)=>{
  calls.push({task,model,...options});if(loadFail&&options.device==='webgpu')throw new Error('GPU load failed');
  const p=async(audio,opts)=>{runs.push({device:options.device,opts});if(runFail&&options.device==='webgpu')throw new Error('GPU lost');opts.streamer.options.token_callback_function();opts.streamer.options.on_finalize();return {text:'Hola mundo',...(opts.return_timestamps?{chunks:[{text:'Hola mundo',timestamp:[0,1]}]}:{})};};p.tokenizer={};p.dispose=async()=>disposed.push(options.device);return p;
 }};
 const engine=new TranscriptionEngine({loadLibrary:async()=>lib,getGPU:()=>gpu?{requestAdapter:async()=>({})}:undefined,post:p=>posts.push(p)});
 return {engine,calls,runs,posts,disposed};
}
const audio=new Float32Array(16000),data={audio,model:'Xenova/whisper-tiny',language:'spanish',engine:'auto',timestamps:false};
test('compatible GPU is selected with precision per module',async()=>{const f=fixture({gpu:true});const result=await f.engine.transcribe(data);assert.equal(result.device,'webgpu');assert.deepEqual(f.calls[0].dtype,{encoder_model:'fp32',decoder_model_merged:'q4'});assert.equal(f.runs[0].opts.language,'spanish');assert.equal(f.runs[0].opts.return_timestamps,false);assert.equal(f.runs[0].opts.chunk_length_s,0);});
test('GPU load failure falls back and avoids repeating failed GPU attempts',async()=>{const f=fixture({gpu:true,loadFail:true});await assert.rejects(f.engine.transcribe(data),e=>e.code==='GPU_FALLBACK');await f.engine.transcribe(data);assert.deepEqual(f.calls.map(x=>x.device),['webgpu','wasm']);});
test('GPU inference failure requests a clean worker for CPU recovery',async()=>{const f=fixture({gpu:true,runFail:true});await assert.rejects(f.engine.transcribe(data),e=>e.code==='GPU_FALLBACK');const cpuWorker=fixture();const result=await cpuWorker.engine.transcribe({...data,engine:'cpu'});assert.equal(result.output.text,'Hola mundo');assert.equal(result.device,'wasm');});
test('CPU selection uses cached model and optional timestamp generation',async()=>{const f=fixture({gpu:true});await f.engine.transcribe({...data,engine:'cpu',timestamps:true});await f.engine.transcribe({...data,engine:'cpu'});assert.equal(f.calls.length,1);assert.equal(f.calls[0].dtype,'q8');assert.equal(f.runs[0].opts.return_timestamps,true);assert.ok(f.posts.some(x=>x.type==='chunk'&&x.completed===1&&x.total===1));});
test('long recordings preserve overlap and automatic language detection',async()=>{const f=fixture();await f.engine.transcribe({...data,audio:new Float32Array(61*16000),language:'auto'});assert.equal(f.runs[0].opts.chunk_length_s,30);assert.equal(f.runs[0].opts.stride_length_s,5);assert.equal('language' in f.runs[0].opts,false);assert.equal(f.posts.find(x=>x.type==='chunk').total,3);});
