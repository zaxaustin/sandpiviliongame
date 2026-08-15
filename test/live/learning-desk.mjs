/* [THE LEARNING DESK] — the practice, actually worked.
   ======================================================================
   Slice 2A. The steward, 2026-08-14:

     "i would really like a study table that is designes for learning… where
      we are able to have our tasks and problems to be able to learn to the
      point we can do them with pen and paper outside of the game… The main
      goal of this is to help people align what they think they can do with
      what they can actually do."

   WHAT THIS DRIVES, by clicking, the way a hand does:

     walk into the Study            -> the desk is a real station you can
                                       stand in front of and press E at
     press E                        -> the Learning Desk opens
     a course's module              -> its Practice / Artifact / Reflection,
                                       read out of the module by moduleParts()
     ★ BEFORE TYPING                -> the AI buttons are ABSENT, not disabled
     type an attempt                -> they appear
     ★ ask for help                 -> the attempt is byte-identical after,
                                       and the reply is stamped as the model's
     keep it                        -> it is in data.courseWork, and survives
                                       a reload with its before/after
     "not yet"                      -> offers a way back, and MOVES NOTHING

   IT READS THE REAL COURSE FILE, courses/junior-electrical-engineer.course.md,
   for the same reason receive-course.mjs does: a module trimmed until it
   parsed would be testing the fixture. Rule 1 is about books and it is the
   same rule.

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
/* The suite is meaningless if the real course stopped asking for practice —
   a check that refuses to run against the wrong fixture is worth more than
   the check itself. */
if (!/^\*\*Practice:\*\*/m.test(COURSE_MD)) {
  console.error('The real course carries no **Practice:** label — this suite exists to prove that '
              + 'label is finally read by something, so it must not quietly pass without one.');
  process.exit(1);
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 1000 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
/* STANDING IN THE STUDY, one tile below the new desk. data.pos is restored on
   boot, so this is how a suite gets into a room without a movement script —
   and it means the FIRST screenshot is of the world, not of a panel. A desk
   that is only a menu entry is the Lab's bug wearing furniture. */
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, aiConnections: [], courses: [],
                   pos: { scene: 'study', x: 5, y: 4 } }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(1500);
const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}'));
const text = () => p.evaluate(() => (document.getElementById('learnPanel') || {}).textContent || '');

/* Bring an element into view before shooting it. ⚠ #learnPanel is NOT the
   scroller — the overlay above it is — so walk up and move whatever moves. The
   Pass 0 suite lost two screenshots to exactly this and did not notice, because
   an unscrolled shot looks like a perfectly good shot of the top. */
async function scrollTo(id) {
  await p.evaluate(sel => {
    const el = document.getElementById(sel) || document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'center' });
  }, id);
  await wait(350);
}

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

console.log('\n0 · The desk exists in the world, and pressing E opens it\n');

/* ★ STAND IN FRONT OF IT AND PRESS E. Not window.openLearningDesk() — "built
   and unreachable is the same as unbuilt", and a panel only a function call can
   open is exactly that. This is the Lab's bug, and the reason this block is
   first. The player boots at (5,4), one tile below the desk at (5,3). */
await p.screenshot({ path: 'test/live/_ld-5-study-room.png' });
ok('the game booted inside the Study',
   await p.evaluate(() => /Study/i.test(document.getElementById('hudPlace')?.textContent || '')
                       || /Study/i.test(document.body.innerText)));
await p.keyboard.down('ArrowUp'); await wait(80); await p.keyboard.up('ArrowUp');
await wait(400);
await p.keyboard.press('e');
await wait(600);
ok('★ pressing E while facing the desk opens it — no menu needed',
   await p.evaluate(() => { const o = document.getElementById('learnOv'); return !!o && o.className.includes('open'); }));
await p.keyboard.press('Escape');
await wait(400);

await p.keyboard.press('Escape');
await wait(600);
ok('★ the pause menu names the Learning Desk',
   await p.evaluate(() => /Learning Desk/i.test(document.body.innerText)));
