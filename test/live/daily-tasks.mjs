/* ================================================================
   [TODAY'S TASKS] — 2026-08-08.

   npm test holds the arithmetic: one at a time, the close-out is
   idempotent, a streak does not count a day twice. What it CANNOT do
   is press a step's button and see whether a room actually opens —
   and "a door that goes nowhere" is this project's oldest failure.
   It is also literally where this feature came from: `mission` sat in
   carrying.js as a place with no surface for a whole day.

     npm run build:beta && npm run preview
     node test/live/daily-tasks.mjs

   NO AI IS CONNECTED. Nothing here needs one, which is the point —
   the board is arithmetic and doors, and Sebastian drafting the
   outline is a later stage that must never become a prerequisite.
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
/* A book the player added — the seed shelf this borrowed 'dhammapada' from
   was deleted 2026-08-10. Rule 1: test the player's books. */
import { inlineBook, A_BOOK } from './_books.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

/* A save whose task was taken YESTERDAY and left half done. This is the case
   the whole design turns on: opening the app the next morning must clear the
   board, record the day honestly where it happened, and leave it retakeable. */
const SAVE = {
  saveVersion: 1, seenWelcome: true,
  personalLibrary: [inlineBook()],
  dailyTasks: [{
    id: 111, title: 'Start on Tesla', taken: yesterday,
    source: { kind: 'free', ref: '', label: 'Learning electronics' },
    steps: [
      { text: 'Get a book on Tesla into the Library', where: 'library', ref: '', done: true },
      { text: 'Read the electricity fundamentals', where: 'read', ref: A_BOOK, done: false },
      { text: 'Go to the town library', where: 'world', ref: '', done: false },
    ],
    closed: false,
  }],
  taskStats: { done: 2, streak: 2, best: 2, lastDone: yesterday },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 1000 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s)), SAVE);
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await wait(800);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await wait(900);

// ---- 1 · the morning after ---------------------------------------------
await p.evaluate(() => window.openDailyTasks());
await wait(400);
let board = await p.evaluate(() => document.getElementById('dailyTasksPanel').innerText);

