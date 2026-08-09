/* ================================================================
   [ONE KEYSTROKE TO ANYWHERE] — 2026-08-10.

   The standing decision this suite is the proof of:

     "nothing may be a dead end ... ONE KEYSTROKE TO ANYWHERE beats a
      beautiful room you must walk to (built and unreachable is the same
      as unbuilt — learned with the Lab)."

   npm test holds the TABLE: every station in the world has a menu entry,
   every entry points at a station that is really there, and every door is
   really on window. What it cannot do is PRESS the button and see whether
   a room actually opens — and a button that does nothing is the house
   failure mode, because nobody reports it, they just stop using it.

   So this walks nowhere at all. It opens the pause menu once, and from
   there presses every room in the Pavilion in turn, checking each time
   that a real panel came up. That is the feature, stated as a test.

     npm run build:beta && npm run preview
     node test/live/every-room.mjs

   NO AI, NO DATABASE, NO SAVE TO SEED. Every room here must open on a
   first-morning save with nothing in it — a room that needs content
   before it will open is a dead end with extra steps.
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { PLACES, PLACE_KEYS, placesByScene } from '../../src/game/data/places.js';
import { scenes } from '../../src/game/scenes.js';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 1000 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
/* A brand-new visitor, past the welcome and nothing else. */
await p.evaluateOnNewDocument(() =>
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify({ saveVersion: 1, seenWelcome: true })));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await wait(800);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await wait(900);

// ---- 1 · the menu names the rooms at all --------------------------------
await p.evaluate(() => window.openMenu());
await wait(400);
const menuText = await p.evaluate(() => document.getElementById('menuPanel').innerText);

check('the pause menu opens', /Menu/.test(menuText), menuText.slice(0, 60));

/* THE ROOM HEADINGS ARE THE SCENES' OWN NAMES. If these came from a second
   spelling in places.js, a room renamed in scenes.js would silently keep its
   old name here — which is the drift the whole table exists to prevent.

   CASE-FOLDED, and that is not laziness: .menuSection is text-transform:
   uppercase, and Chrome's innerText returns RENDERED text, so "The Library"
   comes back as "THE LIBRARY". The first run of this suite reported eight
   missing headings that were all on screen. A check that reads the rendered
   text has to account for what rendering does to it. */
const flatMenu = menuText.toLowerCase();
for (const g of placesByScene(scenes)) {
  check(`the menu has a "${g.name}" section`, flatMenu.includes(g.name.toLowerCase()),
    'a whole room’s worth of doors filed under a heading that never rendered');
}

/* Every place, by the name a person actually reads. */
const missingLabels = PLACE_KEYS.filter(k => !flatMenu.includes(PLACES[k].label.toLowerCase()));
check('every room in the table is named in the menu', missingLabels.length === 0,
  'not listed: ' + missingLabels.map(k => PLACES[k].label).join(', '));

await p.screenshot({ path: 'test/live/_every-room-menu.png' });

/* THE MENU IS NOW TALLER THAN THE WINDOW, so "it is in the DOM" and "a
   person can get to it" have come apart, and only the second one is what
   this suite is about. Listing every room would be a poor trade if it
   pushed half of them off the bottom of an unscrollable panel.

   #menuOv is the scroller, not #menuPanel — the panel is overflow:visible
   and sizes to its content. The first run of this check scrolled the panel,
   which did nothing, and produced a "bottom" screenshot identical to the
   top. Measured rather than assumed this time. */
const scroll = await p.evaluate(() => {
  const ov = document.getElementById('menuOv');
  ov.scrollTop = ov.scrollHeight;
  return { top: ov.scrollTop, scrollH: ov.scrollHeight, clientH: ov.clientHeight };
});
check('the menu is longer than the window (it lists every room now)',
  scroll.scrollH > scroll.clientH, `${scroll.scrollH}px of menu in a ${scroll.clientH}px window`);
check('...and it really scrolls, so the last room is reachable',
  scroll.top > 0 && scroll.top >= scroll.scrollH - scroll.clientH - 2,
  `scrolled to ${scroll.top} of a possible ${scroll.scrollH - scroll.clientH} — `
  + 'the rooms at the bottom of this menu cannot be reached by a person');
await wait(250);
await p.screenshot({ path: 'test/live/_every-room-menu-bottom.png' });