ok('★ and pressing it opens the desk', await clickText('Learning Desk'));
await wait(400);
ok('the panel is really open',
   await p.evaluate(() => { const o = document.getElementById('learnOv'); return !!o && o.className.includes('open'); }));

console.log('\n1 · With no course, it says so rather than showing an empty page\n');
const bare = await text();
ok('it explains there is nothing to work yet', /no course to work yet/i.test(bare));
ok('and points at the Course Board', /Course Board/.test(bare));
ok('no blank textarea pretending to be ready',
   await p.evaluate(() => !document.getElementById('lwAttempt')));
await p.screenshot({ path: 'test/live/_ld-0-empty.png' });

console.log('\n2 · Bring the real course in, then come back\n');
await p.evaluate(() => window.openCourses());
await wait(400);
await clickText('Bring a course in');
await p.evaluate(md => { document.getElementById('rcText').value = md; }, COURSE_MD);
await clickText('Read it');
await wait(500);
await clickText('Pin it to the board');
await wait(600);

/* ★ THE DOOR FROM THE BOARD. A module you are reading offers to be worked. */
const boardText = await p.evaluate(() => (document.getElementById('coursePanel') || {}).textContent || '');
ok('★ the open module offers to be worked at the Learning Desk',
   /work it at the Learning Desk/.test(boardText));
ok('and pressing it lands on the desk', await clickText('work it at the Learning Desk'));
await wait(500);

console.log('\n3 · The module\'s own practice, read out of the module\n');
const t3 = await text();
ok('★ the practice is on screen', /The practice/.test(t3));
ok('★ and it is the REAL text, lifted from nothing',
   /In Falstad: create a battery/.test(t3), t3.slice(0, 0) || undefined);
ok('what you make is named too', /What you make/.test(t3));
ok('so is the honest reflection', /Afterwards, honestly/.test(t3));
ok('the module title is the course\'s own', /Charge, Field & Potential/.test(t3));

