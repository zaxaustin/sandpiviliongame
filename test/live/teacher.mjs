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
  /* THE SHELF USED TO COME FROM seed.js. It was deleted 2026-08-10, and the
     "set texts" picker needs a real shelf to offer — some books with full
     text (which can carry a reading) and some summary-only (which cannot,
     and must say so instead of leaving a dead button). Both kinds are built
     here now, which is also rule 1: these are books a PLAYER brought in. */
  personalLibrary: [
    { slug:'personal-discourses', title:'Discourses Of Epictetus',
      tradition:'Personal', personal:true, license:'', added:'2026-08-03', category:'personal',
      attribution:'Epictetus', doc:{ summary:'', sections:[], fullText:{ text:t } } },
    ...Array.from({ length: 14 }, (_, i) => ({
      slug: 'personal-full-' + i, title: 'A Book With Its Text #' + i,
      tradition: 'Classics', personal: true, license: 'Personal', added: '2026-08-03',
      attribution: 'You', doc: { summary: 'Has a full text behind it.', sections: [],
        fullText: { text: 'A page of it.\n\nAnd another.' } },
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      slug: 'personal-summary-' + i, title: 'A Book On Paper #' + i,
      tradition: 'Non-fiction', personal: true, license: 'Personal', added: '2026-08-03',
      attribution: 'You', doc: { summary: 'On a real shelf; no text here.', sections: [] },
    })),
  ],
})), BOOK);
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));

/* ---- can he FIND it? ----
   Asked outright 2026-08-03: "where in game can i make a course, the course
   board? ... i have the long discourses in my back pack, where do i make a
   lesson on the buddhas teachings?" Every piece existed; none of it was
   reachable from the book he was holding. Being unfindable is the same as
   being unbuilt (the Lab taught this project that once already). */
console.log('\nCan he find the door at all\n');

const findable = await p.evaluate(async () => {
  closeUI(); openMenu();
  await new Promise(r => setTimeout(r, 400));
  const menu = [...document.querySelectorAll('#menuOv button')].map(x => x.textContent.trim());
  return { menu, courseBoard: menu.some(t => /Course Board/.test(t)), tree: menu.some(t => /Lesson plans/.test(t)) };
});
ok('the Course Board has a door in the pause menu', findable.courseBoard,
  findable.menu.filter(t => /Course|Lesson|Academy/.test(t)).join(' · '));
ok('so does the Learning Tree', findable.tree);

const fromBook = await p.evaluate(async () => {
  closeUI();
  openReader('personal-discourses');
  await new Promise(r => setTimeout(r, 400));
  const offered = !!document.getElementById('rdLessonBtn');
  writeLessonOnThisBook();
  await new Promise(r => setTimeout(r, 500));
  const sel = document.getElementById('mlBook');
  return { offered, onWriteForm: !!sel, preset: sel ? sel.value : null,
           panelOpen: !!document.querySelector('#treeOv.open') };
});
ok('the book you are holding offers to become a lesson', fromBook.offered);
ok('and it opens the lesson writer', fromBook.onWriteForm && fromBook.panelOpen, JSON.stringify(fromBook));
ok('with the book ALREADY chosen — no hunting it in a list of hundreds',
  fromBook.preset === 'personal-discourses', JSON.stringify(fromBook.preset));

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

/* "needing one and being able to have their assistance are two different
   things." A teacher must never NEED an AI — this whole suite runs without
   one — but picking a set text must be enough to ASK for help, without also
   having to describe the book in a seed box. With no AI connected the
   drafter should complain about the CONNECTION, not about having no subject. */
const asking = await p.evaluate(async () => {
  newLessonForm();
  await new Promise(r => setTimeout(r, 350));
  await draftLessonWithAI();                       // nothing filled in at all
  const withNothing = document.getElementById('mlAiOut').textContent;
  document.getElementById('mlBook').value = 'personal-discourses';
  await draftLessonWithAI();                       // a set text, and nothing else
  return { withNothing, withBook: document.getElementById('mlAiOut').textContent };
});
ok('with nothing at all, it asks what the lesson is about',
  /what the lesson is about/i.test(asking.withNothing), asking.withNothing.slice(0, 70));
ok('but a set text alone is a subject — it asks only for the connection',
  /No local AI connected/i.test(asking.withBook), asking.withBook.slice(0, 70));

