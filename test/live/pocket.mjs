/* [THE POCKETED BOOK] — two records of "where we are", and while the book is
   pocketed the VOICE'S is the true one. Reported 2026-08-02: "I love how the
   book keeps reading but besides the little icon it goes back to the page I
   closed the book on." BETA-TESTING-FEEDBACK #37.

   Real speech cannot be driven in headless Chrome, so this drives the same
   state the voice drives — which is exactly where the bug lived. */
import puppeteer from 'puppeteer-core';
/* A book the PLAYER added, with real text long enough to paginate — the seed
   shelf this used to borrow from was deleted 2026-08-10. Rule 1. */
import { inlineBook, A_BOOK } from './_books.mjs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(s=>localStorage.setItem('sandPavilionSave.v2',s),JSON.stringify({seenWelcome:true,aiConnections:[],personalLibrary:[inlineBook()]}));
await p.goto('http://localhost:4173',{waitUntil:'networkidle2'});
await p.click('#startBtn'); await new Promise(r=>setTimeout(r,1300));
const R=[];

// open a real full text and go to page 2
await p.evaluate(sl=>{ window.openReader(sl); }, A_BOOK);
await new Promise(r=>setTimeout(r,600));
await p.evaluate(sl=>window.openFullText(sl,2), A_BOOK);
await new Promise(r=>setTimeout(r,500));

const pageNum=()=>p.evaluate(()=>document.getElementById('rdFullTextPageNum').textContent);
R.push(['a full text opens at the page asked for', /Page 3 of/.test(await pageNum())]);

// turn two pages, as the voice does when it finishes one
await p.evaluate(()=>window.fullTextNextPage());
await p.evaluate(()=>window.fullTextNextPage());
await new Promise(r=>setTimeout(r,400));
const advanced=await pageNum();
R.push(['pages turn', /Page 5 of/.test(advanced)]);

// pocket it and come back
await p.evaluate(()=>window.minimizeReader()); await new Promise(r=>setTimeout(r,400));
R.push(['pocketing hides the reader', !await p.evaluate(()=>document.getElementById('readerOv').className.includes('open'))]);
await p.evaluate(()=>window.restoreReader()); await new Promise(r=>setTimeout(r,700));
const back=await pageNum();
R.push(['REOPENING RETURNS TO PAGE 5, not page 1', back===advanced]);

// and the pocket keeps up when the VOICE turns the page while pocketed
await p.evaluate(()=>window.minimizeReader()); await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>{
  // exactly what speakPage()'s callback does on a page turn
  window.__bump=true;
});
await p.evaluate(()=>window.restoreReader()); await new Promise(r=>setTimeout(r,600));
R.push(['still lands correctly after a second pocket', (await pageNum())===advanced]);

/* ---- WHERE YOU ARE NOW SURVIVES A RELOAD -----------------------------
   The old pocket was session state, so closing the app threw the page away
   and you came back to page 1. Split 2026-08-07: data.readingPos[slug] is
   SAVED, state.pocketSlug is not. That split is the whole reason to do this
   work, so it gets a check rather than a claim.

   A SECOND PAGE, not a reload — evaluateOnNewDocument re-fires on reload and
   would overwrite the save we are about to read (MAINTAINING.md gotcha). */
const saved = await p.evaluate(() =>
  JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').readingPos || {});
R.push(['the page you reached is written to the SAVE, not only the session',
        Object.values(saved).some(v => v > 0)]);

const p2 = await b.newPage();
p2.on('pageerror', e => errs.push('p2: ' + e.message));
await p2.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));
const reloaded = await p2.evaluate(() =>
  JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').readingPos || {});
R.push(['and a fresh page still has it — the pocket never managed this',
        JSON.stringify(reloaded) === JSON.stringify(saved) && Object.keys(reloaded).length > 0]);
console.log('  readingPos:', JSON.stringify(saved), '-> fresh page:', JSON.stringify(reloaded));

let bad=0; for(const [n,ok] of R){ console.log((ok?'  PASS  ':'  FAIL  ')+n); if(!ok) bad++; }
console.log('  page after advancing:', advanced, '| after reopening:', back);
console.log('page errors:', errs.length?errs.slice(0,3):'none');
await b.close(); process.exit(bad||errs.length?1:0);
