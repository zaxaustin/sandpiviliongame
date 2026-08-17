/* ================================================================
   [TODAY'S TASKS] — the board, and the doors it points at.

   Built 2026-08-08. Named by the steward: "we can call it daily
   tasks instead of missions, you cant do missions unless you
   graduate lol."

   THIS BOARD DIRECTS; IT NEVER DUPLICATES A SURFACE. Every step
   except `world` opens a room that already exists — the Request
   Board, the Reader, the lesson writer, the tree, the desk, the Lab,
   a resident, the Notes Log. The rules live in data/daily-tasks.js,
   pure and tested; this file is the panel and nothing else.

   IT IS ITS OWN MODULE ON PURPOSE. The steward asked whether the
   agent pathways were getting too complex; measured, they are the
   simplest part of the codebase and overlays.js is the problem —
   12,317 lines, back UP from 11,138 after two extractions. So a new
   room does not go in there. Same seam as ui/study-table.js:
   initDailyTasks() is filled once by overlays.js, nothing imports
   backwards, and the window-export block stays where it lives.

   THE DATE IS A FRAMING DEVICE, NOT A STICK. Nothing on this screen
   counts down, turns red, or says "late". It says today, and the
   only work that word does is make you pick a size you can finish.
   ================================================================ */

import { state, data, persist, todayKey, logActivity, awardBadge } from '../entities.js';
import { blip } from '../main.js';
import { esc, jsq } from './dom.js';
import {
  STEP_WHERE, WHERE_KEYS, stepDoor, isToday, activeTask, earlierToday, beforeToday,
  stepsDone, allDone, canTake, closeOut, streakAfter, TASKS_NOTICE,
  TASK_TAGS, tagOf,
} from '../data/daily-tasks.js';
import { Store } from '../data/store.js';
import { ROLES, ROLE_KEYS } from '../data/roles.js';

/* WHAT A STEP NEEDS POINTING AT. `read` and `plan` need a book; `ask` needs a
   resident. Declared in STEP_WHERE as `needsRef` since the first draft and
   HONOURED BY NOTHING until the live suite pressed the button and no room
   opened — openReader(undefined) returns silently, which is the dead end this
   whole board exists to remove. */
function refChoices(where) {
  if (where === 'ask') return ROLE_KEYS.map(k => ({ v: k, t: ROLES[k].label }));
  if (where === 'read' || where === 'plan') {
    let docs = []; try { docs = Store.allDocs() || []; } catch (e) { docs = []; }
    return docs.slice(0, 300).map(d => ({ v: d.slug, t: d.title }));
  }
  return [];
}

/* Injected once, at import time in overlays.js. */
let X = {};
export function initDailyTasks(deps) { X = deps || {}; }
const hideAllOv   = (...a) => X.hideAllOv(...a);
const showOv      = (...a) => X.showOv(...a);
const closeUI     = (...a) => X.closeUI(...a);
const plannerDayFor = (...a) => X.plannerDayFor(...a);
const setHud      = (...a) => X.setHud(...a);

const tasks = () => { if (!Array.isArray(data.dailyTasks)) data.dailyTasks = []; return data.dailyTasks; };
const stats = () => { if (!data.taskStats) data.taskStats = { done:0, streak:0, best:0, lastDone:'' }; return data.taskStats; };

/* ---- THE DAY TURNING OVER ---------------------------------------------

   Called on open, never on a timer — no background polling, nothing moves by
   itself. closeOut() is pure and idempotent; this is the one place its result
   is written, and writing it twice is the first thing the tests break. */
export function closeOutPastDays() {
  const { tasks: next, entries, changed } = closeOut(tasks(), todayKey());
  if (!changed) return 0;
  for (const { dayKey, entry } of entries) {
    const day = plannerDayFor(dayKey);
    if (!day) continue;
    if (!day.log) day.log = [];
    day.log.push({ id: Date.now() + Math.floor(Math.random() * 1000), ...entry });
  }
  data.dailyTasks = next;
  persist();
  return entries.length;
}

export function openDailyTasks() {
  closeOutPastDays();
  state.ui = 'dailyTasks';
  hideAllOv(); renderDailyTasks(); showOv('dailyTasksOv');
}

/* ★ WHICH KIND OF DAY'S WORK THIS IS. One small badge, because the steward
   wanted learning and the rest of life to read apart on the same board
   without becoming two boards. Derived where it can be (a task from a course
   is study), stored only where a person had to say. */
