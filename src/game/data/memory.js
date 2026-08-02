/* ================================================================
   [RESIDENT MEMORY] — what a resident actually carries between
   visits. Rewritten 2026-08-02, from outside advice that named the
   gap exactly:

     "remember() stores the topic of what you asked. Eight topic words
      pasted into a prompt is a tag list, not a relationship. Storing
      one sentence of substance per exchange instead — same mechanism,
      richer payload — is the difference between 'you've asked about
      electronics before' and 'you decided to build the remote from
      scratch rather than buy one, and you were stuck on IR timing.'"

   That is right, and the fix is cheap. An entry now keeps both halves:
   what the visitor raised, and the gist of where the conversation got
   to. The gist is extracted by CODE, deliberately — a per-exchange
   summarisation call would double the cost and the latency of every
   single message in the game to improve one line of context, which is
   the token-thrift ladder pointed the wrong way. A decent first
   sentence is free.

   Both functions are pure and live here rather than in overlays.js so
   `npm test` can hold them to real cases — the same reason
   draft-parse.js and shelf-rules.js exist.
   ================================================================ */

/* The one substantive sentence of a reply. Skips a greeting, drops code
   blocks and markdown noise, and caps the length so twenty of these stay a
   readable paragraph rather than a transcript. */
export function gistOf(reply){
  let t = String(reply||'')
    .replace(/```[\s\S]*?```/g, ' ')   // a code block is not the gist of anything
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if(!t) return '';
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  // An opening pleasantry is the least informative sentence in any reply.
  const fluff = /^(sure|certainly|of course|good question|great question|happy to|absolutely|indeed|ah[,!]|well,|hello|greetings|let'?s)/i;
  let pick = sentences.find(x => x.length > 25 && !fluff.test(x)) || sentences[0] || t;
  pick = pick.trim();
  if(pick.length > 180) pick = pick.slice(0,177).replace(/\s+\S*$/,'') + '…';
  return pick;
}

/* Asking the same thing five times should not consume five of the twenty
   slots — otherwise one stuck afternoon evicts everything a resident knew
   about you. Compares the content words only; word order and phrasing vary
   far more than intent does. */
/* Question words, articles, and the other scaffolding that varies freely
   between two askings of the same thing. Kept deliberately short: every word
   removed here is a word that can no longer distinguish two questions. */
const STOPWORDS = new Set(['what','whats','which','how','why','when','where','who','does','did',
  'the','and','for','are','can','could','would','should','with','from','that','this','than',
  'you','your','yours','about','into','have','has','was','were','will','its','use','using','used',
  'get','got','need','want','tell','give','show','explain','help','please','some','any','all',
  'been','being','there','their','they','them','then','also','just','only','not','but','out']);

export function sameAsk(a, b){
  /* Two things had to be true at once and the first attempt could not do both:
     merge an obvious rephrasing ("what carrier frequency does my TV remote
     use?" / "which carrier frequency do TV remotes use"), and NOT merge two
     questions differing by one short word ("a red LED" / "a blue LED",
     "38 kHz" / "56 kHz"). Both were caught by the tests on first run.

     Three changes made it work:
       - a 3-character floor, not 4 — "LED", "IR", "38" are exactly the tokens
         that distinguish electronics questions, and a 4-char floor blinds it
         to all of them;
       - stopwords and a crude plural stem, so "does my remote" and "do
         remotes" stop counting as a difference;
       - JACCARD (shared / total) instead of shared-over-smaller. That is the
         load-bearing one: over-the-smaller ignores what the longer question
         says, so "red LED" and "blue LED" scored 0.8 and merged. Over the
         union, a word present on either side counts against the match. */
  const words = x => new Set(String(x||'').toLowerCase()
    .replace(/[^a-z0-9 ]/g,' ')
    .split(/\s+/)
    // Anything with a digit survives at ANY length: "38", "5v", "3v3" are among
    // the most discriminating tokens in a technical question, and a plain
    // 3-character floor threw all of them away — "is 38 kHz right" and "is 56
    // kHz right" reduced to the identical set. Caught by the tests.
    .filter(w => (w.length >= 3 || /\d/.test(w)) && !STOPWORDS.has(w))
    .map(w => w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0,-1) : w));
  const A = words(a), B = words(b);
  if(!A.size || !B.size) return false;
  let shared = 0;
  for(const w of A) if(B.has(w)) shared++;
  const total = A.size + B.size - shared;
  return shared / total > 0.7;
}

/* Fold a new exchange into a resident's memory, newest telling of a repeated
   question winning. Pure: takes the list, returns the list. */
export function rememberInto(mem, { ts, text, reply, cap = 20 }){
  const out = mem.filter(m => !sameAsk(m.text, text));
  out.push({ ts, text, gist: gistOf(reply) });
  while(out.length > cap) out.shift();
  return out;
}
