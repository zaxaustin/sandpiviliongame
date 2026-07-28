import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT=process.env.TEMP ? process.env.TEMP.replace(/\\/g,'/')+'/' : './'; // screenshot lands in temp, not the repo
/* ================================================================
   [LIVE PRE-FLIGHT] — the automatable half of plans/BETA-PREFLIGHT.md.

   Tests the two things that checklist called unverified, against the
   BETA bundle (no Supabase, no MinIO) with NO local AI reachable —
   i.e. exactly what a beta tester on a fresh machine gets:

     1. an OLD save (the shape the 11 July beta.1 installer wrote)
        meeting today's 43 stores, losing nothing
     2. every panel a visitor can reach opening on that save with no
        AI and no cloud — nothing blank, nothing thrown
     3. and the beta bundle making no external request at all

   Not part of `npm test`: it needs a browser and a running server, and
   the project deliberately keeps its one dependency-free test suite
   dependency-free. To run it:

     npm install --no-save puppeteer-core
     npm run build:beta
     npm run preview          # in another terminal
     node test/live/preflight.mjs

   Written 2026-07-28. Adjust CHROME/OUT below for another machine.
   ================================================================ */
const OLD_SAVE = {           // deliberately pre-dates grove/commons/myShelves/
  seenWelcome:true,          // myLessons/standing/catalogEdits
  pos:{scene:'study',x:6,y:5},
  name:'Zac', steps:412, day:5,
  notes:[{id:'n1',title:'An old note',body:'written before any of this existed',date:'2026-07-11'}],
  curriculum:{'found-1':{steps:{0:true,1:true}}},
  personalLibrary:[{slug:'old1',title:'A Book From Before',tradition:'Personal',personal:true,
    license:'',added:'2026-07-11',category:'personal',doc:{summary:'x',sections:[],fullText:{text:'hello'}}}],
  ttsSettings:{voiceURI:null,rate:0.98},
  aiConnections:[], activity:[{date:'2026-07-11',text:'an old entry'}],
};
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const netFails=[]; p.on('requestfailed',r=>{ if(!/11434/.test(r.url())) netFails.push(r.url()); });
const ext=[]; p.on('request',r=>{ const u=r.url(); if(!/^http:\/\/localhost:4173|^data:|^blob:/.test(u)) ext.push(u); });
await p.setViewport({width:1280,height:940});
await p.evaluateOnNewDocument((s)=>localStorage.setItem('sandPavilionSave.v2',s), JSON.stringify(OLD_SAVE));
await p.goto('http://localhost:4173',{waitUntil:'networkidle2'});
await p.click('#startBtn'); await new Promise(r=>setTimeout(r,1200));
const R=[];
R.push(['an OLD save loads at all', await p.evaluate(()=>!!document.getElementById('game'))]);
R.push(['it kept the old note', await p.evaluate(()=>JSON.parse(localStorage.getItem('sandPavilionSave.v2')).notes?.length===1)]);
R.push(['it kept the old book', await p.evaluate(()=>JSON.parse(localStorage.getItem('sandPavilionSave.v2')).personalLibrary?.length===1)]);
R.push(['it kept old lesson progress', await p.evaluate(()=>!!JSON.parse(localStorage.getItem('sandPavilionSave.v2')).curriculum?.['found-1'])]);

/* open everything a visitor can reach, on an old save, with no AI */
const panels=['openLearningTree','openMyLibrary','openNotesLog','openCommonsTable','openInheritanceHall',
  'openAlexandria','openCourses','openDataPanel','openVoiceSettings','openStewardIndex','openRequests',
  'openAcademy','openScienceHall','openComputer','openGrantDesk','openResearchDesk','openPlanner',
  'openReviewQueue','openPaths','openIndex','openCatalog','openNoticeBoard','openResidentsBoard',
  'openConnections','openStanding','openArchive','openBadges','openCalendar','openInventory','openStillOpen','openWaypoints','openActivity','openUpcoming'];
for(const fn of panels){
  const before=errs.length;
  const ok=await p.evaluate(f=>{ if(typeof window[f]!=='function') return 'missing'; try{ window[f](); return true; }catch(e){ return e.message; } }, fn);
  await new Promise(r=>setTimeout(r,320));
  const drew=await p.evaluate(()=>{ const o=document.querySelector('.open .panel'); return !!o && o.textContent.trim().length>30; });
  R.push([`${fn}() opens on an old save with no AI`, ok===true && drew && errs.length===before]);
  await p.evaluate(()=>{ if(typeof window.closeUI==='function') window.closeUI(); });
  await new Promise(r=>setTimeout(r,120));
}
/* the new stores got created lazily and the save still round-trips */
const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('sandPavilionSave.v2')));
R.push(['the save is still valid JSON after all that', !!after && typeof after==='object']);
R.push(['and nothing from the old save was dropped',
  after.notes?.length===1 && after.personalLibrary?.length===1 && after.name==='Zac' && after.steps===412]);
R.push(['THE BETA BUNDLE MAKES NO CLOUD CALLS', ext.filter(u=>!/11434/.test(u)).length===0]);
await p.screenshot({path:OUT+'oldsave.png'});
for(const [n,ok] of R) console.log((ok?'  PASS  ':'  FAIL  ')+n);
console.log('external requests:', [...new Set(ext)].join(', ')||'(none)');
console.log('page errors:', errs.length?errs.slice(0,4):'none');
await b.close();
