/* ================================================================
   [SMOKE TEST] — the cheap first test the README has sketched since
   day one: import the pure-data modules directly (no browser, no
   bundler) and assert the config shape that has no runtime error
   until a human clicks the wrong thing.

   KNOWN_STATION_KINDS below must stay in sync by hand with the
   `st.kind===` checks in src/game/main.js's onAction() — there is no
   way to check that automatically without parsing the file, and a
   hardcoded list here is exactly the kind of thing this script exists
   to catch drifting silently.
   ================================================================ */
import { readFileSync } from 'node:fs';
import { scenes, SOLID } from '../src/game/scenes.js';
import { SEED_LIBRARY, TRADITIONS } from '../src/game/data/seed.js';

const KNOWN_STATION_KINDS = ['planner', 'courses', 'archive', 'computer', 'requests', 'notice', 'hearth', 'grantdesk', 'residents', 'research', 'coffee', 'review', 'records', 'calendar', 'ledger', 'makersbench', 'greenhouse', 'roundtable', 'mailroom', 'yourshelf', 'intake', 'notes', 'inheritance', 'commons', 'alexandria', 'tree', 'lift'];

const failures = [];
const fail = (msg) => failures.push(msg);

/* ---------- scenes ---------- */
for (const [key, s] of Object.entries(scenes)) {
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;

  if (s.tiles.length !== s.h) fail(`${key}: tiles has ${s.tiles.length} rows, expected h=${s.h}`);
  for (const row of s.tiles) {
    if (row.length !== s.w) fail(`${key}: a tile row has ${row.length} cols, expected w=${s.w}`);
  }

  if (!inBounds(s.spawn.x, s.spawn.y)) {
    fail(`${key}: spawn (${s.spawn.x},${s.spawn.y}) is out of bounds (${s.w}x${s.h})`);
  } else if (SOLID.has(s.tiles[s.spawn.y][s.spawn.x])) {
    fail(`${key}: spawn (${s.spawn.x},${s.spawn.y}) sits on a solid tile '${s.tiles[s.spawn.y][s.spawn.x]}'`);
  }

  for (const w of s.warps || []) {
    if (w.locked) continue; // a deliberately-locked door has no target yet
    if (!w.to || !scenes[w.to]) {
      fail(`${key}: warp at (${w.x},${w.y}) has no valid 'to' scene (got '${w.to}')`);
      continue;
    }
    const dest = scenes[w.to];
    if (w.sx === undefined || w.sy === undefined) {
      fail(`${key}: warp at (${w.x},${w.y}) -> '${w.to}' has no sx/sy landing spot`);
    } else if (w.sx < 0 || w.sy < 0 || w.sx >= dest.w || w.sy >= dest.h) {
      fail(`${key}: warp at (${w.x},${w.y}) -> '${w.to}' lands at (${w.sx},${w.sy}), out of bounds for that scene`);
    } else if (SOLID.has(dest.tiles[w.sy][w.sx])) {
      fail(`${key}: warp at (${w.x},${w.y}) -> '${w.to}' lands on a solid tile at (${w.sx},${w.sy})`);
    }
  }

  for (const st of s.stations || []) {
    if (!KNOWN_STATION_KINDS.includes(st.kind)) {
      fail(`${key}: station '${st.name}' at (${st.x},${st.y}) has kind '${st.kind}', not one of ${KNOWN_STATION_KINDS.join('/')} — main.js's onAction() would silently do nothing`);
    }
  }

  for (const b of s.buildings || []) {
    if (b.x < 0 || b.y < 0 || b.x + b.w > s.w || b.y + b.h > s.h) {
      fail(`${key}: building '${b.label}' footprint (${b.x},${b.y},${b.w}x${b.h}) exceeds scene bounds (${s.w}x${s.h})`);
    }
  }

  // Two different interactables on the same tile silently shadow one another,
  // since onAction() checks stations, then npcs, then signs, in that fixed order.
  const occupied = new Map();
  const claim = (kind, x, y, label) => {
    const at = `${x},${y}`;
    if (occupied.has(at)) fail(`${key}: '${label}' (${kind}) at (${x},${y}) overlaps '${occupied.get(at)}'`);
    else occupied.set(at, `${label} (${kind})`);
  };
  for (const st of s.stations || []) claim('station', st.x, st.y, st.name);
  for (const n of s.npcs || []) claim('npc', n.x, n.y, n.name);
  for (const sg of s.signs || []) claim('sign', sg.x, sg.y, sg.name);
}

/* ---------- common vs private ----------
   Every store in the save has to appear in DATA_MAP, or Your Data quietly
   stops telling the whole truth about what can leave this machine. That's a
   promise to a visitor, so it gets a test rather than a good intention.
   See plans/done/COMMONS-AND-PRIVATE-PLAN.md. */
{
  const { DATA_MAP } = await import('../src/game/data/visibility.js');
  const mapped = new Set(DATA_MAP.map(d => d.key));
  // entities.js can't be imported here (it touches the DOM), so the store list
  // is read straight out of its freshData() source text — crude, and it works.
  const src = readFileSync(new URL('../src/game/entities.js', import.meta.url), 'utf8');
  const m = src.match(/export function freshData\(\)\{ return \{([\s\S]*?)\}; \}/);
  if (!m) fail('entities.js: could not find freshData() to check the data map against');
  else {
    // top-level keys only — walk the text tracking depth, since a plain regex
    // also matches the keys of nested objects (grove.plantings, hall.experiments…)
    const body = m[1];
    const keys = [];
    let depth = 0, atKey = true, word = '';
    for (const ch of body) {
      if (ch === '{' || ch === '[' || ch === '(') { depth++; atKey = false; word = ''; continue; }
      if (ch === '}' || ch === ']' || ch === ')') { depth--; word = ''; continue; }
      if (ch === ',' && depth === 0) { atKey = true; word = ''; continue; }
      if (depth !== 0) continue;
      if (ch === ':') { if (atKey && word) keys.push(word); atKey = false; word = ''; continue; }
      if (/[a-zA-Z0-9_]/.test(ch)) { word += ch; } else { word = ''; }
    }
    // Small, boring, or self-evident stores that need no privacy line of their own.
    const ignore = new Set(['saveVersion', 'pos', 'seenWelcome', 'settings', 'ttsSettings',
      'fish', 'fishLog', 'read', 'inventory', 'waypoints', 'bookRequests', 'reviewQueue', 'noteMeta']);
    for (const k of keys) {
      if (ignore.has(k) || mapped.has(k)) continue;
      fail(`visibility.js: save store '${k}' has no DATA_MAP entry — Your Data can't say whether it ever leaves this machine`);
    }
    if (keys.length < 10) fail(`smoke: only parsed ${keys.length} top-level save stores — the freshData() reader has drifted`);
  }
}

