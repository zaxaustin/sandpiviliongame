/* [THE PHONE] — the residents notice, and text you about it.
   ======================================================================
   The steward, 2026-08-16: "my idea of this was a text in the phone from
   these people… if it's one way like a pager that's ok too."

   WHAT THIS DRIVES, by clicking:

     pin a real course           -> Sebastian and Quill both notice
     ★ the phone lights up        -> the card that already existed, gold dot
     ★ pin it again               -> NOT a second message. Ever.
     tap the phone                -> a thread, read like texts
     ★ opening marks it read      -> the dot goes out, and stays out
     ★ ↩ Talk to them             -> the real chat with THAT resident
     ★ a pocketed conversation    -> wins the card; messages wait
     the menu                     -> ✉ Messages · N, the house idiom

   ⚠ EVERY MESSAGE HERE IS AUTHORED TEXT. The save is seeded with
   `aiConnections: []` on purpose — if any of this needs a model, it is
   broken for exactly the people it was built for.

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
/* ★ A CHECK THAT REFUSES TO RUN AGAINST THE WRONG FIXTURE. The shelf-gap
   message only exists because the real course cites books; a course with no
   `Reading:` would make half this suite pass by finding nothing. */
/* ⚠ AND THIS COURSE DELIBERATELY CANNOT TRIGGER QUILL, which is worth stating
   rather than papering over. It predates `**Reading:**` and uses
   `**Primary resources:**` — a LIST of mixed things (a book AND a circuit
   simulator), which courseSyllabus() refuses to resolve against a shelf
   because "Falstad Circuit Simulator" is not a book anyone owns. So the suite
   asserts Quill correctly stays SILENT here, and tests his actual message
   through the same public path with a real missing list. Both branches, and
   neither pretends. */
if (!/\*\*Practice:\*\*/m.test(COURSE_MD)) {
  console.error('The real course has no Practice — nothing here would be testing a real module.');
  process.exit(1);
}
const CITES_TEXTS = /^\*\*Reading:\*\*/m.test(COURSE_MD);

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 1050 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, aiConnections: [], courses: [], messages: [] }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(1500);

const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}'));
const phone = () => p.evaluate(() => {
  const el = document.getElementById('chatPhone');
  if (!el) return null;
  return { shown: el.classList.contains('show'), unread: el.classList.contains('unread'),
           name: (document.getElementById('phoneName') || {}).textContent || '',
           status: (document.getElementById('phoneStatus') || {}).textContent || '' };
});
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

console.log('\n1 · Nothing has happened, so nobody has said anything\n');
let ph = await phone();
ok('the phone is not showing', ph && ph.shown === false);
ok('and the save holds no messages', ((await save()).messages || []).length === 0);

console.log('\n2 · Pin a real course — two residents notice\n');
await p.evaluate(() => window.openCourses());
await wait(400);
await clickText('Bring a course in');
await p.evaluate(md => { document.getElementById('rcText').value = md; }, COURSE_MD);
await clickText('Read it');
await wait(500);
await clickText('Pin it to the board');
await wait(800);

let msgs = (await save()).messages || [];
ok('★ messages were written', msgs.length >= 1, msgs.map(m => m.from + ':' + m.trigger).join(', '));
ok('Sebastian offered a daily goal', msgs.some(m => m.from === 'sebastian' && m.trigger === 'course-pinned'));
/* ★ QUILL SPEAKS ONLY WHEN THE COURSE NAMES A RESOLVABLE TEXT. This course
   does not, so his silence is the correct answer and the suite says which
   branch it is exercising rather than quietly accepting either. */
if (CITES_TEXTS) {
  ok('★ Quill counted the texts you do not own',
     msgs.some(m => m.from === 'quill' && m.trigger === 'shelf-gap'));
} else {
  ok('★ Quill correctly stays silent — this course names no resolvable text',
     !msgs.some(m => m.trigger === 'shelf-gap'),
     'the EE course uses **Primary resources:**, a list we refuse to resolve');
}
/* ...and his message itself, through the same public path a real course takes. */
await p.evaluate(() => window.notice('shelf-gap', {
  course: { id: 4242, title: 'A course that cites books' },
  missing: ['The Dhammapada', 'Raja Yoga'] }));
await wait(300);
const quill = ((await save()).messages || []).find(m => m.from === 'quill');
ok('★ and when a course DOES cite books, he names them', !!quill && /Dhammapada/.test(quill.body),
   quill ? quill.body.slice(0, 48) : 'no message');
ok('★ and says plainly that fetching them is not his to do',
   !!quill && /cannot fetch them for you/i.test(quill.body));
