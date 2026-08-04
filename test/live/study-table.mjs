/* THE STUDY TABLE — working through a book one story at a time.
   Needs `npm run preview`.

   The subject is `advice-to-sigalaka.txt`, which the steward imported himself:
   a real discourse FROM the Long Discourses, and one of the 18 books in 39 on
   this machine that find NO chapters at all. That is the point. A workroom
   that only opens for books whose chapters were detected would refuse to open
   for nearly half the shelf, and the page-by-page path is the majority case
   rather than a fallback.

   Runs with NO AI connected — none of this stage needs one. */
import puppeteer from 'file:///C:/Users/resto/Desktop/projects/sand%20pavilion%20game/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { readFileSync } from 'node:fs';

const NO_CHAPTERS = readFileSync(new URL('../fixtures/chapters/no-chapters-sigalaka.txt', import.meta.url), 'utf8');
const WITH_CHAPTERS = readFileSync(new URL('../fixtures/chapters/numerals-discourses.txt', import.meta.url), 'utf8');

let failed = 0;
const ok = (n, c, d) => { console.log((c ? '  ok   ' : '  FAIL ') + n + (d ? '  — ' + d : '')); if (!c) failed++; };

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', defaultViewport: { width: 1050, height: 1000 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((plain, chaptered) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify({
  seenWelcome: true, aiConnections: [],
  personalLibrary: [
    { slug:'personal-sigalaka', title:'Advice to Sigalaka', tradition:'Personal', personal:true,
      license:'', added:'2026-08-04', category:'personal', attribution:'Bhikkhu Sujato',
      doc:{ summary:'', sections:[], fullText:{ text:plain } } },
    { slug:'personal-discourses', title:'Discourses Of Epictetus', tradition:'Personal', personal:true,
      license:'', added:'2026-08-04', category:'personal', attribution:'Epictetus',
      doc:{ summary:'', sections:[], fullText:{ text:chaptered } } },
  ],
})), NO_CHAPTERS, WITH_CHAPTERS);
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));

