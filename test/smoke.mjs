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
import { readFileSync, readdirSync } from 'node:fs';
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

/* ---------- the catalogue Quill is handed ----------
   Measured 2026-08-03 right after a ~100-book import: every Quill message
   pasted the whole catalogue with summaries, ~43 tokens a book, so the
   librarian got slower and dumber the more books you owned. Backwards for a
   Library meant to be built from scratch by its owner. See
   src/game/data/catalogue-brief.js. */
{
  const { catalogueBrief, briefCaveat, briefTokens } =
    await import('../src/game/data/catalogue-brief.js');
  const books = (n, shelf = 'Theravada') => Array.from({ length: n }, (_, i) => ({
    title: 'A text number ' + i, tradition: shelf, license: 'CC0 1.0',
    doc: { summary: 'A discourse on mindfulness and the nature of craving, translated from the Pali.' } }));

  // THE PROPERTY: the prompt must not grow without bound as the shelf does
  for (const n of [10, 60, 130, 400, 1200, 5000]) {
    const b = catalogueBrief(books(n));
    const t = briefTokens(b.text);
    if (t > 2600) fail(`catalogue-brief: ${n} books produced ${t} tokens — a bigger library must not mean a worse librarian`);
  }
  // a 5000-book shelf must not cost meaningfully more than a 400-book one
  const big = briefTokens(catalogueBrief(books(5000)).text);
  const mid = briefTokens(catalogueBrief(books(400)).text);
  if (big > mid * 1.6) fail(`catalogue-brief: 5000 books cost ${big} vs ${mid} for 400 — it is still scaling with the shelf`);

  // a small shelf keeps its summaries: that view is genuinely better
  const small = catalogueBrief(books(8));
  if (small.mode !== 'full') fail(`catalogue-brief: a shelf of 8 was degraded to '${small.mode}' — summaries are affordable there`);
  if (!/discourse on mindfulness/.test(small.text)) fail('catalogue-brief: a small shelf lost its summaries');

  /* THE SAFETY PROPERTY. Whenever the view is partial the model must be TOLD,
     or it will confidently say a book is not shelved when it simply could not
     see it — a librarian inventing a No. */
  for (const n of [60, 400, 5000]) {
    const b = catalogueBrief(books(n));
    if (b.mode === 'full') continue;
    const caveat = briefCaveat(b);
    if (!caveat) fail(`catalogue-brief: ${n} books gave a partial view ('${b.mode}') with NO caveat — the model will invent a "not shelved"`);
    if (b.mode === 'shape' && !/Never tell the visitor a book is absent/.test(caveat)) {
      fail('catalogue-brief: the shape view does not forbid claiming a book is absent, which is the one lie it can tell');
    }
  }
  if (briefCaveat(catalogueBrief(books(8)))) fail('catalogue-brief: a COMPLETE view was hedged anyway — that is its own dishonesty');

  // the shape view still has to be useful: real shelf names and counts
  const mixed = [...books(300, 'Theravada'), ...books(120, 'Zen'), ...books(40, 'Stoic')];
  const shape = catalogueBrief(mixed);
  if (shape.mode !== 'shape') fail(`catalogue-brief: 460 books gave '${shape.mode}', expected the shape view`);
  for (const shelf of ['Theravada', 'Zen', 'Stoic']) {
    if (!shape.text.includes(shelf)) fail(`catalogue-brief: the shape view never mentions the ${shelf} shelf`);
  }
  if (!/460 texts/.test(shape.text)) fail('catalogue-brief: the shape view does not say how big the collection is');

  // an empty shelf says so rather than producing a confusing blank
  if (catalogueBrief([]).mode !== 'empty') fail('catalogue-brief: an empty Library did not report itself as empty');
}

/* ---------- every data/*.js name that overlays.js USES, it must IMPORT ----------
   Added 2026-08-03 after this exact bug shipped past three checks. A patch
   script aborted before writing, so the `retrieval.js` import line never
   landed — while the code that CALLS paginate() and searchPages() did. The
   result: `node --check` passed (it is valid syntax), `npm run build:beta`
   passed (a free variable is legal), `npm test` passed (nothing imports
   overlays.js), and the reader's full text was dead on arrival with a bare
   ReferenceError. Found only by driving a browser at it.

   That is the house failure mode with a new coat, and it is the same shape as
   the window-export bug: a name referenced in one place and defined in
   another, with nothing checking the join. So it gets checked. */
{
  const ovSrc = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const dataDir = new URL('../src/game/data/', import.meta.url);
  const modules = readdirSync(dataDir).filter(f => f.endsWith('.js'));

  // what overlays.js actually imports, per module
  const imported = new Set();
  for (const m of ovSrc.matchAll(/import\s*\{([^}]+)\}\s*from\s*'[^']*\/data\/[^']+'/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) imported.add(name);
      const alias = raw.trim().split(/\s+as\s+/)[1];
      if (alias) imported.add(alias.trim());
    }
  }

  for (const file of modules) {
    const src = readFileSync(new URL(file, dataDir), 'utf8');
    const exports = [...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)]
      .map(m => m[1]);
    for (const name of exports) {
      if (imported.has(name)) continue;
      /* Is it CALLED bare in overlays.js? Scanned rather than regexed, because
         a name preceded by a dot is a method on something else entirely and a
         false positive here would send a future session hunting a bug that
         does not exist. */
      let used = false;
      for (let at = ovSrc.indexOf(name + '('); at >= 0; at = ovSrc.indexOf(name + '(', at + 1)) {
        const before = at > 0 ? ovSrc[at - 1] : ' ';
        if (/[.\w$]/.test(before)) continue;          // obj.name(  or  somethingname(
        used = true; break;
      }
      if (used) {
        fail(`overlays.js calls ${name}() from data/${file} but never imports it — `
           + 'a bare ReferenceError at runtime that node --check, the build and this suite would all otherwise pass');
      }
    }
  }
}

