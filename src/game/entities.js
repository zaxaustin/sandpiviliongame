import { Store } from './data/store.js';
import { scenes, SOLID } from './scenes.js';
import { openDialog, showBadgeToast } from './ui/overlays.js';
import { jingleCatch, jingleMiss, blip, setHud } from './main.js';
import { BADGES } from './data/badges.js';
import { setTTSSettings } from './tts.js';

/* ================================================================
   [GAME] state + persistence
   ================================================================ */
export const DEFAULT_BLOCKS = ['Morning Sit','Study','Build','Movement','Midday Rest','Correspondence','Evening Ember'];

const DEFAULT_CONNECTIONS=[{ id:'ollama-default', name:'Ollama (local)', kind:'ollama', baseUrl:'http://localhost:11434', enabled:true, builtin:true }];
// saveVersion exists so a future change to the planner/course/etc. shape has
// somewhere to hang a migration function instead of silently misreading old
// saves — nothing reads it yet, but the field needs to exist in every save
// from the start so it's there once something actually needs it.
const SAVE_VERSION=1;
export function freshData(){ return { saveVersion:SAVE_VERSION, fish:0, fishLog:[], read:{}, bookNotes:{}, planner:{}, notes:[], courses:[], calendar:[], noteMeta:{}, noteReach:{}, dailyTasks:[], taskStats:{done:0,streak:0,best:0,lastDone:''}, personalLibrary:[], pos:null, aiConnections:DEFAULT_CONNECTIONS.map(c=>({...c})), agentMemory:{}, chatNotes:{}, workshop:{docs:[],research:[]}, grantProjects:[], waypoints:[], activityLog:[], badges:{}, bookRequests:[], inventory:[] /* VESTIGIAL - the old book-only backpack. Read ONCE by carryMigrate() and emptied; data.carrying is the backpack now. Do not write to it. */, reviewQueue:[], ideas:[], paths:[], hall:{investigations:[],experiments:[],builds:[]}, temple:{folds:{}}, curriculum:{}, myShelves:[], myLessons:[], standing:{}, bookMarks:{}, study:null, carrying:[], readingPos:{}, catalogEdits:{}, grove:{plantings:[],seeds:[]}, commons:{received:[],published:[],taken:{}}, ttsSettings:{voiceURI:null,rate:0.98}, settings:{carryForwardSparks:false}, seenWelcome:false }; }
export const data = Object.assign(freshData(), Store.load() || {});
// Object.assign is a shallow merge — an existing save's `workshop:{docs:[...]}`
// (from before the Research Desk existed) replaces freshData()'s `workshop`
// wholesale, silently dropping the new `research` field. Patch it back in.
if(!data.workshop.research) data.workshop.research=[];
if(!data.readingPos) data.readingPos={};   // where you are in each book — older saves lost this on every reload
if(!Array.isArray(data.carrying)) data.carrying=[]; // the backpack — older saves carried books in `inventory`, lifted across by carryMigrate()
if(!data.ttsSettings) data.ttsSettings={voiceURI:null,rate:0.98}; // older saves predate this field
if(!data.settings) data.settings={carryForwardSparks:false}; // older saves predate this field
if(!data.notes) data.notes=[]; // older saves predate My Notes at the Writing Desk
if(!data.calendar) data.calendar=[]; // older saves predate Sebastian's calendar (BUTLER-SEBASTIAN-PLAN.md)
if(!data.noteMeta) data.noteMeta={}; // folder/tag layer over the notes log (NOTES-AND-LOG-ROOM-PLAN.md step 2) — a side-map keyed by note, touches no note itself
/* May a local model see this note? (data/note-reach.js, 2026-08-08.) A SEPARATE
   store from noteMeta on purpose: noteMeta is on the DATA_MAP ignore list as
   "small, boring, self-evident", and a per-note AI permission is the exact
   opposite — it belongs in Your Data where a person can read it. Absent means
   ASKABLE, so this stays empty until someone deliberately seals something. */
