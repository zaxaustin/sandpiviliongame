/* ================================================================
   [A MARK YOU MADE OUTRANKS ONE WE GUESSED — IN THE READER TOO]

   2026-08-07. marks.js has carried that rule since it was written, and
   tools/schema.sql since the chapters table went in. It was true at the
   Study Table and FALSE in the reader, which called findChapters() raw.
   So you could label a book's chapters by hand, walk to the reader, and
   find every one of them ignored. Labelling that changes nothing where
   you actually read is the most discouraging kind of dead end: the work
   was done and the program threw it away.

   Also checks the tag the steward asked for — "not divided yet" with a
   door, instead of the old dead statement "no chapter marks in this
   text" — and that the reader panel widens on a wide screen without the
   reading column paying for the notes column.

     npm run build:beta && npm run preview
     node test/live/reader-chapters.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);

// A book with NO detectable chapters, added by the player — rule 1, not a
// seed book. Plain prose, no contents block, no headings, no numerals.
const SLUG = 'personal-plain-account';
/* Plain prose: no contents block, no keyword headings, no bare numerals, so
   every route in findChapters() comes back empty.

   PARAGRAPH BREAKS ARE LOAD-BEARING. paginate() splits on blank lines, so one
   unbroken string is ONE page however long it is — and then realPage() in
   marks.js correctly rejects a hand mark on page 2 as past the end of the
   book. The first version of this fixture had no blank lines, and the four
   failures it produced looked exactly like "hand marks never reach the
   reader". They were the guard doing its job on a one-page book. */
const PARA = 'It simply runs on in ordinary sentences so that no route in the finder has '
  + 'anything at all to catch, and the page turns without ever announcing itself. ';
const PLAIN = Array.from({ length: 60 }, () => PARA.repeat(8)).join('\n\n');

const MARKED = 'personal-marked-account';
const book = (slug, title) => ({
  slug, title, tradition: 'Personal', personal: true,
  license: '', added: '2026-08-07', category: 'personal', attribution: 'Nobody',
  doc: { summary: '', sections: [], fullText: { text: PLAIN } },
});

const SAVE = {
  saveVersion: 2, seenWelcome: true,
  personalLibrary: [book(SLUG, 'A Plain Account'), book(MARKED, 'A Marked Account')],
  // Exactly what the Study Table writes when you label a page. Seeded rather
  // than poked in through the console: `data` is deliberately not a window
  // export, and a test that needs one is testing a door nobody has.
  bookMarks: { [MARKED]: [ { page: 2, label: 'The Turn',  ts: '2026-08-07' },
                           { page: 4, label: 'The Close', ts: '2026-08-07' } ] },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1700, height: 1000 } });   // wide, to exercise the new tier
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((save) => {
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(save));
}, SAVE);
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 700));

// ---- 1 · undivided: the tag, and that it is a door ----------------------
const before = await p.evaluate(async (slug) => {
  window.closeUI();
  window.openReader(slug);
  await window.openFullText(slug);        // the real door, same as study-table.mjs
  await new Promise(r => setTimeout(r, 400));
  /* PROVE THE READER IS ACTUALLY OPEN before reading anything out of it.
     #rdChapNote lives in index.html permanently, so every text assertion
     below passes just as happily on a reader that never opened. */
  const ov = document.getElementById('readerOv');
  const open = !!ov && ov.classList.contains('open');
  const note = document.getElementById('rdChapNote');
  return { open, html: note ? note.innerHTML : '', text: note ? note.innerText : '',
           hasDoor: !!(note && note.querySelector('a')) };
}, SLUG);

check('the reader is genuinely open', before.open);
check('an undivided book says so plainly', /not divided yet/i.test(before.text),
      JSON.stringify(before.text));
check('and it is a DOOR, not a statement', before.hasDoor);
check('the old dead wording is gone', !/no chapter marks in this text/i.test(before.text));