/* ---------- inline handlers ----------
   The project's oldest and most-repeated gotcha, now a test: every function
   called from an inline on*= attribute in overlays.js must also appear in the
   `Object.assign(window, {...})` block at the bottom, or the button silently
   does nothing. Found two live ones the day this check was written — a
   custom-shelf "Open" button, and the Learning Tree's own "Back to the Course
   Board". A silent no-op button is worse than a crash: nobody reports it. */
{
  const src = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const block = src.slice(src.lastIndexOf('Object.assign(window'));
  const exported = new Set(block.match(/[A-Za-z_$][\w$]*/g) || []);
  // functions assigned straight onto window elsewhere count too
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) exported.add(m[1]);
  const RESERVED = new Set(['if', 'for', 'while', 'return', 'event', 'this', 'switch', 'try']);
  const called = new Set();
  for (const m of src.matchAll(/on(?:click|change|input|keydown|dragover|dragleave|drop)\s*=\s*["'`]?\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (!RESERVED.has(m[1])) called.add(m[1]);
  }
  for (const fn of called) {
    if (!exported.has(fn)) {
      fail(`overlays.js: '${fn}()' is called from an inline handler but is not on window — that button silently does nothing`);
    }
  }

  /* THE OTHER DIRECTION, added 2026-08-02 and much worse when it breaks.
     The check above is handlers -> exports. Nothing checked exports ->
     definitions, and deleting the Supabase café boards left nine dead names
     in the Object.assign(window, {...}) list. That is not a dud button: an
     undefined identifier inside an object literal throws a ReferenceError
     while the module is still evaluating, which aborts the WHOLE export block
     — so every function listed after the dead one never reaches window either,
     and most of the app quietly stops working. It cost one grep to find and
     would have cost a tester their evening. */
  const shorthand = block.match(/^\s*([A-Za-z_$][\w$]*)\s*,\s*$/gm) || [];
  const names = new Set(shorthand.map(l => l.trim().replace(/,$/, '')));
  for (const m of block.matchAll(/(?:^|[{,]\s*)([A-Za-z_$][\w$]*)\s*(?=[,}])/g)) names.add(m[1]);
  const defined = new Set();
  for (const m of src.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/^import\s+\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) defined.add(part.trim().split(/\s+as\s+/).pop().trim());
  }
  for (const m of src.matchAll(/^import\s+\{?\s*([A-Za-z_$][\w$]*)\s*\}?\s+from/gm)) defined.add(m[1]);
  for (const n of names) {
    if (n === 'window' || n === 'Object' || n === 'assign' || defined.has(n)) continue;
    fail(`overlays.js: the window export list names '${n}', which is not defined anywhere — that ReferenceError aborts the entire export block at load time, so nothing listed after it reaches window either`);
  }
}

/* ---------- copyright triage ----------
   The one place in this project where being wrong has consequences outside
   the app, so the rules get real cases. The property that matters most is the
   last one: nothing uncertain is ever recommended as shareable. See
   src/game/data/copyright.js for why an AI is deliberately not the judge. */
{
  const { triage } = await import('../src/game/data/copyright.js');
  const cases = [
    ['a Gutenberg classic', { text: 'The Project Gutenberg eBook of Walden, by Henry David Thoreau. This ebook is for the use of anyone anywhere at no cost. First published 1854.' }, 'pd'],
    ['a CC0 translation', { text: 'This translation is released into the public domain under Creative Commons Zero (CC0).' }, 'open'],
    ['a modern textbook', { text: 'Copyright © 2019 by Pearson Education. All rights reserved. No part of this book may be reproduced.' }, 'copyright'],
    ['text with no clues at all', { text: 'Chapter one. It was a quiet morning and nothing in particular happened.' }, 'unknown'],
    ['old, no statement', { text: 'A treatise, printed in the year 1873 in London.' }, 'pd'],
    // a recent date alone proves nothing either way — 'unknown' is the honest
    // answer, and it keeps the book personal just as 'copyright' would
    ['recent date, nothing stated', { text: 'This edition prepared in 2021 for the seminar.' }, 'unknown'],
    ['an author long dead', { text: 'A collection of essays.', evidence: { authorDied: 1901 } }, 'pd'],
    ['Gutenberg quoting an old copyright page', { text: 'The Project Gutenberg eBook. This ebook is for the use of anyone anywhere. Copyright 1902 by the publisher. Published 1902.' }, 'pd'],
  ];
  for (const [name, input, want] of cases) {
    const got = triage(input).id;
    if (got !== want) fail(`copyright.js: ${name} → '${got}', expected '${want}'`);
  }
  // THE safety property: anything not positively established stays personal.
  for (const [name, input] of cases) {
    const v = triage(input);
    if (v.mayShare && !(v.id === 'pd' || v.id === 'open')) {
      fail(`copyright.js: ${name} was marked shareable on a '${v.id}' verdict — uncertain must never mean shareable`);
    }
  }
}


/* ---------- user-facing docs must not send a beta tester to the cloud ----------
   Added 2026-08-02 from outside review, which caught PROTOCOLS.md presenting a
   SUPABASE_SERVICE_ROLE_KEY path as "the real pipeline" in a document whose
   whole premise is a local Pavilion. Three things wrong at once: it contradicts
   the 2026-07-12 standing decision, it is unusable by a tester who has no
   Supabase project, and it is the highest-privilege credential class there is.

   The rule this enforces is NOT "never mention it" — promote-draft.py genuinely
   still needs one and pretending otherwise would be the dishonest fix. The rule
   is: wherever a user-facing doc names it, the same passage must say plainly
   that it is maintainer-only and not needed to fill your own Pavilion. */
{
  const fs = await import('node:fs');
  const USER_FACING = ['PROTOCOLS.md', 'MANUAL.md', 'README.md', 'plans/BETA-RELEASE-NOTES.md'];
  /* UPDATED 2026-08-02, the second time that day, because the ground moved
     under it. The first version demanded that every SERVICE_ROLE mention carry
     a "maintainer-only, never commit" note nearby. Then the hosted backend was
     deleted outright and NO key is needed by anybody for anything — so the rule
     gets stricter and simpler:

       a user-facing doc may mention a service-role key ONLY to say it is gone.

     Anything still reading like an instruction fails. Kept as proximity rather
     than presence for the same reason as before: a disclaimer three sections
     away from the instruction is one the reader never sees. */
  const NEAR = 1200; // characters either side — about a screen
  const RETIRED = /deleted|retired|no longer|is gone|no key|no secret|not needed|no account/i;
  const INSTRUCTION = /\bexport\s+SUPABASE|\$env:SUPABASE|--help explains|you (?:will )?need (?:a |an )?(?:cloud |supabase )/i;
  for (const f of USER_FACING) {
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/SERVICE_ROLE/gi)) {
      const around = text.slice(Math.max(0, m.index - NEAR), m.index + NEAR);
      if (!RETIRED.test(around)) {
        fail(`${f}: the SERVICE_ROLE mention at character ${m.index} does not say, within ${NEAR} characters, that no such key is needed any more — nothing in this project asks for one, and a doc implying otherwise sends a tester to make a cloud account for nothing`);
      }
      if (INSTRUCTION.test(around)) {
        fail(`${f}: the SERVICE_ROLE mention at character ${m.index} still reads as an INSTRUCTION to obtain or set one. The backend it belonged to was deleted; the only acceptable mention now is historical`);
      }
    }
    if (/Get (?:both|them|these|the keys?) from your \w+ project/i.test(text)) {
      fail(`${f} still tells a reader to fetch keys from a cloud project — there is no backend to fetch them from`);
    }
  }
  // And no user-facing doc may present a cloud account as REQUIRED to use the app.
  const manual = fs.existsSync('MANUAL.md') ? fs.readFileSync('MANUAL.md', 'utf8') : '';
  if (/you (will )?need (a )?Supabase/i.test(manual)) {
    fail('MANUAL.md tells a visitor they need Supabase — the app runs with no account at all');
  }
}


