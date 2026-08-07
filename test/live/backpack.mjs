/* ================================================================
   [THE BACKPACK] — data.inventory becomes data.carrying, 2026-08-07.

   The old backpack was a list of SLUGS and so could only ever hold
   books. data.carrying holds {kind, ref} so a note, a chapter or a
   lesson travels the same way.

   THE RISK IS THE MIGRATION. Someone has books in there right now, and
   a save that quietly empties your bag on upgrade is exactly the silent
   wrong thing this project keeps refusing. So the first check here is
   an OLD save, loaded by a NEW build, still carrying its books.

     npm run build:beta && npm run preview
     node test/live/backpack.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);

/* An OLD save: books in `inventory`, no `carrying` key at all.

   RULE 1 - TEST THE PLAYER'S BOOKS, NOT THE SEED. The first version of this
   fixture carried two seed slugs, which is exactly what CLAUDE.md warns
   against: a seed book resolves through seed.js, a book you dragged in
   resolves through data.personalLibrary and registerPersonalDocs(), and the
   migration calls Store.getDoc() for both. Only one of those paths was being
   exercised. So: one seed book, one book added the way a real person adds
   them, and one slug that resolves to NOTHING - which is the case that turned
   out to be silently dropped. */
const OLD_SAVE = {
  saveVersion: 1, seenWelcome: true,
  personalLibrary: [{
    slug: 'personal-epub-import', title: 'A Book You Dragged In', tradition: 'Personal',
    personal: true, license: '', added: '2026-08-07', category: 'personal', attribution: 'Someone',
    doc: { summary: '', sections: [], fullText: { text: 'A paragraph.' + String.fromCharCode(10,10) + 'And another one.' } },
  }],
  inventory: ['dhammapada', 'personal-epub-import', 'no-such-book'],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 900 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((s) => {
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s));
}, OLD_SAVE);
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 900));

// ---- 1 · the old bag survived -----------------------------------------
const after = await p.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}');
  return { carrying: saved.carrying || [], inventory: saved.inventory || [],
           list: (window.carryList && window.carryList()) || [] };
});
check('all three entries came across the migration', after.carrying.length === 3,
      JSON.stringify(after.carrying.map(e => e.label)));
check('A SEED book kept its real title',
      after.carrying.some(e => /Dhammapada/i.test(e.label || '')),
      JSON.stringify(after.carrying.map(e => e.label)));
check('A BOOK YOU ADDED YOURSELF kept its real title too - the two resolve by different paths',
      after.carrying.some(e => /Dragged In/i.test(e.label || '')),
      JSON.stringify(after.carrying.map(e => e.label)));
check('all of them came across as books', after.carrying.every(e => e.kind === 'book'));
check('the old list was emptied, so it cannot be lifted twice', after.inventory.length === 0);

// ---- 2 · it is idempotent ---------------------------------------------
const again = await p.evaluate(() => {
  window.carryMigrate();
  return (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').carrying || []).length;
});
check('running the migration again changes nothing', again === 3, 'now ' + again);

// ---- 3 · the panel shows them, and the reader agrees -------------------
const panel = await p.evaluate(() => {
  window.openInventory();
  const el = document.getElementById('inventoryPanel');
  return el ? el.innerText : '';
});
check('the backpack panel lists what is carried', /Dhammapada/i.test(panel), JSON.stringify(panel.slice(0, 80)));
/* THE COUNT AND THE LIST MUST AGREE. `gita` is a slug that does not resolve —
   deliberately, in the fixture — and before 2026-08-07 it was counted in the
   heading and silently dropped from the list, so the panel read "carrying 2
   things" above one card. Found by reading the .png, not by an assertion. */
check('a carried thing that no longer exists is SHOWN, not silently dropped',
      /no longer exist/i.test(panel), JSON.stringify(panel.slice(0, 200)));
check('and it offers a way to set it down', /set (it|them) down/i.test(panel));

// ---- 4 · the cap is real, and says so instead of doing nothing ---------
const capped = await p.evaluate(async () => {
  const C = window.carryList();
  // fill past the cap through the real door, not by poking the array
  const docs = window.__store.allDocs().slice(0, 40);
  for (const d of docs) if (!C.some(e => e.ref === d.slug)) window.toggleInventory(d.slug);
  const el = document.getElementById('inventoryPanel');
  // showToast() writes into #badgeToast, not #dropToast — the first version of
  // this check read an element that is never touched and reported "" forever.
  const t = document.getElementById('badgeToast');
  return { n: window.carryList().length,
           shown: !!t && t.classList.contains('show'),
           toast: t ? t.innerText : '' };
});
check('the backpack never grows past its cap', capped.n <= 20, 'held ' + capped.n);
check('and a full backpack SAYS so rather than silently refusing',
      capped.shown && /full|set something down/i.test(capped.toast),
      'shown=' + capped.shown + ' ' + JSON.stringify(capped.toast.slice(0, 90)));

check('no console errors', errs.length === 0, errs.join(' | '));

await p.screenshot({ path: 'test/live/_backpack.png' });
await browser.close();

let bad = 0;
for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ the old bag came across, and the new one holds the line.');
process.exit(bad ? 1 : 0);
