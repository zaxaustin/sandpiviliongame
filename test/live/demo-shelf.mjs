/* [THE DEMO SHELF] — one press, in a browser, and reversible.
   ======================================================================
   The deployed site's job is to be looked at by someone who will not
   install anything, and an empty Pavilion tells them nothing about what
   this is. But SEED_LIBRARY is [] and stays [] — "a shelf of 27 books
   nobody chose was doing the ownership argument harm" (CLAUDE.md), and
   that decision is not being reversed here.

   The distinction this suite exists to hold: a PRESS is a choice, a shelf
   that is already full when you arrive is not. So:

     · nothing is on the shelf until the button is pressed
     · the button exists ONLY in a browser (the installed app fills its own
       shelf, and offering it a demo would be the seed shelf again)
     · it is reversible, or it is a seed shelf wearing a button
     · it leaves room for the visitor's OWN book, or the demo teaches that
       adding one is impossible

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1150, height: 980 } });
const p = await b.newPage();
p.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); failed++; });
/* every request, so the dynamic import can be proved same-origin */
const reqs = [];
p.on('request', r => reqs.push(r.url()));

await p.evaluateOnNewDocument(() => localStorage.setItem('sandPavilionSave.v2',
  JSON.stringify({ seenWelcome: true, aiConnections: [] })));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await wait(700);

const saveNow = () => p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return { books: (s.personalLibrary || []).length, courses: (s.courses || []).length,
           kb: Math.round((localStorage.getItem('sandPavilionSave.v2') || '').length / 1024) };
});

console.log('\n— 1 · nothing until it is pressed —');
const before = await saveNow();
ok('the shelf is empty on arrival', before.books === 0 && before.courses === 0,
   `${before.books} books, ${before.courses} courses`);
const btn = await p.evaluate(() => {
  const e = document.getElementById('demoBtn');
  return e ? { shown: getComputedStyle(e).display !== 'none', text: e.textContent.trim() } : null;
});
ok('the button is there and visible in a browser', btn && btn.shown, btn ? btn.text : 'missing');
const chunkBefore = reqs.filter(u => /demo/i.test(u)).length;
ok('and its content has NOT been downloaded yet', chunkBefore === 0, chunkBefore + ' demo requests');

console.log('\n— 2 · one press —');
await p.click('#demoBtn');
await wait(2500);
const after = await saveNow();
ok('five books arrived', after.books === 5, after.books + ' books');
ok('and the two real courses', after.courses === 2, after.courses + ' courses');
ok('the save is a sensible size', after.kb > 1500 && after.kb < 2800, after.kb + ' KB');
const chunkAfter = reqs.filter(u => /^http:\/\/localhost:4173/.test(u) && /demo|chunk|assets/i.test(u));
ok('the chunk came from this origin only — nothing external',
   reqs.every(u => /^http:\/\/localhost:4173|^data:|^blob:/.test(u)),
   reqs.filter(u => !/^http:\/\/localhost:4173|^data:|^blob:/.test(u)).join(', ') || 'all same-origin');

const titles = await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  return { books: (s.personalLibrary || []).map(d => d.title),
           courses: (s.courses || []).map(c => c.title) };
});
ok('the courses are the real ones', titles.courses.some(t => /Electrical Engineer/i.test(t))
   && titles.courses.some(t => /Theoretical Minimum/i.test(t)), titles.courses.join(' | ').slice(0, 90));
ok('the books are real public-domain texts', titles.books.some(t => /Tesla/i.test(t)),
   titles.books.join(', ').slice(0, 90));

console.log('\n— 3 · they behave like ordinary books —');
await p.click('#startBtn');
await wait(500);
const readable = await p.evaluate(async () => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const slug = s.personalLibrary[0].slug;
  window.openReader(slug);
  await new Promise(r => setTimeout(r, 500));
  const btn = [...document.querySelectorAll('button')].find(x => /read the (whole|full)|full text/i.test(x.textContent));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 700));
  return (document.getElementById('rdFullTextPageNum') || {}).textContent || null;
});
ok('a demo book opens and paginates', !!readable, readable || 'no page number');
await p.evaluate(() => window.closeUI());
await wait(300);

console.log('\n— 4 · there is still room for YOUR book —');
const room = await p.evaluate(async () => {
  window.openBookIntake();
  await new Promise(r => setTimeout(r, 300));
  const hand = [...document.querySelectorAll('button')].find(x => /by hand/i.test(x.textContent));
  if (hand) hand.click();
  await new Promise(r => setTimeout(r, 300));
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  set('rmTitle', 'A Book I Brought Myself');
  set('rmBody', 'w'.repeat(400 * 1024));
  set('rmAuthor', 'Me');
  await window.shelveManualFormNow();
  await new Promise(r => setTimeout(r, 800));
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return (s.personalLibrary || []).some(d => d.title === 'A Book I Brought Myself');
});
ok('★ a visitor can still bring their own book in on top of the demo', room);

console.log('\n— 5 · and it is reversible —');
await p.evaluate(() => { window.closeUI(); });
await wait(300);
await p.evaluate(() => window.unloadDemoShelf());
await wait(1500);
const cleared = await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  return { books: (s.personalLibrary || []).map(d => d.title), courses: (s.courses || []).length };
});
ok('the demo books are gone', !cleared.books.some(t => /Tesla|Faraday|Franklin/i.test(t)),
   cleared.books.join(', ') || 'none');
ok('the demo courses are gone', cleared.courses === 0, cleared.courses + ' left');
ok('★ but the book the VISITOR added is untouched',
   cleared.books.includes('A Book I Brought Myself'), cleared.books.join(', ') || 'nothing left');

console.log('\n— 6 · the installed app is never offered it —');
const p2 = await b.newPage();
await p2.evaluateOnNewDocument(() => {
  /* a complete-enough bridge; the app assumes a full one if any exists */
  window.desktopBridge = { libraryWrite: async () => ({ ok: true }), libraryRead: async () => ({ ok: false }),
    libraryDelete: async () => ({ ok: true }), libraryUsage: async () => ({ ok: true, bytes: 0, free: 1e12 }),
    dbQuery: async () => null, dbWrite: async () => null, dbWriteMany: async () => null,
    dbStatus: async () => ({ up: false }), minioWrite: async () => ({ ok: false }),
    minioDelete: async () => ({ ok: false }) };
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify({ seenWelcome: true, aiConnections: [] }));
});
await p2.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await wait(800);
const hidden = await p2.evaluate(() => {
  const e = document.getElementById('demoBtn');
  return e ? getComputedStyle(e).display === 'none' : 'missing';
});
ok('★ with a desktop bridge present the button stays hidden', hidden === true, String(hidden));
await p2.close();

await b.close();
console.log(failed ? `\n✗ ${failed} failure(s)\n` : '\n✓ one press, reversible, browser only\n');
process.exit(failed ? 1 : 0);
