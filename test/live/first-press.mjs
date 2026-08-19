/* [THE FIRST PRESS] — the three things a stranger does before anything works.
   ======================================================================
   Written 2026-08-18, and it exists because every other suite in this folder
   enters through `window.someFn()` rather than through a button. That is a
   perfectly good way to test what a panel DOES and it is no way at all to test
   whether a visitor can get to it — which is how this shipped:

     #title is z-index:10. An .overlay is z-index:9. So the title screen's
     "🧭 New here? Start here" — the one control in the whole application
     addressed to a first-time visitor — opened the welcome panel BEHIND the
     title screen. The handler bound, the export existed, `.open` was applied,
     `state.ui` was set. Every static guard passed. Nothing was visible.

   So this suite presses real buttons and then asks the BROWSER what is on top,
   via elementFromPoint at the panel's own centre. `.open` being set is exactly
   the evidence that was already there and was already worthless; the question
   is what a person's click would actually land on.

   It also covers the two input bugs found the same day:
     · arrows were preventDefault'd unconditionally, so with a book open
       up/down neither scrolled the page text, nor turned a page, nor moved you
     · nothing ever cleared the held-key set, so losing focus mid-walk latched
       a direction and the player walked off by itself

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { inlineBook, A_BOOK } from './_books.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

const save = { seenWelcome: true, aiConnections: [], personalLibrary: [inlineBook()] };

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 980 } });
const p = await b.newPage();
p.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); failed++; });

/* seenWelcome:true on purpose — the auto-open on a virgin save is NOT what is
   on trial. The button is. */
await p.evaluateOnNewDocument(s => {
  localStorage.setItem('sandPavilionSave.v2', s);
}, JSON.stringify(save));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await wait(600);

/* Is this element the thing a click at its own centre would actually hit?
   Anything else on top — including the title screen — and the answer is no. */
const reallyVisible = (sel) => p.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return { found: true, sized: false };
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const onTop = !!hit && (el === hit || el.contains(hit));
  const cs = getComputedStyle(el);
  return { found: true, sized: true, onTop, z: cs.zIndex, display: cs.display,
           topEl: hit ? (hit.id || hit.className || hit.tagName) : null };
}, sel);

console.log('\n— 1 · the title screen, before anything is pressed —');
const titleUp = await p.evaluate(() => getComputedStyle(document.getElementById('title')).display !== 'none');
ok('the title screen is showing', titleUp);

console.log('\n— 2 · "🧭 New here? Start here", pressed for real —');
await p.click('#welcomeBtn');
await wait(400);
const w = await reallyVisible('#welcomeOv');
ok('#welcomeOv exists and has size', w.found && w.sized, JSON.stringify(w));
ok('IT IS ACTUALLY ON TOP — a click lands on the panel, not the title screen',
   w.onTop, w.onTop ? '' : `z=${w.z}, the click would hit "${w.topEl}" instead`);
await p.screenshot({ path: 'test/live/_shot-welcome-from-title.png' });

console.log('\n— 3 · and "Start the walk" from inside it —');
const startedWalk = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('#welcomePanel button')]
    .find(x => /start the walk/i.test(x.textContent));
  if (!btn) return false;
  btn.click(); return true;
});
ok('the welcome panel really has a "Start the walk" button to press', startedWalk);
await wait(400);
const t = await reallyVisible('#tutorialOv');
ok('#tutorialOv is on top too', t.onTop, t.onTop ? '' : `z=${t.z}, would hit "${t.topEl}"`);
const stageOne = await p.evaluate(() => document.getElementById('tutorialPanel').textContent);
ok('and it is stage 1, on a fresh walk', /Bring one book in/i.test(stageOne));
await p.screenshot({ path: 'test/live/_shot-tutorial-from-title.png' });

console.log('\n— 4 · the Connections panel\'s back button does not open a panel nobody can see —');
await p.evaluate(() => window.closeUI());
await wait(200);
await p.click('#connBtn');
await wait(400);
const c = await reallyVisible('#connOv');
ok('#connOv is on top', c.onTop, c.onTop ? '' : `z=${c.z}, would hit "${c.topEl}"`);
const backLabel = await p.evaluate(() => {
  const x = document.querySelector('#connPanel .xbtn');
  return x ? x.textContent.trim() : null;
});
ok('from the title screen its back button says "← Back", not "← Back to menu"',
   backLabel === '← Back', 'said: ' + backLabel);
await p.evaluate(() => document.querySelector('#connPanel .xbtn').click());
await wait(300);
const afterBack = await p.evaluate(() => ({
  menuOpen: document.getElementById('menuOv').classList.contains('open'),
  ui: window.__state ? window.__state.ui : null,
}));
ok('pressing it does NOT open the pause menu behind the title screen', !afterBack.menuOpen);

