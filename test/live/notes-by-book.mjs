/* ================================================================
   [EVERYTHING I WROTE ABOUT THIS BOOK] — 2026-08-07.

   The Notes Log's book row exists to answer one question: "everything I
   wrote about THIS book." It was answering it short.

   `gatherNotes()` gave a `slug` only to source:'book' notes. The filter
   reads `n.slug !== v.book`, and the chip count only counted
   `source==='book' && n.slug`. So a My Note linked to a book —
   `note.book = {slug, page, chapter}`, which is EXACTLY the shape the
   reader writes when it saves an AI analysis to My Notes — was dropped
   from both the list and the count.

   Nothing looked wrong, because the count agreed with the short list.
   That is the house failure mode: the measurement and the thing measured
   were wrong together.

   Seeded BEFORE first load (evaluateOnNewDocument re-fires on reload and
   would overwrite the save we are about to check).

     npm run build:beta && npm run preview
     node test/live/notes-by-book.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);

const SLUG = 'dhammapada';                       // a seed book, so it resolves
const SAVE = {
  saveVersion: 2,
  // Two My Notes about the book, one of them the ✨ shape the reader writes,
  // plus one My Note about nothing in particular.
  notes: [
    { id:'n1', title:'On the twin verses', body:'Mind precedes all things.',
      created:'2026-08-07', updated:'2026-08-07', book:{ slug:SLUG, page:3, chapter:1 } },
    { id:'n2', title:'✨ Analysis of page 12', body:'The chapter turns here.',
      created:'2026-08-07', updated:'2026-08-07', book:{ slug:SLUG, page:12, chapter:2 } },
    { id:'n3', title:'Buy more tea', body:'Unrelated to any book.',
      created:'2026-08-07', updated:'2026-08-07', book:null },
  ],
  // One note written IN the book — the only kind that used to be counted.
  bookNotes: { [SLUG]: [ { ts:'2026-08-07', text:'A note taken while reading.', page:5, ch:1 } ] },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1100, height: 900 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((save) => {
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(save));
}, SAVE);
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));

/* ENTER THE GROUNDS FIRST. Without this the panel still renders and every
   text assertion still passes — innerText does not care what is on top of it
   — while the screenshot shows the title screen covering the whole thing.
   Read the .png, not just the ticks. */
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 700));

// Open the Notes Log filtered to this book — the same door the reader uses.
const res = await p.evaluate((slug) => {
  window.openNotesForBook(slug);
  const ov = document.getElementById('notesLogOv');
  const text = ov ? ov.innerText : '';
  // every card body rendered in the list
  const cards = ov ? [...ov.querySelectorAll('.card')].map(c => c.innerText) : [];
  /* The BOOK chip, by its onclick — not by scraping "📖 … · N" out of the
     panel text, which matches the SOURCE chip ("📖 Book · 1") first and
     reports a number that happens to be the pre-fix answer. A test that reads
     the wrong element and then agrees with the bug is worse than no test. */
  const btn = ov ? [...ov.querySelectorAll('button')]
    .find(b => (b.getAttribute('onclick') || '').includes("setNotesLogBook('" + slug + "')")) : null;
  const chip = btn ? (btn.innerText.match(/·\s*(\d+)\s*$/) || [])[1] : null;
  /* "Is it on screen", not "is display set" — a panel under the title screen
     satisfies the second and fails the first. */
  const r = ov ? ov.getBoundingClientRect() : null;
  const onTop = r && document.elementFromPoint(r.left + r.width / 2, r.top + 20);
  return { text, cards, chip, chipLabel: btn ? btn.innerText : null,
           visible: !!ov && ov.style.display !== 'none'
                    && !!onTop && (onTop === ov || ov.contains(onTop)) };
}, SLUG);

check('the Notes Log opened on the book', res.visible);
// three notes name this book: two My Notes and one written in it. The fourth
// seeded note names no book and must not be counted.
check('the book chip counts THREE notes, not one', res.chip === '3',
      'chip said ' + res.chip + ' on [' + res.chipLabel + ']');
check('the note written in the book is listed',
      res.text.includes('A note taken while reading'));
check('a My Note about the book is listed',
      res.text.includes('Mind precedes all things'));
check('the reader-written ✨ note about the book is listed',
      res.text.includes('The chapter turns here'));
check('a My Note about NOTHING is NOT listed',
      !res.text.includes('Buy more tea'));
check('no console errors', errs.length === 0, errs.join(' | '));

await p.screenshot({ path: 'test/live/_notes-by-book.png' });
await browser.close();

let bad = 0;
for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ the book row answers the whole question.');
process.exit(bad ? 1 : 0);