function tagBadge(t) {
  const k = tagOf(t), v = TASK_TAGS[k];
  if (!v) return '';
  const colour = k === 'learning' ? '#8fb4d9' : '#7fa36b';
  return `<span class="badge" style="border-color:${colour};color:${colour}">${v.icon} ${v.label}</span>`;
}

/* ---- the board -------------------------------------------------------- */
function stepRow(t, i) {
  const s = (t.steps || [])[i]; if (!s) return '';
  const w = STEP_WHERE[s.where] || STEP_WHERE.world;
  const door = stepDoor(s.where);
  /* `world` has no door and that is the design: going to the library and
     wiring a circuit happen out there. A button would pretend otherwise. */
  const go = door
    ? `<button class="btn ghost" style="font-size:11px" onclick="event.stopPropagation();dailyTaskGo(${i})"
         title="${esc(w.label)}">${w.icon} open</button>`
    : `<span class="badge" style="border-color:#8a7a63;color:#9c8b74" title="Out in the world — the Pavilion just holds it">🌍 out there</span>`;
  return `<div class="card" style="cursor:default;${s.done ? 'opacity:.62' : ''}">
    <div class="t" style="${s.done ? 'text-decoration:line-through' : ''}">${s.done ? '✓' : '○'} ${esc(s.text)}</div>
    <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
      <button class="btn ${s.done ? 'ghost' : ''}" style="font-size:11px" onclick="toggleDailyTaskStep(${i})">
        ${s.done ? 'not yet' : '✓ done'}</button>
      ${go}
    </div>
  </div>`;
}

function renderDailyTasks() {
  const el = document.getElementById('dailyTasksPanel'); if (!el) return;
  const today = todayKey();
  const live = activeTask(tasks(), today);
  const done = earlierToday(tasks(), today);
  const past = beforeToday(tasks(), today).slice(0, 12);
  const st = stats();
  /* Two sections, because they are two different claims. Work finished TODAY
     used to sit under a heading reading "Before today", with its own date
     printed underneath contradicting it — caught by reading the screenshot. */
  const card = (t, when) => `
    <div class="card" style="cursor:default">
      <div class="t">${esc(when)} · ${esc(t.title || 'Today')}</div>
      <div class="s">${stepsDone(t)} of ${(t.steps || []).length} done</div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" style="font-size:11px" onclick="retakeDailyTask('${jsq(String(t.id))}')">↻ Do this again today</button>
      </div>
    </div>`;

  const streakLine = st.done
    ? `<div class="meta">🔥 ${st.streak} day${st.streak === 1 ? '' : 's'} in a row · ${st.done} finished in all${st.best > st.streak ? ' · best ' + st.best : ''}</div>`
    : '';

  const body = live ? `
    <div class="card" style="cursor:default;border-color:#7fa36b">
      <div class="t">${esc(live.title || 'Today')} ${tagBadge(live)}</div>
      ${live.source && live.source.label
        ? `<div class="s">part of <b>${esc(live.source.label)}</b> — one sitting at a time</div>` : ''}
      <div class="s" style="margin-top:4px">${stepsDone(live)} of ${(live.steps || []).length} done</div>
    </div>
    ${(live.steps || []).map((_, i) => stepRow(live, i)).join('')}
    <div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">
      ${allDone(live)
        ? `<button class="btn" onclick="finishDailyTask()">✓ Finish the day's work</button>`
        : `<button class="btn ghost" onclick="finishDailyTask()">Finish anyway — record what I did</button>`}
      <button class="btn ghost" onclick="setDownDailyTask()">Set it down</button>
    </div>
    <div class="meta" id="dailyTaskMsg" style="margin-top:8px"></div>`
  /* "Nothing set for today yet" is not true once you have finished something
     today — the same species of small lie as the "Before today" heading, and
     spotted in the same screenshot. Two states, two sentences. */
  : done.length
  ? `<p style="color:#9c8b74">That is ${done.length === 1 ? 'a day\'s work' : 'two sittings'} done.
      Set more if you have the day for it — or leave it here, which is also a finished day.</p>
    <div class="meta" id="dailyTaskMsg"></div>`
  : `<p style="color:#9c8b74">Nothing set for today yet. Write down the two or three things you
      actually mean to do — the point is the size, not the list.</p>
    <div class="meta" id="dailyTaskMsg"></div>`;

  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>📋 Today's Tasks</h2>
    <div class="meta">${esc(TASKS_NOTICE)}</div>
    ${streakLine}
    ${body}
    ${live ? '' : newTaskForm()}
    ${done.length ? `
      <h3 style="margin-top:22px">Already done today</h3>
      <div class="meta">Finished and recorded. You can set more work if you have the day for it.</div>
      ${done.map(t => card(t, 'today')).join('')}` : ''}
    ${past.length ? `
      <h3 style="margin-top:22px">Before today</h3>
      <div class="meta">What you set out to do, and what you got to. Take any of it up again.</div>
      ${past.map(t => card(t, t.taken || '')).join('')}` : ''}`;
}

