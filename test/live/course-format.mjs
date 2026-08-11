/* [A LESSON THAT STANDS ALONE] — a paragraph survives the whole journey.
   ======================================================================
   Tutorial Stage 5 asks the visitor for a course whose "steps stand alone —
   someone who never met you could follow them." Until 2026-08-10 a step could
   not hold more than ONE LINE, so Stage 5 asked for something the format
   could not express. Three separate places enforced that:

     saveMyLesson()   split the textarea on newlines
     publishFrom()    flattened each step to `title | body`
     takePacket()     split it back on the first `|`

   The RENDERER was never the problem — ui/lesson-tree.js has printed s.body
   since it was written. The display half was built and the writing and
   interchange halves capped it at a line, which is this project's signature
   bug: a capability that exists and cannot be reached.

   So this drives the full journey with a genuinely multi-paragraph step:

     write it (as Markdown, in the real textarea)
       -> it is on screen, paragraphs intact
       -> publish it (the real Commons flow, with its reason screen)
       -> write the packet out the way writePacketFile does
       -> hand it back in through the REAL #packetFile input
       -> take it
       -> the paragraphs are still there, and so is who drafted it

   `npm test` holds the parser's round trip in isolation. This holds the
   journey, which is the only place the three flattening points meet.

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

/* A real teaching step: an objective, two paragraphs, a practice and a
   reflection. Exactly the thing that could not exist yesterday. */
const COURSE_MD = `---
title: Reading slowly, on purpose
summary: How to get more from one chapter than from five.
track: Reading
level: 101
drafted-with: a-cloud-model
---

## Pick one chapter, and only one

The whole method depends on refusing to move on. Most reading fails not
because the reader is slow but because they are already three chapters ahead
in their head.

Choose something short enough to finish in a sitting. If you cannot finish it
in a sitting it is not one chapter, it is two.

**Practice:** read it once at ordinary speed and then put the book down.

**Reflection:** what did you skim, and why that part?

## Read it again, slowly

The second pass is the one that counts.

**Artifact:** one line, in your own words, that you did not have before.
`;

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 980 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, aiConnections: [] }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));
const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('\nWriting it — the same textarea, in the portable format\n');
await p.evaluate(() => { window.openLearningTree(); window.newLessonForm(); });
await wait(500);
const written = await p.evaluate((md) => {
  const t = document.getElementById('mlTitle');
  if (!t) return { err: 'no form' };
  t.value = 'Reading slowly, on purpose';
  document.getElementById('mlSteps').value = md;
  window.saveMyLesson();
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  const l = (s.myLessons || [])[0];
  return l ? { id: l.id, steps: l.steps.length, by: l.by,
               firstBody: l.steps[0].body, paras: (l.steps[0].body.match(/\n\n/g) || []).length }
           : { err: 'not saved' };
}, COURSE_MD);
ok('a Markdown course pasted into the step box is understood',
   written.steps === 2, JSON.stringify(written).slice(0, 120));
ok('★ THE STEP BODY HOLDS PARAGRAPHS — the thing that was impossible yesterday',
   written.paras >= 2, (written.paras || 0) + ' paragraph breaks in step 1');
ok('the practice and reflection came through as written',
   /\*\*Practice:\*\*/.test(written.firstBody || '') && /\*\*Reflection:\*\*/.test(written.firstBody || ''));
/* THE AUTHORSHIP QUESTION, answered the same way a note answers it. */
ok('★ `drafted-with:` is kept as the same `by` a note carries',
   written.by && written.by.who === 'ai' && written.by.model === 'a-cloud-model',
   JSON.stringify(written.by));
const lessonId = written.id;

console.log('\nWalking it — the paragraphs are on screen\n');
await p.evaluate(id => { window.closeUI(); window.openLesson(id); }, lessonId);
await wait(500);
/* READ THE PANEL, NOT document.body. The first version tested
   document.body.textContent, which includes the text of CLOSED overlays — so
   it proved the paragraphs were in the DOM and nothing about whether a person
   can see them, and the screenshot came back showing the Grounds. A check that
   passes on an invisible element is the inert-pure-function bug wearing a
   test. */
const shown = await p.evaluate(() => {
  const ov = document.getElementById('treeOv');
  const panel = document.getElementById('treePanel');
  return { open: !!ov && ov.className.includes('open'),
           text: panel ? panel.textContent : '' };
});
ok('the lesson panel is actually OPEN, not merely rendered', shown.open);
ok('the second paragraph of step one is visible in it',
   /it is not one chapter, it is two/i.test(shown.text));