if(!data.noteReach) data.noteReach={};
/* Today's tasks, and the tally (data/daily-tasks.js, 2026-08-08). One list,
   newest first; only the entry whose `taken` is today is live, which is
   computed on read rather than by any timer. */
if(!Array.isArray(data.dailyTasks)) data.dailyTasks=[];
if(!data.taskStats) data.taskStats={done:0,streak:0,best:0,lastDone:''};
if(!data.personalLibrary) data.personalLibrary=[]; // older saves predate the personal shelf (BETA-BUILD-PLAN.md)
if(!data.hall) data.hall={investigations:[],experiments:[]}; // older saves predate the Science & Research Hall (SCIENCE-RESEARCH-HALL-PLAN.md)
if(!data.hall.experiments) data.hall.experiments=[]; // Phase 3 self-experiments came after Phases 0-2
if(!data.hall.dissections) data.hall.dissections=[]; // kept paper analyses came later still
if(!data.hall.builds) data.hall.builds=[]; // the Bench (2026-08-02) — see plans/UNIVERSAL-REMOTE-PROJECT.md
if(!data.temple) data.temple={folds:{}}; // older saves predate the Eightfold reflection ladder (EIGHTFOLD-PATH-TEMPLE-PLAN.md)
if(!data.curriculum) data.curriculum={}; // older saves predate the Learning Tree (COURSE-PROGRESSION-PLAN.md)
if(!data.paths) data.paths=[]; // older saves predate Paths — ideas you pick up and walk (PHONE-APPS/daily-use)
if(!data.grove) data.grove={plantings:[],seeds:[]}; // older saves predate the Inheritance Hall (BETA-BUILD-PLAN.md §8)
if(!data.grove.seeds) data.grove.seeds=[]; // the pouch came with the seed-propagation half
if(!data.standing) data.standing={}; // your own standing instructions per resident (ADMIN-AND-AUTHORING-PLAN #1)
if(!data.myLessons) data.myLessons=[]; // lessons you wrote yourself, walked beside the built-in Learning Tree (#3)
if(!data.catalogEdits) data.catalogEdits={}; // the steward's corrections to certified catalogue cards (data/store.js applies them)
if(!data.myShelves) data.myShelves=[]; // your own named shelves — the fixed 11 traditions can't fit a real personal library
if(!data.commons) data.commons={received:[],published:[],taken:{}}; // older saves predate the Commons Table (data/visibility.js)
if(!data.commons.taken) data.commons.taken={};
// The personal shelf rides along with the certified library everywhere docs
// are read (shelves, the Index, Quill's grounding) — registered as a getter,
// not a copy, so shelving/removing a book needs no re-registration.
Store.registerPersonalDocs(()=>data.personalLibrary);
Store.registerCatalogOverrides(()=>data.catalogEdits);
setTTSSettings(data.ttsSettings);
let saveWarned=false; // only interrupt the visitor once per session, not on every failed micro-save
export function persist(){
  data.pos = { scene:state.scene, x:state.player.x, y:state.player.y };
  const ok = Store.save(data);
  if(!ok && !saveWarned){
    saveWarned=true;
    window.alert("Your browser couldn't save just now — storage may be full or blocked. "
      +"Progress from here on may not persist; Export Save from the pause menu is a good backup right now.");
  }
}

/* ----- Activity Log — a short, readable record of what actually
   happened in a visit (not a raw event stream), same "distill, don't
   hoard" instinct as agent memory. Capped so it stays a quick skim,
   not a growing transcript. */
const ACTIVITY_CAP=60;
export function logActivity(text){
  data.activityLog.unshift({ ts:new Date().toISOString(), text });
  if(data.activityLog.length>ACTIVITY_CAP) data.activityLog.length=ACTIVITY_CAP;
  persist();
}

/* ----- Badges — first-time-actions checklist / soft tutorial ----- */
export function awardBadge(id){
  if(data.badges[id]) return;
  const b=BADGES.find(x=>x.id===id); if(!b) return;
  data.badges[id]=todayKey();
  persist();
  logActivity('Earned a badge: '+b.name+'.');
  showBadgeToast(b);
}