/* The form. Deliberately plain: three step slots, because the whole point is
   a size you can finish, and a form with ten rows invites ten rows. */
function newTaskForm() {
  const opts = WHERE_KEYS.map(k =>
    `<option value="${k}">${STEP_WHERE[k].icon} ${esc(STEP_WHERE[k].label)}</option>`).join('');
  return `
    <h3 style="margin-top:20px">Set today's work</h3>
    <label>What are you doing today?</label>
    <input type="text" id="dtTitle" placeholder="e.g. Start on Tesla's notebooks">
    <label>Part of something bigger? (optional)</label>
    <input type="text" id="dtSource" placeholder="e.g. Learning electronics">
    ${[0, 1, 2].map(i => `
      <label style="margin-top:8px">Step ${i + 1}${i ? ' (optional)' : ''}</label>
      <div class="row" style="gap:6px">
        <input type="text" id="dtStep${i}" placeholder="${i === 0 ? 'e.g. Get a book on Tesla into the Library' : ''}" style="flex:1">
        <select id="dtWhere${i}" style="max-width:180px" onchange="dailyTaskWhereChanged(${i})">${opts}</select>
      </div>
      <div class="row" id="dtRefRow${i}" style="gap:6px;display:none;margin-top:4px">
        <select id="dtRef${i}" style="flex:1"></select>
      </div>`).join('')}
    <div class="row" style="margin-top:14px"><button class="btn" onclick="takeDailyTask()">📋 Set it for today</button></div>`;
}

/* ---- the verbs -------------------------------------------------------- */
function say(t) { const el = document.getElementById('dailyTaskMsg'); if (el) el.textContent = t; }

/* Show the second picker only for the kinds that genuinely need one, and fill
   it from real things — books that are actually shelved, residents who
   actually exist. A step whose door needs a target and has none is a button
   that does nothing. */
export function dailyTaskWhereChanged(i) {
  const where = (document.getElementById('dtWhere' + i)?.value || '');
  const row = document.getElementById('dtRefRow' + i);
  const sel = document.getElementById('dtRef' + i);
  if (!row || !sel) return;
  const choices = refChoices(where);
  if (!choices.length) { row.style.display = 'none'; sel.innerHTML = ''; return; }
  sel.innerHTML = choices.map(c => `<option value="${jsq(c.v)}">${esc(c.t)}</option>`).join('');
  row.style.display = '';
}

export function takeDailyTask() {
  const today = todayKey();
  const gate = canTake(tasks(), today);
  if (!gate.ok) { say(gate.reason); return; }          // never a silent no-op
  const title = (document.getElementById('dtTitle')?.value || '').trim();
  if (!title) { say('Give it a name first — one line is enough.'); return; }
  const srcLabel = (document.getElementById('dtSource')?.value || '').trim();
  const steps = [];
  for (const i of [0, 1, 2]) {
    const text = (document.getElementById('dtStep' + i)?.value || '').trim();
    if (!text) continue;
    const where = (document.getElementById('dtWhere' + i)?.value || 'world');
    const w = STEP_WHERE[where] ? where : 'world';
    const ref = STEP_WHERE[w].needsRef ? (document.getElementById('dtRef' + i)?.value || '') : '';
    if (STEP_WHERE[w].needsRef && !ref) {
      say('Step ' + (i + 1) + ' needs something to point at — pick one, or set it to "out in the world".');
      return;
    }
    steps.push({ text, where: w, ref, done: false });
  }
  if (!steps.length) { say('Add at least one step — what is the first thing you will actually do?'); return; }
  tasks().unshift({ id: Date.now(), title, taken: today,
    source: srcLabel ? { kind: 'free', ref: '', label: srcLabel } : null,
    steps, closed: false });
  persist(); logActivity('Set today\'s work: "' + title + '".'); blip(740, .07);
  renderDailyTasks(); setHud();
}

