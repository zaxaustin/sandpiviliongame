/* ================================================================
   [THE TUTORIAL PANEL] — and the welcome panel that is now its front
   door.

   ITS OWN MODULE, because overlays.js is 13,600 lines and this
   codebase says so in two places already (index.html's daily-tasks
   comment, and ui/daily-tasks.js's own header: "a new room does not go
   in there"). Same seam as ui/daily-tasks.js — pure rules in
   data/tutorial.js, panel here, dependencies injected rather than
   imported sideways.

   WHAT THIS FILE MAY NOT DO, and each is a temptation:

     · It never opens itself. Three presses reach it — the welcome
       panel, the pause menu, and ☀ Today's day-one item — and nothing
       else. `npm test` asserts main.js never names openTutorial.
     · It never re-opens after a beat is completed. You carried the
       book in the Reader; this panel was closed at the time and stays
       closed until you come back to it.
     · It never writes anything derivable. Badges fire at their own
       call sites for their own reasons; this only reads them.
     · No HUD chip, no nag, no "continue where you left off" toast. A
       persistent reminder is software that wants something from you.
     · No skip button — there is nothing to skip from, because it never
       appears unbidden. Esc closes it like everything else.

   Four presses write to the save in the whole tutorial: starting it,
   two judgement ticks, and recording a graduation. Everything else on
   screen is computed from facts that already existed.
   ================================================================ */
import { state, data, persist, todayKey } from '../entities.js';
import { esc, jsq } from './dom.js';
import {
  STAGES, STAGE_COUNT, stageState, currentStage,
  readyChecks, canGraduate, MISSIONS_NOT_BUILT, TUTORIAL_NOTICE,
} from '../data/tutorial.js';
import { PLACES } from '../data/places.js';

/* Injected, never imported: lessonDone() and curriculumNode() live in
   ui/lesson-tree.js, and ui/ importing ui/ sideways is the one shape
   the module seam here exists to prevent. overlays.js already holds
   both and hands them over. */
let X = {};
export function initTutorial(deps){ X = deps || {}; }

/* WHICH COURSE STAGE 5 IS ABOUT — a module-local, not state.*, and that is
   the guard's doing rather than mine. entities.js's UNDECLARED_STATE list may
   only ever shrink, so a new state.* field is a decision made in front of
   everybody; this is session-only UI selection, the same kind of thing
   paceTimer and dropToastTimer already are in overlays.js. Nothing to
   persist: which one you were looking at is not part of your record. */
let pickedId = '';
function pickedLesson(){
  const mine = data.myLessons || [];
  if(pickedId && mine.some(l => l && l.id === pickedId)) return pickedId;
  return (mine[0] || {}).id || '';
}

function store(){
  return {
    catalogueCount: (X.allDocsCount ? X.allDocsCount() : 0),
    badges: data.badges || {},
    dailyTasks: data.dailyTasks || [],
    myLessons: data.myLessons || [],
    commons: data.commons || { published: [] },
    lessonsDone: (data.myLessons || [])
      .filter(l => l && X.lessonDone && X.lessonDone(l)).map(l => l.id),
    tutorial: tut(),
  };
}
/* The three fields, and nothing else, ever. entities.js backfills this;
   the accessor exists so a save written before today cannot throw. */
function tut(){
  if(!data.tutorial) data.tutorial = { started:'', ready:{}, graduated:null };
  if(!data.tutorial.ready) data.tutorial.ready = {};
  return data.tutorial;
}

/* ---------- the doors ----------
   Resolved through data/places.js where the destination is a room, and
   by a bare door name where it is a panel PLACES does not list. No
   second door table — the same argument daily-tasks.js's stepDoor()
   makes, and npm test crosses every one of them against the window
   export block. */
function beatDoor(b){
  if(b.place){ const p = PLACES[b.place]; return p ? { door:p.door, label:p.icon+' '+p.label } : null; }
  if(b.door) return { door:b.door, label:doorLabel(b.door) };
  return null;
}
function doorLabel(d){
  const hit = Object.values(PLACES).find(p => p && p.door === d);
  if(hit) return hit.icon+' '+hit.label;
  return ({ openRoster:'👥 Who to ask', openConnections:'⚙ Manage AI connections',
            openDailyTasks:'📋 Today’s Tasks', openNotesLog:'🗒 Your Notes' })[d] || d;
}
/* THE PRESS. Same shape as dailyTaskGo() — it says out loud when a door
   is not wired rather than doing nothing, because a silent dead button
   is the thing this house keeps shipping. */