/* ================================================================
   WHAT THE GAME REMEMBERS RIGHT NOW — and what it does NOT keep.

   `state` is the session: which panel is open, which page you are on,
   who you are talking to. It is deliberately NOT saved. `data` above
   is the save, and it is written the moment anything changes.

   That line matters to a visitor and is stated in the Your Data panel:
   close the app mid-book and the note you wrote is kept, while the page
   you were on is not. (Which is why the reader's page is moving onto
   the carried book, where it will survive.)
   ================================================================ */
export const state = {
  scene:'overworld',
  player:{ x:19,y:21,px:19,py:21,dir:'down',moving:false,tx:19,ty:21,t:0 },
  dialog:null, fishing:null, ui:null, time:0,
  shelfTradition:null, currentDoc:null, courseView:{mode:'list',id:null},
  archiveView:{mode:'list',slug:null},
  /* WHICH book the phone is showing, if you walked off with one. Genuinely a
     session question — "is the reader minimised" has no meaning after you
     close. Where you ARE in that book is `data.readingPos`, which is saved.
     Together these replaced state.readerPocket, which conflated the two and
     lost the page on every reload. */
  pocketSlug:null,
};

/* ---- A DEBT, WRITTEN DOWN. Not a design. --------------------------------

   Forty-seven more fields are assigned to `state` around the codebase and
   declared nowhere. Every one was invented at the point of use, which is
   exactly how `data.bookMarks` and `data.study` got in — both found on
   2026-08-07, both missing from the privacy line as a result, and the second
   found only because a guard was finally written for it.

   This list exists so the same thing cannot happen again silently. `npm test`
   fails if a `state.*` field appears that is neither declared above nor listed
   here, so a NEW one has to be added deliberately and in front of everybody.

   IT MAY ONLY SHRINK. Moving a name from here into the declaration above is
   always correct and needs no permission; adding one is a decision. Declaring
   all forty-seven at once is a separate pass, deliberately not done in the
   middle of feature work — see the foundation plan.                        */
export const UNDECLARED_STATE = [
  'audioReturnSlug', 'bookAudio', 'bookNotesShowAll', 'bundleView',
  'calView', 'catalogView', 'commonsView', 'courseCat', 'courseSearch',
  'courseShowArchived', 'currentPastDay', 'dissectWhere', 'foldView',
  'fullTextView', 'grantView', 'groveView', 'hallView', 'indexCategory',
  'indexSearch', 'indexSearchResults', 'indexSearching', 'lastFiling',
  'logKind', 'mlDraft', 'myLibView', 'noteLogKind', 'notesLogEdit',
  'notesLogView', 'pathView', 'planLogKind', 'plannerChat',
  'plannerNoteView', 'plannerTool', 'promptAgent',
  'researchView', 'reviewView', 'shelfDocs', 'shelfIndex', 'sidxView',
  'standUp', 'standingAgent', 'studyChat', 'studyView', 'termLast',
  'termLines', 'treeView',
];
// restore position
if(data.pos && scenes[data.pos.scene]){
  const s=scenes[data.pos.scene], px=data.pos.x, py=data.pos.y;
  if(px>0&&py>0&&px<s.w&&py<s.h&&!SOLID.has(s.tiles[py][px])){
    state.scene=data.pos.scene;
    Object.assign(state.player,{x:px,y:py,px:px,py:py,tx:px,ty:py});
  }
}
export const MOVE_TIME=0.17;

