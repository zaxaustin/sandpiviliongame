/* [STAGES 2–5] — the rest of the walk, and the checklist at the end of it.
   ======================================================================
   test/live/tutorial-stage1.cjs is the acceptance gate and has to be
   Electron, because getting a first book onto a shelf goes through the
   desktop bridge. Stages 2–5 do not touch it — they read badges, tasks and
   lessons — so they run here, in a browser, where they are cheap.

   THE PART THAT MATTERS IS STAGE 5. It is the pivot the whole place is
   shaped around ("a teacher, a meditator, an engineer, leaving work somebody
   else can walk"), and until this suite existed not one line of it had ever
   been executed. Three things it must do and none of them are obvious from
   reading the code:

     · REFUSE OUT LOUD, naming which of the five rows is missing. A button
       that quietly declines is the same as a broken one.
     · Mark two of the five rows as the visitor's OWN JUDGEMENT. Code cannot
       read a lesson and know whether a stranger could follow it, and a
       checklist that pretends to have measured a judgement is worse than one
       that asks.
     · NEVER PROMISE MISSIONS. MISSION-SYSTEM-PLAN.md and THE-THREE-COURTS.md
       are unbuilt drafts, so a graduation claiming to open F-rank would be a
       door onto nothing.

   Badges for stages 2 and 3 are seeded rather than earned — walking up to an
   NPC in a headless browser is not the thing under test, and `first-word`
   fires on the dialog path in main.js which the Electron gate already covers.
   `data.tutorial` is NEVER seeded: the derivation is exactly what is on trial.

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { inlineBook, A_BOOK } from './_books.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

/* Stage 1 already done, the honest way it would be: a book on the shelf, a
   note beside it, and it in the bag. */
const save = {
  seenWelcome: true, aiConnections: [],
  personalLibrary: [inlineBook()],
  bookNotes: { [A_BOOK]: [{ ts: '2026-08-09', text: 'A thought worth keeping.', page: 1,
                            by: { who: 'you', user: 'user 1' } }] },
  carrying: [{ kind: 'book', slug: A_BOOK, title: 'Walden', added: '2026-08-09' }],
  /* first-word is seeded WITH the rest rather than awarded mid-run. The first
     version set it and called p.reload() to pick it up — and
     evaluateOnNewDocument RE-FIRES ON RELOAD, overwriting the save it had just
     written (the gotcha CLAUDE.md records). Every stage after 2 then failed
     while the app was behaving perfectly. The real award happens on main.js's
     NPC path, which the Electron gate covers; the transitions worth driving
     for real here are 3→4 and 4→5, and those are. */
  badges: { 'first-book-note': '2026-08-09', 'first-carry': '2026-08-09',
            'first-word': '2026-08-09' },
};

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 980 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(save));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));
const wait = ms => new Promise(r => setTimeout(r, ms));

const panel = () => p.evaluate(() => {
  const el = document.getElementById('tutorialPanel');
  return el ? el.innerHTML : '';
});
const open = async () => { await p.evaluate(() => { window.closeUI(); window.openTutorial(); }); await wait(350); };
const savedTut = () => p.evaluate(() =>
  JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').tutorial || {});

console.log('\nStage 2 — the residents\n');
await open();
let h = await panel();
ok('stage 1 is already done, from real state and not a stored flag', /✓ 1 · The first loop/.test(h));
ok('stage 2 is the one in front of you', /THE RESIDENTS/i.test(h));
ok('...and stage 3 is not described yet', !/The day, and the desk/i.test(h));
ok('it says the residents are OPTIONAL — the visitor on a small laptop must not be stuck',
   /do not need them/i.test(h));
ok('and it names what the grounding chain bought: page numbers you can check',
   /page numbers you can turn to/i.test(h));

/* first-word fires on the dialog path; seeded here for the same reason the
   header gives. The Electron gate covers the real award. */
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  s.badges['first-word'] = '2026-08-09';
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s));
});
await p.reload({ waitUntil: 'networkidle2' });
await p.click('#startBtn'); await wait(1300);

console.log('\nStage 3 — the day\n');
await open();
h = await panel();
ok('meeting someone moves you to stage 3', /THE DAY, AND THE DESK/i.test(h));
ok('stage 2 collapsed with its evidence', /✓ 2 · The residents/.test(h));