const open = async (slug) => p.evaluate(async (s) => {
  closeUI();
  openReader(s);
  await openFullText(s);
  minimizeReader();                       // walk off with it — the pocket is the table
  await new Promise(r => setTimeout(r, 250));
  openPlanner();
  await new Promise(r => setTimeout(r, 250));
  togglePlannerTool('study');
  await new Promise(r => setTimeout(r, 600));
  const body = document.getElementById('planToolBody');
  return {
    heading: body.querySelector('b')?.textContent.trim() || '',
    meta: [...body.querySelectorAll('.meta')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
    text: body.textContent.replace(/\s+/g, ' '),
    buttons: [...body.querySelectorAll('button')].map(x => x.textContent.trim()),
    toolbox: [...document.querySelectorAll('#planToolbox button')].map(x => x.textContent.trim()),
  };
}, slug);

console.log('\nA book that finds NO chapters — nearly half the shelf\n');

const plain = await open('personal-sigalaka');
ok('the workroom opens for it at all', /Page 1/.test(plain.heading), plain.heading);
ok('and says the division is page by page, as an invitation',
  plain.meta.some(m => /no divisions found yet/.test(m)), plain.meta[0] || '(none)');
ok('the toolbox button names the book you are working through',
  plain.toolbox.some(t => /Advice to Sigalaka/.test(t)), plain.toolbox.join(' | '));
ok('the text of the page is actually on the table', /So I have heard/.test(plain.text), plain.text.slice(0, 90));
ok('it offers to label the page and to read it',
  plain.buttons.some(t => /Label this page/.test(t)) && plain.buttons.some(t => /Read it here/.test(t)),
  JSON.stringify(plain.buttons));

/* THE FIRST THING HE ASKED FOR: name a story yourself, in your own words. */
const labelled = await p.evaluate(async () => {
  studyStep(1); await new Promise(r => setTimeout(r, 250));      // move to page 2
  studyLabelToggle(); await new Promise(r => setTimeout(r, 250));
  document.getElementById('studyLabelInput').value = 'The six directions';
  studyLabelSave();
  await new Promise(r => setTimeout(r, 700));
  const body = document.getElementById('planToolBody');
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  return {
    heading: body.querySelector('b')?.textContent.trim() || '',
    meta: [...body.querySelectorAll('.meta')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
    marks: (save.bookMarks || {})['personal-sigalaka'] || [],
  };
});
ok('a story you name becomes a real division', /The six directions/.test(labelled.heading), labelled.heading);
ok('and the panel says the name is YOURS, not ours',
  labelled.meta.some(m => /you named this one/.test(m)), labelled.meta[0] || '(none)');
ok('the mark is saved, with the page it was made on',
  labelled.marks.length === 1 && labelled.marks[0].page === 1 && labelled.marks[0].label === 'The six directions',
  JSON.stringify(labelled.marks));
/* Pages before the first mark must belong to SOMETHING. The first version of
   this check only asserted the current heading did not mention page 1, which
   would have passed even if those pages had fallen out of the book entirely. */
const opening = await p.evaluate(async () => {
  studyStep(-1);
  await new Promise(r => setTimeout(r, 400));
  const body = document.getElementById('planToolBody');
  return { heading: body.querySelector('b')?.textContent.trim() || '',
           meta: [...body.querySelectorAll('.meta')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
           text: body.textContent.replace(/\s+/g, ' ') };
});
ok('the pages before your mark are still part of the book',
  /The opening/.test(opening.heading) && /p\. 1/.test(opening.heading), opening.heading);
ok('and they are not credited to anyone',
  opening.meta.some(m => /before the first mark/.test(m)), opening.meta[0] || '(none)');
ok('with the real text of page 1 still on the table', /So I have heard/.test(opening.text));
await p.evaluate(async () => { studyStep(1); await new Promise(r => setTimeout(r, 400)); });

/* A note written at the table must be the same note the Reader writes. */
const noted = await p.evaluate(async () => {
  document.getElementById('studyNoteInput').value = 'The six directions are the six relationships, not a compass.';
  studyAddNote();
  await new Promise(r => setTimeout(r, 700));
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const n = (save.bookNotes['personal-sigalaka'] || [])[0];
  return {
    msg: document.getElementById('studyMsg')?.textContent || '',
    note: n ? { text: (n.text || '').slice(0, 40), page: n.page, ts: n.ts } : null,
    shown: /six relationships/.test(document.getElementById('planToolBody').textContent),
    cleared: document.getElementById('studyNoteInput').value === '',
  };
});
ok('a note written at the table is kept', !!noted.note && noted.note.page === 1, JSON.stringify(noted.note));
ok('it appears under the story it belongs to', noted.shown);
ok('the box clears and the table says where it went', noted.cleared && /p\. 2/.test(noted.msg), JSON.stringify(noted.msg));

/* Unmarking must put it back the way it was, not leave a hole. */
const cleared = await p.evaluate(async () => {
  studyUnlabel(1);
  await new Promise(r => setTimeout(r, 600));
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  return { marks: (save.bookMarks || {})['personal-sigalaka'] || [],
           notes: (save.bookNotes['personal-sigalaka'] || []).length };
});
ok('unmarking removes the division', cleared.marks.length === 0, JSON.stringify(cleared.marks));
ok('and never touches the notes written under it', cleared.notes === 1, cleared.notes + ' note(s)');

console.log('\nA book that DOES find its chapters\n');

const chaptered = await open('personal-discourses');
ok('it opens on real chapters, not pages', !/Page 1/.test(chaptered.heading), chaptered.heading);
ok('and says where the division came from',
  chaptered.meta.some(m => /found in the text|before the first mark/.test(m)), chaptered.meta[0] || '(none)');

/* HAND OUTRANKS DETECTION — the rule schema.sql has stated since the day the
   chapters table went in, driven here rather than asserted in a unit test. */
const outranks = await p.evaluate(async () => {
  studyLabelToggle(); await new Promise(r => setTimeout(r, 250));
  const before = document.getElementById('planToolBody').querySelector('b')?.textContent.trim();
  document.getElementById('studyLabelInput').value = 'What is truly ours';
  studyLabelSave();
  await new Promise(r => setTimeout(r, 700));
  const body = document.getElementById('planToolBody');
  return { before, after: body.querySelector('b')?.textContent.trim() || '',
           meta: [...body.querySelectorAll('.meta')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) };
});
ok('renaming a detected chapter replaces its name', /What is truly ours/.test(outranks.after),
  `${outranks.before} → ${outranks.after}`);
ok('and the panel credits you for it', outranks.meta.some(m => /you named this one/.test(m)));

ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');

await b.close();
console.log('\n' + (failed ? `${failed} FAILED` : 'study-table: all checks passed') + '\n');
process.exit(failed ? 1 : 0);
