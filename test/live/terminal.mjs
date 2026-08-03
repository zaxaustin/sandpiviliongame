/* [THE COMPUTER AS A DOORWAY] — 2026-08-02. "the computer should be a way for
   people to learn terminal commands", with a stated direction toward Linux.
   So the property that matters is not that the commands work — it is that every
   one of them names its real-world equivalent, because that is the only reason
   any of this transfers. See src/game/data/man-pages.js. */
import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const mk=(n,t,txt)=>({slug:'b'+n,title:t,tradition:'Personal',personal:true,license:'',added:'2026-08-01',
  category:'personal',doc:{summary:'x',sections:[],fullText:{text:txt}}});
const save={seenWelcome:true,aiConnections:[{name:'Ollama',kind:'ollama',url:'http://localhost:11434'}],
  personalLibrary:[mk(1,'A Hashable Book','the quick brown fox')]};
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(s=>localStorage.setItem('sandPavilionSave.v2',s),JSON.stringify(save));
await p.goto('http://localhost:4173',{waitUntil:'networkidle2'});
await p.click('#startBtn'); await new Promise(r=>setTimeout(r,1300));
const R=[];
const term=async cmd=>{ await p.evaluate(c=>{ window.openComputer();
    const put=v=>{document.getElementById('termIn').value=v; window.termSubmit();};
    put('clear'); put(c); }, cmd);
  await new Promise(r=>setTimeout(r,400));
  return p.evaluate(()=>document.getElementById('computerPanel').textContent); };

const idx=await term('man');
R.push(['man alone lists the pages', /MANUAL PAGES/.test(idx) && /sha|hash/i.test(idx)]);
R.push(['and says why the words transfer', /Linux or macOS/.test(idx)]);

const mls=await term('man ls');
R.push(['man ls explains it here AND on a real machine', /ON A REAL MACHINE/.test(mls) && /ls -la/.test(mls)]);
const mnet=await term('man net');
R.push(['man net gives the real Linux command', /ss -tulpn/.test(mnet)]);
const mman=await term('man man');
R.push(['man man is honest that this is not a shell', /NOT a Unix shell/.test(mman)]);
R.push(['an unknown page fails politely', /No page for/.test(await term('man frobnicate'))]);

const net=await term('net');
R.push(['net states the no-requests claim', /NO network requests/.test(net)]);
R.push(['and tells you to go and verify it', /F12/.test(net)]);
R.push(['and lists a connection you configured', /11434/.test(net)]);

await term('ls');
await p.evaluate(()=>{ const put=v=>{document.getElementById('termIn').value=v; window.termSubmit();}; put('hash 1'); });
await new Promise(r=>setTimeout(r,900));
const h=await p.evaluate(()=>document.getElementById('computerPanel').textContent);
// sha256('the quick brown fox'), computed with node crypto — NOT from memory.
// The first version of this line was a hash I invented, and the test duly failed
// against correct code. Never assert a digest you did not compute.
R.push(['HASH IS A REAL SHA-256, correct to the byte',
  /9ecb36561341d18eb65484e833efea61edc74b84cf5e6ae1b81c63533e25fc8f/.test(h)]);
R.push(['and explains what a hash is for', /arrived intact/.test(h)]);

R.push(['help lists the new commands', /man <command>/.test(await term('help'))]);

let bad=0; for(const [n,ok] of R){ console.log((ok?'  PASS  ':'  FAIL  ')+n); if(!ok) bad++; }
console.log('page errors:', errs.length?errs.slice(0,3):'none');
await b.close(); process.exit(bad||errs.length?1:0);
