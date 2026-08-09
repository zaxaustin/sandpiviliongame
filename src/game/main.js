"use strict";
import './style.css';
import { Store } from './data/store.js';
import {
  state, data, persist, scene, tileAt, npcAt, signAt, warpAt, stationAt,
  plantingAt, canPlantAt,
  blocked, facingTile, opposite, MOVE_TIME, dueSoon, todayKey,
  startFishing, fishingAction, updateFishing, updateNPCs, logActivity, awardBadge,
} from './entities.js';
import { openDialog, openChatDialog, advanceDialog, closeDialog, closeUI, openPlanner, openCourses, openArchive, openResearchDesk, openComputer, openRequests, openNoticeBoard, openResidentsBoard, openHearth, openGrantDesk, openCoffee, openReviewQueue, openRecordsHall, openCalendar, openShelf, shelfTraditionFor, openConnections, openMenu, refreshAIStatus, refreshLibraryStorageStatus, openWelcome, sweepReminders, openFoldReflection, openInheritanceHall, openPlantHere, openPlanting, openCommonsTable, openMyLibrary, openAlexandria, openLearningTree, openLab, openLift, openBookIntake, openNotesLog, initGlobalDrop, refreshBackendStatus, carryMigrate } from './ui/overlays.js';
import { render } from './render.js';
import { isAIActive } from './ai/provider.js';
import { currentSeason } from './season.js';

/* ================================================================
   THE SAND PAVILION — OVERWORLD · Phase 2
   Internal modules:
     [STORE]    data/store.js   — storage adapter
     [SEED]     data/seed.js    — library documents
     [SCENES]   scenes.js       — map builders
     [ENTITIES] entities.js     — player/save state, world lookups, fishing, NPC wander
     [RENDER]   render.js       — canvas, tiles, buildings, sprites
     [UI]       ui/overlays.js  — shelf, reader, planner, courses, dialog
     [MAIN]     main.js         — loop, input, audio, scene switching (this file)
   ================================================================ */

/* ---------- audio ---------- */
let AC=null;
export function blip(freq,dur=0.08,type='square',vol=0.04){
  try{
    if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+dur);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+dur);
  }catch(e){}
}
export function jingleCatch(){ blip(523,.09); setTimeout(()=>blip(659,.09),90); setTimeout(()=>blip(784,.14),180); }
export function jingleMiss(){ blip(220,.12,'sawtooth'); setTimeout(()=>blip(164,.18,'sawtooth'),110); }

/* ---------- input ---------- */
const keys={};
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  const typing=e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA');
  if(typing){ if(k==='escape'){ if(state.ui) closeUI(); else if(state.dialog) closeDialog(); } return; } // let the field handle its own keys (space, arrows, etc.)
  if(k.startsWith('arrow')||k===' '||k==='e'||k==='enter') e.preventDefault(); // 'e'/'enter' can open a chat input mid-handler; without this the keystroke leaks into it
  keys[k]=true;
  if(k==='escape'){
    if(state.ui) closeUI();
    else if(state.dialog && !state.dialog.minimized) closeDialog();
    else if(document.getElementById('title').style.display==='none') openMenu();
    return;
  }
  if(k==='e'||k===' '||k==='enter') onAction();
  if(k==='m') toggleMeditate();
});
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
function bindTouch(id,key){
  const el=document.getElementById(id);
  const on=e=>{ e.preventDefault(); keys[key]=true; if(key==='__a') onAction(); };
  const off=e=>{ e.preventDefault(); keys[key]=false; };
  el.addEventListener('pointerdown',on); el.addEventListener('pointerup',off);
  el.addEventListener('pointerleave',off); el.addEventListener('pointercancel',off);
}
bindTouch('du','arrowup'); bindTouch('dd','arrowdown');
bindTouch('dl','arrowleft'); bindTouch('dr','arrowright'); bindTouch('abtn','__a');
window.addEventListener('touchstart',()=>document.body.classList.add('touchmode'),{once:true});