console.log('\n— 5 · into the grounds, and the arrows in a book —');
await p.click('#startBtn');
await wait(500);
await p.evaluate(s => window.openReader(s), A_BOOK);
await wait(400);
const intoText = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(x => /read the (whole|full)|full text/i.test(x.textContent));
  if (btn) { btn.click(); return btn.textContent.trim(); }
  return null;
});
await wait(500);
const pageNow = () => p.evaluate(() => {
  const el = document.getElementById('rdFullTextPageNum');
  return el ? el.textContent : null;
});
ok('the full-text view opened', !!(await pageNow()), 'via: ' + intoText);

const p0 = await pageNow();
await p.keyboard.press('ArrowRight');
await wait(250);
const p1 = await pageNow();
ok('ArrowRight turns the page', p0 !== p1, `${p0} -> ${p1}`);
await p.keyboard.press('ArrowLeft');
await wait(250);
ok('ArrowLeft turns it back', (await pageNow()) === p0, `${p1} -> ${await pageNow()}`);

/* the swallowing bug: up/down must reach the scroll container */
const scrolled = await p.evaluate(async () => {
  const el = document.getElementById('rdFullTextBody');
  el.scrollTop = 0;
  const before = el.scrollTop;
  const canScroll = el.scrollHeight > el.clientHeight;
  return { canScroll, before };
});
if (scrolled.canScroll) {
  await p.evaluate(() => document.getElementById('rdFullTextBody').focus());
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  await wait(300);
  const after = await p.evaluate(() => document.getElementById('rdFullTextBody').scrollTop);
  ok('ArrowDown is no longer swallowed — the page text scrolls', after > 0, 'scrollTop=' + after);
} else {
  console.log('  --   this fixture page is shorter than its box, nothing to scroll (not a failure)');
}

console.log('\n— 6 · left/right must NOT steal the arrows while a note is being typed —');
/* ⚠ #rdNoteInput BY NAME, and the first version of this check was wrong in a
   way worth keeping. It asked for '#readerOv textarea, #rdNoteText, textarea',
   and querySelector with a comma list returns the first match in DOCUMENT
   ORDER, not the first selector that matches — so it picked the hidden
   #chatNotesArea, focus() silently did nothing, the key went to <body>, and the
   page turned. It reported a bug in the guard I had just written. */
const focused = await p.evaluate(() => {
  const ta = document.getElementById('rdNoteInput');
  if (!ta || !(ta.offsetWidth || ta.offsetHeight)) return false;
  ta.focus(); ta.value = 'a note in progress';
  return document.activeElement === ta;
});
ok('the reader\'s note box is there and takes focus', focused);
if (focused) {
  const before = await pageNow();
  await p.keyboard.press('ArrowRight');
  await wait(250);
  const after = await pageNow();
  ok('typing in the note box, ArrowRight does not turn the page',
     after === before, `${before} -> ${after}`);
}
await p.screenshot({ path: 'test/live/_shot-reader-arrows.png' });

/* ---- 7 · the latched key, in two arms -------------------------------------
   `state` is not a global (only handlers are), so the player's position cannot
   be read directly. It does not need to be: walking onto a warp changes the
   scene, and the scene name is in the HUD. Seed the save two tiles below the
   Library door and hold Up.

   TWO ARMS, because arm B alone proves nothing — "the player did not move" is
   also what a broken fixture, a blocked tile or a dead key looks like. Arm A is
   the positive control that the walk works at all from this exact spot. */
const atDoor = { ...save, pos: { scene: 'overworld', x: 7, y: 17 } };
const loc = pg => pg.evaluate(() => document.getElementById('loc').textContent);

const arm = async (blur) => {
  const pg = await b.newPage();
  pg.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); failed++; });
  await pg.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(atDoor));
  await pg.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
  await wait(500);
  await pg.click('#startBtn');
  await wait(400);
  const from = await loc(pg);
  await pg.keyboard.down('ArrowUp');
  if (blur) { await wait(60); await pg.evaluate(() => window.dispatchEvent(new Event('blur'))); }
  await wait(1400);
  const to = await loc(pg);
  await pg.keyboard.up('ArrowUp');
  await pg.close();
  return { from, to };
};

console.log('\n— 7a · control: holding Up from below the Library door does walk you in —');
const a = await arm(false);
ok('the walk works from this spot', a.from !== a.to, `${a.from} -> ${a.to}`);

console.log('\n— 7b · and losing focus mid-step stops it —');
const bArm = await arm(true);
ok('a held direction does NOT survive a blur — the player stays put',
   bArm.from === bArm.to, `${bArm.from} -> ${bArm.to}`);

await b.close();
console.log(failed ? `\n✗ ${failed} failure(s)\n` : '\n✓ the first press works\n');
process.exit(failed ? 1 : 0);
