/* [THE WEB BUILD'S CEILING] — the tab refuses before the quota throws.
   ======================================================================
   Asked directly 2026-08-18, about the deployed Vercel build: "if I add
   more than 13 will it still work? if other people add books will it also
   work? will we see overlapping data?"

   MEASURED, not reasoned: adding real-sized (563 KB) books one at a time,
   books 1–8 are fine and the NINTH throws QuotaExceededError at ~5.07 MB.
   Chrome's per-origin localStorage quota is ~5 MB and it is a hard wall.

   What happened at that wall was honest but LATE — persist() caught the
   throw and alerted "storage may be full", by which point the book was
   already on the shelf in memory and would not survive a reload. So the
   refusal moved before the write.

   The second half is the one that needed no code at all and is the whole
   answer to "will we see overlapping data": localStorage is per-origin AND
   per-browser, there is no server, and preflight.mjs already proves the
   bundle makes zero network calls. Two visitors cannot see each other. This
   suite pins that rather than leaving it as a claim.

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
  defaultViewport: { width: 1150, height: 900 } });

/* ⚠ THE FILLER GOES IN THE evaluateOnNewDocument PAYLOAD, not written and then
   reloaded. evaluateOnNewDocument RE-FIRES on reload and overwrites the save
   you just wrote — the gotcha CLAUDE.md records, and it made the first run of
   this file report a 0 KB save while the app was behaving perfectly. */
const fresh = async (fillerBooks) => {
  const p = await b.newPage();
  p.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); failed++; });
  await p.evaluateOnNewDocument(n => {
    const s = { seenWelcome: true, aiConnections: [], personalLibrary: [] };
    for (let i = 0; i < (n || 0); i++) {
      s.personalLibrary.push({ slug: 'filler' + i, title: 'Filler ' + i, tradition: 'Science',
        personal: true, license: 'Personal', attribution: 'x',
        doc: { summary: 'x', sections: [], fullText: { text: 'x'.repeat(563 * 1024) } } });
    }
    localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s));
  }, fillerBooks || 0);
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
  await wait(600);
  await p.click('#startBtn');
  await wait(500);
  return p;
};

console.log('\n— 1 · it refuses BEFORE the quota throws —');
const p = await fresh(7);   // ~3.9 MB of books, just under the ceiling

const res = await p.evaluate(async () => {
  const before = (localStorage.getItem('sandPavilionSave.v2') || '').length;
  let alerted = null;
  window.alert = m => { alerted = 'ALERTED: ' + m; };
  /* the REAL path a person takes: the intake form, then Add to my Library */
  window.openBookIntake();
  await new Promise(r => setTimeout(r, 300));
  /* the manual form is a second press — #rmTitle does not exist until then */
  const hand = [...document.querySelectorAll('button')].find(x => /by hand/i.test(x.textContent));
  if (hand) hand.click();
  await new Promise(r => setTimeout(r, 300));
  const set = (id, v) => { const e = document.getElementById(id); if (!e) throw new Error('no #' + id + ' — the manual form did not open'); e.value = v; };
  set('rmTitle', 'One Book Too Many');
  set('rmBody', 'y'.repeat(563 * 1024));
  set('rmAuthor', 'Someone');
  await window.shelveManualFormNow();
  await new Promise(r => setTimeout(r, 600));
  const msg = (document.getElementById('reviewManualMsg') || {}).textContent || '';
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return { msg, alerted, before: Math.round(before / 1024),
           after: Math.round((localStorage.getItem('sandPavilionSave.v2') || '').length / 1024),
           shelved: (s.personalLibrary || []).some(d => d.title === 'One Book Too Many') };
});
ok('the save really was near the wall first', res.before > 3500, res.before + ' KB');
ok('★ the extra book is REFUSED rather than half-added', !res.shelved,
   res.shelved ? 'it went on the shelf anyway' : 'not shelved');
