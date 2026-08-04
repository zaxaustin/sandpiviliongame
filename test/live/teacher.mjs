/* THE TEACHER'S PATH, driven end to end in a real browser — write a lesson
   on a set text he brought in himself, follow a step to the right chapter,
   take it out as a document, and hand it to a colleague.
   Needs `npm run preview`.

   The subject is a PLAYER-ADDED book, per CLAUDE.md's standing rule: no
   sections, author read off the file, text inline. A seed book would be
   tidier in every way that matters here and would prove nothing. */
import puppeteer from 'file:///C:/Users/resto/Desktop/projects/sand%20pavilion%20game/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { readFileSync } from 'node:fs';

const BOOK = readFileSync(new URL('../fixtures/chapters/numerals-discourses.txt', import.meta.url), 'utf8');
let failed = 0;
const ok = (n, c, d) => { console.log((c ? '  ok   ' : '  FAIL ') + n + (d ? '  — ' + d : '')); if (!c) failed++; };

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', defaultViewport: { width: 1050, height: 980 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument((t) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify({
  seenWelcome: true, aiConnections: [],          // no AI: a teacher must not need one
  personalLibrary: [{ slug:'personal-discourses', title:'Discourses Of Epictetus',
    tradition:'Personal', personal:true, license:'', added:'2026-08-03', category:'personal',
    attribution:'Epictetus', doc:{ summary:'', sections:[], fullText:{ text:t } } }],
})), BOOK);
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));

console.log('\nA teacher writes a lesson on a set text\n');

const written = await p.evaluate(async () => {
  openLearningTree();
  await new Promise(r => setTimeout(r, 300));
  newLessonForm();
  await new Promise(r => setTimeout(r, 400));
  const hasPicker = !!document.getElementById('mlBook');
  const options = [...(document.getElementById('mlBook')?.options || [])].map(o => o.textContent.trim());
  document.getElementById('mlTitle').value = 'Epictetus — week 1';
  document.getElementById('mlSummary').value = 'Open the Discourses and find what is actually in our power.';
  document.getElementById('mlTrack').value = 'Philosophy 10';
  document.getElementById('mlBook').value = 'personal-discourses';
  document.getElementById('mlSteps').value =
    'Warm-up: what did you fail to control this week? | Five minutes, no sharing.\n'
    + 'Read chapters 2-3 and mark every "not in our power" | Bring one you disagree with.\n'
    + 'Discuss pp. 12-18 in pairs | One person argues the opposite.';
  saveMyLesson(null);
  await new Promise(r => setTimeout(r, 500));
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const node = (save.myLessons || [])[0];
  return { hasPicker, optionCount: options.length, listsTheBook: options.some(o => /Discourses Of Epictetus/.test(o)),
    node: node ? { id: node.id, book: node.book, steps: node.steps.length, track: node.track } : null,
    panel: document.getElementById('treePanel').textContent.replace(/\s+/g, ' ') };
});
ok('the authoring form offers a set text', written.hasPicker);
ok('and it lists the book he brought in himself', written.listsTheBook, written.optionCount + ' options');
ok('the lesson is saved WITH its book', !!written.node && !!written.node.book && written.node.book.slug === 'personal-discourses',
  JSON.stringify(written.node && written.node.book));
ok('the lesson names its set text where you read it', /Set text: Discourses Of Epictetus/.test(written.panel),
  written.panel.slice(0, 140));

/* THE DOOR. A step saying "Read chapters 2-3" must open chapter 2 — and the
   whole point is that he wrote that naturally, not in a syntax. */
const doors = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('#treePanel .card')];
  return cards.map(c => ({
    title: (c.querySelector('.t')?.textContent || '').trim(),
    reading: [...c.querySelectorAll('button')].map(x => x.textContent.trim()).filter(t => /^📖/.test(t)),
    call: (c.innerHTML.match(/openLessonReading\('[^']+','(\w+)',(\d+)\)/) || []).slice(1).join(' '),
  })).filter(x => x.title);
});
const warmup = doors.find(d => /Warm-up/.test(d.title));
const chapterStep = doors.find(d => /chapters 2-3/.test(d.title));
const pageStep = doors.find(d => /pp\. 12-18/.test(d.title));
ok('a step naming chapters gets a door', !!chapterStep && chapterStep.reading.length === 1,
  JSON.stringify(chapterStep && chapterStep.reading));
ok('and it is the chapter he named, not the first one', chapterStep && chapterStep.call === 'chapter 2', chapterStep && chapterStep.call);
ok('a step naming pages gets a page door', pageStep && pageStep.call === 'page 12', pageStep && pageStep.call);
ok('a step naming nothing gets NO door — a wrong citation is worse than none',
  !!warmup && warmup.reading.length === 0, JSON.stringify(warmup && warmup.reading));