ok('★ none of them needed a model', ((await save()).aiConnections || []).length === 0);
ok('every message starts unread', msgs.every(m => m.read === false));

console.log('\n3 · The phone — the card that already existed\n');
await p.keyboard.press('Escape');
await wait(500);
ph = await phone();
ok('★ the phone is showing', ph && ph.shown === true, JSON.stringify(ph));
ok('★ with the unread dot lit', ph && ph.unread === true);
ok('it names the resident, not "messages"', ph && /Sebastian|Quill/i.test(ph.name), ph && ph.name);
ok('and says how many are waiting', ph && /message/i.test(ph.status), ph && ph.status);
await p.screenshot({ path: 'test/live/_msg-1-phone.png' });

console.log('\n4 · ★ Pinning again writes NOTHING — sparse is enforced, not hoped\n');
const beforeN = ((await save()).messages || []).length;
await p.evaluate(() => window.openCourses());
await wait(400);
await clickText('Bring a course in');
await p.evaluate(md => { document.getElementById('rcText').value = md; }, COURSE_MD);
await clickText('Read it');
await wait(500);
await clickText('Pin it to the board');
await wait(800);
const afterN = ((await save()).messages || []).length;
ok('★ no second copy of the same message', afterN === beforeN, beforeN + ' → ' + afterN);

console.log('\n5 · Tap it, and read the thread\n');
await p.keyboard.press('Escape');
await wait(400);
await p.evaluate(() => document.getElementById('chatPhone').click());
await wait(700);
const panel = await p.evaluate(() => (document.getElementById('msgPanel') || {}).textContent || '');
ok('★ the thread opened', /Messages/.test(panel), panel.slice(0, 40));
ok('it carries the real text', /daily goal|not on your shelf/i.test(panel));
ok('★ and says nothing is being asked of you', /ignore any of it/i.test(panel));
ok('★ every message offers the real conversation', /Talk to /.test(panel));
await p.screenshot({ path: 'test/live/_msg-2-thread.png' });

console.log('\n6 · ★ Opening marks them read, and the dot goes out\n');
msgs = (await save()).messages || [];
ok('★ all marked read in the save', msgs.every(m => m.read === true));
await p.keyboard.press('Escape');
await wait(500);
ph = await phone();
ok('★ the phone has gone quiet', ph && ph.shown === false, JSON.stringify(ph));

console.log('\n7 · ★ A live conversation wins the card\n');
/* Pocket a chat while messages exist — and one must exist, or this passes by
   finding nothing. A fresh unread is forced through the same public path. */
await p.evaluate(() => window.notice('long-sitting', { minutes: 200, session: 'test-session' }));
await wait(300);
ok('a Monk message was written', ((await save()).messages || []).some(m => m.from === 'monk'));
await p.evaluate(() => { window.talkTo('quill'); });
await wait(600);
await p.evaluate(() => { window.minimizeChat(); });
await wait(500);
ph = await phone();
ok('★ the pocketed conversation owns the card, not the message',
   ph && ph.shown === true && /Quill/i.test(ph.name), JSON.stringify(ph));
await p.keyboard.press('Escape');
await wait(400);

console.log('\n8 · The Monk, in full\n');
await p.evaluate(() => window.openMessages());
await wait(600);
const monkText = await p.evaluate(() => (document.getElementById('msgPanel') || {}).textContent || '');
ok('★ he tells you to get up', /ground under your feet|eat something|look at something further/i.test(monkText));
ok('★ and he is not cruel about it',
   !/lazy|pathetic|excuse|failure|wasting|ashamed/i.test(monkText));
await p.screenshot({ path: 'test/live/_msg-3-monk.png' });

console.log('\n9 · The menu says so too\n');
await p.evaluate(() => window.notice('task-quiet', { title: 'Ohm the hard way', quietDays: 5 }));
await wait(300);
await p.evaluate(() => window.openMenu());
await wait(600);
const menu = await p.evaluate(() => document.body.innerText);
ok('★ the menu carries a Messages entry with a count', /✉ Messages · \d/.test(menu),
   (menu.match(/✉ Messages[^\n]*/) || ['not found'])[0]);
await p.screenshot({ path: 'test/live/_msg-4-menu.png' });

console.log('\n' + (errs.length ? '⚠ page errors: ' + errs.join(' | ') : 'no page errors'));
if (errs.length) failed++;
console.log(failed ? `\n✗ ${failed} failure(s)` : '\n✓ the phone holds');
await b.close();
process.exit(failed ? 1 : 0);
