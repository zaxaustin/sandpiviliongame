/* ================================================================
   [THE STUDY TABLE'S TRAY] — 2026-08-07.

   The table used to work on exactly ONE book: whichever you had
   pocketed. So "work through a book" meant one book forever, and
   setting a second one beside it was impossible. Asked for directly:

     "the notes of the book can be loaded there through the back pack
      so the user has to do it, and the book can be broung out and
      references in the same way or one after another."

   The tray IS the backpack, filtered to what this surface accepts —
   no third state, no separate "put down" step, because that is the
   point of having one carry verb. What stays manual is WHICH book you
   are working on: nothing is chosen for you.

     npm run build:beta && npm run preview
     node test/live/study-tray.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);

const PARA = 'It runs on in ordinary sentences with nothing that reads like a heading at all. ';
const TEXT = Array.from({ length: 40 }, () => PARA.repeat(8)).join('\n\n');
const book = (slug, title) => ({
  slug, title, tradition: 'Personal', personal: true, license: '', added: '2026-08-07',
  category: 'personal', attribution: 'Nobody',
  doc: { summary: '', sections: [], fullText: { text: TEXT } },
});

const A = 'personal-first-book', B = 'personal-second-book';
const SAVE = {
  saveVersion: 2, seenWelcome: true,
  personalLibrary: [book(A, 'The First Book'), book(B, 'The Second Book')],
  // both books carried, and a note about the FIRST one on an early page
  carrying: [
    { kind: 'book', ref: A, label: 'The First Book',  since: '2026-08-07' },
    { kind: 'book', ref: B, label: 'The Second Book', since: '2026-08-07' },
  ],
  bookNotes: { [A]: [{ ts: '2026-08-07', text: 'A thought I had on the very first page.', page: 0 }] },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 1000 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((s) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s)), SAVE);
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 800));

const open = await p.evaluate(async () => {
  window.closeUI(); window.openPlanner();
  await new Promise(r => setTimeout(r, 300));
  window.togglePlannerTool('study');
  await new Promise(r => setTimeout(r, 900));
  const panel = document.getElementById('planToolPanel');
  const body = document.getElementById('planToolBody');
  return { heading: panel ? panel.innerText.split('\n')[0] : '', text: body ? body.innerText : '' };
});

check('the table opens on a book you are CARRYING, with no pocketing at all',
      !/Nothing on the table yet/i.test(open.text), JSON.stringify(open.text.slice(0, 90)));
check('and the heading names which book it is',
      /First Book|Second Book/i.test(open.heading), JSON.stringify(open.heading));
check('the tray offers BOTH books you carried',
      /First Book/.test(open.text) && /Second Book/.test(open.text),
      JSON.stringify(open.text.slice(0, 200)));

// switching is one press, and it is YOUR press
const swapped = await p.evaluate(async () => {
  const before = document.getElementById('planToolPanel').innerText.split('\n')[0];
  const btns = [...document.querySelectorAll('#planToolBody button')];
  const labels = btns.map(b => b.innerText.trim());
  const other = btns.find(b => /Second Book/.test(b.innerText)) || btns.find(b => /First Book/.test(b.innerText));
  if (other) other.click();
  await new Promise(r => setTimeout(r, 700));
  return { before, labels, found: !!other,
           after: document.getElementById('planToolPanel').innerText.split(String.fromCharCode(10))[0] };
});
check('the tray renders a chip per carried book', swapped.found,
      'buttons: ' + JSON.stringify(swapped.labels));
check('one press swaps which book is in front of you', swapped.before !== swapped.after,
      JSON.stringify(swapped.before) + ' -> ' + JSON.stringify(swapped.after));

// ---- notes you carried, beside the part they belong to -----------------
/* Through the REAL door, added the same day: the tray rendered carried notes
   while nothing could put a note in the backpack. A surface that displays
   something nothing can produce is a dead feature. */
const carried = await p.evaluate(async (slugA) => {
  window.closeUI();
  window.openNotesForBook(slugA);
  await new Promise(r => setTimeout(r, 500));
  /* The card's doors only appear once the note is OPEN — the panel shows a
     summary until you press it, which is deliberate and not a bug. */
  const card = [...document.querySelectorAll('#notesLogOv .card')]
    .find(c => /very first page/i.test(c.innerText));
  if (card) card.click();
  await new Promise(r => setTimeout(r, 400));
  const btn = [...document.querySelectorAll('#notesLogOv button')]
    .find(b => /Take with you/i.test(b.innerText));
  const found = !!btn;
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 400));
  return { found, notesHeld: window.carryList().filter(e => e.kind === 'note').length };
}, A);
check('a note can actually BE carried — the door exists in the Notes Log', carried.found);
check('and it lands in the backpack', carried.notesHeld === 1, 'held ' + carried.notesHeld);

const beside = await p.evaluate(async (slugA) => {
  window.closeUI();
  window.studySetBook(slugA);
  window.openPlanner();
  await new Promise(r => setTimeout(r, 300));
  window.togglePlannerTool('study');
  await new Promise(r => setTimeout(r, 900));
  const body = document.getElementById('planToolBody');
  return body ? body.innerText : '';
}, A);
check('the carried note appears at the table, beside its part',
      /Notes you brought/i.test(beside) && /very first page/i.test(beside),
      JSON.stringify(beside.slice(0, 220)));
check('and it says where it came from', /From your backpack/i.test(beside));

check('no console errors', errs.length === 0, errs.join(' | '));

await p.screenshot({ path: 'test/live/_study-tray.png' });
await browser.close();

let bad = 0;
for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ the table works from what you carried, and you choose which.');
process.exit(bad ? 1 : 0);
