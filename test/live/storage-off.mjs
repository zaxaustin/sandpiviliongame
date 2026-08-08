/* ================================================================
   [WHEN THE STORAGE IS OFF] — 2026-08-08.

   The steward closed Docker and asked why none of his books were
   loading. Nothing was wrong with the books — but what the app SAID
   was, in one room:

     the Reader:      "the local Library storage (MinIO) doesn't seem
                       to be running right now."      <- true
     the Study Table: "<title> is a summary rather than the full text"
                                                      <- a confident LIE

   loadBookText() returned a bare `null` for every reason there could be
   no text, and the table's message for null happened to be the
   summary one. So a stopped container made a 900-page book a summary.

   Worse than the silence it replaced, and exactly the shape rule 5 and
   rule 6 exist for: a wrong answer given confidently, in a place the
   visitor has no way to check.

   MinIO is simulated as OFF by aborting every request to :9000 —
   indistinguishable from a stopped container to the page, and it does
   not touch the steward's actual containers.

     npm run build:beta && npm run preview
     node test/live/storage-off.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);

const MINIO = 'minio-backed-book', SUMMARY = 'summary-only-book';
const shelf = (slug, title, fullText) => ({
  slug, title, tradition: 'Personal', personal: true, license: '', added: '2026-08-08',
  category: 'personal', attribution: 'Nobody', doc: { summary: 'A card.', sections: [], fullText },
});
const SAVE = {
  saveVersion: 2, seenWelcome: true,
  personalLibrary: [
    // exactly the shape hydrateFromDb() builds from a row's text_key
    shelf(MINIO, 'A Nine Hundred Page Book',
      { storage: { bucket: 'sand-pavilion-library', key: 'personal/does-not-exist.txt' } }),
    // and a book that genuinely has no full text, so the two cannot be confused
    shelf(SUMMARY, 'A Summary Only Card', undefined),
  ],
  carrying: [{ kind: 'book', ref: MINIO, label: 'A Nine Hundred Page Book', since: '2026-08-08' }],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1100, height: 900 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((s) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s)), SAVE);
await p.setRequestInterception(true);
p.on('request', r => { if (r.url().includes(':9000')) r.abort(); else r.continue(); });

await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 800));

// ---- the Study Table ---------------------------------------------------
const table = await p.evaluate(async () => {
  window.closeUI(); window.openPlanner();
  await new Promise(r => setTimeout(r, 300));
  window.togglePlannerTool('study');
  await new Promise(r => setTimeout(r, 1200));
  const body = document.getElementById('planToolBody');
  return body ? body.innerText : '';
});
check('the Study Table does NOT call an unreachable book a summary',
      !/is a summary/i.test(table), JSON.stringify(table.slice(0, 200)));
check('it names the real cause', /MinIO/i.test(table) && /not answering/i.test(table),
      JSON.stringify(table.slice(0, 200)));
check('and offers a way out rather than a dead end', /Try again/i.test(table));

// ---- the Reader, which already got this right --------------------------
const reader = await p.evaluate(async (slug) => {
  window.closeUI(); window.openReader(slug);
  await window.openFullText(slug);
  await new Promise(r => setTimeout(r, 700));
  const el = document.getElementById('rdFullTextBody');
  return el ? el.innerText : '';
}, MINIO);
check('the Reader still says the true thing too', /MinIO/i.test(reader),
      JSON.stringify(reader.slice(0, 160)));

/* AND THE HONEST "SUMMARY" MESSAGE MUST SURVIVE. Fixing a wrong message by
   deleting it is not a fix — a book that genuinely has no full text should
   still say so, and the two cases must not collapse into one. */
const summary = await p.evaluate(async (slug) => {
  window.closeUI();
  /* CARRY IT FIRST. tableBook() only honours studyView.slug while you are
     actually carrying that book — setting one down puts it away at the table
     too, which is the design. Without this the table stayed on the MinIO book
     and the check read the wrong panel. */
  window.toggleInventory(slug);
  window.studySetBook(slug);
  window.openPlanner();
  await new Promise(r => setTimeout(r, 300));
  window.togglePlannerTool('study');
  await new Promise(r => setTimeout(r, 900));
  const body = document.getElementById('planToolBody');
  return body ? body.innerText : '';
}, SUMMARY);
check('a book that genuinely has no text is STILL called a summary',
      /is a summary/i.test(summary), JSON.stringify(summary.slice(0, 200)));
check('and that one is not blamed on MinIO', !/MinIO/i.test(summary));

check('no console errors', errs.length === 0, errs.join(' | '));

await p.screenshot({ path: 'test/live/_storage-off.png' });
await browser.close();

let bad = 0;
for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ storage being off says storage is off, and a summary is still a summary.');
process.exit(bad ? 1 : 0);
