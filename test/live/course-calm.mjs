/* [COURSE CALM] — is the Board actually calmer, or did I just move things?
   ======================================================================
   Pass 0 of the Learning Desk plan. Grok's note, and the steward agreed:

     "Density and clarity on the Course Board and course-walking screens…
      Any remaining copy or spacing that still feels like an info dump."

   THIS SUITE PROVES NOTHING BY ITSELF, and says so out loud. Density is a
   judgement, and the only instrument for it is a picture. What this does
   is stand the two surfaces up in a REALISTIC state — a real 17 KB course
   from disk plus three thin checklists, which is what a board looks like
   after a month rather than on day one — and shoot them the same way twice
   so before and after are comparable.

   It also carries the handful of density facts that CAN be counted, so a
   change that claims to calm a screen has to show a number moving:
   controls above the first course, and form fields on an open course.

   Run once before the change and once after:

     node test/live/course-calm.mjs before
     node test/live/course-calm.mjs after

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TAG = (process.argv[2] || 'before').replace(/[^a-z0-9-]/gi, '');
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};
const num = (name, v) => console.log('  ·    ' + name + ': ' + v);

/* The real file, the same bytes the steward wrote. A board rendered from a
   fixture trimmed until it looked tidy would be measuring the fixture. */
const COURSE_MD = readFileSync('courses/junior-electrical-engineer.course.md', 'utf8');

/* THREE checklists, not one. A board with a single course is not the board
   anybody has, and the density question only exists once there is a list. */
const THIN = [
  { id: 111, title: 'Morning sit', why: 'Ten minutes, most days', category: 'practice', due: null,
    steps: [{ title: 'Sit ten minutes', practice: 'breath counting', url: '', done: true },
            { title: 'Write one line about it', practice: '', url: '', done: false }],
    begun: '2026-08-01', archived: false },
  { id: 112, title: 'Rewire the bench lamp', why: 'It has been on the floor since June', category: 'personal', due: null,
    steps: [{ title: 'Buy the cord', practice: '', url: '', done: true },
            { title: 'Strip and tin the ends', practice: '', url: '', done: false },
            { title: 'Test it before it goes back on the shelf', practice: '', url: '', done: false }],
    begun: '2026-07-22', archived: false },
  { id: 113, title: 'Read the Upanishads through', why: 'One a week, no hurry', category: 'study', due: null,
    steps: [{ title: 'Isha', practice: '', url: '', done: true },
            { title: 'Kena', practice: '', url: '', done: false }],
    begun: '2026-08-11', archived: false },
];

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 1000 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument((s) => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, aiConnections: [], courses: THIN }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(1500);

async function clickText(text, sel) {
  const hit = await p.evaluate((t, s) => {
    const pick = q => [...document.querySelectorAll(q)]
      .find(e => e.offsetParent !== null && e.textContent.replace(/\s+/g, ' ').includes(t));
    const el = (s ? pick(s) : (pick('button, .btn') || pick('.card, label')));
    if (!el) return false;
    el.click(); return true;
  }, text, sel || '');
  await wait(450);
  return hit;
}

console.log('\nCOURSE CALM · ' + TAG + '\n');
console.log('Standing the real course up on a board that already has three checklists.\n');

/* Bring the real course in through the real doors, so the board being shot
   is one a person could actually have produced. */
await p.evaluate(() => window.openCourses());
await wait(400);
await clickText('Bring a course in');
await p.evaluate(md => { document.getElementById('rcText').value = md; }, COURSE_MD);
await clickText('Read it');
await wait(500);
await clickText('Pin it to the board');
await wait(600);