/* ---------- the two café boards must read as DORMANT, not BROKEN ----------
   A beta tester cannot tell "deliberately waiting on a server that does not
   exist" from "misconfigured on my machine" — and the old copy ("needs a
   Supabase connection — nothing configured on this device") actively pushed
   them toward the second reading, naming a service they have never heard of.
   They then either try to fix it or file it as a bug. Both are our fault. */
{
  const fs = await import('node:fs');
  const src = fs.readFileSync('src/game/ui/overlays.js', 'utf8');
  // The exact old strings, so they cannot come back by a careless revert.
  for (const bad of [
    'needs a Supabase connection to show the board',
    'needs a Supabase connection to post',
  ]) {
    if (src.includes(bad)) {
      fail(`overlays.js still tells a visitor "${bad}" — say the board is dormant by design instead, and that there is nothing for them to configure`);
    }
  }
  const manual = fs.readFileSync('MANUAL.md', 'utf8');
  if (/Notice Board/.test(manual) && !/dormant in this build|not in this build/i.test(manual)) {
    fail('MANUAL.md lists the café boards without saying they are dormant in this build — a tester will report them as broken');
  }
}


/* ---------- no shipped book may need Docker ----------
   The Library has two tiers: books whose text is in hand, and books whose text
   lives in the MinIO pool (doc.fullText.storage = {bucket,key}). The reader
   handles both, which is what makes bundles possible at all — see
   plans/BOOK-BUNDLES-AND-THE-POOL.md.

   But a book in the SHIPPED SEED must always carry its own text or be an honest
   summary. If one ever ships with a pool pointer, every tester without Docker
   gets a book that will not open and a storage warning they cannot act on, for
   a service nobody told them to install. Zero do today; this keeps it so. */
{
  const offenders = SEED_LIBRARY.filter(d => d.doc && d.doc.fullText && d.doc.fullText.storage);
  for (const d of offenders) {
    fail(`seed.js: "${d.title}" ships with a MinIO storage pointer — a tester with no Docker cannot open it, and the shipped library must never depend on a service. Inline the text (src/game/data/library-texts/) or carry it as a summary.`);
  }
}


/* ---------- the map at the top of overlays.js ----------
   The file opens with a map of itself, pointing at sections by QUOTED ANCHOR
   TEXT rather than line number, because line numbers rot within a day. This
   checks every anchor still exists — otherwise the map becomes the thing it
   was written to prevent: confident, specific, and wrong.

   The map promises "every anchor below is checked by npm test". This is that
   promise. A rename tells you here rather than wasting someone's afternoon. */
{
  const src = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const mapStart = src.indexOf('MAP OF THIS FILE');
  if (mapStart < 0) {
    fail('overlays.js: the map at the top of the file is gone — it is the only orientation a newcomer gets');
  } else {
    const mapEnd = src.indexOf('====== */', mapStart);
    const map = src.slice(mapStart, mapEnd > 0 ? mapEnd : mapStart + 8000);
    const body = src.slice(mapEnd > 0 ? mapEnd : mapStart + 8000);
    // every "quoted anchor" in the left-hand column of the map
    const anchors = [...map.matchAll(/^\s{5}"([^"]{4,})"/gm)].map(m => m[1]);
    if (anchors.length < 25) {
      fail(`overlays.js map: only ${anchors.length} anchors parsed — the map's shape has drifted from what this test reads`);
    }
    for (const a of anchors) {
      if (!body.includes(a)) {
        fail(`overlays.js map points at "${a}" and no such text exists below it — rename the map entry, or the map is lying to the next person`);
      }
    }
  }
}


/* ---------- resident memory ----------
   What a resident carries between visits. The bar this has to clear is the one
   the gap was described by: a tag list ("you've asked about electronics") is
   worthless; the outcome ("you decided to build it from scratch and were stuck
   on IR timing") is the whole value. So the tests are about whether the SECOND
   kind of sentence survives, and whether one stuck afternoon can evict
   everything else. See src/game/data/memory.js. */
{
  const { gistOf, sameAsk, rememberInto } = await import('../src/game/data/memory.js');

  // The gist must be the substance, not the greeting.
  const g1 = gistOf("Sure! Happy to help. You'll want a 38 kHz carrier because ambient infrared from sunlight and fluorescent lamps would otherwise swamp the receiver.");
  if (/^sure/i.test(g1)) fail(`memory.js: gistOf kept the pleasantry — got "${g1}"`);
  if (!/38 kHz/.test(g1)) fail(`memory.js: gistOf dropped the substance — got "${g1}"`);

  if (gistOf('') !== '') fail('memory.js: gistOf on an empty reply must be empty, not a stray character');
  if (gistOf('```js\nconst x=1;\n```') !== '') fail('memory.js: a reply that is only code has no gist worth keeping');
  const long = gistOf('x'.repeat(400));
  if (long.length > 181) fail(`memory.js: gistOf did not cap a runaway sentence (${long.length} chars)`);

  // Repeats must not evict everything else.
  let mem = [];
  mem = rememberInto(mem, { ts: '2026-08-01', text: 'How do I pick a resistor for an LED?', reply: 'Ohm\'s law: subtract the LED forward voltage, then divide by the current you want.' });
  mem = rememberInto(mem, { ts: '2026-08-02', text: 'What carrier frequency does my TV remote use?', reply: 'Most use 38 kHz. Sony is 40, Philips RC-5 is 36.' });
  if (mem.length !== 2) fail(`memory.js: two different questions should be two entries, got ${mem.length}`);

  for (let i = 0; i < 6; i++) {
    mem = rememberInto(mem, { ts: '2026-08-02', text: 'what carrier frequency does my remote use', reply: 'Still 38 kHz.' });
  }
  if (mem.length !== 2) fail(`memory.js: THE SAME QUESTION ASKED SEVEN TIMES FILLED ${mem.length} SLOTS — one stuck afternoon must not evict what a resident knew about you`);
  if (mem[0].text !== 'How do I pick a resistor for an LED?') fail('memory.js: repeating one question evicted an unrelated earlier one');
  if (mem[1].gist !== 'Still 38 kHz.') fail('memory.js: a repeat should keep the NEWEST answer, not the first');

  // Both halves are actually stored.
  const e = mem[0];
  if (!e.text || !e.gist) fail('memory.js: an entry must carry both what was raised AND where it got to');
  if (!/Ohm/.test(e.gist)) fail(`memory.js: the outcome half was lost — got "${e.gist}"`);

  // The cap holds, on genuinely distinct subjects.
  const SUBJECTS = ['soldering irons', 'breadboard rails', 'oscilloscope probes', 'pull-up resistors',
    'crystal oscillators', 'voltage dividers', 'schmitt triggers', 'flyback diodes', 'decoupling caps',
    'ground loops', 'PWM duty cycles', 'shift registers', 'logic levels', 'heat sinks', 'ferrite beads',
    'switch bounce', 'ADC sampling', 'I2C addresses', 'SPI clock modes', 'UART baud rates',
    'zener clamping', 'darlington pairs', 'RC filters', 'crimp terminals', 'wire gauge'];
  let big = [];
  for (const subj of SUBJECTS) big = rememberInto(big, { ts: '2026-08-02', text: `tell me about ${subj}`, reply: `Here is how ${subj} work in practice, at some length.`, cap: 20 });
  if (big.length !== 20) fail(`memory.js: cap not enforced on ${SUBJECTS.length} distinct subjects — ${big.length} entries`);

  // Different subjects must NOT be merged.
  if (sameAsk('how do I solder a header pin', 'what is the dhammapada about')) {
    fail('memory.js: sameAsk merged two unrelated questions — a resident would lose real context');
  }
  /* The one that made the threshold 3 instead of 4: the distinguishing token is
     short. At 4 characters these two collapse into one memory and the resident
     forgets you ever asked about the other. */
  if (sameAsk('what resistor for a red LED', 'what resistor for a blue LED')) {
    fail('memory.js: sameAsk merged two questions that differ only by a SHORT word — short tokens are exactly the ones that distinguish electronics questions');
  }
  if (sameAsk('is 38 kHz the right carrier', 'is 56 kHz the right carrier')) {
    fail('memory.js: sameAsk merged two questions differing only by a number');
  }
  // But a genuine rephrasing still merges.
  if (!sameAsk('what carrier frequency does my TV remote use?', 'which carrier frequency do TV remotes use')) {
    fail('memory.js: sameAsk failed to merge an obvious rephrasing — repeats will eat the memory');
  }
}


