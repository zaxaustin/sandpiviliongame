/* [WHAT GETS YOU TO THE NEXT MODULE] — the checklist, and the day.
   ======================================================================
   The steward, 2026-08-15, having used the desk on his own courses and being
   happy with everything else in it:

     "The only thing I have to complain about is there's no clear direction.
      Next to it there should be a checklist on how to get to the next module
      — like READ CHAPTER ONE and MAKE AT LEAST THREE NOTES and GIVE A GENERAL
      IMPRESSION OF THE CHAPTER, something like that. I don't know really how
      to do daily missions and tasks like this that are integrated part of the
      course."

   WHAT THIS DRIVES, by clicking:

     pin the real course        -> the open module grows a checklist
     nothing done yet           -> every counted row is ○, and it says WHY
     ★ the unverifiable rows    -> listed under their own heading, with no
                                   tick at all, ever
     keep an attempt            -> the attempt row fills in BY ITSELF, on both
                                   the Board and the desk, with the same count
     ★ take it into today       -> a real task on the Tasks board, carrying
                                   only the rows a program can check
     ★ press it twice           -> refused IN A SENTENCE, never silently
     reload                     -> the ticks are still right, because nothing
                                   was ever stored to go stale

   `npm test` holds the DERIVATION (pure, 15 sabotage cases). This holds what
   a person actually sees, which is the other half — three bugs in the desk a
   day ago were invisible to one and obvious to the other.

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

const COURSE_MD = readFileSync('courses/junior-electrical-engineer.course.md', 'utf8');
/* A CHECK THAT REFUSES TO RUN AGAINST THE WRONG FIXTURE is worth more than the
   check itself — the resident-reach.cjs lesson, and it has already caught one
   vacuous guard in this feature. */
if (!/^\*\*Practice:\*\*/m.test(COURSE_MD)) {
  console.error('The real course has no **Practice:** — the checklist would have nothing countable in it '
              + 'and every assertion below would pass by finding nothing.');
  process.exit(1);
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 1050 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
/* ⚠ THE IDENTIFIER IS KEPT SO IT CAN BE REMOVED BEFORE THE RELOAD IN §6.
   evaluateOnNewDocument RE-FIRES ON EVERY NAVIGATION — it is written down in
   CLAUDE.md as a gotcha that has cost a session, and it cost this suite one
   run too: the reload put the empty seed back and the checklist correctly
   showed nothing done, which reads exactly like a feature that forgot. */
const seed = await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, aiConnections: [], courses: [], dailyTasks: [],
                   pos: { scene: 'study', x: 5, y: 4 } }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(1500);

const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}'));
const panelText = id => p.evaluate(i => (document.getElementById(i) || {}).textContent || '', id);
async function clickText(t, sel) {
  const hit = await p.evaluate((tt, s) => {
    const pick = q => [...document.querySelectorAll(q)]
      .find(e => e.offsetParent !== null && e.textContent.replace(/\s+/g, ' ').includes(tt));
    const el = (s ? pick(s) : (pick('button, .btn') || pick('.card, label')));
    if (!el) return false;
    el.click(); return true;
  }, t, sel || '');
  await wait(420);
  return hit;
}
/* ⚠ #coursePanel is NOT the scroller. The Pass 0 suite lost two screenshots to
   this and did not notice, because an unscrolled shot looks like a fine shot
   of the top of the page. */
