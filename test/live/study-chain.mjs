/* ================================================================
   [THE STUDY CHAIN] — the guard for the joints, not the rooms.

   THE-STUDY-CHAIN-PLAN.md, built 2026-08-03. The diagnosis it came
   from is the thing this file exists to keep true:

     Everything in the Pavilion PRODUCES something. Almost nothing
     that gets produced can become the INPUT to the next thing.

   The rooms all worked. What did not exist was:

     a note  →  a lesson in the tree      (a plan died as text)
     a lesson →  a path you are WALKING   (nothing was ever "the one")
     a book  →  an analysis you keep      (every pass evaporated)

   Every one of those is a link between two panels, which is exactly
   the kind of thing a unit test cannot see and a person notices in
   ninety seconds. Hence a live one.

   And note what is checked: not that a panel OPENS. On 2026-08-02 I
   tested that the Lab opened and that the lift moved you, both passed,
   and both features were broken — because neither test tried to LEAVE
   the panel or look at the floor. So every check below follows the
   artifact through to the far side and reads it back off the save.

     npm run build:beta
     npm run preview            # another terminal
     node test/live/study-chain.mjs

   Exit code 0 = the chain holds end to end.
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/* A plan in the shape a local model actually writes one. */
const PLAN = [
  'Goal: Be able to solder a joint that holds.',
  '',
  'Session 1 (30 min): Read chapter 2 and name the parts of a joint.',
  'Hands-on: find a cold joint in a photo and say why it is cold.',
  '',
  'Session 2 (45 min): Tin the tip and make three joints on scrap wire.',
  'Hands-on: tug each one hard.',
  '',
  'Session 3 (30 min): Desolder the worst of the three and redo it.',
].join('\n');

const save = {
  seenWelcome: true, aiConnections: [],
  notes: [{ id: 'n-1', title: 'Lesson plan — Soldering', body: PLAN, created: '2026-08-03', updated: '2026-08-03' }],
  /* Two of the visitor's own notes and one the AI wrote. The AI one must NOT
     be pulled into a dissection: a dissection is meant to be yours, and folding
     the model's own output back in as evidence is how an analysis quietly
     becomes a hall of mirrors. */
  bookNotes: {
    dhammapada: [
      { ts: '2026-08-01', page: 11, text: 'He keeps returning to the mind as the thing that makes the world.' },
      { ts: '2026-08-02', page: 24, text: 'The chapter on the fool reads harsher than the rest.' },
      { ts: '2026-08-02', text: '✨ Overall impression (AI)\nsomething the model wrote' },
    ],
  },
  read: {}, curriculum: {}, myLessons: [], paths: [], ideas: [], planner: {}, personalLibrary: [],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1100, height: 950 } });
const p = await browser.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(save));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn'); await new Promise(r => setTimeout(r, 1400));

const wait = ms => new Promise(r => setTimeout(r, ms));
const data = () => p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2')));
const press = label => p.evaluate(re => {
  const b = [...document.querySelectorAll('button')].find(x => new RegExp(re).test(x.textContent || ''));
  if (!b) return false; b.click(); return true;
}, label);
const R = [];

/* ---------- LINK 1: a note becomes a lesson you can walk ---------- */
await p.evaluate(() => window.openNotesLog()); await wait(400);
await p.evaluate(() => {
  const c = [...document.querySelectorAll('#notesLogList .card')].find(x => /Lesson plan/.test(x.textContent || ''));
  if (c) c.click();
}); await wait(350);

/* The door has to be on the CARD. It was one level down inside the editor,
   behind a button labelled "Open to edit / link a book", and nobody would ever
   have found it there. */
R.push(['the way into the tree is on the note card itself', await press('Put this in the tree')]);
await wait(600);

const d1 = await data();
const node = (d1.myLessons || [])[0];
R.push(['the note became a real lesson node', !!node && node.mine === true]);
R.push(['it kept the note\'s title, without the drafting prefix', !!node && node.title === 'Soldering']);
R.push(['the goal line became the summary, not a step',
  !!node && /solder a joint that holds/.test(node.summary || '') && !/^Goal/i.test(node.steps[0].title)]);
R.push(['the three sessions became three walkable steps', !!node && node.steps.length === 3]);
R.push(['a step opens with the instruction, not a stranded "(30 min)"',
  !!node && /^Read chapter 2/.test(node.steps[0].title) && /30 min/.test(node.steps[0].title)]);
R.push(['the hands-on line under a session survived as the step body',
  !!node && /tug each one/i.test(node.steps[1].body || '')]);
R.push(['the note remembers what it became', d1.notes[0].lesson === node.id]);
R.push(['you land ON the new lesson, not on a list',
  await p.evaluate(() => document.getElementById('treeOv').classList.contains('open')
    && /Soldering/.test(document.querySelector('#treePanel h2')?.textContent || ''))]);

/* Pressing it twice must not mint a second lesson — the round trip goes back
   to the one that already exists. */
await p.evaluate(() => window.openNotesLog()); await wait(400);
/* The card TOGGLES, and the expanded key survives leaving the panel — clicking
   a card that is already open closes it. Expand only if it is closed. */
await p.evaluate(() => {
  const c = [...document.querySelectorAll('#notesLogList .card')].find(x => /Lesson plan/.test(x.textContent || ''));
  if (c && !/Open to edit/.test(c.textContent)) c.click();
}); await wait(350);
R.push(['a note already in the tree offers the way BACK, not a duplicate',
  await press('It’s in the tree')]);