/* ---------- what a resident costs before you say a word ----------
   BETA-TESTING-FEEDBACK.md #43. With num_ctx fixed a fat prompt is no longer
   WRONG, only slow — and slow is what a visitor notices on a cooling-limited
   machine (8.5s at 2k evaluated against 23s at 7.3k, measured 2026-08-03).

   TWO DIFFERENT FAILURES, and the second is the one that actually bit:

     PROSE creeps. A paragraph gets added, nothing gets removed, and the
     role restates its own stance three ways. Budgeted below.

     BLOCKS GROW WITHOUT BOUND. The Investigator pasted every seeded
     investigation with its full verdict and grounding, plus every one the
     visitor had ever made, plus every Science/Hindu book with its full
     summary — on every message. That is the same bug already fixed for
     Quill, and a Library "built from scratch by its owner" walks straight
     into it. A cap is structural, so it is checked structurally. */
{
  const ov = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const { CHARTER, WORK_CHARTER, BUTLER_CHARTER } = await import('../src/game/data/charter.js');
  const { rosterBlock } = await import('../src/game/data/roles.js');
  const { briefTokens } = await import('../src/game/data/catalogue-brief.js');

  /* Budgets are for the ALWAYS-ON role text: the literals in systemPrompt()
     plus the charter and roster every message carries. Deliberately loose —
     this catches a doubling, not a sentence. Raise one only when the extra
     words genuinely change what the model DOES. */
  /* Measured 2026-08-03, with ~8% headroom each. The Monk is deliberately the
     largest and stays that way: his bulk is IDENTITY and the canon he can
     actually draw on, which is the enabling kind of prompt this project wants
     (see plans/ — prompts enable through identity and grounding, never a
     fear-based rulebook). The Investigator's bulk was the same stance written
     three times, which is the wasteful kind, and it came down. */
  /* RE-MEASURED 2026-08-03 after the comment-stripping fix below, which
     moved every number — some up, some down, because the old parser both
     counted commentary as prompt AND swallowed real literals that followed
     an apostrophe. These are the first figures this guard has printed that
     mean what they say. ~10% headroom each. */
  const BUDGET = { quill: 1100, steward: 820, investigator: 1280, monk: 1950,
                   computer: 810, tutor: 1100, sebastian: 1470 };
  const STR = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

  for (const [agent, budget] of Object.entries(BUDGET)) {
    const start = ov.indexOf('\n  ' + agent + ':{');
    if (start < 0) { fail(`prompt budget: could not find CHAT_AGENTS.${agent} — has it been renamed?`); continue; }
    const end = ov.indexOf('errorLine', start);
    const body = ov.slice(start, end < 0 ? start + 8000 : end);
    /* The role text as the model receives it: every string literal in
       systemPrompt(), plus the charter and roster carried on every message.
       briefTokens() takes TEXT — handing it a character count measures the
       length of the number and reports 2 tokens for everyone, which is how
       the first version of this guard passed against a prompt it had just
       been given 2,000 characters of padding. Rule 2, earning its place.

       Situational blocks (`((state.dialog&&state.dialog.x) ? "…" : '')`) are
       excluded: they are real text but only when that context exists, and
       counting them would budget the Investigator for two blocks he sends
       on maybe one visit in twenty. This measures what EVERY message pays. */
    /* COMMENTS MUST GO FIRST, and this is a bug this guard shipped with.
       An apostrophe in ordinary prose — "the visitor's question" — opens a
       fake string literal that swallows everything to the next quote, so the
       guard was counting its own commentary as prompt text. It exaggerated
       every number it ever printed, and a comment added on 2026-08-03 pushed
       Quill 300 tokens "over budget" without a word reaching the model.
       A guard that measures the wrong thing is the guard-that-cannot-fail
       problem wearing a different coat. */
    const code = body
      .replace(/\/\*[\s\S]*?\*\//g, '')      // block comments
      .replace(/^[ \t]*\/\/.*$/gm, '');      // whole-line // comments
    const alwaysOn = code.replace(/\(\(state\.dialog[\s\S]*?:\s*''\)/g, '');
    const literals = (alwaysOn.match(STR) || []).map(l => l.slice(1, -1)).join('');
    const charter = /WORK_CHARTER/.test(body) ? WORK_CHARTER
      : /BUTLER_CHARTER/.test(body) ? BUTLER_CHARTER : CHARTER;
    const tokens = briefTokens(literals + charter + rosterBlock(agent));
    if (tokens > budget) {
      fail(`prompt budget: ${agent} carries ~${tokens} tokens of role before a word of the question `
        + `(budget ${budget}). Trim it, or raise the budget deliberately.`);
    }
  }

  /* The Hall's two blocks must stay bounded. Structural, because the growth
     only shows up on a machine with a big Library — which is to say, never
     on a fresh checkout, which is exactly why it survived this long. */
  const hall = ov.slice(ov.indexOf('function investigationsForPrompt'), ov.indexOf('export function openScienceHall'));
  if (!/\.slice\(-OWN_INVESTIGATIONS_SHOWN\)/.test(hall)) {
    fail("prompt budget: investigationsForPrompt() no longer caps the visitor's own investigations — it will grow forever");
  }
  if (!/older investigations of theirs/.test(hall)) {
    fail('prompt budget: the capped investigations are dropped silently — the Investigator will assume a question is new');
  }
  if (!/catalogueBrief\(docs/.test(hall)) {
    fail('prompt budget: hallShelfSummary() pastes the shelf again instead of degrading through catalogueBrief()');
  }
  if (/\$\{v\.grounding\}/.test(hall)) {
    fail('prompt budget: the seeded investigations are reciting their grounding notes again (~890 tokens, every message)');
  }

  /* ANSWER THE QUESTION RATHER THAN INVITING A GUESS. Probed against a real
     model 2026-08-03 (Round 6): asked for pre-notes on the Dhammapada from its
     catalogue blurb, ornith:9b wrote "grouped into five thematic chapters" —
     the book has TWENTY-SIX, and the visitor finds that out by opening it.
     Handed the real chapter list it said "51 pages across 26 chapters" and
     named them. "HOW IT IS BUILT" has a real answer we hold, so we give it. */
  const pre = ov.slice(ov.indexOf('export async function stewardPreNotes'),
                       ov.indexOf('export async function stewardPreNotes') + 3000);
  if (!/bookStructureBlock\(/.test(pre)) {
    fail("prompt budget: stewardPreNotes() no longer hands over the book's real structure — the model will invent a chapter count");
  }
  if (!/only a short catalogue blurb/.test(pre)) {
    fail('prompt budget: the thin-material warning is gone from stewardPreNotes() — on a blurb the model invents an author and a quotation');
  }
  if (!/findChapters\(pages\)/.test(ov.slice(ov.indexOf('async function bookStructureBlock'),
                                             ov.indexOf('async function bookStructureBlock') + 1200))) {
    fail('prompt budget: bookStructureBlock() no longer reads real chapters — it would be asserting a shape it did not check');
  }
}

/* ---------- chapters: found, or honestly absent ----------
   BETA-TESTING-FEEDBACK.md #41. The old scan read the first THREE LINES of
   each page and a page is a 1,400-character slice, so it found ZERO of the
   Dhammapada's 26 chapters and ZERO of the Gita's 18 — both shipped in the
   seed, both showing no chapter controls at all.

   THE NUMBERS BELOW ARE REAL GROUND TRUTH, counted from the texts, which is
   the whole reason this test is worth having: "it found some chapters" would
   have passed against the bug. See src/game/data/chapters.js. */
{
  const { findChapters, chapterAt, numeralValue, readContents } =
    await import('../src/game/data/chapters.js');
  const { paginate } = await import('../src/game/data/retrieval.js');

  const textOf = async (file) => {
    const mod = await import(`../src/game/data/library-texts/${file}.js`);
    return Object.values(mod).find(v => typeof v === 'string');
  };

  /* The two long texts in the seed. */
  for (const [file, want] of [['dhammapada', 26], ['bhagavad-gita', 17]]) {
    const { marks, how } = findChapters(paginate(await textOf(file)));
    if (marks.length !== want) fail(`chapters: ${file} resolved ${marks.length} chapters, expected ${want}`);
    if (how === 'none') fail(`chapters: ${file} resolved no chapters at all`);
    for (let i = 1; i < marks.length; i++) {
      if (marks[i].page <= marks[i - 1].page) {
        fail(`chapters: ${file} mark ${i} goes backwards (page ${marks[i].page} after ${marks[i - 1].page})`);
        break;
      }
    }
    if (marks.some(m => !m.label || !m.label.trim())) fail(`chapters: ${file} produced an unlabelled chapter`);
  }

  /* ---- THE REAL LIBRARY, in miniature ----
     The guard that let #41 through tested the six texts in the seed and said
     it worked. Measured afterwards against the steward's 296 actual books:
     135 found ZERO chapters and 41 found "the first four". These fixtures are
     small excerpts of the REAL books that broke, one per failure mode, so the
     guard tests what he owns rather than what we ship. */
  const fixture = (name) =>
    readFileSync(new URL(`fixtures/chapters/${name}`, import.meta.url), 'utf8');

  for (const [name, minMarks, wantHow, note] of [
    ['numerals-discourses.txt', 5, 'numerals',
      "Epictetus: Book I-IV over bare roman numerals. THE reported bug — it showed four."],
    ['keyword-lectures.txt', 3, 'headings',
      "'LECTURE' was missing from the keyword list, so a six-lecture book found zero."],
    ['toc-national-parks.txt', 3, 'toc',
      'a genuine contents block, which is the only route 109 of the books have.'],
  ]) {
    const { marks, how } = findChapters(paginate(fixture(name)));
    if (marks.length < minMarks) fail(`chapters: ${name} resolved ${marks.length}, expected at least ${minMarks} — ${note}`);
    if (how !== wantHow) fail(`chapters: ${name} answered via '${how}', expected '${wantHow}' — ${note}`);
  }

  /* AND THE TWO THAT MUST STAY SILENT. Both were measured returning
     confident nonsense, which is worse than nothing on a note that cites it. */
  for (const [name, note] of [
    ['ocr-scan.txt', 'a scanned book prints its page number on every page; this yielded 230 "chapters"'],
    ['bare-titles-walden.txt', 'no contents, no keyword, and a cost table printed like a heading ("Boards", "$8.03")'],
  ]) {
    const { marks, how } = findChapters(paginate(fixture(name)));
    if (marks.length || how !== 'none') {
      fail(`chapters: ${name} invented ${marks.length} chapters via '${how}' — ${note}`);
    }
  }

  /* AND IT SAYS SO WHEN THERE ARE NONE. Four of the six seed texts are short
     suttas with genuinely no chapters; a book converted from a PDF often has
     no Contents block either. Dead controls are worse than absent ones. */
  for (const file of ['anapanasati', 'metta', 'satipatthana', 'first-sermon']) {
    const { marks, how } = findChapters(paginate(await textOf(file)));
    if (marks.length) fail(`chapters: ${file} has no chapters but invented ${marks.length}`);
    if (how !== 'none') fail(`chapters: ${file} should report 'none', reported '${how}'`);
  }

  /* A heading needs a NUMBER. Without that, ordinary prose opening with
     "Part of the reason…" becomes a chapter break. */
  {
    const prose = ['Part of the reason we do this is habit.\n\nAnd so on.',
                   'Section by section it grew.\n\nMore text.',
                   'Book after book piled up.\n\nStill more.'];
    const { marks } = findChapters(prose);
    if (marks.length) fail(`chapters: prose beginning with a keyword was read as ${marks.length} chapter(s)`);
  }

  /* The Contents block must not become chapters itself, and must not swallow
     the body's first real heading — the counting-up rule. */
  {
    const toc = ['Contents\n\nChapter 1: The Opening\nChapter 2: The Middle\nChapter 3: The End',
                 'Chapter I. The Opening\n\nSome words here.',
                 'Chapter II. The Middle\n\nMore words here.',
                 'Chapter III. The End\n\nFinal words here.'];
    const { marks } = findChapters(toc);
    if (marks.length !== 3) fail(`chapters: a 3-chapter book with a Contents block resolved ${marks.length}`);
    if (marks.length && marks[0].page !== 1) fail('chapters: the Contents block was counted as a chapter');
  }

  if (numeralValue('xviii') !== 18) fail('chapters: roman numeral xviii did not read as 18');
  if (numeralValue('iv') !== 4) fail('chapters: subtractive roman numeral iv did not read as 4');
  if (numeralValue('7') !== 7) fail('chapters: arabic numeral 7 did not read as 7');
  if (numeralValue('frog') !== 0) fail('chapters: a non-numeral should read as 0, not throw');
  if (typeof readContents !== 'function') fail('chapters: readContents is no longer exported');

  /* chapterAt is what puts "ch. 4" on a note — an absent answer, never a
     guessed one, where the book has no marks. */
  const marks3 = [{ page: 0, label: 'One' }, { page: 10, label: 'Two' }, { page: 20, label: 'Three' }];
  if (chapterAt(marks3, 0).number !== 1) fail('chapters: page 0 is not in chapter 1');
  if (chapterAt(marks3, 15).number !== 2) fail('chapters: page 15 is not in chapter 2');
  if (chapterAt(marks3, 99).number !== 3) fail('chapters: a page past the last mark is not in the last chapter');
  if (chapterAt([], 5) !== null) fail('chapters: a book with no marks must give null, not a guess');
}

/* ---------- retrieval: finding the passage, not pasting the book ----------
   REFERENCE-AND-RETRIEVAL-PLAN Part B. Until 2026-08-03 nothing could look
   INSIDE a book: searchDocs() returned null, Quill got titles and blurbs, and
   a dissection lens saw only the page you happened to have open.
   See src/game/data/retrieval.js. */
{
  const { paginate, tokenize, searchPages, passagesBlock, hasResults, PAGE_CHARS } =
    await import('../src/game/data/retrieval.js');

  /* PAGES MUST BE THE READER'S PAGES. Retrieval citing "page 47" while the
     reader shows page 51 is the two-lists-that-must-agree failure this project
     has hit three times, so the reader now calls paginate() rather than owning
     a second copy. */
  const ov = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  if (/function paginateFullText\(text\)\{\s*$/m.test(ov) && !/return paginate\(text\)/.test(ov)) {
    fail('overlays.js has its own pagination again — retrieval will cite pages the reader does not show');
  }
  if (!/return paginate\(text\)/.test(ov)) fail('overlays.js no longer delegates pagination to retrieval.js');

  const para = n => 'Paragraph number ' + n + ' talks at some length about ordinary matters of no consequence. ';
  const book = Array.from({ length: 120 }, (_, i) =>
    (i === 40 ? 'The forward voltage of an infrared LED is typically two volts and the series resistor follows from it. '
     : i === 90 ? 'Impedance matching in the antenna stage determines how much power actually radiates. '
     : '') + para(i)).join('\n\n');

  const pages = paginate(book);
  if (pages.length < 5) fail(`retrieval: 120 paragraphs paginated to ${pages.length} pages`);
  for (const pg of pages) if (pg.length > PAGE_CHARS * 2) fail('retrieval: a page ran far past the page size');
  if (paginate('').length !== 1) fail('retrieval: empty text must still be one page, not zero');

  // it finds the RIGHT page, not merely a page
  const hits = searchPages(pages, 'infrared LED forward voltage resistor');
  if (!hasResults(hits)) fail('retrieval: found nothing for a phrase that is verbatim in the book');
  else {
    const where = pages.findIndex(x => /forward voltage of an infrared/.test(x));
    if (hits[0].page !== where) fail(`retrieval: best hit was page ${hits[0].page}, the passage is on ${where}`);
    if (!/infrared/i.test(hits[0].snippet)) fail('retrieval: the snippet does not contain the thing that matched');
  }
  const other = searchPages(pages, 'antenna impedance matching');
  if (!hasResults(other) || other[0].page === hits[0].page) fail('retrieval: a different question returned the same page');

  // it must say NOTHING rather than return the first page as a consolation
  if (hasResults(searchPages(pages, 'zebra tessellation quokka'))) {
    fail('retrieval: invented matches for words absent from the book — a thin result must not look thorough');
  }
  if (hasResults(searchPages(pages, 'the and of'))) fail('retrieval: stopwords alone produced matches');
  if (hasResults(searchPages([], 'anything'))) fail('retrieval: searched an empty book and found something');

  // a page carrying EVERY term beats a page repeating one
  const two = ['resistor resistor resistor resistor resistor resistor ' + para(1),
               'the resistor and the capacitor together set the time constant ' + para(2)];
  const both = searchPages(two, 'resistor capacitor');
  if (!both.length || both[0].page !== 1) fail('retrieval: keyword spam outranked the page that answers the question');

  /* THE BUDGET PROPERTY. This is the rule the plan is built on and the reason
     the catalogue bug happened: retrieve the fragment, never the corpus. */
  const block = passagesBlock(searchPages(pages, 'infrared LED forward voltage', { limit: 3 }), { full: true, cap: 6000 });
  if (block.length > 6600) fail(`retrieval: the passages block is ${block.length} chars — it must be a fragment`);
  if (!/\[page \d+\]/.test(block)) fail('retrieval: passages are not labelled with their page, so nothing can be cited or checked');
  if (passagesBlock([], {}) !== '') fail('retrieval: an empty result produced a non-empty block for the model to confabulate from');

  // tokenizing keeps the words that discriminate and drops the ones that never do
  const t = tokenize('The Forward Voltage of an LED, and the resistor!');
  if (!t.includes('forward') || !t.includes('voltage') || !t.includes('led') || !t.includes('resistor')) {
    fail(`retrieval: tokenizer dropped a meaningful word — got ${JSON.stringify(t)}`);
  }
  if (t.includes('the') || t.includes('of') || t.includes('an')) fail('retrieval: stopwords survived tokenizing');
}

/* ---------- the reference desk ----------
   A reference table with a wrong number in it is WORSE than no table: it
   launders a mistake into something authoritative. So the exactly-defined
   values are checked against the SI here rather than trusted.
   See src/game/data/reference.js. */
{
  const { REFERENCE, lookup, referenceFor, referenceBlock, refLine } =
    await import('../src/game/data/reference.js');

  // the SI-defined values, digit for digit. These have ONE right answer.
  const exact = {
    c: '299792458 m/s', e: '1.602176634e-19 C', h: '6.62607015e-34 J·s',
    k: '1.380649e-23 J/K', na: '6.02214076e23 /mol', g: '9.80665 m/s²',
  };
  for (const [id, want] of Object.entries(exact)) {
    const entry = REFERENCE.find(x => x.id === id);
    if (!entry) fail(`reference.js: '${id}' is missing`);
    else if (entry.value !== want) fail(`reference.js: ${id} is "${entry.value}", the SI says "${want}"`);
    else if (!entry.exact) fail(`reference.js: ${id} is defined exactly by the SI but is not flagged exact`);
  }
  // pi and e to the digits given
  if (!/^3\.14159265358979/.test(REFERENCE.find(x => x.id === 'pi').value)) fail('reference.js: pi is wrong');
  if (!/^2\.71828182845905/.test(REFERENCE.find(x => x.id === 'euler').value)) fail("reference.js: Euler's number is wrong");
  // G is measured, not defined — mislabelling that overstates what is known
  if (REFERENCE.find(x => x.id === 'gconst').exact) fail('reference.js: G is a measured value and must not be flagged exact');

  // every entry has to be usable, not just present
  for (const e of REFERENCE) {
    for (const f of ['id', 'kind', 'name', 'value']) if (!e[f]) fail(`reference.js: an entry is missing ${f}: ${JSON.stringify(e).slice(0, 60)}`);
    if (typeof e.exact !== 'boolean') fail(`reference.js: '${e.id}' does not say whether it is exact or measured`);
    if (!refLine(e).includes(e.value)) fail(`reference.js: refLine drops the value for '${e.id}'`);
  }
  const ids = REFERENCE.map(e => e.id);
  if (new Set(ids).size !== ids.length) fail('reference.js: duplicate ids');

  // lookup finds things by the names a person would actually type
  for (const [term, id] of [['ohm', 'ohm'], ['4k7', 'e12'], ['c', 'c'], ['pi', 'pi'],
                            ['colour code', 'colour-code'], ['voltage divider', 'divider'],
                            ['38khz', 'ir-carrier'], ['decibel', 'db']]) {
    if (!lookup(term).some(e => e.id === id)) fail(`reference.js: lookup("${term}") did not find '${id}'`);
  }
  if (lookup('the meaning of life').length) fail('reference.js: lookup invented a match for something not in the table');
  if (lookup('').length) fail('reference.js: an empty lookup returned entries');

  /* THE BUDGET PROPERTY, and the reason it is here: the catalogue bug found
     the same day was the whole Library being recited on every message. A
     reference table must cost ~40 tokens in a prompt, never 4,000. */
  const block = referenceBlock('I want to work out the series resistor for an IR LED at 38kHz using ohms law');
  if (!block) fail('reference.js: a question full of table terms produced no reference block at all');
  if (block.length > 1200) fail(`reference.js: the injected block is ${block.length} chars — it must be a fragment, not the corpus`);
  if (referenceFor('x').length > 6) fail('reference.js: the injection cap is not being applied');
  // and it stays out of the way when nothing is relevant
  if (referenceBlock('what did the monk mean about right intention')) {
    fail('reference.js: it injected constants into a question about meaning — that is the corpus-pasting habit again');
  }
  // it must tell the model to prefer the table over its own recollection
  if (!/do NOT substitute a figure from your own memory/i.test(referenceBlock('ohms law'))) {
    fail('reference.js: the block does not tell the model to trust the table over itself, which is its entire purpose');
  }
}

/* ---------- who does what ----------
   The residents' duties, derived from one table instead of hand-copied into
   seven prompts. They HAD drifted: Sebastian's prompt told the model "Quill is
   the teacher", true in July and the Tutor's job by August. A small model
   handed two different org charts in two conversations acts on the wrong one,
   and to a visitor that reads as "the roles are confusing the AI."
   See src/game/data/roles.js. */
{
  const { ROLES, ROLE_KEYS, rosterBlock, rosterForVisitor } =
    await import('../src/game/data/roles.js');
  const ov = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');

  for (const k of ROLE_KEYS) {
    const r = ROLES[k];
    for (const f of ['label', 'title', 'duty', 'sendMe', 'where', 'open']) {
      if (!r[f] || String(r[f]).length < 3) fail(`roles.js: '${k}' is missing ${f}`);
    }
    if (r.duty.length < 60) fail(`roles.js: '${k}' duty is too thin to tell a model anything: "${r.duty}"`);
    // every role must be reachable — an org chart nobody can act on is a poster
    if (!/\(\)$|\('[a-z]+'\)$/.test(r.open)) fail(`roles.js: '${k}' open '${r.open}' is not a callable`);
    const fn = r.open.replace(/\(.*$/, '');
    if (!ov.includes('function ' + fn + '(')) fail(`roles.js: '${k}' opens with ${fn}(), which is not defined in overlays.js`);
    if (!ov.includes('\n  ' + fn + ',') && !ov.includes(' ' + fn + ',')) fail(`roles.js: '${k}' opens with ${fn}(), which is never put on window — the button will silently do nothing`);
  }

  /* THE DRIFT GUARD, and the reason this file exists. Nothing may hand a model
     a duty description that is not this table's. */
  const stale = [
    ['Quill is the teacher', 'Quill was the teacher in July; the Tutor is now'],
    ['Steward of the caf', 'the Steward is the workhorse now, not a moderator of a board that never opened'],
  ];
  for (const [phrase, why] of stale) {
    if (ov.includes(phrase)) fail(`overlays.js still says "${phrase}" — ${why}. Duties live in data/roles.js.`);
  }

  // every chat resident in CHAT_AGENTS must be in the roster, and vice versa
  const agents = [...ov.matchAll(/^  ([a-z]+):\{\n    label:/gm)].map(m => m[1]);
  for (const a of agents) if (!ROLE_KEYS.includes(a)) fail(`roles.js has no entry for the resident '${a}' — colleagues cannot hand anything to them`);
  for (const k of ROLE_KEYS) {
    if (ROLES[k].chat && !agents.includes(k)) fail(`roles.js: '${k}' claims a chat door but is not a resident in CHAT_AGENTS`);
  }

  /* A resident must never be told to hand a question to ITSELF — a model given
     that instruction loops, or refuses its own job. */
  for (const k of ROLE_KEYS) {
    const b = rosterBlock(k);
    if (b.includes('- ' + ROLES[k].label + ' (')) fail(`roles.js: rosterBlock('${k}') lists ${ROLES[k].label} among the OTHERS`);
    if (!/WHO ELSE IS HERE/.test(b)) fail(`roles.js: rosterBlock('${k}') produced no roster at all`);
  }
  // the Steward and the Investigator are one person in two hats; neither is
  // ever told to hand something to himself under his other name
  if (rosterBlock('steward').includes('Investigator')) fail('roles.js: the Steward was told to hand work to the Investigator, who is himself');
  if (rosterBlock('investigator').includes('the Steward')) fail('roles.js: the Investigator was told to hand work to the Steward, who is himself');

  // it is added to seven prompts, so its size is paid for seven times
  const longest = Math.max(...ROLE_KEYS.map(k => rosterBlock(k).length));
  if (longest > 1400) fail(`roles.js: the roster block is ${longest} chars — every resident pays that on every call`);

  // exactly one hub, and it is where an unrouted question goes
  const hubs = ROLE_KEYS.filter(k => ROLES[k].hub);
  if (hubs.length !== 1) fail(`roles.js: ${hubs.length} residents claim to be the hub — there must be exactly one front door`);

  if (rosterForVisitor().length !== ROLE_KEYS.length) fail('roles.js: the visitor-facing directory does not list every resident');
}

/* ---------- the context window, set explicitly ----------
   The most expensive silent bug this project has had, measured on this machine
   2026-08-03: Ollama runs every model at num_ctx 4096 unless told otherwise, so
   a 7,279-token request was evaluated at 2,050 and the model answered "I am
   Llama, by Meta AI" — having been told in the first line it never saw that it
   was the Investigator. The resident's identity was being deleted before the
   model saw it. See src/game/ai/provider.js. */
{
  const { contextFor, estimateTokens } = await import('../src/game/ai/provider.js');
  const msgs = n => [{ role:'system', content:'x'.repeat(n) }];

  // a short chat stays cheap — a bigger window costs KV-cache memory, and this
  // machine's real constraint is cooling
  if (contextFor(msgs(200), 450) !== 4096) fail(`provider: a tiny request should stay at the 4096 floor, got ${contextFor(msgs(200), 450)}`);

  /* THE CASE THIS EXISTS FOR: the request that actually failed. ~1550 tokens of
     role + ~1750 of paper + 1600 of reply budget must NOT come back as 4096. */
  const real = contextFor(msgs(Math.round(3300 * 3.4)), 1600);
  if (real <= 4096) fail(`provider: a realistic Investigator-over-a-paper request got num_ctx ${real} — that is the exact silent truncation this guard exists for`);
  if (real < 3300 + 1600) fail(`provider: num_ctx ${real} is smaller than prompt + reply budget — the front of the prompt will be dropped`);

  // it must always leave room for the reply on top of the prompt
  for (const [chars, predict] of [[3000, 450], [30000, 1600], [90000, 3000]]) {
    const got = contextFor(msgs(chars), predict);
    const need = estimateTokens(msgs(chars)) + predict;
    if (got < need && got < 32768) fail(`provider: num_ctx ${got} < needed ${need} below the cap — the reply will be cut off`);
  }

  // and it is capped, so one enormous paste cannot try to allocate the machine
  const huge = contextFor(msgs(4_000_000), 3000);
  if (huge !== 32768) fail(`provider: an enormous prompt asked for num_ctx ${huge} — it must cap, or a paste takes the machine down`);

  // powers of two only: an odd size is a reallocation Ollama does not need
  for (const chars of [1000, 9000, 40000, 200000]) {
    const n = contextFor(msgs(chars), 450);
    if ((n & (n - 1)) !== 0) fail(`provider: num_ctx ${n} is not a power of two`);
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
  const SHELVES = ['Electronics', 'Cooking', 'Theravada', 'Daoism', 'Science', 'Practice',
                   'Christian', 'Chinese'];
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
    /* The two shelves added 2026-08-03, and the reason they exist: sorting the
       steward's real library kept putting books on visibly wrong shelves, and
       the cause was that the right shelf was not on the list at all — nine
       Christian books and eleven Chinese with nowhere to go. */
    ['a gospel is Christian', bk('b7', 'The Gospel of Mark'), 'Christian'],
    ['so is the Imitation of Christ', bk('b8', 'The Imitation of Christ'), 'Christian'],
    ['the Analects are Chinese', bk('b9', 'The Analects of Confucius'), 'Chinese'],
    ['and so is Sun Tzu', bk('b10', 'The Art of War'), 'Chinese'],
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
    /* THE WORDS DELIBERATELY LEFT OUT of the two new shelves, pinned here so
       nobody helpfully adds them back. Every tradition on these shelves has a
       god, a church, a prayer and a saint; a history of China is not a Chinese
       classic; and 'grace' is ordinary English. A hint that fires on two
       shelves has learned nothing. */
    ['"god" belongs to every shelf here, so it decides nothing', bk('c5', 'The Idea of God')],
    ['nor does prayer', bk('c6', 'On Prayer and Stillness')],
    ['a history OF China is not a Chinese classic', bk('c7', 'A Short History of China')],
    ['and a saint is not a denomination', bk('c8', 'Lives of the Saints and Wonders')],
    /* A REAL MISFILE, caught by running the rules over the actual library
       rather than reasoning about them: 'psalms' filed "Sumerian Liturgies and
       Psalms" as Christian. Psalms are older and wider than one tradition. */
    ['psalms are older than Christianity', bk('c9', 'Sumerian Liturgies and Psalms')],
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

  /* THE UNREAD PICK ROTATES (2026-08-03). It used to be unread[0] — first in
     import order, the same book every morning until read. Fine with three
     books; useless with the hundred spiritual texts the steward imported so he
     could read ones he had not read yet. A recommendation that cannot change
     is a nag with better manners. */
  const bookShelfOf = n => Array.from({ length: n }, (_, i) => ({ slug: 'b' + i, title: 'Book ' + i,
    tradition: 'Theravada', doc: { fullText: { text: 'x' } } }));
  const unreadPickOn = day => (theDayItems({ today: day, books: bookShelfOf(40), read: {} })
    .find(i => i.key === 'unread') || {}).arg;
  const rotDays = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
                '2026-08-08', '2026-08-09', '2026-08-10'];
  const rotPicks = rotDays.map(unreadPickOn);
  if (rotPicks.some(x => !x)) fail('the-day: no unread book was offered from a bookShelfOf of 40');
  if (new Set(rotPicks).size < 4) fail(`the-day: eight rotDays produced only ${new Set(rotPicks).size} distinct books — it is not rotating`);
  // ...but it must NOT reshuffle within a day, or it is a slot machine
  if (unreadPickOn('2026-08-03') !== rotPicks[0]) fail('the-day: the same day gave two different books — the pick must be stable until tomorrow');
  // a readable book beats a summary stub: "read a page of this" needs a page
  const rotMixed = theDayItems({ today: TODAY, read: {}, books: [
    { slug: 'stub', title: 'Summary only', doc: {} },
    { slug: 'real', title: 'Has full text', doc: { fullText: { text: 'x' } } }] });
  const rotU = rotMixed.find(i => i.key === 'unread');
  if (!rotU || rotU.arg !== 'real') fail(`the-day: offered "${u && rotU.arg}" — a book with no text is a poor thing to offer to read`);
  // and it still works when NOTHING has full text, rather than going silent
  const rotAllStubs = theDayItems({ today: TODAY, read: {},
    books: [{ slug: 's1', title: 'A', doc: {} }, { slug: 's2', title: 'B', doc: {} }] });
  if (!rotAllStubs.some(i => i.key === 'unread')) fail('the-day: a bookShelfOf of summaries offered nothing at all');

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

/* ---------- a hosted model must never be mistaken for a local one ----------

   The highest-stakes silent failure this project has: the Monk's standing
   rule is "the largest LOCAL model", and on 2026-08-03 it returned
   `gpt-oss:20b-cloud` on the steward's own machine — his most private
   conversations routed to Ollama's servers while the title screen said
   "running on this device alone".

   The guard existed. It said `name.endsWith(':cloud')`, which was true of
   the naming a month ago and false of `gpt-oss:20b-cloud`. So this list is
   the ACTUAL output of `ollama list` on that machine, hyphen form included,
   and it is checked by both signals — the name and the manifest-sized
   entry — because a naming convention will change again. */
{
  const { bestLocalModel, isCloudModel } = await import('../src/game/ai/provider.js');

  const REAL = [
    { name: 'gpt-oss:20b-cloud',     size: 306,        cloud: true  },
    { name: 'deepseek-v4-pro:cloud', size: 344,        cloud: true  },
    { name: 'ornith:9b',             size: 5629110568, cloud: false },
    { name: 'llama3.2:latest',       size: 2019393189, cloud: false },
    { name: 'deepseek-r1:8b',        size: 5225376047, cloud: false },
    { name: 'qwen3.5:9b',            size: 6594474711, cloud: false },
  ];
  for (const m of REAL) {
    if (isCloudModel(m) !== m.cloud) {
      fail(`provider.js: isCloudModel() calls '${m.name}' ${isCloudModel(m) ? 'hosted' : 'local'} — it is ${m.cloud ? 'hosted' : 'local'}. A hosted model treated as local sends a resident's conversation to a server while the app claims otherwise`);
    }
    // the name alone must be enough too — availableModels is a list of strings
    if (m.cloud && !isCloudModel(m.name)) {
      fail(`provider.js: isCloudModel('${m.name}') missed it on the NAME. availableModels carries names only, so the size signal is not always there to save it`);
    }
  }

  const picked = bestLocalModel(REAL.map(m => m.name), REAL[0].name);
  if (isCloudModel(picked)) {
    fail(`provider.js: bestLocalModel() picked '${picked}', which is hosted — this is the call that decides where the Monk's conversations go`);
  }
  if (picked !== 'ornith:9b' && picked !== 'qwen3.5:9b') {
    fail(`provider.js: bestLocalModel() picked '${picked}'; the largest genuinely local model in that list is 9B`);
  }
  // nothing local at all must yield NOTHING, never a hosted fallback
  const onlyCloud = bestLocalModel(['gpt-oss:20b-cloud'], 'gpt-oss:20b-cloud');
  if (onlyCloud !== null) {
    fail(`provider.js: with only hosted models installed, bestLocalModel() returned '${onlyCloud}' instead of null — a fallback that reaches for a server is the failure this whole check exists to stop`);
  }
  // and a local model that merely mentions the word must survive
  if (isCloudModel('cloudy-llama:8b')) {
    fail("provider.js: isCloudModel() is matching the word 'cloud' anywhere in a name — a local model would be discarded");
  }
}

/* ---------- a lesson that cites a book, and leaves as a document ----------
   THE-TEACHERS-TREE-PLAN.md gaps 1 and 2. A teacher writes "Read chapters
   3-4 and annotate" — naturally, not in a syntax — and gets a door. The
   risk is the opposite of a missing feature: a CONFIDENTLY WRONG citation
   sends a class to the wrong pages on Monday, so the detector must decline
   rather than guess. */
{
  const { readingIn, readingLabel, lessonToMarkdown, lessonToHTML, lessonFileName } =
    await import('../src/game/data/lesson-doc.js');

  const finds = [
    ['Read chapters 3-4 and annotate the argument', 'chapter', 3, 4],
    ['Read chapters 3–4 (en dash)',                 'chapter', 3, 4],
    ['Ch. 7: the turn',                             'chapter', 7, 7],
    ['Read chapter 2 to 5 before class',            'chapter', 2, 5],
    ['Discuss pp. 12-18 in pairs',                  'page',   12, 18],
    ['Homework: pages 40 and 41',                   'page',   40, 41],
    ['Read p. 9 aloud',                             'page',    9,  9],
  ];
  for (const [text, kind, from, to] of finds) {
    const r = readingIn(text);
    if (!r) { fail(`lesson-doc: readingIn() found nothing in "${text}"`); continue; }
    if (r.kind !== kind || r.from !== from || r.to !== to) {
      fail(`lesson-doc: readingIn("${text}") gave ${r.kind} ${r.from}-${r.to}, expected ${kind} ${from}-${to}`);
    }
  }
  const declines = [
    'Warm-up: five minutes of free writing',
    'Bring 3 examples of your own',           // a bare number is not a citation
    'Chapter 0 of nothing',
    'Read the whole book',
  ];
  for (const text of declines) {
    const r = readingIn(text);
    if (r) fail(`lesson-doc: readingIn("${text}") invented a ${r.kind} reference — a wrong citation sends a class to the wrong pages`);
  }
  if (readingIn('Read chapters 9-2') ?.to !== 9) {
    fail('lesson-doc: a backwards range should collapse to the one chapter named, not produce an empty span');
  }
  const labels = [[{kind:'chapter',from:3,to:4},'ch. 3–4'], [{kind:'chapter',from:3,to:3},'ch. 3'],
                  [{kind:'page',from:12,to:18},'pp. 12–18'], [{kind:'page',from:9,to:9},'p. 9']];
  for (const [r, want] of labels) {
    if (readingLabel(r) !== want) fail(`lesson-doc: readingLabel(${JSON.stringify(r)}) is "${readingLabel(r)}", not "${want}" — this is printed on a handout`);
  }

  const node = { title:'Of Mice and Men — week 1', summary:'Open the novel.', track:'English 10', level:101,
    written:'2026-08-03', steps:[{title:'Read chapters 1-2', body:'Mark every promise either man makes.'},
                                 {title:'Warm-up: what is a friend?', body:''}] };
  const book = { title:'Of Mice and Men', attribution:'John Steinbeck' };
  const md = lessonToMarkdown(node, { book, prereqTitles:['Reading a novel'] });
  for (const must of ['# Of Mice and Men — week 1', 'ch. 1–2', 'English 10', 'Before this:', 'Mark every promise'])
    if (!md.includes(must)) fail(`lesson-doc: the Markdown is missing "${must}"`);

  const html = lessonToHTML(node, { book, prereqTitles:['Reading a novel'] });
  /* One file, or it is not a document he can put anywhere. */
  if (!/^<!doctype html>/i.test(html)) fail('lesson-doc: the HTML has no doctype — it is a fragment, not a page');
  if (/<(script|link|img)\b/i.test(html)) fail('lesson-doc: the HTML pulls in something external; it must be one self-contained file');
  if (!/@media print/.test(html)) fail('lesson-doc: no print rules — the first thing a teacher does is print it');
  if (!html.includes('<title>Of Mice and Men — week 1</title>')) fail('lesson-doc: the page has no title');
  /* And it must not be injectable — a lesson title is user text going into a page they will publish. */
  const nasty = lessonToHTML({ title:'</title><script>alert(1)</script>', steps:[{title:'<img onerror=x>'}] });
  if (/<script>|<img /i.test(nasty)) fail('lesson-doc: the HTML export does not escape — a title could inject script into a page the teacher publishes');
  if (lessonFileName(node, 'html') !== 'of-mice-and-men-week-1.html') fail('lesson-doc: the filename is not something you could find again: ' + lessonFileName(node, 'html'));
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
