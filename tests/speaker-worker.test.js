import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
 const requests=[],pending=[],posts=[],configs=[];let imports=0,freed=0;
 const ctx=vm.createContext({console,Response,fetch:url=>{requests.push(url);return new Promise(resolve=>pending.push(()=>resolve(new Response(new Uint8Array([1,2])))));},postMessage:p=>posts.push(p),createOfflineSpeakerDiarization:(mod,config)=>{configs.push(config);return{handle:1,sampleRate:16000,process:()=>[{start:0,end:1,speaker:0}],free:()=>freed++};}});
 ctx.self=ctx;ctx.importScripts=()=>{imports++;ctx.Module.onRuntimeInitialized();};
 vm.runInContext(fs.readFileSync(new URL('../dist/speaker-worker.js',import.meta.url),'utf8'),ctx);
 return{ctx,requests,pending,posts,configs,get imports(){return imports;},get freed(){return freed;}};
}
test('speaker files download together and prepared buffers are reused for recognition',async()=>{
 const f=fixture();const warm=f.ctx.onmessage({data:{type:'prepare'}});
 assert.equal(f.requests.length,2);assert.match(f.requests[0],/\.data$/);assert.match(f.requests[1],/\.wasm$/);
 f.pending.forEach(resolve=>resolve());await warm;
 assert.equal(f.imports,0);await f.ctx.onmessage({data:{type:'identify',audio:new Float32Array(16000),count:2,speed:'fast'}});
 assert.equal(f.requests.length,2);assert.equal(f.imports,1);assert.equal(f.configs[0].segmentation.pyannote.windowShiftRatio,.25);
 assert.equal(f.configs[0].clustering.numClusters,2);assert.equal(f.freed,1);assert.equal(f.posts.at(-1).type,'speakers');
});
test('detailed mode retains the original analysis overlap',async()=>{
 const f=fixture();const inference=f.ctx.onmessage({data:{type:'identify',audio:new Float32Array(16000),count:0,speed:'detailed'}});
 f.pending.forEach(resolve=>resolve());await inference;assert.equal(f.configs[0].segmentation.pyannote.windowShiftRatio,.1);assert.equal(f.configs[0].clustering.numClusters,-1);
});
test('automatic and larger groups use a conservative fast overlap',async()=>{
 for(const count of [0,4]){const f=fixture();const inference=f.ctx.onmessage({data:{type:'identify',audio:new Float32Array(16000),count,speed:'fast'}});f.pending.forEach(resolve=>resolve());await inference;assert.equal(f.configs[0].segmentation.pyannote.windowShiftRatio,.15);}
});
test('recognition arriving during preloading joins the same two downloads',async()=>{
 const f=fixture();const warm=f.ctx.onmessage({data:{type:'prepare'}});const inference=f.ctx.onmessage({data:{type:'identify',audio:new Float32Array(16000),count:2,speed:'fast'}});
 assert.equal(f.requests.length,2);f.pending.forEach(resolve=>resolve());await Promise.all([warm,inference]);assert.equal(f.imports,1);assert.equal(f.posts.at(-1).type,'speakers');
});
