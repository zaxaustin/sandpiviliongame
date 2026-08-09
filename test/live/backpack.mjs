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
  inventory: ['personal-walden', 'personal-epub-import', 'no-such-book'],
};

/* FORTY BOOKS OF YOUR OWN, because the cap is 20 and this suite has to walk
   the bag past it through the real door.

   It used to get them from the seed shelf — `allDocs().slice(0, 40)` — which
   worked only because 27 books happened to ship in seed.js. When the seed
   shelf was deleted on 2026-08-10 the bag could not be filled, nothing
   overflowed onto the shelf, and the suite crashed on an undefined.

   That is rule 1 arriving with a bill: a suite leaning on the seed is a
   suite that has never seen the library a real person has. These are
   personal books, the way every book now arrives. */
for (let i = 1; i <= 40; i++) {
  OLD_SAVE.personalLibrary.push({
    slug: 'personal-book-' + i, title: 'A Book of Your Own #' + i,
    tradition: 'Personal', personal: true, category: 'personal',
    license: 'Personal', added: '2026-08-07', attribution: 'You',
    doc: { summary: 'One of many.', sections: [], fullText: { text: 'A paragraph of it.' } },
  });
}

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
      after.carrying.some(e => /Walden/i.test(e.label || '')),
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
check('the backpack panel lists what is carried', /Walden/i.test(panel), JSON.stringify(panel.slice(0, 80)));
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
  /* THE BAG, not the bag plus the shelf. carryList() is the raw store and
     since the shelf landed it holds both — this read 29 and failed while the
     bag was correctly at 20. Count what the cap counts. */
  return { n: window.carryList().filter(e => !e.later).length,
           shelved: window.carryList().filter(e => e.later).length,
           shown: !!t && t.classList.contains('show'),
           toast: t ? t.innerText : '' };
});
check('the backpack never grows past its cap', capped.n <= 20, 'held ' + capped.n + ', shelved ' + capped.shelved);
check('and a full backpack SAYS so rather than silently refusing',
      capped.shown && /full|set something down/i.test(capped.toast),
      'shown=' + capped.shown + ' ' + JSON.stringify(capped.toast.slice(0, 90)));

/* ---- 5 . a full backpack offers a shelf, not a wall -------------------
   The cap focuses attention; it does not ration what you own. Asked for
   2026-08-07: "i dont want people to feel like trhere not able to hold
   somthing just that to focus them in whats in the invitoruy."

   Step 4 above already walked 40 books through the real door, so the overflow
   has ALREADY been shelved by the time we get here - which is the behaviour
   under test. Before today those 20 were simply refused and went nowhere. */
const shelf = await p.evaluate(() => {
  window.openInventory();
  const el = document.getElementById('inventoryPanel');
  const list = window.carryList();
  return { text: el ? el.innerText : '',
           held: list.filter(e => !e.later).length,
           onShelf: list.filter(e => e.later).length };
});
check('the books the cap refused went ONTO THE SHELF, not nowhere',
      shelf.onShelf > 0, 'shelf holds ' + shelf.onShelf);
check('and none of them snuck into the bag past the cap', shelf.held === 20, 'held ' + shelf.held);
check('the shelf is visible in the panel', /pick up later/i.test(shelf.text),
      JSON.stringify(shelf.text.slice(0, 140)));
check('the panel says the shelf is unlimited and unseen by residents',
      /no limit/i.test(shelf.text) && /cannot see/i.test(shelf.text));
check('and the cap explains itself rather than just refusing',
      /nothing is ever lost/i.test(shelf.text),
      JSON.stringify((shelf.text.match(/Full at[^\r\n]*/) || [])[0] || ''));

// and something can come back OFF the shelf once there is room
const back = await p.evaluate(() => {
  const held = window.carryList().filter(e => !e.later);
  const shelved = window.carryList().filter(e => e.later)[0];
  window.toggleInventory(held[0].ref);        // set one down -> room for one
  window.takeUpLater(shelved.ref);
  const list = window.carryList();
  return { ref: shelved.ref,
           nowHeld: list.some(e => e.ref === shelved.ref && !e.later),
           stillShelved: list.some(e => e.ref === shelved.ref && e.later) };
});
check('a shelved book comes back into the bag once there is room', back.nowHeld);
check('and it is not on the shelf AND in the bag at once', !back.stillShelved);

check('no console errors', errs.length === 0, errs.join(' | '));

await p.screenshot({ path: 'test/live/_backpack.png' });
await browser.close();

let bad = 0;
for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ the old bag came across, and the new one holds the line.');
process.exit(bad ? 1 : 0);