/* THE DOOR. A step saying "Read chapters 2-3" must open chapter 2 — and the
   whole point is that he wrote that naturally, not in a syntax. */
await p.evaluate(async () => {              // back to the lesson we saved
  const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  openLesson(save.myLessons[0].id);
  await new Promise(r => setTimeout(r, 300));
});
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

/* ---- what a NEW user actually meets ----
   On a clean install the shelf is the 27 shipped books, and 21 of them are
   summaries with no full text. A teacher picking one of those, writing "Read
   chapters 3-4", and getting no door with no explanation is the house failure
   mode landing on the feature meant to sell the whole thing. */
console.log('\nWhat a fresh install offers as a set text\n');

const fresh = await p2.evaluate(async () => {
  openLearningTree();
  await new Promise(r => setTimeout(r, 300));
  newLessonForm();
  await new Promise(r => setTimeout(r, 400));
  const sel = document.getElementById('mlBook');
  const groups = [...sel.querySelectorAll('optgroup')].map(g => ({
    label: g.label, n: g.querySelectorAll('option').length,
    first: g.querySelector('option')?.value,
  }));
  return { groups, total: sel.querySelectorAll('option').length - 1 };
});
console.log('  ' + fresh.groups.map(g => `${g.n} ${g.label}`).join('\n  '));
ok('a fresh shelf offers set texts at all', fresh.total >= 20, fresh.total + ' books');
ok('and says which can carry a reading',
  fresh.groups.length === 2 && /full text/.test(fresh.groups[0].label) && /summary only/.test(fresh.groups[1].label),
  JSON.stringify(fresh.groups.map(g => g.label)));
ok('there is at least one shipped book a lesson can link INTO',
  (fresh.groups[0] || {}).n >= 1, ((fresh.groups[0] || {}).n || 0) + ' with full text');

const summaryOnly = await p2.evaluate(async (slug) => {
  document.getElementById('mlTitle').value = 'A summary-only set text';
  document.getElementById('mlBook').value = slug;
  document.getElementById('mlSteps').value = 'Read chapters 3-4 and annotate | should not offer a door';
  saveMyLesson(null);
  await new Promise(r => setTimeout(r, 400));
  const panel = document.getElementById('treePanel');
  return {
    doors: [...panel.querySelectorAll('button')].map(x => x.textContent.trim()).filter(t => /^📖/.test(t)),
    says: /summary rather than the full text/.test(panel.textContent),
  };
}, (fresh.groups[1] || {}).first);
ok('a summary-only set text offers NO reading door', summaryOnly.doors.length === 0, JSON.stringify(summaryOnly.doors));
ok('and says plainly why, rather than leaving a dead button', summaryOnly.says);

/* A citation the book cannot honour. The Dhammapada ships with 26 chapters;
   "chapter 40" is a mistake, and a class sent to a page that is not there is
   worse than being told. */
const beyond = await p2.evaluate(async (slug) => {
  newLessonForm();
  await new Promise(r => setTimeout(r, 350));
  document.getElementById('mlTitle').value = 'A citation past the end';
  document.getElementById('mlBook').value = slug;
  document.getElementById('mlSteps').value = 'Read chapter 2 | fine\nRead chapter 400 | there is no such chapter';
  saveMyLesson(null);
  await new Promise(r => setTimeout(r, 500));
  const panel = document.getElementById('treePanel');
  return {
    doors: [...panel.querySelectorAll('button')].map(x => x.textContent.trim()).filter(t => /^📖/.test(t)),
    warns: /nothing to link to/.test(panel.textContent),
  };
}, (fresh.groups[0] || {}).first);
ok('a real chapter still gets its door', beyond.doors.length === 1, JSON.stringify(beyond.doors));
ok('a chapter the book does not have gets NO door', !beyond.doors.some(d => /400/.test(d)), JSON.stringify(beyond.doors));
ok('and the teacher is told, so he can fix it before Monday', beyond.warns);

ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
ok('no page errors for the colleague', errs2.length === 0, errs2.slice(0, 3).join(' | ') || 'none');

await b.close();
console.log('\n' + (failed ? `${failed} FAILED` : 'teacher: all checks passed') + '\n');
process.exit(failed ? 1 : 0);
