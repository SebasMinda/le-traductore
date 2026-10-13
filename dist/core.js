export const MAX_SECONDS=600, MAX_BYTES=60*1024*1024;
export function clock(seconds){seconds=Math.max(0,Math.floor(seconds||0));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function srtTime(seconds){const ms=Math.max(0,Math.round((seconds||0)*1000));return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
export function toSrt(chunks,duration){return chunks.map((c,i)=>`${i+1}\n${srtTime(c.timestamp[0])} --> ${srtTime(c.timestamp[1]??chunks[i+1]?.timestamp[0]??duration)}\n${c.speaker?`${c.speaker}: `:''}${c.text.trim()}\n`).join('\n');}
export function words(text){return text.trim()?text.trim().split(/\s+/u).length:0;}
export function mono(channels){const result=new Float32Array(channels[0].length);for(const channel of channels)for(let i=0;i<result.length;i++)result[i]+=channel[i]/channels.length;return result;}