export function todayKey(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function dateKeyPlusDays(key,n){
  const d=new Date(key+'T00:00:00');
  d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
/* ----- Optional due dates — courses and grant projects can carry one,
   never required. This is the whole "reminders" surface by design: no
   popups, no alarms, just something you can glance at (the HUD badge)
   or go looking for (the Upcoming panel) if you choose to set a date at
   all. Nothing here interrupts anyone who never touches a due date. */
export function upcomingItems(){
  const items=[];
  for(const c of data.courses) if(c.due && !c.archived) items.push({kind:'course',id:c.id,title:c.title,due:c.due});
  for(const p of data.grantProjects) if(p.due) items.push({kind:'grant',id:p.id,title:p.title,due:p.due});
  // Calendar events fold into the same "what's coming" spine so the HUD
  // due badge, the Upcoming panel, and Sebastian's read all draw from one
  // place — BUTLER-SEBASTIAN-PLAN.md step 5. Only today-or-later events
  // surface: a past event has already happened and shouldn't nag as
  // "overdue" the way a missed course deadline honestly should (the
  // archived-course precedent — only surface what should truly nag).
  const today=todayKey();
  for(const e of (data.calendar||[])) if(e.date && e.date>=today) items.push({kind:'event',id:e.id,title:e.title,due:e.date,start:e.start||''});
  return items.sort((a,b)=>{
    if(a.due!==b.due) return a.due<b.due?-1:1;
    return (a.start||'').localeCompare(b.start||''); // same day: earlier time first
  });
}
export function dueSoon(days=7){
  const horizon=dateKeyPlusDays(todayKey(),days);
  return upcomingItems().filter(i=>i.due<=horizon);
}

/* ----- Sparks left not-done — READING-TO-DOING-PLAN.md steps 2-4.
   A spark already carries a `source` label whether it came from a book,
   the Research Desk, or the Grant Desk, so "across every source" is just
   this one query over data.planner, not a new data shape. Oldest day
   first, matching how pastDays() elsewhere already reads "recent" as a
   sort direction rather than a stored field. */
export function openSparks(){
  const out=[];
  for(const k of Object.keys(data.planner).sort()){
    const day=data.planner[k];
    (day.sparks||[]).forEach((s,i)=>{ if(!s.done) out.push({dayKey:k, i, ...s}); });
  }
  return out;
}

/* ---------- helpers ---------- */
export const scene=()=>scenes[state.scene];
export function tileAt(x,y){ const s=scene(); if(x<0||y<0||x>=s.w||y>=s.h) return 'T'; return s.tiles[y][x]; }
export function npcAt(x,y){ return scene().npcs.find(n=>n.x===x&&n.y===y); }
export function signAt(x,y){ return (scene().signs||[]).find(s=>s.x===x&&s.y===y); }
export function warpAt(x,y){ return (scene().warps||[]).find(w=>w.x===x&&w.y===y); }
export function stationAt(x,y){ return (scene().stations||[]).find(s=>s.x===x&&s.y===y); }
/* ----- Plantings — the Inheritance Hall's one real mechanic. Unlike every
   other interactable in the world, these live in the SAVE, not in scenes.js:
   the grove ships empty on purpose, and everything standing in it was put
   there by whoever keeps this Pavilion (or arrived as a bequest someone else
   left). Same shape as a station otherwise — a tile you face and press E on,
   and a tile you can't walk through. See BETA-BUILD-PLAN.md §8. */
export function plantings(){ return (data.grove&&data.grove.plantings)||[]; }
export function plantingAt(x,y){ return plantings().find(p=>p.x===x&&p.y===y&&(p.scene||'grove')===state.scene); }
export const PLANTABLE = new Set(['G','F','S']); // open ground only — not the path, not the trees
/* A sandbox you can wall yourself out of isn't a sandbox. Ground directly in
   front of the record stone or a sign stays free, so no arrangement of
   plantings can ever lock a visitor out of something they need to reach. */
function spotFree(s,x,y,taken){
  if(x<1||y<1||x>=s.w-1||y>=s.h-1) return false;
  if(!PLANTABLE.has(s.tiles[y][x])) return false;
  if(taken.has(x+','+y)) return false;
  const near=(list)=>[[0,0],[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>(list||[]).some(o=>o.x===x+dx&&o.y===y+dy));
  if(near(s.stations)||near(s.signs)||near(s.npcs)) return false;
  if((s.warps||[]).some(w=>w.x===x&&w.y===y)) return false;
  return true;
}
function plantedSet(sceneKey){
  return new Set(plantings().filter(p=>(p.scene||'grove')===sceneKey).map(p=>p.x+','+p.y));
}
export function canPlantAt(x,y){
  if(state.scene!=='grove') return false;
  return spotFree(scene(),x,y,plantedSet('grove'));
}
/* Where a bequest someone hands you comes up when you plant it sight-unseen.
   Deliberately NOT "the first free tile" — that piled every gift into one
   corner with its labels on top of each other. Picks the spot furthest from
   anything already in the ground, so the court fills the way a dig site does:
   scattered, worth walking around. */
export function freeGroveTile(){
  const s=scenes.grove; if(!s) return null;
  const taken=plantedSet('grove');
  const here=plantings().filter(p=>(p.scene||'grove')==='grove');
  let best=null, bestScore=-1;
  for(let y=1;y<s.h-1;y++) for(let x=1;x<s.w-1;x++){
    if(!spotFree(s,x,y,taken)) continue;
    let d=1e9;
    for(const p of here) d=Math.min(d, Math.abs(p.x-x)+Math.abs(p.y-y));
    if(d===1e9) d=Math.abs(x-s.w/2)+Math.abs(y-s.h/2); // nothing planted yet — start near the middle
    const score=d*10 - ((x*7+y*13)%7); // a little jitter so repeats don't line up
    if(score>bestScore){ bestScore=score; best={x,y}; }
  }
  return best;
}
export function blocked(x,y){
  if(SOLID.has(tileAt(x,y))) return true;
  if(npcAt(x,y)||signAt(x,y)||stationAt(x,y)||plantingAt(x,y)) return true;
  return false;
}
/* Real calendar days, never game-time — the same patience the Greenhouse idea
   and the Daoist shelf already ask for, made into the one thing in this
   Pavilion you genuinely cannot rush. */
export function daysSince(key){
  if(!key) return 0;
  const then=new Date(key+'T00:00:00'), now=new Date(todayKey()+'T00:00:00');
  if(isNaN(then)) return 0;
  return Math.max(0, Math.round((now-then)/86400000));
}
// 0 seed in the soil · 1 sprout · 2 bud · 3 in bloom (and giving seeds of its own)
export function plantStage(pl){ return pl && pl.kind==='seed' ? Math.min(3, daysSince(pl.planted)) : 3; }

/* ----- Buried things. A planting can carry a requirement: until it's met the
   thing stays under the sand, showing only as a marker, and its contents are
   not readable. Every requirement is checked against something the visitor
   genuinely did — a book actually read, days actually waited, something
   actually planted by them — never a payment, a score, or an account. The
   locked one always says plainly what it is waiting for: this is a condition,
   not a puzzle about what the condition is. */
export function requirementMet(pl){
  const h=pl&&pl.hidden; if(!h||!h.kind||h.kind==='none') return true;
  if(h.kind==='read') return !!(data.read && data.read[h.slug]);
  if(h.kind==='days') return daysSince(pl.planted) >= (h.days||0);
  if(h.kind==='planted') return plantings().some(p=>p.id!==pl.id && !p.received);
  if(h.kind==='books') return (data.personalLibrary||[]).length >= (h.count||1);
  return true;
}
export function requirementText(pl){
  const h=pl&&pl.hidden; if(!h||!h.kind||h.kind==='none') return '';
  if(h.label) return h.label;
  if(h.kind==='read') return 'read a particular book in the Library';
  if(h.kind==='days') return `wait ${h.days||0} day${(h.days||0)===1?'':'s'} from the day it was planted`;
  if(h.kind==='planted') return 'plant something of your own here first';
  if(h.kind==='books') return `bring ${h.count||1} book${(h.count||1)===1?'':'s'} of your own into the Library`;
  return '';
}
export function facingTile(){
  const p=state.player, d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[p.dir];
  return {x:p.x+d[0],y:p.y+d[1]};
}
export function opposite(d){ return {up:'down',down:'up',left:'right',right:'left'}[d]; }

/* ================================================================
   NPC wander
   ================================================================ */
export function updateNPCs(dt){
  if(state.dialog) return;
  for(const n of scene().npcs){
    if(!n.wander) continue;
    n.clock=(n.clock||Math.random()*2)-dt;
    if(n.clock<=0){
      n.clock=1.6+Math.random()*2.4;
      const dirs=[[0,-1],[0,1],[-1,0],[1,0]], [dx,dy]=dirs[Math.floor(Math.random()*4)];
      const nx=n.x+dx, ny=n.y+dy;
      const home=n.home||(n.home={x:n.x,y:n.y});
      if(Math.abs(nx-home.x)<=2&&Math.abs(ny-home.y)<=2&&!blocked(nx,ny)
         &&!(nx===state.player.x&&ny===state.player.y)&&!warpAt(nx,ny)){ n.x=nx; n.y=ny; }
    }
  }
}

/* ================================================================
   Fishing
   ================================================================ */
const FISH=[
  {name:'Sand Carp',w:30,flavor:"A stout, patient fish. It seems unbothered by the whole affair."},
  {name:'Dusk Koi',w:22,flavor:"Its scales hold the last color of the evening. You let it go — it lives here."},
  {name:'Lantern Eel',w:12,flavor:"It glows faintly, like a reading lamp with opinions."},
  {name:'Paper Boat',w:10,flavor:"Someone's wish, folded and released upstream. You set it sailing again."},
  {name:'Marginalia Minnow',w:9,flavor:"Small enough to miss, covered in scratches that almost look like handwriting."},
  {name:'Quiet Catfish',w:8,flavor:"It has clearly been down there thinking about something for a very long time."},
  {name:'Old Boot',w:7,flavor:"Every pond has one. Tradition, probably."},
  {name:'Bell Carp',w:5,flavor:"A faint chime rings somewhere below the surface each time it turns. No one has explained this."},
  {name:'Pearl of Impermanence',w:4,flavor:"It dissolves the moment you hold it. It still counts. Everything does."},
  {name:'The One That Got Away, Again',w:2,flavor:"You've caught this exact fish before. It remembers you too, and is not impressed."},
];
function rollFish(){ const tot=FISH.reduce((a,f)=>a+f.w,0); let r=Math.random()*tot;
  for(const f of FISH){ if((r-=f.w)<0) return f; } return FISH[0]; }
// A whimsical stat, not a simulation — every catch gets its own size so the
// log (Inventory) reads as a real keepsake tally, not just a running count.
const FISH_LOG_CAP=200;
function rollSize(){ return Math.round((2.5+Math.random()*19.5)*10)/10; }
export function startFishing(tile){ state.fishing={phase:'cast',t:0,until:.55,tile}; blip(500,.07); awardBadge('first-cast'); }
export function updateFishing(dt){
  const f=state.fishing; if(!f) return;
  f.t+=dt;
  if(f.phase==='cast'&&f.t>=f.until){ f.phase='wait'; f.t=0; f.until=1.2+Math.random()*2.6; }
  else if(f.phase==='wait'&&f.t>=f.until){ f.phase='bite'; f.t=0; f.until=.8; blip(988,.1,'square',.06); }
  else if(f.phase==='bite'&&f.t>=f.until){
    state.fishing=null; jingleMiss();
    openDialog('…',"The line goes slack.\nWhatever it was, it kept its own counsel.");
  }
}
export function fishingAction(){
  const f=state.fishing;
  if(f.phase==='bite'){
    const c=rollFish(); const size=rollSize(); data.fish++;
    data.fishLog.unshift({name:c.name,size,ts:todayKey()});
    if(data.fishLog.length>FISH_LOG_CAP) data.fishLog.length=FISH_LOG_CAP;
    setHud(); persist();
    logActivity('Caught a '+c.name+' ('+size+'") at the pond.');
    state.fishing=null; jingleCatch();
    openDialog('CAUGHT: '+c.name+'!',c.flavor+'\n\nAbout '+size+' inches, nose to tail.');
  } else { state.fishing=null; openDialog('…',"You reel in early. The pond forgives you."); }
}