export function tutorialGo(door){
  if(typeof window[door] !== 'function'){
    const el = document.getElementById('tutMsg');
    if(el) el.textContent = 'That door is not wired: '+door+'(). Worth reporting.';
    return;
  }
  if(X.closeUI) X.closeUI();
  window[door]();
}

/* ---------- opening it ---------- */
export function openTutorial(){
  state.ui = 'tutorial';
  if(X.hideAllOv) X.hideAllOv();
  renderTutorial();
  if(X.showOv) X.showOv('tutorialOv');
}
/* The one press that says "yes, walk me through it". The only reason
   this is stored at all: whether you CHOSE to be walked through is a
   different question from what you have done, and the welcome packet
   will hang off it later. */
export function tutorialStart(){
  const t = tut();
  if(!t.started){ t.started = todayKey(); persist(); }
  openTutorial();
}

function beatRow(b){
  const d = beatDoor(b);
  return `<div class="card" style="cursor:default;${b.done?'opacity:.72':''}">
    <div class="t">${b.done ? '✓' : '○'} ${esc(b.text)}</div>
    ${b.note ? `<div class="s" style="margin-top:4px">${esc(b.note)}</div>` : ''}
    ${!b.done && d ? `<div class="row" style="margin-top:8px">
      <button class="btn" onclick="tutorialGo('${jsq(d.door)}')">${esc(d.label)}</button></div>` : ''}
  </div>`;
}
function asideRow(a){
  return `<div class="s" style="margin-top:6px;opacity:.85">· ${esc(a.text)}
    ${a.door ? ` <button class="btn ghost" style="font-size:11px;padding:2px 8px"
      onclick="tutorialGo('${jsq(a.door)}')">${esc(doorLabel(a.door))}</button>` : ''}</div>`;
}

/* WHAT A FINISHED STAGE SHOWS. Collapsed, with what actually proved it —
   so the steward, who did all of this organically long before the
   tutorial existed, can re-read any stage after features drift without
   having to undo his own save to get at it. That was the second reason
   this thing exists at all. */
function doneRow(st){
  const ev = st.beats.filter(b => b.done).map(b => b.text.toLowerCase()).join(' · ');
  return `<details class="card" style="cursor:default;opacity:.78">
    <summary style="cursor:pointer;color:#7fa36b">✓ ${st.n} · ${esc(st.title)}${ev ? ' — ' + esc(ev) : ''}</summary>
    <div class="s" style="margin-top:6px">${esc(st.why)}</div>
    ${(st.asides||[]).map(asideRow).join('')}
  </details>`;
}