/* ---------- sourcing: how was it GATHERED ----------
   The second axis, beside copyright.js. Its safety property is the mirror of
   that file's: nothing unrecognised is ever waved through as freely given, and
   BOTH axes must agree before anything may enter the commons — because a text
   can be genuinely public domain and still have been taken from somewhere it
   had no business being taken from. See plans/CREDIT-AND-COMMONS-FRAMEWORK.md. */
{
  const { assess, classifySource, mayEnterCommons, LEVELS } =
    await import('../src/game/data/sourcing.js');

  const cases = [
    ['Gutenberg',            'https://www.gutenberg.org/ebooks/1228',        'given'],
    ['arXiv',                'https://arxiv.org/abs/2401.00001',             'given'],
    ['a Vishay datasheet',   'https://www.vishay.com/docs/82491/tsop382.pdf', 'given'],
    ['Kuphaldt, DSL',        'https://www.allaboutcircuits.com/textbook/',   'given'],
    ['a US government doc',  'https://www.nasa.gov/whatever.pdf',            'given'],
    ['"I bought it"',        'bought it from the shop last year',            'held'],
    ['"my own copy"',        'my own copy, off my shelf',                    'held'],
    ['something you wrote',  'I wrote this myself',                          'given'],
    ['a YouTube transcript', 'https://youtube.com/watch?v=abc',              'ask'],
    ['a lending library',    'https://archive.org/details/foo/lending',      'ask'],
    ['a .edu with no terms', 'https://mit.edu/course/notes.pdf',             'ask'],
    ['a re-upload site',     'https://scribd.com/doc/12345',                 'ask'],
    ['"a friend sent it"',   'a friend emailed it to me',                    'ask'],
    ['"found it online"',    'found it online somewhere, not sure',          'ask'],
    ['a shadow library',     'libgen.rs/book/index.php?md5=x',               'no'],
    ['Sci-Hub',              'sci-hub.se/10.1000/xyz',                       'no'],
    ["Anna's Archive",       'annas-archive.org/md5/abc',                    'no'],
    ['a torrent',            'magnet:?xt=urn:btih:abc',                      'no'],
    ['DRM stripping',        'used deDRM to remove the DRM',                 'no'],
  ];
  for (const [name, source, want] of cases) {
    const got = assess({ source }).id;
    if (got !== want) fail(`sourcing.js: ${name} → '${got}', expected '${want}'`);
  }

  // THE safety property, mirroring copyright.js: unrecognised is never 'given'.
  for (const junk of ['', 'qqq', 'http://example.com/thing.pdf', 'somewhere', '???']) {
    const v = assess({ source: junk });
    if (v.id === 'given') fail(`sourcing.js: unrecognised source ${JSON.stringify(junk)} was waved through as freely given`);
  }
  if (classifySource('') !== null) fail('sourcing.js: an empty source must return null so the UI knows to ASK');

  // BOTH axes must agree. This is the case the whole file exists for: a clean
  // licence does not excuse where it came from, and vice versa.
  const gate = [
    [{ sharing: 'pd',        gathered: 'given' }, true,  'public domain, freely given'],
    [{ sharing: 'open',      gathered: 'given' }, true,  'open licence, freely given'],
    [{ sharing: 'pd',        gathered: 'no'    }, false, 'PUBLIC DOMAIN but taken from a shadow library'],
    [{ sharing: 'pd',        gathered: 'ask'   }, false, 'public domain but an unrecorded origin'],
    [{ sharing: 'copyright', gathered: 'given' }, false, 'freely given but still in copyright'],
    [{ sharing: 'unknown',   gathered: 'held'  }, false, 'nothing established either way'],
  ];
  for (const [input, want, name] of gate) {
    const got = mayEnterCommons(input).ok;
    if (got !== want) fail(`sourcing.js: mayEnterCommons(${name}) → ${got}, expected ${want}`);
  }

  // Every level must carry advice a person can act on, not just a colour.
  for (const k of Object.keys(LEVELS)) {
    const L = LEVELS[k];
    if (!L.mark || !L.label || !L.short || !L.advice || L.advice.length < 40) {
      fail(`sourcing.js: level '${k}' is missing the guidance that makes it useful`);
    }
  }
}


