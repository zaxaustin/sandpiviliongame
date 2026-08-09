/* ================================================================
   [TWO GROUNDS] — 2026-08-10.

     "i dont wana loose features but we can move things like the pond and
      the inhertince hall to a second overlays screen. mabie even the
      workshop and the cafe as well"

   The Workshop, the Cafe, the Inheritance Hall and the pond moved to THE
   WORKS. npm test holds the geometry: every warp lands somewhere real,
   every tile is walkable from the spawn, the road runs both ways, every
   doorway is on its own building. What it cannot do is WALK.

   And walking is the whole question here, because this game's movement is
   HELD KEYS, not keypresses — one .press() moves you nowhere. So the road
   between the two Grounds is exactly the kind of thing that can be
   perfect in the data and impassable in the hands.

     npm run build:beta && npm run preview
     node test/live/two-grounds.mjs

   Nothing here needs an AI, a database, or a seeded save. A first-morning
   visitor must be able to walk out of the Pavilion and back.
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { scenes } from '../../src/game/scenes.js';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 900 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
/* SEEDED ONTO THE ROAD, three tiles short of the east gate.

   The first version of this suite walked from the spawn: up four, then east
   twenty. It drifted one row too far north on the way up, spent the whole
   eastward leg on grass ABOVE the road, and stopped dead against the
   treeline — reporting "the road east does not carry you across" about a
   road that was fine. Held-key movement over twenty tiles is a timing
   measurement, not a test of a gate.

   So the walk is short and the position is given. What is under test is the
   crossing itself, in both directions, which is the thing that is new. */
await p.evaluateOnNewDocument(() =>
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify({
    saveVersion: 1, seenWelcome: true, pos: { scene: 'overworld', x: 34, y: 17 },
  })));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await wait(800);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await wait(1000);

const where = () => p.evaluate(() => document.getElementById('loc').textContent);

/* A TILE TAKES 0.17s AND THE KEY MUST BE HELD — a .press() moves you
   nowhere in this game. Walk in short bursts and read the HUD after each,
   so arriving early is fine and arriving late is still arriving; only never
   arriving fails. */
async function hold(key, tiles) {
  await p.keyboard.down(key);
  await wait(tiles * 210 + 200);
  await p.keyboard.up(key);
  await wait(250);
}
async function walkUntil(key, scene, bursts = 6) {
  for (let i = 0; i < bursts; i++) {
    await hold(key, 3);
    if ((await where()) === scene) return true;
  }
  return false;
}

// ---- 1 · the Pavilion, and what is left standing in it -------------------
check('you start on the Pavilion Grounds', (await where()) === 'Pavilion Grounds', await where());
await p.screenshot({ path: 'test/live/_grounds-pavilion.png' });

/* The three that stayed, and the three that went — read off the real scene
   data rather than trusted, so "nothing was lost" is a measurement. */
const pav = scenes.overworld.buildings.map(b => b.label);
const wrk = scenes.works.buildings.map(b => b.label);
check('the Keep, the Library and the Study stayed on the Pavilion Grounds',
  ['PAVILION KEEP', 'THE LIBRARY', 'THE STUDY'].every(l => pav.includes(l)), pav.join(', '));
check('the Workshop, the Cafe and the Inheritance Hall stand in the Works',
  ['THE WORKSHOP', 'THE CAFE', 'INHERITANCE HALL'].every(l => wrk.includes(l)), wrk.join(', '));
check('nothing was lost — six buildings across two Grounds, as before',
  pav.length + wrk.length === 6, `${pav.length} + ${wrk.length}`);

// ---- 2 · walk it ---------------------------------------------------------
/* Deliberately walked, not warped: warpTo() is not on window at all, and a
   test that teleports proves nothing whatsoever about a road. */
const crossed = await walkUntil('ArrowRight', 'The Works');
check('you can WALK east out of the Pavilion and into the Works', crossed,
  `ended up in "${await where()}" — the road east does not carry you across`);

if (crossed) {
  await p.screenshot({ path: 'test/live/_grounds-works.png' });

  /* "You must not land ON the return warp" is now checked exactly in
     npm test, over every warp in the world, rather than nudged at here.
     The nudge version knocked the player a tile off the road and then
     reported the road home as one-way — a test failing on its own footwork. */

  // ---- 3 · and back again ----------------------------------------------
  const home = await walkUntil('ArrowLeft', 'Pavilion Grounds');
  check('you can walk back west to the Pavilion', home,
    `ended up in "${await where()}" — a one-way road is a trap`);
  if (home) {
    check('and you do not land on the road out either',
      (await where()) === 'Pavilion Grounds', 'the gate bounced you straight back to the Works');
  }
}

// ---- 5 · the pond came with its fisher -----------------------------------
const fisher = scenes.works.npcs.find(n => /SAGARA/.test(n.name || ''));
check('SAGARA the Fisher moved with the pond', !!fisher, 'the dock has no fisher on it');
const water = scenes.works.tiles.flat().filter(c => c === 'W').length;
const dock = scenes.works.tiles.flat().filter(c => c === 'D').length;
check('the pond and its dock are in the Works', water > 40 && dock === 2, `${water} water tiles, ${dock} dock`);
check('and no water is left on the Pavilion Grounds',
  !scenes.overworld.tiles.flat().includes('W'), 'a pond with no dock and no fisher stayed behind');

check('no page errors', errs.length === 0, errs.join(' | '));

// ---- report --------------------------------------------------------------
const lines = R.map(([n, ok, d]) => `  ${ok ? '✓' : '✗'} ${n}${ok || !d ? '' : '\n      ' + d}`);
const out = `TWO GROUNDS — ${new Date().toISOString()}\n\n` + lines.join('\n') + '\n';
writeFileSync('test/live/_two-grounds.txt', out);
console.log(out);
const bad = R.filter(r => !r[1]).length;
console.log(bad ? `✗ ${bad} failure(s)` : `✓ all ${R.length} checks passed`);
await browser.close();
process.exit(bad ? 1 : 0);
