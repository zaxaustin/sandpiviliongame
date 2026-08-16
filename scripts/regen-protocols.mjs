/* ================================================================
   [REGENERATE THE PROTOCOL PROMPTS] — the docs, written from the module.

   PROTOCOLS.md Protocol 4 and Protocol 5 each carry the exact prompt the app
   copies to a clipboard, and `npm test` fails when either drifts from
   data/course-prompt.js. That guard is only kind if there is a one-command way
   to put it right — otherwise the pressure is to loosen the guard.

     node scripts/regen-protocols.mjs

   It rewrites the two fenced blocks in place and touches nothing else.
   ================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildDraftingPrompt, buildExtendPrompt, EXTEND_DOC_SAMPLE } from '../src/game/data/course-prompt.js';

/* The placeholders live in course-prompt.js, which both this and smoke.mjs
   import — so the doc and the guard cannot disagree about what the doc should
   contain, and neither of them owns a copy the other can drift from. */
const P = 'PROTOCOLS.md';
let src = readFileSync(P, 'utf8');

/* Each protocol's fenced block, replaced by position rather than by pattern —
   a regex over "the first ~~~text after the heading" is the kind of thing that
   silently rewrites the wrong one when a third protocol arrives. */
function replaceFenced(text, heading, body) {
  const at = text.indexOf(heading);
  if (at < 0) throw new Error('PROTOCOLS.md has no ' + heading);
  const open = text.indexOf('~~~text\n', at);
  if (open < 0) throw new Error(heading + ' has no fenced prompt block');
  const close = text.indexOf('~~~', open + 8);
  if (close < 0) throw new Error(heading + ' has an unterminated fence');
  return text.slice(0, open + 8) + body.trim() + '\n' + text.slice(close);
}

src = replaceFenced(src, '## Protocol 4 —', buildDraftingPrompt({}));
if (src.includes('## Protocol 5 —')) {
  src = replaceFenced(src, '## Protocol 5 —', buildExtendPrompt(EXTEND_DOC_SAMPLE));
}
writeFileSync(P, src, 'utf8');
console.log('PROTOCOLS.md: prompts regenerated from data/course-prompt.js');