console.log('\n4 · ★ THE BLANK PAGE COMES FIRST\n');
const before = await p.evaluate(() => {
  const el = document.getElementById('learnPanel');
  const btns = [...el.querySelectorAll('button')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
  return { btns, box: !!document.getElementById('lwAttempt'),
           aids: (document.getElementById('lwAids') || {}).textContent || '' };
});
ok('the page to write on is there', before.box);
ok('★ "Another problem like this" is ABSENT, not disabled',
   !before.btns.some(t => /Another problem/i.test(t)), before.btns.filter(t => /problem|theory|wrote/i.test(t)).join(', ') || 'none');
ok('★ "Explain the theory" is absent too', !before.btns.some(t => /Explain the theory/i.test(t)));
ok('★ "Look at what I wrote" is absent too', !before.btns.some(t => /Look at what I wrote/i.test(t)));
ok('and it says why, rather than saying nothing', /Write something first/i.test(before.aids));
await p.screenshot({ path: 'test/live/_ld-1-blank.png' });

console.log('\n5 · The honor chips, and "not yet" is a door\n');
ok('the three words are offered before you start',
   /not yet/.test(t3) && /with my notes/.test(t3) && /on my own/.test(t3));
ok('skipping is said to be fine', /Optional\. Skip it/.test(t3));
/* ★ THREE WORDS, NEVER A NUMBER — the rule, checked as a property of the
   controls rather than as a word search. The first version of this looked for
   /score/ anywhere in the panel and failed on the desk's own promise, "Nothing
   here is marked or scored". A guard that trips on the sentence describing the
   fix is testing prose, not behaviour. */
const chips = await p.evaluate(() => [...document.querySelectorAll('#learnPanel button')]
  .map(b => b.textContent.trim())
  .filter(t => /not yet|with my notes|on my own/i.test(t)));
ok('the three honesty chips are there', chips.length === 3, chips.join(' | '));
ok('★ and not one of them carries a digit', chips.every(t => !/\d/.test(t)), chips.join(' | '));
ok('★ nothing rates the attempt out of anything',
   !/\bout of\b|\b\d+\s*\/\s*\d+\s*(points|marks)|\b\d+%/i.test(t3));

console.log('\n6 · Write something — and only then does help exist\n');
await p.evaluate(() => {
  const box = document.getElementById('lwAttempt');
  box.value = 'Charge is the stuff. Current is charge moving. Voltage is the push that moves it, '
            + 'and resistance is what the path does to fight back. I am not sure I have voltage right.';
  box.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(400);
const after = await p.evaluate(() => {
  const el = document.getElementById('learnPanel');
  return [...el.querySelectorAll('button')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
});
/* With aiConnections:[] there is nobody to ask, and the desk says so plainly
   instead of drawing three buttons onto nothing. Both halves are the rule. */
const aidsNow = await p.evaluate(() => (document.getElementById('lwAids') || {}).textContent || '');
ok('★ with no AI connected it says there is nobody to ask',
   /No AI is connected/.test(aidsNow), aidsNow.slice(0, 90));
ok('★ and says the rest of the desk is unaffected',
   /everything else on this desk works/i.test(aidsNow));
ok('the "write something first" notice is gone now', !/Write something first/i.test(aidsNow));
await scrollTo('lwAids');
await p.screenshot({ path: 'test/live/_ld-2-written.png' });

console.log('\n7 · Keep it — one press, and it is yours\n');
await p.evaluate(() => {
  const s = document.getElementById('lwStuck');
  s.value = 'Kept mixing up voltage and current until I drew the water analogy.';
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
/* ★ AND THEN PRESS A CHIP, WHICH REDRAWS THE WHOLE PANEL. This ordering is
   load-bearing: the first run of this suite found that the redraw silently
   threw the stuck line away. The attempt still saved, so nothing looked wrong
   — the sentence written for whoever comes next was simply gone. */
await clickText('with my notes');
await wait(300);
ok('★ "Keep this attempt" is a real button', await clickText('Keep this attempt'));
await wait(600);
const s7 = await save();
const work = s7.courseWork || {};
const courseId = Object.keys(work)[0];
const entries = courseId ? (work[courseId]['0'] || work[courseId][0] || []) : [];
ok('★ the attempt is in data.courseWork', entries.length === 1, entries.length + ' entry');
ok('it kept the words verbatim', !!entries[0] && /I am not sure I have voltage right/.test(entries[0].text));
ok('it kept what you said beforehand', !!entries[0] && entries[0].before === 'with-help', entries[0] && entries[0].before);
ok('★ it kept the line for whoever comes next',
   !!entries[0] && /water analogy/.test(entries[0].stuck || ''));
ok('and it is stamped with who wrote it', !!entries[0] && !!entries[0].by, entries[0] && entries[0].by);

console.log('\n8 · Then it asks the other half of the honest question\n');
const msg = await p.evaluate(() => (document.getElementById('lwMsg') || {}).textContent || '');
ok('★ it asks whether you actually could', /could you do it/i.test(msg), msg.slice(0, 80));
ok('answering is a press', await clickText('needed my notes'));
await wait(500);
const s8 = await save();
const e8 = (s8.courseWork[courseId]['0'] || s8.courseWork[courseId][0])[0];
ok('★ the afterwards is on the record beside the before', e8.after === 'with-help', e8.after);

console.log('\n9 · Looking back at it\n');
const t9 = await text();
ok('★ the attempt is listed to look back on', /What you have tried here/.test(t9));
ok('with both halves of the honest answer, in words',
   /you said: with my notes/.test(t9) && /afterwards: needed my notes/.test(t9));
ok('and the stuck line', /water analogy/.test(t9));
ok('no grade, no score, no percentage on it',
   !/\bgrade\b|\bscore\b|\b\d+%/i.test(t9.replace(/\d+ of \d+ modules/g, '')));
await p.screenshot({ path: 'test/live/_ld-3-record.png' });

console.log('\n10 · ★ Publishing a course carries none of it\n');
const packet = await p.evaluate(id => {
  try { return window.emitCourseFor ? window.emitCourseFor(id) : null; } catch (e) { return 'ERR ' + e.message; }
}, Number(courseId));
if (packet == null) {
  console.log('  ·    (no direct emitter on window — checked through the save shape instead)');
  ok('★ courseWork is a store of its own, not a field on the course',
     !JSON.stringify(s8.courses).includes('water analogy'));
} else {
  ok('★ the emitted packet carries no attempt', !String(packet).includes('water analogy'));
}

console.log('\n11 · "not yet" offers a way back and MOVES NOTHING\n');
await p.evaluate(() => window.learnPickModule(1));
await wait(400);
await clickText('not yet');
await wait(300);
await p.evaluate(() => {
  const box = document.getElementById('lwAttempt');
  box.value = 'x'; box.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(350);
const t11 = await text();
const doneBefore = (await save()).courses.find(c => c.id === Number(courseId)).steps.filter(s => s.done).length;
ok('★ it offers the way back rather than shrugging', /here is the way back/i.test(t11));
ok('and names the previous module', /Back to "Module 1/.test(t11));
const doneAfter = (await save()).courses.find(c => c.id === Number(courseId)).steps.filter(s => s.done).length;
ok('★ it un-ticked nothing', doneBefore === doneAfter, doneBefore + ' -> ' + doneAfter);
ok('and it did not move you', /Module 2/.test(t11));

console.log('\n12 · The book tab came with the desk\n');
ok('★ "A book" is a tab here now', await clickText('A book'));
await wait(500);
const t12 = await text();
ok('the study table drew itself into the desk', t12.length > 40 && !/no course to work/i.test(t12));
await p.screenshot({ path: 'test/live/_ld-4-book-tab.png' });

console.log('\n13 · And it is no longer inside the Writing Desk\n');
await p.evaluate(() => window.openPlanner());
await wait(600);
const plan = await p.evaluate(() => {
  const el = document.getElementById('planToolbox');
  return el ? el.textContent.replace(/\s+/g, ' ') : '';
});
ok('★ the Writing Desk no longer offers "Work through a book"',
   !/Work through a book/i.test(plan), plan.slice(0, 140));
ok('and its other tools are untouched',
   /Rhythm blocks/.test(plan) && /Sparks/.test(plan) && /Past days/.test(plan));

console.log('\n14 · Looking back across the whole course\n');
/* ⚠ COME BACK TO THE DESK FIRST. Section 13 walked to the Writing Desk, and
   rendering the learning panel while its overlay is closed fills a hidden
   element — clickText correctly finds nothing, while textContent reads full.
   Three checks failed and one threw before this line existed. */
await p.evaluate(() => window.openLearningDesk());
await wait(500);
/* And back to the course tab — section 12 left it on the book, and
   openLearningDesk() deliberately does not reset which tab you were on. */
await p.evaluate(() => window.learnTab('course'));
await wait(400);
await p.evaluate(() => window.learnPickModule(0));
await wait(400);
const t14a = await text();
ok('★ the header offers "your work on this course", with a count',
   /your work on this course\s*\(\s*1\s*\)/.test(t14a.replace(/\s+/g, ' ')), t14a.slice(0, 0) || undefined);
ok('and pressing it opens the look-back view', await clickText('your work on this course'));
await wait(450);
const t14 = await text();
ok('★ it lists the attempt', /Your work on this course/.test(t14) && /water analogy/.test(t14));
ok('with the date and both honest answers',
   /2026|20\d\d-\d\d-\d\d/.test(t14) && /you said:/.test(t14) && /afterwards:/.test(t14));
ok('and a way back to the work', /Back to the work/.test(t14));
await p.screenshot({ path: 'test/live/_ld-6-lookback.png' });
await clickText('Back to the work');
await wait(400);

console.log('\n15 · One more module — the prompt, with no model at all\n');
ok('★ the desk offers to ask for one more module', await clickText('Ask for one more module'));
await wait(400);
const t15 = await text();
ok('it says what it will tell the model about you',
   /which of your own books touch this/.test(t15) && /getting stuck/.test(t15));
ok('★ with no AI connected there is no "ask the model here" button',
   !/Ask the model here/.test(t15));
ok('★ but "Copy the prompt" is still there — the laptop keeps the feature',
   /Copy the prompt/.test(t15));
await p.evaluate(() => { document.getElementById('lxAbout').value = 'karma'; });
/* Clipboard is not grantable in headless; the press still stores the prompt so
   the panel can show it, and that is what is asserted. */
await clickText('Copy the prompt');
await wait(500);
const prompt = await p.evaluate(() => {
  const t = [...document.querySelectorAll('#lxBody textarea')].map(x => x.value);
  return t.join('\n---\n');
});
ok('★ the prompt asks for ONE module and says so', /ONE more module/.test(prompt));
ok('it lists the modules that already exist', /1\. Module 1 — Charge/.test(prompt));
ok('★ it carries what I wrote about getting stuck, in my own words',
   /water analogy/.test(prompt), prompt.split('\n').find(l => /water/.test(l)) || 'absent');
ok('and the subject I typed', /karma/.test(prompt));
ok('it forbids inventing a reading list it cannot check',
   /do not invent a reading list/i.test(prompt) || !/BOOKS ALREADY ON MY SHELF/.test(prompt));

console.log('\n16 · A module pasted back in lands as a DRAFT, not on the course\n');
const MODULE = ['## Module 10 — What Karma Actually Claims', '',
  '**Objective:** Say what the word means in its own tradition before arguing with it.', '',
  '**Body:** Karma is not cosmic bookkeeping. It is a claim about intention and consequence.',
  'Read it in the source before reading it in a summary.', '',
  '**Practice:** Write the claim in one sentence, then find one passage that contradicts your sentence.', '',
  '**Reflection:** Where did your own version come from?', '',
  '**Artifact:** A one-page report on what the text actually says.'].join('\n');
const stepsBefore = (await save()).courses.find(c => c.id === Number(courseId)).steps.length;
await p.evaluate(m => {
  const box = document.getElementById('lxPaste');
  box.value = m; box.dispatchEvent(new Event('input', { bubbles: true }));
}, MODULE);
await wait(450);
const t16 = await text();
ok('the draft is previewed with its title', /What Karma Actually Claims/.test(t16));
ok('★ and it says plainly that nothing is on your course yet',
   /nothing is on your course until you press/i.test(t16));
const stepsMid = (await save()).courses.find(c => c.id === Number(courseId)).steps.length;
ok('★ NOTHING WAS ADDED by previewing it', stepsMid === stepsBefore, stepsBefore + ' -> ' + stepsMid);
await scrollTo('lxBody');
await p.screenshot({ path: 'test/live/_ld-7-one-more-module.png' });

ok('★ "Add it to the course" is a real button', await clickText('Add it to the course'));
await wait(600);
const after16 = (await save()).courses.find(c => c.id === Number(courseId));
ok('★ ONE PRESS added exactly one module', after16.steps.length === stepsBefore + 1,
   stepsBefore + ' -> ' + after16.steps.length);
ok('and it is the one that was drafted',
   /What Karma Actually Claims/.test(after16.steps[after16.steps.length - 1].title));
ok('with its body intact, not flattened',
   /cosmic bookkeeping/.test(after16.steps[after16.steps.length - 1].body));

console.log('\n17 · The folder — absent in a browser, and honest about it\n');
const t17 = await text();
ok('the desk offers the course as files', /This course as files on your disk/.test(t17));
await clickText('This course as files on your disk');
await wait(350);
const t17b = await text();
ok('★ in a browser it does NOT offer a folder', !/Save this course to its folder/.test(t17b));
ok('★ it offers the single file instead', /Save the course as one file/.test(t17b));
ok('and says why, rather than failing quietly',
   /a browser has nowhere on your disk/i.test(t17b));
await scrollTo('lfMsg');
await p.screenshot({ path: 'test/live/_ld-8-folder.png' });

ok('no page errors anywhere in the run', errs.length === 0, errs.join(' | '));
console.log(failed ? `\n✗ learning-desk: ${failed} failure(s)\n` : '\n✓ learning-desk: all checks passed\n');
await b.close();
process.exit(failed ? 1 : 0);
