/* ================================================================
   [COPYRIGHT TRIAGE] — can this text be shared, or must it stay
   personal? Built 2026-07-27, at direct request.

   THE HONEST FRAME, stated first because it governs everything below:
   **an AI cannot determine copyright status, and neither can this
   file.** Copyright is a legal question, it differs by country, and a
   confident wrong answer is far worse than no answer — it is exactly
   how a commons gets something on its shelves it had no right to.

   So this is deliberately NOT an oracle. It is the same shape as the
   Science & Research Hall's own method:

     1. EVIDENCE is gathered — a stated license, a Gutenberg header, a
        copyright line, a publication year. Every one of these is a
        thing you can go and look at yourself.
     2. RULES, written here in plain code, map evidence to a verdict.
        No model decides this; a model only ever helps FIND the
        evidence (see extractEvidencePrompt below), and what it finds
        is shown to the human alongside the verdict.
     3. UNCERTAIN DEFAULTS TO PERSONAL. The failure mode is always
        "keep it on your own shelf," never "assume it's fine to give
        away." A personal copy needs no license at all — that's the
        visitor's business — so defaulting to personal costs them
        nothing and protects the commons.

   The verdict is a RECOMMENDATION shown with its reasons. A person
   still presses the button.
   ================================================================ */

/* The US public-domain line moves on 1 January each year: published
   works enter the public domain 95 years after publication. Computed
   rather than hardcoded so this doesn't quietly rot. */
export function usPublicDomainYear(now = new Date()){ return now.getFullYear() - 96; }

export const VERDICTS = {
  open:      { id:'open',      label:'Open license — may be shared',   tone:'#7fa36b',
               advice:'The text itself states a license that permits passing it on. Safe for the shared queue and for a bequest.' },
  pd:        { id:'pd',        label:'Likely public domain — may be shared', tone:'#7fa36b',
               advice:'The evidence points to public domain. Worth a glance at the source yourself before it joins a shared shelf.' },
  copyright: { id:'copyright', label:'In copyright — keep it personal', tone:'#c8574a',
               advice:'This looks like a work still under copyright. Keep it on your own shelf, which needs no license. Do not put it in the shared queue or a bequest.' },
  unknown:   { id:'unknown',   label:'Not established — keep it personal', tone:'#c8a04a',
               advice:'Nothing here proves it either way, so the safe answer is your own shelf. That costs you nothing: a personal copy never needs a license.' },
};

const OPEN_PATTERNS = [
  [/creative\s+commons\s+zero|\bcc0\b|public\s+domain\s+dedication/i, 'a CC0 / public-domain dedication'],
  [/creative\s+commons\s+attribution|\bcc[-\s]?by\b/i,               'a Creative Commons Attribution licence'],
  [/released\s+(?:in)?to\s+the\s+public\s+domain/i,                  'an explicit release into the public domain'],
  [/\bMIT\s+Licen[cs]e\b|\bApache\s+Licen[cs]e\b|\bGNU\s+(?:GPL|General\s+Public)/i, 'an open-source licence statement'],
];
const PD_PATTERNS = [
  [/project\s+gutenberg/i,                          'a Project Gutenberg marker'],
  [/this\s+e?book\s+is\s+for\s+the\s+use\s+of\s+anyone/i, 'the Gutenberg "for the use of anyone anywhere" notice'],
  [/in\s+the\s+public\s+domain/i,                   'a statement that it is in the public domain'],
  [/standard\s+ebooks/i,                            'a Standard Ebooks marker'],
];
const CLOSED_PATTERNS = [
  [/all\s+rights\s+reserved/i,                      'an "All rights reserved" notice'],
  [/no\s+part\s+of\s+this\s+(?:book|publication)\s+may\s+be\s+reproduced/i, 'a "no part may be reproduced" notice'],
  [/unauthori[sz]ed\s+(?:copying|reproduction|distribution)/i, 'an anti-copying notice'],
];

function findAll(patterns, hay){
  const hits=[];
  for(const [re,what] of patterns){ const m=re.exec(hay); if(m) hits.push({ what, quote:snippet(hay, m.index) }); }
  return hits;
}
function snippet(s, i, len=110){
  const start=Math.max(0, i-30);
  return s.slice(start, start+len).replace(/\s+/g,' ').trim();
}
/* Only the head and tail of a book carry the front matter and colophon;
   scanning a whole novel for "all rights reserved" is both slow and more
   likely to trip on the word appearing inside the story itself. */
function edges(text, n=6000){
  const t=String(text||'');
  return t.length<=n*2 ? t : (t.slice(0,n)+'\n…\n'+t.slice(-n));
}

/* The one real decision function. `evidence` is optional extra structured
   fields — from the AI extractor, or typed by a person; both are treated
   identically and neither is trusted over what's actually in the text. */
