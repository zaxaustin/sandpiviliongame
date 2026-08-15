/* [RECEIVE A COURSE] — the steward's own course lands on the Board.
   ======================================================================
   Phase A of plans/RICH-COURSE-IMPORT-AND-AUTHORING-PATHWAY.md, and the
   acceptance gate for it. The verdict that started the work was:

     "the current state of the course logs and the courses that we have
      are not acceptable"

   and the reason turned out to be narrower and worse than "thin": the two
   courses he had actually written could not enter the Pavilion at all.
   Measured 2026-08-14, parseCourse() on his real frontmatter returned
   ok:false — `prerequisites:` is a YAML block list and the frontmatter
   reader rejected every bullet.

   SO THIS SUITE READS THE REAL FILE. Not a fixture written to pass:
   courses/junior-electrical-engineer.course.md, the same bytes the steward
   wrote, the same file the app would be handed. CLAUDE.md rule 1 is about
   books and it is the same rule — the tidy version is the one that lies,
   and a fixture trimmed until it imports would have hidden all three of
   the defects this exists to prove are gone.

   What it drives, end to end and through the real surfaces:

     open the Course Board
       -> Receive a Course
       -> paste the real 17 KB document into the real textarea
       -> press Read it   (nothing is saved yet — that is asserted)
       -> the preview names the modules and reads "full course"
       -> press Pin it to the board   (ONE press)
       -> the course is on the board
       -> Module 1 shows REAL PARAGRAPHS with bold labels
       -> a thin checklist beside it still renders exactly as before

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

/* THE REAL FILE. If this ever stops being the real file, the suite is
   testing itself. */
const COURSE_PATH = 'courses/junior-electrical-engineer.course.md';
const COURSE_MD = readFileSync(COURSE_PATH, 'utf8');
const MODULES = (COURSE_MD.match(/^## /gm) || []).length;
if (MODULES < 5) { console.error('The fixture is not the real course — only ' + MODULES + ' sections.'); process.exit(1); }
if (!/^prerequisites:\s*$/m.test(COURSE_MD)) {
  console.error('The real course no longer carries a block-list `prerequisites:` — this suite '
              + 'exists to prove that shape imports, so it must not quietly stop testing it.');
  process.exit(1);
}

/* A thin checklist, pinned before the import, so "existing courses are
   untouched" is a thing this run actually observes rather than assumes. */
const THIN = {
  id: 111, title: 'Morning sit', why: 'Ten minutes, most days', category: 'practice', due: null,
  steps: [{ title: 'Sit ten minutes', practice: 'breath counting', url: '', done: false },
          { title: 'Write one line about it', practice: '', url: '', done: false }],
  begun: '2026-08-01', archived: false,
};

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 1000 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, aiConnections: [], courses: [THIN] }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));
const wait = ms => new Promise(r => setTimeout(r, ms));
const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}'));

/* Click by VISIBLE TEXT, the way a hand does. Every check below that a
   person could REACH something goes through this rather than window.*,
   because calling a handler proves the function works and says nothing
   about whether anything on screen is wired to it. "Built and unreachable
   is the same as unbuilt" — the Lab, and the reason this helper exists:
   on 2026-08-14 the title-tidying path passed every assertion in this file
   while hanging off the Caravan Desk and nothing else. */
async function clickText(text, sel) {
  /* BUTTONS FIRST, then the wider net. querySelectorAll returns DOCUMENT
     order, not selector order, so a `.card` that merely NAMES a button wins
     over the button itself — which is exactly what happened the moment the
     guidance block started saying the words "Receive a course" out loud. A
     person reading the screen clicks the button; so does this. */
  const hit = await p.evaluate((t, s) => {
    const pick = q => [...document.querySelectorAll(q)]
      .find(e => e.offsetParent !== null && e.textContent.replace(/\s+/g, ' ').includes(t));
    const el = (s ? pick(s) : (pick('button, .btn') || pick('.card, label')));
    if (!el) return false;
    el.click(); return true;
  }, text, sel || '');
  await new Promise(r => setTimeout(r, 450));
  return hit;
}

