/* ================================================================
   [WHERE YOUR BOOKS ARE KEPT] — 2026-08-10.

   Measured before it was built: there was NO in-game path to Docker at
   all. Setup existed only as terminal commands in PROTOCOLS.md and
   LEARNING-PATH.md, against a standing decision —

     "it is for a lay user: no terminal required, no config file."

   This is the browser half: what a person sees in a tab, which is where
   the honest answer matters most because a tab is the one place the
   library genuinely is not. The container half is checked in
   test/live/library-homes.cjs, which runs against the real Docker.

     npm run build:beta && npm run preview
     node test/live/storage-room.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 950 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => localStorage.setItem('sandPavilionSave.v2', JSON.stringify({
  saveVersion: 1, seenWelcome: true,
  personalLibrary: [{ slug: 'personal-emma', title: 'Emma', tradition: 'Fiction', personal: true,
    license: 'Personal', doc: { summary: 'A book of your own.', sections: [], fullText: { text: 'words' } } }],
})));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await wait(900);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await wait(1100);

// ---- 1 · it is reachable without knowing it exists ----------------------
await p.evaluate(() => window.openMenu());
await wait(300);
const menu = await p.evaluate(() => document.getElementById('menuPanel').innerText);
check('the pause menu names it', /where books are kept/i.test(menu),
  'a room nobody can find is a room nobody has — the whole reason this was built');

await p.evaluate(() => window.openStorage());
await wait(800);
const t = await p.evaluate(() => document.getElementById('storagePanel').innerText);

// ---- 2 · it tells the truth about a browser tab -------------------------
check('it says plainly that a tab cannot reach any of it', /browser tab/i.test(t),
  t.split('\n').slice(0, 6).join(' / '));
check('...and names the way out', /electron:dev|desktop app/i.test(t),
  'saying "you cannot" without saying "instead, do this" is half an answer');
/* THE DOCKER STEP IS HIDDEN IN A TAB, because a tab cannot act on it. An
   instruction you are shown but cannot follow is worse than none. */
check('the Docker command is NOT offered in a browser', !/docker compose up/.test(t),
  'a tab was shown a step it cannot take');

// ---- 3 · the honest ceiling, all three tiers ----------------------------
for (const [what, re] of [['a browser tab', /10.20 books/], ['the desktop app', /hundreds/],
                          ['Docker', /no practical limit/i]]) {
  check(`it states the real ceiling for ${what}`, re.test(t), t.slice(0, 200));
}

// ---- 4 · it never implies anything is broken ----------------------------
/* The Pavilion is COMPLETE without Docker — that is a release gate with a
   test behind it. This room is an offer, and an offer that reads as a
   defect is a worse room than none. */
check('it never says anything is broken or failed', !/\bbroken\b|\bfailed\b|\berror\b/i.test(t),
  (t.match(/[^.]*\b(broken|failed|error)\b[^.]*/i) || [''])[0]);
check('it says outright that none of it is required', /works with none of this|is an offer/i.test(t),
  t.split('\n').slice(0, 4).join(' / '));

// ---- 5 · and it shows real state, not configuration ---------------------
check('it counts where the books actually are', /Your shelves/.test(t),
  'the split is read from the books themselves, never from a setting');

await p.screenshot({ path: 'test/live/_storage-browser.png' });

// ---- 6 · the intake offers the door at the moment you care --------------
await p.evaluate(() => window.openBookIntake());
await wait(500);
const intake = await p.evaluate(() => document.getElementById('intakePanel').innerHTML);
check('the intake table offers more room right where it says where text goes',
  /openStorage\(\)/.test(intake),
  'saying where the text goes without saying how to change it is half an answer');

check('no page errors', errs.length === 0, errs.join(' | '));

const lines = R.map(([n, ok, d]) => `  ${ok ? '✓' : '✗'} ${n}${ok || !d ? '' : '\n      ' + d}`);
const out = `WHERE YOUR BOOKS ARE KEPT — ${new Date().toISOString()}\n\n` + lines.join('\n') + '\n';
writeFileSync('test/live/_storage-room.txt', out);
console.log(out);
const bad = R.filter(r => !r[1]).length;
console.log(bad ? `✗ ${bad} failure(s)` : `✓ all ${R.length} checks passed`);
await browser.close();
process.exit(bad ? 1 : 0);