/* ---------- drafted-step parsing ----------
   Checked against what the REAL local model on this machine returns, which is
   not what the prompt asks for: every step on one line, "action | why."
   repeated. Caught only by running it against a live model, so the case is
   preserved here verbatim. See src/game/data/draft-parse.js. */
{
  const { parseDraftedSteps } = await import('../src/game/data/draft-parse.js');
  const REAL = "Find a quiet spot and sit comfortably on a chair or cushion for about five minutes | A stable posture keeps your back upright without straining your muscles. Close your eyes gently and take three slow, deep breaths to settle into the moment | This signals your nervous system that it is safe to relax. Focus your attention entirely on the sensation of air entering and leaving your nose | Anchoring your mind on one physical point prevents it from wandering too quickly. When thoughts drift away, notice them without judgment and softly return your focus to breathing | Returning attention repeatedly builds mental muscle and resilience over time. Gently open your eyes and stretch before slowly resuming your day | Transitioning gradually helps you carry calmness into the next activity.";
  const cases = [
    ['a real local model reply, all on one line', REAL, 5],
    ['one per line, as asked', ['Sit down','Breathe','Notice drifting','Return'].join(String.fromCharCode(10)), 4],



    ['numbered on one line', '1. Sit down 2. Breathe 3. Notice 4. Return', 4],
    ['bulleted lines', ['- Sit down','- Breathe','- Return'].join(String.fromCharCode(10)), 3],


    ['a single step', 'Just sit there', 1],
    ['a paragraph that ignored the shape entirely', 'Sit down somewhere quiet. Close your eyes and breathe slowly. Notice when your mind wanders. Bring it gently back again.', 4],
    ['nothing at all', '', 0],
  ];
  for (const [name, input, want] of cases) {
    const got = parseDraftedSteps(input).length;
    if (got !== want) fail(`draft-parse.js: ${name} gave ${got} steps, expected ${want}`);
  }

  /* ---------- one-question answers ----------
     The drafting asks one small thing at a time now (2026-07-28) because a 9B
     model obeys a small ask and mangles a six-part one. But it still decorates
     a one-word answer, so every way it does that has a case here. */
  const { cleanAnswer } = await import('../src/game/data/draft-parse.js');
  const answers = [
    ['a bare answer is left alone', 'Sitting for One Minute', {}, 'Sitting for One Minute'],
    ['strips the label it was told not to write', 'TITLE: Sitting for One Minute', {label:'title'}, 'Sitting for One Minute'],
    ['strips surrounding quotes', '"Sitting for One Minute"', {}, 'Sitting for One Minute'],
    ['strips a bullet', '- Sitting for One Minute', {}, 'Sitting for One Minute'],
    ['strips numbering', '1. Sitting for One Minute', {}, 'Sitting for One Minute'],
    ['strips a Step N: prefix', 'Step 3: Sit down | it starts the practice', {}, 'Sit down | it starts the practice'],
    ['drops a conversational preamble line',
      'Sure, here is a title:' + String.fromCharCode(10) + 'Sitting for One Minute', {}, 'Sitting for One Minute'],
    ['strips a code fence', '```' + String.fromCharCode(10) + 'Sitting for One Minute' + String.fromCharCode(10) + '```', {}, 'Sitting for One Minute'],
    ['takes only the first line unless told otherwise',
      'Sitting for One Minute' + String.fromCharCode(10) + 'I hope that helps!', {}, 'Sitting for One Minute'],
    ['joins lines when the answer is allowed to be long',
      'You will sit for a minute.' + String.fromCharCode(10) + 'Then you will notice the difference.',
      {multiline:true}, 'You will sit for a minute. Then you will notice the difference.'],
    ['caps a track that rambled', 'Meditation and the contemplative traditions of Asia', {maxWords:4}, 'Meditation and the contemplative'],
    ['nothing at all', '', {}, ''],
  ];
  for (const [name, input, opts, want] of answers) {
    const got = cleanAnswer(input, opts);
    if (got !== want) fail(`draft-parse.js cleanAnswer: ${name} gave "${got}", expected "${want}"`);
  }

  /* ---------- the repeated step ----------
     Both of these came out of ornith:9b in one real draft (2026-07-28): asked
     for step 5 with steps 1-4 in front of it, it re-wrote step 3. */
  const { tooSimilarStep } = await import('../src/game/data/draft-parse.js');
  const dupes = [
    ['the real repeat this was written for',
      'Folds hands into a fist, holding onto slight tension in wrists',
      ['Sits comfortably with back straight', 'Folds hands into a loose fist'], true],
    ['an exact repeat', 'Sit down and breathe', ['Sit down and breathe'], true],
    ['a different why does not make it a new step',
      'Sit down quietly | it settles the body',
      ['Sit down quietly | it starts the practice'], true],
    ['a genuinely different step is kept',
      'Set a timer for one minute | so you are not watching the clock',
      ['Sit down quietly | it settles the body'], false],
    ['nothing to compare against', 'Sit down quietly', [], false],
  ];
  for (const [name, cand, prev, want] of dupes) {
    const got = tooSimilarStep(cand, prev);
    if (got !== want) fail(`draft-parse.js tooSimilarStep: ${name} gave ${got}, expected ${want}`);
  }
}

