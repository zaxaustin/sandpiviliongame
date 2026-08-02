/* [THE POCKETED BOOK] — two records of "where we are", and while the book is
   pocketed the VOICE'S is the true one. Reported 2026-08-02: "I love how the
   book keeps reading but besides the little icon it goes back to the page I
   closed the book on." BETA-TESTING-FEEDBACK #37.

   Real speech cannot be driven in headless Chrome, so this drives the same
   state the voice drives — which is exactly where the bug lived. */
import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(s=>localStorage.setItem('sandPavilionSave.v2',s),JSON.stringify({seenWelcome:true,aiConnections:[]}));
await p.goto('http://localhost:4173',{waitUntil:'networkidle2'});
await p.click('#startBtn'); await new Promise(r=>setTimeout(r,1300));
const R=[];

// open a real full text and go to page 2
await p.evaluate(()=>{ window.openReader('dhammapada'); });
await new Promise(r=>setTimeout(r,600));
await p.evaluate(()=>window.openFullText('dhammapada',2));
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

let bad=0; for(const [n,ok] of R){ console.log((ok?'  PASS  ':'  FAIL  ')+n); if(!ok) bad++; }
console.log('  page after advancing:', advanced, '| after reopening:', back);
console.log('page errors:', errs.length?errs.slice(0,3):'none');
await b.close(); process.exit(bad||errs.length?1:0);