ok('and so is the reflection prompt', /what did you skim/i.test(shown.text));
await p.screenshot({ path: 'test/live/_course-walk.png' });

/* THE EDIT ROUND TRIP. Re-opening the form must not truncate what it shows,
   or the next save silently deletes every paragraph. */
await p.evaluate(id => { window.closeUI(); window.openLearningTree(); window.newLessonForm(id); }, lessonId);
await wait(500);
const refilled = await p.evaluate(() => (document.getElementById('mlSteps') || {}).value || '');
ok('★ re-opening it to edit does NOT truncate the paragraphs',
   /it is not one chapter, it is two/.test(refilled) && /^## /m.test(refilled),
   refilled.length + ' chars back in the box');

console.log('\nHanding it on — publish, write, receive, take\n');
await p.evaluate(() => { window.closeUI(); window.openCommonsTable(); window.setCommonsName('a colleague'); });
await wait(300);
await p.evaluate(id => window.publishFrom('lesson', id), lessonId);
await wait(400);
await p.evaluate(() => {
  const box = document.getElementById('pubReason');
  if (box) box.value = 'The two-readings trick is the part worth having.';
  window.confirmPublish();
});
await wait(600);

const packet = await p.evaluate(() => {
  const pk = (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').commons?.published || [])[0];
  if (!pk) return null;
  const out = { ...pk }; delete out.sourceKind; delete out.sourceId;   // what writePacketFile emits
  return out;
});
ok('publishing produced a packet', !!packet);
ok('★ the packet carries the whole document, not a flattened line',
   !!(packet && packet.body && /it is not one chapter, it is two/.test(packet.body)),
   packet ? (packet.body || '').length + ' chars of body' : '');
/* The old field is still written on purpose — a Pavilion older than today
   reads that and nothing else. */
ok('and it still writes the old flattened `steps`, for older Pavilions',
   !!(packet && Array.isArray(packet.steps) && packet.steps.length === 2));

const foreign = { ...packet, id: 'pk-course-from-elsewhere', by: 'a colleague', receivedOn: undefined };
const tmp = fileURLToPath(new URL('./_course-packet.json', import.meta.url));
writeFileSync(tmp, JSON.stringify(foreign, null, 2), 'utf8');
const input = await p.$('#packetFile');
if (!input) {
  ok('the Commons Table can receive a packet file', false, '#packetFile missing');
} else {
  await input.uploadFile(tmp);
  await wait(900);
  await p.evaluate(() => window.takePacket('pk-course-from-elsewhere'));
  await wait(700);
  const taken = await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
    const l = (s.myLessons || []).find(x => x && x.fromPacket === 'pk-course-from-elsewhere');
    return l ? { steps: l.steps.length, body: l.steps[0].body, by: l.by } : null;
  });
  ok('the received course lands as a walkable lesson', !!taken && taken.steps === 2,
     taken ? taken.steps + ' steps' : 'not taken');
  ok('★ AND THE PARAGRAPHS SURVIVED THE ROUND TRIP',
     !!(taken && /it is not one chapter, it is two/.test(taken.body)),
     taken ? (taken.body || '').slice(0, 60) : '');
  ok('★ so did who drafted it — a model, said out loud on the other machine',
     !!(taken && taken.by && taken.by.who === 'ai'), JSON.stringify(taken && taken.by));
}
rmSync(tmp, { force: true });

/* The quick form must not have been broken by any of this. */
console.log('\nThe one-line form still works — it is right for a small lesson\n');
await p.evaluate(() => { window.closeUI(); window.openLearningTree(); window.newLessonForm(); });
await wait(400);
const quick = await p.evaluate(() => {
  document.getElementById('mlTitle').value = 'Three quick things';
  document.getElementById('mlSteps').value = 'One | the first\nTwo | the second';
  window.saveMyLesson();
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  const l = (s.myLessons || []).find(x => x && x.title === 'Three quick things');
  return l ? { n: l.steps.length, body: l.steps[0].body, who: l.by && l.by.who } : null;
});
ok('`Title | body` per line is untouched', !!quick && quick.n === 2 && quick.body === 'the first',
   JSON.stringify(quick));
ok('and a lesson typed here is the visitor\'s own, not a model\'s', quick && quick.who === 'you');

console.log('\npage errors:', errs.length ? errs.slice(0, 3) : 'none');
console.log('screenshot -> test/live/_course-walk.png');
await b.close();
process.exit(failed || errs.length ? 1 : 0);