// ---- 2 · the panel actually got wider ----------------------------------
const size = await p.evaluate(() => {
  const panel = document.querySelector('#readerOv .panel');
  const notes = document.getElementById('rdNotesView');
  const read = document.getElementById('rdFullTextView') || document.getElementById('rdSummaryView');
  return { panel: panel ? Math.round(panel.getBoundingClientRect().width) : 0,
           notes: notes ? Math.round(notes.getBoundingClientRect().width) : 0,
           read: read ? Math.round(read.getBoundingClientRect().width) : 0 };
});
check('the reader panel is wider than the old 1000px cap', size.panel > 1000,
      'panel ' + size.panel + 'px');
check('the notes column is wider than the old 320px cap', size.notes > 320,
      'notes ' + size.notes + 'px');
check('the reading column did NOT pay for it — still the larger of the two',
      size.read > size.notes, 'reading ' + size.read + 'px vs notes ' + size.notes + 'px');

// ---- 3 · a mark you make reaches the reader ----------------------------
const after = await p.evaluate(async (slug) => {
  window.closeUI();
  window.openReader(slug);
  await window.openFullText(slug);
  await new Promise(r => setTimeout(r, 400));
  /* NOT `open` — that is window.open, a function, and therefore always
     truthy. This check passed on nothing at all until it was named. */
  const ov = document.getElementById('readerOv');
  const isOpen = !!ov && ov.classList.contains('open');
  const note = document.getElementById('rdChapNote');
  const prev = document.getElementById('rdChapPrev');
  return { open: isOpen, text: note ? note.innerText : '',
           navShown: !!prev && prev.style.display !== 'none' };
}, MARKED);

check('the reader is genuinely open on the marked book', after.open);
/* Either "2 chapters" or "ch. N of 2" is correct — which one depends on
   whether the open page sits after the first mark, and page 0 does not. The
   claim under test is that the reader KNOWS ABOUT TWO, not how it phrases it. */
check('a chapter you marked by hand reaches the reader',
      /\b2 chapters\b/i.test(after.text) || /of 2\b/i.test(after.text),
      JSON.stringify(after.text));
// `· yours`, anchored — plain /yours/i also matches "mark the chapters
// YOURSELF", so it passed on the undivided book's text and would have called
// the bug a pass.
check('and the reader says the divisions are YOURS', /·\s*yours\b/i.test(after.text),
      JSON.stringify(after.text));
check('the chapter nav appears for a book only YOU divided', after.navShown);

// ---- 4 · the door goes to the right book -------------------------------
const door = await p.evaluate(async () => {
  window.markChaptersHere();
  await new Promise(r => setTimeout(r, 700));      // the desk renders, then the tool
  // The book's name is in the tool's HEADING, one level up from planToolBody.
  const body = document.getElementById('planToolBody');
  const panel = document.getElementById('planToolPanel');
  return { studyOpen: !!body && !!body.innerText.trim(),
           text: panel ? panel.innerText : '' };
});
/* "1 of 3" is the discriminating signal: the marked book has two hand marks
   and therefore three units, and the undivided book would say "1 of 1". So
   this proves the door landed on the RIGHT book, and that the Study Table is
   reading the same marks the reader now does.

   It cannot check the title, because THE STUDY TABLE NEVER NAMES THE BOOK —
   its heading is the generic "Work through a book, one story at a time".
   Arriving there from a door in the reader, there is nothing on screen saying
   which book is on the table. Recorded 2026-08-07, not fixed here. */
check('"mark the chapters yourself" lands on THIS book',
      door.studyOpen && /1 of 3/.test(door.text),
      JSON.stringify((door.text || '').slice(0, 110)));
check('no console errors', errs.length === 0, errs.join(' | '));

await p.screenshot({ path: 'test/live/_reader-chapters.png' });
await browser.close();

let bad = 0;
for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ the reader honours the marks you make.');
process.exit(bad ? 1 : 0);