document.getElementById('startBtn').addEventListener('click',()=>{
  document.getElementById('title').style.display='none';
  if(state.ui) closeUI(); // guard: don't enter the grounds with the Connections panel left open
  blip(659,.08); setTimeout(()=>blip(880,.1),90);
  // First arrival, genuinely fresh save only (no saved position yet) — the
  // orientation shows exactly once, then lives behind the title screen's
  // "New here?" button forever after. Never re-shown on its own.
  if(!data.seenWelcome && !data.pos){ data.seenWelcome=true; persist(); openWelcome(); }
  /* Lift an older save's book-only backpack into data.carrying. Behind the
     title screen, once, and a no-op on every save that has already been
     lifted — a bag that quietly empties itself on upgrade is exactly the
     silent wrong thing this project keeps refusing. */
  carryMigrate();
});
document.getElementById('saveMode').textContent =
  Store.mode==='local' ? '● Saving to this device — your days, courses, and reading survive reloads.'
                       : '○ Preview mode — progress lasts this session. Deployed on your site, it persists.';
refreshAIStatus();
refreshLibraryStorageStatus();
refreshBackendStatus();
document.getElementById('connBtn').addEventListener('click', openConnections);
document.getElementById('welcomeBtn').addEventListener('click', openWelcome);
document.getElementById('menuBtn').addEventListener('click', openMenu);
initGlobalDrop();   // a file dropped anywhere on the window is shelved — see overlays.js

/* ---------- the local database, if this machine has one ----------
   The desktop app can reach a local Postgres holding the catalogue, the
   shelves and every book's chapters (see data/store.js). Pulled ONCE, here,
   because every Store.allDocs() call downstream is synchronous and mid-render.

   Deliberately fire-and-forget: nothing waits on it, nothing breaks without
   it, and a browser — which cannot speak to Postgres at all — simply never
   gets past the first line. The hydration MERGES, so a shelf you assigned
   always beats a NULL in the database (guarded by test/live/backend.mjs).

   `__store` is exposed for that test. It is NOT in overlays.js's window
   export block on purpose: that block is drift-checked against the inline
   on*= handlers in both directions, and this is not a click handler. */
window.__store = Store;
if(Store.dbAvailable && Store.dbAvailable()){
  Store.hydrateFromDb().then(r=>{
    if(r && r.ok){
      /* NO logActivity HERE. Until 2026-08-09 this wrote "Read the catalogue
         from the local database — N books." into the visitor's activity log on
         every single boot. That log is a record of what THEY did; a sentence
         they did not cause, at the top of it every time they open the app, is
         the machine narrating itself in a diary that is not its own.

         The information is not lost and was never missing from anywhere it
         belonged: refreshBackendStatus() puts it on the status line, which is
         the machine's own place to talk about itself. */
      refreshLibraryStorageStatus(); refreshBackendStatus();
    }
  }).catch(()=>{ /* the Pavilion is complete without it */ });
}

/* ---------- HUD ---------- */
function setLoc(){ document.getElementById('loc').textContent=scene().name; }
/* Move somewhere without walking through a warp tile. Added 2026-08-02 for the
   Workshop lift; the warp block in the movement loop does this inline and
   cannot be called from a panel. Kept to the same steps so a lift arrival and a
   walked arrival are indistinguishable afterwards. */
export function warpTo(sceneKey, sx, sy){
  const p=state.player;
  state.scene=sceneKey;
  p.x=sx; p.y=sy; p.px=p.x; p.py=p.y; p.tx=p.x; p.ty=p.y; p.moving=false; p.dir='down';
  setLoc(); persist(); logActivity('Took the lift to '+scene().name+'.');
  blip(392,.1); setTimeout(()=>blip(523,.12),100);
}
export function setHud(){
  document.getElementById('fishCount').textContent=data.fish;
  document.getElementById('readCount').textContent=Object.keys(data.read).length;
  // the only "reminder" this game gives — a quiet, glanceable count of
  // things you chose to give a due date, never a popup or an alarm
  const soon=dueSoon(7), badge=document.getElementById('upcomingBadge');
  const overdue=soon.filter(i=>i.due<todayKey()).length;
  badge.textContent = soon.length ? '⏰ '+soon.length+(overdue?' (‼ '+overdue+' overdue)':'') : '';
  badge.style.display = soon.length ? 'inline' : 'none';
}

/* ================================================================
   Action + update
   ================================================================ */