export function renderTutorial(){
  const el = document.getElementById('tutorialPanel'); if(!el) return;
  const s = store();
  const stages = stageState(s);
  const now = currentStage(s);
  const done = stages.filter(x => x.done).length;

  const body = stages.map(st => {
    if(st.done) return doneRow(st);
    /* ONE NEXT THING AT A TIME. A stage that is not reached yet is
       named by number and nothing else — its title, its beats and its
       reasoning are not described until it is the one in front of you. */
    if(!st.current) return `<div class="s" style="opacity:.4;margin:6px 0">${st.n} · not yet</div>`;
    return `<div class="card" style="cursor:default;border-color:#e0a43c">
      <div class="t">${st.icon} ${st.n} · ${esc(st.title).toUpperCase()}</div>
      <div class="s" style="margin-top:5px">${esc(st.why)}</div>
      ${st.n === STAGE_COUNT ? stageFive(s) : st.beats.map(beatRow).join('')}
      ${(st.asides||[]).map(asideRow).join('')}
      ${st.closing && st.beats.length && st.beats.every(b=>b.done)
        ? `<div class="s" style="margin-top:8px;color:#7fa36b">${esc(st.closing)}</div>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🧭 A walk through the Pavilion</h2>
    <div class="meta">${esc(TUTORIAL_NOTICE)}</div>
    <div class="meta" style="margin-top:6px">${done} of ${STAGE_COUNT} done${
      now > STAGE_COUNT ? ' — all of it.' : ''}</div>
    <div id="tutMsg" class="meta" style="color:var(--danger-soft)"></div>
    ${body}
    ${now > STAGE_COUNT ? `<div class="card" style="cursor:default;margin-top:12px;border-color:#7fa36b">
      <div class="t">You have walked all five</div>
      <div class="s" style="margin-top:4px">Any stage above still opens — this is as much a way to
        re-read what the place is for as it is a first arrival.</div></div>` : ''}
    <div class="row" style="margin-top:12px">
      <button class="btn ghost" onclick="closeUI()">I’ll look around on my own</button>
    </div>`;
}

/* ---------- Stage 5 ---------- */
function stageFive(s){
  const mine = s.myLessons || [];
  if(!mine.length){
    return `<div class="s" style="margin-top:8px">This one is about a course of your own, and there is
      not one yet — stage 4 is where that starts.</div>`;
  }
  const picked = pickedLesson();
  const rows = readyChecks(s, picked);
  const g = canGraduate(s, picked);
  const grad = (s.tutorial && s.tutorial.graduated) || null;
  const ready = (s.tutorial.ready && s.tutorial.ready[picked]) || {};

  if(grad){
    return `<div class="card" style="cursor:default;margin-top:8px;border-color:#7fa36b">
      <div class="t">✓ Recorded — ${esc(grad.on)}</div>
      <div class="s" style="margin-top:4px">${esc(MISSIONS_NOT_BUILT)}</div>
    </div>`;
  }
  return `
    <div class="row" style="margin:8px 0;gap:6px;align-items:center">
      <span class="meta" style="margin:0">Which one</span>
      <select onchange="tutorialPickLesson(this.value)" style="flex:1">
        ${mine.map(l => `<option value="${esc(l.id)}"${l.id===picked?' selected':''}>${esc(l.title||'Untitled')}</option>`).join('')}
      </select>
    </div>
    ${rows.map(r => `<div class="card" style="cursor:default;${r.done?'opacity:.75':''}">
      <div class="t">${r.done?'✓':'○'} ${esc(r.text)}</div>
      ${r.note ? `<div class="s" style="margin-top:4px">${esc(r.note)}</div>` : ''}
      ${r.kind==='derived' ? `<div class="s" style="margin-top:4px;opacity:.7">The Pavilion can see this one.</div>` : ''}
      ${r.id==='standsAlone' && !r.done ? `<div class="row" style="margin-top:6px">
        <button class="btn ghost" style="font-size:11px;padding:3px 10px"
          onclick="tutorialTickReady('standsAlone')">Yes — it stands alone</button></div>` : ''}
      ${r.id==='outcome' ? `<div class="row" style="margin-top:6px">
        <input type="text" id="tutOutcome" placeholder="in one line: what does walking this produce?"
          value="${esc(ready.outcome||'')}" style="flex:1">
        <button class="btn ghost" style="font-size:11px;padding:3px 10px"
          onclick="tutorialSetOutcome()">Keep</button></div>` : ''}
      ${r.id==='left' && !r.done ? `<div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">
        <button class="btn" style="font-size:11px;padding:3px 10px"
          onclick="tutorialPublish()">🤝 Publish it here</button>
        <button class="btn ghost" style="font-size:11px;padding:3px 10px"
          onclick="tutorialTickReady('licensed')">I handed the file over myself</button></div>` : ''}
    </div>`).join('')}
    <div class="row" style="margin-top:10px">
      <button class="btn" onclick="tutorialRecordGraduation()">Record this</button>
    </div>
    ${!g.ok ? `<div class="s" style="margin-top:6px;opacity:.8">Not yet — ${esc(g.missing[0])}</div>` : ''}
    <div class="s" style="margin-top:10px;opacity:.85">${esc(MISSIONS_NOT_BUILT)}</div>`;
}

export function tutorialPickLesson(id){ pickedId = id; renderTutorial(); }
/* One of the two judgements code cannot make. A press, and it writes
   exactly one field. */
export function tutorialTickReady(which){
  const id = pickedLesson(); if(!id) return;
  const t = tut();
  t.ready[id] = t.ready[id] || {};
  t.ready[id][which] = todayKey();
  persist(); renderTutorial();
}
export function tutorialSetOutcome(){
  const box = document.getElementById('tutOutcome'); if(!box) return;
  const id = pickedLesson(); if(!id) return;
  const t = tut();
  t.ready[id] = t.ready[id] || {};
  t.ready[id].outcome = box.value.trim();
  persist(); renderTutorial();
}
/* Straight into the publish flow built 2026-08-09, reason screen and
   all — not a second publishing path. */
export function tutorialPublish(){
  const id = pickedLesson(); if(!id) return;
  if(X.publishFrom) X.publishFrom('lesson', id);
}
export function tutorialRecordGraduation(){
  const id = pickedLesson();
  const g = canGraduate(store(), id);
  const msg = document.getElementById('tutMsg');
  /* REFUSES OUT LOUD. Five rows, and it says which one is missing —
     a button that quietly declines is the same as a broken one. */
  if(!g.ok){ if(msg) msg.textContent = 'Not yet — '+g.missing[0]; return; }
  const t = tut();
  t.graduated = { on: todayKey(), lesson: id };
  persist();
  renderTutorial();
}