// ---- 2 · press every one of them ----------------------------------------
/* The real check. `.overlay.open` is how showOv() marks a panel as up, so
   "some overlay other than the menu is open" is the general form of "the
   button did something", with no per-room knowledge to drift. */
const opened = [];
const dud = [];
for (const k of PLACE_KEYS) {
  const place = PLACES[k];
  /* RESET FIRST, AND PROVE THE RESET WORKED. A dialog left up from the
     previous room would make every dialog check below pass without the
     button doing anything — the vacuous-test mistake of 2026-08-08, where a
     check reopened the thing it was about to inspect and so could never
     fail. If the board is not clear, say so and stop trusting the run. */
  await p.evaluate(() => { if (window.closeDialog) window.closeDialog(); });
  await wait(120);
  const clear = await p.evaluate(() => document.getElementById('dialog').style.display !== 'block');
  if (!clear) { dud.push(place.label + ' — could not clear the previous dialog, so this check is meaningless'); continue; }
  await p.evaluate(() => window.openMenu());
  await wait(150);
  const res = await p.evaluate((door) => {
    const btn = [...document.querySelectorAll('#menuPanel button')]
      .find(b => (b.getAttribute('onclick') || '') === door + '()');
    if (!btn) return { found: false };
    btn.click();
    return { found: true };
  }, place.door);
  if (!res.found) { dud.push(place.label + ' (no button calling ' + place.door + '())'); continue; }
  await wait(320);
  const up = await p.evaluate(() => ({
    panels: [...document.querySelectorAll('.overlay.open')].map(el => el.id),
    dialog: document.getElementById('dialog').style.display === 'block',
    dName: (document.getElementById('dName') || {}).textContent || '',
  }));
  const real = up.panels.filter(id => id !== 'menuOv');

  if (place.dialog) {
    /* A SCRIPTED ROOM MUST CLEAR THE PANEL IT WAS OPENED FROM. This is the
       exact bug of 2026-08-10: the dialog opened BEHIND the pause menu, so
       the button read as dead and the dialog was unreachable — state.ui was
       still 'menu', so E returned early and could not advance it. */
    if (!up.dialog) dud.push(place.label + ' — pressed ' + place.door + '() and no dialog came up');
    else if (up.panels.includes('menuOv')) {
      dud.push(place.label + ' — the dialog opened UNDERNEATH the still-open pause menu; '
        + 'from a visitor’s side that button did nothing');
    } else opened.push([place.label, 'dialog: ' + up.dName]);
  } else if (real.length) opened.push([place.label, real.join('+')]);
  else dud.push(place.label + ' — pressed ' + place.door + '() and NOTHING opened');
}

check('every room opens when you press it', dud.length === 0, dud.join('\n      '));
check('all ' + PLACE_KEYS.length + ' rooms were reached without walking a single step',
  opened.length === PLACE_KEYS.length, opened.length + ' of ' + PLACE_KEYS.length);

/* And one room, looked at properly — the Archive Desk, which until today had
   no clickable door anywhere in the application at all. */
await p.evaluate(() => window.openMenu());
await wait(150);
await p.evaluate(() => window.openArchive());
await wait(400);
const archive = await p.evaluate(() => {
  const el = document.querySelector('.overlay.open');
  return el ? el.innerText : '(nothing open)';
});
check('the Archive Desk really opens from a click', /archive/i.test(archive), archive.slice(0, 120));
await p.screenshot({ path: 'test/live/_every-room-archive.png' });

check('no page errors', errs.length === 0, errs.join(' | '));

// ---- report --------------------------------------------------------------
const lines = R.map(([n, ok, d]) => `  ${ok ? '✓' : '✗'} ${n}${ok || !d ? '' : '\n      ' + d}`);
const detail = opened.map(([l, ids]) => `  · ${l}  →  ${ids}`).join('\n');
const out = `ONE KEYSTROKE TO ANYWHERE — ${new Date().toISOString()}\n\n`
  + lines.join('\n') + '\n\nrooms opened from the menu, walking nowhere:\n' + detail + '\n';
writeFileSync('test/live/_every-room.txt', out);
console.log(out);
const bad = R.filter(r => !r[1]).length;
console.log(bad ? `✗ ${bad} failure(s)` : `✓ all ${R.length} checks passed`);
await browser.close();
process.exit(bad ? 1 : 0);