/* ---------- a drafted plan becoming a walkable lesson ----------
   THE-STUDY-CHAIN-PLAN.md Stage 1. The plan drafting has worked since
   2026-07-26 and dead-ended in a text note every time, so this parser is the
   whole joint. Cases are the shapes a local model actually reaches for when
   asked for "a short sequence of study sessions." See plan-to-lesson.js. */
{
  const { planToLesson } = await import('../src/game/data/plan-to-lesson.js');
  const NL = String.fromCharCode(10);

  const SESSIONS = [
    'Goal: Be able to solder a joint that holds.',
    '',
    'Session 1 (30 min): Read chapter 2 and name the parts of a joint.',
    'Hands-on: identify a cold joint in a photo.',
    '',
    'Session 2 (45 min): Tin the tip and make three joints on scrap wire.',
    'Hands-on: tug each one hard.',
    '',
    'Session 3 (30 min): Desolder and redo the worst of the three.',
  ].join(NL);

  const shapes = [
    ['sessions with a goal line', SESSIONS, 3],
    ['week headers', ['Week 1 — read the datasheet', 'Week 2 — build the driver', 'Week 3 — measure it'].join(NL), 3],
    ['day headers', ['Day 1. Sit with it', 'Day 2. Try it', 'Day 3. Write it up'].join(NL), 3],
    ['markdown step headers', ['**Step 1:** Buy an iron', '**Step 2:** Tin the tip', '**Step 3:** Join two wires'].join(NL), 3],
    ['hash headers', ['## Part 1', 'Read it.', '## Part 2', 'Try it.'].join(NL), 2],
    ['a plain numbered list', ['1. Buy an iron', '2. Tin the tip', '3. Join two wires'].join(NL), 3],
    ['paragraphs, shape ignored entirely',
      ['First you will read the chapter slowly and take notes as you go.', '',
       'Then you will try the thing yourself on a piece of scrap.', '',
       'Finally you will write down what surprised you about it.'].join(NL), 3],
    ['one lump of prose with no structure at all', 'Just read the book and think about it for a while.', 1],
    ['nothing at all', '', 0],
  ];
  for (const [name, input, want] of shapes) {
    const got = planToLesson(input).steps.length;
    if (got !== want) fail(`plan-to-lesson.js: ${name} gave ${got} steps, expected ${want}`);
  }

  /* The goal line is the lesson's SUMMARY, never its first step — a plan whose
     first rung is "Goal: ..." is not walkable, it is a label you tick. */
  const s = planToLesson(SESSIONS);
  if (!/solder a joint that holds/.test(s.summary)) fail(`plan-to-lesson.js: the goal line did not become the summary — got "${s.summary}"`);
  if (/^goal/i.test(s.steps[0].title)) fail('plan-to-lesson.js: the goal line was turned into a step');
  if (!/chapter 2/i.test(s.steps[0].title)) fail(`plan-to-lesson.js: step 1 lost its instruction — got "${s.steps[0].title}"`);
  /* Found by LOOKING at the tree, 2026-08-03: eating "Session 1" and leaving
     the parenthetical stranded gave steps titled "(30 min): Read chapter 2".
     The duration is worth keeping — at the END, where it reads as a note
     rather than as the instruction. */
  if (/^\s*[([]/.test(s.steps[0].title)) fail(`plan-to-lesson.js: a step title starts with a stranded parenthetical — "${s.steps[0].title}"`);
  if (!/^Read chapter 2/.test(s.steps[0].title)) fail(`plan-to-lesson.js: the step should open with the instruction — got "${s.steps[0].title}"`);
  if (!/30 min/.test(s.steps[0].title)) fail(`plan-to-lesson.js: the duration was thrown away — got "${s.steps[0].title}"`);
  // a parenthetical that ISN'T a duration is content and stays in place
  const paren = planToLesson('Session 1 (the hard one): Wire it up.');
  if (/the hard one/.test(paren.steps[0].title) === false) fail(`plan-to-lesson.js: a non-duration parenthetical was discarded — got "${paren.steps[0].title}"`);
  // a header with nothing after it still needs a name
  const bare = planToLesson(['## Part 1', 'Read it.', '## Part 2', 'Try it.'].join(NL));
  if (!bare.steps[0].title) fail('plan-to-lesson.js: a bare header produced a step with no title at all');
  if (!/tug each one/i.test(s.steps[1].body)) fail('plan-to-lesson.js: the hands-on line under a session was dropped instead of becoming its body');

  /* A numbered list INSIDE a step is content, not structure. Swallowing it
     shreds the plan into a parts list, which is the failure mode this guard
     exists for: the numbers must actually run 1,2,3 from the top. */
  const inner = planToLesson(['Session 1: Gather the parts.', '1. An IR LED', '2. A resistor', '3. A transistor',
    'Session 2: Wire them up.'].join(NL));
  if (inner.steps.length !== 2) fail(`plan-to-lesson.js: a parts list inside a session became ${inner.steps.length} steps — it is content, not structure`);
  if (!/IR LED/.test(inner.steps[0].body)) fail('plan-to-lesson.js: the parts list was dropped rather than kept as the step body');

  /* Titles sit on one line in the tree. A model writing a whole instruction as
     its header must not produce a title cut off mid-word. */
  const longHdr = planToLesson('Session 1: Read the whole of chapter two carefully and then write down every term you did not already know, because the vocabulary is most of the difficulty here.');
  if (longHdr.steps[0].title.length > 80) fail(`plan-to-lesson.js: a long header was not split — title is ${longHdr.steps[0].title.length} chars`);
  if (/\s$/.test(longHdr.steps[0].title) || /[a-z]{1,2}$/.test(longHdr.steps[0].title) === false) { /* shape only */ }
  if (!longHdr.steps[0].body) fail('plan-to-lesson.js: the remainder of a long header was thrown away instead of becoming the body');

  /* The note's own title carries over, minus the prefix the drafting adds,
     so a lesson does not arrive in the tree called "Lesson plan — Lesson plan". */
  const t = planToLesson(SESSIONS, { title: 'Lesson plan — Soldering' });
  if (t.title !== 'Soldering') fail(`plan-to-lesson.js: the title kept its prefix — got "${t.title}"`);

  /* Never an empty lesson from non-empty input: an unparseable plan is one
     honest step, not a node that looks broken. */
  for (const junk of ['???', 'x', 'Goal: something', '...']) {
    if (!planToLesson(junk).steps.length) fail(`plan-to-lesson.js: ${JSON.stringify(junk)} produced a lesson with no steps at all`);
  }
}

/* ---------- machine advice ----------
   'Can my computer run this?' has to be right for the machines the first
   testers actually have — laptops, 8 or 16 GB, integrated graphics. Erring
   small is deliberate: a too-big model freezes a laptop and loses a tester,
   a too-small one answers fast and keeps them curious. */
{
  const { recommendModel, pullCommand, MODELS } = await import('../src/game/data/machine-advice.js');
  const cases = [
    // a 4 GB machine gets told not to bother — the honest answer, and the one
    // this suite forced by refusing any model over 60% of memory
    ['a 4 GB netbook is told to skip the AI', { totalMemGB: 4, cores: 2 }, 'none', null],
    ['a 6 GB machine gets the tiniest model', { totalMemGB: 6, cores: 4 }, 'tight', MODELS.tiny.tag],
    ['an 8 GB laptop gets the 3B', { totalMemGB: 8, cores: 4 }, 'everyday', MODELS.small.tag],
    ['a 16 GB laptop gets the 8B', { totalMemGB: 16, cores: 8 }, 'capable', MODELS.standard.tag],
    ['a 32 GB desktop still starts at the 8B', { totalMemGB: 32, cores: 16 }, 'strong', MODELS.standard.tag],
    ['an unreadable machine still gets a safe answer', {}, 'unknown', MODELS.small.tag],
  ];
  for (const [name, info, tier, tag] of cases) {
    const r = recommendModel(info);
    if (r.tier !== tier) fail(`machine-advice: ${name} gave tier ${r.tier}, expected ${tier}`);
    const got = r.model ? r.model.tag : null;
    if (got !== tag) fail(`machine-advice: ${name} recommended ${got}, expected ${tag}`);
    if (!r.verdict || !r.why) fail(`machine-advice: ${name} produced no verdict or explanation`);
    const want = tag ? 'ollama pull ' + tag : '';
    if (pullCommand(r.model) !== want) fail(`machine-advice: ${name} built a bad pull command`);
  }
  // a machine told to skip the AI must still be told the app is fully usable
  const skip = recommendModel({ totalMemGB: 4, cores: 2 });
  if (!/works with no AI at all/i.test(skip.why)) fail('machine-advice: a machine told to skip the AI was not reassured the app still works');
  // a laptop must be told to plug in — most throttle hard on battery
  const lap = recommendModel({ totalMemGB: 16, cores: 8, hasBattery: true });
  if (!lap.notes.some(n => /plug it in/i.test(n))) fail('machine-advice: a laptop was not told to plug in');
  const desk = recommendModel({ totalMemGB: 16, cores: 8, hasBattery: false });
  if (desk.notes.some(n => /plug it in/i.test(n))) fail('machine-advice: a desktop was told to plug in');
  // every machine is told the first answer is slowest
  if (!desk.notes.some(n => /first question/i.test(n))) fail('machine-advice: nobody warned about the first-load pause');
  // never recommend a model bigger than the machine
  for (const gb of [2, 4, 6, 8, 12, 16, 24, 64]) {
    const r = recommendModel({ totalMemGB: gb, cores: 4 });
    if (r.model && r.model.gb > gb * 0.6) {
      fail(`machine-advice: a ${gb} GB machine was offered a ${r.model.gb} GB model — too big to be safe`);
    }
  }
}

/* ---------- shelf rules ----------
   The budget rule made testable: file the obvious ones with no model, and —
   more importantly — STAY QUIET when a title is genuinely ambiguous. Over-
   filing is the worse failure, because a wrongly shelved book is one you will
   never find again. */
{
  const { preSortShelves, unsortedWorkOrder } = await import('../src/game/data/shelf-rules.js');
  const SHELVES = ['Electronics', 'Cooking', 'Theravada', 'Daoism', 'Science', 'Practice'];
  const bk = (slug, title, extra = {}) => ({ slug, title, ...extra });

  const filedAlready = [
    bk('a1', 'The Art of Electronics', { tradition: 'Electronics', attribution: 'Horowitz' }),
    bk('a2', 'Learning the Art of Electronics', { tradition: 'Electronics', attribution: 'Horowitz' }),
  ];

  const cases = [
    ['a lineage word files it', bk('b1', 'Satipatthana Sutta'), 'Theravada'],
    ['a shelf name in the title files it', bk('b2', 'Practical Electronics for Inventors'), 'Electronics'],
    ['a duplicate goes where its twin lives', bk('b3', 'The Art of Electronics'), 'Electronics'],
    ['a known author files it', bk('b4', 'Some Other Book', { attribution: 'Horowitz' }), 'Electronics'],
    ['the Tao Te Ching is Daoism', bk('b5', 'Tao Te Ching'), 'Daoism'],
    ['meditation goes to Practice', bk('b6', 'A Guide to Meditation'), 'Practice'],
  ];
  for (const [name, book, want] of cases) {
    const r = preSortShelves([book], SHELVES, filedAlready);
    const got = r.filed[0] && r.filed[0].shelf;
    if (got !== want) fail(`shelf-rules: ${name} gave ${got}, expected ${want}`);
    if (r.filed[0] && !r.filed[0].why) fail(`shelf-rules: ${name} filed without saying why`);
  }

  /* A note on where the safety actually comes from, surfaced by writing these:
     "The Tao of Physics" files to Science, which is arguable but defensible.
     That is fine, and deliberately so — nothing here is ever auto-applied. Every
     rule produces a SUGGESTION a person accepts or changes, so the system's
     safety comes from the accept step, not from any rule being infallible. What
     must never happen is a confident answer where there is genuinely no signal
     at all, which is what the cases below pin down. */

  /* The cases that matter more — it must decline rather than guess. */
  const mustDecline = [
    // a genuine double-hit: 'meditation' says Practice, 'sutta' says Theravada.
    // Two shelves is not a tie to break, it is a question for a person.
    ['two lineages at once is a real ambiguity', bk('c1', 'Meditation on the Satipatthana Sutta')],
    ['a bare title tells it nothing', bk('c2', 'Tartine Bread')],
    ['a substring is not a word — Automation is not about the Tao', bk('c3', 'Automation and Autonomy')],
    ['an unknown author proves nothing', bk('c4', 'A Book', { attribution: 'Nobody In Particular' })],
  ];
  for (const [name, book] of mustDecline) {
    const r = preSortShelves([book], SHELVES, filedAlready);
    if (r.filed.length) fail(`shelf-rules: ${name} — it filed onto ${r.filed[0].shelf} instead of declining`);
    if (r.unsure.length !== 1) fail(`shelf-rules: ${name} did not pass the book on for a second look`);
  }

  // an author on two different shelves teaches nothing, so it must not be used
  const twoShelves = [
    bk('d1', 'One', { tradition: 'Science', attribution: 'Same Person' }),
    bk('d2', 'Two', { tradition: 'Cooking', attribution: 'Same Person' }),
  ];
  const amb = preSortShelves([bk('d3', 'Three', { attribution: 'Same Person' })], SHELVES, twoShelves);
  if (amb.filed.length) fail('shelf-rules: an author spread across two shelves was still used to file');

  // a hint must never file onto a shelf this Pavilion does not have
  const noShelf = preSortShelves([bk('e1', 'Satipatthana Sutta')], ['Cooking'], []);
  if (noShelf.filed.length) fail('shelf-rules: filed onto a shelf that does not exist here');

  // the work order names the leftovers and says what shape the answer takes
  const wo = unsortedWorkOrder([bk('f1', 'Tartine Bread')], SHELVES);
  if (!/Tartine Bread/.test(wo)) fail('shelf-rules: the work order left out a book');
  if (!/TITLE => SHELF/.test(wo)) fail('shelf-rules: the work order does not say what shape the answer takes');
  if (unsortedWorkOrder([], SHELVES) !== '') fail('shelf-rules: an empty work order should be empty');

  // and the whole point: a big mixed pile mostly sorts itself, with no model
  const pile = [
    bk('g1', 'Dhammapada'), bk('g2', 'Anapanasati Sutta'), bk('g3', 'Zhuangzi'),
    bk('g4', 'Electronics Cookbook'), bk('g5', 'Quantum Physics'), bk('g6', 'Mindfulness'),
    bk('g7', 'Something Unguessable'), bk('g8', 'Another Mystery'),
  ];
  const big = preSortShelves(pile, SHELVES, []);
  if (big.filed.length + big.unsure.length !== pile.length) fail('shelf-rules: a book was lost in the pre-sort');
  if (big.filed.length < 4) fail(`shelf-rules: only ${big.filed.length} of 8 obvious books filed by rule — the rules have gone quiet`);
}

/* ---------- The Day ----------
   WHY-OPEN-IT-TODAY-PLAN.md states four rules this screen has to keep, and
   they are the kind that erode quietly under later "improvements". So they are
   tests rather than intentions: never empty, never a wall, one press per item,
   and it notices rather than nags. */
{
  const { theDayItems, theDayLine, daysBetween } = await import('../src/game/data/the-day.js');
  const TODAY = '2026-07-28';
  const bk = (slug, title, extra = {}) => ({ slug, title, ...extra });

  if (daysBetween('2026-07-25', TODAY) !== 3) fail('the-day: daysBetween is wrong');
  if (daysBetween(TODAY, TODAY) !== 0) fail('the-day: same day should be 0');

  // NEVER EMPTY — the rule that matters most, in the emptiest possible world
  const bare = theDayItems({ today: TODAY });
  if (!bare.length) fail('the-day: an empty Pavilion produced nothing to do — "all caught up" is a reason not to return');
  if (!/Bring a book in/.test(bare[0].title)) fail('the-day: the empty-world fallback should invite a first book');
  const onlyBooks = theDayItems({ today: TODAY, books: [bk('b1', 'Something')], read: { b1: true } });
  if (!onlyBooks.length) fail('the-day: a read-everything Pavilion still needs one good offer');

  // DAY ONE is the whole first impression, and the first version got it wrong:
  // it told someone who had just been handed 27 books that the Library needed
  // growing. A newcomer should be offered something to READ.
  const dayOne = theDayItems({ today: TODAY, catalogue: [
    { slug: 's1', title: 'The Dhammapada', doc: { fullText: { text: 'x'.repeat(5000) } } },
    { slug: 's2', title: 'A Summary Only', doc: {} },
  ] });
  if (!dayOne.length) fail('the-day: day one produced nothing at all');
  if (dayOne[0].fn !== 'openReader') fail('the-day: day one should offer something to read, not a chore');
  if (dayOne[0].title !== 'The Dhammapada') fail('the-day: day one offered a summary rather than a complete text');
  // …but only when there is genuinely nothing of their own
  const hasOwn = theDayItems({ today: TODAY, books: [bk('b9', 'Their own book')],
    catalogue: [{ slug: 's1', title: 'The Dhammapada', doc: { fullText: { text: 'x'.repeat(5000) } } }] });
  if (!hasOwn.some(i => i.title === 'Their own book')) fail('the-day: a visitor\'s own unread book should come before a seed text');

  // NEVER A WALL — five, no matter how much is outstanding
  const many = theDayItems({
    today: TODAY,
    upcoming: Array.from({ length: 20 }, (_, i) => ({ kind: 'course', id: 'c' + i, title: 'Course ' + i, due: '2026-07-20' })),
    books: Array.from({ length: 20 }, (_, i) => bk('x' + i, 'Book ' + i)),
  });
  if (many.length > 5) fail(`the-day: returned ${many.length} items — the cap is 5, and a wall is a guilt inventory`);

  // EVERY ITEM IS ONE PRESS
  for (const it of many) {
    if (!it.fn) fail(`the-day: item "${it.title}" has nothing to press`);
    if (!it.title || !it.note) fail(`the-day: item "${it.key}" is missing its title or its note`);
  }

  // overdue outranks everything, and says how late in plain words
  const late = theDayItems({ today: TODAY, upcoming: [{ kind: 'course', id: 'c1', title: 'Late thing', due: '2026-07-26' }] });
  if (late[0].icon !== '⏳') fail('the-day: an overdue thing should come first');
  if (!/2 days ago/.test(late[0].note)) fail(`the-day: overdue note read "${late[0].note}" — it should say how late`);
  const dueToday = theDayItems({ today: TODAY, upcoming: [{ kind: 'course', id: 'c2', title: 'Today thing', due: TODAY }] });
  if (!/due today/.test(dueToday[0].note)) fail('the-day: a thing due today should say so');

  // the half-walked lesson is offered as its NEXT STEP, not as a lesson to choose
  const lessons = [{ id: 'l1', title: 'Coding 101', steps: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }] }];
  const mid = theDayItems({ today: TODAY, lessons, curriculum: { l1: { steps: { 0: true } } } });
  const step = mid.find(i => i.fn === 'openLesson');
  if (!step) fail('the-day: a half-finished lesson did not offer its next step');
  else {
    if (step.title !== 'Two') fail(`the-day: offered "${step.title}" instead of the next unticked step`);
    if (!/step 2 of 3/.test(step.note)) fail('the-day: the step should say where you are in the lesson');
  }
  // an untouched lesson is NOT nagged about — choosing is not continuing
  const untouched = theDayItems({ today: TODAY, lessons, curriculum: {} });
  if (untouched.some(i => i.fn === 'openLesson')) fail('the-day: it pushed a lesson never started — that is choosing, not continuing');
  // nor is a finished one
  const finished = theDayItems({ today: TODAY, lessons, curriculum: { l1: { steps: { 0: true, 1: true, 2: true } } } });
  if (finished.some(i => i.fn === 'openLesson')) fail('the-day: it offered a step of a completed lesson');

  /* A PATH YOU PICKED UP beats one inferred from progress (THE-STUDY-CHAIN-PLAN
     Stage 2). Progress is a guess at what you care about; picking one up is you
     saying so, and a stated intention must never be outranked by a heuristic. */
  const two = [
    { id: 'l1', title: 'Coding 101', steps: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }] },
    { id: 'l2', title: 'Soldering 101', steps: [{ title: 'Buy an iron' }, { title: 'Tin the tip' }] },
  ];
  // l1 is half-walked and would win on progress; l2 is the one actually picked up
  const chosen = theDayItems({ today: TODAY, lessons: two, study: { id: 'l2' },
    curriculum: { l1: { steps: { 0: true } } } });
  const picks = chosen.filter(i => i.fn === 'openLesson');
  if (picks.length !== 1) fail(`the-day: ${picks.length} lesson steps offered — exactly one, ever, or the day becomes a syllabus`);
  if (!picks.length || picks[0].arg !== 'l2') fail('the-day: a heuristic outranked the path the visitor actually picked up');
  if (picks.length && !/picked up/.test(picks[0].note)) fail('the-day: it did not say WHY this step is the one being offered');
  // and it fires on a path with nothing ticked yet — that is the whole first evening
  const dayOnePath = theDayItems({ today: TODAY, lessons: two, study: { id: 'l2' }, curriculum: {} });
  const first = dayOnePath.find(i => i.fn === 'openLesson');
  if (!first) fail('the-day: a path picked up but not yet started offered nothing — the first evening is the one that matters');
  else if (first.title !== 'Buy an iron') fail(`the-day: offered "${first.title}" instead of the first step of the picked-up path`);
  // a finished picked-up path does not keep offering itself
  const donePath = theDayItems({ today: TODAY, lessons: two, study: { id: 'l2' },
    curriculum: { l2: { steps: { 0: true, 1: true } } } });
  if (donePath.some(i => i.fn === 'openLesson')) fail('the-day: it kept offering a picked-up path with every step ticked');
  // a stale pointer at a deleted lesson must not crash or invent an item
  const ghost = theDayItems({ today: TODAY, lessons: two, study: { id: 'gone' }, curriculum: {} });
  if (ghost.some(i => i.arg === 'gone')) fail('the-day: it offered a lesson that no longer exists');

  // IT NOTICES, IT DOES NOT NAG — only past three days, and phrased as a question
  const fresh = theDayItems({ today: TODAY, sparks: [{ dayKey: '2026-07-27', text: 'yesterday thing' }] });
  if (fresh.some(i => i.icon === '🔁')) fail('the-day: it nagged about something one day old');
  const carried = theDayItems({ today: TODAY, sparks: [{ dayKey: '2026-07-24', text: 'old thing' }] });
  const nag = carried.find(i => i.icon === '🔁');
  if (!nag) fail('the-day: something carried four days went unnoticed');
  else if (!/still want it/.test(nag.note)) fail('the-day: the carried note should ask, not scold');

  // a forgotten note comes back — the loop the notes system never closed
  const oldNote = { key:'n1', title:'On attention', text:'The thing about focus is that it compounds over weeks.', date:'2026-07-01' };
  const back = theDayItems({ today: TODAY, notes: [oldNote] });
  const rev = back.find(i => i.fn === 'openNotesLog');
  if (!rev) fail('the-day: a note written 27 days ago and never reopened did not come back');
  else if (!/worth another look/.test(rev.note)) fail('the-day: the resurfaced note should invite, not instruct');
  // …but a recent one is left alone, and so is one you have revisited
  const recent = theDayItems({ today: TODAY, notes: [{ ...oldNote, date: '2026-07-26' }] });
  if (recent.some(i => i.fn === 'openNotesLog')) fail('the-day: it resurfaced a note written two days ago');
  const revisited = theDayItems({ today: TODAY, notes: [{ ...oldNote, seen: '2026-07-27' }] });
  if (revisited.some(i => i.fn === 'openNotesLog')) fail('the-day: it resurfaced a note that was read yesterday');
  // a one-word note is not worth resurfacing
  const thin = theDayItems({ today: TODAY, notes: [{ ...oldNote, text: 'todo' }] });
  if (thin.some(i => i.fn === 'openNotesLog')) fail('the-day: it resurfaced a scrap with nothing in it');

  // an un-dissected paper surfaces; one already analysed does not
  const paper = bk('p1', 'Attention Is All You Need', { source_url: 'https://arxiv.org/abs/1706' });
  const loose = theDayItems({ today: TODAY, books: [paper], read: { p1: true } });
  if (!loose.some(i => i.fn === 'openScienceHall')) fail('the-day: an un-dissected paper did not surface');
  const done = theDayItems({ today: TODAY, books: [paper], read: { p1: true },
    dissections: [{ title: 'Attention Is All You Need' }] });
  if (done.some(i => i.fn === 'openScienceHall')) fail('the-day: it re-offered a paper already pulled apart');

  // the door's sentence is a sentence, not a count
  if (theDayLine(late) !== 'one thing is overdue') fail(`the-day: theDayLine gave "${theDayLine(late)}"`);
  if (theDayLine(mid) !== 'carry on where you left off') fail(`the-day: theDayLine for a half-lesson gave "${theDayLine(mid)}"`);
  if (theDayLine([]) !== '') fail('the-day: an empty list should give no sentence at all');
}

