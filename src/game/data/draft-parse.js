/* ================================================================
   [DRAFT PARSING] — pulling structure out of what a local model
   actually replies, as opposed to what it was asked for.

   Lives in its own file for one reason: `ui/overlays.js` touches the
   DOM at import time, so nothing in it can be unit-tested from node.
   This parser is fiddly enough to deserve real cases, so it moved
   here and `npm test` exercises it.
   ================================================================ */
/* Pulling steps out of what a real local model actually returns.
   Checked against ornith:9b on this machine 2026-07-27 — and it does NOT put
   one step per line, whatever the prompt asks. What it really returns is every
   step on a single line in the form:

     "do the thing | why it matters. do the next thing | why that matters."

   so the step boundary is the sentence break INSIDE the segment after each
   pipe. Newline-separated and numbered forms are handled first, because other
   models do obey; this pipe-walk is the fallback that made it work here.
   Exported for the test suite, since a parser this fiddly deserves cases. */
export function parseDraftedSteps(raw){
  const text=String(raw||'').trim();
  if(!text) return [];
  const clean=l=>l.replace(/^\s*[-*•]\s*/,'').replace(/^\s*\d+[.)]\s*/,'').trim();
  // 1 — one per line, as asked
  let lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(lines.length>1) return lines.map(clean).filter(Boolean);
  // 2 — all on one line, numbered or semicolon-separated
  let parts=text.split(/\s*(?:\d+[.)]|;)\s+/).map(l=>l.trim()).filter(Boolean);
  if(parts.length>1) return parts.map(clean).filter(Boolean);
  // 3 — all on one line as "action | why. action | why."
  const segs=text.split('|');
  if(segs.length<2){
    /* No pipes, no numbers, no newlines — a 9B model that ignored the shape
       entirely and wrote a paragraph. Split on sentences so the visitor gets
       something editable rather than one undifferentiated block. Format
       adherence at this size is genuinely unreliable; the parser absorbs that
       rather than pretending otherwise. */
    const sentences=text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(x=>x.trim()).filter(x=>x.length>12);
    if(sentences.length>1) return sentences.map(clean).filter(Boolean);
    return [clean(text)].filter(Boolean);
  }
  const out=[]; let action=segs[0].trim();
  for(let i=1;i<segs.length;i++){
    const seg=segs[i];
    if(i===segs.length-1){ out.push(action+' | '+seg.trim()); break; }
    const m=seg.match(/^([\s\S]*?[.!?])\s+(\S[\s\S]*)$/); // last sentence end splits why|next-action
    if(m){ out.push(action+' | '+m[1].trim()); action=m[2].trim(); }
    else { out.push(action+' | '+seg.trim()); action=''; }
  }
  return out.map(clean).filter(s=>s && s!=='|');
}
