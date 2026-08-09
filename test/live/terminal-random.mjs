/* ================================================================
   [ONE BOOK, NOT A WALL] — 2026-08-10.

     "we can make a command like test book random instead of scanning the
      whole library alot that cant work since we got rid of those 26
      books seed."

   `ls` was a LIST when twenty-seven books shipped with the Pavilion.
   Against a real 415-book collection it is a wall, and a wall is not an
   index. `random` is the opposite command — not "show me everything" but
   "pick something" — and `test` is where the picked book goes.

   npm test holds the vocabulary: every command in `help` has a man page
   and an implementation, in both directions. What it cannot do is press
   the thing and watch a book land in the backpack with the Study Table
   open on it, which is the whole point of `test`.

     npm run build:beta && npm run preview
     node test/live/terminal-random.mjs

   NO AI. Every command here except `ask` runs on this machine, and that
   is a property worth keeping true.
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* A shelf worth drawing from: three shelves, one book already read, so the
   "unread first" rule has something to prefer and something to skip. */
/* FICTION AND NON-FICTION BOTH, on purpose. A plain substring match makes
   `random fiction` sweep in every NON-fiction book, and on the steward's
   own shelves that is 98 books against 25 — the likeliest pair anyone
   types, and invisible to a fixture that only has one of them. */
const SHELVES = { Fiction: ['Emma', 'Dracula', 'Great Expectations'],
                  'Non-fiction': ['Walden', 'The Wealth of Nations'],
                  Classics: ['Beowulf', 'Don Quixote'],
                  Science: ['On the Origin of Species'] };
const slug = t => 'personal-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const personalLibrary = [];
for (const [shelf, titles] of Object.entries(SHELVES)) {
  for (const title of titles) {
    personalLibrary.push({ slug: slug(title), title, tradition: shelf, personal: true,
      license: 'Personal', attribution: 'Public domain',
      doc: { summary: 'A book of your own on the ' + shelf + ' shelf.', sections: [],
             fullText: { license: 'Personal', text: 'The opening.\n\nAnd more of it.' } } });
  }
}
const READ = slug('Beowulf');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 900 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument((s) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s)),
  { saveVersion: 1, seenWelcome: true, personalLibrary, read: { [READ]: '2026-08-01' } });
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await wait(900);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await wait(1100);
await p.evaluate(() => window.openComputer());
await wait(500);

/* ONLY THE NEWEST OUTPUT. #termOut is CUMULATIVE — it is a terminal — so
   reading it whole means every assertion is made against the entire
   session. The first version of this suite did exactly that and reported
   `random fiction` returning a Science book; it had picked the row out of
   one of the twelve earlier draws. The code was right and the test was
   wrong, which is the more dangerous of the two failures. */
const run = async (cmd) => {
  await p.evaluate(c => window.termQuick(c), cmd);
  await wait(400);
  const all = await p.evaluate(() => document.getElementById('termOut').innerText);
  const at = all.lastIndexOf('> ' + cmd);
  return at < 0 ? all : all.slice(at);
};

// ---- 1 · random hands you exactly one -----------------------------------
const one = await run('random');
check('random answers at all', /one of \d+/.test(one), one.split('\n').slice(-6).join(' / '));
/* ONE ROW, not a listing. The entire point: `ls` already exists. */
const rows = (one.split('\n').filter(l => /^\s{2,}\d+\s{2,}/.test(l)));
check('...with exactly ONE book, not a wall', rows.length === 1, rows.length + ' rows');
check('...and says what to do with it next', /open 1/.test(one) && /test 1/.test(one),
  'a picked book with no next step is a dead end');

/* UNREAD FIRST. Beowulf is the only book marked read, so across many draws
   it must never come up while five unread ones exist — one draw could miss
   it by luck, so this asks repeatedly. */