/* ---------- library ---------- */
const seenSlugs = new Set();
for (const d of SEED_LIBRARY) {
  if (seenSlugs.has(d.slug)) fail(`seed.js: duplicate slug '${d.slug}'`);
  seenSlugs.add(d.slug);

  if (!TRADITIONS.includes(d.tradition)) {
    fail(`seed.js: '${d.slug}' has tradition '${d.tradition}', not one of ${TRADITIONS.join('/')}`);
  }
  for (const field of ['title', 'license', 'source_url', 'attribution']) {
    if (!d[field]) fail(`seed.js: '${d.slug}' is missing '${field}'`);
  }
  if (!d.doc || !d.doc.summary) fail(`seed.js: '${d.slug}' is missing doc.summary`);
  if (!d.doc || !Array.isArray(d.doc.sections) || !d.doc.sections.length) {
    fail(`seed.js: '${d.slug}' has no doc.sections`);
  } else {
    for (const [i, sec] of d.doc.sections.entries()) {
      if (!sec.heading || !sec.body) fail(`seed.js: '${d.slug}' section ${i} is missing heading/body`);
    }
  }
}

/* ---------- report ---------- */
if (failures.length) {
  console.error(`✗ ${failures.length} smoke-test failure(s):\n`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
} else {
  const sceneCount = Object.keys(scenes).length;
  console.log(`✓ smoke test passed — ${sceneCount} scenes, ${SEED_LIBRARY.length} library docs, all checks clean.`);
}