export function toggleDailyTaskStep(i) {
  const t = activeTask(tasks(), todayKey()); if (!t) return;
  const s = (t.steps || [])[i]; if (!s) return;
  s.done = !s.done; persist(); blip(s.done ? 820 : 520, .05);
  renderDailyTasks();
}

/* One press to the room that does it — the whole reason a step names a
   `where`. Resolved through STEP_WHERE so the door can never drift from the
   table npm test checks against the window exports. */
export function dailyTaskGo(i) {
  const t = activeTask(tasks(), todayKey()); if (!t) return;
  const s = (t.steps || [])[i]; if (!s) return;
  const door = stepDoor(s.where); if (!door) return;
  const fn = window[door];
  if (typeof fn !== 'function') { say('That door is not wired: ' + door + '(). Say so rather than doing nothing.'); return; }
  /* A STEP THAT NEEDS A TARGET AND HAS NONE MUST SAY SO. Found by the live
     suite pressing this button: openReader(undefined) returns silently, so the
     step looked live and did nothing at all — the exact failure this board was
     built to remove, reproduced inside the board itself. */
  if (STEP_WHERE[s.where] && STEP_WHERE[s.where].needsRef && !s.ref) {
    say('This step does not say which one — it was saved without a target, so there is nowhere to send you.');
    return;
  }
  closeUI();
  try { s.ref ? fn(s.ref) : fn(); } catch (e) { say('That door did not open: ' + e.message); }
}

export function finishDailyTask() {
  const today = todayKey();
  const t = activeTask(tasks(), today); if (!t) return;
  const done = stepsDone(t), total = (t.steps || []).length;
  t.closed = true;
  const day = plannerDayFor(today);
  if (day) {
    if (!day.log) day.log = [];
    day.log.push({ id: Date.now(), kind: 'task', done: done === total && total > 0,
      text: '📋 ' + (t.title || 'Today\'s tasks') + ' — ' + done + ' of ' + total + ' done'
          + (total - done ? ' (' + (total - done) + ' left)' : '') });
  }
  /* THE TALLY ONLY MOVES ON A WHOLE DAY'S WORK. Half a day recorded is honest
     and worth keeping; it is not a finished day and must not extend a streak. */
  if (done === total && total > 0) {
    data.taskStats = streakAfter(stats(), today);
    awardBadge('first-task');
    const s = data.taskStats;
    if (s.done >= 5) awardBadge('five-tasks');
    if (s.done >= 25) awardBadge('twentyfive-tasks');
    if (s.streak >= 3) awardBadge('streak-3');
    if (s.streak >= 7) awardBadge('streak-7');
    if (s.streak >= 30) awardBadge('streak-30');
    logActivity('Finished the day\'s work: "' + (t.title || '') + '".');
    blip(880, .09); setTimeout(() => blip(1100, .09), 110);
  } else {
    logActivity('Recorded the day\'s work: ' + done + ' of ' + total + '.');
    blip(620, .06);
  }
  persist(); renderDailyTasks(); setHud();
}

export function setDownDailyTask() {
  const t = activeTask(tasks(), todayKey()); if (!t) return;
  t.closed = true; persist();
  logActivity('Set down today\'s work — it is waiting, not failed.');
  blip(520, .06); renderDailyTasks(); setHud();
}

/* Take an old day's work again. A copy, not a resurrection: the old record
   stays exactly as it was, because it is a true account of that day. */
export function retakeDailyTask(id) {
  const today = todayKey();
  const gate = canTake(tasks(), today);
  if (!gate.ok) { say(gate.reason); return; }
  const old = tasks().find(t => String(t.id) === String(id)); if (!old) return;
  tasks().unshift({ id: Date.now(), title: old.title, taken: today,
    source: old.source || null,
    steps: (old.steps || []).map(s => ({ ...s, done: false })), closed: false });
  persist(); logActivity('Took up "' + (old.title || '') + '" again.'); blip(740, .07);
  renderDailyTasks(); setHud();
}

/* One line for anyone who wants to know where the day stands — Sebastian's
   day-read and the HUD both ask this, so there is one answer. */
export function todaysTaskLine() {
  const t = activeTask(tasks(), todayKey());
  if (!t) return '';
  const done = stepsDone(t), total = (t.steps || []).length;
  const next = (t.steps || []).find(s => !s.done);
  return 'Today\'s work: "' + (t.title || '') + '" — ' + done + ' of ' + total + ' done'
    + (next ? '. Next: ' + next.text : '. All of it is ticked.');
}
