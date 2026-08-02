/* ================================================================
   [LIBRARIAN SAFETY] — the guard for the worst bug this project has
   had, reported from real use 2026-07-28:

     "The AI undoes all the work I did when sorting the books, and
      does nothing after sorting like 20 books... it ignores what's
      there and undoes all the work I had made to commit over 100
      books."

   Three faults, all in five lines of `suggestShelvesWithAI()`:

     1. "Select all" put ALREADY-FILED books in the pool. Every one
        got a suggestion, and Accept All wrote it back — so wherever a
        rule disagreed with a deliberate human choice, the human lost
        silently. This is the one that matters: it destroyed the exact
        thing the app exists to help someone build.
     2. A hard slice(0,60) silently dropped the rest. With 105 books,
        forty-five were never looked at — and if the first sixty were
        already filed, the whole budget went on re-confirming books
        that needed nothing. Hence "does nothing after ~20 books".
     3. Suggestions that merely restated a book's current shelf were
        counted as work, so the report said 60 while nothing changed.

   These are properties, not features, and properties erode quietly.
   Run after any change to the librarian:

     npm install --no-save puppeteer-core
     npm run build:beta
     npm run preview            # another terminal
     node test/live/librarian-safety.mjs

   Exit code 0 = safe.
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mk = (n, t, shelf) => ({ slug: 'p' + n, title: t, tradition: shelf, personal: true, license: '',
  added: '2026-07-20', category: 'personal', doc: { summary: 'x', sections: [], fullText: { text: 'x' } } });

/* Deliberately the reported shape: a big library, most of it placed by hand
   over time, onto a shelf a keyword rule would argue with. */
const books = [];
for (let i = 0; i < 60; i++) books.push(mk(i, 'Meditation Guide ' + i, 'Electronics'));
for (let i = 60; i < 105; i++) books.push(mk(i, 'Sutta Reader ' + i, 'Personal'));
const save = { seenWelcome: true, aiConnections: [], myShelves: ['Electronics', 'Cooking', 'Practice'], personalLibrary: books };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const p = await browser.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(save));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn'); await new Promise(r => setTimeout(r, 1400));

const counts = () => p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const c = {}; s.personalLibrary.forEach(b => { c[b.tradition] = (c[b.tradition] || 0) + 1; }); return c;
});
const R = [];

await p.evaluate(() => window.openMyLibrary()); await new Promise(r => setTimeout(r, 500));
await p.evaluate(() => window.myLibSelectAll(true)); await new Promise(r => setTimeout(r, 600));
await p.evaluate(() => window.suggestShelvesWithAI()); await new Promise(r => setTimeout(r, 3000));
await p.evaluate(() => window.acceptAllSuggestions()); await new Promise(r => setTimeout(r, 1200));
const after = await counts();

const handMoved = await p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2'))
  .personalLibrary.filter(b => /Meditation Guide/.test(b.title) && b.tradition !== 'Electronics').length);

R.push(['SELECT ALL NEVER MOVES A BOOK YOU FILED YOURSELF', handMoved === 0]);
R.push(['it looks past the old sixty-book cap', (after.Personal || 0) < 45]);
R.push(['it actually files the genuinely unfiled ones', (after.Theravada || 0) >= 40]);
R.push(['no book is lost', await p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2')).personalLibrary.length === 105)]);

const panel = await p.evaluate(() => document.getElementById('myLibPanel').textContent);
R.push(['a bulk filing offers an undo', /Undo that filing/.test(panel)]);

await p.evaluate(() => window.undoLastFiling()); await new Promise(r => setTimeout(r, 900));
const undone = await counts();
R.push(['UNDO restores every book exactly', (undone.Personal || 0) === 45 && (undone.Electronics || 0) === 60]);

/* Re-filing placed books must still be POSSIBLE — the fix is that it is asked
   for, not that it is forbidden. */
const boxBefore = await p.evaluate(() => {
  const l = [...document.querySelectorAll('#myLibPanel label')].find(x => /already placed/.test(x.textContent));
  return l ? l.querySelector('input').checked : null;
});
R.push(['the opt-in exists and starts OFF', boxBefore === false]);
await p.evaluate(() => window.toggleRefileFiled()); await new Promise(r => setTimeout(r, 500));
const boxAfter = await p.evaluate(() => {
  const l = [...document.querySelectorAll('#myLibPanel label')].find(x => /already placed/.test(x.textContent));
  return l ? l.querySelector('input').checked : null;
});
R.push(['re-filing placed books is opt-in, not impossible', boxAfter === true]);

let bad = 0;
for (const [name, ok] of R) { console.log((ok ? '  PASS  ' : '  FAIL  ') + name); if (!ok) bad++; }
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
