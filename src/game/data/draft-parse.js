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
/* ----- ONE QUESTION, ONE ANSWER (2026-07-28).

   The fix for "steps: 1 lines" wasn't a better parser, it was a smaller ask.
   A 9B model asked for six labelled fields at once obeys maybe half the shape;
   the same model asked "give this lesson a title" answers cleanly nearly every
   time. So the drafting is a chain of single questions now — which is also the
   better shape for the person watching, since each answer lands in the form on
   its own and can be stopped or overwritten at any point.

   A small model still decorates a one-word answer, though: a `TITLE:` label it
   was told not to write, a code fence, quotes, a bullet, a "Sure, here's..."
   preamble. This strips all of that and returns the single answer line. */
export function cleanAnswer(raw, opts={}){
  let text=String(raw||'').replace(/```[a-z]*|```/gi,'').trim();
  if(!text) return '';
  let lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  // a conversational preamble line, when the real answer follows it
  if(lines.length>1 && /^(sure|okay|ok|here(?:'s| is| are)|certainly|of course)\b/i.test(lines[0])) lines=lines.slice(1);
  let line = opts.multiline ? lines.join(' ') : (lines[0]||'');
  line=line.replace(/^\s*[-*•]\s*/,'').replace(/^\s*\d+[.)]\s*/,'');
  line=line.replace(/^\s*step\s*\d+\s*[:.\-]\s*/i,'');
  if(opts.label) line=line.replace(new RegExp('^\\s*'+opts.label+'\\s*[:\\-]\\s*','i'),'');
  line=line.replace(/^["'“”«]+/,'').replace(/["'“”»]+$/,'').trim();
  if(opts.maxWords){ const w=line.split(/\s+/); if(w.length>opts.maxWords) line=w.slice(0,opts.maxWords).join(' '); }
  return line.trim();
}
/* Asking one step at a time cured the shape, but not the repetition: given the
   steps so far and asked for the next, ornith:9b answered "Folds hands into a
   loose fist" at step 3 and "Folds hands into a fist" at step 5 (2026-07-28).
   An exact-match check never catches that. This compares the ACTION half only
   (before the `|`), ignores short filler words, and calls it a repeat when most
   of the shorter step's words appear in the other — at which point the chain
   simply asks again rather than handing the visitor the same instruction twice. */
export function tooSimilarStep(candidate, existing){
  const words=s=>String(s||'').split('|')[0].toLowerCase().replace(/[^a-z]+/g,' ').trim()
    .split(/\s+/).filter(w=>w.length>2);
  const A=new Set(words(candidate));
  if(A.size<2) return existing.some(b=>String(b).toLowerCase()===String(candidate).toLowerCase());
  return existing.some(b=>{
    const B=new Set(words(b)); if(!B.size) return false;
    const shared=[...A].filter(w=>B.has(w)).length;
    return shared / Math.min(A.size, B.size) > 0.6;
  });
}
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