let sawRead = false;
for (let i = 0; i < 12; i++) {
  const t = await run('random');
  if (/Beowulf/.test(t)) { sawRead = true; break; }
}
check('a book you have already read is not offered while unread ones remain', !sawRead,
  'Beowulf came up despite being marked read and five unread books being on the shelf');

// ---- 2 · narrowed to a shelf --------------------------------------------
const fic = await run('random fiction');
check('random narrows to a shelf', /on fiction/i.test(fic), fic.split('\n').slice(-5).join(' / '));
check('...and picks from that shelf only',
  /Emma|Dracula|Great Expectations/.test(fic) && !/Beowulf|Origin of Species/.test(fic),
  fic.split('\n').find(l => /^\s{2,}1\s/.test(l)) || '(no row)');
/* THE PAIR THAT BREAKS A SUBSTRING MATCH. `fiction` must not reach
   Non-fiction, and the exact-match rule is the only thing stopping it —
   drawn repeatedly because one draw could miss by luck. */
let leaked = false;
for (let i = 0; i < 12; i++) {
  const f = await run('random fiction');
  if (/Walden|Wealth of Nations/.test(f) || /on fiction/i.test(f) === false) { leaked = true; break; }
}
check('`random fiction` never reaches the NON-fiction shelf', !leaked,
  'a plain substring match makes "fiction" match "Non-fiction" — 98 books against 25 on the real shelves');
const loose = await run('random non');
check('...but a loose name still works when nothing matches exactly',
  /Walden|Wealth of Nations/.test(loose), loose.split('\n').slice(-5).join(' / '));
const nope = await run('random nosuchshelf');
check('a shelf that does not exist says so rather than picking anything',
  /Nothing on a shelf matching/i.test(nope), nope.split('\n').slice(-3).join(' / '));

await p.screenshot({ path: 'test/live/_terminal-random.png' });

// ---- 3 · man pages, for the commands a person will type -----------------
for (const cmd of ['random', 'test']) {
  const m = await run('man ' + cmd);
  check(`man ${cmd} has a real page`, /ON A REAL MACHINE/.test(m) && m.length > 200,
    'a command listed in help with a dud man page is worse than an undocumented one');
}

// ---- 4 · test carries it AND opens the desk -----------------------------
/* The half npm test cannot reach. `test` exists because picking a book is
   only useful if there is somewhere to take it. */
const before = await p.evaluate(() => window.carryList().length);
const t = await run('test random');
check('test says which book it took', /is in your backpack/.test(t), t.split('\n').slice(-3).join(' / '));
await wait(900);
const after = await p.evaluate(() => ({
  carrying: window.carryList().map(e => e.label),
  open: [...document.querySelectorAll('.overlay.open')].map(e => e.id),
}));
check('...and the book really is in the backpack', after.carrying.length === before + 1,
  JSON.stringify(after.carrying));
check('...and it OPENED the Writing Desk rather than telling you to walk there',
  after.open.includes('planOv'), JSON.stringify(after.open));

// ---- 5 · and it refuses clearly when it cannot ---------------------------
await p.evaluate(() => window.openComputer());
await wait(400);
const bad = await run('test 99');
check('test on a number that was never listed explains itself',
  /run\s+ls|test which/i.test(bad), bad.split('\n').slice(-3).join(' / '));

check('no page errors', errs.length === 0, errs.join(' | '));

const lines = R.map(([n, ok, d]) => `  ${ok ? '✓' : '✗'} ${n}${ok || !d ? '' : '\n      ' + d}`);
const out = `ONE BOOK, NOT A WALL — ${new Date().toISOString()}\n\n` + lines.join('\n') + '\n';
writeFileSync('test/live/_terminal-random.txt', out);
console.log(out);
const bad2 = R.filter(r => !r[1]).length;
console.log(bad2 ? `✗ ${bad2} failure(s)` : `✓ all ${R.length} checks passed`);
await browser.close();
process.exit(bad2 ? 1 : 0);
