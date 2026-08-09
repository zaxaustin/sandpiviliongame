/* ================================================================
   [THE LIBRARY, LOOKED AT] — 2026-08-10.

   Asked for directly: "test a sreenshot test for the library, once we
   get the library wired we can move on to the rest."

   And the bar, set the same day and deliberately low:

     "make sure your not overloaded checking each book every time as long
      as you can test a book you can walk up to in the library then we
      shoudl be good."

   So this does not sweep a library. It seeds a shelf you could walk to,
   opens the four places a book appears, and SAVES A .PNG OF EACH. The
   assertions are cheap; the screenshots are the point.

   WHY THE BROWSER AND NOT ELECTRON. shelf-walk.cjs proves the real
   415-book catalogue against the real container — that half needs
   Electron. But Electron's capturePage() on an offscreen window does not
   composite the DOM overlays (tried twice, got the bare world back both
   times), and a screenshot test that cannot screenshot is worse than
   none. Chrome captures exactly what a person would see.

   THE FIXTURE IS A PLAYER'S LIBRARY, not a seed one — rule 1, and the
   reason today happened: books from the database and from imports had no
   `category`, so the Index filtered all 415 out and rendered ZERO cards
   while every count in the codebase said fine. Only a picture showed it.

     npm run build:beta && npm run preview
     node test/live/library-shelves.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* Enough books, on the shelves a real collection actually lands on, with
   the three storage homes represented so the badges have something to
   distinguish. Titles are real public-domain works so the screenshots read
   like a library rather than like test data. */
const SHELVES = {
  Classics: ['A Tale of Two Cities', 'Heart of Darkness', 'Don Quixote', 'The Divine Comedy', 'Beowulf'],
  Fiction: ['Emma', 'Dracula', 'Great Expectations', 'Alice’s Adventures in Wonderland', 'The Call of the Wild'],
  Science: ['On the Origin of Species', 'The Voyage of the Beagle', 'Relativity: The Special and General Theory'],
  'Non-fiction': ['Walden', 'The Wealth of Nations', 'Ten Acres Enough'],
  Theravada: ['The Dhammapada', 'The Long Discourses'],
  Personal: ['A chapter I pasted in', 'A datasheet for the 555'],
};
const slugify = s => 'personal-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const personalLibrary = [];
let i = 0;
for (const [shelf, titles] of Object.entries(SHELVES)) {
  for (const title of titles) {
    i++;
    /* Three homes in rotation: MinIO, a file on this machine, inline in the
       save. The badge must tell them apart on screen. */
    const home = i % 3 === 0 ? { personal: slugify(title) + '.txt' }
      : i % 3 === 1 ? { bucket: 'sand-pavilion-library', key: 'personal/' + slugify(title) + '.txt' }
      : null;
    personalLibrary.push({
      slug: slugify(title), title, tradition: shelf, personal: true,
      license: 'Personal — license not certified', attribution: 'Public domain',
      source_url: '', kind: 'book', added: '2026-08-09',
      doc: {
        summary: 'A book of your own, brought in and shelved under ' + shelf + '.',
        sections: [],
        fullText: home ? { license: 'Personal', storage: home, chars: 480000 }
                       : { license: 'Personal', text: 'The opening paragraph.\n\nAnd a second one.' },
      },
    });
  }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 950 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s =>
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s)),
  { saveVersion: 1, seenWelcome: true, personalLibrary });
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await wait(900);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await wait(1100);

const shot = async (name) => { await wait(450); await p.screenshot({ path: `test/live/_lib-${name}.png` }); };

// ---- 1 · the shelf you walk up to -------------------------------------
await p.evaluate(() => window.openShelf('Classics'));
const shelf = await p.evaluate(() => ({
  title: document.getElementById('shelfTitle').textContent,
  open: document.getElementById('shelfOv').classList.contains('open'),
  text: document.getElementById('shelfOv').innerText,
}));
check('the Classics shelf opens', shelf.open && /Classics/.test(shelf.title), shelf.title);
check('there are books on it', /Tale of Two Cities|Don Quixote|Beowulf/.test(shelf.text),
  shelf.text.split('\n').slice(0, 4).join(' / '));
await shot('shelf-classics');

// ---- 2 · the Index, where every book appears ---------------------------
await p.evaluate(() => window.openIndex());
const idx = await p.evaluate(() => document.getElementById('indexPanel').innerText);
check('the Index is not empty', !/Your Library is empty/i.test(idx),
  'a seeded library rendered as nothing — this is exactly the bug of 2026-08-10');
check('the Index says where the books are kept', /Docker|this machine|in the save/.test(idx),
  (idx.split('\n').find(l => /Docker|machine|save/.test(l)) || '(no storage line)').slice(0, 90));
await shot('index');

// ---- 3 · the Stacks, browsing by section ------------------------------
await p.evaluate(() => window.openCatalog());
const cat = await p.evaluate(() => document.getElementById('catalogPanel').innerText);
check('the Stacks list real sections', /Fiction|Science|Religion/.test(cat), cat.split('\n').slice(0, 4).join(' / '));
await shot('stacks');

// ---- 4 · Your Shelf ---------------------------------------------------
await p.evaluate(() => window.openMyLibrary());
const mine = await p.evaluate(() => document.getElementById('myLibPanel').innerText);
check('Your Shelf holds the books you brought in', /\b18\b|\b19\b|\b20\b/.test(mine) || /Emma|Walden/.test(mine),
  mine.split('\n').slice(0, 3).join(' / '));
await shot('your-shelf');

// ---- 5 · and one book actually opens ----------------------------------
const opened = await p.evaluate(() => {
  window.openReader('personal-emma');
  const ov = document.getElementById('readerOv');
  return { open: !!ov && ov.classList.contains('open'), text: ov ? ov.innerText.slice(0, 300) : '' };
});
check('a book off the shelf opens in the Reader', opened.open, 'reader did not open');
check('...and it is the book that was asked for', /Emma/.test(opened.text),
  (opened.text.split('\n').find(l => l.trim()) || '(nothing)').slice(0, 80));
await shot('reader');

check('no page errors', errs.length === 0, errs.join(' | '));

const lines = R.map(([n, ok, d]) => `  ${ok ? '✓' : '✗'} ${n}${ok || !d ? '' : '\n      ' + d}`);
const out = `THE LIBRARY, LOOKED AT — ${new Date().toISOString()}\n\n` + lines.join('\n')
  + `\n\n${personalLibrary.length} books across ${Object.keys(SHELVES).length} shelves.\n`
  + 'screenshots: _lib-shelf-classics · _lib-index · _lib-stacks · _lib-your-shelf · _lib-reader\n';
writeFileSync('test/live/_library-shelves.txt', out);
console.log(out);
const bad = R.filter(r => !r[1]).length;
console.log(bad ? `✗ ${bad} failure(s)` : `✓ all ${R.length} checks passed — now READ the .pngs`);
await browser.close();
process.exit(bad ? 1 : 0);