/* a season is pure atmosphere — never a new fixed line, just one
   extra grumble appended to what a scripted NPC already says */
function npcLines(npc){
  const lines=[...npc.lines];
  if(npc.name==='SAGARA the Fisher' && currentSeason()==='winter'){
    lines.push("The pond's gone hard at the edges. Rude of it, honestly.\nThe fish don't seem to mind — I mind enough for both of us.");
  }
  if(npc.name==='MOSS · Steward Agent'){
    const mem=data.agentMemory.quill;
    if(mem && mem.length){
      const last=mem[mem.length-1];
      const q=last.text.length>70?last.text.slice(0,70)+'…':last.text;
      lines.push(`Quill mentioned you'd asked about "${q}." A household that gossips a little, I suppose — nothing said leaves the shelves, though.`);
    }
  }
  return lines;
}
function onAction(){
  if(document.getElementById('title').style.display!=='none') return;
  if(state.ui) return;
  if(state.dialog && !state.dialog.minimized){ advanceDialog(); return; }
  if(state.fishing){ fishingAction(); return; }
  if(state.player.moving) return;

  const ft=facingTile();
  const st=stationAt(ft.x,ft.y);
  if(st){
    if(st.kind==='planner') openPlanner();
    else if(st.kind==='courses') openCourses();
    else if(st.kind==='archive') openArchive();
    else if(st.kind==='research') openResearchDesk();
    else if(st.kind==='computer') openComputer();
    else if(st.kind==='requests') openRequests();
    else if(st.kind==='notice') openNoticeBoard();
    else if(st.kind==='residents') openResidentsBoard();
    else if(st.kind==='hearth') openHearth();
    else if(st.kind==='grantdesk') openGrantDesk();
    else if(st.kind==='coffee') openCoffee();
    else if(st.kind==='review') openReviewQueue();
    else if(st.kind==='records') openRecordsHall();
    else if(st.kind==='calendar') openCalendar();
    else if(st.kind==='yourshelf') openMyLibrary();
    else if(st.kind==='intake') openBookIntake();
    else if(st.kind==='notes') openNotesLog();
    else if(st.kind==='inheritance') openInheritanceHall();
    else if(st.kind==='commons') openCommonsTable();
    else if(st.kind==='alexandria') openAlexandria();
    else if(st.kind==='tree') openLearningTree();
    else if(st.kind==='lift') openLift();
    else if(st.kind==='ledger') openDialog('THE LEDGER',["Real numbers, not general encouragement — pairs with Wealth of\nNations and Ten Acres Enough, already on the Library shelves.\nNot open yet. Still just framing and good intentions."]);
    // OPEN, 2026-08-02 — the placeholder's own description ("a home for real-world
    // physical projects — a build, a repair") turned out to be exactly what the
    // Bench and the research gathering-view became, so the promise got kept rather
    // than a second room built beside it. See openLab().
    else if(st.kind==='makersbench') openLab();
    else if(st.kind==='greenhouse') openDialog('THE GREENHOUSE',["Something that visibly grows over real calendar time, not\ngame-time — the same patience the four postures and the\nDaoist shelf already teach, made literal. Not open yet."]);
    else if(st.kind==='roundtable') openDialog('THE ROUND TABLE',["A real co-study room for the hope of a free place to pursue\nhigher education together. The Five Animals practice track is\nthe obvious first real occupant. Not open yet."]);
    else if(st.kind==='mailroom') openDialog('THE MAILROOM',["A home for the Waypoints feature — external links, which\nalready exist in the pause menu with nowhere in the world\nthat's actually about them. Not open yet."]);
    return;
  }
  // The Inheritance Hall's ground: something planted here, or open earth you
  // can plant in. Only this scene has either — see BETA-BUILD-PLAN.md §8.
  const pl=plantingAt(ft.x,ft.y);
  if(pl){ openPlanting(pl.id); return; }
  if(canPlantAt(ft.x,ft.y)){ openPlantHere(ft.x,ft.y); return; }
  const npc=npcAt(ft.x,ft.y);
  if(npc){
    npc.face=opposite(state.player.dir);
    if(npc.ai && isAIActive()) openChatDialog(npc); else openDialog(npc.name,npcLines(npc));
    awardBadge('first-word');
    return;
  }
  const sg=signAt(ft.x,ft.y);
  if(sg){ if(sg.fold){ openFoldReflection(sg); } else { openDialog(sg.name,[sg.text]); } return; }
  if(scene().shelves && tileAt(ft.x,ft.y)==='k'){ openShelf(shelfTraditionFor(ft.x,ft.y)); return; }
  if(tileAt(ft.x,ft.y)==='W' && scene().outdoor){ startFishing(ft); return; }
}