async function scrollTo(sel) {
  await p.evaluate(q => {
    const el = [...document.querySelectorAll(q)].find(e => e.offsetParent !== null);
    if (el) el.scrollIntoView({ block: 'center' });
  }, sel);
  await wait(400);
}
/* The checklist as a person reads it: one line per row, tick and all. */
const checklist = () => p.evaluate(() => {
  /* ⚠ BY CLASS, NEVER BY TEXT. The first version found "the div whose text
     starts with the heading" — which is the whole module row, because the
     box's text starts with the heading too and document order gives you the
     outer element first. Every assertion below then read the module's prose:
     three passed on text that had nothing to do with the checklist, and the
     rest failed for a reason that was not the reason. */
  const box = [...document.querySelectorAll('.modChecklist')].find(e => e.offsetParent !== null);
  if (!box) return null;
  return [...box.children].map(c => (c.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
});

console.log('\n1 · Pin the real course, and the open module says what is left\n');
await p.evaluate(() => window.openCourses());
await wait(400);
await clickText('Bring a course in');
await p.evaluate(md => { document.getElementById('rcText').value = md; }, COURSE_MD);
await clickText('Read it');
await wait(500);
await clickText('Pin it to the board');
await wait(700);

await scrollTo('.modChecklist');
let rows = await checklist();
ok('★ the open module carries a checklist', !!rows && rows.length > 1,
   rows ? rows.length + ' lines' : 'no box at all');
await p.screenshot({ path: 'test/live/_ck-1-board.png' });

const joined = (rows || []).join(' \n ');
ok('it says how many of the countable things are done', /\b0 of \d/.test(joined), joined.split('\n')[0]);
ok('★ nothing is ticked before anything is done', !/✓/.test(joined));
ok('the homework is one of the rows', /○/.test(joined) && /nothing kept yet/.test(joined));
ok('★ and the rows nobody can check have their own heading',
   /yours to say — nobody can check them for you/i.test(joined));
ok('★ those rows carry no tick of any kind — not even an empty one',
   (() => {
     const at = (rows || []).findIndex(r => /yours to say/i.test(r));
     if (at < 0) return false;
     return (rows || []).slice(at + 1).every(r => !/[✓○]/.test(r));
   })());

/* ⚠ THE DAY COMES FIRST, AND THE ORDER IS LOAD-BEARING. Module 1 of the real
   EE course has exactly ONE countable row, so keeping an attempt finishes the
   checklist and "Take this into today" is then correctly absent — there is
   nothing left for today to help with. Tested in the other order, the button
   was missing for the right reason and the suite reported it as a bug six
   times over. A suite that removes the reason a thing exists and then asks
   where it went is testing its own ordering. */
console.log('\n2 · Taking the module into today, BEFORE it is finished\n');
const before = (await save()).dailyTasks || [];
ok('no tasks before the press', before.length === 0);
ok('the module offers to become today\'s work', await clickText('Take this into today'));
await wait(700);
const after = (await save()).dailyTasks || [];
ok('★ a real task landed in the save', after.length === 1, JSON.stringify(after[0] || {}).slice(0, 130));
const task = after[0] || {};
ok('it is named for the module', !!task.title && /Charge|Module|Field/i.test(task.title), task.title);
ok('★ it says what course it is part of',
   !!(task.source && task.source.kind === 'course' && task.source.label), JSON.stringify(task.source));
ok('★ it carries only what a program can check',
   (task.steps || []).length > 0
   && !(task.steps || []).some(s => /rebuild the theory|by the end|go through what/i.test(s.text || '')),
   (task.steps || []).map(s => s.text).join(' · '));
/* ★ THE FIELD THE BOARD ACTUALLY READS. This assertion said `s.title` for a
   day and stayed green while every step rendered as a bare ○ — because
   `title` is what taskFromChecklist() WROTE, and the board draws `s.text`.
   Asserting the writer's own shape proves nothing about the reader. */
ok('★ every step carries words in the field the board reads',
   (task.steps || []).every(s => typeof s.text === 'string' && s.text.trim().length > 3),
   JSON.stringify((task.steps || []).map(s => s.text)));
ok('and every step names a door', (task.steps || []).every(s => !!s.where),
   (task.steps || []).map(s => s.where).join(', '));
ok('the screen says what happened, rather than nothing',
   /Taken into today/i.test(await panelText('coursePanel')));

console.log('\n3 · ★ Pressing it again is REFUSED IN A SENTENCE\n');
await clickText('Take this into today');
await wait(600);
const msg = await panelText('coursePanel');
const after2 = (await save()).dailyTasks || [];
ok('★ no second day of tasks was taken', after2.length === 1, after2.length + ' tasks');
ok('★ and it said why — never a silent no-op',
   /already have today's tasks/i.test(msg.replace(/’/g, "'")),
   msg.replace(/\s+/g, ' ').match(/You already[^.]*\./)?.[0] || '(no sentence found)');

console.log('\n4 · Do the work, and the row fills in by itself\n');
ok('the module offers the desk', await clickText('work it at the Learning Desk'));
await wait(500);
await p.evaluate(() => { const t = document.getElementById('lwAttempt');
  t.value = 'I built the divider in Falstad and measured 4.98 V across the lower resistor.';
  t.dispatchEvent(new Event('input', { bubbles: true })); });
await wait(300);
await clickText('Keep this attempt');
await wait(700);

const deskRows = await checklist();
ok('★ the desk shows the same checklist', !!deskRows && deskRows.length > 1);
const deskJoin = (deskRows || []).join(' \n ');
ok('★ keeping an attempt ticked the homework row, with no box to press',
   /✓/.test(deskJoin) && /1 attempt kept/.test(deskJoin), deskJoin.match(/[^\n]*attempt[^\n]*/)?.[0]);
ok('and the count moved with it', /\b1 of \d/.test(deskJoin), deskJoin.split('\n')[0]);
await p.screenshot({ path: 'test/live/_ck-2-desk.png' });

/* ★ THE TWO ROOMS MUST NOT DISAGREE. One gatherer, handed over the seam —
   the bug the syllabus and the shelf predicate both had on the same day. */
/* ⚠ openCourses() DELIBERATELY LANDS ON THE LIST — `state.courseView` is reset
   to {mode:'list'} every time. So walking back to the Board means walking back
   in, card and all; the first version stopped at the list and read an empty
   checklist as a disagreement between the two rooms. */
await p.evaluate(() => window.openCourses());
await wait(500);
await clickText('Junior Electrical Engineer', '.card');
await wait(600);
await scrollTo('.modChecklist');
const boardAgain = (await checklist() || []).join(' \n ');
ok('★ the Board says exactly what the desk says',
   /1 attempt kept/.test(boardAgain) && /\b1 of \d/.test(boardAgain));

console.log('\n5 · The day and the course now touch\n');
await p.evaluate(() => window.openDailyTasks());
await wait(600);
const dayText = await p.evaluate(() => document.body.innerText);
ok('★ today\'s board shows the module as the day\'s work',
   /Charge|Field|Potential/i.test(dayText), dayText.split('\n').filter(l => l.trim()).slice(0, 4).join(' / '));
ok('and says what course it came from', /part of/i.test(dayText));
/* ★★ AND THE STEP'S WORDS ARE ON SCREEN. The whole point: not that the save
   holds them, but that a person reading the Tasks board can see what to do.
   Break by renaming the field back to `title` — the save still validates and
   this line goes red, which is the difference that was missing. */
const stepWords = (task.steps || [])[0] && (task.steps[0].text || '').slice(0, 24);
ok('★ the first step\'s words are RENDERED on the board, not just saved',
   !!stepWords && dayText.includes(stepWords), stepWords || '(no step text at all)');
ok('and no step renders as an empty bullet',
   !/○\s*$/m.test(dayText), 'found a bullet with nothing after it');
await p.screenshot({ path: 'test/live/_ck-3-today.png' });

console.log('\n6 · Nothing was stored, so nothing can go stale\n');
const store = await save();
ok('★ there is no checklist in the save at all',
   !JSON.stringify(store).includes('"checklist"') && !JSON.stringify(store).includes('"ticks"'));
await p.removeScriptToEvaluateOnNewDocument(seed.identifier);
await p.reload({ waitUntil: 'networkidle2' });
await wait(1200);
/* A reload lands on the title screen again, and nothing in the game is running
   until this is pressed. Without it the panel never exists and the assertion
   below reads "no checklist" — which looks exactly like a checklist that
   forgot, and is really a suite that never started the game. */
await p.click('#startBtn');
await wait(1500);
await p.evaluate(() => window.openCourses());
await wait(500);
await clickText('Junior Electrical Engineer', '.card');
await wait(700);
await scrollTo('.modChecklist');
const afterReload = (await checklist() || []).join(' \n ');
ok('★ and after a reload the ticks are still right — recomputed, not remembered',
   /1 attempt kept/.test(afterReload) && /✓/.test(afterReload));

console.log('\n' + (errs.length ? '⚠ page errors: ' + errs.join(' | ') : 'no page errors'));
if (errs.length) failed++;
console.log(failed ? `\n✗ ${failed} failure(s)` : '\n✓ the checklist holds');
await b.close();
process.exit(failed ? 1 : 0);