export function triage({ text='', license='', source='', evidence={} } = {}){
  const hay=edges(text)+'\n'+license+'\n'+source;
  const reasons=[];
  const open=findAll(OPEN_PATTERNS, hay);
  const pd=findAll(PD_PATTERNS, hay);
  const closed=findAll(CLOSED_PATTERNS, hay);

  // An explicit open licence outranks everything: it's the author's own word.
  if(open.length){
    open.forEach(h=>reasons.push({ kind:'open', ...h }));
    closed.forEach(h=>reasons.push({ kind:'note', what:h.what+' also appears — usually boilerplate around an openly licensed text, worth a look', quote:h.quote }));
    return verdict('open', reasons);
  }
  // A live copyright notice with a recent year is the clearest "no".
  const copyYear=recentCopyrightYear(hay);
  if(closed.length || copyYear){
    closed.forEach(h=>reasons.push({ kind:'closed', ...h }));
    if(copyYear) reasons.push({ kind:'closed', what:`a copyright notice dated ${copyYear}`, quote:'' });
    // Gutenberg texts carry their own licence header AND often quote an old
    // copyright page; PD evidence alongside a pre-cutoff date still wins.
    const pubYear=Number(evidence.published)||yearFrom(hay);
    if(pd.length && pubYear && pubYear<=usPublicDomainYear()){
      pd.forEach(h=>reasons.push({ kind:'pd', ...h }));
      reasons.push({ kind:'pd', what:`a publication year of ${pubYear}, before the ${usPublicDomainYear()} US public-domain line`, quote:'' });
      return verdict('pd', reasons);
    }
    return verdict('copyright', reasons);
  }
  if(pd.length){
    pd.forEach(h=>reasons.push({ kind:'pd', ...h }));
    const pubYear=Number(evidence.published)||yearFrom(hay);
    if(pubYear) reasons.push({ kind:'pd', what:`a publication year of ${pubYear}`, quote:'' });
    return verdict('pd', reasons);
  }
  // Dates alone, with nothing stated either way.
  const pub=Number(evidence.published)||yearFrom(hay);
  const died=Number(evidence.authorDied);
  if(died && died <= (new Date().getFullYear()-70)){
    reasons.push({ kind:'pd', what:`the author is recorded as having died in ${died} — over 70 years ago, which clears it in most "life + 70" countries`, quote:'' });
    return verdict('pd', reasons);
  }
  if(pub && pub <= usPublicDomainYear()){
    reasons.push({ kind:'pd', what:`a publication year of ${pub}, at or before the ${usPublicDomainYear()} US public-domain line`, quote:'' });
    return verdict('pd', reasons);
  }
  if(pub) reasons.push({ kind:'closed', what:`a publication year of ${pub}, which is after the ${usPublicDomainYear()} line — too recent to assume anything`, quote:'' });
  return verdict('unknown', reasons);
}
function verdict(id, reasons){
  const v=VERDICTS[id];
  return { id, label:v.label, tone:v.tone, advice:v.advice, reasons,
           mayShare: id==='open'||id==='pd' };
}
function recentCopyrightYear(hay){
  let best=0;
  for(const m of hay.matchAll(/(?:copyright|\(c\)|©)\s*(?:©\s*)?(\d{4})/gi)){
    const y=Number(m[1]); if(y>best && y>1500 && y<=new Date().getFullYear()+1) best=y;
  }
  return best>usPublicDomainYear() ? best : 0;
}
function yearFrom(hay){
  let best=0;
  for(const m of hay.matchAll(/\b(1[5-9]\d{2}|20[0-2]\d)\b/g)){
    const y=Number(m[1]); if(y>best) best=y;
  }
  return best||0;
}

/* What the local model is asked for — EVIDENCE ONLY. It is told, in as many
   words, not to reach a conclusion, because the conclusion is not its job and
   a model's guess at one would be laundered into false confidence. */
export function extractEvidencePrompt(title, head){
  return `Below is the beginning of a text titled "${title}".

Report ONLY what the text itself actually states. Do not guess, do not infer, and do NOT say whether it is in copyright — that is not what is being asked.

Answer in exactly these lines, using "unknown" where the text does not say:
PUBLISHED: <the year this edition or work was published, or unknown>
AUTHOR: <author name, or unknown>
AUTHOR_DIED: <year the author died, if the text states it, or unknown>
LICENSE_STATEMENT: <quote any licence or public-domain statement verbatim, or unknown>
COPYRIGHT_LINE: <quote any copyright notice verbatim, or unknown>

--- text begins ---
${head}
--- text ends ---`;
}
export function parseEvidence(reply){
  const get=(k)=>{ const m=String(reply||'').match(new RegExp('^\\s*'+k+':\\s*(.+)$','im')); const v=m?m[1].trim():''; return (!v||/^unknown$/i.test(v))?'':v; };
  const year=(s)=>{ const m=String(s).match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/); return m?Number(m[1]):0; };
  return {
    published: year(get('PUBLISHED')),
    author: get('AUTHOR'),
    authorDied: year(get('AUTHOR_DIED')),
    licenseStatement: get('LICENSE_STATEMENT'),
    copyrightLine: get('COPYRIGHT_LINE'),
  };
}