check('the board opens', /Today's Tasks/i.test(board), board.slice(0, 70));
check("yesterday's work is OFF the board", !/Finish the day's work/i.test(board),
  'a task taken yesterday was still presented as today\'s');
check('...and is listed under "Before today"', /Before today/i.test(board) && /Start on Tesla/.test(board),
  board.slice(0, 200));
check('...saying what actually got done', /1 of 3 done/.test(board),
  (board.match(/\d of \d done/) || ['NOT SAID'])[0]);
check('...and can be taken up again', /Do this again today/i.test(board), 'no way back to it');
/* THE FRAMING. This is a design assertion, not a cosmetic one: the date exists
   so you scope the work, and the moment it scolds it has become the guilt
   inventory the-day.js was written to prevent. */
check('NOTHING ON THE BOARD SCOLDS', !/overdue|late|failed|missed/i.test(board),
  (board.match(/\b(overdue|late|failed|missed)\b/i) || [''])[0]);

// it was written into YESTERDAY's log, where it belongs — not today's
const logs = await p.evaluate((y, t) => {
  const raw = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  const pl = raw.planner || {};
  return { y: ((pl[y] || {}).log || []).map(e => e.text),
           t: ((pl[t] || {}).log || []).map(e => e.text) };
}, yesterday, today);
check("the record landed in YESTERDAY's log", logs.y.some(x => /Start on Tesla/.test(x)),
  JSON.stringify(logs.y));
check("...and NOT in today's", !logs.t.some(x => /Start on Tesla/.test(x)), JSON.stringify(logs.t));

/* IDEMPOTENT, THROUGH THE REAL APP. The unit test proves closeOut() is pure and
   idempotent; this proves the CALLER is too. Open the board again — and again
   — and yesterday must not be recorded twice. */
await p.evaluate(() => { window.closeUI(); window.openDailyTasks(); window.closeUI(); window.openDailyTasks(); });
await wait(400);
const logs2 = await p.evaluate((y) => {
  const raw = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return ((raw.planner || {})[y] || {}).log || [];
}, yesterday);
check('opening the board three times recorded yesterday ONCE',
  logs2.filter(e => /Start on Tesla/.test(e.text)).length === 1,
  logs2.length + ' entries: ' + logs2.map(e => e.text).join(' | '));

await p.screenshot({ path: 'test/live/_daily-tasks-morning.png' });

// ---- 2 · set today's work ----------------------------------------------
/* A `read` step must be told WHICH book. The first version of this test did not
   pick one, the step saved with an empty ref, and pressing it opened nothing at
   all — openReader(undefined) returns silently. That was a real dead end inside
   the board built to remove dead ends, and it is why the picker exists. */
const picked = await p.evaluate((SLUG) => {
  document.getElementById('dtTitle').value = 'Read the fundamentals';
  document.getElementById('dtSource').value = 'Learning electronics';
  document.getElementById('dtStep0').value = 'Read a chapter here';
  document.getElementById('dtWhere0').value = 'read';
  window.dailyTaskWhereChanged(0);                      // reveals the book picker
  const sel = document.getElementById('dtRef0');
  const shown = document.getElementById('dtRefRow0').style.display !== 'none';
  if (sel) sel.value = SLUG;
  document.getElementById('dtStep1').value = 'Wire the 555 timer on the bench';
  document.getElementById('dtWhere1').value = 'world';
  window.dailyTaskWhereChanged(1);                      // and hides it again
  const hidden = document.getElementById('dtRefRow1').style.display === 'none';
  window.takeDailyTask();
  return { shown, hidden, val: sel ? sel.value : '' };
}, A_BOOK);
await wait(400);
check('a step that needs a target offers a picker', picked.shown, 'no picker for a `read` step');
check('...and a step that does not, does not', picked.hidden, 'the picker showed for an out-there step');
check('...populated with real books', picked.val === A_BOOK, picked.val || '(empty)');
board = await p.evaluate(() => document.getElementById('dailyTasksPanel').innerText);
check('today\'s work is set', /Read the fundamentals/.test(board), board.slice(0, 120));
check('the bigger goal is named', /Learning electronics/.test(board),
  'the anti-overwhelm line is missing — a big goal must be visibly eaten one sitting at a time');
check('0 of 2 done to start', /0 of 2 done/.test(board), (board.match(/\d of \d done/) || ['NONE'])[0]);
/* `world` has no door and must not grow one. */
const html = await p.evaluate(() => document.getElementById('dailyTasksPanel').innerHTML);
check('the out-there step offers no button, and says why', /out there/i.test(html),
  'a world step should be marked, not given a door it cannot have');

// one at a time, refused with a SENTENCE
await p.evaluate(() => window.takeDailyTask());
await wait(250);
const msg = await p.evaluate(() => (document.getElementById('dailyTaskMsg') || {}).textContent || '');
check('a second task is refused OUT LOUD', /already have|finish|set it down/i.test(msg), msg || '(silent)');

// ---- 3 · the doors actually open ---------------------------------------
await p.evaluate(() => window.dailyTaskGo(0));     // step 0 is `read`
await wait(700);
const landed = await p.evaluate(() => ({ ui: window.__uiName ? window.__uiName() : '',
  open: [...document.querySelectorAll('.overlay.open')].map(o => o.id) }));
check('pressing a step opens the room it names',
  landed.open.some(id => /reader|book|fullText/i.test(id)),
  'landed on: ' + JSON.stringify(landed.open));

await p.evaluate(() => { window.closeUI(); window.openDailyTasks(); });
await wait(400);

// ---- 4 · finishing, and the streak -------------------------------------
await p.evaluate(() => { window.toggleDailyTaskStep(0); window.toggleDailyTaskStep(1); });
await wait(300);
await p.evaluate(() => window.finishDailyTask());
await wait(400);
const after = await p.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return { stats: raw.taskStats, badges: raw.badges || [],
           board: document.getElementById('dailyTasksPanel').innerText };
});
check('the streak advanced to 3', after.stats && after.stats.streak === 3, JSON.stringify(after.stats));
check('the tally went up', after.stats && after.stats.done === 3, JSON.stringify(after.stats));
check('a badge was earned for three in a row',
  JSON.stringify(after.badges).includes('streak-3'), JSON.stringify(after.badges));
check('the board shows the streak', /3 days in a row/i.test(after.board),
  (after.board.match(/\d+ days? in a row/i) || ['NOT SHOWN'])[0]);

/* FINISHING AGAIN THE SAME DAY MUST NOT COUNT TWICE — the difference between a
   streak and a score, checked here as well as in the unit test because this is
   the path a person can actually take. */
await p.evaluate(() => {
  document.getElementById('dtTitle').value = 'A second sitting';
  document.getElementById('dtStep0').value = 'one more thing';
  document.getElementById('dtWhere0').value = 'world';
  window.takeDailyTask();
});
await wait(300);
await p.evaluate(() => { window.toggleDailyTaskStep(0); window.finishDailyTask(); });
await wait(400);
const twice = await p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').taskStats);
check('a second finish on the same day did NOT bump the streak', twice && twice.streak === 3,
  JSON.stringify(twice));

await p.screenshot({ path: 'test/live/_daily-tasks-today.png' });

check('no page errors', errs.length === 0, errs.join(' | '));
await browser.close();

const bad = R.filter(r => !r[1]);
for (const [name, ok, detail] of R) console.log((ok ? '  ok  ' : '  FAIL') + '  ' + name + (ok ? '' : '  <- ' + detail));
console.log('\n' + (R.length - bad.length) + '/' + R.length + ' checks passed.');
writeFileSync('test/live/_daily-tasks.txt', R.map(r => (r[1] ? 'ok   ' : 'FAIL ') + r[0] + (r[1] ? '' : '  <- ' + r[2])).join('\n'));
process.exit(bad.length ? 1 : 0);