const pinned = await p.evaluate(() =>
  (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').courses || []).length);
ok('four courses on the board — one real, three checklists', pinned === 4, pinned + '');

/* ---- THE BOARD ---- */
await p.evaluate(() => window.openCourses());
await wait(500);
const board = await p.evaluate(() => {
  const el = document.getElementById('coursePanel');
  const first = el.querySelector('.card');
  /* HOW MUCH STANDS BETWEEN ARRIVING AND SEEING YOUR FIRST COURSE. This is
     the density question made countable: every button, input and select
     drawn above the first card. */
  const controlsAbove = [...el.querySelectorAll('button, input, select')]
    .filter(c => c.offsetParent !== null && !c.closest('details:not([open])') && first
      && (first.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_PRECEDING)).length;
  const badgesOnFirst = first ? first.querySelectorAll('.badge').length : -1;
  return { controlsAbove, badgesOnFirst,
           height: el.scrollHeight, chars: (el.textContent || '').trim().length };
});
num('controls above the first course', board.controlsAbove);
num('badges on one card', board.badgesOnFirst);
num('panel height (px)', board.height);
await p.screenshot({ path: 'test/live/_calm-' + TAG + '-1-board.png' });

/* ---- AN OPEN COURSE ---- */
await clickText('Junior Electrical Engineer', '.card');
await wait(700);
const detail = await p.evaluate(() => {
  const el = document.getElementById('coursePanel');
  const openStep = [...el.querySelectorAll('.step')].find(s => s.querySelector('.stepBody'));
  /* FORM FIELDS ON A COURSE YOU ARE WALKING. A due-date input and a
     category select sitting permanently under the work is the specific
     thing Pass 0 is about, so it is counted rather than described.

     ⚠ `offsetParent !== null` IS NOT "VISIBLE" INSIDE A CLOSED <details>.
     Chrome renders folded details content with content-visibility rather
     than display:none, so those children keep a layout box and an
     offsetParent — the first version of this counter reported 2 fields on a
     screen where the picture plainly showed them folded away. The number
     said the change had not worked; the screenshot said it had, and the
     screenshot was right. Verify the harness before believing it. */
  const shownField = c => c.offsetParent !== null && !c.closest('details:not([open])');
  const fields = [...el.querySelectorAll('input, select')].filter(shownField).length;
  const metaBits = (el.querySelector('.meta') || {}).textContent || '';
  return { fields, height: el.scrollHeight,
           metaSegments: metaBits.split('·').length,
           moduleTop: openStep ? Math.round(openStep.getBoundingClientRect().top) : -1 };
});
num('form fields on an open course', detail.fields);
num('segments in the line under the title', detail.metaSegments);
num('open module starts at y', detail.moduleTop);
num('panel height (px)', detail.height);
await p.screenshot({ path: 'test/live/_calm-' + TAG + '-2-course.png' });

/* Scrolled to the bottom too — the settings end of the panel is exactly where
   the clutter was, and a viewport shot of the top never shows it.

   ⚠ SCROLL WHATEVER ACTUALLY SCROLLS. The first version set scrollTop on
   #coursePanel, which is not the scroller, so shots 2 and 3 came back
   byte-identical and looked like proof the foot was fine. Walk up from the
   panel and move every ancestor that can move. */
await p.evaluate(() => {
  let el = document.getElementById('coursePanel');
  while (el) { el.scrollTop = el.scrollHeight; el = el.parentElement; }
  document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
});
await wait(300);
const scrolled = await p.evaluate(() => {
  let el = document.getElementById('coursePanel'), best = 0;
  while (el) { best = Math.max(best, el.scrollTop); el = el.parentElement; }
  return best;
});
ok('the foot shot actually scrolled', scrolled > 100, scrolled + 'px');
await p.screenshot({ path: 'test/live/_calm-' + TAG + '-3-course-foot.png' });

ok('no page errors', errs.length === 0, errs.join(' | '));
console.log('\nShots: test/live/_calm-' + TAG + '-{1-board,2-course,3-course-foot}.png');
console.log('READ THEM. The numbers above cannot tell you whether it feels calm.\n');
await b.close();
process.exit(failed ? 1 : 0);