// the four traditional postures — walking is just ordinary movement,
// standing is the ordinary idle pose; M cycles through the other three
// meditation forms in place, any real step back out to plain standing
const MEDITATE_POSES=['sitting','lying','standing'];
function toggleMeditate(){
  if(document.getElementById('title').style.display!=='none') return;
  if(state.ui||state.dialog||state.fishing||state.player.moving) return;
  const p=state.player;
  const i=MEDITATE_POSES.indexOf(p.meditate);
  p.meditate = i<0 ? MEDITATE_POSES[0] : (i<MEDITATE_POSES.length-1 ? MEDITATE_POSES[i+1] : null);
  blip(p.meditate?440:330,.08,'sine',.03);
}
function tryMove(dx,dy,dir){
  const p=state.player; p.dir=dir; p.meditate=null;
  const nx=p.x+dx, ny=p.y+dy;
  if(blocked(nx,ny)) return;
  p.moving=true; p.tx=nx; p.ty=ny; p.t=0;
  awardBadge('first-steps');
}
function stepBack(){
  const p=state.player, d={up:[0,1],down:[0,-1],left:[1,0],right:[-1,0]}[p.dir];
  if(!blocked(p.x+d[0],p.y+d[1])){ p.x+=d[0]; p.y+=d[1]; p.px=p.x; p.py=p.y; }
}
function update(dt){
  state.time+=dt;
  if(document.getElementById('title').style.display!=='none') return;
  if(state.ui) return;
  updateFishing(dt);

  const p=state.player;
  if(p.moving){
    p.t+=dt;
    const k=Math.min(1,p.t/MOVE_TIME);
    p.px=p.x+(p.tx-p.x)*k; p.py=p.y+(p.ty-p.y)*k;
    if(k>=1){
      p.x=p.tx; p.y=p.ty; p.px=p.x; p.py=p.y; p.moving=false;
      const w=warpAt(p.x,p.y);
      if(w){
        if(w.locked){ openDialog('LOCKED',w.locked); stepBack(); }
        else{
          state.scene=w.to;
          p.x=w.sx; p.y=w.sy; p.px=p.x; p.py=p.y;
          /* `face` first: a warp that knows which way you should be looking
             when you arrive says so, rather than being inferred from its
             destination. Added with the second Grounds — walking east out of
             the Pavilion and arriving facing DOWN reads as being spun round
             at the gate. The old inference stays for every door it already
             got right. */
          p.dir=w.face||((w.to==='overworld')?'down':(w.to==='study')?'right':(state.scene==='library'&&w.sx===14)?'left':'up');
          setLoc(); persist(); logActivity('Walked into '+scene().name+'.'); blip(392,.1); setTimeout(()=>blip(523,.12),100);
        }
      }
    }
  } else if((!state.dialog || state.dialog.minimized) && !state.fishing){
    if(keys['arrowup']||keys['w']) tryMove(0,-1,'up');
    else if(keys['arrowdown']||keys['s']) tryMove(0,1,'down');
    else if(keys['arrowleft']||keys['a']) tryMove(-1,0,'left');
    else if(keys['arrowright']||keys['d']) tryMove(1,0,'right');
  }

  updateNPCs(dt);
  // Sebastian's reminder sweep — a clock comparison against reminders the
  // visitor set themselves, throttled inside to ~every 20s. Not an AI call;
  // the no-background-polling rule (which is about AI) stands untouched.
  sweepReminders();
}

/* ---------- loop ---------- */
let last=performance.now();
function loop(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  update(dt); render();
  requestAnimationFrame(loop);
}
setLoc(); setHud();
requestAnimationFrame(loop);
