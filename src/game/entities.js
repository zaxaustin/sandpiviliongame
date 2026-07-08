import { Store } from './data/store.js';
import { scenes, SOLID } from './scenes.js';
import { openDialog, showBadgeToast } from './ui/overlays.js';
import { jingleCatch, jingleMiss, blip, setHud } from './main.js';
import { BADGES } from './data/badges.js';
import { onAuthChange, isLoggedIn, getAuthState } from './data/auth.js';

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
export function freshData(){ return { saveVersion:SAVE_VERSION, fish:0, read:{}, planner:{}, courses:[], pos:null, aiConnections:DEFAULT_CONNECTIONS.map(c=>({...c})), agentMemory:{}, chatNotes:{}, workshop:{docs:[],research:[]}, grantProjects:[], waypoints:[], activityLog:[], badges:{}, bookRequests:[], inventory:[], reviewQueue:[], ideas:[] }; }
export const data = Object.assign(freshData(), Store.load() || {});
// Object.assign is a shallow merge — an existing save's `workshop:{docs:[...]}`
// (from before the Research Desk existed) replaces freshData()'s `workshop`
// wholesale, silently dropping the new `research` field. Patch it back in.
if(!data.workshop.research) data.workshop.research=[];
let saveWarned=false; // only interrupt the visitor once per session, not on every failed micro-save
export function persist(){
  data.pos = { scene:state.scene, x:state.player.x, y:state.player.y };
  const ok = Store.save(data);
  if(!ok && !saveWarned){
    saveWarned=true;
    window.alert("Your browser couldn't save just now — storage may be full or blocked. "
      +"Progress from here on may not persist; Export Save from the pause menu is a good backup right now.");
  }
  queueAccountPush();
}

/* ----- Account save sync (Phase 3, optional) — localStorage stays the
   one always-on save; a logged-in account is a backup/sync target on
   top of it, never a replacement. Every persist() (debounced, since
   persist() itself fires on nearly every micro-action) pushes a copy up
   if a session exists. The one moment that needs a real decision — this
   account already has a save from another device — asks plainly and
   explicitly, the same way Import Save already does, rather than
   silently picking a winner. */
const ACCOUNT_PUSH_DEBOUNCE_MS = 2000;
let pushTimer=null;
function queueAccountPush(){
  if(!isLoggedIn()) return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(()=>{
    const { session } = getAuthState();
    if(session) Store.pushAccountSave(session.user.id, data);
  }, ACCOUNT_PUSH_DEBOUNCE_MS);
}
let reconciledUserId=null;
onAuthChange(async (authState)=>{
  const uid = authState.session?.user?.id;
  if(!uid || reconciledUserId===uid) return;
  reconciledUserId=uid;
  const remote = await Store.pullAccountSave(uid);
  if(!remote){ Store.pushAccountSave(uid, data); return; } // nothing to lose — first sync
  const useRemote = window.confirm(
    "This account already has a saved Pavilion from another device.\n\n"
    +"OK — load that save here (replaces what's on this device).\n"
    +"Cancel — keep this device's save (this overwrites the account's saved copy instead)."
  );
  if(useRemote){ Store.save(remote.data); location.reload(); }
  else Store.pushAccountSave(uid, data);
});

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

export const state = {
  scene:'overworld',
  player:{ x:19,y:21,px:19,py:21,dir:'down',moving:false,tx:19,ty:21,t:0 },
  dialog:null, fishing:null, ui:null, time:0,
  shelfTradition:null, currentDoc:null, courseView:{mode:'list',id:null},
  archiveView:{mode:'list',slug:null},
};
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
  for(const c of data.courses) if(c.due) items.push({kind:'course',id:c.id,title:c.title,due:c.due});
  for(const p of data.grantProjects) if(p.due) items.push({kind:'grant',id:p.id,title:p.title,due:p.due});
  return items.sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0);
}
export function dueSoon(days=7){
  const horizon=dateKeyPlusDays(todayKey(),days);
  return upcomingItems().filter(i=>i.due<=horizon);
}

/* ---------- helpers ---------- */
export const scene=()=>scenes[state.scene];
export function tileAt(x,y){ const s=scene(); if(x<0||y<0||x>=s.w||y>=s.h) return 'T'; return s.tiles[y][x]; }
export function npcAt(x,y){ return scene().npcs.find(n=>n.x===x&&n.y===y); }
export function signAt(x,y){ return (scene().signs||[]).find(s=>s.x===x&&s.y===y); }
export function warpAt(x,y){ return (scene().warps||[]).find(w=>w.x===x&&w.y===y); }
export function stationAt(x,y){ return (scene().stations||[]).find(s=>s.x===x&&s.y===y); }
export function blocked(x,y){
  if(SOLID.has(tileAt(x,y))) return true;
  if(npcAt(x,y)||signAt(x,y)||stationAt(x,y)) return true;
  return false;
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
    const c=rollFish(); data.fish++; setHud(); persist();
    logActivity('Caught a '+c.name+' at the pond.');
    state.fishing=null; jingleCatch();
    openDialog('CAUGHT: '+c.name+'!',c.flavor);
  } else { state.fishing=null; openDialog('…',"You reel in early. The pond forgives you."); }
}
