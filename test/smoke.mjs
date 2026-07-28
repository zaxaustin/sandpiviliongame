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

const KNOWN_STATION_KINDS = ['planner', 'courses', 'archive', 'computer', 'requests', 'notice', 'hearth', 'grantdesk', 'residents', 'research', 'coffee', 'review', 'records', 'calendar', 'ledger', 'makersbench', 'greenhouse', 'roundtable', 'mailroom', 'yourshelf', 'inheritance', 'commons', 'alexandria', 'tree'];

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
   See plans/COMMONS-AND-PRIVATE-PLAN.md. */
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
