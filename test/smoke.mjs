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

    /* THE OTHER DIRECTION, and it is the one that was missing.

       The check above asks "is every declared store described?" — which is
       blind to a store that is in NEITHER list. That is not hypothetical: on
       2026-08-07 `data.bookMarks` turned out to be written by study-table.js
       (`data.bookMarks = data.bookMarks || {}`, self-creating), absent from
       freshData(), and therefore absent from DATA_MAP too — so the privacy
       line was short by one store, and by the one holding the visitor's own
       chapter names. `data.study` is the same shape. The guard existed and
       had nothing to say about either, because it only ever looked one way.

       So: anything the code actually WRITES to `data.` must be declared. A
       store nobody declared is a store nobody can see, back up, or reason
       about — and it will not survive a save migration that rebuilds from
       freshData(). */
    const declared = new Set([...keys, ...ignore]);
    const writes = new Map();       // key -> first file that writes it
    const walk = (dirUrl, label) => {
      for (const e of readdirSync(dirUrl, { withFileTypes: true })) {
        if (e.isDirectory()) { walk(new URL(e.name + '/', dirUrl), label + e.name + '/'); continue; }
        if (!e.name.endsWith('.js')) continue;
        const text = readFileSync(new URL(e.name, dirUrl), 'utf8');
        // an ASSIGNMENT to data.<key>, not a read — reads of a stale key are a
        // bug of their own, but they cannot invent an undeclared store.
        for (const mm of text.matchAll(/\bdata\.([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=[^=]|\|\|=|\?\?=)/g)) {
          if (!writes.has(mm[1])) writes.set(mm[1], label + e.name);
        }
      }
    };
    walk(new URL('../src/game/', import.meta.url), 'src/game/');
    for (const [k, where] of writes) {
      if (declared.has(k)) continue;
      fail(`entities.js: ${where} writes data.${k}, which freshData() never declares `
         + `— an undeclared store is invisible to Your Data and does not survive a rebuild`);
    }
    if (writes.size < 5) fail(`smoke: only found ${writes.size} data.* writes — the source scan has drifted`);
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
  /* EVERY ui/ FILE IS SCANNED FOR HANDLERS, not just overlays.js.
     Breaking overlays.js up (2026-08-04, at the steward's request) put panels
     in new files while the window-export block correctly stayed in ONE place.
     This check read overlays.js alone, so the moment a panel moved out its
     buttons stopped being covered — the split would have quietly disabled the
     project's oldest guard, which is a worse outcome than the monolith. */
  const uiDir = new URL('../src/game/ui/', import.meta.url);
  const uiFiles = readdirSync(uiDir).filter(f => f.endsWith('.js'));
  const block = src.slice(src.lastIndexOf('Object.assign(window'));
  /* COMMENTS ARE STRIPPED BEFORE THE NAMES ARE READ. Found 2026-08-04 while
     deliberately breaking this very check: dropping `studyAddNote` from the
     list but mentioning it in the comment on the same line made the guard
     pass. A name in a comment is not an export, and a guard that a comment
     can satisfy is the "born dead" failure this project keeps writing —
     the same shape as the prompt-budget check that parsed apostrophes
     inside comments as string quotes. */
  const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const exported = new Set(stripComments(block).match(/[A-Za-z_$][\w$]*/g) || []);
  // functions assigned straight onto window elsewhere count too
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) exported.add(m[1]);
  const RESERVED = new Set(['if', 'for', 'while', 'return', 'event', 'this', 'switch', 'try']);
  for (const file of uiFiles) {
    const text = readFileSync(new URL(file, uiDir), 'utf8');
    const called = new Set();
    for (const m of text.matchAll(/on(?:click|change|input|keydown|dragover|dragleave|drop)\s*=\s*["'`]?\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
      if (!RESERVED.has(m[1])) called.add(m[1]);
    }
    for (const fn of called) {
      if (!exported.has(fn)) {
        fail(`ui/${file}: '${fn}()' is called from an inline handler but is not in the window export block (which lives in overlays.js) — that button silently does nothing`);
      }
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

  /* ---- and every DOOR a record names must be one of those exports ----
     data/records.js stores an `opener` as a plain string, because the
     Records Hall reads rows out of a database where a function cannot
     live. That string is only a promise until something checks it.

     The first version named openInvestigation, openExperiment and
     openBuild. None exist. 14 of the room's 16 cards were dead ends —
     found by opening the room and COUNTING the clickable ones, not by
     reading the code, and forbidden outright by the standing rule that
     nothing may be a dead end. This is rule 4's shape: a list in one
     file that must match a list in another. */
  const recSrc = readFileSync(new URL('../src/game/data/records.js', import.meta.url), 'utf8');
  const recNoComments = recSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const openers = new Set();
  for (const m of recNoComments.matchAll(/opener\s*:\s*'([A-Za-z_$][\w$]*)'/g)) openers.add(m[1]);
  for (const m of recNoComments.matchAll(/'(open[A-Z][\w$]*)'/g)) openers.add(m[1]);
  for (const o of openers) {
    if (!names.has(o)) {
      fail(`data/records.js names '${o}' as a record's opener, but it is not in the window export block — every card using it would be a dead end (the Records Hall reads openers out of the database as strings, so nothing else can catch this)`);
    }
  }

  /* ---- A DAY YOU ACTUALLY WORKED, 2026-08-10 ----
     The Records Hall listed no days at all, and said why: "a planner day
     exists as soon as it is opened, which is not the same as a day you
     worked." A FINISHED daily task is that missing thing — dated, countable,
     with a board to point back at. It is also the answer to "how are all the
     logs connected to this?", so getting the boundary wrong here makes the
     one honest index over real work start flattering its owner.

     Three ways it can go wrong, all of them quiet:
       a day taken and abandoned counted as work    -> the count is a lie
       today's open board filed as history          -> it is not over yet
       dated by the close-out rather than by doing  -> a record in the wrong
                                                       day, which a note cites */
  const { gatherRecords, RECORD_LOOK } = await import('../src/game/data/records.js');
  const RECORD_LOOK_DAY = RECORD_LOOK.day && RECORD_LOOK.day.icon && RECORD_LOOK.day.label;
  const dayRows = save => gatherRecords(save).filter(r => r.kind === 'day');
  const step = done => ({ text: 't', where: 'note', ref: '', done });

  const finished = { dailyTasks: [{ id: 7, title: 'Start on Tesla', taken: '2026-08-01',
    source: { kind: 'free', ref: '', label: 'Learning electronics' },
    steps: [step(true), step(true)], closed: true }] };
  const fin = dayRows(finished);
  if (fin.length !== 1) fail(`records: a finished day produced ${fin.length} record(s), expected 1`);
  else {
    if (fin[0].happened !== '2026-08-01') {
      fail(`records: a finished day is dated '${fin[0].happened}', not the day it was taken `
         + `('2026-08-01') - a record in the wrong day is a lie a note can cite`);
    }
    if (!/Tesla/.test(fin[0].title)) fail('records: a finished day lost its title');
    if (!/electronics/i.test(fin[0].detail || '')) {
      fail('records: a finished day dropped what it was a slice OF - the source is the whole '
         + 'anti-overwhelm point of the board');
    }
    if (fin[0].opener !== 'openDailyTasks') fail('records: a day record points at ' + fin[0].opener + ', not the board');
  }

  const half = { dailyTasks: [{ id: 8, title: 'Half a day', taken: '2026-08-01',
    steps: [step(true), step(false)], closed: true }] };
  if (dayRows(half).length) {
    fail('records: a day with steps left undone was filed as a day you WORKED. The board records '
       + 'both halves because a person needs to see both; an index of work done that includes the '
       + 'days you fell short is the guilt inventory the-day.js exists to prevent.');
  }
  const open = { dailyTasks: [{ id: 9, title: 'Still going', taken: '2026-08-01',
    steps: [step(true), step(true)], closed: false }] };
  if (dayRows(open).length) fail("records: today's board was filed as history before the day was closed out");
  const empty = { dailyTasks: [{ id: 10, title: 'Took it, did nothing', taken: '2026-08-01', steps: [], closed: true }] };
  if (dayRows(empty).length) fail('records: a day with NO steps counted as a day worked');
  const undated = { dailyTasks: [{ id: 11, title: 'No date', taken: '', steps: [step(true)], closed: true }] };
  if (dayRows(undated).length) fail('records: an undated day was given a date rather than skipped');
  if (dayRows({}).length || dayRows({ dailyTasks: null }).length) fail('records: gatherRecords threw on a save with no tasks');

  /* Two finished days must be two records - source_key collided on `title`
     in an earlier draft, so a second day with the same name vanished. */
  const twice = { dailyTasks: [
    { id: 1, title: 'Same name', taken: '2026-08-01', steps: [step(true)], closed: true },
    { id: 2, title: 'Same name', taken: '2026-08-02', steps: [step(true)], closed: true }] };
  if (dayRows(twice).length !== 2) {
    fail('records: two finished days with the same title collapsed into ' + dayRows(twice).length
       + ' - de-duplication is eating real work');
  }
  if (!RECORD_LOOK_DAY) fail('records: RECORD_LOOK has no entry for kind "day" - the card would render blank');
}

/* ---------- a moved panel must resolve every name it executes ----------
   Written 2026-08-04, after the SAME bug crashed the Learning Tree cut twice.
   Moving a region out satisfies its outward CALLS through initX() shims, and
   both times a name that was not a call slipped through: stopSpeaking (an
   import nobody thought to add) and NOTE_SELECT_STYLE (a bare style constant
   sitting inside a template hole).

   Neither `node --check`, `npm test` nor `npm run build:beta` said a word —
   a free identifier is legal JavaScript until the line runs, and only that one
   branch runs it. It took driving Chrome at the app to find each. With seven
   more cuts to make, hand-picking the shim list again is not a plan.

   FOUR VERSIONS OF THIS CHECK WERE WRONG BEFORE THIS ONE, and each was found
   by breaking it on purpose rather than by reading it:

     1. only `name(` call sites          — missed the constant entirely
     2. every identifier, strings and all — buried the one real answer under
                                            139 English words of prompt prose
     3. "names overlays.js declares"      — overlays.js declares `remember`,
                                            `typing` and `experiment`, which
                                            are also ordinary English words
     4. "...declares OR imports"          — still overlays-shaped, so it went
                                            green the moment NOTE_SELECT_STYLE
                                            was rehomed to ui/dom.js, which is
                                            precisely the fix it should survive

   So it asks the question that does not mention overlays.js at all: does this
   module resolve every identifier it EXECUTES? Strings are stripped (killing
   the prose), template ${...} holes are kept (that is where the constant hid),
   and window-dispatched handlers are excluded because the handlers->exports
   check above already owns them. */
{
  const uiDir = new URL('../src/game/ui/', import.meta.url);

  /* Reduce a file to the characters that actually EXECUTE, blanking everything
     else but keeping every newline so reported line numbers stay true.
     Comments and string bodies go; the ${...} holes inside a template literal
     STAY, because those are live code — and a hole is exactly where
     NOTE_SELECT_STYLE was hiding when this bug shipped.

     THIS IS A REAL LEXER, not a regex, and that is not gold-plating. The regex
     version of this same step leaked whole sentences of English into the
     results, because a template literal can contain `${`a nested one`}` and no
     regular expression can balance that. Lexing is exact where parsing would
     be overkill: one pass, one state, a stack for the ${} nesting.

     Dropping strings also drops `fn:'openX'` and `onclick="openY()"`, which is
     correct — those dispatch through window at click time and the
     handlers->exports check above already owns them. */
  const executable = (t) => {
    const blank = c => (c === '\n' ? '\n' : ' ');
    let out = '';
    let i = 0;
    /* One mode stack, so `${`a nested template`}` unwinds by construction
       instead of by a special case. `code` frames inside a template carry a
       brace depth: the `}` that returns to the template is the one at zero. */
    const stack = [{ mode: 'code', depth: 0 }];
    /* REGEX LITERALS MUST BE RECOGNISED, or `.replace(/'/g, ...)` opens a
       string that never closes and swallows the rest of the file — which is
       what leaked the steward's own quoted words into an earlier run of this
       check as if they were undefined variables. The usual heuristic: a `/`
       starts a regex unless the previous meaningful character could end an
       expression. */
    let prev = '';
    const canPrecedeRegex = () => !/[\w$)\]]/.test(prev);
    while (i < t.length) {
      const top = stack[stack.length - 1];
      const c = t[i], d = t[i + 1];

      if (top.mode === 'code') {
        if (c === '/' && d === '*') { out += '  '; i += 2; stack.push({ mode: 'block' }); continue; }
        if (c === '/' && d === '/') { out += '  '; i += 2; stack.push({ mode: 'line' }); continue; }
        if (c === '/' && canPrecedeRegex()) {
          out += ' '; i++;
          let cls = false;                                  // inside a [...] class
          while (i < t.length) {
            if (t[i] === '\\') { out += '  '; i += 2; continue; }
            if (t[i] === '[') cls = true;
            else if (t[i] === ']') cls = false;
            else if (t[i] === '/' && !cls) { out += ' '; i++; break; }
            else if (t[i] === '\n') break;                   // unterminated: bail, don't eat the file
            out += blank(t[i]); i++;
          }
          while (i < t.length && /[dgimsuvy]/.test(t[i])) { out += ' '; i++; }   // flags
          prev = '/'; continue;
        }
        if (c === '"' || c === "'") { out += ' '; i++; stack.push({ mode: 'str', q: c }); prev = '"'; continue; }
        if (c === '`') { out += ' '; i++; stack.push({ mode: 'tpl' }); prev = '"'; continue; }
        if (c === '{') top.depth++;
        if (c === '}') {
          // the closing brace of a ${...} hole: hand control back to the template
          if (top.depth === 0 && stack.length > 1) { out += ' '; i++; stack.pop(); prev = '"'; continue; }
          top.depth--;
        }
        out += c; i++;
        if (!/\s/.test(c)) prev = c;
        continue;
      }

      if (top.mode === 'block') {
        if (c === '*' && d === '/') { out += '  '; i += 2; stack.pop(); continue; }
        out += blank(c); i++; continue;
      }
      if (top.mode === 'line') {
        if (c === '\n') { stack.pop(); continue; }        // the \n itself is emitted by code mode
        out += ' '; i++; continue;
      }
      if (top.mode === 'str') {
        if (c === '\\') { out += '  '; i += 2; continue; }
        if (c === top.q) { out += ' '; i++; stack.pop(); continue; }
        out += blank(c); i++; continue;
      }
      // template literal: the text is inert, the ${...} holes are live code
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === '`') { out += ' '; i++; stack.pop(); continue; }
      if (c === '$' && d === '{') { out += '  '; i += 2; stack.push({ mode: 'code', depth: 0 }); continue; }
      out += blank(c); i++;
    }
    return out;
  };
  const KEYWORDS = new Set(`if else for while do switch case default break continue return
    function class extends new delete typeof instanceof in of void this super null true false
    undefined try catch finally throw var let const await async yield import export from as
    static get set arguments`.split(/\s+/));

  const GLOBALS = new Set(`Set Map WeakMap WeakSet Number String Boolean Array Object JSON Math
    Date RegExp Promise Symbol BigInt Proxy Reflect Intl parseInt parseFloat isNaN isFinite NaN
    Infinity setTimeout clearTimeout setInterval clearInterval queueMicrotask
    requestAnimationFrame cancelAnimationFrame document window console globalThis navigator
    location history performance screen require module exports process Error TypeError
    RangeError SyntaxError encodeURIComponent decodeURIComponent encodeURI decodeURI Blob URL
    URLSearchParams File FileReader FormData Headers Request Response AbortController
    localStorage sessionStorage indexedDB alert confirm prompt fetch structuredClone getComputedStyle
    Uint8Array Uint16Array Int32Array Float32Array ArrayBuffer TextEncoder TextDecoder Image Audio
    Event CustomEvent KeyboardEvent MouseEvent MutationObserver ResizeObserver IntersectionObserver
    DOMParser SpeechSynthesisUtterance speechSynthesis crypto atob btoa Node HTMLElement`.split(/\s+/));

  /* Everything a module can legally resolve on its own. Deliberately GENEROUS:
     a false negative here is a missed crash, but a false positive is a red
     suite on correct code, and this project has thrown away two guards that
     cried wolf. Params, destructuring, catch bindings and loop variables all
     count as declared. */
  const declaredIn = (src, code) => {
    const have = new Set();
    /* Trim the punctuation a coarse split leaves behind. Without the leading
       strip, `list.sort((a, z) => ...)` yields the fragment `(a`, which fails
       the identifier test — so `a` looked undefined and the guard cried wolf
       on correct code. */
    const add = (n) => {
      n = String(n || '').trim().replace(/^[([{.\s]*(?:\.\.\.)?/, '').replace(/[)\]}\s]*$/, '').split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) have.add(n);
    };
    /* TWO list shapes, and conflating them cost a round. In a DESTRUCTURING
       pattern `{ page: p }` the colon renames, so the binding is on the right.
       In a DECLARATOR the same colon is a ternary's else-branch, and taking
       the right-hand side there threw away the variable and kept `null` —
       which made ten correct `const x = cond ? a : b` lines look undefined. */
    const addPattern = s => { for (const part of String(s).split(',')) add(part.split(':').pop()); };
    const addDecls = s => { for (const part of String(s).split(',')) add(part); };

    for (const m of src.matchAll(/(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
    /* for (const x OF ...) and for (const k IN ...) bind x and k. Missing this
       flagged `need`, `r` and `line` — three ordinary loop variables. */
    for (const m of code.matchAll(/\b(?:const|let|var)\s+([^\n;]*?)\s+(?:of|in)\s/g)) addDecls(m[1]);
    // multi-declarator lines:  const TREE_COL=230, TREE_ROW=112;
    for (const m of code.matchAll(/\b(?:const|let|var)\s+([^\n;]*)/g)) addDecls(m[1]);
    for (const m of src.matchAll(/import\s*\{([^}]*)\}/g)) {
      for (const part of m[1].split(',')) add(part.trim().split(/\s+as\s+/).pop());
    }
    for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) add(m[1]);
    for (const m of code.matchAll(/\{([^{}]*)\}\s*=/g)) addPattern(m[1]);         // { a, b } =
    for (const m of code.matchAll(/\[([^[\]]*)\]\s*=/g)) addPattern(m[1]);        // [ t, ...rest ] =
    for (const m of code.matchAll(/function[^(]*\(([^)]*)\)|\(([^)]*)\)\s*=>/g)) addPattern(m[1] || m[2]);
    for (const m of code.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) add(m[1]);         // x => ...
    for (const m of code.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)) add(m[1]);
    /* object-method shorthand — `async systemPrompt(){...}` defines a method,
       it does not reference a variable called systemPrompt */
    for (const m of code.matchAll(/(?:^|[,{]\s*)(?:async\s+)?\*?\s*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/gm)) add(m[1]);
    return have;
  };

  const moved = readdirSync(uiDir).filter(f => f.endsWith('.js') && f !== 'overlays.js');
  for (const file of moved) {
    const src = readFileSync(new URL(file, uiDir), 'utf8');
    const code = executable(src);
    const have = declaredIn(src, code);
    const seen = new Set();
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const m of lines[i].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) {
        const n = m[1];
        if (seen.has(n) || have.has(n) || KEYWORDS.has(n) || GLOBALS.has(n)) continue;
        // an object-literal KEY is not a reference:  { page: 1 }
        if (/^\s*:(?!:)/.test(lines[i].slice(m.index + n.length))) continue;
        seen.add(n);
        fail(`ui/${file}:${i + 1} executes '${n}', which this module neither declares nor imports — a ReferenceError the moment that one branch runs, and neither the build nor node --check will tell you`);
      }
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
   another, with nothing checking the join. So it gets checked.

   COMMENTS ARE STRIPPED FIRST, added 2026-08-04. Writing the sentence
   "dbAvailable() only means there is a bridge" in a comment failed this check
   against code that was correct. That is the window-export bug in a mirror —
   there a comment could SATISFY the guard, here a comment could TRIP it — and
   both directions send a future session hunting a bug that does not exist.
   Prose about a function is not a call to it. */
{
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const ovSrc = strip(readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8'));
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
/* THE UI IS MORE THAN ONE FILE NOW. overlays.js is being broken up (2026-08-04),
   and the checks below look for CODE rather than for a filename — a prompt
   body, a grounding block, a resident. Pointing them at overlays.js alone made
   every one of them fail the moment the residents moved out, each correctly
   reporting "has it been renamed?". Reading the whole ui/ directory means the
   next extraction moves code without moving a single test. */
const UI_SOURCE = readdirSync(new URL('../src/game/ui/', import.meta.url))
  .filter(f => f.endsWith('.js'))
  .map(f => readFileSync(new URL('../src/game/ui/' + f, import.meta.url), 'utf8'))
  .join('\n');

{
  const ov = UI_SOURCE;
  const { CHARTER, WORK_CHARTER, BUTLER_CHARTER } = await import('../src/game/data/charter.js');
  const { rosterBlock, ROLES } = await import('../src/game/data/roles.js');
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
  /* THE MONK'S BUDGET WAS RAISED DELIBERATELY, 2026-08-04, which is what this
     check asks you to do rather than trimming to fit. He carries the Eightfold
     Path whole now — each fold with the line that makes it practicable — at the
     steward's request: "its good for his own pratice as well as mine, it only
     bllooms through pratice… it takes valuable space in the mind, for me its
     worth having."

     It is a cheap trade and the numbers say so. The same day, the catalogue
     paste came out of his prompt: 294 books at ~174 characters each, about
     12,800 tokens on EVERY message, replaced by his own shelves through
     catalogueBrief (~159) plus a lookup on what was actually asked. Spending
     ~90 of the ~12,600 tokens freed on the path he exists to teach is not a
     budget overrun; it is what the room was cleared for. */
  /* MONK 2150 -> 2175, deliberately, 2026-08-08. rosterBlock() gained one
     sentence — "never credit a colleague with an ability not written there" —
     and it is paid for by all seven, which is exactly why this guard exists
     and why it caught it.

     What the 25 tokens bought, measured rather than assumed: pointing a real
     local model (deepseek-r1:8b) at these prompts for the first time, TWO RUNS
     OUT OF THREE invented a colleague's powers — the Investigator sent someone
     to "the Computer, which has access to more extensive research" (it lists
     local files) and Quill offered "the Steward, about any texts they carry"
     (he carries none). A handoff is the one claim a model cannot check,
     because the colleague is not in the room to contradict it, and the visitor
     finds out by walking to another room and finding nothing.

     Only the Monk trips the line, because his prose is the longest by far. The
     alternative was trimming the Eightfold Path he carries whole at the
     steward's request, to pay for a fix to a different problem — which would
     be the wrong thing bought with the wrong money. */
  /* SEBASTIAN 1470 -> 1620, and the raise is an ADMISSION rather than a
     concession. 2026-08-10: his Beeton training was never counted here by
     either version of the code. It was composed by butlerTrainingBlock(), a
     helper defined OUTSIDE the `sebastian:{…}` slice this guard reads, so ~300
     tokens of always-on prose were invisible; moving the text to roles.js and
     counting it properly is what surfaced it. He has been at ~1590 the whole
     time, not 1290.

     THE BLIND SPOT IS THE REAL FINDING and it is wider than this one number:
     ANY always-on prose composed by a helper function is uncounted here
     (sebModeBlock, and parts of butlerDayRead, are the other candidates).
     Registered in docs/DOCS-DRIFT.md rather than chased today — a guard that
     measures a file region instead of the text a model receives will keep
     finding new ways to be slack. */
  const BUDGET = { quill: 1100, steward: 820, investigator: 1280, monk: 2175,
                   computer: 810, tutor: 1100, sebastian: 1620 };
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
    /* A ROLE'S OWN BOOK IS ALWAYS-ON TEXT AND MUST BE COUNTED. Sebastian's
       Beeton was a string literal inside his systemPrompt() until 2026-08-10,
       so this guard saw it; moving it to roles.js as `training` moved ~300
       tokens OUT OF THE MEASURED REGION without a word reaching the model
       differently. The guard would have gone quietly slack — which is the
       thing this whole file exists to prevent, so the measurement follows the
       text rather than the file it happens to live in. */
    const training = ((ROLES[agent] || {}).training || {});
    const trainingText = (training.book || '') + (training.lines || []).join(' ');
    const tokens = briefTokens(literals + charter + rosterBlock(agent) + trainingText);
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

  /* THESE MOVED OUT OF THE SHIPPED BUNDLE, 2026-08-10.

     They used to be imported from src/game/data/library-texts/ — six full
     books, 248 KB, compiled into every build to back six seed shelf entries.
     The seed shelf is gone, so shipping them was dead weight AND a pathway
     back to it. They are TEST DATA and now live where test data lives.

     KEPT, not discarded, and the distinction matters: these two are real
     ground truth. The Dhammapada has exactly 26 chapters and the Gita 17,
     counted by hand, which is the only reason this test could ever catch the
     bug it was written for — the old scanner found ZERO in both and "it
     found some chapters" would have passed. A fixture with a known answer is
     worth more than the book it came from. */
  const textOf = async (file) => {
    const { readFileSync: rf } = await import('node:fs');
    return rf(new URL(`./fixtures/chapters/${file}.txt`, import.meta.url), 'utf8');
  };

  /* The two long texts, now fixtures. */
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
  const ov = UI_SOURCE;
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
  const ov = UI_SOURCE;

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
  /* Same shape, same reason: the Study Table derives its default resident from
     this flag rather than naming one, so exactly one may carry it. */
  const studios = ROLE_KEYS.filter(k => ROLES[k].studio);
  if (studios.length !== 1) fail(`roles.js: ${studios.length} residents claim the Study Table — it opens with exactly one, and a panel that has to pick between two would hard-code a name`);
  if (!ROLES[studios[0]] || !ROLES[studios[0]].chat) fail(`roles.js: '${studios[0]}' is the Study Table's resident but has no chat door — it cannot be spoken to`);

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
  const { theDayItems, theDayLine, daysBetween, ICON, notesToday, notesTodayLine } = await import('../src/game/data/the-day.js');
  const TODAY = '2026-07-28';
  const bk = (slug, title, extra = {}) => ({ slug, title, ...extra });

  if (daysBetween('2026-07-25', TODAY) !== 3) fail('the-day: daysBetween is wrong');
  if (daysBetween(TODAY, TODAY) !== 0) fail('the-day: same day should be 0');

  /* NEVER EMPTY — the rule that matters most, in the emptiest possible world.

     WHAT THE EMPTY WORLD OFFERS CHANGED 2026-08-09, and the assertion changed
     with it rather than being loosened. It used to require "Bring a book in",
     which was right while that was the only thing there was to offer — but
     that sentence is the one beta feedback #29 called "true in general, wrong
     on arrival". With the walk built, day one on an empty shelf offers the
     walk; once you have started it (or once there is anything to read) the
     bare instruction comes back, because by then it is the next real step
     rather than a greeting. Both halves are checked. */
  const bare = theDayItems({ today: TODAY });
  if (!bare.length) fail('the-day: an empty Pavilion produced nothing to do — "all caught up" is a reason not to return');
  if (bare[0].key !== 'idle-tutorial' || bare[0].fn !== 'openTutorial') {
    fail(`the-day: an empty world on day one offered "${bare[0].title}" (${bare[0].key}) rather than the `
       + 'walk. A person ninety seconds into a brand-new Pavilion should be offered something with an '
       + 'end, not a chore.');
  }
  const started = theDayItems({ today: TODAY, tutorial: { started: '2026-07-27' } });
  if (!started.length) fail('the-day: still never empty once the walk has been started');
  if (!/Bring a book in/.test(started[0].title)) {
    fail('the-day: once the walk is under way the empty shelf should say the plain thing again — '
       + 'offering the walk to someone already walking it is the nag this project refuses');
  }
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

  /* WHAT IS IN FRONT OF YOU LEADS; WHAT YOU SET DOWN IS AN OFFER.
     Reversed 2026-08-07 at the steward's word — these checks used to assert
     the opposite, that a late thing outranked everything, which meant one
     week-old item pushed the thing you were in the middle of off the end of a
     five-item list. Kept as checks rather than deleted, because the new rule
     is just as easy to erode as the old one was. */
  const dueToday = theDayItems({ today: TODAY, upcoming: [{ kind: 'course', id: 'c2', title: 'Today thing', due: TODAY }] });
  if (dueToday[0].icon !== '📌') fail('the-day: a thing due TODAY is what is in front of you and should come first');
  if (!/today/.test(dueToday[0].note)) fail('the-day: a thing due today should say so');

  // a past-due thing is still offered — but as a pick-up, never as a clock
  const late = theDayItems({ today: TODAY, upcoming: [{ kind: 'course', id: 'c1', title: 'Late thing', due: '2026-07-26' }] });
  const setDown = late.find(i => i.icon === '🌾');
  if (!setDown) fail('the-day: a project past its date vanished — it should still be offered, lower down');
  else {
    if (!/pick it back up/.test(setDown.note)) fail(`the-day: set-down note read "${setDown.note}" — it should invite, not report`);
    if (/overdue|late|behind/i.test(setDown.note)) fail(`the-day: set-down note read "${setDown.note}" — no debt language`);
  }

  // ...and it must NOT outrank the thing you are in the middle of
  const bothL = [{ id: 'l9', title: 'Half done', steps: [{ title: 'A' }, { title: 'B' }] }];
  const both = theDayItems({ today: TODAY, lessons: bothL, curriculum: { l9: { steps: { 0: true } } },
    upcoming: [{ kind: 'course', id: 'c3', title: 'Old thing', due: '2026-07-01' }] });
  const iStep = both.findIndex(i => i.fn === 'openLesson');
  const iSet = both.findIndex(i => i.icon === '🌾');
  if (iStep < 0) fail('the-day: the half-finished lesson was crowded out entirely');
  else if (iSet >= 0 && iSet < iStep) fail('the-day: a project set down outranked what you are in the middle of');

  // one set-down item, never a column — a list of six is the overdue panel moved
  const manySet = theDayItems({ today: TODAY,
    upcoming: Array.from({ length: 6 }, (_, i) => ({ kind: 'course', id: 'z' + i, title: 'Z' + i, due: '2026-07-0' + (i + 1) })) });
  const setCount = manySet.filter(i => i.icon === '🌾').length;
  if (setCount > 1) fail(`the-day: offered ${setCount} set-down projects — one at a time, or it is a guilt inventory again`);

  /* THE DOOR LINE READS ICONS THE PANEL OWNS, so a renamed icon makes a branch
     unreachable in silence. That is exactly what happened on 2026-08-07: the
     ⏳ branch survived the rewrite that deleted ⏳ and the menu would have gone
     on saying the second-best thing forever. Every icon theDayLine tests for
     must be an icon theDayItems can actually emit.

     The first version of this check scanned the source for emoji in a
     codepoint range — and ⏳ is U+23F3, outside it, so the guard would have
     missed the exact icon that caused the bug. Born dead, found by breaking
     it on purpose. So it reads the REAL exported values instead, and there is
     no range to be wrong about. */
  const daySrc = readFileSync(new URL('../src/game/data/the-day.js', import.meta.url), 'utf8');
  for (const [name, glyph] of Object.entries(ICON)) {
    if (!daySrc.includes("icon: '" + glyph + "'")) {
      fail(`the-day: theDayLine keys on ICON.${name} (${glyph}), which theDayItems never emits — a dead branch`);
    }
  }

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

  /* ---- WHAT YOU WROTE TODAY, 2026-08-10 ----
     A note's only route back into ☀ Today opened after a FORTNIGHT
     (forgottenNotes). Write six in a morning and the day knew about none.
     "lets make proper pathways for the notes to be in the logs."

     THE BOUNDARY IS THE FEATURE. These are a RECORD, not a waiting item:
     theDayItems is capped at five because "a list of everything
     outstanding is a guilt inventory", and work you have already done must
     never compete for those five or turn into another thing asking for
     you. */
  const nDay = (date, title) => ({ key: 'k' + title, title, text: 'A real note with enough body to count.', date });
  const someNotes = [nDay('2026-08-10', 'a'), nDay('2026-08-10', 'b'), nDay('2026-08-09', 'c'), nDay('', 'd')];
  const mineToday = notesToday(someNotes, '2026-08-10');
  if (mineToday.length !== 2) fail(`the-day: notesToday found ${mineToday.length} of 2 written today`);
  if (mineToday.some(n => n.date !== '2026-08-10')) fail("the-day: notesToday returned a note from another day");
  if (notesToday(someNotes, '').length) fail('the-day: notesToday with no date returned notes anyway');
  if (notesToday(null, '2026-08-10').length) fail('the-day: notesToday threw on nothing');
  /* An ISO timestamp is a date too — a note saved as 2026-08-10T09:14:00Z is
     today's note, and comparing raw strings would silently drop it. */
  if (notesToday([nDay('2026-08-10T09:14:00Z', 'ts')], '2026-08-10').length !== 1) {
    fail('the-day: a note dated with a full timestamp was not counted as written today');
  }
  /* NEVER TRUNCATED BY COUNT. On a day you wrote eleven notes, eleven is
     the honest answer and a good day — the five-item cap is about things
     WAITING, and applying it here would turn a record into a scold. */
  const elevenNotes = Array.from({ length: 11 }, (_, i) => nDay('2026-08-10', 'n' + i));
  if (notesToday(elevenNotes, '2026-08-10').length !== 11) {
    fail('the-day: notesToday capped a record of work already done — the five-item cap is for things '
       + 'that are WAITING, and a day you wrote eleven notes is a good day, not an overflowing list');
  }
  if (notesTodayLine(elevenNotes, '2026-08-10') !== '11 notes written today') {
    fail('the-day: the written-today line miscounted — ' + notesTodayLine(elevenNotes, '2026-08-10'));
  }
  if (notesTodayLine([nDay('2026-08-10', 'x')], '2026-08-10') !== 'one note written today') {
    fail('the-day: a single note did not read as a sentence');
  }
  /* SILENCE ON A DAY YOU WROTE NONE. "0 notes today" is a scold and the
     four rules at the top of the-day.js exist to keep that out. */
  if (notesTodayLine([], '2026-08-10') !== '') fail('the-day: an empty day still produced a line — "0 notes" is a scold');
  if (/\b0\b|none|nothing/i.test(notesTodayLine([], '2026-08-10'))) fail('the-day: the written-today line keeps score on an empty day');

  /* AND IT MUST NOT LEAK INTO THE FIVE. */
  {
    const withNotes = theDayItems({ today: '2026-08-10', notes: elevenNotes, sparks: [], upcoming: [],
      lessons: [], curriculum: {}, books: [], read: {}, dissections: [], catalogue: [] });
    if (withNotes.some(i => /written today/i.test(i.note || ''))) {
      fail('the-day: notes written today appeared among the WAITING items — they are a record of work '
         + 'done and must not compete for the five, or the day becomes the guilt inventory again');
    }
  }
  /* ...and it must actually be rendered, or it is a pure function nobody
     calls — which is exactly where groundingFor() sat for a day. */
  {
    const ovD = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
    const codeD = ovD.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    if (!/notesToday\s*\(/.test(codeD)) fail('the-day: notesToday() is never called in overlays.js - the pathway is inert');
    /* LOOK INSIDE renderTheDay, NOT AT THE WHOLE FILE. Checking the file
       for `writtenTodayBlock()` was satisfied by the function's own
       DEFINITION, so deleting the call left the guard green — the same
       shape as the window-export check "a comment could satisfy", and the
       groundingFor() check that passed on its import line. Born dead;
       found by deleting the call on purpose. */
    const renderBody = (() => {
      const at = codeD.search(/function\s+renderTheDay\s*\(/);
      if (at < 0) return '';
      let i = codeD.indexOf('{', at), depth = 0;
      for (let j = i; j < codeD.length; j++) {
        if (codeD[j] === '{') depth++;
        else if (codeD[j] === '}') { depth--; if (!depth) return codeD.slice(i, j + 1); }
      }
      return '';
    })();
    if (!renderBody) fail('the-day: could not find renderTheDay in overlays.js - this guard has drifted');
    else if (!/writtenTodayBlock\s*\(\s*\)/.test(renderBody)) {
      fail("the-day: renderTheDay does not compose writtenTodayBlock() - today's notes are computed "
         + 'and never shown, which is the inert-pure-function bug again');
    }
    /* the reach toggle has to be ON that card - the whole point of putting
       today's notes in the day is deciding there what a resident may read */
    const body = codeD.slice(codeD.indexOf('function writtenTodayBlock'), codeD.indexOf('function renderTheDay'));
    /* Either badge function counts — the state has to be SHOWN and it has to
       be CHANGEABLE from here; which helper draws it is not the property.
       (reachState is the never-silent variant: reachBadge stays quiet on the
       default `askable`, which reads as "unknown" beside one marked Sealed.) */
    if (!/reach(Badge|State)\s*\(/.test(body) || !/toggleNoteSeal\s*\(/.test(body)) {
      fail("the-day: today's notes render without the reach control — deciding what a resident may read "
         + 'in a panel three rooms away is how a privacy control goes unused');
    }
  }

  // the door's sentence is a sentence, not a count
  if (theDayLine(dueToday) !== 'one thing is due today') fail(`the-day: theDayLine gave "${theDayLine(dueToday)}"`);
  if (theDayLine(late) !== 'something waiting to be picked back up') fail(`the-day: theDayLine gave "${theDayLine(late)}"`);
  if (/overdue|behind|late/i.test(theDayLine(late))) fail('the-day: the door sentence is still keeping score');
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

/* ---------- how a book is divided, and who divided it ----------
   data/marks.js, the foundation of the Study Table. Two rules carry the
   whole feature: a mark the reader made outranks one we guessed, and a book
   with no marks at all is still divisible — page by page — or the workroom
   refuses to open for the 88 books that find no chapters. */
{
  const { mergeMarks, unitsFor, unitAt, unitLabel } = await import('../src/game/data/marks.js');

  /* --- hand outranks detection, which is what schema.sql has always said --- */
  const detected = [{ page: 0, label: 'CHAPTER I' }, { page: 10, label: 'CHAPTER II' }];
  const hand = [{ page: 10, label: 'The Ambattha Sutta', ts: '2026-08-04' }];
  const merged = mergeMarks(detected, hand, 40);
  if (merged.length !== 2) fail(`marks: merging 2 detected + 1 hand on the same page gave ${merged.length} marks, not 2`);
  const at10 = merged.find(m => m.page === 10);
  if (!at10 || at10.label !== 'The Ambattha Sutta' || at10.source !== 'hand') {
    fail(`marks: the hand mark did not win at page 10 — got ${JSON.stringify(at10)}. schema.sql: "'hand' outranks everything, because a person who has the book open is better evidence than any heuristic"`);
  }
  if (merged[0].source !== 'detected') fail('marks: an untouched detected mark should survive a merge');

  // a hand mark where nothing was detected is simply inserted
  const inserted = mergeMarks(detected, [{ page: 25, label: 'A story I found' }], 40);
  if (inserted.length !== 3 || inserted[2].page !== 25) fail(`marks: a hand mark on an undetected page was not inserted — ${JSON.stringify(inserted.map(m => m.page))}`);

  // marking the PLACE but not the name must not throw the only label away
  const kept = mergeMarks(detected, [{ page: 10, label: '   ' }], 40);
  if (kept.find(m => m.page === 10).label !== 'CHAPTER II') {
    fail('marks: an empty hand label discarded the detected one — the person marked the place, not the name');
  }

  // saved data outlives the book it was saved against
  const stale = mergeMarks([], [{ page: 900, label: 'from a longer import' }], 40);
  if (stale.length) fail('marks: a mark past the end of the book survived — it would put the reader off the end');
  if (mergeMarks([], [{ page: -3, label: 'x' }], 40).length) fail('marks: a negative page survived');

  /* --- THE 88 BOOKS: no marks at all must still divide --- */
  const pageUnits = unitsFor(12, []);
  if (pageUnits.length !== 12) {
    fail(`marks: a book with no marks gave ${pageUnits.length} units, not 12 — the Study Table would refuse to open for the 88 books that find no chapters`);
  } else {
    // guarded, so a broken count reports its own name instead of crashing the suite on the next line
    if (pageUnits[3].from !== 3 || pageUnits[3].to !== 3) fail('marks: page-sized units are not one page each');
    if (unitLabel(pageUnits[3]) !== 'Page 4') fail(`marks: a page unit repeats itself — "${unitLabel(pageUnits[3])}"`);
  }

  /* --- units cover EVERY page, so no page falls outside the workroom --- */
  const units = unitsFor(40, merged);
  const covered = new Set();
  for (const u of units) for (let p = u.from; p <= u.to; p++) covered.add(p);
  if (covered.size !== 40) fail(`marks: units cover ${covered.size} of 40 pages — a page outside every unit is a page the workroom cannot open`);
  for (const u of units) if (u.to < u.from) fail(`marks: unit "${u.label}" runs backwards (${u.from}→${u.to})`);

  // a book whose first chapter starts late still accounts for its opening pages
  const late = unitsFor(40, [{ page: 5, label: 'CHAPTER I', source: 'detected' }]);
  if (late[0].from !== 0 || late[0].source !== 'implicit') {
    fail(`marks: pages before the first mark belong to nothing — ${JSON.stringify(late[0])}`);
  }
  if (late.length !== 2 || late[1].to !== 39) fail(`marks: the last unit does not run to the end — ${JSON.stringify(late)}`);

  /* --- where am I --- */
  if (unitAt(units, 10).label !== 'The Ambattha Sutta') fail('marks: unitAt did not find the unit containing the page');
  if (unitAt(units, 9).label !== 'CHAPTER I') fail('marks: unitAt is off by one at a boundary');
  if (unitAt(units, 999) !== null) fail('marks: unitAt invented a unit for a page past the end');
  if (unitsFor(0, []).length) fail('marks: a book with no pages produced units');
}

/* ---------- NO LIST HANDED TO A MODEL MAY GROW WITHOUT A LIMIT ----------

   The static half of every resident's prompt has been budgeted since #43, and
   all seven pass. The DYNAMIC half was never checked, and on 2026-08-04 an
   audit found three blocks with no cap at all — the paper shelf, the
   part-walked lessons, the open dissections — plus the Monk pasting all 294
   books on every message.

   What makes that class of bug nasty is the direction it grows in: the more
   the visitor had actually DONE, the heavier and slower the resident became.
   The person with most to talk about got the worst conversation.

   So this greps for the shape rather than the instance: a .map(...).join in a
   block that feeds a system prompt, with no slice bounding it. It cannot catch
   everything, but it catches the exact thing that was wrong four times. */
{
  const ov = UI_SOURCE;
  const BLOCKS = ['referenceShelfBlock', 'stewardLadderBlock', 'pastAsksBlock', 'butlerDayRead'];
  for (const name of BLOCKS) {
    const start = ov.indexOf('function ' + name + '(');
    if (start < 0) { fail(`prompt lists: ${name}() is gone — has it been renamed? This check is pointed at it.`); continue; }
    let depth = 0, end = start;
    for (let i = ov.indexOf('{', start); i < ov.length; i++) {
      if (ov[i] === '{') depth++;
      else if (ov[i] === '}') { depth--; if (!depth) { end = i; break; } }
    }
    const body = ov.slice(start, end);
    /* every list-building call must be bounded by a slice or run through the
       shared capped() helper, on the same expression */
    for (const m of body.matchAll(/([A-Za-z_$][\w$.]*)\s*\.map\s*\(/g)) {
      const name2 = m[1];
      const line = body.slice(Math.max(0, m.index - 120), m.index + 160);
      /* A list may be bounded at the map, OR where it was assigned — Sebastian
         slices `ahead` five lines earlier, and flagging that would train the
         next person to ignore this check, which is how a guard dies. */
      const boundedAtUse = /\.slice\s*\(/.test(line) || /capped\s*\(/.test(line);
      const boundedAtBirth = new RegExp('(?:const|let|var)\\s+' + name2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        + '\\s*=[^;\\n]*\\.slice\\s*\\(').test(body);
      const bounded = boundedAtUse || boundedAtBirth;
      if (!bounded) {
        fail(`prompt lists: ${name}() maps over '${m[1]}' with nothing bounding it — that block grows with how much the visitor has done, so the person with the most to talk about gets the slowest resident. Cap it and name the remainder (see capped()).`);
      }
    }
  }
}

/* ---------- NOTHING YOU WROTE IS EVER OVERWRITTEN ----------
   data/note-versions.js. The steward agreed to let an AI improve his own
   writing on one condition — that it feel like git — and the property that
   makes git safe is not branching or merging, it is that nothing written is
   ever replaced. This is the check that keeps that true, and it is the reason
   the feature is safe to build at all. */
{
  const NV = await import('../src/game/data/note-versions.js');
  const { versionsOf, currentText, addVersion, restoreVersion, hasHistory, versionSummary } = NV;

  /* a note from before versions existed is a note with one version */
  const old = { ts: '2026-07-01', text: 'what I wrote first', page: 3 };
  const v0 = versionsOf(old);
  if (v0.length !== 1 || v0[0].tag !== 'original' || v0[0].text !== 'what I wrote first') {
    fail(`note-versions: an old note did not read as a single 'original' — ${JSON.stringify(v0)}`);
  }
  if (old.versions !== undefined) fail('note-versions: versionsOf() wrote a field into a note it was only reading — an absent field is not a migration');
  if (hasHistory(old)) fail('note-versions: one version is not a history');

  /* THE INVARIANT. Improve it, restore it, improve it again — and every
     earlier version must survive, verbatim, in place. */
  const n = { ts: '2026-08-04', text: 'wu wei is not doing nothing', page: 5 };
  addVersion(n, 'Wu wei is not inaction; it is action without forcing.', 'ai-cleanup', 'steward');
  const afterFirst = versionsOf(n).map(x => x.text);
  if (afterFirst.length !== 2) fail(`note-versions: improving a note gave ${afterFirst.length} versions, not 2`);
  if (afterFirst[0] !== 'wu wei is not doing nothing') fail('note-versions: THE ORIGINAL WAS LOST when an improvement was added — this is the one thing this file exists to prevent');
  if (currentText(n) !== afterFirst[1] || n.text !== afterFirst[1]) fail('note-versions: note.text is not the current version, so every other reader of data.bookNotes is now stale');

  restoreVersion(n, 0);
  const afterRestore = versionsOf(n).map(x => x.text);
  if (afterRestore.length !== 3) fail(`note-versions: RESTORE TRUNCATED THE HISTORY (${afterRestore.length} versions) — going back must append, so that going back can itself be undone`);
  if (afterRestore[1] !== 'Wu wei is not inaction; it is action without forcing.') fail('note-versions: restoring dropped the version it was undoing');
  if (currentText(n) !== 'wu wei is not doing nothing') fail('note-versions: restore did not make the restored text current');

  /* every earlier entry, byte for byte, after all of that */
  const finalHistory = versionsOf(n);
  if (finalHistory[0].text !== 'wu wei is not doing nothing' || finalHistory[0].tag !== 'original') {
    fail(`note-versions: version 0 was mutated somewhere along the way — ${JSON.stringify(finalHistory[0])}`);
  }

  /* an improvement identical to what is already there is not an event */
  const before = versionsOf(n).length;
  addVersion(n, '  wu wei is not doing nothing  ', 'ai-cleanup');
  if (versionsOf(n).length !== before) fail('note-versions: an identical "improvement" was appended — a history full of nothing happening is one nobody reads');
  addVersion(n, '   ', 'ai-cleanup');
  if (versionsOf(n).length !== before) fail('note-versions: an empty version was appended');

  const strip = versionSummary(n);
  if (!strip[strip.length - 1].current) fail('note-versions: the history strip does not mark which version is current');
  if (strip.filter(x => x.current).length !== 1) fail('note-versions: more than one version is marked current');
}

/* ---------- a database that reads but does not write must say so ----------
   The most expensive fault class this project has: on 2026-08-04 an array
   parameter made every Records Hall write fail on the embedded home while
   the title screen showed a healthy green line the whole time, because a
   read-only ping is all it ever asked. Finding it took a hand-written probe.

   The words and the precedence are pure, so they are held to account here
   rather than through a browser. */
{
  const { backendTrouble } = await import('../src/game/data/backend-trouble.js');
  const base = { up: true, kind: 'embedded', label: 'built-in database', error: null };

  if (backendTrouble({ ...base }) !== null) fail('backend-trouble: a healthy database was reported as troubled');
  if (backendTrouble(null) !== null) fail('backend-trouble: a null status threw or reported trouble');
  if (backendTrouble({ up: false, writeError: 'x' }) !== null) {
    fail('backend-trouble: a database that is not open reported a WRITE problem — "it never opened" is a different message, and naming the write sends someone to fix the wrong thing');
  }

  const w = backendTrouble({ ...base, writeError: 'null value in column "happened"' });
  if (!w || w.kind !== 'write') fail('backend-trouble: a failed write was not reported at all — this is the silent failure the whole file exists for');
  else {
    if (!/did not save/.test(w.text)) fail('backend-trouble: the write message does not say plainly that something did not save');
    if (!/happened/.test(w.text)) fail('backend-trouble: the write message drops the actual database error, leaving nothing to act on');
    if (!/still in your save/.test(w.text)) fail('backend-trouble: the write message does not reassure that the work itself is safe — it is, and a visitor reading "did not save" will assume otherwise');
  }

  const s = backendTrouble({ ...base, schemaError: 'relation "records" does not exist' });
  if (!s || s.kind !== 'schema') fail('backend-trouble: a behind schema was not reported');

  /* PRECEDENCE. A behind-schema database usually cannot write either, so if
     both are set the write must win — naming the schema first sends someone
     to run migrations when the real fault is elsewhere. */
  const both = backendTrouble({ ...base, writeError: 'W', schemaError: 'S' });
  if (!both || both.kind !== 'write') fail('backend-trouble: with both faults set, the SCHEMA was named first — the write is the more urgent and more specific of the two');
}

/* ---------- report ---------- */
/* ---------- carrying ----------
   The one verb for "I found this here, I need it there." Pure, so the rules
   that make it worth having are held to account here rather than trusted:

     - a reference, never a copy
     - a cap on ATTENTION, and meeting it is not a silent failure
     - ONE table saying both what can be carried and where it goes down;
       two hand-written lists that must agree is rule 4's exact shape

   See plans/CARRYING-AND-WHERE-THINGS-ARE-KEPT.md. */
{
  const C = await import('../src/game/data/carrying.js');
  const bk = { kind: 'book', ref: 'dhammapada', label: 'The Dhammapada' };

  let r = C.pickUp([], bk, '2026-08-07');
  if (!r.ok || r.list.length !== 1) fail('carrying: could not pick up a book');
  if (r.list[0].label !== 'The Dhammapada') fail('carrying: the label was not kept');
  if (!C.isCarrying(r.list, 'book', 'dhammapada')) fail('carrying: isCarrying did not find what was just picked up');

  // twice is not a failure, and not two copies
  const twice = C.pickUp(r.list, bk, '2026-08-07');
  if (!twice.ok) fail('carrying: picking up something already held reported failure - a button that does nothing');
  if (twice.list.length !== 1) fail('carrying: picking up twice put two copies in the bag');

  // kind AND ref are the identity - a note and a book may share a string
  const withNote = C.pickUp(r.list, { kind: 'note', ref: 'dhammapada', label: 'A note' }, '').list;
  if (withNote.length !== 2) fail('carrying: a note was mistaken for the book of the same ref');
  const afterDown = C.setDown(withNote, 'book', 'dhammapada');
  if (afterDown.length !== 1 || afterDown[0].kind !== 'note') fail('carrying: setting down a book also set down the note');

  // rubbish is refused with a sentence, not a code
  const bad = C.pickUp([], { kind: 'sandwich', ref: 'x' }, '');
  if (bad.ok) fail('carrying: it accepted a kind that does not exist');
  if (!/[a-z]/.test(bad.reason || '')) fail('carrying: refusing something gave no sentence to put on screen');
  if (!C.pickUp([], { kind: 'book', ref: '' }, '').reason) fail('carrying: an empty ref was accepted or refused silently');

  // the cap is real, and says so
  let full = [];
  for (let i = 0; i < C.CARRY_CAP; i++) full = C.pickUp(full, { kind: 'book', ref: 'b' + i, label: 'B' + i }, '').list;
  if (full.length !== C.CARRY_CAP) fail('carrying: filled to ' + full.length + ', expected ' + C.CARRY_CAP);
  const over = C.pickUp(full, { kind: 'book', ref: 'one-too-many', label: 'X' }, '');
  if (over.ok) fail('carrying: the cap was not enforced');
  if (over.list.length !== C.CARRY_CAP) fail('carrying: a refused pick-up still changed the bag');
  if (!/set something down|pick up later/i.test(over.reason || '')) fail('carrying: a full backpack did not say what to do about it');
  /* It must REASSURE, not threaten. Checking for the WORD "lost" is not the
     same check - this message says "nothing is lost", which is the point of
     it, and the first version of this assertion failed the correct wording. */
  if (!/nothing is (ever )?lost|goes back|still (there|yours)/i.test(over.reason || '')) {
    fail('carrying: a full backpack said "' + over.reason + '" without saying nothing is lost');
  }

  // stale entries are REPORTED, never silently dropped
  const held = C.pickUp([], bk, '').list;
  if (C.stale(held, () => false).length !== 1) fail('carrying: a reference to something deleted was not reported as stale');
  if (C.stale(held, () => true).length !== 0) fail('carrying: something that still exists was called stale');

  // the HUD line is a sentence, not a count
  if (C.carryLine([]) !== '') fail('carrying: an empty backpack still said something');
  if (!/Dhammapada/.test(C.carryLine(held))) fail('carrying: one carried thing should be named, not counted');
  if (!/2 things/.test(C.carryLine(withNote))) fail('carrying: carryLine gave "' + C.carryLine(withNote) + '"');

  /* ---- "PICK UP LATER" ----------------------------------------------
     A hard cap that only ever says no is a wall. The shelf is what makes it
     a redirection instead: the cap focuses attention, it does not ration
     what you own.

     THE SHELF IS NOT THE BAG. It is outside the cap, and it is outside the
     grounding - a note set aside for later is NOT something a resident may
     see. "What you carry is what a resident can see" has to stay literally
     true or it is a slogan. */
  let bag = [];
  for (let i = 0; i < C.CARRY_CAP; i++) bag = C.pickUp(bag, { kind: 'book', ref: 'f' + i, label: 'F' + i }, '').list;
  const refused = C.pickUp(bag, { kind: 'book', ref: 'extra', label: 'Extra' }, '');
  if (refused.ok) fail('carrying: the cap did not hold');
  if (!refused.canSetAside) fail('carrying: a full backpack refused without offering the shelf - that is a wall');
  if (!/pick up later/i.test(refused.reason || '')) fail('carrying: the refusal never mentions the shelf');
  if (!/nothing is ever lost|nothing is lost/i.test(refused.reason || '')) fail('carrying: the refusal does not reassure');

  const shelved = C.setAside(bag, { kind: 'book', ref: 'extra', label: 'Extra' }, '');
  if (!shelved.ok) fail('carrying: could not set something aside when the bag was full');
  if (C.carried(shelved.list).length !== C.CARRY_CAP) fail('carrying: the shelf counted against the cap');
  if (C.setAsideList(shelved.list).length !== 1) fail('carrying: the shelved thing is not on the shelf');
  /* THE CAP MUST *USE* carried(), not the raw array. Checking carried() here
     proves nothing about pickUp - broken on purpose 2026-08-07 by pointing
     the cap at the raw list, and the first version of these checks passed
     anyway. So: with things ON the shelf, a bag with room must still accept. */
  let mixed = [];
  for (let i = 0; i < C.CARRY_CAP - 1; i++) mixed = C.pickUp(mixed, { kind: 'book', ref: 'm' + i, label: 'M' + i }, '').list;
  for (let i = 0; i < 5; i++) mixed = C.setAside(mixed, { kind: 'book', ref: 's' + i, label: 'S' + i }, '').list;
  const lastSlot = C.pickUp(mixed, { kind: 'book', ref: 'final', label: 'Final' }, '');
  if (!lastSlot.ok) fail('carrying: a shelf of 5 stole the last slot in the bag - the cap is counting the shelf');
  if (C.carried(lastSlot.list).length !== C.CARRY_CAP) fail('carrying: the bag did not fill to the cap');
  if (C.isCarrying(shelved.list, 'book', 'extra')) fail('carrying: something on the shelf reported as IN HAND');
  if (!C.isSetAside(shelved.list, 'book', 'extra')) fail('carrying: isSetAside cannot find what was just shelved');

  // THE PRIVACY CONSEQUENCE, and it is the one that matters
  const shelvedNote = C.setAside([], { kind: 'note', ref: 'private-one', label: 'A note' }, '').list;
  if (C.groundingFor(shelvedNote).length !== 0) {
    fail('carrying: A NOTE ON THE SHELF REACHED THE GROUNDING - what you carry is what a resident sees');
  }
  if (C.carriedOf(shelvedNote, 'note').length !== 0) fail('carrying: carriedOf counted a shelved note');

  // and back off the shelf again
  const roomy = C.setDown(shelved.list, 'book', 'f0');
  const took = C.takeUp(roomy, 'book', 'extra');
  if (!took.ok) fail('carrying: could not take something back off the shelf once there was room: ' + took.reason);
  if (!C.isCarrying(took.list, 'book', 'extra')) fail('carrying: it came off the shelf but not into the bag');
  if (C.setAsideList(took.list).length !== 0) fail('carrying: it is on the shelf AND in the bag');
  const stillFull = C.takeUp(shelved.list, 'book', 'extra');
  if (stillFull.ok) fail('carrying: taking something up ignored the cap');
  if (!/full/i.test(stillFull.reason || '')) fail('carrying: taking up past the cap gave no reason');
  if (!C.takeUp([], 'book', 'nope').reason) fail('carrying: taking up something not on the shelf said nothing');

  // the line mentions the shelf only when there is something on it
  if (/pick up later/i.test(C.carryLine(bag))) fail('carrying: an empty shelf was announced');
  if (!/to pick up later/i.test(C.carryLine(shelved.list))) fail('carrying: a full shelf went unmentioned');

  /* ONE TABLE, DERIVED BOTH WAYS. canAccept must answer from KINDS itself, so
     a new kind works everywhere its places already exist with nothing else
     edited. And PLACES must be DERIVED from KINDS rather than listed beside
     it, or the two drift - which is how hideAllOv(), the window exports and
     the resident roster each broke. Broken on purpose 2026-08-07 by replacing
     PLACES with a hand-written list missing one entry. */
  for (const k of C.KIND_KEYS) {
    if (!C.KINDS[k].places.length) fail('carrying: kind ' + k + ' can be put down nowhere - a dead end');
    for (const pl of C.KINDS[k].places) {
      if (!C.canAccept(pl, k)) fail('carrying: KINDS says ' + k + ' goes to ' + pl + ', canAccept disagrees');
      if (!C.PLACES.includes(pl)) fail('carrying: ' + pl + ' is a place no PLACES list knows - derived from what?');
    }
    if (!C.KINDS[k].icon || !C.KINDS[k].label) fail('carrying: kind ' + k + ' has no icon or label to show');
  }
  if (C.canAccept('studyTable', 'sandwich')) fail('carrying: canAccept said yes to a kind that does not exist');
  if (C.canAccept('nowhere', 'book')) fail('carrying: canAccept said yes to a place no kind names');

  // grounding is the carried set, filtered - never more than you are holding
  const g = C.groundingFor(withNote, ['book']);
  if (g.length !== 1 || g[0].kind !== 'book') fail('carrying: groundingFor did not narrow to the asked kinds');
  if (C.groundingFor(withNote).length !== withNote.length) fail('carrying: grounding with no filter changed the set');
  if (C.groundingFor(null).length !== 0) fail('carrying: groundingFor threw on an empty backpack');

  /* THE REAL BOUND IS TOKENS, NOT ITEMS (2026-08-08). Twenty is a bound on
     attention and the right one for a person; it is not a bound on a context
     window, where twenty notes is nothing and twenty books is a catastrophe.
     The uncapped-prompt bug has been fixed three times and every instance was
     a list capped by COUNT or not at all. */
  const size = s => s.length;
  const fit = C.fitToBudget(['aaa', 'bbb', 'ccc', 'ddd'], size, 7);
  if (fit.kept.length !== 2 || fit.dropped.length !== 2) {
    fail('carrying: fitToBudget kept ' + fit.kept.length + ' of 4 at a budget of 7 - expected 2');
  }
  if (fit.used !== 6) fail('carrying: fitToBudget miscounted what it used - ' + fit.used);
  if (C.fitToBudget(['aa'], size, 100).dropped.length) fail('carrying: fitToBudget dropped something that fitted');
  /* THE FIRST ONE IS ALWAYS KEPT. A grounding block that came back EMPTY
     because the single carried book had a long title is the silent failure
     this file exists to prevent - better one oversized entry and an honest
     word about it. */
  const huge = C.fitToBudget(['x'.repeat(500), 'y'], size, 10);
  if (!huge.kept.length) fail('carrying: fitToBudget returned NOTHING because the first item was over budget');
  if (!huge.over) fail('carrying: fitToBudget did not report that it went over on a single oversized item');
  if (huge.dropped.length !== 1) fail('carrying: fitToBudget kept a second item after already being over');
  if (C.fitToBudget(null, size, 10).kept.length) fail('carrying: fitToBudget threw on nothing');
  if (C.fitToBudget(['a'], null, 10).kept.length !== 1) fail('carrying: fitToBudget threw with no sizer');
  if (C.fitToBudget(['a', 'b'], () => NaN, 10).kept.length !== 2) fail('carrying: a NaN size was not treated as zero');

  /* AND THE ONE THAT WOULD HAVE CAUGHT THE REAL BUG.

     groundingFor() was written, tested and documented on 2026-08-07 and had
     NO CALLER ANYWHERE until 2026-08-08. carrying.js said "what you carry is
     what a resident can see"; visibility.js said the backpack "is the one
     store a resident is allowed to read"; no resident read it. Every unit
     test above passed the whole time, because a pure function with no caller
     is perfectly testable and completely inert. */
  const rtext = readFileSync(new URL('../src/game/ui/residents.js', import.meta.url), 'utf8');

  /* THE CHECK ITSELF WAS BORN DEAD TWICE, and both were caught by breaking it
     on purpose (2026-08-08).

     ONE: it grepped the WHOLE FILE for `groundingFor(`. Deleting the call left
     the name in the import line and in three comments, so it passed while the
     backpack was not being read at all - verbatim the window-export check "a
     comment could satisfy" from CLAUDE.md rule 3.

     TWO: the fix stripped string literals as well as comments, and could not
     parse a REGEX LITERAL. `.replace(/"/g,"'")` in the Monk's prompt reads as
     a string opening at `/"`; the scanner desynchronised, silently swallowed
     two hundred and fifty lines including the Monk's own `+carriedBlock()`,
     and reported a real composition missing.

     So: comments out, strings LEFT IN, look inside the FUNCTION BODY, and make
     a mis-parse loud. A guard that parses has to be held to the same standard
     as the thing it guards - the prompt-budget guard that read apostrophes in
     comments as quotes is the same lesson. */
  const bodyOf = (src, name) => {
    const at = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
    if (at < 0) return '';
    let i = src.indexOf('{', at), depth = 0;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (!depth) return src.slice(i, j + 1); }
    }
    return '';
  };
  const codeOnly = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  /* A stripper that eats code turns every check below into a report about
     garbage, in either direction. So make a mis-parse LOUD rather than quiet. */
  for (const anchor of ['function carriedBlock', 'const CHAT_AGENTS', 'errorLine', 'systemPrompt']) {
    if (!codeOnly(rtext).includes(anchor)) {
      fail('smoke: the comment-stripper in the backpack guard ate real code (lost "' + anchor
         + '") - every assertion built on it is now meaningless');
    }
  }

  const linesBody = codeOnly(bodyOf(rtext, 'carriedLines'));
  const blockBody = codeOnly(bodyOf(rtext, 'carriedBlock'));
  if (!linesBody || !blockBody) fail('smoke: could not find carriedLines/carriedBlock in residents.js - this guard has drifted');

  if (!/groundingFor\s*\(/.test(linesBody)) {
    fail('THE BACKPACK IS NOT GROUNDING. carriedLines() does not call groundingFor() - '
       + 'carrying.js promises "what you carry is what a resident can see" and no resident reads the bag. '
       + 'That was true, silently, for a whole day.');
  }
  if (!/fitToBudget\s*\(/.test(blockBody) || !/estimateTokens\s*\(/.test(blockBody)) {
    fail('carriedBlock() is not bounded by fitToBudget(estimateTokens) - an uncapped grounding block '
       + 'is the uncapped-prompt bug in a fourth costume, and a second way of measuring is a second '
       + 'thing to be wrong');
  }
  /* A sealed note must be filtered where the block is BUILT, not only caught
     by privacyLeaks() on the way out. A guard that is the only thing between
     a sealed note and a model is one edit away from being what failed. */
  if (!/mayReachNote\s*\(/.test(linesBody)) {
    fail('carriedLines() does not check note-reach - a SEALED note in the backpack would be '
       + 'built straight into a prompt');
  }
  /* ...and the block has to actually reach a resident. All of the above can be
     perfect in a function nobody composes into a prompt - which is exactly the
     state groundingFor() itself was in for a day. */
  /* THE BACKPACK REACHES EVERY RESIDENT NOW, through pathwayBlock(). Kept as a
     check that carriedBlock is composed AT ALL; the per-resident coverage is
     the much stronger guard in the next block. */
  const composed = (codeOnly(rtext).match(/carriedBlock\s*\(\)/g) || []).length;
  if (composed < 2) {
    fail('carriedBlock() is composed ' + composed + ' time(s) - a grounding block nobody '
       + 'composes is the inert-pure-function bug again.');
  }
}

/* ---------- ONE PATHWAY, N BEHAVIOURS - measured, not asserted ----------

   data/lookup.js has claimed since 2026-08-07 that "every resident reaches the
   Library the same way ... what differs is what the role DOES with the result."

   MEASURED ON 2026-08-08 IT WAS 2 OUT OF 7. Only Quill and the Monk could
   reach the Library, the backpack or the visitor's notes. The Investigator -
   whose stated duty is "insists on evidence someone else could check" - could
   not look up a single book. Five residents answered from the model's own
   memory and nothing else.

   The cause was that each systemPrompt() composed its grounding BY HAND, so a
   resident had a pathway only if someone remembered to add the line. Seven
   hand-maintained lists is rule 4's exact shape and it drifted exactly the way
   hideAllOv(), the window exports and the overlays map all did.

   So this guard is the property itself: EVERY role in roles.js has a lens, and
   EVERY resident with a systemPrompt goes through the one pathway. It is not
   possible to add an assistant that quietly cannot look anything up. */
{
  const { ROLES, ROLE_KEYS } = await import('../src/game/data/roles.js');
  const src = readFileSync(new URL('../src/game/ui/residents.js', import.meta.url), 'utf8');
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  for (const anchor of ['function pathwayBlock', 'const CHAT_AGENTS']) {
    if (!code.includes(anchor)) fail('smoke: the pathway guard\'s comment-stripper ate real code (lost "'
      + anchor + '") - every assertion below it is meaningless');
  }

  /* 0 - EVERY RESIDENT HAS A DOOR OF THEIR OWN.

     overlays.js calls talkTo() "ONE opener for every chat resident". It was
     true for four of seven: the Tutor, the Investigator and the Computer had
     no `chat` entry, so talkTo() returned silently and a colleague's handoff
     could NAME them without being able to open them. Found 2026-08-08 when a
     live suite tried to talk to each resident in turn and three of them
     quietly kept talking to the previous one.

     Same shape as the pathway being 2-of-7, one layer up: a rule stated once
     and true for some. `open` stays whatever room is richest; this is the
     plain door. */
  for (const k of ROLE_KEYS) {
    const r = ROLES[k];
    if (!r.chat || !r.chat.name || !r.chat.line) {
      fail(`roles.js: '${k}' has no chat door, so talkTo('${k}') does nothing and a handoff to `
         + `them cannot be opened. Every resident with a prompt needs one.`);
    }
    if (!r.open) fail(`roles.js: '${k}' has no opener, so a handoff can name them but not reach them`);
  }

  // 1 - every role declares what it DOES with what it finds
  for (const k of ROLE_KEYS) {
    const lens = ROLES[k].lens;
    if (!lens || lens.length < 20) {
      fail(`roles.js: '${k}' has no lens. The pathway is the same for everyone, so the lens is the `
         + `ONLY thing that makes this role different from a voice.`);
    }
    if (lens && lens.length > 260) {
      fail(`roles.js: '${k}'s lens is ${lens.length} chars - it is meant to be a sentence about what `
         + `to DO, not a rulebook. Every word is paid for on every message, forever.`);
    }
  }

  // 2 - one road: nobody hand-composes grounding any more
  const agentBodies = {};
  {
    const start = code.indexOf('const CHAT_AGENTS = {');
    const body = code.slice(start);
    for (const m of body.matchAll(/^  ([a-z]+):\{$/gm)) {
      let i = body.indexOf('{', m.index), depth = 0;
      for (let j = i; j < body.length; j++) {
        if (body[j] === '{') depth++;
        else if (body[j] === '}') { depth--; if (!depth) { agentBodies[m[1]] = body.slice(i, j); break; } }
      }
    }
  }
  const found = Object.keys(agentBodies);
  if (found.length < 7) fail(`smoke: only parsed ${found.length} residents out of CHAT_AGENTS - this guard has drifted`);

  for (const k of found) {
    if (!ROLE_KEYS.includes(k)) continue;               // roles.js coverage is checked elsewhere
    if (!new RegExp(`pathwayBlock\\s*\\(\\s*['"]${k}['"]`).test(agentBodies[k])) {
      fail(`THE PATHWAY IS NOT UNIVERSAL: '${k}' does not call pathwayBlock('${k}'). `
         + `On 2026-08-08 five of seven residents could not look up a book, see the backpack, or `
         + `search a note, because each prompt composed its own grounding by hand.`);
    }
    /* ...and NOT by hand as well. A resident that calls the pathway and then
       adds its own copy of a block is the drift starting again, one line at a
       time, and it double-charges the visitor for the same tokens. */
    for (const dup of ['carriedBlock', 'referenceShelfBlock', 'libraryLookupBlock', 'notesLookupBlock']) {
      if (new RegExp(`\\+\\s*(await\\s+)?${dup}\\s*\\(`).test(agentBodies[k])) {
        fail(`'${k}' composes ${dup}() by hand as well as going through pathwayBlock() - `
           + `that is the seven-hand-maintained-lists problem growing back.`);
      }
    }
  }

  // 3 - the pathway actually carries the whole road, and ends with the lens
  const pw = (() => {
    const at = code.search(/function\s+pathwayBlock\s*\(/);
    let i = code.indexOf('{', at), depth = 0;
    for (let j = i; j < code.length; j++) {
      if (code[j] === '{') depth++;
      else if (code[j] === '}') { depth--; if (!depth) return code.slice(i, j + 1); }
    }
    return '';
  })();
  for (const part of ['libraryLookupBlock', 'carriedBlock', 'notesLookupBlock',
                      'referenceShelfBlock', 'referenceBlock', 'lensBlock', 'trainingBlock',
                      'passagesFor', 'reachGapBlock']) {
    if (!new RegExp(part + '\\s*\\(').test(pw)) {
      fail(`pathwayBlock() no longer includes ${part}() - a resident silently lost part of the one road`);
    }
  }
  /* ...AND THE RESULT MUST BE CONCATENATED, not merely computed. A sabotage that
     deleted `+ reach` from the return left reachGapBlock() called, its value
     assigned, and the sentence never reaching the model - green on every check
     above. Same disease as the other born-dead guards this week: the mention
     survived. So each part is checked for a `+` join too. */
  for (const [v, fn] of [['reach', 'reachGapBlock'], ['pass', 'passagesFor'],
                         ['lookup', 'libraryLookupBlock'], ['notes', 'notesLookupBlock']]) {
    if (!new RegExp('\\+\\s*' + v + '\\b').test(pw) && !new RegExp('\\(\\s*' + v + '\\s*\\|\\|').test(pw)) {
      fail(`pathwayBlock() computes ${fn}() into \`${v}\` and never adds it to what it returns - the `
         + `block is built on every message and thrown away.`);
    }
  }

  /* ---------- 4 - WHAT EACH ROLE DECLARES, CHECKED BOTH WAYS ----------

     Added 2026-08-10 with `grounding: [...]`. The inversion of 2026-08-08
     ("everyone gets everything") fixed the 2-of-7 bug and was free only while
     every block was cheap. Retrieval ends that, so a role opts out of what it
     cannot use — and the moment opting out is possible, TWO new silent
     failures become possible, so both are checked:

       a role that declares nothing        -> would inherit everything, which
                                              is the thing declaring is for
       a kind nobody implements            -> a declaration that does nothing,
                                              this project's oldest bug shape

     And the floor, which is the 2-of-7 bug made unrepeatable: shelves, carried
     and notes are THE pathway. A role may decline an enrichment; it may not
     decline the road. */
  const { GROUNDING_KINDS, FULL_PATHWAY } = await import('../src/game/data/roles.js');
  const FLOOR = ['shelves', 'carried', 'notes'];
  const ovCode2 = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  for (const k of ROLE_KEYS) {
    const g = ROLES[k].grounding;
    if (!Array.isArray(g) || !g.length) {
      fail(`roles.js: '${k}' declares no grounding. Absent must not mean "everything" - that is `
         + `exactly how the Computer would end up being handed a page of Walden.`);
      continue;
    }
    for (const kind of g) {
      if (!GROUNDING_KINDS.includes(kind)) {
        fail(`roles.js: '${k}' declares grounding kind '${kind}', which is not in GROUNDING_KINDS. `
           + `It would be silently ignored by pathwayBlock().`);
      }
    }
    for (const need of FLOOR) {
      if (!g.includes(need)) {
        fail(`roles.js: '${k}' does not declare '${need}'. Those three ARE the pathway - on `
           + `2026-08-08 five of seven residents could not reach them and answered from the `
           + `model's own memory. A role may decline an enrichment, never the road.`);
      }
    }
    if (new Set(g).size !== g.length) fail(`roles.js: '${k}' declares a grounding kind twice`);
  }

  /* THE OTHER DIRECTION: every kind in the vocabulary must actually be
     consulted by the composer. Break it by adding a word to GROUNDING_KINDS
     and nothing else - the declaration would read fine and do nothing. */
  for (const kind of GROUNDING_KINDS) {
    if (kind === 'training') {
      if (!/ROLES\s*\[\s*key\s*\]\s*\|\|\s*\{\}\s*\)\s*\.training/.test(pw + code)) {
        fail(`roles.js declares a 'training' kind and residents.js never reads ROLES[key].training`);
      }
      continue;
    }
    if (!new RegExp(`wants\\s*\\(\\s*key\\s*,\\s*['"]${kind}['"]\\s*\\)`).test(pw)) {
      fail(`GROUNDING_KINDS lists '${kind}' and pathwayBlock() never asks wants(key,'${kind}') - `
         + `every role declaring it would be declaring nothing.`);
    }
  }
  if (!FULL_PATHWAY.every(k => GROUNDING_KINDS.includes(k))) {
    fail('roles.js: FULL_PATHWAY names a kind that is not in GROUNDING_KINDS');
  }
  /* `wants()` must FAIL CLOSED. A role with no declaration getting everything
     is the exact regression this whole section prevents, and a missing `return
     false` would restore it while every check above still passed. */
  const wantsBody = (() => {
    const at = code.search(/function\s+wants\s*\(/);
    if (at < 0) return '';
    let i = code.indexOf('{', at), depth = 0;
    for (let j = i; j < code.length; j++) {
      if (code[j] === '{') depth++;
      else if (code[j] === '}') { depth--; if (!depth) return code.slice(i, j + 1); }
    }
    return '';
  })();
  if (!wantsBody) fail('smoke: could not find wants() in residents.js - the fail-closed check has drifted');
  else if (!/if\s*\(\s*!Array\.isArray\(\s*g\s*\)\s*\)\s*\{[\s\S]*?return false;/.test(wantsBody)) {
    fail('wants() does not fail closed on a role with no declaration - an undeclared role would '
       + 'silently inherit the whole pathway, including retrieval');
  }

  /* ---------- 5 - A RESIDENT'S OWN BOOK, DECLARED AND REAL ----------
     `training` moved out of a hardcoded butlerTrainingBlock() on 2026-08-10.
     A move is where text gets silently dropped, so the actual Beeton is
     checked - not merely that Sebastian has *a* training entry. */
  for (const k of ROLE_KEYS) {
    const t = ROLES[k].training;
    const declared = (ROLES[k].grounding || []).includes('training');
    if (t && !declared) {
      fail(`roles.js: '${k}' has a training text and does not declare 'training' - it would never `
         + `reach the prompt, which is a book written and handed to nobody`);
    }
    if (declared && !t) {
      fail(`roles.js: '${k}' declares 'training' and has no training text - an empty promise`);
    }
    if (!t) continue;
    if (!t.book || !Array.isArray(t.lines) || !t.lines.length) {
      fail(`roles.js: '${k}'s training must NAME the book and carry real lines - unnamed grounding `
         + `cannot be checked by the person it is quoted at`);
    }
    /* Paid for on every message, forever. Four sentences of real Beeton beat a
       chapter; a chapter would push a resident past budget for nothing. */
    const chars = (t.lines || []).join(' ').length;
    if (chars > 1400) {
      fail(`roles.js: '${k}'s training is ${chars} chars - it is meant to be a few quoted sentences, `
         + `and every one of them is paid for on every single message`);
    }
  }
  /* ---------- 6 - RETRIEVAL IS CAPPED, CARRIED-ONLY, AND OPT-IN ----------

     "Retrieve the relevant fragment, NEVER the corpus" is the rule
     data/retrieval.js was written to obey, and until 2026-08-10 it had one
     caller (a panel a person is looking at). Handing the same block to a
     resident on EVERY MESSAGE is a different proposition, so the cap is the
     load-bearing part and it is checked before anything else about it. */
  {
    const R = await import('../src/game/data/retrieval.js');
    if (!(R.RESIDENT_PASSAGE_CAP > 0)) fail('retrieval: there is no resident passage cap at all');
    if (R.RESIDENT_PASSAGE_CAP > 4000) {
      fail(`retrieval: RESIDENT_PASSAGE_CAP is ${R.RESIDENT_PASSAGE_CAP} characters. The heaviest `
         + `resident's whole prompt is under 10,000, so this stops being "the relevant fragment" `
         + `and becomes the catalogue bug in a fifth costume.`);
    }
    /* The cap must be OBEYED, not merely declared - a constant nobody enforces
       is the shape this whole session keeps finding. Give passagesBlock() far
       more than it may use and check what comes back. */
    const fat = Array.from({ length: 20 }, (_, i) =>
      ({ page: i, score: 1, matched: 1, text: 'x'.repeat(2000), snippet: 'y'.repeat(2000) }));
    const capped = R.passagesBlock(fat, { cap: R.RESIDENT_PASSAGE_CAP });
    if (capped.length > R.RESIDENT_PASSAGE_CAP + 2200) {
      fail(`retrieval: passagesBlock ignored its cap - asked for ${R.RESIDENT_PASSAGE_CAP}, got ${capped.length}`);
    }
    if (!capped.length) fail('retrieval: passagesBlock returned nothing when given real hits');

    /* THE PAGE CACHE. Required, not a nicety: paginating a 563 KB book per
       message is real CPU on a machine whose limit is cooling. */
    if (typeof R.pagesOf !== 'function') fail('retrieval: pagesOf() is gone - every message re-paginates the book');
    else {
      R.clearPageCache();
      const text = Array.from({ length: 40 }, (_, i) => 'para ' + i + ' ' + 'w'.repeat(300)).join('\n\n');
      const a = R.pagesOf('bk', text, 'inline');
      const b = R.pagesOf('bk', text, 'inline');
      if (a !== b) fail('retrieval: pagesOf() returned a fresh array for an identical book - the cache is not caching');
      if (R.pageCacheSize() !== 1) fail('retrieval: pagesOf() stored ' + R.pageCacheSize() + ' entries for one book');
      /* MULTI-SLOT. A single slot thrashes between two carried books, which is
         worse than no cache because it pays the eviction as well as the work. */
      for (let i = 0; i < 3; i++) R.pagesOf('bk' + i, text + i, 'inline');
      if (R.pageCacheSize() < 3) fail('retrieval: the page cache holds fewer than 3 books - the backpack holds more');
      const again = R.pagesOf('bk', text, 'inline');
      if (again !== a) fail('retrieval: a second carried book evicted the first - that is a one-slot cache with extra steps');
      // ...and bounded, or it is a memory leak holding whole books
      for (let i = 0; i < 12; i++) R.pagesOf('flood' + i, text + i, 'inline');
      if (R.pageCacheSize() > 6) fail('retrieval: the page cache is unbounded at ' + R.pageCacheSize() + ' whole books');
      R.clearPageCache();
      // a book of a DIFFERENT LENGTH must not keep the old division
      const p1 = R.pagesOf('bk', text, 'inline');
      const p2 = R.pagesOf('bk', text + '\n\nan extra paragraph entirely', 'inline');
      if (p1 === p2) fail('retrieval: a re-imported book of a different length reused the old pagination');
      R.clearPageCache();
    }

    /* CARRIED BOOKS ONLY - the backpack is the boundary that makes reading a
       whole book into a prompt legitimate at all. */
    const pfBody = (() => {
      const at = code.search(/async\s+function\s+passagesFor\s*\(/);
      if (at < 0) return '';
      let i = code.indexOf('{', at), depth = 0;
      for (let j = i; j < code.length; j++) {
        if (code[j] === '{') depth++;
        else if (code[j] === '}') { depth--; if (!depth) return code.slice(i, j + 1); }
      }
      return '';
    })();
    if (!pfBody) fail('smoke: could not find passagesFor() in residents.js - the retrieval guards have drifted');
    else {
      if (!/groundingFor\s*\(\s*carryList\s*\(\s*\)/.test(pfBody)) {
        fail('passagesFor() does not draw from the backpack via groundingFor(carryList()) - reading a '
           + 'whole book into a prompt is only legitimate because a PERSON put it there');
      }
      /* THE ASSIGNMENT, NOT THE MENTION. `let left=999999` while the constant
         still appeared in the receipt line passed the first version of this
         check. That is the FOURTH born-dead guard of this session and all four
         died identically - a leftover reference to the guarded thing satisfied
         the pattern. Assume it every time: check the statement, not the word. */
      if (!/left\s*=\s*RESIDENT_PASSAGE_CAP/.test(pfBody)) {
        fail('passagesFor() does not start its budget at RESIDENT_PASSAGE_CAP - the cap is the only '
           + 'thing between "the relevant fragment" and pasting the corpus');
      }
      if (!/\.slice\s*\(\s*0\s*,\s*RESIDENT_PASSAGE_BOOKS\s*\)/.test(pfBody)) {
        fail('passagesFor() no longer slices the bag to RESIDENT_PASSAGE_BOOKS - the backpack holds 20');
      }
      /* ONE ROAD TO KNOWLEDGE, THIRD TIME. retrieval.js keeps a deliberately
         SMALL stopword list, which is right for the Science Hall and wrong for
         a conversation: handed "do you have anything by hildegard of bingen" it
         kept `do`, `have` and `anything`, and retrieved two pages of Walden for
         a question about Hildegard. Found by the live suite, 2026-08-10. */
      if (/searchPages\s*\(\s*pages\s*,\s*q\s*[,)]/.test(pfBody)) {
        fail('passagesFor() searches on the RAW QUESTION. retrieval.js\'s stopword list is small on '
           + 'purpose, so conversational filler becomes a search term and the resident is handed '
           + 'pages that merely contain "have". Use the shared lookupTerms/groundingPlan terms.');
      }
      if (!/groundingPlan\s*\(/.test(pfBody)) {
        fail('passagesFor() does not derive its terms from groundingPlan() - a second term extractor '
           + 'is free to disagree with the two that already exist');
      }
      if (!/if\s*\(\s*d\s*\)\s*d\.passages\s*=/.test(pfBody)) {
        fail('passagesFor() does not stash what it included on d.passages - a resident that quietly '
           + 'read three pages of your book is the invisible grounding the backpack exists to prevent');
      }
    }
    /* ...and the stash must be READ. A receipt nobody renders is the callerless
       shape again, on the one block that most needs to be visible.
       THE DEFINITION IS STRIPPED FIRST: `function passagesReceipt(d){` matches
       any naive "is it called" pattern, so deleting the only call site left the
       first version of this check green. */
    const ovNoDefs = ovCode2.replace(/function\s+passagesReceipt\s*\([^)]*\)/g, ' ');
    if (!/function passagesReceipt/.test(ovCode2)) {
      fail('overlays.js no longer defines passagesReceipt()');
    }
    if (!/passagesReceipt\s*\(\s*d\s*\)/.test(ovNoDefs)) {
      fail('overlays.js defines passagesReceipt() and never calls it - the pages read from the '
         + 'visitor\'s own book would go unreported, which is the invisible grounding the backpack '
         + 'exists to prevent');
    }
    /* OPT-IN, and the Computer must not have it: its lens is "names, counts, the
       command that opens it", which a page of prose directly contradicts. */
    if ((ROLES.computer.grounding || []).includes('passages')) {
      fail('roles.js: the Computer declares `passages`. A page of prose out of a carried book is the '
         + 'opposite of its own lens, and it is the resident this whole declaration mechanism was '
         + 'built to keep it away from.');
    }
    const withPassages = ROLE_KEYS.filter(k => (ROLES[k].grounding || []).includes('passages'));
    if (!withPassages.length) fail('roles.js: NOBODY declares `passages` - retrieval is built and reaches no one, '
      + 'which is exactly the state it was in before today');
    for (const k of ['quill', 'monk', 'tutor', 'investigator']) {
      if (!withPassages.includes(k)) {
        fail(`roles.js: '${k}' works with book text and does not declare 'passages' - carry a book to `
           + `them and they still cannot quote a line of it`);
      }
    }
  }

  {
    const beeton = ((ROLES.sebastian.training || {}).lines || []).join(' ');
    for (const quote of ['very great trust', 'honesty is the best policy',
                         'superintend the other servants', 'Early rising']) {
      if (!beeton.includes(quote)) {
        fail(`roles.js: Sebastian's Beeton lost "${quote}" in the move out of residents.js. `
           + `His training is quoted, not paraphrased, precisely so a visitor can check it.`);
      }
    }
    if (!/Beeton/.test(ROLES.sebastian.training.book)) {
      fail('roles.js: Sebastian\'s training no longer names Beeton');
    }
    /* ...and it must be GONE from where it was, or the move made two copies. */
    if (/function\s+butlerTrainingBlock/.test(code)) {
      fail('residents.js still defines butlerTrainingBlock() - the training text now lives in '
         + 'roles.js, and two copies of it is the drift roles.js exists to stop');
    }
  }
}

/* ---------- daily tasks: what you sat down to do TODAY ----------------
   Named by the steward 2026-08-08 - "we can call it daily tasks instead of
   missions, you cant do missions unless you graduate lol".

   The day boundary is a FRAMING DEVICE, not a stick: it exists so you scope
   the work to a size you can finish, and so a big goal gets eaten one sitting
   at a time. Nothing here is ever "overdue", and these tests hold that as
   firmly as they hold the arithmetic. */
{
  const T = await import('../src/game/data/daily-tasks.js');
  const y = '2026-08-07', d = '2026-08-08', tm = '2026-08-09';
  const mk = (over) => ({ id: 1, title: 'Tesla', taken: d,
    steps: [{ text: 'get the book', where: 'world', done: true },
            { text: 'read it', where: 'read', ref: 'x', done: false }], ...over });

  // TODAY, computed on read - never a timer, nothing moves by itself
  if (!T.isToday(mk(), d)) fail('daily-tasks: today\'s task did not read as today\'s');
  if (T.isToday(mk(), tm)) fail('daily-tasks: YESTERDAY\'S TASK IS STILL LIVE - the date is the whole mechanic');
  if (T.isToday(mk({ closed: true }), d)) fail('daily-tasks: a closed task still read as active');
  if (T.activeTask([], d)) fail('daily-tasks: found an active task in an empty list');
  if (!T.activeTask([mk()], d)) fail('daily-tasks: activeTask missed today\'s');
  /* TWO LOWER HALVES, NOT ONE. Work finished TODAY was appearing under a
     heading reading "Before today", with its own date printed underneath
     contradicting it — found by reading the screenshot, 2026-08-08. A closed
     task is not `isToday` (isToday requires !closed), so everything
     not-active fell into one bucket and the heading became a quiet lie. */
  if (T.beforeToday([mk()], d).length) fail('daily-tasks: today\'s task appeared under "before today"');
  if (T.beforeToday([mk()], tm).length !== 1) fail('daily-tasks: yesterday\'s task is not in the before-today list');
  if (T.earlierToday([mk()], d).length) fail('daily-tasks: an OPEN task counted as already done today');
  if (T.earlierToday([mk({ closed: true })], d).length !== 1) fail('daily-tasks: work finished today is not listed as done today');
  if (T.beforeToday([mk({ closed: true })], d).length) {
    fail('daily-tasks: work finished TODAY was filed under BEFORE today - the heading would contradict the date on the card');
  }

  // ONE AT A TIME, refused with a SENTENCE rather than a silent no-op
  const blocked = T.canTake([mk()], d);
  if (blocked.ok) fail('daily-tasks: a second task was allowed while one was live - that is a second to-do list');
  if (!/finish|set it down|already/i.test(blocked.reason || '')) {
    fail('daily-tasks: the refusal is not a sentence a person could read - "' + blocked.reason + '"');
  }
  if (!T.canTake([mk()], tm).ok) fail('daily-tasks: could not take a task the day after');
  if (!T.canTake([], d).ok) fail('daily-tasks: could not take the first task at all');

  if (T.stepsDone(mk()) !== 1) fail('daily-tasks: stepsDone miscounted');
  if (T.allDone(mk())) fail('daily-tasks: allDone true with a step outstanding');
  if (!T.allDone({ steps: [{ done: true }] })) fail('daily-tasks: allDone false when everything is ticked');
  if (T.allDone({ steps: [] })) fail('daily-tasks: an empty task counted as finished');

  /* CLOSING OUT, and BOTH HALVES. A record that lists only failures is the
     guilt inventory the-day.js exists to prevent; one that lists only wins is
     a lie. Two of four done is a day you did two things. */
  const one = T.closeOut([mk()], tm);
  if (one.entries.length !== 1) fail('daily-tasks: yesterday was not written into the log');
  const e = one.entries[0];
  if (e.dayKey !== d) fail('daily-tasks: the record landed on the wrong day - ' + e.dayKey);
  if (!/1 of 2 done/.test(e.entry.text)) fail('daily-tasks: the record does not say what was DONE - "' + e.entry.text + '"');
  if (!/1 left/.test(e.entry.text)) fail('daily-tasks: the record does not say what was LEFT - "' + e.entry.text + '"');
  if (e.entry.kind !== 'task') fail('daily-tasks: the record is not in the day-log bullet-journal shape');
  if (e.entry.done) fail('daily-tasks: an unfinished day was recorded as done');
  if (/overdue|late|fail/i.test(e.entry.text)) {
    fail('daily-tasks: the record scolds - "' + e.entry.text + '". The date is a framing device, not a stick.');
  }
  const whole = T.closeOut([mk({ steps: [{ done: true }, { done: true }] })], tm);
  if (!whole.entries[0].entry.done) fail('daily-tasks: a fully finished day was not recorded as done');

  /* IDEMPOTENT. Opening the app twice on Tuesday must not write Monday twice.
     The first sabotage case, and the one most likely to rot. */
  const again = T.closeOut(one.tasks, tm);
  if (again.entries.length) fail('daily-tasks: CLOSING OUT TWICE WROTE THE DAY TWICE - open the app twice and your log doubles');
  if (again.changed) fail('daily-tasks: the second close-out reported a change it did not make');
  if (!one.tasks[0].closed) fail('daily-tasks: close-out did not mark the task closed, so nothing stops it re-running');
  if (T.closeOut([mk()], d).entries.length) fail('daily-tasks: TODAY was closed out - the day is not over');
  if (T.closeOut(null, d).entries.length) fail('daily-tasks: closeOut threw on nothing');

  // THE STREAK - days in a row, from lastDone alone
  const first = T.streakAfter({}, d);
  if (first.streak !== 1 || first.done !== 1) fail('daily-tasks: the first finish did not start a streak');
  const run = T.streakAfter({ done: 1, streak: 1, best: 1, lastDone: y }, d);
  if (run.streak !== 2 || run.best !== 2) fail('daily-tasks: a consecutive day did not extend the streak');
  const broke = T.streakAfter({ done: 5, streak: 5, best: 5, lastDone: '2026-08-01' }, d);
  if (broke.streak !== 1) fail('daily-tasks: a gap did not reset the streak');
  if (broke.best !== 5) fail('daily-tasks: a broken streak lost the personal best');
  /* FINISHING TWICE IN ONE DAY IS NOT TWO DAYS - the difference between a
     streak and a score, and the second sabotage case. */
  const twice = T.streakAfter({ done: 3, streak: 3, best: 3, lastDone: d }, d);
  if (twice.streak !== 3 || twice.done !== 3) {
    fail('daily-tasks: finishing twice in one day counted twice - ' + JSON.stringify(twice));
  }
  if (T.daysApart('nonsense', d) !== null) fail('daily-tasks: daysApart did not reject an unreadable date');

  /* EVERY DOOR A STEP CAN NAME MUST EXIST — THE GUARD THAT WAS MISSING.

     This is why the feature exists at all: `mission` sat in carrying.js
     KINDS.places for a full day as a place NO SURFACE implemented, and npm
     test had nothing to say, because it only ever checked the other direction
     (a surface accepting a kind nothing offers). A step pointing at a door
     nobody wired is the same dead drop, and this closes it.

     The export set is re-derived here rather than shared: every block in this
     file is self-contained on purpose, so one block's refactor cannot silently
     disarm another's. */
  const ovSrc = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const winBlock = ovSrc.slice(ovSrc.lastIndexOf('Object.assign(window'));
  const noComments = winBlock.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const exportedNames = new Set(noComments.match(/[A-Za-z_$][\w$]*/g) || []);
  for (const m of ovSrc.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) exportedNames.add(m[1]);
  if (exportedNames.size < 50) fail('daily-tasks: could not read the window export block - this guard is reporting on nothing');

  for (const k of T.WHERE_KEYS) {
    const w = T.STEP_WHERE[k];
    if (!w.icon || !w.label) fail(`daily-tasks: step kind '${k}' has no icon or label - it cannot be shown`);
    if (w.door && !exportedNames.has(w.door)) {
      fail(`daily-tasks: step kind '${k}' points at '${w.door}()', which is NOT a window export. `
         + `That step's button would silently do nothing - the dead drop this feature was born from.`);
    }
  }
  if (!T.STEP_WHERE.world) fail('daily-tasks: the `world` step is gone - the Pavilion SUPPORTS a real study session, it does not replace one');
  if (T.STEP_WHERE.world.door) fail('daily-tasks: `world` grew a door. Going to the library and wiring a circuit happen out there; a button would pretend otherwise.');
  if (!T.STEP_DOORS.length) fail('daily-tasks: STEP_DOORS derived nothing');
  if (T.STEP_DOORS.includes(null)) fail('daily-tasks: STEP_DOORS kept the doorless kind');
  if (!/today/i.test(T.TASKS_NOTICE)) fail('daily-tasks: the notice does not explain the framing to the person it is for');
  if (/overdue|late/i.test(T.TASKS_NOTICE)) fail('daily-tasks: the notice threatens. Nothing here is ever late.');
}

/* ---------- lookup: one road, and the line no resident crosses ----------
   Set 2026-08-07: books may be looked up, notes may not. A note reaches a
   resident ONLY because a person put it in the backpack, or because it was
   curated and published.

   This is held in a test rather than in a prompt on purpose: a prompt is a
   request and a function is a boundary. searchNotes stems and ranks and is
   genuinely good - and it is for the VISITOR searching their own Notes Log.
   The same query on a resident's behalf is a different act. */
{
  const L = await import('../src/game/data/lookup.js');

  // terms are deterministic and shared, so "why did it find that" has an answer
  const t = L.lookupTerms('What does the book say about impermanence and craving?');
  if (!t.includes('impermanence') || !t.includes('craving')) fail('lookup: real terms were dropped');
  if (t.includes('what') || t.includes('does') || t.includes('book')) fail('lookup: a stopword survived');
  if (L.lookupTerms('').length) fail('lookup: an empty question produced terms');
  if (L.lookupTerms(null).length) fail('lookup: a null question threw or produced terms');
  if (L.lookupTerms('a b c the of').length) fail('lookup: short words and stopwords produced terms');
  const many = L.lookupTerms('alpha bravo charlie delta echo foxtrot golf hotel');
  if (many.length > 4) fail('lookup: terms are uncapped - ' + many.length);

  // THE LINE
  if (!L.maySearch('book')) fail('lookup: books must be searchable - that is the whole pathway');
  if (!L.maySearch('published')) fail('lookup: a note you published should behave like a book');
  if (L.maySearch('note')) fail('lookup: A RESIDENT MAY NOT SEARCH YOUR NOTES');
  if (!L.mustBeCarried('note')) fail('lookup: notes must arrive only from the backpack');
  if (!L.mustBeCarried('chapter')) fail('lookup: chapter marks are your words too');

  // the plan reaches for books, never for notes
  const plan = L.groundingPlan('tell me about impermanence', []);
  if (!plan.search.includes('book')) fail('lookup: the plan did not reach for books');
  if (plan.search.includes('note')) fail('lookup: THE PLAN REACHED FOR NOTES');
  if (!/not searched/i.test(plan.withheld || '')) fail('lookup: with nothing carried it did not say why notes are absent');

  /* ASKED IS DIFFERENT FROM UNASKED, and that is the whole rule since it was
     narrowed 2026-08-07 ("lets put functionality over privacy"). NEVER was too
     strong: it made "what did I write about impermanence?" unanswerable, which
     is not privacy, it is a missing feature wearing privacy's coat. */
  const asked = L.groundingPlan('impermanence', [], { searchMyNotes: true });
  if (!asked.search.includes('note')) fail('lookup: the visitor ASKED and their notes were still not searched');
  if (!asked.asked) fail('lookup: the plan does not record that it was asked');
  if (asked.withheld) fail('lookup: it said notes were withheld when they were not');
  // ...and it must never be INFERRED from the wording
  const merelyMentions = L.groundingPlan('search my notes about impermanence', []);
  if (merelyMentions.search.includes('note')) {
    fail('lookup: a question that MENTIONS notes was treated as permission - the boundary must not sit in the model judgement');
  }
  const leakAsked = L.privacyLeaks([{ kind:'note', ref:'n9' }], [], { searchMyNotes: true });
  if (leakAsked.length) fail('lookup: a note the visitor asked for was still flagged a leak');
  const leakUnasked = L.privacyLeaks([{ kind:'note', ref:'n9' }], []);
  if (leakUnasked.length !== 1) fail('lookup: an UNASKED note stopped being a leak');
  const carried = [{ kind: 'note', ref: 'n1', label: 'A note' }];
  const plan2 = L.groundingPlan('impermanence', carried);
  if (plan2.carried.length !== 1) fail('lookup: a carried note was not offered to the resident');

  // the runtime guard: anything about to reach a model that should not be there
  const leaks = L.privacyLeaks([
    { kind: 'book', ref: 'dhammapada' },          // fine, searchable
    { kind: 'published', ref: 'p1' },             // fine, you published it
    { kind: 'note', ref: 'n1' },                  // fine, it is carried
    { kind: 'note', ref: 'SECRET' },              // NOT fine - never carried
  ], carried);
  if (leaks.length !== 1 || leaks[0].ref !== 'SECRET') {
    fail('lookup: privacyLeaks let an uncarried note through, or flagged something legitimate - '
       + JSON.stringify(leaks));
  }
  if (L.privacyLeaks([{ kind: 'sandwich', ref: 'x' }], []).length !== 1) {
    fail('lookup: an unknown kind was treated as a licence rather than a leak');
  }
  if (L.privacyLeaks([], []).length) fail('lookup: an empty set leaked');
  if (L.privacyLeaks(null, null).length) fail('lookup: privacyLeaks threw on nothing');

  // the visitor is TOLD, in the interface, not only in a prompt
  if (!/backpack/i.test(L.LOOKUP_NOTICE) || !/notes/i.test(L.LOOKUP_NOTICE)) {
    fail('lookup: the notice does not explain the rule to the person it protects');
  }

  /* ---------- "I CAN SEE IT AND I CANNOT READ IT" — reachGap ----------

     The steward's ask: "we should be able to have the resedents be like i dont
     have acces to this can you please put the book in your back pack ... i know
     this but for a new user we gotta hold there hand".

     Whether a resident is blocked is a SET LOOKUP, not a judgement, so it is
     tested as arithmetic rather than trusted to a prompt. */
  {
    const { PLACES } = await import('../src/game/data/places.js');
    const hit = { slug: 'walden', title: 'Walden' };

    /* 1 - THE FIRST THING TO BREAK ON PURPOSE. A hit already in the bag must
       produce NO line, or the resident tells you to go and carry the very book
       you are holding, which is the whole failure this state exists to avoid. */
    const held = L.reachGap({ hits: [hit], searched: true, total: 5,
      carrying: [{ kind: 'book', ref: 'walden' }] });
    if (held.gap || held.line) {
      fail('reachGap: a book that is ALREADY CARRIED still produced a gap - the resident would ask '
         + 'the visitor to put something in a bag it is already in');
    }
    const notHeld = L.reachGap({ hits: [hit], searched: true, total: 5, carrying: [] });
    if (notHeld.gap !== L.GAP.SHELVED_NOT_CARRIED) fail('reachGap: a shelved, uncarried hit produced ' + notHeld.gap);
    if (!notHeld.line) fail('reachGap: SHELVED_NOT_CARRIED produced no line for the model');
    if (!notHeld.titles.some(t => t.slug === 'walden')) fail('reachGap: the uncarried title is not offered');

    /* 2 - AN EMPTY LIBRARY IS ITS OWN STATE, and never "that title is missing".
       SEED_LIBRARY is [], so this is what a brand-new install hits. */
    const empty = L.reachGap({ hits: [], searched: true, total: 0, carrying: [] });
    if (empty.gap !== L.GAP.NOTHING_HERE_YET) {
      fail('reachGap: an EMPTY library reported ' + empty.gap + '. Telling someone with no books that '
         + '"that title is not on these shelves" describes their whole Library as a miss.');
    }
    /* ...and it must NOT depend on the search having happened. shelfLookup()
       returns null with no database, so hanging this off the lookup would mean
       the one state a new visitor hits is the one that never fires in a
       browser. Correction 1 of the plan, as an assertion. */
    const emptyNoDb = L.reachGap({ hits: [], searched: false, total: 0, carrying: [] });
    if (emptyNoDb.gap !== L.GAP.NOTHING_HERE_YET) {
      fail('reachGap: with no database the empty-Library state did not fire. It must be computed from '
         + 'the shelf count, never from the lookup.');
    }
    const quiet = L.reachGap({ hits: [], searched: false, total: 5, carrying: [] });
    if (quiet.gap || quiet.line) fail('reachGap: invented a gap when no search had been made');

    const missing = L.reachGap({ hits: [], searched: true, total: 5, carrying: [] });
    if (missing.gap !== L.GAP.NOT_IN_THE_PAVILION) fail('reachGap: a real miss reported ' + missing.gap);

    /* A CATALOGUE MISS IS NOT A GAP WHILE THE VISITOR IS BEING ANSWERED FROM
       THEIR OWN BOOK. Read off a real transcript: carrying Walden and asking a
       follow-up produced real passages AND "we do not have that, try the
       Request Board" in the same breath. Both true, together nonsense. */
    const servedMiss = L.reachGap({ hits: [], searched: true, total: 5, carrying: [], served: true });
    if (servedMiss.gap) {
      fail('reachGap: a resident quoting page 81 of a carried book was ALSO told to try the Request '
         + 'Board because the catalogue matched nothing. Two true sentences that contradict each other.');
    }
    /* ...and conversational filler must not become a search term at all, which
       is what made that transcript happen: "so what does it actually say"
       searched the shelves for "actually". */
    for (const filler of ['actually', 'really', 'something', 'anything']) {
      if (L.lookupTerms('so what does it ' + filler + ' say').includes(filler)) {
        fail(`lookup: "${filler}" survives as a search term - a follow-up question would search the `
           + `catalogue for a word that names no subject, and report a miss`);
      }
    }
    if (!L.lookupTerms('what does it say about impermanence').includes('impermanence')) {
      fail('lookup: the filler stopwords ate a real subject term');
    }

    // the offer is capped and says what it left out
    const many = L.reachGap({ searched: true, total: 20, carrying: [],
      hits: Array.from({ length: 9 }, (_, i) => ({ slug: 's' + i, title: 'T' + i })) });
    if (many.titles.length > L.GAP_TITLE_CAP) fail('reachGap: offered ' + many.titles.length + ' buttons - four is a row, twelve is a wall');
    if (many.rest !== 9 - L.GAP_TITLE_CAP) fail('reachGap: the remainder is not named, so the list silently pretends to be complete');
    if (!L.reachGap({}).gap) fail('reachGap: threw or said nothing on empty input - total 0 IS the empty Library');

    /* 3 - PER STATE, not in total. Checking the sum passed a sabotage that
       stripped the doors from the empty-Library state alone - the other two
       still made the count. Every gap must carry its OWN way out. */
    for (const [what, g] of [['SHELVED_NOT_CARRIED', notHeld],
                             ['NOT_IN_THE_PAVILION', missing],
                             ['NOTHING_HERE_YET', empty]]) {
      if (!g.doors || !g.doors.length) {
        fail(`reachGap: ${what} names no door at all. A resident that says "I cannot reach that" and `
           + `cannot say where to go has moved the dead end, not removed it.`);
      }
    }
    /* A DERIVATION, NOT A GREP. Every door must be a real PLACES entry AND its
       opener a real window export, or a visitor walks to a room that is not
       there. A comment cannot satisfy this: the ids come from the returned
       objects, not from the source text. */
    const winBlock = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const dr of [...notHeld.doors, ...missing.doors, ...empty.doors]) {
      if (!PLACES[dr.id]) fail(`reachGap sends someone to '${dr.id}', which is not a room in places.js`);
      else if (PLACES[dr.id].door !== dr.open) {
        fail(`reachGap types the opener for '${dr.id}' instead of deriving it - places.js says `
           + `'${PLACES[dr.id].door}', reachGap says '${dr.open}'`);
      }
      if (!new RegExp('(^|[^\\w$.])' + dr.open + '\\b').test(winBlock)) {
        fail(`reachGap offers ${dr.icon} ${dr.label}, whose opener ${dr.open}() is not reachable from `
           + `overlays.js - the button would do nothing`);
      }
    }
    /* 4 - AND THE OFFER MUST BE RENDERED. The definition is stripped first,
       because `function reachGapOffer(d)` matches any naive "is it called"
       pattern - which is how three guards died earlier this week. */
    if (!/function reachGapOffer/.test(winBlock)) fail('overlays.js does not render the reach gap at all');
    const noDefs = winBlock.replace(/function\s+reachGapOffer\s*\([^)]*\)/g, ' ');
    if (!/reachGapOffer\s*\(\s*d\s*\)/.test(noDefs)) {
      fail('overlays.js defines reachGapOffer() and never calls it - the resident would say "put it in '
         + 'your backpack" to someone with no button to press, which MOVES the dead end rather than '
         + 'removing it');
    }
    /* 5 - EVERY BUTTON IS A HUMAN PRESS. Break this and the backpack stops
       meaning "what a person chose" and starts meaning "what a model helped
       itself to". */
    const rsrc0 = readFileSync(new URL('../src/game/ui/residents.js', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const grabby of ['toggleInventory', 'pickUp', 'carryFromChat']) {
      if (new RegExp('(^|[^\\w$.])' + grabby + '\\s*\\(').test(rsrc0)) {
        fail(`residents.js calls ${grabby}() - a resident must never put anything in the backpack `
           + `itself. Every button is a human press.`);
      }
    }
  }

  /* ONE PATHWAY FOR EVERY PLUGIN. residents.js had its own private stopword
     list and term extraction; a second copy of "how do I find a book" is the
     drift this project keeps paying for, so it must import these. */
  const rsrc = readFileSync(new URL('../src/game/ui/residents.js', import.meta.url), 'utf8');
  if (/const LOOKUP_STOP\s*=\s*new Set/.test(rsrc)) {
    fail('residents.js: still has its own LOOKUP_STOP - the lookup pathway must be shared, '
       + 'or a new plugin either re-implements it or goes without');
  }

  /* ---------- THE PLAN MUST HAVE A CALLER, AND A COMMENT IS NOT ONE ----------

     groundingPlan() was written, tested and documented on 2026-08-07 and had NO
     CALLER until 2026-08-10. Its only appearance in src/ was inside a COMMENT
     above searchMyNotesFor() reading "...had NO CALLER. This is it." - above a
     body that then re-implemented the decision by hand. Third instance of the
     shape in one blast radius, after groundingFor() and chatOptsFor().

     So this guard reads FUNCTION BODIES WITH COMMENTS STRIPPED, which is
     CLAUDE.md rule 3 in its most literal form: three guards in this project
     have been born dead because a comment satisfied them, and this specific
     defect was a comment claiming a call that did not exist.

     Break it on purpose: delete the groundingPlan() line from either body and
     go back to lookupTerms(). Both must go red. */
  const osrc = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const noComments = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const fnBody = (src, name) => {
    const at = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
    if (at < 0) return '';
    let i = src.indexOf('{', at), depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (!depth) return src.slice(i, j + 1); }
    }
    return '';
  };
  for (const [file, src, name] of [
    ['ui/residents.js', rsrc, 'shelfLookup'],
    ['ui/overlays.js',  osrc, 'searchMyNotesFor'],
  ]) {
    const body = noComments(fnBody(src, name));
    if (!body) {
      fail(`smoke: could not find ${name}() in ${file} - the groundingPlan caller guard has drifted `
         + 'and is now checking nothing');
      continue;
    }
    if (!/groundingPlan\s*\(/.test(body)) {
      fail(`THE PLAN HAS NO CALLER AGAIN. ${name}() in ${file} does not call groundingPlan(). `
         + 'data/lookup.js states that "the caller performs exactly this and nothing else - which '
         + 'means the boundary is checkable without a database", and that sentence is only true '
         + 'while this call exists. A comment saying so is what we had before.');
    }
    /* ...and it must not go back to extracting its own terms. Performing the
       plan AND deciding the terms yourself is agreeing with the plan by luck. */
    if (/lookupTerms\s*\(/.test(body)) {
      fail(`${name}() in ${file} extracts its own terms with lookupTerms() again. The plan already `
         + 'returns them; a second extractor is free to stop agreeing with the first, which is the '
         + 'drift data/lookup.js exists to prevent.');
    }
  }
  /* The notes half must be gated on what the plan ALLOWS, not merely on what
     the button ASKED. Break it by deleting the plan.search check: the boundary
     silently moves back out of lookup.js and into whoever set the flag. */
  const notesBody = noComments(fnBody(osrc, 'searchMyNotesFor'));
  if (notesBody && !/plan\.search\.includes\(\s*'note'\s*\)/.test(notesBody)) {
    fail('searchMyNotesFor() no longer checks that the plan permits reaching for notes. '
       + 'searchMyNotes:true is the REQUEST; plan.search is the ANSWER, and only the answer is '
       + 'a boundary.');
  }

  /* ---------- ONE LOOKUP A TURN ----------
     Quill and the Monk each call libraryLookupBlock() twice per message - once
     in their own systemPrompt() and again inside pathwayBlock() - which was up
     to EIGHT database round-trips serving four questions. Harmless in effect,
     pure waste, on a machine whose real limit is cooling. The memo lives on
     state.dialog and is keyed by question AND turn so it cannot survive into
     the next message or go stale against a book shelved between two asks. */
  const shelfBody = noComments(fnBody(rsrc, 'shelfLookup'));
  /* BOTH HALVES, AND THE WRITE IS CHECKED WITH ITS CONDITION ATTACHED.

     The first version of this check was /d\.shelfLookup/ and it was BORN DEAD:
     sabotaging the write to `if(false) d.shelfLookup=res` left the text intact
     and the guard green. That is the third time in two sessions a check has
     been satisfied by a leftover mention of the thing it guards - the setBookCap
     and room.cap guards on 2026-08-10 were the other two - so it is now the
     assignment WITH its guard clause, plus the read that returns it. */
  if (shelfBody && !/if\s*\(\s*d\s*\)\s*d\.shelfLookup\s*=/.test(shelfBody)) {
    fail('shelfLookup() does not stash its result on state.dialog - the double lookup is back '
       + '(eight database round-trips for four questions) and shelfLookupReceipt() has nothing '
       + 'to read, so the Library search goes silent again.');
  }
  if (shelfBody && !/return\s+d\.shelfLookup\s*;/.test(shelfBody)) {
    fail('shelfLookup() writes the memo but never returns it - a cache nothing reads is a slower '
       + 'version of no cache');
  }
  if (shelfBody && !/\.turn\s*===\s*turn/.test(shelfBody)) {
    fail('shelfLookup() memoises without a turn stamp - a repeated question would be answered from '
       + 'a stale result, and a book shelved between two asks would be invisible.');
  }
}

/* ---------- note reach: the one state an ASK cannot cross ----------
   Set 2026-08-08: "we should be able to toggle are notes between private and
   publid and we should also add something like ai can read and private is
   truly private."

   lookup.js moved the line from WHO to WHY on 2026-08-07 (asked: yes, unasked:
   no). This puts a per-note boundary OUTSIDE that one, so a visitor can say
   "not this one, ever" about a single note without turning the feature off.

   The default is what makes it safe to ship: ABSENT MEANS ASKABLE, which is
   exactly the rule that already held, so nothing already written changes reach
   the day it lands. Hundreds of existing notes, no migration. */
{
  const R = await import('../src/game/data/note-reach.js');
  const L = await import('../src/game/data/lookup.js');

  // the default, and the reason there is no migration
  if (R.DEFAULT_REACH !== 'askable') fail('note-reach: the default is not askable - every existing note just changed reach');
  if (R.reachOf({}, 'n1') !== 'askable') fail('note-reach: an untouched note is not askable');
  if (R.reachOf(undefined, 'n1') !== 'askable') fail('note-reach: threw on an absent map');
  if (R.reachOf({ n1: '' }, 'n1') !== 'askable') fail('note-reach: an empty string should read as the default');

  // ...but a value we cannot READ fails closed, which is not the same thing
  if (R.reachOf({ n1: 'kinda-private' }, 'n1') !== 'sealed') {
    fail('note-reach: an UNRECOGNISED permission fell back to the default - an unreadable '
       + 'permission must withhold, not permit. Absence is a statement; a strange string is not.');
  }

  // THE BOUNDARY ITSELF
  if (R.mayReach('sealed', { asked: true })) fail('note-reach: A SEALED NOTE WAS REACHABLE BY ASKING. That is the entire point of the state.');
  if (R.mayReach('sealed', {})) fail('note-reach: a sealed note was reachable unasked');
  if (R.mayReach('askable', {})) fail('note-reach: an askable note was read WITHOUT being asked for');
  if (!R.mayReach('askable', { asked: true })) fail('note-reach: the visitor asked and an askable note was still withheld');
  if (!R.mayReach('published', {})) fail('note-reach: a published note should behave like a book');
  if (R.mayReach(undefined, { asked: true })) fail('note-reach: an undefined state was treated as permission');

  // setting it is pure, and going back to the default REMOVES the entry
  const m1 = R.setReach({}, 'n1', 'sealed');
  if (m1.n1 !== 'sealed') fail('note-reach: setReach did not seal');
  if (R.setReach(m1, 'n1', 'askable').n1 !== undefined) {
    fail('note-reach: setting a note back to the default RECORDED it - two representations of '
       + 'the default is two things that can disagree');
  }
  if (Object.keys(R.setReach({}, 'n1', 'nonsense')).length) fail('note-reach: an invalid state was stored');
  if (R.setReach({ n1: 'sealed' }, 'n2', 'sealed').n1 !== 'sealed') fail('note-reach: setReach lost an unrelated entry');
  const before = { n1: 'sealed' };
  R.setReach(before, 'n1', 'askable');
  if (before.n1 !== 'sealed') fail('note-reach: setReach MUTATED the map it was given - it must be pure');
  if (R.sealedCount({ a: 'sealed', b: 'published', c: 'sealed' }) !== 2) fail('note-reach: sealedCount is wrong');

  // both halves come back, because the bag has to SHOW what it is withholding
  const part = R.partitionByReach(
    [{ key: 'open' }, { key: 'shut' }], { shut: 'sealed' }, { asked: true });
  if (part.seen.length !== 1 || part.seen[0].note.key !== 'open') fail('note-reach: partition kept the wrong note');
  if (part.withheld.length !== 1 || part.withheld[0].reach !== 'sealed') {
    fail('note-reach: partition dropped the withheld note instead of reporting it - a bag that '
       + 'silently hides what it holds is not a boundary anyone can read');
  }

  /* AND NOW THE JOIN, which is where this could quietly stop working.
     lookup.js composes note-reach rather than copying it; if that composition
     is broken, every test above still passes and a sealed note goes to a
     model. This is the assertion to break on purpose. */
  const sealed = { SEALED: 'sealed' };
  const asked = { searchMyNotes: true, noteReach: sealed };
  const leak = L.privacyLeaks([{ kind: 'note', ref: 'SEALED' }], [], asked);
  if (leak.length !== 1) {
    fail('lookup: A SEALED NOTE REACHED THE MODEL BECAUSE THE VISITOR ASKED. Sealed outranks '
       + 'asked - that is the whole difference between this state and askable.');
  }
  // ...and carrying it in is not a way around the seal either
  const heldSealed = [{ kind: 'note', ref: 'SEALED', label: 'x' }];
  if (!L.privacyLeaks([{ kind: 'note', ref: 'SEALED' }], heldSealed, { noteReach: sealed }).length) {
    fail('lookup: putting a SEALED note in the backpack let it through. "Truly private" would '
       + 'mean very little if dropping it in the bag were the way around it.');
  }
  // an askable note still behaves exactly as it did before any of this existed
  if (L.privacyLeaks([{ kind: 'note', ref: 'n9' }], [], { searchMyNotes: true, noteReach: sealed }).length) {
    fail('lookup: an ordinary askable note stopped being reachable when the seal was added');
  }
  // the plan filters the bag, and SAYS what it held back
  const plan = L.groundingPlan('impermanence', heldSealed, { searchMyNotes: true, noteReach: sealed });
  if (plan.carried.length) fail('lookup: the grounding plan handed over a sealed note from the backpack');
  if (plan.sealed.length !== 1) fail('lookup: the plan dropped the sealed note silently instead of reporting it');
  // with no map at all, nothing changes - this must not break an ordinary save
  if (L.groundingPlan('impermanence', heldSealed, { searchMyNotes: true }).carried.length !== 1) {
    fail('lookup: with no noteReach map, a carried note stopped reaching the resident');
  }

  // the visitor is told, in the interface, not only in a prompt
  if (!/ask/i.test(R.REACH_NOTICE) || !/seal/i.test(R.REACH_NOTICE)) {
    fail('note-reach: the notice does not explain the rule to the person it protects');
  }
  for (const k of R.REACH_KEYS) {
    if (!R.REACH_STATES[k].icon || !R.REACH_STATES[k].label || !R.REACH_STATES[k].help) {
      fail('note-reach: state ' + k + ' has no icon, label or help - it cannot be shown or explained');
    }
  }

  /* TWO AXES, NOT ONE. visibility.js answers "can this leave the machine";
     this answers "may a local model see it". A note can be private in every
     sense and still be one you are glad to hand your own resident. If these
     ever merge, sealing a note starts to look like unpublishing it. */
  const V = await import('../src/game/data/visibility.js');
  for (const k of R.REACH_KEYS) {
    if (V.VIS[k]) fail('note-reach: state "' + k + '" collides with a visibility.js state - '
       + 'these are two different questions and must not share a vocabulary');
  }
}

/* ---------- one backpack, not three ----------
   data.inventory is VESTIGIAL: read once by carryMigrate() and emptied. It has
   to stay in freshData() so an old save still has the shape the migration
   reads, which means the next person to open that file finds an empty list
   that looks available - and builds a third carry system on it.

   There were already TWO (data.inventory and state.readerPocket) and that is
   the whole reason for data/carrying.js. So: nothing may WRITE data.inventory
   except the migration that retires it. */
{
  const uiDir2 = new URL('../src/game/ui/', import.meta.url);
  for (const f of readdirSync(uiDir2).filter(x => x.endsWith('.js'))) {
    const text = readFileSync(new URL(f, uiDir2), 'utf8');
    for (const m of text.matchAll(/\bdata\.inventory\s*(?:=[^=]|\.push|\.splice|\.pop|\.shift|\.unshift)/g)) {
      // the migration itself is the one legitimate writer
      const around = text.slice(Math.max(0, m.index - 700), m.index);
      if (/function carryMigrate/.test(around)) continue;
      fail('ui/' + f + ' writes data.inventory, which is vestigial - the backpack is data.carrying. '
         + 'Two carry systems is what data/carrying.js exists to end.');
    }
  }
}

/* ---------- what the game remembers RIGHT NOW ----------
   The mirror of the data.* guard above, and written for the same reason.

   `state` declares ten fields in entities.js and the codebase assigns
   fifty-five. The other forty-seven were invented at the point of use - which
   is exactly how data.bookMarks and data.study got in, both found 2026-08-07,
   the second only because a guard was finally written for it.

   Declaring all forty-seven is a separate pass. What this stops is a
   FORTY-EIGHTH appearing quietly while other work is going on. The
   grandfathered list lives in entities.js beside `state`, where someone
   reading it will see it, and it may only shrink. */
{
  const entSrc = readFileSync(new URL('../src/game/entities.js', import.meta.url), 'utf8');

  // the declared block: `export const state = { ... };`
  const decl = entSrc.match(/export const state = \{([\s\S]*?)\n\};/);
  if (!decl) fail('entities.js: could not find the `state` declaration to check against');

  const grand = entSrc.match(/export const UNDECLARED_STATE = \[([\s\S]*?)\];/);
  if (!grand) fail('entities.js: UNDECLARED_STATE is gone - the grandfathered list is what makes this guard usable');

  if (decl && grand) {
    const declared = new Set([...decl[1].matchAll(/(?:^|[\s,{])([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map(m => m[1]));
    const listed = new Set([...grand[1].matchAll(/'([^']+)'/g)].map(m => m[1]));

    const seen = new Map();
    const walkState = (dirUrl, label) => {
      for (const e of readdirSync(dirUrl, { withFileTypes: true })) {
        if (e.isDirectory()) { walkState(new URL(e.name + '/', dirUrl), label + e.name + '/'); continue; }
        if (!e.name.endsWith('.js')) continue;
        const text = readFileSync(new URL(e.name, dirUrl), 'utf8');
        for (const m of text.matchAll(/\bstate\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:=[^=]|\|\|=|\?\?=)/g)) {
          if (!seen.has(m[1])) seen.set(m[1], label + e.name);
        }
      }
    };
    walkState(new URL('../src/game/', import.meta.url), 'src/game/');

    for (const [k, where] of seen) {
      if (declared.has(k) || listed.has(k)) continue;
      fail(where + ' assigns state.' + k + ', which entities.js neither declares nor grandfathers. '
         + 'Declare it in `state` (best), or add it to UNDECLARED_STATE and say why.');
    }
    // the list may only SHRINK: a name nobody assigns any more is done, not a debt
    for (const k of listed) {
      if (!seen.has(k)) fail('entities.js: UNDECLARED_STATE lists ' + k + ', which nothing assigns any more - remove it');
      if (declared.has(k)) fail('entities.js: ' + k + ' is BOTH declared and grandfathered - drop it from UNDECLARED_STATE');
    }
    if (seen.size < 20) fail('smoke: only found ' + seen.size + ' state.* writes - the source scan has drifted');
  }
}

/* ---------- one place decides what a resident is answered with ----------
   chatOptsFor() lived privately in ui/overlays.js until 2026-08-07. Three
   call sites remembered to pass it and ui/lesson-tree.js COULD NOT REACH IT
   AT ALL - it imports AI directly. Nothing was broken by that on the day,
   because neither of its calls was Monk-routed; the defect was that if one
   ever became so, the rule would have failed in silence.

   A RULE ENFORCED BY "THREE FILES REMEMBER" IS NOT ENFORCED. So: any file
   that talks to a model must be ABLE to ask what that resident is answered
   with. Whether a given call passes it is the caller's judgement - a
   one-off summariser legitimately does not - but being unable to is not a
   judgement, it is a gap.

   This guard outlives whatever chatOptsFor happens to return. It said one
   thing this morning (the Monk gets the biggest local model) and another by
   the afternoon (everyone the same); the seam is the point. */
{
  const aiDir = new URL('../src/game/ui/', import.meta.url);
  for (const f of readdirSync(aiDir).filter(x => x.endsWith('.js'))) {
    const text = readFileSync(new URL(f, aiDir), 'utf8');
    if (!/\bAI\.chat\s*\(/.test(text)) continue;
    if (!/\bchatOptsFor\b/.test(text)) {
      fail('ui/' + f + ' calls AI.chat but cannot reach chatOptsFor - import it from '
         + 'ai/provider.js. A resident\'s options must not depend on which file happens to remember.');
    }
  }
  // and it must live in ONE place
  const provSrc = readFileSync(new URL('../src/game/ai/provider.js', import.meta.url), 'utf8');
  if (!/export function chatOptsFor/.test(provSrc)) {
    fail('ai/provider.js no longer exports chatOptsFor - it is the one place this decision lives');
  }
  for (const f of readdirSync(aiDir).filter(x => x.endsWith('.js'))) {
    const text = readFileSync(new URL(f, aiDir), 'utf8');
    if (/function chatOptsFor/.test(text)) {
      fail('ui/' + f + ' defines its own chatOptsFor - a second copy of this decision is exactly the drift it was moved to avoid');
    }
  }

  /* ---------- ...AND THE SEAM MUST ACTUALLY DECIDE SOMETHING ----------

     "A reachable seam that returns {} enforces nothing" (docs/DOCS-DRIFT.md).
     The guard above passed every day chatOptsFor() was inert, which is exactly
     right for what it checks and exactly why it is not enough on its own.

     So this one RUNS IT. think:true was the second thing silently lost when the
     Monk's tier was retired on 2026-08-07 - his was its only caller - and three
     documents went on describing a feature nothing turned on. It is now a
     visitor setting, off by default. */
  const P = await import('../src/game/ai/provider.js');
  if (typeof P.initProviderSettings !== 'function') {
    fail('ai/provider.js does not export initProviderSettings - chatOptsFor has no way to read a '
       + 'visitor setting without importing entities.js, which would build the cycle this file '
       + 'has always been free of');
  } else {
    P.initProviderSettings(() => ({}));
    if (P.chatOptsFor('monk').think) {
      fail('chatOptsFor: showThinking is OFF and think is still true. Reasoning is slower and '
         + 'longer; it must be something a person chose.');
    }
    P.initProviderSettings(() => ({ showThinking: true }));
    const on = P.chatOptsFor('monk');
    if (on.think !== true) {
      fail('THINK IS DEAD AGAIN. showThinking is on and chatOptsFor did not set think:true - the '
         + 'accumulator, p.lastThinking and the "thought for a moment" panel are all still there '
         + 'and still fed by nothing.');
    }
    /* A thinking model on the short tier can spend all 450 tokens reasoning and
       return EMPTY content - measured on qwen3.5:9b, 3m26s, nothing. Asking for
       the reasoning without the room is a switch that mostly breaks the reply. */
    if (on.deep !== true) {
      fail('chatOptsFor: think:true without deep:true - a reasoning model handed the short budget '
         + 'can burn it all thinking and answer nothing at all');
    }
    /* An unset wire must read as OFF and never throw. "Off because nobody
       called init" is the silent failure this whole function is a monument to,
       so the default is safe AND the wire is checked separately, below. */
    P.initProviderSettings(null);
    if (P.chatOptsFor('monk').think) fail('chatOptsFor: an unwired settings reader defaulted to ON');
  }
  /* ---------- ...AND ONLY OF A MODEL THAT CAN ----------
     MEASURED 2026-08-10: think:true on llama3.2 is HTTP 400, not a shrug. The
     visitor sees "your local AI didn't answer" and has no way to connect it to
     a checkbox they ticked in another room. Ollama publishes `capabilities`
     per model in /api/tags, so the list is DERIVED (rule 4) - and an older
     Ollama that omits the field yields an empty list, which means off, which
     is the safe direction. */
  const prov = P.makeOllamaProvider('http://127.0.0.1:1', 'test');
  prov.model = 'llama3.2:latest';
  prov.thinkingModels = ['deepseek-r1:8b'];
  if (prov.canThink()) fail('provider: canThink() said yes for a model with no thinking capability - '
    + 'switching reasoning on would 400 every reply');
  prov.model = 'deepseek-r1:8b';
  if (!prov.canThink()) fail('provider: canThink() said no for a model Ollama lists as thinking - '
    + 'the switch would be inert for everyone');
  prov.thinkingModels = [];
  if (prov.canThink()) fail('provider: with no capability list at all, canThink() must be false - '
    + 'an Ollama too old to report capabilities must fail toward not asking');
  const provSrc2 = readFileSync(new URL('../src/game/ai/provider.js', import.meta.url), 'utf8');
  const provCode = provSrc2
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!/const think\s*=\s*wants\s*&&\s*p\.canThink\(\)/.test(provCode)) {
    fail('ollama chat() no longer filters think through canThink() - a visitor with llama3.2 who '
       + 'ticks the reasoning box gets HTTP 400 on every message, reported to them as the model '
       + 'not answering');
  }
  if (!/capabilities\.includes\(\s*'thinking'\s*\)/.test(provCode)) {
    fail('provider: thinkingModels is no longer derived from what Ollama reports - a hand-written '
       + 'list of model names is rule 4\'s exact shape and every one of them here has drifted');
  }
  /* THE WIRE ITSELF. A correct chatOptsFor nobody ever hands a settings reader
     is off forever, which would look exactly like the three days it was dead.
     One call, and it must exist. */
  const ovSrc = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const ovCode = ovSrc
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!/initProviderSettings\s*\(\s*\(\s*\)\s*=>/.test(ovCode)) {
    fail('ui/overlays.js never calls initProviderSettings() with a reader - chatOptsFor would read '
       + '{} forever and every visitor setting in the transport layer would be silently off');
  }
  /* ...and the visitor needs a way to set it. A setting with no switch is a
     setting nobody has, and this one is the project's best debugging tool. */
  if (!/function toggleShowThinking/.test(ovCode)) {
    fail('ui/overlays.js has no toggleShowThinking() - showThinking would be reachable only by '
       + 'hand-editing the save');
  }
  if (!/onchange="toggleShowThinking\(\)"/.test(ovSrc)) {
    fail('the data panel has no checkbox wired to toggleShowThinking() - the switch exists and '
       + 'nothing presses it, which is this project\'s oldest bug shape');
  }

  /* ---------- EVERY PROVIDER FUNCTION A UI FILE CALLS MUST BE IMPORTED ----------

     Found 2026-08-10 by photographing the prompt-inspector panel: previewPrompt()
     called estimateTokens(), which overlays.js had NEVER imported. It had been
     broken since 06b892a. The panel wrote "building…", threw on the next line,
     and stayed that way forever - the house failure mode exactly, and invisible
     to `npm run build` because a bare identifier is only a ReferenceError when
     the line actually runs.

     A module-level import list that must match the identifiers used in the file
     is rule 4's shape, so it is DERIVED from each module's own exports rather
     than hand-listed here. Break it by deleting a name from any ui/ import.

     IT WATCHES MORE THAN ONE MODULE NOW. 2026-08-09: labelledNote() was used in
     ui/study-table.js and imported nowhere — the identical bug, one file over,
     four days after the first one was guarded. A guard aimed at the single file
     where a bug happened to be found is a guard aimed at the past, so the
     module list below is a table and the next shared helper joins it. Any
     module here whose exports get called across ui/ belongs in it. */
  const WATCHED = [
    { path: 'ai/provider.js',        min: 8 },
    { path: 'data/note-versions.js', min: 6 },
  ];
  for (const mod of WATCHED) {
    const modSrc = readFileSync(new URL('../src/game/' + mod.path, import.meta.url), 'utf8');
    const exports = [...modSrc.matchAll(/export\s+(?:function|const|let)\s+([A-Za-z_$][\w$]*)/g)]
      .map(m => m[1]);
    if (exports.length < mod.min) {
      fail(`smoke: only found ${exports.length} exports in ${mod.path} - the import guard has `
         + 'drifted and is checking almost nothing');
    }
    const tail = mod.path.split('/').pop().replace('.', '\\.');
    for (const f of readdirSync(aiDir).filter(x => x.endsWith('.js'))) {
      const code = readFileSync(new URL(f, aiDir), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      /* ALL of them, not the first. A file may legitimately import from the same
         module twice - ui/lesson-tree.js does - and reading only the first match
         made this guard report a false positive on its very first run. A guard
         that has to be argued with is worse than none; diagnose red before
         believing it (three checks in this project WERE the broken thing). */
      const imps = [...code.matchAll(
        new RegExp('import\\s*\\{([^}]*)\\}\\s*from\\s*[\'"][^\'"]*' + tail + '[\'"]', 'g'))];
      if (!imps.length) continue;             // this file does not use that module at all
      const imported = new Set(imps.flatMap(m =>
        m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)));
      /* Local definitions shadow an import legitimately - a file that defines its
         own helper of the same name is not missing anything. */
      for (const name of exports) {
        if (imported.has(name)) continue;
        if (new RegExp('(function|const|let|var)\\s+' + name + '\\b').test(code)) continue;
        if (new RegExp('(^|[^\\w$.])' + name + '\\s*\\(').test(code)) {
          fail(`ui/${f} calls ${name}() and does not import it from ${mod.path}. That is a `
             + `ReferenceError on whichever code path reaches it, and nothing but running that exact `
             + `path will tell you - estimateTokens() sat like this in previewPrompt() for days.`);
        }
      }
    }
  }
}

/* ---------- NO DOCUMENT MAY QUOTE A STALE overlays.js LINE COUNT ----------

   Added 2026-08-10, and it is the same lesson as the seed-count guard: a number
   living in four documents and one source file will be wrong in three of them
   within a week. This one had already been hand-corrected twice — "~10k" became
   12,966 in the morning and 12,966 was stale by the evening — and correcting it
   a third time by hand would be choosing to do it a fourth.

   Only figures in the 9,000-19,999 range count, so seed counts and dates cannot
   trip it, and lines that mark themselves as history are allowed: the whole
   point of "it said ~10,000 while it was 12,966" is that it is a RECORD.

   Tolerance 150 lines. Approximately right is doing its job; 2,000 out is a lie. */
{
  const ovText = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const realLines = ovText.split(/\r?\n/).length;
  /* NO TRAILING \b — the first version ended the alternation with `\b` after an
     em-dash, which can never match, so three genuinely historical lines were
     reported as drift. The guard was the broken thing; diagnose red first. */
  const HISTORY = /(used to|until 20|was still|had become|has grown since|as of 20\d\d-\d\d-\d\d|as of that morning|as of an earlier session|the previous version|this (entry|header) said|superseded|understated)/i;
  const TOLERANCE = 150;
  let checkedAny = 0;
  for (const rel of ['MAINTAINING.md', 'plans/OVERLAYS-SPLIT-PLAN.md', 'docs/DOCS-DRIFT.md', 'CLAUDE.md']) {
    let text;
    try { text = readFileSync(new URL('../' + rel, import.meta.url), 'utf8'); } catch (e) { continue; }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/\b(1?\d{1,2},\d{3})\b(?=[^\n]{0,40}lines)/);
      if (!m) continue;
      const n = Number(m[1].replace(/,/g, ''));
      if (n < 9000 || n > 19999) continue;
      const window = (lines[i - 1] || '') + ' ' + lines[i] + ' ' + (lines[i + 1] || '');
      if (HISTORY.test(window)) continue;
      checkedAny++;
      if (Math.abs(n - realLines) > TOLERANCE) {
        fail(`${rel}:${i + 1} says overlays.js is ${m[1]} lines; it is ${realLines.toLocaleString()}. `
           + `This number has already been hand-corrected twice. Derive it or mark the line as history.`);
      }
    }
  }
  /* A guard that stops matching anything passes forever - the seed-count check
     learned this the same day. */
  if (!checkedAny) {
    fail('smoke: the overlays.js line-count guard matched NO claim in any document. Either every '
       + 'mention was removed, or the pattern has drifted and this check is now vacuous.');
  }
}

/* ---------- the panel that explains saving must be TRUE ----------
   Added 2026-08-07 at the steward's word: "lets make sure the user udersands
   how tings get saved and when things get saved as well."

   A panel that reassures is worse than one that says nothing, so the three
   claims it makes are checked against the code that would have to back them:

     "written the moment you do it"   -> persist() exists and is called on
                                         change, not on a timer or a button
     "if a save fails you are told"   -> persist() actually warns
     "where you are in a book IS kept" -> readingPos is a declared save store

   The point is not the wording. It is that none of the three can quietly
   stop being true while the sentence stays on screen. */
{
  const ovSrc = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const entSrc2 = readFileSync(new URL('../src/game/entities.js', import.meta.url), 'utf8');

  if (/When it saves/.test(ovSrc)) {
    if (!/export function persist\(\)/.test(entSrc2)) {
      fail('Your Data says work is written as you go, but entities.js has no persist()');
    }
    // the honest claim is "we tell you once", so the warning has to exist
    if (!/saveWarned/.test(entSrc2) || !/alert\(/.test(entSrc2)) {
      fail('Your Data promises you are told when a save fails, and persist() no longer warns');
    }
    // and a save BUTTON would make "there is nothing to press" a lie
    if (/>\s*(Save|Save now|Save progress)\s*</.test(ovSrc)) {
      fail('Your Data says there is nothing to press, but a Save button exists');
    }
    if (!/readingPos/.test(entSrc2)) {
      fail('Your Data says where you are in a book is kept, but readingPos is not in the save');
    }
  }
}

/* ---------- TWO GROUNDS - the road, the doors, and what you can walk to ----

   2026-08-10. The Workshop, the Cafe, the Inheritance Hall and the pond moved
   to a second Grounds. Three things could go silently wrong in a move like
   that, and all three are the same failure the Lab taught: something exists
   and cannot be got to.

   ONE - A DOOR PAINTED ON THE WRONG WALL. render.js placed doorways from
   THREE HARD-CODED TILE COLUMNS of the original Grounds, keyed off building
   TYPE: `b.type==='library'?7:b.type==='cafe'?24:31`. Correct only for as
   long as nothing ever moved. Every building carries its own `door` now.

   TWO - A ONE-WAY ROAD. A warp out with no warp back is a room you can enter
   and not leave, and nothing checked it.

   THREE - A TILE YOU CANNOT REACH ON FOOT. Warp sanity has always checked
   that a warp LANDS somewhere sensible; nothing checked you could ever WALK
   to the warp in the first place. A second Grounds is exactly where a road
   forgets to join up, and the wall of trees around it makes that invisible
   from the code. So: flood-fill from the spawn and require every warp, every
   station, every sign and every resident to be standing somewhere a person
   can actually get to. Break it on purpose by walling off the east gate. */
{
  const walkable = (sc, x, y) =>
    x >= 0 && y >= 0 && x < sc.w && y < sc.h && !SOLID.has(sc.tiles[y][x]);

  /* AND render.js HAS TO ACTUALLY USE IT. Requiring every building to carry a
     `door` proves nothing if the drawing code still ignores the field and
     paints from its own remembered coordinates — the data would be correct
     and the picture still wrong. Caught by breaking it on purpose: reverting
     render.js to the hard-coded columns left this whole block green. */
  {
    const rSrc = readFileSync(new URL('../src/game/render.js', import.meta.url), 'utf8');
    const rCode = rSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    /* EVERY doorX, not the first one. This guard was BORN DEAD and breaking
       it on purpose is the only reason that is known: render.js declares
       doorX TWICE — once in the Inheritance Hall's archway branch, which
       already read b.door and was always right, and once in the general
       building branch, which was the broken one. `.find()` returned the
       correct line, the check passed, and the wrong line sat underneath it.
       A guard that inspects "the" occurrence of anything is one duplicate
       away from being decorative. */
    const doorLines = rCode.split('\n').map(l => l.trim()).filter(l => /const\s+doorX\s*=/.test(l));
    if (!doorLines.length) fail('scenes: could not find doorX in render.js - this guard has drifted');
    if (doorLines.length < 2) {
      fail('scenes: found ' + doorLines.length + ' doorX declaration(s) in render.js, expected 2 '
         + '(the archway branch and the general building branch). If one was removed this guard '
         + 'may now be watching only half of what draws a door.');
    }
    for (const line of doorLines) {
      if (!/b\.door/.test(line)) {
        fail('render.js draws building doorways without reading b.door: ' + line
           + ' — the doorway is being placed from something other than the building itself, which '
           + 'is how three absolute tile columns of the old Grounds ended up baked into the renderer');
      }
      if (/b\.type\s*===/.test(line)) {
        fail('render.js is placing doorways by building TYPE again: ' + line
           + ' — that is exactly the line that would have painted the Cafe’s door onto blank wall '
           + 'the moment it moved to a second Grounds');
      }
    }
  }

  for (const [key, sc] of Object.entries(scenes)) {
    /* --- the doorway is on the building's own wall --- */
    for (const b of sc.buildings || []) {
      if (b.door === undefined) {
        fail(`${key}: building '${b.label}' has no 'door' column. render.js used to guess it from `
           + `the building TYPE and three absolute tile numbers of the old Grounds - a building that `
           + `moves would have its doorway painted onto blank wall.`);
        continue;
      }
      if (b.door < b.x || b.door + 1 > b.x + b.w) {
        fail(`${key}: building '${b.label}' has door column ${b.door}, outside its own footprint `
           + `(x ${b.x}..${b.x + b.w - 1}) - the doorway would be drawn off the building`);
      }
      const bottom = b.y + b.h - 1;
      const hasWarp = (sc.warps || []).some(w =>
        (w.x === b.door || w.x === b.door + 1) && (w.y === bottom || w.y === bottom + 1));
      if (!hasWarp) {
        fail(`${key}: building '${b.label}' draws a doorway at column ${b.door} but no warp stands `
           + `there - a painted door onto nothing, which is the staircase-that-was-only-a-sign bug`);
      }
    }

    /* --- you can walk to everything in this room --- */
    const seen = new Set();
    const stack = [[sc.spawn.x, sc.spawn.y]];
    if (walkable(sc, sc.spawn.x, sc.spawn.y)) seen.add(sc.spawn.x + ',' + sc.spawn.y);
    else stack.length = 0;
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k) || !walkable(sc, nx, ny)) continue;
        seen.add(k); stack.push([nx, ny]);
      }
    }
    if (seen.size < 4) fail(`${key}: the flood fill from spawn reached ${seen.size} tiles - this `
      + `check is reporting on nothing and everything below it is meaningless`);

    for (const w of sc.warps || []) {
      if (!seen.has(w.x + ',' + w.y)) {
        fail(`${key}: the warp at (${w.x},${w.y}) -> '${w.to}' cannot be WALKED to from the spawn. `
           + `It lands somewhere fine; nobody can ever stand on it. Built and unreachable is the `
           + `same as unbuilt.`);
      }
      /* A DOOR MUST NOT PUT YOU ON ANOTHER DOOR. Landing on a warp tile makes
         the two rooms a revolving door: your next step in any direction sends
         you straight back, and the room you meant to enter is unenterable.
         Exact geometry, so it is checked here rather than nudged at in a live
         suite — the walking version of this check failed on its own footwork
         and blamed the road. */
      const dest = scenes[w.to];
      if (dest && (dest.warps || []).some(v => v.x === w.sx && v.y === w.sy)) {
        fail(`${key}: the warp at (${w.x},${w.y}) drops you onto ANOTHER warp at (${w.sx},${w.sy}) `
           + `in '${w.to}' - one step in any direction and you are bounced straight back out`);
      }
    }
    /* You interact by FACING a thing from beside it, so what has to be
       reachable is a neighbouring tile, not the thing's own square. */
    const besideIsReachable = (x, y) =>
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
    for (const st of sc.stations || []) {
      if (!besideIsReachable(st.x, st.y)) {
        fail(`${key}: nobody can stand next to '${st.name}' at (${st.x},${st.y}) - a station you `
           + `cannot face is a station you cannot press E at`);
      }
    }
    for (const sg of sc.signs || []) {
      if (!besideIsReachable(sg.x, sg.y)) fail(`${key}: the sign '${sg.name}' at (${sg.x},${sg.y}) cannot be read from any reachable tile`);
    }
    for (const n of sc.npcs || []) {
      if (!besideIsReachable(n.x, n.y)) fail(`${key}: '${n.name || n.species}' at (${n.x},${n.y}) stands where nobody can reach them`);
    }
  }

  /* --- THE ROAD RUNS BOTH WAYS, AND EVERY ROOM IS ON IT ---
     Two Grounds is the first time this world has had a component that could
     come adrift. A scene you can walk into and not out of is a trap; a scene
     no walk reaches at all is the Lab again, one level up. */
  const start = 'overworld';
  const out = new Map(Object.keys(scenes).map(k => [k, new Set()]));
  for (const [k, sc] of Object.entries(scenes)) {
    for (const w of sc.warps || []) if (!w.locked && scenes[w.to]) out.get(k).add(w.to);
  }
  const reach = (from, edges) => {
    const s = new Set([from]), q = [from];
    while (q.length) for (const n of edges.get(q.pop()) || []) if (!s.has(n)) { s.add(n); q.push(n); }
    return s;
  };
  const forward = reach(start, out);
  for (const k of Object.keys(scenes)) {
    if (!forward.has(k)) fail(`scenes: '${k}' (${scenes[k].name}) cannot be WALKED to from the `
      + `Pavilion Grounds at all. The pause menu may open what is inside it; the room itself is cut off.`);
  }
  const back = new Map(Object.keys(scenes).map(k => [k, new Set()]));
  for (const [k, tos] of out) for (const to of tos) back.get(to).add(k);
  const backward = reach(start, back);
  for (const k of Object.keys(scenes)) {
    if (!backward.has(k)) fail(`scenes: you can walk INTO '${k}' (${scenes[k].name}) and never walk `
      + `back out to the Grounds - a one-way road is a trap`);
  }
}

/* ---------- ONE KEYSTROKE TO ANYWHERE - every room has a door ----------

   The standing decision, verbatim:

     "nothing may be a dead end ... ONE KEYSTROKE TO ANYWHERE beats a
      beautiful room you must walk to (built and unreachable is the same as
      unbuilt - learned with the Lab)."

   MEASURED 2026-08-10: the pause menu reached ~25 panels and named NOT ONE
   ROOM. Eleven exported room openers appeared in it nowhere, and a twelfth,
   openArchive(), was on no window at all - no click anywhere in the whole
   application could open the Archive Desk, only main.js's E key.

   THE POINT OF THIS BLOCK IS THE DIRECTION THAT HAS NEVER BEEN CHECKED HERE.
   The existing inline-handler guard runs handlers -> exports. The carrying
   guard ran kinds -> places and MISSED a `mission` place that no surface
   implemented, for weeks, because it never ran places -> kinds. So this one
   runs BOTH: a station in the world with no menu entry fails, and a menu
   entry naming a station that is not in the world fails. A room can never
   again be built and left unreachable, and a door can never point at nothing.

   Break it on purpose: add a station kind to any scene in scenes.js. */
{
  const P = await import('../src/game/data/places.js');
  const ovSrcP = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');

  /* WHAT THE WORLD ACTUALLY HAS - read from scenes.js, never listed here. */
  const inWorld = new Map();   // station kind -> Set of scene keys it stands in
  for (const [key, sc] of Object.entries(scenes)) {
    for (const st of (sc.stations || [])) {
      if (!inWorld.has(st.kind)) inWorld.set(st.kind, new Set());
      inWorld.get(st.kind).add(key);
    }
  }
  if (inWorld.size < 10) {
    fail('places: read only ' + inWorld.size + ' station kinds out of scenes.js - this guard is '
       + 'reporting on nothing and every assertion below it is meaningless');
  }

  /* 1 - WORLD -> MENU. Every station a visitor can walk up to is either a
     place with a door, or is named in NOT_A_PLACE with the reason said out
     loud. This is the half that makes "built and unreachable" impossible. */
  const claimed = new Set(P.PLACE_KEYS.map(k => P.PLACES[k].station).filter(Boolean));
  for (const [kind, where] of inWorld) {
    if (claimed.has(kind)) continue;
    if (!(kind in P.NOT_A_PLACE)) {
      fail(`places: the '${kind}' station stands in ${[...where].join(', ')} and has NO menu door `
         + `and no entry in NOT_A_PLACE. A room reachable only by walking to it is the Lab's bug: `
         + `built and unreachable is the same as unbuilt. Give it a door, or say why it has none.`);
    } else if (!String(P.NOT_A_PLACE[kind] || '').trim()) {
      fail(`places: '${kind}' is in NOT_A_PLACE with an empty reason - rule 6 wants the reason said, `
         + `not the entry ticked`);
    }
  }

  /* 2 - MENU -> WORLD. The direction the carrying guard was missing. An entry
     naming a station that is not in that scene is a door onto nothing, and
     the whole point of deriving is that it cannot survive a move. */
  for (const k of P.PLACE_KEYS) {
    const p = P.PLACES[k];
    if (!p.icon || !p.label) fail(`places: '${k}' has no icon or label - it cannot be shown in a menu`);
    if (!p.scene) fail(`places: '${k}' names no scene - it would file under no room at all`);
    else if (!scenes[p.scene]) fail(`places: '${k}' files under scene '${p.scene}', which does not exist`);
    if (p.station) {
      if (!inWorld.has(p.station)) {
        fail(`places: '${k}' points at a '${p.station}' station that exists in NO scene - a door onto nothing`);
      } else if (!inWorld.get(p.station).has(p.scene)) {
        fail(`places: '${k}' says the '${p.station}' station is in ${p.scene}, but it actually stands in `
           + `${[...inWorld.get(p.station)].join(', ')}. Moving a room must move its menu entry with it.`);
      }
    } else if (!String(p.note || '').trim()) {
      /* A panel with no furniture has to say where it really is, or nobody
         can find it in the world and the menu is the only way in - which is
         the same dead end pointing the other way. */
      fail(`places: '${k}' has no station and no note saying where it really is`);
    }
  }

  /* 3 - EVERY DOOR IS REALLY ON WINDOW. A menu button calls through window at
     click time; an unexported name is a button that silently does nothing,
     which is this project's oldest gotcha AND the house failure mode. This is
     what would have caught openArchive() before it was listed. */
  const winBlockP = ovSrcP.slice(ovSrcP.lastIndexOf('Object.assign(window'));
  const namesP = new Set(winBlockP.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
    .match(/[A-Za-z_$][\w$]*/g) || []);
  for (const m of ovSrcP.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) namesP.add(m[1]);
  if (namesP.size < 50) fail('places: could not read the window export block - this guard is reporting on nothing');
  for (const door of P.placeDoors()) {
    if (!door) fail('places: an entry has no door at all');
    else if (!namesP.has(door)) {
      fail(`places: the menu lists a room whose door is '${door}()', which is NOT a window export - `
         + `that button silently does nothing`);
    }
  }

  /* 4 - EVERY SCENE IS ACCOUNTED FOR. A whole ROOM added with no places in it
     is the same failure one level up: the Lab's floor said "nothing open
     here" for months. Either it has places, or it says why it has none. */
  for (const key of Object.keys(scenes)) {
    const listed = P.SCENE_ORDER.includes(key);
    const excused = key in P.SCENE_WITHOUT_PLACES;
    if (!listed && !excused) {
      fail(`places: the scene '${key}' (${scenes[key].name}) is in neither SCENE_ORDER nor `
         + `SCENE_WITHOUT_PLACES - a whole room with no keystroke to anything in it, and nothing said about it`);
    }
    if (listed && excused) fail(`places: '${key}' is both listed and excused - which is it?`);
    if (excused && !String(P.SCENE_WITHOUT_PLACES[key] || '').trim()) {
      fail(`places: scene '${key}' is excused with an empty reason`);
    }
  }
  for (const key of P.SCENE_ORDER) {
    if (!scenes[key]) fail(`places: SCENE_ORDER names '${key}', which is not a scene`);
    if (!P.PLACE_KEYS.some(k => P.PLACES[k].scene === key)) {
      fail(`places: SCENE_ORDER lists '${key}' but no place files under it - an empty heading`);
    }
  }

  /* 5 - AND THE MENU REALLY RENDERS IT. Everything above can be perfect in a
     table nobody reads: exactly the state groundingFor() was in for a whole
     day. placesByScene() must be composed into the menu itself. */
  const bodyP = (src, name) => {
    const at = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
    if (at < 0) return '';
    let i = src.indexOf('{', at), depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (!depth) return src.slice(i, j + 1); }
    }
    return '';
  };
  const stripP = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const menuBody = stripP(bodyP(ovSrcP, 'renderMenu'));
  const secBody = stripP(bodyP(ovSrcP, 'placesSections'));
  if (!menuBody || !secBody) fail('places: could not find renderMenu/placesSections in overlays.js - this guard has drifted');
  if (!/placesSections\s*\(\s*\)/.test(menuBody)) {
    fail('THE MENU DOES NOT LIST THE ROOMS. renderMenu() does not compose placesSections() - '
       + 'the whole table is inert, which is the inert-pure-function bug again.');
  }
  if (!/placesByScene\s*\(/.test(secBody)) {
    fail('placesSections() does not call placesByScene() - the menu is listing rooms from '
       + 'somewhere other than the one table, which is rule 4 all over again');
  }

  /* 6 - A DIALOG IS WORLD-LEVEL AND CLOSES THE PANEL OVER IT.

     Four rooms in this table - the Hearth, the Counter, the Notice Board and
     the Residents' Board - are scripted beats rather than workspaces: they
     open the world's dialog box, not an overlay. The first time the menu
     could reach them, all four appeared to do NOTHING. The dialog really
     opened, underneath a full-screen overlay that stayed up, and because
     state.ui was still 'menu' onAction() returned early, so E could not even
     advance the thing that could not be seen.

     Every caller of openDialog is world-level, so the fix belongs in
     openDialog itself and it must stay there. */
  const dlgBody = stripP(bodyP(ovSrcP, 'openDialog'));
  if (!dlgBody) fail('places: could not find openDialog in overlays.js - this guard has drifted');
  if (!/hideAllOv\s*\(/.test(dlgBody) || !/state\.ui\s*=\s*null/.test(dlgBody)) {
    fail('openDialog() no longer clears the panel above it. A scripted room opened from the pause '
       + 'menu would show its dialog UNDERNEATH the menu, with state.ui still set so E cannot '
       + 'advance it - four menu buttons that silently do nothing.');
  }
  for (const k of P.PLACE_KEYS) {
    if (!P.PLACES[k].dialog) continue;
    const b = stripP(bodyP(ovSrcP, P.PLACES[k].door));
    if (!b) fail(`places: '${k}' is marked dialog:true but ${P.PLACES[k].door}() is not in overlays.js`);
    else if (!/openDialog\s*\(|comingCommons\s*\(/.test(b)) {
      fail(`places: '${k}' is marked dialog:true but ${P.PLACES[k].door}() opens no dialog - `
         + `the live suite is checking the wrong thing for it, and would pass either way`);
    }
  }

  /* 7 - the rendered markup, checked once end to end. A room in the table
     has to come out the other side as a button that calls its own door. */
  const groups = P.placesByScene(scenes);
  if (!groups.length) fail('places: placesByScene returned no groups');
  const flat = groups.flatMap(g => g.items);
  if (flat.length !== P.PLACE_KEYS.length) {
    fail(`places: ${P.PLACE_KEYS.length} places went in and ${flat.length} came out of placesByScene - `
       + `one is filed under a scene the order never visits`);
  }
  for (const g of groups) {
    if (!g.name || g.name === '???') fail(`places: the '${g.scene}' heading came out as '${g.name}' - `
      + `the scene it names has no name, so a whole group of rooms would show up unlabelled`);
  }
}

/* ---------- THE ROOM THAT EXPLAINS DOCKER ----------
   2026-08-10. There was NO in-game path to Docker at all — setup lived
   only as terminal commands in PROTOCOLS.md, against the standing rule
   "no terminal required, no config file". A capability nobody can find
   is a capability nobody has.

   The two properties that make this room safe rather than another way to
   mislead someone: it must never pretend to DO the install, and it must
   never imply the Pavilion is broken without it. The Pavilion being
   complete with nothing installed is a release gate with its own tests. */
{
  const ovS = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const bodyS = (name) => {
    const at = ovS.search(new RegExp('function\\s+' + name + '\\s*\\('));
    if (at < 0) return '';
    let i = ovS.indexOf('{', at), depth = 0;
    for (let j = i; j < ovS.length; j++) {
      if (ovS[j] === '{') depth++;
      else if (ovS[j] === '}') { depth--; if (!depth) return ovS.slice(i, j + 1); }
    }
    return '';
  };
  const room = bodyS('renderStorage');
  /* The cap the room must state, read from the module that owns it rather than
     re-typed here — see the ceilings check below for why that matters. */
  const BS = await import('../src/game/data/book-storage.js');
  if (!room) fail('storage: could not find renderStorage() in overlays.js - this guard has drifted');
  else {
    /* NO FAKE INSTALL BUTTON. We cannot shell out to Docker, and a button
       that appears to would be the worst dead end: one that looks like it
       worked. Say the step, make it copyable, then detect the result. */
    if (/onclick="[^"]*(installDocker|startDocker|runDocker|dockerUp)\s*\(/.test(room)) {
      fail('storage: the room has a button that claims to start Docker. The app cannot shell out to '
         + 'Docker — a button that pretends to is a dead end that LOOKS like it worked, which is worse '
         + 'than no button. Say the step and make it copyable.');
    }
    /* The command has to be the real one, and copyable rather than typed —
       a mistyped command is the commonest way setup fails for someone who
       does not live in a terminal. */
    if (!/docker compose up -d/.test(room)) fail('storage: the room no longer shows the real start command');
    if (!/copyStorageCommand\s*\(/.test(room)) fail('storage: the command is not copyable - a mistyped command is the commonest setup failure');
    if (!/docker compose stop/.test(room)) {
      fail('storage: the room explains how to turn Docker ON and not how to turn it OFF — a door that '
         + 'only opens one way is not a door someone will walk through');
    }
    /* IT MUST NOT READ AS A DEFECT. */
    for (const word of ['broken', 'failed', 'error', 'misconfigured']) {
      if (new RegExp('>[^<]*\\b' + word + '\\b', 'i').test(room)) {
        fail(`storage: the room uses the word "${word}" in its copy. The Pavilion is COMPLETE without `
           + 'Docker — that is a release gate with tests behind it — and this room is an offer, not a '
           + 'diagnosis.');
      }
    }
    /* All three ceilings, because a partial answer here is how someone
       fills a browser tab with 5 MB of book and wonders why it stopped.

       THE DESKTOP TIER MUST BE DERIVED, AND SO MUST THIS CHECK. It used to
       look for the word "hundreds", which was true when the cap was 100 —
       except one hundred is not hundreds, so the guard was pinning a claim
       that was already wrong and would have kept it wrong indefinitely.

       The cap is now the visitor's own (500 by default), so the room must
       render it from the constant rather than typing a number. That is also
       why this looks for the SYMBOL and not the digits: this guard reads
       renderStorage's SOURCE, where the number only ever appears as
       `${DEFAULT_LOCAL_BOOK_CAP}` or `${room.cap}`. A check for /\b500\b/
       would fail against perfectly correct code — and "fix" it by inviting
       someone to hardcode 500 in the panel, which is the exact drift the
       derivation exists to prevent. */
    const capTier = /DEFAULT_LOCAL_BOOK_CAP|room\.cap/;
    if (BS.DEFAULT_LOCAL_BOOK_CAP !== 500) {
      fail('storage guard: the default cap moved to ' + BS.DEFAULT_LOCAL_BOOK_CAP
         + ' — check the docs and MANUAL still say the same number');
    }
    for (const tier of [/10.20/, capTier, /no practical limit/i]) {
      if (!tier.test(room)) fail('storage: the room no longer states all three storage ceilings - ' + tier);
    }
    /* AND THE NUMBER IS NEVER TYPED, which is the half that actually bites.
       Requiring `room.cap` to APPEAR is satisfied by any one leftover mention,
       so a sabotage that hardcoded the digits in three places out of four
       still passed. Forbidding the literal is the check that cannot be
       half-satisfied: the moment someone writes 500 into the panel, the panel
       and the module can disagree, which is how "hundreds" outlived a cap of
       one hundred for weeks. */
    const literal = new RegExp('[^A-Za-z0-9_$]' + BS.DEFAULT_LOCAL_BOOK_CAP + '\\b');
    if (literal.test(room)) {
      fail('storage: the room hardcodes ' + BS.DEFAULT_LOCAL_BOOK_CAP + ' instead of rendering '
         + 'DEFAULT_LOCAL_BOOK_CAP / room.cap. The cap is the visitor\'s and it moves; a typed number '
         + 'is a claim that stops being true the moment they change it.');
    }
    /* And the visitor can actually change the middle one, which is the whole
       point of it being theirs. A stated limit with no control is a wall.

       BOTH HALVES, BECAUSE ONE HALF WAS A DEAD GUARD. The first version tested
       only /setBookCap\s*\(/ — and passed a sabotage that removed the Set
       button entirely, because the optional "reset to default" button mentions
       setBookCap too. A guard satisfied by a leftover reference to the thing it
       is checking for is the same failure as one satisfied by a comment. So it
       now requires the INPUT the number is typed into as well; remove either
       and the control is gone in a way a person would notice. */
    if (!/id="capInput"/.test(room)) {
      fail('storage: the room has no field to type a shelf limit into — the limit is the visitor\'s, '
         + 'and a number they cannot move is just a smaller wall');
    }
    if (!/setBookCap\s*\(\s*document\.getElementById\('capInput'\)/.test(room)) {
      fail('storage: the shelf-limit field is not wired to setBookCap() — the input exists and does '
         + 'nothing, which is the house failure mode with a text box on it');
    }
    /* Read from REAL state, never a setting. */
    if (!/storageSummary\s*\(/.test(room) || !/localRoom\s*\(/.test(room)) {
      fail('storage: the room does not count where the books really are — a panel that says "Docker: on" '
         + 'because a setting says so is how someone ends up staring at an empty shelf');
    }
  }
  /* And it is REACHABLE. A room built and not listed is the Lab's bug, and
     data/places.js exists because that happened eleven times at once. */
  const menuBody = bodyS('renderMenu');
  if (menuBody && !/openStorage\s*\(\s*\)/.test(menuBody)) {
    fail('storage: the pause menu does not list the storage room — built and unreachable is the same as unbuilt');
  }
}

/* ---------- THE COMPUTER'S COMMANDS AND ITS MANUAL ----------
   2026-08-10. `help` lists the commands, termRun() implements them, and
   MAN_PAGES documents them — THREE hand-maintained lists that must agree,
   which is rule 4's exact shape and had no guard at all. `man <command>`
   is itself a command, so a missing page is a dud answer in the one place
   a person goes when they are already lost.

   Derived from the `help` output, because that is the list a visitor is
   actually shown; a command that works but is never listed is invisible,
   and one that is listed but not implemented is a lie. */
{
  const ovT = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const { MAN_PAGES } = await import('../src/game/data/man-pages.js');

  const helpAt = ovT.indexOf("if(c==='help') return [");
  if (helpAt < 0) fail("smoke: could not find the Computer's help block - this guard is reporting on nothing");
  else {
    const helpBlock = ovT.slice(helpAt, ovT.indexOf('];', helpAt));
    /* "  ls                 everything on your own shelves" -> ls */
    const listed = [...helpBlock.matchAll(/'\s{2}([a-z]+)[\s<\[]/g)].map(m => m[1]);
    const uniq = [...new Set(listed)];
    if (uniq.length < 8) fail(`smoke: read only ${uniq.length} commands out of the help block - the parse has drifted`);

    for (const cmd of uniq) {
      if (cmd === 'help') continue;                 // help is not a man page subject
      if (!MAN_PAGES[cmd]) {
        fail(`the Computer lists '${cmd}' in help but MAN_PAGES has no page for it — 'man ${cmd}' is a `
           + `dud answer in the one place someone goes when they are already lost`);
      }
      /* ...and it has to be IMPLEMENTED. A listed command that falls through
         to "unknown command" is the silent-failure house rule in a terminal. */
      if (!new RegExp("c\\s*===\\s*'" + cmd + "'").test(ovT)) {
        fail(`the Computer lists '${cmd}' in help but termRun() never handles it — the command is `
           + `advertised and does nothing`);
      }
    }
    /* The other direction: a page for a command nobody can run. */
    for (const cmd of Object.keys(MAN_PAGES)) {
      if (cmd === 'man') continue;
      if (!uniq.includes(cmd)) {
        fail(`MAN_PAGES documents '${cmd}' but the Computer's help never lists it — a command a visitor `
           + `cannot discover is one that does not exist for them`);
      }
    }
  }
  for (const [cmd, page] of Object.entries(MAN_PAGES)) {
    for (const field of ['use', 'what', 'more', 'real']) {
      if (!String(page[field] || '').trim()) fail(`man-pages: '${cmd}' has no '${field}'`);
    }
  }
}

/* ---------- A LOCAL FILE IS A HOME THE DATABASE KNOWS ABOUT ----------
   Migration 005, 2026-08-10. `text_key` only ever meant "the MinIO
   object", so a book whose text was written to userData/library — the
   fallback whenever the container is not answering — had NO pointer in
   the database at all. 89 of 415 rows looked like books owned on paper
   while 59 real .txt files sat on disk, and the only record of which
   file belonged to which book lived in localStorage.

   A column nothing writes and nothing reads is worse than no column, so
   this holds all four ends: the migration exists, the SELECT returns it,
   the UPSERT carries it, and the app both sends and reads it. */
{
  const mig = readFileSync(new URL('../tools/migrations/005-local-text.sql', import.meta.url), 'utf8');
  if (!/ADD COLUMN IF NOT EXISTS local_file/.test(mig)) {
    fail('migration 005 no longer adds books.local_file');
  }
  if (!/IF NOT EXISTS/.test(mig)) {
    fail('migration 005 is not idempotent — applySchema() runs every migration on BOTH homes on EVERY open');
  }
  const dbSrc = readFileSync(new URL('../electron/db.cjs', import.meta.url), 'utf8');
  /* Slice to the END OF THE TEMPLATE LITERAL, not a fixed character count.
     900 chars stopped short of `local_file = COALESCE(...)` once a comment
     was added inside the query and reported a fix that was right there — a
     guard that measures a window instead of the thing is one edit from
     lying in either direction. */
  const q = (name) => {
    const at = dbSrc.indexOf(name + ': `');
    if (at < 0) return '';
    const start = dbSrc.indexOf('`', at);
    const end = dbSrc.indexOf('`', start + 1);
    return end < 0 ? dbSrc.slice(start) : dbSrc.slice(start, end);
  };
  if (!/local_file/.test(q('catalogue'))) {
    fail("the 'catalogue' query does not SELECT local_file — every locally-stored book would hydrate "
       + 'as a card with no text behind it, which is what migration 005 exists to stop');
  }
  if (!/local_file/.test(q('upsertCard'))) {
    fail("the 'upsertCard' query does not carry local_file — the column would never be written and "
       + 'the database would stay blind to half the Library');
  }
  if (!/local_file\s*=\s*COALESCE\(EXCLUDED\.local_file, books\.local_file\)/.test(q('upsertCard'))) {
    fail('upsertCard overwrites local_file instead of COALESCEing it — a save that knows only the '
       + 'MinIO pointer would erase the local one, and a book can legitimately be in both homes');
  }
  /* ---- EVERY CALLER PASSES AS MANY PARAMETERS AS THE QUERY DECLARES ----

     Migration 005 took upsertCard from 10 placeholders to 11, and one
     caller in store.js plus four in docker-home.cjs still passed 10.
     Postgres refuses the whole prepared statement ("bind message supplies
     10 parameters, but prepared statement requires 11"), so chapter
     syncing stopped entirely — twelve checks in docker-home.cjs went red
     at once, and NOTHING in npm test noticed.

     That is rule 4 in its purest form: a count in one file that must match
     a count in five others. Derived here from the SQL itself, so the next
     column cannot break every write in silence. */
  const maxPlaceholder = (sql) => {
    let n = 0;
    for (const m of sql.matchAll(/\$(\d+)/g)) n = Math.max(n, Number(m[1]));
    return n;
  };
  /* Count top-level elements of a literal array argument. Depth-aware and
     quote-aware, because a title with a comma in it would otherwise read
     as two parameters — the guard would then be wrong in the direction
     that matters least loudly. */
  const countArgs = (src, from) => {
    const open = src.indexOf('[', from);
    if (open < 0) return -1;
    let depth = 0, n = 1, q = null;
    for (let i = open; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '[' || c === '(' || c === '{') depth++;
      else if (c === ']' || c === ')' || c === '}') { depth--; if (!depth) return n; }
      else if (c === ',' && depth === 1) n++;
    }
    return -1;
  };
  {
    const want = maxPlaceholder(q('upsertCard'));
    if (want < 2) fail('smoke: could not read upsertCard placeholders - this guard is reporting on nothing');
    const files = ['../src/game/data/store.js', '../test/live/docker-home.cjs'];
    for (const rel of files) {
      const text = readFileSync(new URL(rel, import.meta.url), 'utf8');
      for (const m of text.matchAll(/upsertCard'\s*,/g)) {
        const got = countArgs(text, m.index);
        /* dbWriteMany passes an array OF arrays built elsewhere; only the
           literal single-row calls can be counted here, and those are the
           ones that broke. A -1 means no literal array followed. */
        if (got > 0 && got !== want) {
          fail(`${rel.replace('../', '')}: an upsertCard call passes ${got} parameters, but the query `
             + `declares ${want}. Postgres rejects the whole prepared statement, so every write through `
             + `it fails at once — this is exactly what migration 005 did on 2026-08-10.`);
        }
      }
    }
  }

  const storeSrc = readFileSync(new URL('../src/game/data/store.js', import.meta.url), 'utf8');
  const storeCode = storeSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!/r\.local_file/.test(storeCode)) {
    fail('docFromRow() ignores local_file — a book stored on this machine comes back from the '
       + 'database unopenable, which is the bug migration 005 was written for');
  }
  if (!/storage\.personal/.test(storeCode)) {
    fail('store.js never sends storage.personal up — local books would stay invisible to the database');
  }
}

/* ---------- NO BOOK IS GUARANTEED TO EXIST ANY MORE ----------
   2026-08-10. Until today a hardcoded slug like `openReader('dhammapada')`
   was safe, because twenty-seven books shipped in every build. The seed
   shelf is gone: the Library now contains exactly what its owner brought
   in, which on a fresh install is NOTHING.

   So a literal book slug in the UI is a button that opens nothing — and
   openReader() returns silently on a slug it cannot resolve, which makes it
   the quiet kind. One was left behind by the deletion (the intake table's
   "Read the full guide", pointing at `filling-your-shelves`) and this is
   what found it.

   Break it on purpose: put openReader('dhammapada') anywhere in ui/. */
{
  const uiDir2 = new URL('../src/game/ui/', import.meta.url);
  for (const file of readdirSync(uiDir2).filter(f => f.endsWith('.js'))) {
    const text = readFileSync(new URL(file, uiDir2), 'utf8');
    const code = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const m of code.matchAll(/\bopen(?:Reader|FullText)\s*\(\s*'([a-z0-9][a-z0-9-]*)'/g)) {
      fail(`ui/${file}: open…('${m[1]}') hardcodes a book slug. No book ships any more — the seed `
         + `shelf was deleted 2026-08-10 — so on a fresh install that button opens NOTHING, silently. `
         + `Point at a room the visitor can act in, or resolve a real slug at runtime.`);
    }
  }
}

/* ---------- WHERE A BOOK'S TEXT ACTUALLY LIVES ----------
   2026-08-10. Three homes have existed for a text since the beginning and
   the Library never said which one a book was in — there was one global
   line ("Local Library storage connected") answering a question nobody
   asked. Standing in front of a book that will not open, what a person
   wants is where THIS one is kept.

   The badge must be read off the BOOK, never off what happens to be
   running: a book written to MinIO in June still says Docker in December
   with the container stopped. Those are two true things and the badge
   must not collapse them into one. */
{
  const B = await import('../src/game/data/book-storage.js');
  const doc = (fullText) => ({ slug:'x', doc:{ fullText } });

  if (B.storageOf(doc({ storage:{ bucket:'sand-pavilion-library', key:'a.txt' } })) !== 'docker') fail('book-storage: a MinIO pointer did not read as Docker');
  if (B.storageOf(doc({ storage:{ personal:'personal-a.txt' } })) !== 'machine') fail('book-storage: a local file pointer did not read as this machine');
  if (B.storageOf(doc({ text:'hello' })) !== 'save') fail('book-storage: an inline text did not read as in the save');
  if (B.storageOf(doc(undefined)) !== 'summary') fail('book-storage: a card with no full text did not read as summary only');
  if (B.storageOf(null) !== 'summary') fail('book-storage: threw on nothing');
  if (B.storageOf({ doc:{} }) !== 'summary') fail('book-storage: threw on a doc with no fullText');
  /* A fullText object naming NO home is a card claiming a text it cannot
     point at. Rule 6: say "nothing here" rather than invent a home. */
  if (B.storageOf(doc({ license:'CC0' })) !== 'summary') fail('book-storage: a pointerless fullText invented a home for itself');
  if (B.storageOf(doc({ text:'' })) !== 'summary') fail('book-storage: an EMPTY inline text counted as a readable book');

  /* MINIO IS THE ONLY ONE THAT NEEDS A SERVICE. A local file counting as
     "needs MinIO" is a bug this codebase has already had — it put a storage
     warning in front of people who had no container and needed none. */
  if (!B.needsService(doc({ storage:{ bucket:'b', key:'k' } }))) fail('book-storage: a Docker book does not report needing the service');
  if (B.needsService(doc({ storage:{ personal:'p.txt' } }))) fail('book-storage: a LOCAL FILE claims it needs MinIO running - that warning would be shown to people who need no container');
  if (B.needsService(doc({ text:'hi' }))) fail('book-storage: an inline text claims it needs a service');

  for (const k of B.STORAGE_KEYS) {
    const s = B.STORAGE_STATES[k];
    if (!s.icon || !s.label || !s.hint) fail(`book-storage: state '${k}' has no icon, label or hint - it cannot be shown`);
  }

  const shelf = [
    doc({ storage:{ bucket:'b', key:'1' } }), doc({ storage:{ bucket:'b', key:'2' } }),
    doc({ storage:{ personal:'a.txt' } }), doc({ text:'t' }), doc(undefined),
  ];
  const c = B.storageCounts(shelf);
  if (c.docker !== 2 || c.machine !== 1 || c.save !== 1 || c.summary !== 1) {
    fail('book-storage: storageCounts miscounted - ' + JSON.stringify(c));
  }
  if (B.storageCounts([]).docker !== 0) fail('book-storage: storageCounts threw on an empty shelf');
  if (B.storageCounts(null).docker !== 0) fail('book-storage: storageCounts threw on nothing');
  /* A home nothing is in must not be recited. "0 in Docker" on a machine
     with no container is noise dressed as information. */
  const sum = B.storageSummary([doc({ text:'t' })]);
  if (/Docker/.test(sum)) fail('book-storage: the summary recited a home nothing is in - "' + sum + '"');
  if (!/in the save/.test(sum)) fail('book-storage: the summary dropped the home the book IS in - "' + sum + '"');
  if (B.storageSummary([]) !== '') fail('book-storage: an empty shelf produced a summary line');

  /* ---- THE LOCAL CAP, AND THE WAY PAST IT ----
     "there should be 2 pathways a local file that limmits to 100 books but
     the docker setup should be the main path". A refusal that does not name
     the way through is the silent failure this project keeps removing. */
  /* THE DEFAULT MOVED 100 -> 500 on 2026-08-10 and the cap became the
     VISITOR'S, not the app's. While Docker was one copyable command away a
     wall at 100 was a nudge; once Docker sits behind the Inner Pavilion it is
     a wall, and the Outer court has to support itself. 500 x 563 KB is ~282 MB,
     which is nothing on a modern disk. */
  if (B.DEFAULT_LOCAL_BOOK_CAP !== 500) {
    fail('book-storage: the default local cap is no longer 500 - ' + B.DEFAULT_LOCAL_BOOK_CAP);
  }
  const many = Array.from({ length: 500 }, (_, i) => doc({ storage:{ personal:i + '.txt' } }));
  const room = B.localRoom(many);
  if (!room.full || room.left !== 0) fail('book-storage: 500 local books did not fill the default shelf');
  if (!B.localRoom(many.slice(0, 40)).left) fail('book-storage: a 40-book shelf reported no room left');
  if (B.localRoom([]).used !== 0) fail('book-storage: localRoom threw on an empty shelf');

  /* THE VISITOR'S OWN LIMIT IS HONOURED, which is the whole point of the
     change - a default nobody can move is just a smaller wall. */
  const at120 = B.localRoom(many.slice(0, 150), 120);
  if (!at120.full || at120.cap !== 120) fail('book-storage: a visitor-set cap of 120 was not honoured');
  if (B.localRoom(many.slice(0, 150), 200).full) fail('book-storage: 150 books wrongly filled a 200 cap');
  /* Nonsense in, sane out. A mistyped 0 must not make the shelf unusable and
     a fat-fingered 999999 must not silently promise what a disk cannot hold. */
  if (B.normalizeCap(0) !== B.LOCAL_CAP_MIN) fail('book-storage: a cap of 0 was not clamped to the floor');
  if (B.normalizeCap(9e9) !== B.LOCAL_CAP_MAX) fail('book-storage: an absurd cap was not clamped to the ceiling');
  if (B.normalizeCap('nonsense') !== B.DEFAULT_LOCAL_BOOK_CAP) fail('book-storage: a junk cap did not fall back to the default');
  if (B.localRoom(many.slice(0, 10), 'nonsense').cap !== B.DEFAULT_LOCAL_BOOK_CAP) {
    fail('book-storage: localRoom did not normalise a junk cap');
  }

  /* Books in Docker must not count against the LOCAL cap - they are not
     on this machine's shelf at all, and counting them would refuse an
     import for space it is not using. */
  if (B.localRoom([doc({ storage:{ bucket:'b', key:'k' } })]).used !== 0) {
    fail('book-storage: a book in Docker counted against the LOCAL cap');
  }

  const dockerNext = B.nextDestination(many, { hasDocker:true, hasFiles:true });
  if (dockerNext.where !== 'docker') fail('book-storage: Docker is not the main path even when it is up');
  if (dockerNext.full) fail('book-storage: a full LOCAL shelf blocked an import that was going to Docker');
  const localNext = B.nextDestination(many.slice(0, 3), { hasDocker:false, hasFiles:true });
  if (localNext.where !== 'machine' || !/3 of 500/.test(localNext.line)) {
    fail('book-storage: the local destination does not say how much room is left - "' + localNext.line + '"');
  }
  const fullNext = B.nextDestination(many, { hasDocker:false, hasFiles:true });
  if (fullNext.where) fail('book-storage: a full local shelf still claimed a destination');
  /* THE REFUSAL MUST NAME A WAY THROUGH THE OUTER COURT CAN ACTUALLY WALK.
     It used to name only Docker, which was fair while Docker was a copyable
     command. Docker now sits behind the Inner Pavilion, so a refusal whose
     only exit is "become a contributor" is a dead end with a signpost on it.
     Raising your own limit has to come first. */
  if (!/[Rr]aise the limit/.test(fullNext.line)) {
    fail('THE REFUSAL DOES NOT NAME THE WAY THROUGH. A full local shelf must first offer to raise the '
       + 'visitor\'s OWN limit - Docker is behind the Inner Pavilion now and cannot be the only exit.');
  }
  if (!/Docker/.test(fullNext.line)) {
    fail('book-storage: the refusal no longer mentions Docker at all - it is still the way past the disk '
       + 'entirely, and dropping it replaces one dead end with another');
  }
  const customFull = B.nextDestination(many.slice(0, 60), { hasDocker:false, hasFiles:true, cap:60 });
  if (!customFull.full || !/60 books/.test(customFull.line)) {
    fail('book-storage: a full shelf did not report the visitor\'s OWN limit - "' + customFull.line + '"');
  }
  const browserNext = B.nextDestination([], { hasDocker:false, hasFiles:false });
  if (browserNext.where !== 'save') fail('book-storage: a browser tab was not told its text goes into the save');

  /* AND IT REACHES THE LIBRARY. All of the above can be perfect in a module
     nobody renders - which is exactly where groundingFor() sat for a day. */
  const ovS = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const codeS = ovS.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!/storageBadge\s*\(/.test(codeS)) {
    fail('book-storage: storageBadge() is never called in overlays.js - the badge exists and no '
       + 'book wears it, which is the inert-pure-function bug again');
  }
  if (!/from '\.\.\/data\/book-storage\.js'/.test(ovS)) fail('book-storage: overlays.js does not import it');
}

/* ---------- NO DOCUMENT MAY CLAIM A SHIPPED BOOK COUNT THAT ISN'T TRUE ----------
   2026-08-10, and this guard exists because the same wrong number was in FOUR
   files at once. SEED_LIBRARY went to [] on 2026-08-10 and these did not move:

     README.md      "The Pavilion ships with **27 texts**"   <- the front door
     CLAUDE.md      "27 books ship in seed.js"               <- rule 1's own example
     MAINTAINING.md "**27 texts in the shipped seed**"       <- and 250 lines later
                    the same file correctly said the shelf was empty

   A hand-copied number that must match a source of truth is rule 4's exact
   shape, and every such number in this project has drifted. So it is DERIVED:
   the count comes from SEED_LIBRARY.length, and a doc that disagrees fails.

   HISTORY IS ALLOWED, and has to be — half the value of this project's docs is
   in recording what a thing used to be. A line may state an old count if it
   marks itself as history with one of the tokens below. That keeps the guard
   from punishing exactly the corrections it is meant to produce. */
{
  /* WHAT COUNTS AS MARKING A LINE AS HISTORY. `deleted` earns its place the
     same way the rest do: "All 27 books deleted at the steward's instruction"
     is unambiguously past tense, and failing it would be the guard punishing a
     correct sentence. */
  const HISTORY = /SUPERSEDED|until 2026-|used to|Earlier versions|formerly|no longer|were removed|deleted|⚠/i;
  /* THE MARKER MAY BE ON A NEARBY LINE, NOT THE SAME ONE. Markdown wraps prose,
     and a "⚠ SUPERSEDED" heading naturally sits above the sentence it governs —
     the first version of this guard failed two already-correct passages for
     exactly that reason. Checked against the four real drifted claims this was
     written for: all four still fail with the window open, because none of them
     had a marker anywhere near. */
  const WINDOW = 2;
  const DOCS = ['README.md', 'CLAUDE.md', 'MAINTAINING.md', 'MANUAL.md', 'PROTOCOLS.md',
                'LEARNING-PATH.md', 'AI-BACKEND-WALKTHROUGH.md'];
  let claimsSeen = 0;
  for (const doc of DOCS) {
    let text;
    try { text = readFileSync(new URL('../' + doc, import.meta.url), 'utf8'); }
    catch (e) { continue; }                    // an absent doc is not this guard's business
    const all = text.split('\n');
    all.forEach((line, i) => {
      const num = line.match(/\b(\d+)\s+(?:texts?|books?)\b/);
      if (!num) return;
      // only lines actually ASSERTING what ships — not every mention of a number
      if (!/\bship|\bcomes with\b|\bseed\b/i.test(line)) return;
      claimsSeen++;
      const near = all.slice(Math.max(0, i - WINDOW), i + 1).join('\n');
      if (HISTORY.test(near)) return;          // marked as past, here or just above
      if (Number(num[1]) !== SEED_LIBRARY.length) {
        fail(`${doc}:${i + 1} claims ${num[1]} book(s)/text(s) ship, but SEED_LIBRARY.length is `
           + `${SEED_LIBRARY.length}. Fix the number, or mark the line as history `
           + `(e.g. "until 2026-08-10", "Earlier versions", "SUPERSEDED").`);
      }
    });
  }
  /* THE GUARD MUST BE LOOKING AT SOMETHING. If a future edit rewords every one
     of these sentences past the pattern, this block would pass by reading
     nothing at all — which is this project's own "born invisible" failure. */
  if (!claimsSeen) {
    fail('smoke: the shipped-book-count guard matched no sentences in any doc - its pattern has '
       + 'drifted and it is now reporting on nothing');
  }
}

/* ---------- MANUAL.md QUOTES THE SCREEN, SO THE SCREEN MUST STILL SAY IT ----------
   2026-08-10. MANUAL.md quotes real UI strings verbatim, with a `> ●` / `> ○`
   blockquote, so a visitor can match what this page says against what is in
   front of them. Those quotes drift silently the moment a string is reworded.

   Found by hand: MANUAL.md quoted the title screen as "everything works, but
   nothing is indexed" for six days after that string was replaced. Worse than
   stale - the new line says a browser tab is a SEPARATE Pavilion with no access
   to your books, which is the opposite kind of statement from "not indexed",
   and it is exactly what the visitor had gone to the manual to understand.

   Normalising to letters and digits only is what makes this work against
   source: the real strings are split across '...' + '...' concatenation with
   escaped apostrophes and em-dashes, none of which survives a literal compare. */
{
  const manual = readFileSync(new URL('../MANUAL.md', import.meta.url), 'utf8');
  const src = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(new URL(e.name + '/', dir));
      else if (e.name.endsWith('.js')) src.push(readFileSync(new URL(e.name, dir), 'utf8'));
    }
  })(new URL('../src/', import.meta.url));
  /* COMMENTS ARE STRIPPED FIRST, and this is not tidiness — it is the specific
     way guards in this project have been born dead. A prompt-budget check once
     parsed apostrophes in COMMENTS as string literals; a window-export check
     could be satisfied by a COMMENT naming the function. Here the failure would
     be quieter and worse: delete a UI string, leave behind a comment quoting the
     old wording — which is exactly what a careful person does when they change
     it — and the manual would go on being certified against text no visitor can
     ever see. Verified by doing it: with comments included the guard passed;
     with them stripped it fails. */
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const haystack = norm(src.map(strip).join('\n'));

  const lines = manual.split('\n');
  const quotes = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^>\s*[●○]/.test(lines[i])) continue;
    const at = i + 1;
    let text = lines[i].replace(/^>\s*/, '');
    // a quote may wrap across several `> ` lines; a blank or a new bullet ends it
    while (i + 1 < lines.length && /^>\s*\S/.test(lines[i + 1]) && !/^>\s*[●○]/.test(lines[i + 1])) {
      text += ' ' + lines[++i].replace(/^>\s*/, '');
    }
    quotes.push({ at, text: text.replace(/^[●○]\s*/, '') });
  }

  if (quotes.length < 3) {
    fail(`smoke: read only ${quotes.length} quoted screen line(s) out of MANUAL.md - the `
       + `\`> ●\` convention has drifted and this guard is reporting on nothing`);
  }
  for (const q of quotes) {
    if (!haystack.includes(norm(q.text))) {
      fail(`MANUAL.md:${q.at} quotes a screen line that no longer exists in src/: `
         + `"${q.text.slice(0, 70)}…" - reword the manual, or the manual is lying about `
         + `what the visitor will see`);
    }
  }
}

/* ---------- GUARD A · A CHARACTER SPEAKS AT ONE RATE ----------
   2026-08-09. The chat log revealed a reply with
   `step = Math.max(1, Math.floor(text.length/90))` — a per-reply BUDGET
   dressed as a rate. Every reply took the same ~1.8 s, so a 100-character
   answer arrived at ~50 cps and a 2,000-character one at ~1,100 cps: THE MORE
   THE RESIDENT SAID, THE LESS TIME YOU GOT PER WORD. Exactly inverted.

   It also gave one character two voices. The Monk had a real `pace: 34` on
   the STREAMING path only; pocket the conversation and the same 900-character
   reply came back through the budget path at ~500 cps. 26 seconds if you
   watched, 1.8 if you looked away. A speaking rate that depends on whether
   anyone is looking is not a speaking rate.

   Two halves, and both are needed. The behavioural half is the real check —
   every resident resolves to a positive rate — and the textual half stops the
   budget coming back in a new costume, because a budget still resolves to a
   positive number and would pass the first half untouched.

   NOT GUARDED, ON PURPOSE: whether 34 cps FEELS like speech, and whether a
   paced reveal reads as character or as an affectation. Taste is the right
   instrument for both; rule 2 (look at it) settles them. */
{
  const { ROLES: R_A, ROLE_KEYS: RK_A, DEFAULT_PACE } =
    await import('../src/game/data/roles.js');

  /* --- behavioural: every role resolves, and it resolves to a RATE --- */
  if (!(Number(DEFAULT_PACE) > 0)) {
    fail(`roles.js: DEFAULT_PACE is ${DEFAULT_PACE} — with no house rate every resident without `
       + 'its own `pace` falls back to nothing, which is how six of seven ended up on the budget');
  }
  for (const k of RK_A) {
    const own = Number(R_A[k].pace);
    const rate = own > 0 ? own : DEFAULT_PACE;
    if (!(rate > 0)) fail(`roles.js: '${k}' resolves to no speaking rate (${rate})`);
    /* A rate nobody could read at, in either direction, is a bug rather than
       a character note. 8 cps is ~26 words a minute; 400 is past reading. */
    if (rate < 8 || rate > 400) {
      fail(`roles.js: '${k}' speaks at ${rate} cps, which is outside anything a person reads at `
         + '(8–400). If that is deliberate, widen this range and say why here.');
    }
  }

  /* --- textual: no reveal function may divide the text by a constant --- */
  const ovA = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  /* Comments stripped FIRST. Eight guards in two sessions were born dead
     because a leftover mention in a comment satisfied the pattern — including
     the paragraph directly above, which names `text.length/90` on purpose. */
  const codeA = ovA.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  /* The reveal functions by name, so this cannot be satisfied by an unrelated
     `.length/2` elsewhere in 13,000 lines — and cannot quietly stop looking
     if one is renamed, because a missing body fails below. */
  const REVEALERS = ['typewriteChatText', 'startPacedReveal', 'finishPacedReveal'];
  let bodiesSeen = 0;
  for (const fn of REVEALERS) {
    const at = codeA.indexOf('function ' + fn + '(');
    if (at < 0) { fail(`smoke: guard A cannot find ${fn}() in overlays.js — the reveal path has been `
                     + 'renamed and this guard is now watching nothing'); continue; }
    bodiesSeen++;
    /* Brace-matched body, not a line window: the budget line sat five lines
       into typewriteChatText and a window would be a guess about formatting. */
    let i = codeA.indexOf('{', at), depth = 0, end = i;
    for (; end < codeA.length; end++) {
      if (codeA[end] === '{') depth++;
      else if (codeA[end] === '}') { depth--; if (!depth) break; }
    }
    const body = codeA.slice(i, end + 1);
    if (/\.length\s*\/\s*\d/.test(body)) {
      fail(`overlays.js: ${fn}() divides the text length by a constant — that is a per-reply BUDGET, `
         + 'not a speaking rate. A long reply would be revealed faster per word than a short one. '
         + 'Take a cps rate (paceOf) instead; see DEFAULT_PACE in data/roles.js.');
    }
  }
  if (bodiesSeen !== REVEALERS.length) {
    fail(`smoke: guard A read ${bodiesSeen} of ${REVEALERS.length} reveal bodies — it is reporting on `
       + 'less than the reveal path');
  }

  /* --- and the rate actually reaches the typewriter --- */
  if (!/typewriteChatText\([^)]*paceOf\(/.test(codeA)) {
    fail('overlays.js: typewriteChatText() is called without paceOf() — it takes a rate now, and a '
       + 'caller that omits it puts the whole non-streaming reveal back on the default for everyone, '
       + 'silently losing the Monk');
  }
  /* --- pocketed is not paused --- */
  if (/if\s*\(\s*!?\s*s?\s*\|?\|?\s*d\.minimized\s*\)\s*\{\s*stopPacedReveal/.test(codeA)) {
    fail('overlays.js: the paced reveal still stops on d.minimized — pocketing a conversation freezes '
       + 'the reveal and dumps the remainder when you return. Skip the DOM write, not the counter.');
  }
}

/* ---------- GUARD B · NO NOTE IS READ BACK AS THE WRONG PERSON'S ----------
   2026-08-09, and this guard was written BEFORE the fix and had to fail on the
   code as it stood. It did, in five places.

   THE LIVE BUG. saveAiBookNote() writes the assistant's prose into
   data.bookNotes marked only by a '✨ ' string at the front of the text.
   gatherNotes() pulls every book note into the pool residents search and drops
   even that. And deskDraftLesson() hands the lot to a model under the heading

       THEIR OWN NOTES ON THIS BOOK:

   so the assistant's own earlier output comes back to it as the visitor's
   writing. Exactly one consumer in the whole codebase checked, and it checked
   by regex.

   THE FIX IS ATTRIBUTION, NOT EXCLUSION. The first version of the plan filtered
   AI notes out of grounding; the steward overruled it and was right —

     "im fine with leaving [them] in the sand pavilion, just let them be labeled
      ai notes, and have the username of the person who put them in or user 1"

   Throwing away a real note to fix a labelling problem is a worse trade. The
   note stays; it says who wrote it.

   A `by` FIELD, NOT A PREFIX. A string at the front of the text is a lie one
   edit away, and it cannot record WHICH person or WHICH model. */
{
  const NV = await import('../src/game/data/note-versions.js');

  /* --- 1 · the predicate exists, and it knows the legacy shape --- */
  for (const fn of ['isAiNote', 'authorOf', 'currentUser']) {
    if (typeof NV[fn] !== 'function') {
      fail(`note-versions.js: ${fn}() is missing — authorship has no single definition, so every `
         + 'consumer invents its own test (today: one regex, and eleven consumers that do not test at all)');
    }
  }
  if (typeof NV.isAiNote === 'function') {
    /* 415 books' worth of notes already exist with no `by` field at all, so the
       predicate has to READ the old shape rather than assume a migration. */
    const cases = [
      [{ text: '✨ Impression (AI)\nA reading of the opening.' }, true,
       'a legacy AI note, no `by` field — inferred from the ✨ prefix it was saved with'],
      [{ text: 'Assent is the only thing wholly ours.' }, false,
       'a legacy note of the visitor\'s own'],
      [{ text: 'anything at all', by: { who: 'ai', user: 'user 1', model: 'llama3.2:3b' } }, true,
       'an explicitly stamped AI note'],
      [{ text: '✨ my own starred thought', by: { who: 'you', user: 'user 1' } }, false,
       'AN EXPLICIT `by` BEATS THE PREFIX — a person may type ✨ and it must not '
       + 'make their note the assistant\'s'],
      [{}, false, 'an empty note is nobody\'s but the visitor\'s'],
    ];
    for (const [note, want, why] of cases) {
      if (NV.isAiNote(note) !== want) {
        fail(`note-versions.js: isAiNote(${JSON.stringify(note)}) should be ${want} — ${why}`);
      }
    }
    if (!/user/i.test(String(NV.currentUser() || ''))) {
      fail(`note-versions.js: currentUser() returned "${NV.currentUser()}" — until the profile lands `
         + 'everyone is "user 1", said out loud rather than left blank');
    }
    const said = String(NV.authorOf({ text: 'x', by: { who: 'ai', user: 'user 1', model: 'm' } }) || '');
    if (!/ai|assistant|model/i.test(said)) {
      fail(`note-versions.js: authorOf() on an AI note said "${said}" — it has to be readable by a `
         + 'person and by a model, in words, or the label is not doing anything');
    }
  }

  /* --- 2 · authorship is never tested by string --- */
  const NOTE_FILES = ['ui/overlays.js', 'ui/study-table.js', 'ui/residents.js', 'ui/daily-tasks.js',
                      'ui/lesson-tree.js', 'data/note-versions.js'];
  for (const rel of NOTE_FILES) {
    let src;
    try { src = readFileSync(new URL('../src/game/' + rel, import.meta.url), 'utf8'); }
    catch (e) { continue; }
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    /* Inside a .filter( specifically: that is authorship deciding what a model
       or a panel gets to see, which is the case that matters. isAiNote() is
       allowed to look at the prefix — it is the one place that should. */
    const filters = code.match(/\.filter\(([^\n]*)/g) || [];
    for (const f of filters) {
      if (/✨/.test(f)) {
        fail(`src/game/${rel}: a .filter() decides authorship by looking for "✨" in the text — `
           + `"${f.trim().slice(0, 80)}". A prefix is a string one edit away from lying, and it `
           + 'cannot say WHICH person or WHICH model. Use isAiNote() from data/note-versions.js.');
      }
    }
  }

  /* --- 3 · every reader of data.bookNotes is declared, one way or the other ---
     A registry, so a NEW consumer fails rather than silently joining the ones
     that do not attribute. The enclosing function name is the key because line
     numbers drift and this file has already been rewritten around them twice. */
  const ATTRIBUTES = {
    'ui/overlays.js': {
      gatherNotes:            'the pool every resident searches — carries `by` through on each note',
      deskDraftLesson:        'hands notes to a model — must say whose each one is',
      pullNotesIntoDissection:'was the one /^✨ / regex; uses isAiNote() now',
      renderBookNotes:        'the Reader list — a hand-written and an AI note must be tellable apart at a glance',
      renderDeskBookBody:     'the same list on the Writing Desk',
      sendNoteToToday:        'the spark it creates carries the note\'s attribution onto the day',
    },
    /* NOT DIRECT READERS OF data.bookNotes — they go through notesInUnit() —
       and that is exactly why they had the bug for as long as they did. The
       registry scan below could never have found them; they are listed by
       hand because a model-facing consumer is a model-facing consumer however
       it got the notes. Two of the three were saying "WHAT THEY HAVE ALREADY
       WRITTEN" and "I have taken these notes" over the assistant's output. */
    'ui/study-table.js': {
      grounding:        'the Study Table prompt — said "WHAT THEY HAVE ALREADY WRITTEN" over AI notes',
      notesRow:         'the unit note list a person looks at',
      studyDraftLesson: 'first person, "these notes" — every line has to say whose',
      notesInUnit:      'returns whole note objects, so `by` travels; listed so the pair above are reachable',
    },
  };
  const RENDERS_ONLY = {
    writeBookNote:      'a WRITE. Stamps `by` rather than reading it.',
    saveAiBookNote:     'a WRITE. Stamps `by` rather than reading it.',
    bookNoteFromKey:    'returns the whole note object, so `by` travels with it intrinsically.',
    studyRestoreVersion:'version machinery on one already-identified note; never reads the author.',
    studyTidyNote:      'version machinery on one already-identified note; never reads the author.',
  };
  /* WHAT "ATTRIBUTES" HAS TO MEAN, or the list is a promise nobody keeps. Every
     function declared as attributing must actually call one of the two
     functions that can tell you who wrote a note. Without this the registry is
     a comment. */
  for (const rel of Object.keys(ATTRIBUTES)) {
    const src = readFileSync(new URL('../src/game/' + rel, import.meta.url), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const fn of Object.keys(ATTRIBUTES[rel])) {
      const at = code.indexOf('function ' + fn + '(');
      if (at < 0) {
        fail(`smoke: guard B lists ${rel} ${fn}() as attributing, and it does not exist — the registry `
           + 'is watching a function that has been renamed or removed');
        continue;
      }
      let i = code.indexOf('{', at), depth = 0, end = i;
      for (; end < code.length; end++) {
        if (code[end] === '{') depth++;
        else if (code[end] === '}') { depth--; if (!depth) break; }
      }
      const body = code.slice(i, end + 1);
      if (fn === 'notesInUnit') continue;      // declared as carrying, not labelling
      /* labelledNote() counts: it is authorOf() plus the indentation fix for a
         multi-line note, and it is the form the three prompt sites use. */
      if (!/\bauthorOf\s*\(|\bisAiNote\s*\(|\battributionOf\s*\(|\blabelledNote\s*\(/.test(body)) {
        fail(`src/game/${rel}: ${fn}() is declared ATTRIBUTES ("${ATTRIBUTES[rel][fn]}") but never calls `
           + 'authorOf(), isAiNote() or attributionOf(). It hands notes on without saying whose they are.');
      }
    }
  }
  let readersSeen = 0;
  for (const rel of ['ui/overlays.js', 'ui/study-table.js']) {
    const src = readFileSync(new URL('../src/game/' + rel, import.meta.url), 'utf8');
    const lines = src.split('\n');
    let fnName = '(top level)';
    lines.forEach((line, i) => {
      const decl = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(line);
      if (decl) fnName = decl[1];
      if (!/data\.bookNotes\[/.test(line)) return;
      if (/^\s*(\/\/|\*)/.test(line)) return;              // a comment mentioning it
      readersSeen++;
      if ((ATTRIBUTES[rel] && ATTRIBUTES[rel][fnName]) || RENDERS_ONLY[fnName]) return;
      fail(`src/game/${rel}:${i + 1} — ${fnName}() reads data.bookNotes and is in neither list in `
         + 'guard B. Every reader must be declared ATTRIBUTES (it carries `by` through, or labels '
         + 'the author) or RENDERS_ONLY (with a stated reason). Add it to smoke.mjs and say which.');
    });
  }
  /* The registry must be reading something. If a refactor moves every one of
     these behind a helper, this block would pass by finding nothing — which is
     this project's born-invisible failure, and it has happened three times. */
  if (readersSeen < 8) {
    fail(`smoke: guard B found only ${readersSeen} readers of data.bookNotes — there were twelve when `
       + 'it was written. Either they moved behind a helper (point this at the helper) or the '
       + 'pattern has drifted and this guard is now certifying nothing.');
  }

  /* --- 4 · the specific sentence that made the bug ---
     Not a proxy for the bug: this IS the bug. A model told "THEIR OWN NOTES"
     over a list that includes the model's own earlier output. */
  const ovB = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const bodyOf = (src, name) => {
    const at = src.indexOf('function ' + name + '(');
    if (at < 0) return null;
    let i = src.indexOf('{', at), depth = 0, end = i;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}') { depth--; if (!depth) break; }
    }
    return src.slice(i, end + 1);
  };
  const desk = bodyOf(ovB, 'deskDraftLesson');
  if (!desk) {
    fail('smoke: guard B cannot find deskDraftLesson() — it is watching nothing');
  } else if (/THEIR OWN NOTES/.test(desk) && !/authorOf|isAiNote/.test(desk)) {
    fail('overlays.js: deskDraftLesson() heads the note list "THEIR OWN NOTES ON THIS BOOK" and '
       + 'never checks who wrote them — data.bookNotes contains the assistant\'s notes too, so the '
       + 'model is told a person wrote its own earlier output. Label each note with authorOf().');
  }
  const gather = bodyOf(ovB, 'gatherNotes');
  if (!gather) {
    fail('smoke: guard B cannot find gatherNotes() — it is watching nothing');
  } else if (!/\bby\s*[:,]/.test(gather)) {
    fail('overlays.js: gatherNotes() builds the pool every resident searches and does not carry a '
       + '`by` field — whatever attribution a note had is dropped at exactly the point it is handed '
       + 'to a model. AI notes STAY in the pool (the steward\'s call); they arrive labelled.');
  }
  const saveAi = bodyOf(ovB, 'saveAiBookNote');
  if (saveAi && !/\bby\s*:/.test(saveAi)) {
    fail('overlays.js: saveAiBookNote() writes a note with no `by` field — the ✨ in the text is '
       + 'the only record that a model wrote it, and it names neither the model nor the person.');
  }
}

/* ---------- GUARD D · NOTHING MOVES THE VISITOR WITHOUT A PRESS ----------
   2026-08-09. The third of the pace-charter guards, and the weakest of them —
   which is said here rather than discovered later.

   THE RULE. Opening a room, closing a panel or turning a page changes what is
   in front of a person. That is allowed to happen because they asked, and for
   no other reason. A drop, a timer, a boot probe and a finished sentence are
   all things that happen NEAR the visitor without being a request from them.

   THE ONE THIS WAS WRITTEN FOR: dropping a book file used to call
   reopenIfReplaced(), which navigated the Reader to the newly shelved copy.
   The drop means "take this". It does not mean "and turn my page" — you can
   be reading one book while filing another. The offer moved into the toast.

   WHY IT IS WEAK, STATED PLAINLY. It extracts function bodies with a regex and
   asks whether a navigator is named inside them. It cannot follow a call two
   levels down, and it cannot tell an event handler that IS a press (a click)
   from one that is not (a timer). So it carries a short hand-written list of
   the unpressed entry points, and the list is the part a human has to keep
   honest. It also carries a `checkedAny` sentinel, because the failure mode of
   a regex guard is matching nothing and passing forever.

   NOT COVERED, AND NOT A GAP: soft pressure. A suggestion that writes nothing
   and moves nothing passes every check here and can still feel like being
   managed. See the charter — this suite holds the preconditions, not the goal. */
{
  const { PLACES } = await import('../src/game/data/places.js');
  /* DERIVED FROM places.js, not typed. Renaming a room's door has to change
     what this guard watches, or it quietly stops watching that room — the same
     argument reachGap() already makes for the doors a resident names. */
  const doors = [...new Set(Object.values(PLACES).map(p => p && p.door).filter(Boolean))];
  const NAVIGATORS = [...doors, 'openReader', 'openFullText', 'reopenIfReplaced', 'openReplacedCopy'];
  if (doors.length < 10) {
    fail(`smoke: guard D derived only ${doors.length} doors from places.js — the shape has changed and `
       + 'it is watching almost nothing');
  }

  /* The entry points a visitor did NOT press. Each one is here because it runs
     on something other than a click: a dropped file, a clock, a promise, the
     end of a spoken sentence. Adding one to this list is a claim that it can
     fire without being asked — which is exactly when this check matters. */
  const UNPRESSED = {
    acceptDropAnywhere: 'a file dropped on the window — the drop is a press to SHELVE, never to navigate',
    sweepReminders:     'a clock comparison, not a request',
  };
  const ovD = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  const codeD = ovD.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  let bodiesD = 0;
  for (const fn of Object.keys(UNPRESSED)) {
    const at = codeD.search(new RegExp('(?:export\\s+)?(?:async\\s+)?function\\s+' + fn + '\\s*\\('));
    if (at < 0) {
      fail(`smoke: guard D cannot find ${fn}() in overlays.js — it is watching a function that no `
         + 'longer exists, so it is watching nothing');
      continue;
    }
    bodiesD++;
    let i = codeD.indexOf('{', at), depth = 0, end = i;
    for (; end < codeD.length; end++) {
      if (codeD[end] === '{') depth++;
      else if (codeD[end] === '}') { depth--; if (!depth) break; }
    }
    const body = codeD.slice(i, end + 1);
    for (const nav of NAVIGATORS) {
      /* A NAME INSIDE AN onclick= IS THE OPPOSITE OF A VIOLATION — it is the
         button. Strip the inline handlers before looking, or the toast's own
         "📖 Open your copy" offer reads as the auto-navigation it replaced,
         and this guard fails the exact fix it was written to require. */
      const withoutHandlers = body.replace(/on(?:click|change|input)="[^"]*"/g, ' ');
      if (new RegExp('(^|[^\\w$.])' + nav + '\\s*\\(').test(withoutHandlers)) {
        fail(`overlays.js: ${fn}() calls ${nav}() — ${UNPRESSED[fn]}. Moving the visitor there is a `
           + 'decision they did not make. Offer it (a button in the toast, a link in the panel) '
           + 'instead of doing it.');
      }
    }
  }
  if (bodiesD !== Object.keys(UNPRESSED).length) {
    fail(`smoke: guard D read ${bodiesD} of ${Object.keys(UNPRESSED).length} unpressed entry points`);
  }

  /* AND THE BOOT DOES NOT WRITE INTO THE VISITOR'S RECORD. main.js's database
     hydration logged "Read the catalogue from the local database — N books."
     on every launch, into the log of what THEY did. The status line is where
     the machine talks about itself. */
  const mainD = readFileSync(new URL('../src/game/main.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const hydrate = mainD.indexOf('hydrateFromDb()');
  /* THE CALLBACK BODY, BRACE-MATCHED — not a character window. The first
     version read 500 characters forward and swallowed
     `logActivity('Took the lift to '+scene().name)` twenty lines below, which
     is a press and entirely legitimate. It failed on already-correct code.
     Diagnose red before believing it: three checks in this project WERE the
     broken thing, and this was very nearly a fourth. */
  let cb = '';
  if (hydrate >= 0) {
    const open = mainD.indexOf('{', mainD.indexOf('.then(', hydrate));
    let depth = 0, end = open;
    for (; end < mainD.length && open >= 0; end++) {
      if (mainD[end] === '{') depth++;
      else if (mainD[end] === '}') { depth--; if (!depth) break; }
    }
    cb = open >= 0 ? mainD.slice(open, end + 1) : '';
  }
  if (hydrate < 0 || !cb) {
    fail('smoke: guard D cannot find the hydrateFromDb() callback in main.js');
  } else if (/logActivity\s*\(/.test(cb)) {
    fail('main.js: the database hydration calls logActivity() — that writes a sentence the visitor '
       + 'did not cause into their own activity log, on every boot. Put it on the status line '
       + '(refreshBackendStatus) instead.');
  }
}

/* ---------- "NO LOCAL AI DETECTED" WAS THE ANSWER TO SIX PROBLEMS ----------
   2026-08-09, and this one was paid for in a live debugging session rather than
   found by reading.

   The steward's residents went silent. Ollama was running. `ollama list` was
   empty while 19 GB of models sat on disk — the desktop app's model folder had
   been pointed at the `manifests/registry.ollama.ai/library` subfolder instead
   of the models root. He fixed that, and it STILL did not work, because his
   save had no ENABLED connection: detectAI() made zero network calls, so no log
   anywhere — ours, Ollama's, the browser's — recorded a single failure. It
   looked exactly like a dead server.

   Telling those two apart took a request log, a second Ollama on a spare port,
   and an Electron probe against the real main process. A tester will do none of
   that. They will write "the AI doesn't work" and stop.

   Rules 5 and 6 both: a silent undifferentiated failure, and a place where the
   honest answer names two causes because the app genuinely cannot tell them
   apart. */
{
  const P = await import('../src/game/ai/provider.js');
  const { AI_TROUBLE, AI_TROUBLE_KEYS } = P;

  if (!AI_TROUBLE || !AI_TROUBLE_KEYS || AI_TROUBLE_KEYS.length < 6) {
    fail(`ai/provider.js: AI_TROUBLE has ${AI_TROUBLE_KEYS ? AI_TROUBLE_KEYS.length : 0} states — there `
       + 'were eight when this guard was written, one per distinguishable failure. Fewer means states '
       + 'were collapsed back into one message, which is the bug.');
  }

  /* --- every state says something, and says something DIFFERENT --- */
  const ctx = { name: 'Ollama (local)', url: 'http://localhost:11434', detail: 'gpt-oss:20b-cloud' };
  const said = new Map();
  for (const k of (AI_TROUBLE_KEYS || [])) {
    const t = AI_TROUBLE[k];
    if (typeof t.say !== 'function') { fail(`AI_TROUBLE.${k} has no say()`); continue; }
    if (typeof t.fix !== 'string' || t.fix.length < 4) {
      fail(`AI_TROUBLE.${k}.fix is missing — the panel headline is "No AI is answering — <fix>", so a `
         + 'state with no fix produces a headline that tells nobody anything');
    }
    const s = String(t.say(ctx) || '');
    if (s.length < 25) fail(`AI_TROUBLE.${k}.say() returned "${s}" — too short to tell anyone what to do`);
    if (/^no (local )?ai (is )?(detected|connected)\.?$/i.test(s.trim())) {
      fail(`AI_TROUBLE.${k}.say() is the old undifferentiated sentence, which is the thing this guard exists to stop`);
    }
    /* THE WHOLE POINT. Six states resolving to one string is exactly the bug,
       and it would otherwise pass every other check in this block. */
    if (said.has(s)) {
      fail(`AI_TROUBLE.${k} and AI_TROUBLE.${said.get(s)} produce the SAME sentence — "${s.slice(0, 70)}…". `
         + 'Four different problems with four different fixes must not read identically; that is the '
         + 'failure this whole block was written for.');
    }
    said.set(s, k);
  }

  /* --- the two states with a named cause actually name it --- */
  const noModels = String(AI_TROUBLE.NO_MODELS ? AI_TROUBLE.NO_MODELS.say(ctx) : '');
  if (!/ollama pull/i.test(noModels)) {
    fail('AI_TROUBLE.NO_MODELS does not give the command that fixes it. "ollama pull llama3.2" is the '
       + 'whole difference between a tester filing a bug and a tester fixing it in ten seconds.');
  }
  /* RULE 6, held as a check. From inside the app an empty /api/tags looks the
     same whether nothing is installed or the model folder is misconfigured.
     Saying only the first would be a guess presented as a diagnosis. */
  if (!/folder|director/i.test(noModels)) {
    fail('AI_TROUBLE.NO_MODELS names only one cause. An empty model list is EITHER nothing installed OR '
       + 'a misconfigured model folder, and the app cannot tell which — the steward lost an evening to '
       + 'the second one. Say both, and say that we cannot tell them apart.');
  }
  const noneEnabled = String(AI_TROUBLE.NONE_ENABLED ? AI_TROUBLE.NONE_ENABLED.say(ctx) : '');
  if (!/nothing|not .*contacted|no connection/i.test(noneEnabled)) {
    fail('AI_TROUBLE.NONE_ENABLED must say that nothing was contacted at all. It is the worst of the '
       + 'states precisely because it produces no evidence anywhere.');
  }

  /* --- detectAI records it, and the empty case short-circuits --- */
  const src = readFileSync(new URL('../src/game/ai/provider.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const at = src.indexOf('export async function detectAI');
  if (at < 0) { fail('smoke: cannot find detectAI() — this guard is watching nothing'); }
  else {
    let i = src.indexOf('{', at), depth = 0, end = i;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}') { depth--; if (!depth) break; }
    }
    const body = src.slice(i, end + 1);
    if (!/NONE_ENABLED/.test(body)) {
      fail('ai/provider.js: detectAI() does not set NONE_ENABLED. An empty enabled-list makes zero '
         + 'network calls, so if it is not recorded here it is recorded nowhere at all — which is '
         + 'exactly how it went undiagnosed.');
    }
    /* THREE WRITES, NOT ONE. There are three outcomes — nothing enabled, one
       answered, none answered — and each must record itself. Testing for the
       mere presence of `lastDetectInfo =` passed while the FAILURE branch was
       deleted, because the empty-list branch above still had one. Born dead on
       its first sabotage; check the statement, not the word. */
    const writes = (body.match(/lastDetectInfo\s*=/g) || []).length;
    if (writes < 3) {
      fail(`ai/provider.js: detectAI() writes lastDetectInfo ${writes} time(s), not 3. Each of its three `
         + 'outcomes — nothing enabled, one answered, none answered — has to record itself, or the '
         + 'panel shows a diagnosis left over from the previous run.');
    }
  }

  /* --- and it REACHES the two surfaces that are about the connection --- */
  const ovAI = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  for (const fn of ['refreshAIStatus', 'connDiagnosisCard']) {
    const a = ovAI.search(new RegExp('(?:export\\s+)?(?:async\\s+)?function\\s+' + fn + '\\s*\\('));
    if (a < 0) { fail(`smoke: cannot find ${fn}() in overlays.js`); continue; }
    let j = ovAI.indexOf('{', a), d2 = 0, e2 = j;
    for (; e2 < ovAI.length; e2++) {
      if (ovAI[e2] === '{') d2++;
      else if (ovAI[e2] === '}') { d2--; if (!d2) break; }
    }
    /* CALLING IT IS NOT SHOWING IT. The first version of this checked only that
       aiTroubleLine() appeared in the body — and passed cleanly when the
       rendered text was replaced with "Something went wrong." while the call
       sat above it, result unused. That is the inert-pure-function bug wearing
       the guard for it. So: find what the call is assigned to, and require THAT
       to reach the output. */
    const fnBody = ovAI.slice(j, e2 + 1);
    const assigned = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*aiTroubleLine\s*\(/.exec(fnBody);
    if (!assigned) {
      fail(`overlays.js: ${fn}() does not call aiTroubleLine(). The diagnosis exists and the one place `
         + 'a person looks does not show it — the inert-pure-function bug, again.');
    } else {
      /* USED IN SOMETHING THAT REACHES THE SCREEN — and not only inside a
         template literal. The first version of THIS check required `${…why…}`
         and failed refreshAIStatus(), which builds its line with `+ esc(why)`.
         Correct code, wrong check: the fifth time in this project a red result
         was the guard rather than the code. So: the variable must appear again,
         on a line that is building output. */
      const v = assigned[1];
      const used = fnBody.split('\n').some(l =>
        new RegExp('(^|[^\\w$])' + v + '($|[^\\w$])').test(l)
        && !/(?:const|let|var)\s+/.test(l)
        && /(innerHTML|textContent|return|\$\{|\+)/.test(l));
      if (!used) {
        fail(`overlays.js: ${fn}() computes the diagnosis into "${v}" and never renders it. The call is `
           + 'there, the sentence is not — which is worse than not calling it, because it looks wired.');
      }
    }
  }
  /* The nine "this feature needs an AI" messages in the rooms are answering a
     different question and are deliberately NOT part of this. If that ever
     stops being true, this count is where it will show up. */
  const roomMsgs = (ovAI.match(/No local AI (?:is )?connect/g) || []).length;
  if (roomMsgs > 12) {
    fail(`overlays.js has ${roomMsgs} "No local AI connected" messages, up from nine. They are allowed `
       + 'to be identical because they answer "can this feature run?" — but if they are multiplying, '
       + 'they want one helper rather than a tenth copy.');
  }
}

/* ---------- A BADGE MEANS WHAT ITS DESCRIPTION SAYS ----------
   2026-08-09. Written while building the tutorial on top of badges, which is
   when it became load-bearing that a badge is TRUE — a stage that says "now
   write a note beside a book" is worthless if the badge proving it can be
   earned three rooms away.

   THERE WAS NO BADGE GUARD AT ALL BEFORE THIS. That is why four inaccuracies
   accumulated unnoticed:

     first-note   awarded from FOUR sites, one of them planting a bequest in
                  the Inheritance Hall, under the description "add a note to a
                  book in the Reader"
     first-plan   only ever fired from savePlanner(announce), never the
                  autosave — so typing an intention and walking away earned
                  nothing while the description promised otherwise
     first-page   "from any Library shelf", fired from openReader(), which is
                  reachable from about twenty places
     (and)        nothing whatsoever awarded writing your own lesson, though
                  ui/lesson-tree.js had imported awardBadge since the day it
                  was written

   THE COUNT TABLE IS THE POINT. "Every badge has a call site" would have
   passed on all four of those. What catches a badge quietly acquiring a fifth
   meaning is knowing how many places award it and failing when that changes. */
{
  const { BADGES } = await import('../src/game/data/badges.js');
  const files = ['entities.js', 'main.js', 'ui/overlays.js', 'ui/daily-tasks.js',
                 'ui/lesson-tree.js', 'ui/study-table.js', 'ui/residents.js'];
  const bodies = {};
  for (const f of files) {
    try {
      bodies[f] = readFileSync(new URL('../src/game/' + f, import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    } catch (e) { /* not every path exists forever */ }
  }
  const all = Object.values(bodies).join('\n');
  /* The definition and the dispatcher are not award sites. */
  const awards = [...all.matchAll(/awardBadge\(\s*'([^']+)'/g)].map(m => m[1]);
  const ids = new Set(BADGES.map(b => b.id));

  if (BADGES.length < 17) {
    fail(`data/badges.js has ${BADGES.length} badges — there were 19 when this guard was written. `
       + 'Badges are never revoked, so a shrinking list means one was deleted out from under a save.');
  }
  for (const b of BADGES) {
    if (!awards.includes(b.id)) {
      fail(`badges.js declares '${b.id}' and nothing awards it — a locked row in the Badges panel `
         + 'describing something no code can ever grant');
    }
    if (!b.desc || b.desc.length < 12) fail(`badges.js: '${b.id}' has no usable description`);
  }
  for (const a of awards) {
    if (!ids.has(a)) {
      fail(`awardBadge('${a}') names a badge that does not exist in BADGES — awardBadge() silently `
         + 'no-ops on an unknown id, so this is a button that appears to do something and does not');
    }
  }

  /* --- HOW MANY PLACES AWARD EACH ONE. Hand-written on purpose: changing a
     number here is the moment to ask whether the badge still means one thing. */
  const EXPECTED = {
    'first-steps':1, 'first-menu':1, 'first-word':1, 'first-page':1, 'first-cast':1,
    'first-plan':1, 'first-course':1, 'first-entry':1, 'first-waypoint':1, 'first-carry':1,
    'first-note':3,          // Notes Log, the Writing Desk, and beside a book
    'first-book-note':1,     // writeBookNote() ONLY — the tutorial leans on this
    'first-lesson':1,        // saveMyLesson() ONLY
    'first-task':1, 'five-tasks':1, 'twentyfive-tasks':1,
    'streak-3':1, 'streak-7':1, 'streak-30':1,
  };
  for (const id of Object.keys(EXPECTED)) {
    const n = awards.filter(a => a === id).length;
    if (n !== EXPECTED[id]) {
      fail(`'${id}' is awarded from ${n} place(s); this guard expects ${EXPECTED[id]}. If that is a `
         + 'deliberate change, update the table here AND check the description is still true of every '
         + 'one of them — first-note said "add a note to a book in the Reader" while being awarded for '
         + 'planting a bequest in the Inheritance Hall.');
    }
  }
  for (const id of ids) {
    if (!(id in EXPECTED)) {
      fail(`badges.js declares '${id}' and the call-site table in smoke.mjs does not mention it — a new `
         + 'badge has to say how many places award it, or it can quietly acquire a second meaning');
    }
  }

  /* --- the two the tutorial depends on live in exactly one function each --- */
  const pinned = [
    ['first-book-note', 'ui/overlays.js', 'writeBookNote'],
    ['first-lesson',    'ui/lesson-tree.js', 'saveMyLesson'],
  ];
  for (const [id, file, fn] of pinned) {
    const src = bodies[file] || '';
    const at = src.search(new RegExp('(?:export\\s+)?(?:async\\s+)?function\\s+' + fn + '\\s*\\('));
    if (at < 0) { fail(`smoke: cannot find ${fn}() in ${file} — the badge pin is watching nothing`); continue; }
    let i = src.indexOf('{', at), depth = 0, end = i;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}') { depth--; if (!depth) break; }
    }
    if (!src.slice(i, end + 1).includes(`awardBadge('${id}')`)) {
      fail(`'${id}' is not awarded inside ${fn}(). It is the single fact a tutorial stage reads, so it `
         + 'has to be granted by the one act it names and by nothing else.');
    }
  }

  /* --- and the planting site stays gone --- */
  const ov = bodies['ui/overlays.js'] || '';
  const plant = ov.search(/function\s+createPlanting\s*\(/);
  if (plant >= 0) {
    let i = ov.indexOf('{', plant), d = 0, e = i;
    for (; e < ov.length; e++) { if (ov[e] === '{') d++; else if (ov[e] === '}') { d--; if (!d) break; } }
    if (/awardBadge\(/.test(ov.slice(i, e + 1))) {
      fail('createPlanting() awards a badge again. It awarded first-note until 2026-08-09 — "add a note '
         + 'to a book in the Reader" for planting a bequest — which let a tutorial stage be satisfied by '
         + 'an unrelated act in another room. A planting badge of its own would be fine; this is not.');
    }
  }
}

/* ---------- THE WALK KEEPS NO SECOND SET OF BOOKS ----------
   2026-08-09. Five stages, and the whole design rests on one property: which
   stage you are on is DERIVED from what you have actually done — badges,
   tasks, lessons, the shelf — and is never written down.

   Two progress systems that must agree is rule 4's exact shape, and this
   project has lost to it repeatedly: hideAllOv(), the window exports and the
   resident roster all drifted from the lists they were supposed to match. A
   tutorial with its own `stage: 3` counter would be the same bug with a
   friendlier face — and it would go wrong in the worst possible way, telling
   a person they had done something they had not, or refusing to admit that
   they had. */
{
  const T = await import('../src/game/data/tutorial.js');
  const tutSrc = readFileSync(new URL('../src/game/data/tutorial.js', import.meta.url), 'utf8');
  const uiSrc  = readFileSync(new URL('../src/game/ui/tutorial.js', import.meta.url), 'utf8');
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const tutCode = strip(tutSrc), uiCode = strip(uiSrc);

  /* --- 1 · the pure half is pure --- */
  if (/from\s+['"][^'"]*entities\.js['"]/.test(tutCode)) {
    fail('data/tutorial.js imports entities.js — it exists to be testable without a DOM or a save, '
       + 'the same contract data/daily-tasks.js and data/carrying.js keep');
  }
  /* NO SPACE AFTER THE DOT. The first version tested `.includes('window.')`
     and failed on the visitor-facing sentence "dragged onto the window.
     Nothing is uploaded" — it was matching English, not code. The copy in this
     file is prose by design, so the pattern has to be property access. */
  for (const bad of [/\bdocument\.[A-Za-z_$]/, /\bwindow\.[A-Za-z_$]/, /\bwindow\[/]) {
    if (bad.test(tutCode)) fail(`data/tutorial.js touches ${bad} — the pure half may not`);
  }

  /* --- 2 · ★ IT STORES NOTHING DERIVABLE. The rule-4 guard. --- */
  const ALLOWED = ['started', 'ready', 'graduated'];
  const writes = [...uiCode.matchAll(/data\.tutorial(?:\(\))?\.([A-Za-z_$][\w$]*)\s*=/g)].map(m => m[1])
    .concat([...uiCode.matchAll(/\bt\.([A-Za-z_$][\w$]*)\s*=/g)].map(m => m[1]));
  for (const w of writes) {
    if (!ALLOWED.includes(w)) {
      fail(`ui/tutorial.js writes data.tutorial.${w}. Only ${ALLOWED.join('/')} may be stored — `
         + 'anything else is a second copy of a fact the save already holds, and the two will '
         + 'disagree. Which stage you are on is DERIVED, always.');
    }
  }
  /* And it writes into nobody else's store. Badges fire at their own call
     sites; a tutorial that awarded them would be marking its own homework. */
  for (const store of ['badges', 'dailyTasks', 'myLessons', 'curriculum', 'commons', 'personalLibrary']) {
    if (new RegExp('data\\.' + store + '\\s*(\\[[^\\]]*\\])?\\s*=[^=]').test(uiCode)) {
      fail(`ui/tutorial.js assigns data.${store} — it may only READ what other rooms record. `
         + 'A tutorial that grants its own proof proves nothing.');
    }
  }
  if (/awardBadge\s*\(|showBadgeToast\s*\(/.test(uiCode + tutCode)) {
    fail('the tutorial awards a badge. Badges are records of things done in the rooms that do them; '
       + 'granting one from here would let the walk certify itself.');
  }

  /* --- 3 · every door it names is real, and on window --- */
  const exported = new Set();
  {
    const ov = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
    /* lastIndexOf, NOT indexOf. overlays.js opens with a map of ITSELF that
       names "Object.assign(window, {" in prose, so the first match is 6,800
       characters into the header comment and the "block" that followed was
       22,000 characters of unrelated function bodies. It yielded well over
       fifty plausible identifiers, so the sentinel below passed on pure
       garbage while every real door failed. Hence the named-anchor check too:
       a count is not evidence that you read the right thing. */
    const at = ov.lastIndexOf('Object.assign(window, {');
    const block = ov.slice(at, ov.indexOf('});', at));
    for (const m of block.matchAll(/([A-Za-z_$][\w$]*)\s*[,\n]/g)) exported.add(m[1]);
  }
  if (exported.size < 50) {
    fail(`smoke: read only ${exported.size} window exports — the tutorial door check is reporting on nothing`);
  }
  for (const anchor of ['closeUI', 'openReader', 'openMenu']) {
    if (!exported.has(anchor)) {
      fail(`smoke: the window-export block this check read does not contain ${anchor}, so it is not the `
         + 'export block. Every door below would fail for the wrong reason.');
    }
  }
  const { PLACES } = await import('../src/game/data/places.js');
  const doors = T.tutorialDoors();
  const places = T.tutorialPlaces();
  if (!doors.length || !places.length) {
    fail('smoke: the tutorial names no doors or no places — this check has drifted off its subject');
  }
  for (const d of doors) {
    if (!exported.has(d)) {
      fail(`data/tutorial.js points a beat or aside at ${d}(), which is not in the window export block. `
         + 'Inline onclick handlers only resolve against window, so that is a button that does nothing.');
    }
  }
  for (const p of places) {
    if (!PLACES[p]) fail(`data/tutorial.js names place '${p}', which is not in data/places.js`);
    else if (!exported.has(PLACES[p].door)) {
      fail(`place '${p}' opens with ${PLACES[p].door}(), which is not on window`);
    }
  }

  /* --- 4 · the ordering is monotonic, and honest about a save that
         did all of this before the walk existed --- */
  const S = {
    empty: {},
    stage1done: { catalogueCount:1, badges:{ 'first-book-note':'x', 'first-carry':'x' } },
  };
  S.stage2done = { ...S.stage1done, badges:{ ...S.stage1done.badges, 'first-word':'x' } };
  S.stage3done = { ...S.stage2done, dailyTasks:[{ id:1 }] };
  S.stage4done = { ...S.stage3done, myLessons:[{ id:'mine-a' }] };
  S.all        = { ...S.stage4done, tutorial:{ started:'', ready:{}, graduated:{ on:'x', lesson:'mine-a' } } };
  const want = { empty:1, stage1done:2, stage2done:3, stage3done:4, stage4done:5, all:6 };
  for (const k of Object.keys(want)) {
    const got = T.currentStage(S[k]);
    if (got !== want[k]) fail(`data/tutorial.js: currentStage(${k}) is ${got}, expected ${want[k]}`);
  }
  /* THE STEWARD'S OWN SAVE. He did every one of these organically, months
     before the walk existed, and never pressed "walk me through it". The
     honest answer is that stages 1-4 are done — not that he is on stage 1. */
  if (T.currentStage({ ...S.stage4done, tutorial:{ started:'', ready:{}, graduated:null } }) !== 5) {
    fail('data/tutorial.js: a save that did everything organically without ever starting the walk must '
       + 'still show those stages as done. Progress is what you did, not what you were walked through.');
  }
  /* And a stage is never described before it is reached — the letter of
     "one next thing at a time". */
  const st1 = T.stageState(S.empty);
  if (st1.filter(x => x.current).length !== 1) fail('data/tutorial.js: exactly one stage is current');
  if (!st1[0].current) fail('data/tutorial.js: a fresh save starts on stage 1');

  /* --- 5 · ★ Stage 5 does not promise Missions --- */
  const five = JSON.stringify(T.STAGES[4]) + T.MISSIONS_NOT_BUILT;
  if (!/not built/i.test(T.MISSIONS_NOT_BUILT)) {
    fail('MISSIONS_NOT_BUILT does not say Missions are not built, which is its entire job');
  }
  if (/unlocks?\b|F-rank (is|now)|you can now (take|start|join)|opens? (the )?missions?/i.test(five)) {
    fail('Stage 5 promises that graduating opens something. MISSION-SYSTEM-PLAN.md and '
       + 'THE-THREE-COURTS.md are unbuilt drafts — the latter subtitled "Nothing here is built" — so '
       + 'that is a door onto nothing, which is the failure this project names most often.');
  }

  /* --- 6 · graduation refuses with sentences --- */
  const no = T.canGraduate(S.stage4done, 'mine-a');
  if (no.ok) fail('canGraduate() passed a course that was never walked or published');
  if (!Array.isArray(no.missing) || !no.missing.length || typeof no.missing[0] !== 'string') {
    fail('canGraduate() returns no reasons. A button that declines without saying why is the same as '
       + 'a broken one — it has to name which of the five rows is missing.');
  }
  if (T.canGraduate(S.stage4done, null).ok) fail('canGraduate() passed with no lesson chosen');
  /* Two of the five rows are the visitor's judgement and must be MARKED as
     such — a checklist that pretends to have measured a judgement is worse
     than one that asks. */
  const rows = T.readyChecks(S.stage4done, 'mine-a');
  if (rows.length !== 5) fail(`readyChecks returned ${rows.length} rows, expected 5`);
  if (rows.filter(r => r.kind === 'judgement').length !== 2) {
    fail('readyChecks must mark exactly two rows as the visitor\'s own judgement — whether the steps '
       + 'stand alone, and what it produces. Code cannot read a lesson and know either.');
  }

  /* --- 7 · it never opens itself --- */
  const mainSrc = strip(readFileSync(new URL('../src/game/main.js', import.meta.url), 'utf8'));
  if (/openTutorial|tutorialStart/.test(mainSrc)) {
    fail('main.js names openTutorial/tutorialStart. The walk is reached by three presses and never '
       + 'appears unbidden — an onboarding flow that opens itself on boot is the thing everybody '
       + 'closes without reading.');
  }
  /* --- 8 · and the welcome panel is its front door, with the dead book gone --- */
  const ovAll = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8');
  if (!/onclick="tutorialStart\(\)"/.test(ovAll)) {
    fail('the welcome panel has no "walk me through it" press — the tutorial is built and the one '
       + 'place a newcomer arrives does not open it');
  }
  if (/How to Complete Your Own Pavilion/.test(ovAll)) {
    fail('overlays.js still points a newcomer at "How to Complete Your Own Pavilion", a book deleted '
       + 'with the seed on 2026-08-10. The only onboarding surface in the app pointing at nothing is '
       + 'exactly the first-arrival failure this work exists to end.');
  }
}

/* ---------- A LESSON STEP CAN HOLD A PARAGRAPH, AND SURVIVE THE JOURNEY ----------
   2026-08-10. Tutorial Stage 5 asks the visitor for a course whose "steps
   stand alone — someone who never met you could follow them." Until today a
   step could not hold more than ONE LINE, so the stage asked for something the
   format could not express. Three places enforced it independently:

     saveMyLesson()   split the textarea on newlines
     publishFrom()    flattened each step to `title | body`
     takePacket()     split it back on the first `|`

   The RENDERER was never the problem — ui/lesson-tree.js has printed s.body
   since it was written. A capability that existed and could not be reached,
   which is this project's signature bug.

   ONE FORMAT, AND ONE EMITTER. data/lesson-doc.js has written the
   teacher-facing Markdown since 2026-08-03, for the steward's friend who
   teaches English — the same person the round trip is for. A second Markdown
   writer would be rule 4's exact shape, so data/course-format.js parses what
   that one emits and asks it for the portable form rather than building its
   own. These checks hold that, because "there is only one of X" is precisely
   the kind of thing that stops being true quietly. */
{
  const CF = await import('../src/game/data/course-format.js');
  const LD = await import('../src/game/data/lesson-doc.js');

  /* --- 1 · the round trip is exact, or editing loses work --- */
  const cases = [
    { name: 'a multi-paragraph step',
      md: '---\ntitle: Reading slowly\nsummary: One chapter beats five.\nlevel: 101\n---\n\n'
        + '## Pick one chapter\n\nFirst paragraph.\n\nSecond paragraph.\n\n**Practice:** read it once.\n' },
    { name: 'a course drafted with a model',
      md: '---\ntitle: A drafted course\ndrafted-with: some-model\nauthor: Zac\n---\n\n## One\n\nBody.\n' },
    { name: 'a course naming a set text',
      md: '---\ntitle: On Walden\nreading: personal-walden\n---\n\n## Read chapter 2\n\nAnnotate it.\n' },
    { name: 'a field from a NEWER Pavilion',
      md: '---\ntitle: From the future\nunknown-key: kept anyway\n---\n\n## One\n\nBody.\n' },
  ];
  for (const c of cases) {
    const a = CF.parseCourse(c.md, { user: 'user 1' });
    if (!a.ok) { fail(`course-format: ${c.name} would not parse — ${a.problems[0]}`); continue; }
    const b = CF.parseCourse(CF.emitCourse(a.lesson), { user: 'user 1' });
    if (!b.ok) { fail(`course-format: ${c.name} did not survive being written out — ${b.problems[0]}`); continue; }
    if (JSON.stringify(a.lesson) !== JSON.stringify(b.lesson)) {
      fail(`course-format: ${c.name} changed on a round trip. Save-as-Markdown then re-import must be `
         + `lossless or editing a course silently deletes part of it.\n      in:  ${JSON.stringify(a.lesson).slice(0, 160)}`
         + `\n      out: ${JSON.stringify(b.lesson).slice(0, 160)}`);
    }
  }
  /* THE ONE THAT IS THE WHOLE POINT. */
  const para = CF.parseCourse(cases[0].md, { user: 'user 1' });
  if (!para.ok || !/\n\n/.test(para.lesson.steps[0].body)) {
    fail('course-format: a step body lost its paragraph breaks. That is the entire reason this format '
       + 'exists — Stage 5 asks for steps that stand alone and one line cannot.');
  }

  /* --- 2 · it refuses with sentences, never a bare false --- */
  for (const [bad, why] of [['', 'nothing at all'], ['## just a step', 'no title'],
                            ['---\ntitle: T\n---\n\nno headings here', 'no steps']]) {
    const r = CF.parseCourse(bad);
    if (r.ok) { fail(`course-format: accepted ${why}`); continue; }
    if (!r.problems.length || typeof r.problems[0] !== 'string' || r.problems[0].length < 15) {
      fail(`course-format: rejected ${why} without a usable sentence — a person pasting a file that will `
         + 'not import needs to know which line to fix');
    }
  }

  /* --- 3 · ★ ONE EMITTER. course-format must delegate, not duplicate. --- */
  const cfSrc = readFileSync(new URL('../src/game/data/course-format.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!/from\s+'\.\/lesson-doc\.js'/.test(cfSrc)) {
    fail('data/course-format.js does not import lesson-doc.js — it has grown its own Markdown writer. '
       + 'lessonToMarkdown() has produced the teacher-facing document since 2026-08-03; two writers for '
       + 'one object drift, and the one that drifts is the one nobody looks at.');
  }
  if (/'---\\n'|"---\\n"|`---\\n/.test(cfSrc)) {
    fail('data/course-format.js builds a frontmatter block itself. That belongs to lessonToMarkdown\'s '
       + '`frontmatter` option — see the comment there.');
  }
  /* And the emitter really does produce something the parser reads. */
  const emitted = LD.lessonToMarkdown(
    { title: 'T', summary: 'S', level: 101, steps: [{ title: 'One', body: 'a\n\nb' }], by: { who: 'you', user: 'u' } },
    { frontmatter: true });
  if (!CF.parseCourse(emitted).ok) {
    fail('lessonToMarkdown({frontmatter:true}) emits something parseCourse cannot read. The two halves '
       + 'of the round trip have come apart.');
  }
  /* A numbered heading must not accumulate on repeated trips. */
  const twice = CF.parseCourse(CF.emitCourse(CF.parseCourse(emitted).lesson));
  if (twice.ok && /^\d+\.\s/.test(twice.lesson.steps[0].title)) {
    fail('course-format: a step title picked up its positional number ("1. One") on a round trip, so it '
       + 'grows every time the file is exported and re-imported');
  }

  /* --- 4 · the pure half stays pure --- */
  for (const bad of [/\bdocument\.[A-Za-z_$]/, /\bwindow\.[A-Za-z_$]/, /from\s+'[^']*entities\.js'/]) {
    if (bad.test(cfSrc)) fail(`data/course-format.js touches ${bad} — it is the testable half`);
  }

  /* --- 5 · ★ mdLite escapes BEFORE it adds markup --- */
  const { mdLite } = await import('../src/game/ui/dom.js');
  const nasty = mdLite('<img src=x onerror=alert(1)> **bold**');
  if (/<img/.test(nasty)) {
    fail('ui/dom.js: mdLite() let raw HTML through. A lesson step is author text and can arrive from a '
       + 'packet somebody else wrote — it MUST be escaped before any markup is introduced.');
  }
  if (!/<b>bold<\/b>/.test(nasty)) fail('ui/dom.js: mdLite() did not render **bold**');
  if (/<b>/.test(mdLite('a * b * c'))) fail('ui/dom.js: mdLite() turned single asterisks into markup');

  /* --- 6 · the packet carries the document --- */
  const ovC = readFileSync(new URL('../src/game/ui/overlays.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!/kind:'lesson'[\s\S]{0,400}body:emitCourse\(/.test(ovC)) {
    fail('overlays.js: a lesson packet no longer carries body:emitCourse(node). Steps would go back to '
       + 'being flattened to `title | body`, which truncates every paragraph on the way to another person.');
  }
  if (!/parseCourse\(p\.body/.test(ovC)) {
    fail('overlays.js: takePacket() does not read the packet body as a course, so a received lesson would '
       + 'be rebuilt from the flattened fallback even when the full document is right there');
  }
  /* The old field stays, deliberately: a Pavilion older than today reads it and
     nothing else, and a lesson that arrives thin beats one that arrives empty. */
  if (!/steps:\(node\.steps\|\|\[\]\)\.map/.test(ovC)) {
    fail('overlays.js: the lesson packet stopped writing the flattened `steps` array. It is there for '
       + 'Pavilions older than 2026-08-10, which read that and nothing else.');
  }
}

/* ---------- nothing may be checked after the verdict ----------
   THIS SUITE PRINTS ITS RESULT AND THEN EXITS. A block appended to the END of
   this file therefore runs after the verdict, and its failures go into a list
   nobody reads again - so it reports PASS while testing nothing at all.

   Not hypothetical: the whole carrying block above was first appended to the
   end of the file on 2026-08-07, reported clean twice, and was only caught
   when its subject was deliberately broken and the suite still said "all
   checks clean". Two guards written the same day were born dead; that one was
   born invisible, which is worse - a dead guard fails to catch a bug, an
   invisible one also certifies that there is none.

   So: the report must be the last thing in this file. */
{
  const selfSrc = readFileSync(new URL('./smoke.mjs', import.meta.url), 'utf8');
  const after = selfSrc.slice(selfSrc.indexOf('if (failures.length)'));
  if (/\n\{\s*\n/.test(after) || /\nconst \w+ = await import/.test(after)) {
    fail('smoke: there are checks AFTER the verdict is printed - they can never fail. '
       + 'Move them above `if (failures.length)`.');
  }
}

if (failures.length) {
  console.error(`✗ ${failures.length} smoke-test failure(s):\n`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
} else {
  const sceneCount = Object.keys(scenes).length;
  console.log(`✓ smoke test passed — ${sceneCount} scenes, ${SEED_LIBRARY.length} library docs, all checks clean.`);
}
