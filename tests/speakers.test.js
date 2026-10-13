import test from 'node:test';
import assert from 'node:assert/strict';
import {speakerTurns,conversationText,speakerNames} from '../dist/speakers.js';
import {toSrt} from '../dist/core.js';
const word=(text,start,end)=>({text,timestamp:[start,end]});
test('speaker labels stay consistent when the first voice returns',()=>{
 const words=[word(' Hola',0,1),word(' mundo.',1,2),word(' Buenas.',2,3),word(' Volví.',4,5)];
 const turns=speakerTurns(words,[{start:0,end:2,speaker:7},{start:2,end:3,speaker:3},{start:4,end:5,speaker:7}],5);
 assert.deepEqual(turns.map(t=>t.speaker),['Persona 1','Persona 2','Persona 1']);
 assert.equal(conversationText(turns),'Persona 1: Hola mundo.\n\nPersona 2: Buenas.\n\nPersona 1: Volví.');
 assert.deepEqual(speakerNames(turns),['Persona 1','Persona 2']);
});
test('word crossing a speaker boundary follows the greatest acoustic overlap',()=>{
 const turns=speakerTurns([word(' Hola',0.9,1.4)],[{start:0,end:1,speaker:0},{start:1,end:2,speaker:1}],2);
 assert.equal(turns[0].speaker,'Persona 2');
});
test('unmatched words and truly overlapping voices are explicit',()=>{
 const turns=speakerTurns([word(' Voz',0,1),word(' Texto',2,3)],[{start:0,end:1,speaker:8},{start:0,end:1,speaker:9}],3);
 assert.deepEqual(turns.map(t=>t.speaker),['Voces superpuestas','Sin identificar']);
 assert.equal(speakerNames(turns).length,0);
});
test('one voice is not arbitrarily split into two people',()=>{
 const turns=speakerTurns([word(' Uno.',0,1),word(' Dos.',1.1,2)],[{start:0,end:3,speaker:4}],3);
 assert.equal(turns.length,1);assert.equal(turns[0].speaker,'Persona 1');
});
test('null word endings and zero-duration punctuation preserve text and valid bounds',()=>{
 const turns=speakerTurns([word(' Hola',0,1),word('.',1,1),word(' Adiós',1,null)],[{start:0,end:4,speaker:0}],4);
 assert.equal(turns[0].text,' Hola. Adiós');assert.deepEqual(turns[0].timestamp,[0,4]);
});
test('SRT and TXT contain speaker labels after a manual reassignment',()=>{
 const turns=speakerTurns([word(' Hola',0,1),word(' Buenas',1,2)],[{start:0,end:1,speaker:0},{start:1,end:2,speaker:1}],2);
 turns[1].speaker='Persona 1';
 assert.equal(conversationText(turns),'Persona 1: Hola\n\nPersona 1: Buenas');
 assert.match(toSrt(turns,2),/00:00:01,000 --> 00:00:02,000\nPersona 1: Buenas/);
});
test('history round-trip preserves speakers and timestamps',()=>{
 const turns=speakerTurns([word(' Hola',0,1)],[{start:0,end:1,speaker:0}],1);
 const entry=JSON.parse(JSON.stringify({text:conversationText(turns),chunks:turns}));
 assert.equal(entry.text,'Persona 1: Hola');assert.equal(toSrt(entry.chunks,1),toSrt(turns,1));
});
