import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import * as core from '../dist/core.js';
import * as speakers from '../dist/speakers.js';
// Exercise the application's real handlers with a small DOM and Worker boundary.
// This tests orchestration; model inference is validated separately with real WASM.
function fixture({spawnFail=false}={}){
 class Element{
  constructor(){this.children=[];this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.style={};this.classList={toggle(){},add(){},remove(){}};}
  append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}
  setAttribute(){}removeAttribute(){}addEventListener(){}pause(){}load(){}
  querySelectorAll(){return this.children.flatMap(row=>row.children.filter(x=>x.tag==='select'));}
 }
 const elements=Object.fromEntries([...fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,new Element()]));
 elements.speakers.checked=true;elements.speakerCount.value='2';elements.speakerSpeed.value='fast';
 const storage=new Map(),workers=[];
 class Worker{
  constructor(url){if(spawnFail&&String(url).includes('speaker-worker'))throw new Error('blocked');this.url=String(url);workers.push(this);}
  postMessage(data){this.request=data;}terminate(){this.terminated=true;}emit(data){this.onmessage({data});}
 }
 const ctx=vm.createContext({...core,...speakers,Worker,URL,Blob,console,setTimeout,clearTimeout,setInterval,clearInterval,crypto:{randomUUID},navigator:{},window:{addEventListener(){}},document:{getElementById:id=>{assert.ok(elements[id],`missing ${id}`);return elements[id];},createElement:tag=>Object.assign(new Element(),{tag})},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},input:new Float32Array(48000)});
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replaceAll('import.meta.url',"'https://example.test/app.js'");
 vm.runInContext(source,ctx);
 vm.runInContext("busy=true;selected={name:'dialog.wav'};samples=input;duration=3;jobStarted=Date.now();worker=makeWorker();",ctx);
 const result={type:'result',device:'wasm',elapsed:1,output:{text:'Hola. Buenas. Volví.',chunks:[{text:' Hola.',timestamp:[0,1]},{text:' Buenas.',timestamp:[1,2]},{text:' Volví.',timestamp:[2,3]}]}};
 const entry=()=>JSON.parse(storage.get('voz-studio-history-v1')||'[]');
 return {ctx,elements,workers,result,entry};
}
const timeline=[{start:0,end:1,speaker:4},{start:1,end:2,speaker:7},{start:2,end:3,speaker:4}];
test('completed speaker job saves labels, allows correction and invalidates times on text edit',()=>{
 const f=fixture();f.workers[0].emit(f.result);const w=f.workers[1];
 assert.equal(w.request.type,'identify');assert.equal(w.request.count,'2');
 w.emit({type:'speakers',segments:timeline});
 assert.ok(w.terminated);assert.equal(f.elements.cancelButton.hidden,true);
 assert.equal(f.elements.transcript.value,'Persona 1: Hola.\n\nPersona 2: Buenas.\n\nPersona 1: Volví.');
 assert.equal(f.entry()[0].chunks[1].speaker,'Persona 2');assert.equal(f.elements.srtButton.disabled,false);
 const select=f.elements.segments.children[1].children.find(c=>c.tag==='select');select.value='Persona 1';select.onchange();
 assert.equal(f.entry()[0].chunks[1].speaker,'Persona 1');assert.match(f.elements.speakerSummary.textContent,/1 persona detectada/);
 f.elements.transcript.value='Persona 1: Texto corregido';f.elements.transcript.oninput();
 assert.equal(f.elements.srtButton.disabled,true);assert.equal(f.elements.segments.hidden,true);
 f.ctx.flushEdit();assert.equal(f.entry()[0].text,'Persona 1: Texto corregido');assert.deepEqual(f.entry()[0].chunks,[]);
});
test('speaker download or runtime failure keeps the transcript and finishes the job',()=>{
 const f=fixture();f.workers[0].emit(f.result);f.workers[1].emit({type:'error',message:'Sin conexión'});
 assert.equal(f.elements.transcript.value,f.result.output.text);assert.equal(f.entry()[0].text,f.result.output.text);
 assert.match(f.elements.message.textContent,/no se pudieron identificar/);assert.equal(f.elements.cancelButton.hidden,true);assert.ok(f.workers[1].terminated);
});
test('a blocked speaker worker still saves the successful transcription',()=>{
 const f=fixture({spawnFail:true});f.workers[0].emit(f.result);
 assert.equal(f.entry()[0].text,f.result.output.text);assert.equal(f.elements.cancelButton.hidden,true);
});
test('cancellation during recognition terminates workers and ignores late results',()=>{
 const f=fixture();f.workers[0].emit(f.result);f.elements.cancelButton.onclick();
 assert.ok(f.workers.every(w=>w.terminated));f.workers[1].emit({type:'speakers',segments:timeline});
 assert.equal(f.entry().length,0);assert.equal(f.elements.transcript.value,'');
});
test('disabling speaker recognition skips the second model',()=>{
 const f=fixture();f.elements.speakers.checked=false;f.workers[0].emit(f.result);
 assert.equal(f.workers.length,1);assert.equal(f.elements.transcript.value,f.result.output.text);
});
test('model download starts during transcription and uses the same worker for inference',()=>{
 const f=fixture();f.workers[0].emit({type:'status',phase:'inference',message:'Transcribiendo'});
 assert.equal(f.workers[1].request.type,'prepare');f.workers[1].emit({type:'status',message:'Descargando hablantes'});
 assert.equal(f.elements.progressText.textContent,'Transcribiendo');
 f.workers[0].emit(f.result);assert.equal(f.workers.length,2);assert.equal(f.workers[1].request.type,'identify');assert.equal(f.workers[1].request.speed,'fast');
 f.workers[1].emit({type:'speakers',segments:timeline});assert.equal(f.entry().length,1);
});
test('retranscribing the same audio reuses the timeline but changed settings rerun recognition',()=>{
 const f=fixture();f.workers[0].emit(f.result);f.workers[1].emit({type:'speakers',segments:timeline});
 vm.runInContext('busy=true;jobStarted=Date.now();',f.ctx);f.workers[0].emit(f.result);
 assert.equal(f.workers.length,2);assert.equal(f.entry().length,2);assert.match(f.elements.transcript.value,/Persona 2/);
 f.elements.speakerSpeed.value='detailed';vm.runInContext('busy=true;jobStarted=Date.now();',f.ctx);f.workers[0].emit(f.result);
 assert.equal(f.workers.length,3);assert.equal(f.workers[2].request.speed,'detailed');f.elements.cancelButton.onclick();
});
test('new audio clears the previous acoustic timeline',()=>{
 const f=fixture();f.workers[0].emit(f.result);f.workers[1].emit({type:'speakers',segments:timeline});
 f.ctx.clearAudio();vm.runInContext("busy=true;selected={name:'another.wav'};samples=input;duration=3;jobStarted=Date.now();",f.ctx);f.workers[0].emit(f.result);
 assert.equal(f.workers.length,3);f.elements.cancelButton.onclick();
});
test('one declared person avoids downloading and running the speaker model',()=>{
 const f=fixture();f.elements.speakerCount.value='1';f.workers[0].emit({type:'status',phase:'inference',message:'Transcribiendo'});f.workers[0].emit(f.result);
 assert.equal(f.workers.length,1);assert.equal(f.elements.transcript.value,'Persona 1: Hola. Buenas. Volví.');
});
test('cancelling while preloading terminates both workers; a preload failure can retry',()=>{
 const f=fixture();f.workers[0].emit({type:'status',phase:'inference',message:'Transcribiendo'});f.elements.cancelButton.onclick();assert.ok(f.workers.every(w=>w.terminated));
 const g=fixture();g.workers[0].emit({type:'status',phase:'inference',message:'Transcribiendo'});g.workers[1].emit({type:'error',message:'Red'});
 g.workers[0].emit(g.result);assert.equal(g.workers.length,3);g.workers[2].emit({type:'speakers',segments:timeline});assert.equal(g.entry().length,1);
});
