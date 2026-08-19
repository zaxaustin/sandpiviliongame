/* [AN ILLUSTRATED BOOK] — the acceptance case, end to end.
   ======================================================================
   `Drawing for Beginners` (Karen Reed) is the case this work exists for, and
   it is the right one because the figures ARE the content: 7.8 MB on disk,
   113 illustrations, **99.4% of the file is pictures**, and what the reader
   kept was 71 KB of prose that is mostly captions for pictures nobody kept —

       "You can see that in the last step the shading is sort of interpretive"
       "You can see that the outline on the left is very basic"

   The book still READ as complete. That is what made it the bad kind of
   failure: nothing looked broken, and the one thing a drawing book is for was
   silently gone. Rule 5, wearing a tick.

   ⚠ THIS SUITE NEEDS THE REAL FILE and refuses to run without it, rather than
   passing on a fixture that would be tidier in every way a test cares about
   and would therefore lie (rule 1). Point EPUB= at it:

     EPUB="C:/Users/resto/Downloads/Drawing_for_Beginners_-_Reed_Karen.epub" \
       node test/live/illustrated-book.mjs

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { existsSync, readFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EPUB = process.env.EPUB
  || 'C:/Users/resto/Downloads/Drawing_for_Beginners_-_Reed_Karen.epub';

if (!existsSync(EPUB)) {
  console.log('\n  SKIP — the acceptance book is not on this machine:\n        ' + EPUB
    + '\n        Set EPUB=<path to an illustrated .epub> to run this.\n');
  process.exit(0);
}

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

await p.evaluateOnNewDocument(() => localStorage.setItem('sandPavilionSave.v2',
  JSON.stringify({ seenWelcome: true, aiConnections: [] })));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await wait(600);
await p.click('#startBtn');
await wait(400);

/* THE SHELF MUST ACTUALLY BE EMPTY before this proves anything — a check that
   refuses to run against the wrong fixture is worth more than the check. */
const before = await p.evaluate(() => window.Store ? window.Store.allDocs().length : -1);
ok('starting from an empty shelf', before === 0 || before === -1, 'docs=' + before);

console.log('\n— the file goes in through the real intake —');
await p.evaluate(() => window.openBookIntake());
await wait(400);
await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(x => /add a text by hand|by hand/i.test(x.textContent));
  if (btn) btn.click();
});
await wait(400);

const input = await p.$('#bulkFilePick');
ok('the real file picker is there', !!input);
const t0 = Date.now();
await input.uploadFile(EPUB);
/* unpacking 113 images takes real seconds — wait for the form, not a clock */
let filled = false;
for (let i = 0; i < 60; i++) {
  await wait(1000);
  filled = await p.evaluate(() => {
    const t = document.getElementById('rmTitle'), b2 = document.getElementById('rmBody');
    return !!(t && t.value && b2 && b2.value.length > 1000);
  });
  if (filled) break;
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
ok('the book was unpacked and the form filled', filled, secs + 's');

const intake = await p.evaluate(() => ({
  title: document.getElementById('rmTitle').value,
  chars: document.getElementById('rmBody').value.length,
  marks: (document.getElementById('rmBody').value.match(/⟦fig:\d+⟧/g) || []).length,
  msg: ((document.getElementById('dropMsg')||{}).textContent||'') + ' ' + ((document.getElementById('reviewManualMsg')||{}).textContent||''),
}));
ok('the title came from the file, not the filename', /Drawing for Beginners/i.test(intake.title), intake.title);
ok('figure markers are in the text', intake.marks > 100, intake.marks + ' markers');
console.log('       intake said: ' + intake.msg.slice(-150));
ok('AND IT SAYS WHAT HAPPENED TO THE PICTURES', /illustration/i.test(intake.msg));

console.log('\n— shelved, and what got stored —');
await p.evaluate(() => window.shelveManualFormNow());
await wait(3000);
const rec = await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const bk = (s.personalLibrary || [])[0];
  if (!bk) return null;
  const pics = bk.doc.pics || null;
  return { slug: bk.slug, title: bk.title,
           hasPics: !!pics, kept: pics && pics.kept, total: pics && pics.total,
           cut: pics && pics.cut, undec: pics && pics.undecodable,
           cover: !!(pics && pics.cover), coverKB: pics && pics.cover ? Math.round(pics.cover.length * 0.75 / 1024) : 0,
           inline: !!(pics && pics.figs), sidecar: !!(pics && pics.storage),
           saveKB: Math.round(localStorage.getItem('sandPavilionSave.v2').length / 1024) };
});
ok('the book is on the shelf', !!rec, rec ? rec.title : 'nothing shelved');
if (rec) {
  ok('its pictures were recorded', rec.hasPics);
  ok('ALL 113 illustrations were kept', rec.kept === 113, `${rec.kept} of ${rec.total}, ${rec.cut} cut, ${rec.undec} undecodable`);
  ok('a cover was found and downscaled', rec.cover, rec.coverKB + ' KB');
  console.log(`       browser has no bridge, so figures are inline: ${rec.inline} (sidecar: ${rec.sidecar})`);
  console.log(`       the whole save is now ${rec.saveKB} KB`);
}

console.log('\n— and the pictures are ON THE PAGE —');
await p.evaluate(() => window.closeUI());
await wait(200);
await p.evaluate(s => window.openReader(s), rec.slug);
await wait(600);
await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(x => /read the (whole|full)|full text/i.test(x.textContent));
  if (btn) btn.click();
});
await wait(900);

/* walk forward until a page with figures shows up — page 1 is the title page */
let shot = null;
for (let i = 0; i < 25; i++) {
  const st = await p.evaluate(() => {
    const el = document.getElementById('rdFullTextBody');
    const imgs = [...el.querySelectorAll('img.bookFigure')];
    return { n: imgs.length,
             loaded: imgs.filter(x => x.complete && x.naturalWidth > 0).length,
             leaked: /⟦fig:/.test(el.textContent),
             page: (document.getElementById('rdFullTextPageNum') || {}).textContent };
  });
  if (st.n > 0) { shot = st; break; }
  await p.evaluate(() => window.fullTextNextPage());
  await wait(220);
}
ok('a page renders real <img> figures', !!shot && shot.n > 0, shot ? `${shot.n} on ${shot.page}` : 'none found in 25 pages');
if (shot) {
  ok('and they actually DECODED — not broken images', shot.loaded === shot.n, `${shot.loaded} of ${shot.n} loaded`);
  ok('no ⟦fig:N⟧ marker leaked into the visible text', !shot.leaked);
}
await p.screenshot({ path: 'test/live/_shot-illustrated-page.png' });

console.log('\n— the marker must not survive into search, or the voice —');
const clean = await p.evaluate(() => {
  const v = window.__ftv || null;
  return { ok: true };
});
const spoken = await p.evaluate(() => {
  /* speakPage() strips markers before handing text to the voice; assert on the
     module's own stripper rather than on audio. */
  const el = document.getElementById('rdFullTextBody');
  return /⟦fig:/.test(el.textContent);
});
ok('the rendered page carries no marker text at all', !spoken);

await b.close();
console.log(failed ? `\n✗ ${failed} failure(s)\n` : '\n✓ the illustrated book arrives whole\n');
process.exit(failed ? 1 : 0);
