import test from 'node:test';
import assert from 'node:assert/strict';
import {clock,srtTime,toSrt,words,mono} from '../dist/core.js';
test('timestamps preserve hours and milliseconds',()=>{assert.equal(clock(600),'10:00');assert.equal(srtTime(3661.23),'01:01:01,230');});
test('subtitle export supplies missing end times',()=>{assert.equal(toSrt([{timestamp:[0,2],text:' Hola '},{timestamp:[2,null],text:'Mundo'}],4),'1\n00:00:00,000 --> 00:00:02,000\nHola\n\n2\n00:00:02,000 --> 00:00:04,000\nMundo\n');});
test('stereo audio averages channels without clipping',()=>{assert.deepEqual(Array.from(mono([new Float32Array([1,-1]),new Float32Array([-1,1])])),[0,0]);});
test('word counts ignore surrounding whitespace',()=>{assert.equal(words('  Hola\n mundo '),2);assert.equal(words(' '),0);});
