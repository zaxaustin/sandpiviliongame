/* [THE EMPTY LIBRARY] — what a stranger meets in the first minute.
   ======================================================================
   SEED_LIBRARY is [] and that is the finished position, so "the shelves are
   empty" is not an edge case — it is EVERY install's first morning. Three
   surfaces were still written for the Pavilion that shipped 27 books:

     · emptyShelfText()'s no-bridge branch told whoever walked up to the
       bookcase to run `npm run electron:dev` — developer copy, on a build
       that is deployed to the web.
     · emptyLibraryOnRamp() was written to be said "wherever a list of books
       can come back empty, so the three panels cannot drift apart" and had
       exactly ONE caller. The Stacks rendered a heading and a blank space.
     · Quill opens with "Six shelves down here, three rows deep: Theravada
       and Mahayana up front…" — a confident tour of furniture that is not
       there, and it is the NON-AI fallback, so it is what a visitor with no
       model configured hears.

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

/* a genuinely fresh save: no books, no AI, standing in the Library */
await p.evaluateOnNewDocument(() => localStorage.setItem('sandPavilionSave.v2',
  JSON.stringify({ seenWelcome: true, aiConnections: [], pos: { scene: 'library', x: 7, y: 12 } })));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await wait(600);
await p.click('#startBtn');
await wait(500);

/* Store is not a global (only handlers are), and with SEED_LIBRARY = [] the
   whole catalogue IS the visitor's own shelf — so the save is the honest
   place to count from. */
const countDocs = () => p.evaluate(() =>
  (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').personalLibrary || []).length);
const docs = await countDocs();
ok('THE SHELF IS ACTUALLY EMPTY (else nothing below is being tested)', docs === 0, 'docs=' + docs);

const textOf = sel => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const DEV_COPY = /npm run|electron:dev|localhost|127\.0\.0\.1/i;

console.log('\n— 1 · a shelf in the Library —');
await p.evaluate(() => window.openShelf('Science'));
await wait(400);
const shelf = await textOf('#shelfPanel, #shelfOv');
ok('it does not print npm commands at the bookcase', !DEV_COPY.test(shelf),
   DEV_COPY.test(shelf) ? shelf.match(DEV_COPY)[0] : '');
ok('it says the shelves start empty on purpose', /on purpose|starts empty/i.test(shelf));
ok('and offers a way to bring a book in', /bring a book in/i.test(shelf));
ok('it names where free books come from', /gutenberg|standard ebooks|internet archive/i.test(shelf));
await p.screenshot({ path: 'test/live/_shot-empty-shelf.png' });

console.log('\n— 2 · The Stacks, which used to render a blank page —');
await p.evaluate(() => { window.closeUI(); window.openCatalog(); });
await wait(400);
const stacks = await textOf('#catalogPanel');
ok('the Stacks says something at all', stacks.trim().length > 60, stacks.trim().length + ' chars');
ok('and it is the same on-ramp, not a blank space', /bring a book in/i.test(stacks));
ok('no developer copy here either', !DEV_COPY.test(stacks));
await p.screenshot({ path: 'test/live/_shot-empty-stacks.png' });

console.log('\n— 3 · the Index —');
await p.evaluate(() => { window.closeUI(); window.openIndex(); });
await wait(400);
const index = await textOf('#indexPanel, #indexOv');
ok('the Index carries the on-ramp too', /bring a book in/i.test(index));
ok('and no longer dates itself to a changelog entry', !/2026-08-10/.test(index));

console.log('\n— 4 · Quill, with nothing to be librarian of —');
/* ⚠ A SECOND PAGE, NOT A RELOAD. `evaluateOnNewDocument` RE-FIRES on reload and
   overwrites the save you were about to verify — the gotcha CLAUDE.md records,
   and it bit this file on its first run: section 5 seeded a book, reloaded, and
   read back docs=0 while the app was behaving perfectly. Each fixture gets its
   own page with its own payload.

   ⚠ And the text is #dText, not #dialog — #dialog's own textContent is the
   speaker button and the "▼ E" prompt, so every assertion here passed or failed
   against "🔊 ▼ E" and none of them were reading a word Quill said. */
const walkToQuill = async (save) => {
  const pg = await b.newPage();
  pg.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); failed++; });
  await pg.evaluateOnNewDocument(s2 => localStorage.setItem('sandPavilionSave.v2', s2), JSON.stringify(save));
  await pg.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
  await wait(700);
  await pg.click('#startBtn');
  await wait(500);
  await pg.keyboard.down('ArrowUp'); await wait(300); await pg.keyboard.up('ArrowUp');
  await wait(500);
  await pg.keyboard.press('e');
  await wait(600);
  const said = await pg.evaluate(() => (document.getElementById('dText') || {}).textContent || '');
  return { pg, said };
};

const BARE = { seenWelcome: true, aiConnections: [], pos: { scene: 'library', x: 8, y: 6 } };
const q1 = await walkToQuill(BARE);
ok('pressing E on Quill said something', q1.said.trim().length > 40, q1.said.trim().slice(0, 64) + '…');
ok('he does NOT give a tour of six stocked shelves',
   !/six shelves|three rows deep|Theravada and Mahayana up front/i.test(q1.said),
   /six shelves/i.test(q1.said) ? 'still touring' : '');
ok('he says the shelves are empty on purpose',
   /empty/i.test(q1.said) && /deliberate|purpose|chose/i.test(q1.said));
await q1.pg.screenshot({ path: 'test/live/_shot-empty-quill.png' });
await q1.pg.close();

console.log('\n— 5 · and once a book exists, the librarian comes back —');
const STOCKED = { ...BARE, personalLibrary: [{ slug: 'personal-x', title: 'A Book',
  tradition: 'Science', personal: true, license: 'Personal', attribution: 'Someone',
  doc: { summary: 'x', sections: [], fullText: { text: 'hello' } } }] };
const q2 = await walkToQuill(STOCKED);
ok('Quill is a librarian again, not an apologist',
   /six shelves|three rows deep/i.test(q2.said), q2.said.trim().slice(0, 56) + '…');
ok('and the empty-shelf line is gone', !/that is\s+deliberate/i.test(q2.said));
await q2.pg.close();

console.log('\n— 6 · a Library sign, with nothing on the shelf —');
const sp = await b.newPage();
sp.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); failed++; });
await sp.evaluateOnNewDocument(s2 => localStorage.setItem('sandPavilionSave.v2', s2),
  JSON.stringify({ seenWelcome: true, aiConnections: [], pos: { scene: 'library', x: 11, y: 13 } }));
await sp.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await wait(700);
await sp.click('#startBtn'); await wait(500);
await sp.keyboard.down('ArrowUp'); await wait(300); await sp.keyboard.up('ArrowUp');
await wait(500);
await sp.keyboard.press('e'); await wait(500);
const sign1 = await sp.evaluate(() => (document.getElementById('dText') || {}).textContent || '');
ok('the bean-bag sign still says its own line first',
   /bookmark|sink in|stay a while/i.test(sign1), sign1.trim().slice(0, 46) + '…');
await sp.keyboard.press('e'); await wait(500);
const sign2 = await sp.evaluate(() => (document.getElementById('dText') || {}).textContent || '');
ok('and a second page adds the honest note', /bare|nothing ships/i.test(sign2),
   sign2.trim().slice(0, 56) + '…');
await sp.close();

await b.close();
console.log(failed ? `\n✗ ${failed} failure(s)\n` : '\n✓ the empty Library is an on-ramp\n');
process.exit(failed ? 1 : 0);
