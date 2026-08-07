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

// An OLD save: books in `inventory`, no `carrying` key at all.
const OLD_SAVE = {
  saveVersion: 1, seenWelcome: true,
  inventory: ['dhammapada', 'gita'],
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
check('two books came across the migration', after.carrying.length === 2,
      JSON.stringify(after.carrying));
check('they came across as books, with their real titles',
      after.carrying.every(e => e.kind === 'book') && after.carrying.some(e => /Dhammapada/i.test(e.label || '')),
      JSON.stringify(after.carrying.map(e => e.label)));
check('the old list was emptied, so it cannot be lifted twice', after.inventory.length === 0);

// ---- 2 · it is idempotent ---------------------------------------------
const again = await p.evaluate(() => {
  window.carryMigrate();
  return (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').carrying || []).length;
});
check('running the migration again changes nothing', again === 2, 'now ' + again);

// ---- 3 · the panel shows them, and the reader agrees -------------------
const panel = await p.evaluate(() => {
  window.openInventory();
  const el = document.getElementById('inventoryPanel');
  return el ? el.innerText : '';
});
check('the backpack panel lists what is carried', /Dhammapada/i.test(panel), JSON.stringify(panel.slice(0, 80)));

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