console.log('\n0 · Can a hand get here at all? (clicks, never window.*)\n');
await p.keyboard.press('Escape');
await wait(600);
ok('★ the pause menu names the Course Board',
   await p.evaluate(() => /Course Board/i.test(document.body.innerText)));
ok('★ and clicking it opens the board', await clickText('Course Board'));
/* The door is one of three cards now, not a button in a row of five. Its
   label is what a person reads, so that is what this looks for. */
ok('★ "Bring a course in" is a real pressable door on the board',
   await p.evaluate(() => [...document.querySelectorAll('button')]
     .some(b => b.offsetParent !== null && /Bring a course in/i.test(b.textContent))));

console.log('\n1 · The board, before anything arrives\n');
await p.evaluate(() => window.openCourses());
await wait(400);
const before = await p.evaluate(() => {
  const el = document.getElementById('coursePanel');
  return { text: el ? el.textContent : '' };
});
ok('the Course Board offers all three doors',
   /Bring a course in/.test(before.text) && /Draft a high-standard one/.test(before.text)
   && /high-standard" means/.test(before.text));
ok('the thin checklist is on it, labelled personal tracking',
   /Morning sit/.test(before.text) && /personal tracking/.test(before.text));
ok('and it is NOT labelled a full course', !/Morning sit[\s\S]{0,120}full course/.test(before.text));

console.log('\n2 · Paste the real ' + Math.round(COURSE_MD.length / 1024) + ' KB file — and nothing is saved yet\n');
ok('the paste step opens by pressing its card', await clickText('Bring a course in'));
const hasBox = await p.evaluate(() => !!document.getElementById('rcText'));
ok('the Receive panel is open with a paste box', hasBox);
await p.evaluate(md => { document.getElementById('rcText').value = md; }, COURSE_MD);
ok('and "Read it" is a real button', await clickText('Read it'));
await wait(450);

const preview = await p.evaluate(() => {
  const el = document.getElementById('coursePanel');
  const pv = document.getElementById('rcPreview');
  const pr = document.getElementById('rcProblems');
  return { panel: el ? el.textContent : '', preview: pv ? pv.textContent : '', problems: pr ? pr.textContent : '' };
});
ok('★ THE REAL FILE PARSES — no problems reported', !preview.problems,
   preview.problems ? preview.problems.slice(0, 200) : 'clean');
ok('the preview names every module', new RegExp(MODULES + ' modules').test(preview.preview),
   'expected ' + MODULES);
ok('★ the preview reads "full course", not personal tracking',
   /full course/.test(preview.preview) && !/personal tracking/.test(preview.preview));
ok('the title carries no stray quote marks',
   /Junior Electrical Engineer Path/.test(preview.preview)
   && !/"Junior Electrical Engineer/.test(preview.preview));
const midway = await save();
ok('★ NOTHING IS ON THE BOARD YET — the preview wrote nothing',
   (midway.courses || []).length === 1, (midway.courses || []).length + ' course(s) saved');

console.log('\n3 · One press\n');
ok('★ "Pin it to the board" is a real button', await clickText('Pin it to the board'));
await wait(500);
const after = await save();
const landed = (after.courses || []).find(c => /Junior Electrical/.test(c.title));
ok('★ ONE PRESS PUT IT ON THE BOARD', !!landed);
ok('with every module', landed && landed.steps.length === MODULES,
   landed ? landed.steps.length + ' of ' + MODULES : '—');
ok('the module bodies are real text, not a flattened line',
   !!landed && landed.steps[0].body.length > 400, landed ? landed.steps[0].body.length + ' chars' : '—');
ok('the opening intention was kept, not discarded',
   !!landed && (landed.intro || '').length > 300, landed ? (landed.intro || '').length + ' chars' : '—');
ok('`category: "Skill"` landed on the board\'s own Skill category',
   !!landed && landed.category === 'skill', landed && landed.category);
ok('purpose, outcome and prerequisites are fields, not lost text',
   !!landed && !!landed.purpose && !!landed.outcome && (landed.prerequisites || []).length === 3);
ok('the claim is recorded as high, and it is a claim not a verdict',
   !!landed && landed.standard === 'high');
ok('the thin checklist is untouched beside it',
   (after.courses || []).some(c => c.id === 111 && c.steps.length === 2 && !c.steps[0].body));

console.log('\n4 · LOOK AT IT — Module 1 on screen\n');
const shown = await p.evaluate(() => {
  const ov = document.getElementById('courseOv');
  const el = document.getElementById('coursePanel');
  const intro = document.getElementById('courseIntro');
  const bodies = [...el.querySelectorAll('.stepBody')];
  return {
    open: !!ov && ov.className.includes('open'),
    text: el ? el.textContent : '',
    introShown: !!intro && !!intro.textContent.trim(),
    bodyCount: bodies.length,
    bolds: el.querySelectorAll('.stepBody b').length,
    paras: el.querySelectorAll('.stepBody p').length,
    rawStars: /\*\*/.test(el.textContent || ''),
  };
});
ok('the course panel is OPEN, not merely rendered', shown.open);
ok('★ "Electricity begins with charge" is ON SCREEN',
   /Electricity begins with charge/.test(shown.text));
ok('★ the opening intention is VISIBLE, not just stored', shown.introShown);
/* ONE module open, not nine. This assertion was inverted by the lightness
   pass and that is the point of the pass: nine modules of real prose all
   expanded is a document, not a course you are walking. */
ok('★ exactly ONE module is open, not all of them', shown.bodyCount === 1, shown.bodyCount + ' of ' + MODULES);
ok('and that one is paragraphs, not a run-on block', shown.paras > 3, shown.paras + ' <p>');
ok('★ **Objective:** rendered BOLD rather than as asterisks',
   shown.bolds > 5 && !shown.rawStars, shown.bolds + ' bold labels');
/* On a course you have never opened, About-this-course arrives OPEN — the
   opening intention is required piece 1 and must not be hidden the one time
   the person has not read it. */
ok('★ on first sight, the course explains itself', /What you end with/.test(shown.text));
ok('including what you need before starting', /Before you start/.test(shown.text));
await p.screenshot({ path: 'test/live/_receive-open.png' });

/* THE FOLD, and it exists because of what the first screenshot showed rather
   than because of anything a check said. The intention is 1,752 characters —
   a whole screen — so Module 1 was below the fold on every open. It must be
   VISIBLE on arrival (required piece 1 of the standard) and it must be
   possible to put away once you are working. Both, or one of them is a lie. */
const fold = await p.evaluate(() => {
  const el = document.getElementById('coursePanel');
  const openTop = el.querySelectorAll('.step')[0].offsetTop;
  window.toggleCourseIntro();
  const el2 = document.getElementById('coursePanel');
  const shutTop = el2.querySelectorAll('.step')[0].offsetTop;
  const introText = (document.getElementById('courseIntro') || {}).textContent || '';
  return { openTop, shutTop, stillThere: /About this course/.test(introText),
           proseGone: !/Electricity/.test(introText) && !/three modes of thinking/.test(introText) };
});
ok('the intention can be folded away once you are working', fold.shutTop < fold.openTop,
   'module 1 rises from ' + fold.openTop + 'px to ' + fold.shutTop + 'px');
ok('folded, it is still named — nothing vanishes silently', fold.stillThere && fold.proseGone);
await p.evaluate(() => window.toggleCourseIntro());
await wait(200);

/* And now LOOK at the module itself, which is the whole point of the day. */
await p.evaluate(() => document.getElementById('coursePanel').querySelectorAll('.step')[0]
  .scrollIntoView({ block: 'start' }));
await wait(350);
await p.screenshot({ path: 'test/live/_receive-module-1.png' });
console.log('  → test/live/_receive-open.png  (the course as it opens)');
console.log('  → test/live/_receive-module-1.png  (Module 1 itself)');

/* THE BOARD ITSELF — the two modes side by side, which is where a person
   actually compares them and therefore where "loud" has to be true. */
await p.evaluate(() => window.backToList());
await wait(350);
const board = await p.evaluate(() => {
  const el = document.getElementById('coursePanel');
  /* The guidance block is itself a .card, so it must be excluded or "how many
     courses are on the board" counts the explanation as a course. */
  const cards = [...el.querySelectorAll('.card')]
    .filter(c => c.id !== 'courseGuide')
    .map(c => c.textContent.replace(/\s+/g, ' ').trim());
  return { cards };
});
ok('both courses are on one board', board.cards.length === 2, board.cards.length + ' cards');
ok('the received course says full course, in modules',
   board.cards.some(c => /Junior Electrical/.test(c) && /full course/.test(c) && /modules/.test(c)));
ok('the checklist says personal tracking, in steps',
   board.cards.some(c => /Morning sit/.test(c) && /personal tracking/.test(c) && /steps/.test(c)));
await p.screenshot({ path: 'test/live/_receive-board.png' });
console.log('  → test/live/_receive-board.png  (the two modes side by side)');

console.log('\n5 · The on-ramp — the Board explains itself, and the prompt gets built\n');
await p.evaluate(() => window.openCourses());
await wait(400);
const guide = await p.evaluate(() => {
  const g = document.getElementById('courseGuide');
  return g ? g.textContent.replace(/\s+/g, ' ') : '';
});
/* Three separate assertions. One regex over the block would pass with two of
   the three steps deleted, which is the whole failure mode "no hidden menus,
   no figure-it-out-from-a-placeholder" is aimed at. */
ok('★ ① the Board says how to bring a course in', /Bring a course in/.test(guide));
ok('★ ② and how to draft a high-standard one', /Draft a high-standard one/.test(guide));
ok('★ ③ and what makes it high-standard', /high-standard" means/.test(guide));
/* THE FULL SENTENCES LIVE ON THE CARDS. A board that already has courses gets
   the compact row — three buttons, the sentence in a tooltip — because a
   person there has already found the way in. The cards are what a newcomer
   meets, so that is where "you can also drop it at the book table" has to be
   readable, and this looks at them rather than at the row. */
const cardsGuide = await p.evaluate(() => {
  window.openReceiveCourse();           // its default step renders the cards
  const g = document.getElementById('courseGuide');
  return g ? g.textContent.replace(/\s+/g, ' ') : '';
});
ok('the book table is named as a door, on the cards', /book table/.test(cardsGuide));
ok('each card carries one short sentence, not a paragraph',
   cardsGuide.length < 320, cardsGuide.length + ' chars across all three');
await p.evaluate(() => window.openCourses());
await wait(350);

ok('the standard note opens', await clickText('high-standard" means', 'button'));
/* Normalised, because the panel's text is wrapped across source lines and a
   phrase like "not checked by anything yet" arrives with a newline and ten
   spaces in the middle of it. */
const std = await p.evaluate(() => document.getElementById('coursePanel').textContent.replace(/\s+/g, ' '));
ok('it lists all seven pieces', ['Opening intention', 'Baseline', 'Theoretical minimum',
   'daily commitment', 'Structured modules', 'final gate', 'Transmission'].every(s => std.includes(s)));
/* Rule 6 on the screen, not in a comment. */
ok('★ and says plainly which four it does NOT check',
   /not checked by anything yet/.test(std) && /sticker, not a standard/.test(std));

ok('back to receiving', await clickText('← Back', 'button'));
/* Back lands on the three cards, not on a form — one thing at a time. So the
   draft step has to be chosen, and that is the behaviour, not a detour. */
ok('★ choosing Draft shows the questions', await clickText('Draft a high-standard one', 'button'));
const onlyDraft = await p.evaluate(() => ({
  fields: document.querySelectorAll('#rcDraft input').length,
  paste: !!document.getElementById('rcText'),
  starters: !!document.getElementById('rcStarters'),
}));
ok('★ and ONLY the questions — no paste box, no starter shelf',
   onlyDraft.fields === 5 && !onlyDraft.paste && !onlyDraft.starters, JSON.stringify(onlyDraft));
await p.evaluate(() => {
  document.getElementById('rcGoal').value = 'Build a motor that also generates';
  document.getElementById('rcB_done').value = 'Nothing formal — I changed a car battery once';
  document.getElementById('rcB_without').value = 'Volts and amps are different, and not much past that';
  document.getElementById('rcB_stuck').value = 'The maths, about three videos in';
  document.getElementById('rcB_hand').value = 'A breadboard, a multimeter, an hour most evenings';
});
ok('the prompt can be shown without a clipboard', await clickText('Show it', 'button'));
const built = await p.evaluate(() => (document.getElementById('rcPromptOut') || {}).value || '');
ok('★ the prompt carries the goal', /Build a motor that also generates/.test(built));
ok('★ and all four baseline answers, so the model drafts for THIS person',
   ['car battery', 'Volts and amps', 'three videos', 'breadboard'].every(s => built.includes(s)),
   built.split('\n').length + ' lines');
ok('it tells the model to write the baseline into the frontmatter', /baseline:/.test(built));
ok('it forbids a thin checklist', /[Dd]o not produce a thin checklist/.test(built));
await p.screenshot({ path: 'test/live/_receive-onramp.png' });
console.log('  → test/live/_receive-onramp.png  (the prompt builder)');

console.log('\n6 · The starter shelf — read one before you write one\n');
/* It lives under the paste box: both are ways of getting a course IN, so they
   share a screen. It was briefly its own step with no door to it at all —
   built and unreachable, caught here. */
ok('the starter shelf is reachable from "Bring a course in"',
   await clickText('← Other ways in', 'button') && await clickText('Bring a course in', 'button'));
const starters = await p.evaluate(() =>
  [...document.querySelectorAll('#rcStarters .card')].map(c => c.textContent.replace(/\s+/g, ' ')));
ok('★ real courses are listed to start from', starters.length >= 2, starters.length + ' listed');
ok('each says how many modules and its standing',
   starters.every(s => /\d+ modules/.test(s) && /(full course|personal tracking)/.test(s)));
const beforeStarter = (await save()).courses.length;
ok('clicking one loads it', await clickText('Theoretical Minimum', '#rcStarters .card'));
await wait(400);
ok('★ but pins NOTHING until you press', (await save()).courses.length === beforeStarter);
/* ★ MOVING BETWEEN STEPS MUST NOT LOSE WHAT YOU TYPED. One-thing-at-a-time is
   only bearable if stepping away and back is free — otherwise the person is
   punished for exploring, which is the opposite of the point. The answers live
   in state.courseView, so they survive a screen that does not show them. */
ok('★ stepping away and back does not lose what I typed',
   await clickText('← Other ways in', 'button')
   && await clickText('Draft a high-standard one', 'button')
   && await p.evaluate(() => (document.getElementById('rcB_hand') || {}).value
        === 'A breadboard, a multimeter, an hour most evenings'));
/* …and back to the loaded starter, so the press that follows is the real one. */
await clickText('← Other ways in', 'button');
await clickText('Bring a course in', 'button');
ok('one press pins it', await clickText('Pin it to the board', 'button'));
await wait(400);
ok('exactly one arrived', (await save()).courses.length === beforeStarter + 1);

console.log('\n7 · ★ THE SECOND DOOR — the book table takes a course too\n');
/* TWO BOOK-TABLE SURFACES, and they are not the same panel — worth being
   exact about, because the first version of this test opened the wrong one.
   `Bring a book in` (openBookIntake) is the visitor's, and its method is
   "drop it anywhere on the window". The Caravan Desk (openReviewQueue) owns
   the dedicated #dropZone and the file picker. Both must name courses; both
   go through intakeBookFiles(). */
await p.evaluate(() => { window.closeUI(); window.openBookIntake(); });
await wait(500);
ok('★ the visitor intake panel says a course works here too',
   await p.evaluate(() => /course\.md/.test(document.body.innerText)));
await p.evaluate(() => { window.closeUI(); window.openReviewQueue(); window.newReviewManualForm(); });
await wait(600);
ok('the book table (Caravan Desk) drop zone is open', await p.evaluate(() => !!document.getElementById('dropZone')));
ok('its copy says a course works here',
   await p.evaluate(() => /course\.md/.test(document.getElementById('dropZone').textContent)));
ok('its file picker no longer filters courses out',
   await p.evaluate(() => (document.getElementById('bulkFilePick') || {}).accept === '.txt,.epub,.md,.markdown'));
/* Dropped on the BOOK TABLE'S OWN ZONE, not the window — the window path
   already worked and is not what the steward asked for. */
/* ⚠ VISIBLE, not merely present. getElementById finds HIDDEN elements, and
   closeUI() only hides an overlay — #coursePanel keeps its innerHTML, so
   `!!document.getElementById('rcText')` stays true forever once the Receive
   panel has been opened once. The first version of this check was therefore
   a FALSE POSITIVE waiting to happen: it would have reported the book table
   opening the receiver even with the branch deleted. Caught because the
   .txt case immediately after it failed for the same reason. Same family as
   this suite's older lesson — read the panel, not document.body. */
const atTable = await p.evaluate(async md => {
  const seen = el => !!el && el.offsetParent !== null;
  const f = new File([md], 'from-the-book-table.course.md', { type: 'text/markdown' });
  const dt = new DataTransfer(); dt.items.add(f);
  document.getElementById('dropZone').dispatchEvent(
    new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  await new Promise(r => setTimeout(r, 900));
  const box = document.getElementById('rcText');
  return { opened: seen(box), prefilled: seen(box) ? box.value.slice(0, 60) : '' };
}, COURSE_MD);
ok('★ dropping a .course.md ON THE BOOK TABLE opens the course receiver', atTable.opened);
ok('and it arrives pre-filled, not empty', /Junior Electrical/.test(atTable.prefilled));
/* The book path must survive the new branch sitting in front of it. */
await p.evaluate(() => { window.closeUI(); window.openReviewQueue(); window.newReviewManualForm(); });
await wait(500);
const bookStill = await p.evaluate(async () => {
  const seen = el => !!el && el.offsetParent !== null;
  const f = new File(['Title: A Real Book\n\nCall me Ishmael.'], 'whale.txt', { type: 'text/plain' });
  const dt = new DataTransfer(); dt.items.add(f);
  document.getElementById('dropZone').dispatchEvent(
    new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  await new Promise(r => setTimeout(r, 900));
  return { course: seen(document.getElementById('rcText')),
           form: (document.getElementById('rmTitle') || {}).value || '' };
});
ok('★ and a .txt at the same table STILL becomes a book', !bookStill.course && /A Real Book/.test(bookStill.form),
   JSON.stringify(bookStill));

console.log('\n8 · Break it on purpose\n');
/* Garbage must say which line, not fail silently (rule 5) and not pretend
   to know more than it does (rule 6). */
await p.evaluate(() => window.openReceiveCourse('not a course at all, just a sentence'));
await wait(400);
const junk = await p.evaluate(() => {
  const pr = document.getElementById('rcProblems');
  return { problems: pr ? pr.textContent : '', preview: !!document.getElementById('rcPreview') };
});
ok('a file that is not a course says so in sentences', /No steps/.test(junk.problems));
ok('and offers nothing to press', !junk.preview);

/* A book dropped as .txt must still shelve as a book — the new .md branch
   sits in front of the book intake and must not have eaten it. */
const beforeTxt = (await save()).courses.length;
const bookRoute = await p.evaluate(async () => {
  const f = new File(['Call me Ishmael.'], 'whale.txt', { type: 'text/plain' });
  const dt = new DataTransfer(); dt.items.add(f);
  document.dispatchEvent(Object.assign(new Event('drop', { bubbles: true }), { dataTransfer: dt }));
  await new Promise(r => setTimeout(r, 700));
  return true;
});
ok('dropping a .txt on the window still shelves it, and pins no course',
   (await save()).courses.length === beforeTxt, 'was ' + beforeTxt);

ok('no page errors anywhere in the run', errs.length === 0, errs.join(' | ').slice(0, 300));
await b.close();
console.log('\n' + (failed ? '✗ ' + failed + ' failure(s)' : '✓ receive-course: all checks passed') + '\n');
process.exit(failed ? 1 : 0);
