/* [DROP ANYWHERE] — the documentation promised this for weeks and it was false.
   MANUAL and the release notes both said a file could be dropped anywhere on
   the window; the only target was a zone inside the Caravan Desk, three rooms
   in, and everywhere else it failed silently. See BETA-TESTING-FEEDBACK #33. */
import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(s=>localStorage.setItem('sandPavilionSave.v2',s),JSON.stringify({seenWelcome:true,aiConnections:[],
  /* A SUMMARY-ONLY BOOK OF YOUR OWN. This block used to reach for a shipped
     summary classic ('tao-te-ching'); the seed shelf was deleted 2026-08-10.
     The behaviour under test is unchanged and still matters: a card with no
     text behind it — "a book I own on paper" — must UPGRADE IN PLACE when
     you finally drop the file, not shelve a second copy and leave you on a
     page still calling itself a summary. */
  personalLibrary:[{ slug:'personal-tao-te-ching', title:'Tao Te Ching', tradition:'Classics',
    personal:true, license:'Personal', added:'2026-08-03', attribution:'Laozi',
    doc:{ summary:'On a real shelf; the text is not here yet.', sections:[] } }]}));
await p.goto('http://localhost:4173',{waitUntil:'networkidle2'});
await p.click('#startBtn'); await new Promise(r=>setTimeout(r,1300));
const R=[];
const count=()=>p.evaluate(()=>(JSON.parse(localStorage.getItem('sandPavilionSave.v2')).personalLibrary||[]).length);

// drag a file over the WORLD — no panel open at all
await p.evaluate(()=>{
  const dt=new DataTransfer(); dt.items.add(new File(['hello'],'x.txt',{type:'text/plain'}));
  document.dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true}));
});
await new Promise(r=>setTimeout(r,300));
R.push(['dragging a file over the WORLD shows the drop veil',
  await p.evaluate(()=>document.getElementById('dropVeil').className.includes('on'))]);

await p.evaluate(()=>{
  const dt=new DataTransfer(); dt.items.add(new File(['hello'],'x.txt',{type:'text/plain'}));
  document.dispatchEvent(new DragEvent('dragleave',{dataTransfer:dt,bubbles:true}));
});
await new Promise(r=>setTimeout(r,300));
R.push(['and hides it again when the drag leaves',
  !await p.evaluate(()=>document.getElementById('dropVeil').className.includes('on'))]);

// DROP a real book on the bare world
await p.evaluate(()=>{
  const dt=new DataTransfer();
  dt.items.add(new File(['Title: A Dropped Book\n\nSome real words here.'],'dropped.txt',{type:'text/plain'}));
  document.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
});
await new Promise(r=>setTimeout(r,1400));
R.push(['DROPPING ON THE WORLD SHELVES THE BOOK', (await count())===2]); // 1 seeded + 1 dropped
R.push(['and says so, without opening a panel', await p.evaluate(()=>{
  const t=document.getElementById('dropToast');
  return t.className.includes('on') && /Added/.test(t.textContent)
      && ![...document.querySelectorAll('.overlay')].some(o=>o.className.includes('open'));
})]);
/* THE BOOK THAT WAS JUST DROPPED, not every book in the save. This read
   `.every(b => b.tradition === 'Personal')`, which was only ever true
   because the save started empty — the moment the fixture gained a book
   already filed on a real shelf (2026-08-10) it failed, and it would have
   failed the same way for any visitor who had ever sorted anything. */
R.push(['it lands unfiled, in the still-to-sort pile', await p.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const dropped=(s.personalLibrary||[]).find(b=>/A Dropped Book/i.test(b.title||''));
  return !!dropped && dropped.tradition==='Personal';
})]);
R.push(['the veil is gone after the drop',
  !await p.evaluate(()=>document.getElementById('dropVeil').className.includes('on'))]);

// a text drag inside a field must NOT be hijacked
await p.evaluate(()=>{
  const dt=new DataTransfer(); dt.setData('text/plain','just some words');
  document.dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true}));
});
await new Promise(r=>setTimeout(r,250));
R.push(['dragging TEXT is left alone', !await p.evaluate(()=>document.getElementById('dropVeil').className.includes('on'))]);

// a bundle dropped on the world opens its review panel
const before=await count();
const bundle={sandPavilionBundle:1,id:'t',title:'Dropped Packet',by:'x',made:'2026-08-02',books:[
  {slug:'dp1',title:'One',text:'z'.repeat(300),license:'Public Domain',tradition:'Classics',sharing:'pd',gathered:'given'}]};
await p.evaluate(j=>{
  const dt=new DataTransfer(); dt.items.add(new File([JSON.stringify(j)],'p.json',{type:'application/json'}));
  document.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
}, bundle);
await new Promise(r=>setTimeout(r,1200));
R.push(['a BUNDLE dropped on the world opens for review',
  await p.evaluate(()=>document.getElementById('bundleOv').className.includes('open'))]);
R.push(['and still adds nothing without a press', (await count())===before]);

/* THE SUMMARY BOOK'S PROMISE MUST HOLD. Ten shipped classics are carried as
   summaries, and each says in as many words: "drag the file onto this window
   — and this page becomes the real book."

   Measured 2026-08-03: it did not. The file shelved as a separate personal
   copy, the seed entry stayed summary-only, and the visitor was left on a page
   still telling them it was not the book — now owning two copies, one of them
   unreachable from where they stood. This is the first-ten-minutes path, so a
   lie here is the one a new tester meets. */
{
  const opened = await p.evaluate(async () => {
    closeUI(); openReader('personal-tao-te-ching');
    await new Promise(r => setTimeout(r, 300));
    const lines = ['Title: Tao Te Ching', 'Author: Laozi', '', 'Chapter 1', '',
      'The way that can be told is not the eternal way.'];
    for (let i = 2; i < 42; i++) lines.push('', 'Chapter ' + i, '', 'Words of the way, at length, for pagination.');
    const dt = new DataTransfer();
    dt.items.add(new File([lines.join('\n')], 'tao-te-ching.txt', { type: 'text/plain' }));
    document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 2500));
    return {
      slug: window.currentDocSlug ? window.currentDocSlug() : '',
      stillSaysSummary: /not the book itself/i.test(document.getElementById('rdBody').textContent),
      canReadFullText: document.getElementById('rdFullTextBtn')?.style.display === 'inline-block',
    };
  });
  R.push(['dropping the file onto a summary-only book gives you the real text', !!opened.slug && opened.canReadFullText]);
  R.push(['and the page stops calling itself a summary', !opened.stillSaysSummary]);
  R.push(['and the full text is actually readable', opened.canReadFullText]);
}

let bad=0; for(const [n,ok] of R){ console.log((ok?'  PASS  ':'  FAIL  ')+n); if(!ok) bad++; }
console.log('page errors:', errs.length?errs.slice(0,3):'none');
await b.close(); process.exit(bad||errs.length?1:0);
