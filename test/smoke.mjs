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
import { scenes, SOLID } from '../src/game/scenes.js';
import { SEED_LIBRARY, TRADITIONS } from '../src/game/data/seed.js';

const KNOWN_STATION_KINDS = ['planner', 'courses', 'archive', 'computer', 'requests', 'notice', 'hearth', 'grantdesk', 'residents', 'research', 'coffee', 'review', 'records', 'ledger', 'makersbench', 'greenhouse', 'roundtable', 'mailroom'];

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