await wait(500);
R.push(['and no second lesson was created', ((await data()).myLessons || []).length === 1]);

/* ---------- LINK 2: a lesson becomes the path you are walking ---------- */
await p.evaluate(id => window.openLesson(id), node.id); await wait(400);
R.push(['a lesson can be picked up', await press('Pick this up')]);
await wait(400);
const d2 = await data();
R.push(['the picked-up path is recorded', (d2.study || {}).id === node.id]);

await p.evaluate(() => window.openLearningTree()); await wait(400);
const treeText = await p.evaluate(() => document.getElementById('treePanel').textContent.replace(/\s+/g, ' '));
R.push(['the tree opens on WHERE YOU ARE, above the catalogue', /The path you.{0,3}re walking/.test(treeText)]);
R.push(['and it names the next step, not just the lesson', /Next: Read chapter 2/.test(treeText)]);

/* THE point of picking one up: the day offers it. Note this fires with ZERO
   steps ticked — the old inference could not, and the first evening of a new
   path is the one that decides whether there is a second. */
await p.evaluate(() => window.openTheDay()); await wait(400);
const dayText = await p.evaluate(() =>
  document.getElementById('thedayOv').textContent.replace(/\s+/g, ' '));
R.push(['THE DAY offers the picked-up path with nothing yet ticked', /Read chapter 2/.test(dayText)]);
R.push(['and says why it is the one being offered', /picked up/.test(dayText)]);

/* Exactly one lesson step, ever. Two would make the day a syllabus. */
R.push(['only one lesson step is offered', (dayText.match(/step 1 of 3/g) || []).length <= 1]);

/* ---------- LINK 3: a book becomes an analysis you keep ---------- */
await p.evaluate(() => window.openReader('dhammapada')); await wait(600);
R.push(['the reader offers a way to dissect the book', await press('Dissect this book')]);
await wait(600);
R.push(['the dissection opens on its own', await p.evaluate(() =>
  document.getElementById('hallOv').classList.contains('open')
  && /a dissection you can come back to/.test(document.getElementById('hallPanel').textContent))]);

const d3 = await data();
const rec = (d3.hall.dissections || [])[0];
R.push(['a dissection was created against the book', !!rec && rec.book === 'dhammapada']);
R.push(['and it did not clobber the pasted-paper shape', !!rec && Array.isArray(rec.passes)]);

/* THE NO-AI FLOOR. Every AI feature in this project has to clear it, and this
   is the one that makes a dissection the visitor's rather than the model's. */
R.push(['your own reading notes can be pulled in with no AI at all',
  await press('Pull in my notes')]);
await wait(500);
const d4 = await data();
const rec4 = d4.hall.dissections[0];
R.push(['the notes landed as a pass', (rec4.passes || []).length === 1]);
R.push(['both of your own notes came, with their pages',
  /p\.12/.test(rec4.passes[0].text) && /p\.25/.test(rec4.passes[0].text)]);
R.push(['THE MODEL\'S OWN NOTE WAS NOT FOLDED BACK IN AS YOUR EVIDENCE',
  !/something the model wrote/.test(rec4.passes[0].text)]);

/* Pressing it again must not stack the same notes twice. */
await press('Pull in my notes'); await wait(400);
R.push(['pulling the same notes twice is a no-op, and says so',
  (await data()).hall.dissections[0].passes.length === 1
  && /already in here/.test(await p.evaluate(() => document.getElementById('bdStatus')?.textContent || ''))]);

/* The grounding must be honest about WHERE it is working from. An analysis
   that quietly appraised the blurb while you thought it read the chapter is
   worse than no analysis. */
const fromSummary = await p.evaluate(() => document.getElementById('hallPanel').textContent.replace(/\s+/g, ' '));
R.push(['working from the summary says so plainly', /Working from: the book.{0,3}s summary and sections/.test(fromSummary)]);

await p.evaluate(() => window.openReader('dhammapada')); await wait(500);
await p.evaluate(() => window.openFullText('dhammapada')); await wait(900);
await press('Dissect from here'); await wait(600);
const fromPage = await p.evaluate(() => document.getElementById('hallPanel').textContent.replace(/\s+/g, ' '));
R.push(['dissecting from a page names THE PAGE, not the blurb', /Working from: page \d+ of \d+/.test(fromPage)]);
R.push(['and reopening the same book reuses its dissection rather than starting a new one',
  (await data()).hall.dissections.filter(x => x.book === 'dhammapada').length === 1]);

/* ---------- it all survives being closed ----------
   The whole complaint was that a pass over a book evaporated when the panel
   closed. Carry the save that was actually WRITTEN to a second page — the
   evaluateOnNewDocument above re-fires on reload and would overwrite it. */
const written = await p.evaluate(() => localStorage.getItem('sandPavilionSave.v2'));
const p2 = await browser.newPage();
p2.on('pageerror', e => errs.push(e.message));
await p2.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), written);
await p2.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p2.click('#startBtn'); await new Promise(r => setTimeout(r, 1300));
const after = await p2.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2')));
R.push(['the lesson survives a restart', (after.myLessons || []).length === 1]);
R.push(['the path you were walking survives a restart', (after.study || {}).id === node.id]);
R.push(['the dissection and its passes survive a restart',
  (after.hall.dissections || []).length === 1 && after.hall.dissections[0].passes.length === 1]);

let bad = 0;
for (const [name, ok] of R) { console.log((ok ? '  PASS  ' : '  FAIL  ') + name); if (!ok) bad++; }
console.log(`\n${R.length - bad}/${R.length} checks`);
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
