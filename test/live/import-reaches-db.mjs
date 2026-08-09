/* ================================================================
   [A BOOK YOU ADD EXISTS TO THE DATABASE] — 2026-08-10.

   Reported from real use, and precisely:

     "would adding new books update the backend data for them?"
     "the multi load did not but one at a time did"

   Exactly right, and the cause was one line. The ONLY call to
   `upsertCard` from the app lived inside chapterInfo(), which runs when
   a book's full text is PAGINATED — that is, when you open it. So:

     one at a time   you drop it, you read it, chapterInfo fires, the row
                     lands in the catalogue                        ✓
     forty at once   you drop forty and open none of them, and NOT ONE of
                     them exists to the database                    ✗

   Every consequence is invisible until you go looking: a resident's
   lookup cannot find them (searchBooks reads the books table), a note
   cannot point at one (notes.slug is a foreign key into it), and they
   are missing from the Records Hall. The books were fine; the index did
   not know they existed.

   WHY THIS SUITE STUBS THE BRIDGE INSTEAD OF USING POSTGRES. The
   property under test is "the app ASKS the database to record it", and
   a stub answers that in seconds while a real container run took five
   minutes and told us less. Whether the write then lands is
   docker-home.cjs's job, and it has its own suite.

     npm run build:beta && npm run preview
     node test/live/import-reaches-db.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 850 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

/* A desktop bridge that RECORDS rather than stores. Installed before the
   app loads, so Store.bridge() finds it exactly as it would find a real
   one — the app cannot tell the difference, which is the point. */
await p.evaluateOnNewDocument(() => {
  window.__dbCalls = [];
  window.desktopBridge = {
    isDesktop: true,
    dbQuery: async (name) => (name === 'catalogue' ? [] : []),
    dbWrite: async (name, params) => { window.__dbCalls.push({ name, params }); return { ok: true }; },
    dbWriteMany: async (name, rows) => { window.__dbCalls.push({ name, rows: rows.length }); return { ok: true }; },
    dbStatus: async () => ({ up: true, kind: 'embedded', label: 'stub' }),
    libraryWrite: async () => ({ ok: true }),
    libraryRead: async () => ({ ok: false }),
  };
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify({ saveVersion: 1, seenWelcome: true }));
});
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await wait(1000);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await wait(1200);
await p.evaluate(() => { window.__dbCalls.length = 0; });   // ignore startup hydration

// ---- FIVE BOOKS AT ONCE, AND NOT ONE OF THEM OPENED --------------------
await p.evaluate(async () => {
  const dt = new DataTransfer();
  for (let i = 1; i <= 5; i++) {
    const body = 'Title: Bulk Probe Volume ' + i + '\nAuthor: A Tester\n\n'
      + 'Real sentences of body text, enough that this reads as a book. '.repeat(60);
    dt.items.add(new File([body], 'bulk-probe-' + i + '.txt', { type: 'text/plain' }));
  }
  document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
});
await wait(6000);

const after = await p.evaluate(() => ({
  inSave: (JSON.parse(localStorage.getItem('sandPavilionSave.v2')).personalLibrary || [])
    .filter(b => /Bulk Probe/i.test(b.title || '')).length,
  cards: window.__dbCalls.filter(c => c.name === 'upsertCard').length,
  sample: (window.__dbCalls.find(c => c.name === 'upsertCard') || {}).params || [],
  openedAny: !!document.querySelector('#readerOv.open'),
}));

check('five dropped books are shelved in the save', after.inSave === 5, after.inSave + ' of 5');
check('...and NONE of them was opened', !after.openedAny,
  'the reader opened — this suite must prove the database write happens WITHOUT opening a book');
/* THE ONE THAT WAS FALSE. Before 2026-08-10 this was 0 for a bulk drop. */
check('every one of them was written to the catalogue', after.cards === 5,
  after.cards + ' upsertCard call(s) for 5 books — a bulk drop used to send ZERO, because the only '
  + 'caller was the code that paginates a book you open');

/* The card must carry enough to be findable — a row with no title is a row
   a resident's lookup cannot match, which is the same invisibility again. */
const [slug, title, attribution] = after.sample;
check('the card carries a real slug and title', !!slug && /Bulk Probe/i.test(title || ''),
  JSON.stringify([slug, title]));
check('...and the author read out of the file', /Tester/i.test(attribution || ''),
  'attribution: ' + JSON.stringify(attribution));
/* An unfiled book must go up as NULL, not 'Personal' — `shelf IS NULL` is
   what the sorter's work queue asks for, and writing 'Personal' would
   quietly empty the pile of books waiting to be sorted. */
check('an unfiled book stays unfiled in the catalogue', after.sample[5] === null,
  'shelf sent as ' + JSON.stringify(after.sample[5]) + ' — "Personal" would empty the sorter\'s inbox');

// ---- AND ONE AT A TIME STILL WORKS -------------------------------------
await p.evaluate(() => { window.__dbCalls.length = 0; });
await p.evaluate(async () => {
  const dt = new DataTransfer();
  dt.items.add(new File(['Title: A Single Probe\nAuthor: One Tester\n\n' + 'Body text. '.repeat(80)],
    'single-probe.txt', { type: 'text/plain' }));
  document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
});
await wait(3000);
const single = await p.evaluate(() => window.__dbCalls.filter(c => c.name === 'upsertCard').length);
check('a single dropped book is written too', single >= 1, single + ' call(s)');

check('no page errors', errs.length === 0, errs.join(' | '));

const lines = R.map(([n, ok, d]) => `  ${ok ? '✓' : '✗'} ${n}${ok || !d ? '' : '\n      ' + d}`);
const out = `A BOOK YOU ADD EXISTS TO THE DATABASE — ${new Date().toISOString()}\n\n` + lines.join('\n') + '\n';
writeFileSync('test/live/_import-reaches-db.txt', out);
console.log(out);
const bad = R.filter(r => !r[1]).length;
console.log(bad ? `✗ ${bad} failure(s)` : `✓ all ${R.length} checks passed`);
await browser.close();
process.exit(bad ? 1 : 0);
