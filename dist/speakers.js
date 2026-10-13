// Align word timestamps with acoustic speaker clusters from the complete recording.
// Never alternate labels heuristically: a label requires an overlapping voice segment.
export function speakerTurns(words, timeline, duration) {
 const labels=new Map();
 const voices=timeline.filter(v=>Number.isFinite(v.start)&&Number.isFinite(v.end)&&v.end>v.start&&Number.isInteger(v.speaker)&&v.speaker>=0).sort((a,b)=>a.start-b.start);
 for(const v of voices)if(!labels.has(v.speaker))labels.set(v.speaker,`Persona ${labels.size+1}`);
 const turns=[];
 for(let i=0;i<words.length;i++){
  const w=words[i];if(!w.text?.trim())continue;
  const start=Math.min(duration,Math.max(0,Number.isFinite(w.timestamp?.[0])?w.timestamp[0]:turns.at(-1)?.timestamp[1]||0));
  const end=Math.min(duration,Math.max(start,Number.isFinite(w.timestamp?.[1])?w.timestamp[1]:words[i+1]?.timestamp?.[0]??duration));
  const scores=new Map();
  for(const v of voices){if(v.start>end)break;const overlap=Math.max(0,Math.min(end,v.end)-Math.max(start,v.start));if(overlap>0)scores.set(v.speaker,(scores.get(v.speaker)||0)+overlap);else if(end===start&&v.start<=start&&v.end>start)scores.set(v.speaker,0.001);}
  const ranked=[...scores].sort((a,b)=>b[1]-a[1]);
  const overlap=ranked.length>1&&end>start&&ranked[0][1]/(end-start)>.65&&ranked[1][1]/(end-start)>.65;
  const speaker=overlap?'Voces superpuestas':ranked.length?labels.get(ranked[0][0]):'Sin identificar';
  const previous=turns.at(-1);
  if(previous?.speaker===speaker&&start-previous.timestamp[1]<1){previous.text+=w.text;previous.timestamp[1]=Math.max(previous.timestamp[1],end);}
  else turns.push({speaker,text:w.text,timestamp:[start,end]});
 }
 return turns;
}
export function conversationText(turns){return turns.map(t=>`${t.speaker}: ${t.text.trim()}`).join('\n\n');}
export function speakerNames(turns){return [...new Set(turns.map(t=>t.speaker).filter(x=>/^Persona \d+$/.test(x)))];}