const landed = await p.evaluate(async () => {
  await openLessonReading('personal-discourses', 'chapter', 2);
  await new Promise(r => setTimeout(r, 900));
  return { page: document.getElementById('rdFullTextPageNum')?.textContent || '',
           chap: document.getElementById('rdChapNote')?.textContent || '',
           open: !!document.querySelector('#readerOv.open') };
});
ok('following it opens the book', landed.open && /Page \d/.test(landed.page), JSON.stringify(landed));
ok('and lands in chapter 2, not at the front', /ch\.?\s*2\b/i.test(landed.chap) || !/Page 1 of/.test(landed.page),
  `${landed.chap || '(no chapter line)'} · ${landed.page}`);

console.log('\nAnd it leaves the building\n');

const exported = await p.evaluate(async () => {
  /* Catch the download rather than performing it — the browser path builds a
     Blob, so read what would have been written. */
  const grabbed = {};
  const realCreate = URL.createObjectURL;
  URL.createObjectURL = (blob) => { grabbed.blob = blob; grabbed.type = blob.type; return 'blob:test'; };
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { grabbed.name = this.download; };
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const id = save.myLessons[0].id;
  openLesson(id);
  await new Promise(r => setTimeout(r, 300));
  const offered = [...document.querySelectorAll('#treePanel button')].map(x => x.textContent.trim())
    .filter(t => /Save as/.test(t));
  await exportLesson(id, 'html');
  const html = grabbed.blob ? await grabbed.blob.text() : '';
  const htmlName = grabbed.name;
  await exportLesson(id, 'md');
  const md = grabbed.blob ? await grabbed.blob.text() : '';
  URL.createObjectURL = realCreate; HTMLAnchorElement.prototype.click = realClick;
  return { offered, html, md, htmlName, mdName: grabbed.name };
});
ok('a lesson can be taken out as a document', exported.offered.length === 2, JSON.stringify(exported.offered));
ok('the web page is one self-contained file',
  /^<!doctype html>/i.test(exported.html) && !/<(script|link|img)\b/i.test(exported.html),
  exported.html.slice(0, 40));
ok('it carries the lesson, the set text and the readings',
  /Epictetus — week 1/.test(exported.html) && /Discourses Of Epictetus/.test(exported.html)
    && /ch\. 2–3/.test(exported.html),
  exported.html.length + ' bytes');
ok('it is named something he could find again', exported.htmlName === 'epictetus-week-1.html', exported.htmlName);
ok('the Markdown carries the same', /^# Epictetus — week 1/m.test(exported.md) && /ch\. 2–3/.test(exported.md),
  exported.md.slice(0, 60).replace(/\n/g, ' '));

console.log('\nAnd a colleague gets a LESSON, not prose\n');

const handed = await p.evaluate(async () => {
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const id = save.myLessons[0].id;
  publishFrom('lesson', id);
  await new Promise(r => setTimeout(r, 400));
  const after = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const packet = (after.commons.published || [])[0];
  /* Now be the colleague: the packet arrives, and is taken. */
  const raw = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  raw.myLessons = [];                          // he has none of his own
  raw.commons.received = [packet];
  raw.commons.published = [];
  raw.commons.taken = {};
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(raw));
  return { kind: packet.kind, steps: (packet.steps || []).length, track: packet.track };
});
ok('publishing a lesson makes a lesson packet', handed.kind === 'lesson' && handed.steps === 3, JSON.stringify(handed));

const p2 = await b.newPage();
const errs2 = [];
p2.on('pageerror', e => errs2.push(e.message));
await p2.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p2.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));
const received = await p2.evaluate(async () => {
  openCommonsTable();
  await new Promise(r => setTimeout(r, 400));
  const save0 = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const pk = save0.commons.received[0];
  openPacket(pk.id);                       // the promise is made on the packet, where you press
  await new Promise(r => setTimeout(r, 300));
  const promise = document.getElementById('commonsPanel')?.textContent || '';
  takePacket(pk.id);
  await new Promise(r => setTimeout(r, 500));
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  return {
    promise: /Learning Tree/.test(promise),
    lessons: (save.myLessons || []).length,
    title: (save.myLessons || [])[0]?.title || '',
    steps: (save.myLessons || [])[0]?.steps?.length || 0,
    notes: (save.notes || []).length,
  };
});
ok('the Table promises it lands in the tree', received.promise);
ok('and it really becomes a LESSON, not a note',
  received.lessons === 1 && received.steps === 3 && received.notes === 0,
  `${received.lessons} lesson(s) with ${received.steps} steps, ${received.notes} note(s)`);
ok('with its steps intact', /Epictetus — week 1/.test(received.title), received.title);

ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
ok('no page errors for the colleague', errs2.length === 0, errs2.slice(0, 3).join(' | ') || 'none');

await b.close();
console.log('\n' + (failed ? `${failed} FAILED` : 'teacher: all checks passed') + '\n');
process.exit(failed ? 1 : 0);