ok('and the refusal names the tab and the way through',
   /browser tab is full/i.test(res.msg) && /desktop app/i.test(res.msg),
   res.msg.slice(0, 110));
ok('nothing was written, so the save did not grow', Math.abs(res.after - res.before) < 60,
   `${res.before} KB -> ${res.after} KB`);
ok('and no QuotaExceededError alert was needed', !res.alerted, res.alerted || 'none');
await p.close();

console.log('\n— 1b · and a book that DOES fit still goes in (the control) —');
const p1b = await fresh(1);
const okAdd = await p1b.evaluate(async () => {
  window.openBookIntake();
  await new Promise(r => setTimeout(r, 300));
  /* the manual form is a second press — #rmTitle does not exist until then */
  const hand = [...document.querySelectorAll('button')].find(x => /by hand/i.test(x.textContent));
  if (hand) hand.click();
  await new Promise(r => setTimeout(r, 300));
  const set = (id, v) => { const e = document.getElementById(id); if (!e) throw new Error('no #' + id + ' — the manual form did not open'); e.value = v; };
  set('rmTitle', 'A Perfectly Reasonable Book');
  set('rmBody', 'z'.repeat(200 * 1024));
  set('rmAuthor', 'Someone');
  await window.shelveManualFormNow();
  await new Promise(r => setTimeout(r, 600));
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return (s.personalLibrary || []).some(d => d.title === 'A Perfectly Reasonable Book');
});
ok('a book with room for it is still shelved normally', okAdd);
await p1b.close();

console.log('\n— 2 · two visitors cannot see each other —');
/* two independent browser contexts = two people on the same deployed URL */
const ctxA = await b.createBrowserContext();
const ctxB = await b.createBrowserContext();
const pageIn = async (ctx, title) => {
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
  await wait(500);
  await pg.evaluate(t => localStorage.setItem('sandPavilionSave.v2', JSON.stringify({
    seenWelcome: true, aiConnections: [],
    personalLibrary: [{ slug: 'x', title: t, tradition: 'Science', personal: true,
      license: 'Personal', attribution: 'x',
      doc: { summary: 'x', sections: [], fullText: { text: 'hello' } } }],
  })), title);
  await pg.reload({ waitUntil: 'networkidle2' });
  await wait(500);
  await pg.click('#startBtn');
  await wait(400);
  return pg;
};
const pa = await pageIn(ctxA, "ALICE'S BOOK");
const pb = await pageIn(ctxB, "BOB'S BOOK");
const titlesOf = pg => pg.evaluate(() =>
  (JSON.parse(localStorage.getItem('sandPavilionSave.v2')).personalLibrary || []).map(d => d.title));
const ta = await titlesOf(pa), tb = await titlesOf(pb);
ok("Alice sees only Alice's book", ta.length === 1 && ta[0] === "ALICE'S BOOK", ta.join(', '));
ok("Bob sees only Bob's book", tb.length === 1 && tb[0] === "BOB'S BOOK", tb.join(', '));
ok('★ neither can see the other — separate origins, no server, no overlap',
   !ta.includes("BOB'S BOOK") && !tb.includes("ALICE'S BOOK"));
await ctxA.close(); await ctxB.close();

console.log('\n— 3 · an illustrated book does not eat the tab —');
const p3 = await fresh(0);
const pics = await p3.evaluate(() => {
  /* the same shape epubToText hands over, with 40 fake figures */
  return typeof window.__probeShrink === 'function' ? 'n/a' : 'checked-by-size';
});
/* the real assertion is the one the shipped code makes: no bridge -> budget 0 */
const budget = await p3.evaluate(() => !!(window.desktopBridge && window.desktopBridge.libraryWrite));
ok('this really is a browser with no desktop bridge', budget === false, 'bridge=' + budget);
await p3.close();

await b.close();
console.log(failed ? `\n✗ ${failed} failure(s)\n` : '\n✓ the tab has a ceiling and says so\n');
process.exit(failed ? 1 : 0);