/* A real task, through the real function. */
await p.evaluate(() => { window.closeUI(); window.openDailyTasks(); });
await wait(500);
const madeTask = await p.evaluate(() => {
  const t = document.getElementById('dtTitle');
  if (!t) return 'no form';
  t.value = 'Read a chapter and write one line about it';
  const s0 = document.getElementById('dtStep0');
  if (s0) s0.value = 'Read chapter one';
  window.takeDailyTask();
  return (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').dailyTasks || []).length;
});
ok('a task can be written through the real form', madeTask === 1, String(madeTask));

console.log('\nStage 4 — making, not only following\n');
await open();
h = await panel();
ok('a written task moves you to stage 4', /MAKING, NOT ONLY FOLLOWING/i.test(h));

await p.evaluate(() => { window.closeUI(); window.openLearningTree(); window.newLessonForm(); });
await wait(500);
const madeLesson = await p.evaluate(() => {
  const t = document.getElementById('mlTitle');
  if (!t) return { err: 'no form' };
  t.value = 'Reading slowly, on purpose';
  document.getElementById('mlSummary').value = 'How to get more from one chapter than from five.';
  document.getElementById('mlSteps').value =
    'Pick one chapter | and only one\nRead it twice | once fast, once slow\nWrite one line | in your own words';
  window.saveMyLesson();
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return { n: (s.myLessons || []).length, id: (s.myLessons || [])[0] && s.myLessons[0].id,
           badge: !!(s.badges || {})['first-lesson'] };
});
ok('a lesson can be written through the real form', madeLesson.n === 1, JSON.stringify(madeLesson));
ok('...and it awarded first-lesson — the badge nothing granted until today', madeLesson.badge);
const lessonId = madeLesson.id;

console.log('\nStage 5 — leave something for others\n');
await open();
h = await panel();
ok('a lesson of your own moves you to stage 5', /LEAVE SOMETHING FOR OTHERS/i.test(h));
ok('the five readiness rows are on screen',
   /It exists/.test(h) && /You walked it to the end/.test(h)
   && /stand alone/.test(h) && /what it produces/.test(h) && /left this machine/.test(h));
/* THE SENTENCE THAT KEEPS IT HONEST. */
ok('★ it says plainly that Missions are NOT built', /Missions are not built/.test(h));
ok('★ and promises no door it cannot open', !/unlock/i.test(h) && !/F-rank (is|now)/i.test(h));
ok('the derived rows say so, rather than pretending to have measured a judgement',
   /The Pavilion can see this one/.test(h));

/* REFUSES, AND SAYS WHICH ROW. */
await p.evaluate(() => window.tutorialRecordGraduation());
await wait(300);
const refused = await p.evaluate(() => {
  const m = document.getElementById('tutMsg');
  return { msg: m ? m.textContent : '',
           grad: (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').tutorial || {}).graduated };
});
ok('★ "Record this" REFUSES while the course is unfinished', !refused.grad);
ok('...and names which row is missing rather than doing nothing',
   /Not yet — .{10,}/.test(refused.msg), refused.msg.slice(0, 80));

/* Walk the lesson to the end, for real. */
await p.evaluate((id) => {
  window.closeUI();
  for (let i = 0; i < 3; i++) window.toggleLessonStep(id, i);
}, lessonId);
await wait(400);
await open();
h = await panel();
ok('walking every step ticks the derived row', /✓ You walked it to the end/.test(h));

/* The two judgements — each one press, each writing exactly one field. */
await p.evaluate(() => window.tutorialTickReady('standsAlone'));
await wait(250);
await p.evaluate(() => {
  const box = document.getElementById('tutOutcome');
  if (box) box.value = 'One chapter, properly read, and a line you actually wrote.';
  window.tutorialSetOutcome();
});
await wait(300);
const ready = await savedTut();
ok('the two judgements are stored per lesson, not globally',
   !!(ready.ready && ready.ready[lessonId] && ready.ready[lessonId].standsAlone
      && ready.ready[lessonId].outcome), JSON.stringify(ready.ready || {}).slice(0, 100));

/* Still refuses — it has not left the machine. */
await p.evaluate(() => window.tutorialRecordGraduation());
await wait(300);
ok('★ still refuses on the last row alone', !(await savedTut()).graduated);

/* Publish it, through the real Commons flow with its reason screen. */
await p.evaluate(() => window.tutorialPublish());
await wait(500);
const why = await p.evaluate(() => !!document.getElementById('pubReason'));
ok('publishing goes through the reason screen, not a second path', why);
await p.evaluate(() => {
  document.getElementById('pubReason').value = 'The two-readings trick is the part worth stealing.';
  window.confirmPublish();
});
await wait(600);

await open();
h = await panel();
ok('publishing ticks the last row', /✓ It has left this machine/.test(h));
await p.evaluate(() => window.tutorialRecordGraduation());
await wait(400);
const grad = await savedTut();
ok('★ NOW it records — one press, and only when all five are true',
   !!(grad.graduated && grad.graduated.lesson === lessonId), JSON.stringify(grad.graduated || null));

h = await panel();
ok('the record is quiet, and repeats that Missions are not built',
   /Recorded/.test(h) && /Missions are not built/.test(h));
ok('no celebration screen', !/congratulat|well done|🎉/i.test(h));
await p.screenshot({ path: 'test/live/_tut-stage5.png' });

/* THE RULE-4 PROPERTY, after everything. */
const keys = Object.keys(grad).sort().join(',');
ok('★ after all five stages the save still holds exactly three fields',
   keys === 'graduated,ready,started', keys);

await open();
h = await panel();
ok('all five show as done', /5 of 5 done/.test(h));
ok('and a finished walk still opens, for re-reading after things drift',
   /You have walked all five/.test(h));

console.log('\npage errors:', errs.length ? errs.slice(0, 3) : 'none');
console.log('screenshot -> test/live/_tut-stage5.png');
await b.close();
process.exit(failed || errs.length ? 1 : 0);
