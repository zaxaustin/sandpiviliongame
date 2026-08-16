/* ================================================================
   [THE LEARNING DESK] — where a course's practice is actually worked.

   Asked for directly, 2026-08-14:

     "i would really like a study table that is designes for learning… where
      we are able to have our tasks and problems to be able to learn to the
      point we can do them with pen and paper outside of the game… The main
      goal of this is to help people align what they think they can do with
      what they can actually do."

   THE GAP IT CLOSES. A module has said `**Practice:**` since the format was
   written, and nothing in the Pavilion read that label. data/course-format.js
   said so in its own header — "a field nobody reads is a field that rots…
   they can be promoted the moment something actually consumes one." This is
   that consumer, and moduleParts() is the promotion, done without lifting a
   word out of the body.

   THE ORDER IS THE WHOLE DESIGN, and it is one rule:

     THE BLANK PAGE COMES FIRST. Nothing is offered until you have written
     something. Not a hint, not an example, not an AI button — the buttons are
     not disabled, they are not RENDERED. This is where "the pace is too fast…
     i want it to feel like its the users doing it" stops being a paragraph in
     a document and becomes a property of a surface.

   WHY IT IS ITS OWN FILE. The steward, asking for the desk: "i know its gona
   kill the overlays." ui/study-table.js is the precedent — a panel outside the
   monolith, dependencies injected once by initLearningDesk(), importing
   nothing backwards. overlays.js keeps the window-export block, which
   `npm test` joins in both directions.

   TWO TABS, and the second one MOVED HERE rather than being built here.
   "Work through a book" was a tab inside the Writing Desk, which is the room
   the steward says is for writing: "for the study table that means study for
   the writing table that means wright." Its 761 lines are untouched; only
   where it draws changed.
   ================================================================ */

import { state, data, persist, todayKey, logActivity, awardBadge } from '../entities.js';
import { blip } from '../main.js';
import { esc, jsq, courseProse, checklistHTML } from './dom.js';
import { moduleParts, courseStanding, parseSteps, repeatSpec } from '../data/course-format.js';
import { buildExtendPrompt } from '../data/course-prompt.js';
import { courseFolderFiles, courseSlug } from '../data/course-folder.js';
import { referenceFor, refLine } from '../data/reference.js';
import { currentUser } from '../data/note-versions.js';

/* Injected once, at import time in overlays.js. */
let X = {};
export function initLearningDesk(deps) { X = deps || {}; }

/* ---------- what the desk is looking at ---------- */

function view() {
  const v = state.learnView = state.learnView || { tab: 'course', id: null, i: null, said: null, help: null };
  return v;
}

/* THE COURSES THIS DESK IS FOR. A three-line checklist has no practice to
   work — courseStanding() is the same test the Board's badge uses, so the two
   surfaces cannot disagree about what counts as a real course. */
export function workableCourses() {
  return (data.courses || []).filter(c => !c.archived && courseStanding(c).full);
}

/* WHICH COURSE IS IN FRONT OF YOU. Your choice first, then the only one there
   is — never a guess between several. The same shape tableBook() uses. */
function currentCourse() {
  const list = workableCourses();
  const v = view();
  if (v.id != null) {
    const chosen = list.find(c => c.id === v.id);
    if (chosen) return chosen;
  }
  return list.length === 1 ? list[0] : null;
}

/* WHICH MODULE. Derived — the first not-done — unless you deliberately opened
   another one. The same rule openModuleOf() uses on the Board, so walking a
   course and working it never disagree about where you are. */
function currentIndex(c) {
  const v = view();
  if (v.i != null && c.steps[v.i]) return v.i;
  const at = c.steps.findIndex(s => !s.done);
  return at < 0 ? c.steps.length - 1 : at;
}

/* ---------- the record ---------- */

function workStore() {
  if (!data.courseWork) data.courseWork = {};
  return data.courseWork;
}
export function attemptsFor(courseId, i) {
  const byCourse = workStore()[courseId];
  const at = byCourse && byCourse[i];
  return Array.isArray(at) ? at : [];
}
/* Newest first everywhere it is shown, because the question a person asks of
   this list is "what did I do last time", never "what did I do first". */
function sortedAttempts(courseId, i) {
  return attemptsFor(courseId, i).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/* ---------- the honor system ----------

   The steward, asked how the standard is held:

     "i mainly want to hold this standard by an honor system where people are
      honest about where they come from… if they tell us that they're confused
      or don't understand something then we put them back to the beginner
      course… this isn't just for them this is also for the people coming
      after them."

   So: THREE WORDS, NEVER A NUMBER. A number is a score, a score gets averaged,
   and an average of how capable you felt is a judgement of you — which is the
   stick rule 9 keeps out of this house. These are answers, not measurements.
   Nothing is tallied, nothing is charted, and there is no streak. */
export const SAID = [
  { id: 'not-yet',   label: 'not yet',        after: 'still not yet' },
  { id: 'with-help', label: 'with my notes',  after: 'needed my notes' },
  { id: 'on-my-own', label: 'on my own',      after: 'on my own' },
];
const saidLabel = (id, which) => {
  const s = SAID.find(x => x.id === id);
  return s ? (which === 'after' ? s.after : s.label) : '';
};

/* ---------- opening ---------- */

export function openLearningDesk() {
  state.ui = 'learning';
  X.hideAllOv();
  const v = view();
  /* ARRIVE ON THE MODULE YOU ARE UP TO, not the one you left open. Which
     module is derived from what is done, so a course you advanced on the Board
     opens here at the right place with nothing to keep in sync. */
  v.i = null; v.said = null; v.help = null;
  clearDraft();
  renderLearningDesk();
  X.showOv('learnOv');
}
/* THE DOOR FROM THE BOARD. A module you are reading offers to be worked, and
   lands here on THAT module rather than on wherever the desk was. One press,
   and it moves you — which is exactly what rule 9 says a press is for. */
export function workModuleHere(courseId, i) {
  const v = view();
  v.tab = 'course'; v.id = courseId; v.said = null; v.help = null;
  clearDraft();
  state.ui = 'learning';
  X.hideAllOv();
  v.i = i;
  renderLearningDesk();
  X.showOv('learnOv');
  blip(587, .05, 'sine', .03);
}
export function learnTab(tab) {
  const v = view();
  v.tab = tab === 'book' ? 'book' : 'course';
  renderLearningDesk();
}
export function learnPickCourse(id) {
  const v = view();
  v.id = id; v.i = null; v.said = null; v.help = null;
  clearDraft();
  renderLearningDesk();
}
export function learnPickModule(i) {
  const v = view();
  v.i = i; v.said = null; v.help = null;
  /* A DIFFERENT MODULE IS A DIFFERENT PAGE. Carrying an unkept attempt across
     would put your working on module 1 under the practice for module 2 — the
     record would be wrong about which problem you were solving. Chips and tab
     switches keep it; changing the work does not. */
  clearDraft();
  renderLearningDesk();
}
export function learnSaid(id) {
  /* BEFORE the attempt, and optional. Pressing the same chip again clears it —
     an honest "I would rather not say" has to be reachable, or the first
     accidental press becomes a claim you cannot take back. */
  const v = view();
  v.said = v.said === id ? null : id;
  renderLearningDesk();
  blip(v.said ? 523 : 392, .04, 'sine', .025);
}

/* ---------- the panel ---------- */

export function renderLearningDesk() {
  const el = document.getElementById('learnPanel');
  if (!el) return;
  const v = view();
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Learning Desk</h2>
    <div class="meta">The practice, worked by hand. Nothing here is marked or scored.</div>
    <div class="row" style="margin:12px 0 4px;gap:6px">
      <button class="btn ${v.tab === 'course' ? '' : 'ghost'}" style="font-size:11.5px;padding:5px 12px"
        onclick="learnTab('course')">✍ A course</button>
      <button class="btn ${v.tab === 'book' ? '' : 'ghost'}" style="font-size:11.5px;padding:5px 12px"
        onclick="learnTab('book')">📚 A book</button>
    </div>
    ${/* THE HEADING NAMES WHAT IS ON THE TABLE — the rule the Writing Desk's
          tool panel already held, carried over with the tab rather than lost
          in the move. Found 2026-08-07 there: the button said "Work through
          The Dhammapada" while the heading above the work said the generic
          title, so the one place you are looking never told you which book. */''}
    ${v.tab === 'book' && X.studyTableLabel ? `<h3 style="margin:12px 0 0">${esc(X.studyTableLabel())}</h3>` : ''}
    <div id="learnBody"></div>`;
  if (v.tab === 'book') X.renderStudyTable();
  else renderCourseWork();
}

function renderCourseWork() {
  const el = document.getElementById('learnBody');
  if (!el) return;
  const list = workableCourses();
  if (!list.length) {
    /* ABSENT, NOT DEGRADED, and it says how to change that. A desk with no
       work on it that renders an empty textarea is a lie about being ready. */
    el.innerHTML = `<p style="margin-top:14px">There is no course to work yet.</p>
      <div class="meta" style="margin-top:6px">This desk works the practice a course asks for —
        its problems, its reflections, the thing it asks you to make. A checklist has none of that,
        so only a full course shows up here.</div>
      <div class="row" style="margin-top:12px">
        <button class="btn" onclick="openCourses()">📋 Go to the Course Board</button>
      </div>`;
    return;
  }
  const c = currentCourse();
  if (!c) {
    el.innerHTML = `<div class="meta" style="margin-top:14px">Which course are you working on?</div>
      ${list.map(x => {
        const done = x.steps.filter(s => s.done).length;
        return `<div class="card" onclick="learnPickCourse(${x.id})">
          <div class="t">${esc(x.title)}</div>
          <div class="s">${done} of ${x.steps.length} modules walked</div>
        </div>`;
      }).join('')}`;
    return;
  }
  const i = currentIndex(c);
  const v = view();
  if (v.looking) { el.innerHTML = courseHeader(c, i) + allWork(c); return; }
  const step = c.steps[i] || {};
  const parts = moduleParts(step.body);
  el.innerHTML = courseHeader(c, i) + moduleWork(c, i, step, parts);
  restoreDraft();
  renderAids();
  renderExtend();
}

/* ---- ★ EVERYTHING YOU HAVE WORKED ON THIS COURSE ----

   The steward: "i wanna see a way where people can save their work and look
   back on it."

   A FILTER, NOT A SECOND GATHERER. gatherRecords() already walks the save and
   produces the Pavilion's one history; `work` is a kind in it now, and each row
   carries its course id in `ref`. So this view is that walk narrowed to one
   course — which means what you see here and what the Records Hall shows can
   never drift, because there is only one of them.

   The row text still comes from the save, not from the record: a record row
   carries WHAT happened, and your working stays where it is private. */
export function learnLookBack(on) {
  const v = view();
  v.looking = !!on;
  renderLearningDesk();
  blip(on ? 587 : 523, .05, 'sine', .03);
}
function allWork(c) {
  const rows = X.records ? X.records().filter(r => r.kind === 'work' && r.ref === String(c.id)) : [];
  const back = `<div class="row" style="margin-top:12px">
      <button class="btn ghost" onclick="learnLookBack(false)">← Back to the work</button></div>`;
  if (!rows.length) {
    return `<p style="margin-top:14px">Nothing kept on this course yet.</p>
      <div class="meta" style="margin-top:5px">Work a module's practice and press <b>Keep this
        attempt</b>, and it will be here — with the date, and what you said before and after.</div>${back}`;
  }
  /* The record row says what and when; the attempt itself is looked up beside
     it, because that text never leaves the save. */
  const detail = r => {
    const bits = String(r.source_key).split(':');   // work:courseId:i:date:n
    const list = attemptsFor(c.id, bits[2]);
    return list[Number(bits[4])] || null;
  };
  return `<h3 style="margin:16px 0 2px">Your work on this course</h3>
    <div class="meta">${rows.length} attempt${rows.length === 1 ? '' : 's'}, newest first.
      Kept here and nowhere else.</div>
    ${rows.map(r => {
      const a = detail(r);
      return `<div style="margin-top:10px;padding:9px 12px;border:2px solid #3f3225;border-radius:8px;background:#191309">
        <div class="meta" style="margin:0">${esc(r.happened)} · ${esc(r.title.replace(/^Worked: /, ''))}${
          a && a.before ? ` · you said: <b>${esc(saidLabel(a.before))}</b>` : ''}${
          a && a.after ? ` · afterwards: <b>${esc(saidLabel(a.after, 'after'))}</b>` : ''}</div>
        ${a ? `<div style="margin-top:5px;font-size:13px;line-height:1.5;color:#e2d5bd;white-space:pre-wrap">${esc(a.text)}</div>` : ''}
        ${r.detail ? `<div class="meta" style="margin-top:5px">🕯 Stuck on: ${esc(r.detail)}</div>` : ''}
      </div>`;
    }).join('')}${back}`;
}

/* ---- WHAT YOU HAVE TYPED AND NOT YET KEPT ----

   ⚠ EVERY PRESS ON THIS PANEL REDRAWS IT, AND A REDRAW IS AN EMPTY FORM.
   Found by the live suite on the first run: type an attempt, type the line
   about where you got stuck, then press one of the three honesty chips — and
   the chip's re-render silently threw the stuck line away. The attempt saved
   fine, so nothing looked wrong; the sentence written for whoever comes next
   was simply gone.

   The Receive panel had this exact bug a day earlier ("pressing a door threw
   away the baseline") and it is the same fix: the panel does not own the
   words, this does. Both fields, one place, restored after every render.

   Kept out of `state` deliberately — an unsaved attempt is neither a view nor
   a record, and it should live exactly as long as the panel does. */
const draft = { text: '', stuck: '' };
function restoreDraft() {
  const box = document.getElementById('lwAttempt');
  const stuck = document.getElementById('lwStuck');
  if (box) {
    box.value = draft.text;
    box.oninput = () => {
      const had = !!draft.text.trim();
      draft.text = box.value;
      /* The aids appear the moment there ARE words and vanish again when the
         box is emptied. Redrawing the whole panel per keystroke would fight
         the caret, so only crossing empty→not-empty redraws anything. */
      if (had !== !!box.value.trim()) renderAids();
    };
  }
  if (stuck) {
    stuck.value = draft.stuck;
    stuck.oninput = () => { draft.stuck = stuck.value; };
  }
}
function clearDraft() {
  draft.text = ''; draft.stuck = '';
  /* A MARKING BELONGS TO THE ATTEMPT IT MARKED. Carrying one across to another
     module — or leaving it up beside a fresh attempt it never saw — is a
     verdict on work it did not read, which is worse than no verdict. */
  const v = state.learnView; if (v) v.mark = null;
}

/* Every attempt on this course, across every module. Counted from the store
   directly — a count is cheap and must never be a guess. */
function workCount(c) {
  const byModule = workStore()[c.id] || {};
  return Object.values(byModule).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
}
function courseHeader(c, i) {
  const list = workableCourses();
  const done = c.steps.filter(s => s.done).length;
  return `
    <div style="margin-top:14px;padding:9px 12px;border:2px solid #55432e;border-radius:8px;background:#1b140d">
      <div style="font-size:13.5px;color:#e2d5bd">${esc(c.title)}</div>
      <div class="meta" style="margin-top:4px">${done} of ${c.steps.length} modules walked
        ${list.length > 1 ? `· <button class="btn ghost" style="font-size:11px;padding:2px 8px"
          onclick="learnPickCourse(null)">switch course</button>` : ''}
        · <button class="btn ghost" style="font-size:11px;padding:2px 8px"
          onclick="openCourse(${c.id})">read it on the Board</button>
        ${workCount(c) ? `· <button class="btn ghost" style="font-size:11px;padding:2px 8px"
          onclick="learnLookBack(${view().looking ? 'false' : 'true'})">📓 your work on this course
          (${workCount(c)})</button>` : ''}</div>
      <div class="row" style="margin-top:8px;gap:5px;flex-wrap:wrap">
        ${c.steps.map((s, n) => `<button class="btn ${n === i ? '' : 'ghost'}"
          style="font-size:10.5px;padding:3px 8px" title="${esc(s.title)}"
          onclick="learnPickModule(${n})">${s.done ? '✓' : ''}${n + 1}</button>`).join('')}
      </div>
    </div>`;
}

/* ---- THE ORDER OF A MODULE, AND IT IS THE ORDER OF THE WORK ----

   The steward, reading both of his real courses back:

     "I want to give people more guidance on THIS IS HOMEWORK, THIS IS THE
      THEORY, and THIS IS THE LEVEL I EXPECT YOU TO BE AT at the end of this
      part of the course. Small attainable goals that are digested one by one."

   and, on meditation specifically, the thing the format could not hold:

     "there's not enough homework… no preliminary stress of GO READ THE BOOK…
      I should say do it once, see how you feel, write a report, and keep going
      for 20 days."

   So the module is laid out in the order you actually meet it:

     1. read the book first        — the Reading, with a door to it
     2. the theory                 — what you must be able to rebuild
     3. the homework               — what you do
     4. what you make
     5. by the end                 — the level, small and attainable
     6. and then the blank page

   Reading is FIRST and is its own row rather than a line in the body, because
   "go read the book" was the thing he said was missing and a citation buried
   in prose is not an instruction. */
function moduleWork(c, i, step, parts) {
  const has = parts.practice || parts.artifact || parts.reflection;
  return `
    <h3 style="margin:16px 0 2px">${esc(step.title || 'Module ' + (i + 1))}</h3>
    ${parts.objective ? `<div class="meta" style="margin-bottom:8px">${esc(parts.objective)}</div>` : ''}
    ${readFirstRow(step)}
    ${!step.reading && parts.resources
      ? block('First — go through these', parts.resources, '#8fb4d9') : ''}
    ${!has ? `<p class="meta" style="margin-top:10px">This module asks for no practice in so many words —
        it has no <b>Practice</b>, <b>Reflection</b> or <b>Artifact</b> line. Work it anyway if you like;
        the page below is yours either way.</p>` : ''}
    ${parts.theory ? block('The theory — be able to rebuild this, not recall it', parts.theory, '#c98fb4') : ''}
    ${parts.practice ? block('The homework', parts.practice, '#c9a86a') : ''}
    ${parts.artifact ? block('What you make', parts.artifact, '#7fa36b') : ''}
    ${parts.reflection ? block('Afterwards, honestly', parts.reflection, '#9ac7e8') : ''}
    ${repeatRow(c, i, parts)}
    ${gateRow(parts)}
    ${checkRow(c, i)}
    ${refChips(parts)}
    ${saidRow(parts)}
    ${blankPage(c, i)}
    ${pastAttempts(c, i)}
    ${extendRow(c)}
    ${folderRow(c)}`;
}

/* ★ GO READ THE BOOK — first, and as a press rather than a mention.
   Three states, the same three the Board uses and for the same reason (rule 6):
   you own it and it opens · the shelf has something close and it OFFERS ·
   nothing, said plainly with the way to fix it. */
function readFirstRow(step) {
  if (!step.reading) return '';
  const owned = step.bookSlug && X.getDoc ? X.getDoc(step.bookSlug) : null;
  const why = step.readingWhy
    ? `<div class="meta" style="margin-top:3px;opacity:.85">${esc(step.readingWhy)}</div>` : '';
  return `<div style="margin-top:11px;padding:9px 12px;border-left:3px solid #8fb4d9;background:#241c12;border-radius:0 7px 7px 0">
    <div class="meta" style="margin:0 0 4px">First — read this</div>
    <div style="font-size:13px;color:#e2d5bd">📖 <b>${esc((owned && owned.title) || step.reading)}</b>
      ${owned ? `<button class="btn ghost" style="font-size:11px;padding:3px 9px;margin-left:4px"
          onclick="openReader('${jsq(step.bookSlug)}')">open it</button>`
        : `<span class="meta" style="opacity:.8">— not on your shelf yet</span>
           <button class="btn ghost" style="font-size:11px;padding:3px 9px;margin-left:4px"
          onclick="openBookIntake()">bring it in</button>`}</div>
    ${why}
  </div>`;
}

/* ★ "DO IT ONCE, SEE HOW YOU FEEL, AND KEEP GOING FOR 20 DAYS."

   Counted from the attempts you kept, and DAYS ARE COUNTED AS DAYS — distinct
   dates, not presses, because sitting once and pressing keep four times is not
   four days of practice and a surface that says it is would be lying to the
   one person it is for.

   NOT A STREAK. No consecutive requirement, nothing to break, no flame, no
   encouragement copy. It is a tally against a number the AUTHOR wrote, and on
   your own course the author is you. When there is no number it says so
   instead of inventing one. */
function repeatRow(c, i, parts) {
  const spec = repeatSpec(parts.repeat);
  if (!spec) return '';
  const list = attemptsFor(c.id, i);
  const done = spec.byDay ? new Set(list.map(a => a.at)).size : list.length;
  const label = spec.byDay ? (done === 1 ? 'day' : 'days') : (done === 1 ? 'time' : 'times');
  return `<div style="margin-top:11px;padding:9px 12px;border-left:3px solid #d9a441;background:#241c12;border-radius:0 7px 7px 0">
    <div class="meta" style="margin:0 0 4px">Keep going</div>
    <div style="font-size:13px;color:#e2d5bd">${esc(spec.text)}</div>
    <div class="meta" style="margin-top:5px">${spec.times
      ? `You have kept <b>${done}</b> ${label} of <b>${spec.times}</b>.${done >= spec.times
          ? ' That is the whole of it — well done, and it is yours now.' : ''}`
      : `You have kept <b>${done}</b> ${label} so far. This one names no number, so there is nothing to
         count towards — which is a real answer, not a gap.`}</div>
  </div>`;
}

/* ★ THE LEVEL EXPECTED AT THE END OF THIS PART. His "small attainable goals
   that are digested one by one" — the course's own gate for this module, put
   where you can read it BEFORE you start rather than discovering it after. */
function gateRow(parts) {
  if (!parts.byTheEnd) return '';
  return `<div style="margin-top:11px;padding:9px 12px;border:2px solid #7fa36b;border-radius:8px;background:#1b140d">
    <div class="meta" style="margin:0 0 4px">By the end of this part, you should be able to</div>
    <div style="font-size:13.5px;color:#e2d5bd">${courseProse(parts.byTheEnd)}</div>
  </div>`;
}
/* ★ WHAT GETS YOU TO THE NEXT MODULE, at the desk. The SAME rows the Board
   shows, from the same gatherer over the seam and through the same renderer —
   not a second list that agrees with the first by inspection. The only
   difference is the doors: on the Board "work it" sends you here, and here
   you are already here, so the desk offers the book and the day instead.

   Below the gate and above the reference chips, which is where it belongs in
   the order the module is met: this is what the gate costs. */
function checkRow(c, i) {
  if (!X.checklistFor) return '';
  const list = X.checklistFor(c, i);
  if (!list || !list.any) return '';
  const step = c.steps[i] || {};
  const left = list.rows.some(r => r.counted && !r.done);
  return checklistHTML(list, {
    read: step.bookSlug ? ` <button class="btn ghost" style="font-size:10.5px;padding:2px 8px"
      onclick="openReader('${jsq(step.bookSlug)}')">open it</button>` : '',
    get: ` <button class="btn ghost" style="font-size:10.5px;padding:2px 8px"
      onclick="openBookIntake()">bring it in</button>`,
    /* No "work it" here — you are at the desk, and the blank page is directly
       below. A button that scrolls you to a thing on the same screen is the
       kind of dead press rule 5 is about. */
    desk: '',
  }, { lead: false }) + (left ? `<div class="row" style="margin-top:7px">
      <button class="btn ghost" style="font-size:11.5px;padding:4px 10px"
        onclick="courseToTasks(${c.id},${i})">📋 Take what is left into today</button></div>
    <div class="meta" id="lwTaskMsg" style="margin-top:5px"></div>` : '');
}

function block(label, text, colour) {
  return `<div style="margin-top:11px;padding:9px 12px;border-left:3px solid ${colour};background:#241c12;border-radius:0 7px 7px 0">
    <div class="meta" style="margin:0 0 4px">${label}</div>
    <div style="font-size:13px;line-height:1.55;color:#e2d5bd">${courseProse(text)}</div>
  </div>`;
}

/* THE REFERENCE DESK, WHERE IT IS ACTUALLY WANTED — mid-problem, offline, no
   model, no press to spend. referenceFor() already reads a block of text and
   returns the exact constants and formulas it mentions; this is its first
   caller outside the terminal. Deterministic, so it costs nothing and cannot
   be wrong about what it does not know. */
function refChips(parts) {
  const hits = referenceFor([parts.practice, parts.objective, parts.artifact].filter(Boolean).join('\n'), 4);
  if (!hits.length) return '';
  return `<div class="meta" style="margin-top:9px;opacity:.85">At hand: ${hits.map(h =>
    `<span class="badge" title="${esc(refLine(h))}">${esc(h.name)}${h.symbol ? ' ' + esc(h.symbol) : ''}</span>`).join(' ')}</div>`;
}

function saidRow(parts) {
  const v = view();
  /* ASK ABOUT THE BAR THE COURSE SET, when it set one. "Can you do this now?"
     is vague against a nine-paragraph module and exact against "by the end you
     should be able to size a resistor from a voltage and a current." */
  const bar = parts && parts.byTheEnd
    ? 'Before you start — can you already do that?'
    : 'Before you start — can you do this now?';
  return `
    <div style="margin-top:15px">
      <div class="meta" style="margin:0 0 5px">${bar}</div>
      <div class="row" style="gap:6px">
        ${SAID.map(s => `<button class="btn ${v.said === s.id ? '' : 'ghost'}"
          style="font-size:11.5px;padding:5px 12px" onclick="learnSaid('${s.id}')">${s.label}</button>`).join('')}
      </div>
      <div class="meta" style="margin-top:5px;opacity:.7">${v.said
        ? 'Kept beside what you write. Nobody grades it, and nothing is added up.'
        : 'Optional. Skip it and there is simply nothing to compare afterwards.'}</div>
    </div>`;
}

/* ★ THE BLANK PAGE. First, always, and before any help exists on the screen. */
function blankPage(c, i) {
  return `
    <label style="margin-top:15px">Your attempt — write it out, in your own words</label>
    <textarea id="lwAttempt" rows="8" placeholder="Work it here first. Pen and paper is better still — this is for keeping what you got to."></textarea>
    <label style="margin-top:10px">Where you got stuck, if anywhere (optional)</label>
    <input type="text" id="lwStuck" placeholder="One line. What tripped you, and what got you past it.">
    <div class="meta" style="margin-top:4px;opacity:.7">Kept for you — and one day, if you choose,
      for whoever walks this next.</div>
    <div class="row" style="margin-top:11px">
      <button class="btn" onclick="keepAttempt(${c.id},${i})">Keep this attempt</button>
      <button class="btn ghost" onclick="printPractice(${c.id},${i})">🖨 Print the practice</button>
    </div>
    <div class="meta" id="lwMsg" style="margin-top:6px"></div>
    <div id="lwAids"></div>`;
}

/* ★ THE AIDS, AND THEY ARE ABSENT RATHER THAN DISABLED. A greyed-out button
   still tells you help exists and invites you to want it, which is the thing
   this desk is built to postpone. Rendered separately from the page above so
   the first keystroke can bring them in without redrawing the textarea. */
function renderAids() {
  const el = document.getElementById('lwAids');
  if (!el) return;
  const box = document.getElementById('lwAttempt');
  const written = !!(box && box.value.trim());
  const v = view();
  const c0 = currentCourse();
  const i0 = c0 ? currentIndex(c0) : 0;
  /* ★ HANDING IN IS A SEPARATE THING FROM ASKING FOR HELP, and it survives an
     empty box: once the work is KEPT there is homework to mark whether or not
     you are mid-way through writing the next attempt. This is the only part of
     the desk that is about work already finished rather than work in progress,
     so it is drawn first and on its own condition. */
  const handedIn = c0 ? sortedAttempts(c0.id, i0)[0] : null;
  const markRow = (handedIn && X.aiActive && X.aiActive()) ? `
    <div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap;align-items:center">
      <button class="btn" onclick="markHomework(${c0.id},${i0})">📥 Hand this in to be marked</button>
      <span class="meta" style="margin:0;opacity:.75">Marked against what the course itself asks for —
        not against anybody's taste.</span>
    </div>` : '';
  if (!written) {
    el.innerHTML = (v.mark ? markBlock(v.mark) : '') + markRow
      + `<div class="meta" style="margin-top:10px;opacity:.6">Write something first.
      Help appears once there is an attempt to help with.</div>`;
    return;
  }
  const ai = X.aiActive && X.aiActive();
  const c = currentCourse();
  const i = c ? currentIndex(c) : 0;
  el.innerHTML = (v.mark ? markBlock(v.mark) : '') + markRow + `
    <div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">
      ${ai ? `<button class="btn ghost" style="font-size:11.5px" onclick="learnAsk('another',${c.id},${i})">✎ Another problem like this</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="learnAsk('theory',${c.id},${i})">💡 Explain the theory</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="learnAsk('look',${c.id},${i})">🔍 Look at what I wrote</button>`
      : `<div class="meta" style="opacity:.75">No AI is connected, so there is nobody to ask —
          everything else on this desk works exactly the same.</div>`}
      ${notYetDoor(c, i)}
    </div>
    ${v.help ? helpBlock(v.help) : ''}`;
}

/* "NOT YET" IS A DOOR, NOT A SHRUG. The steward: "if they tell us that they're
   confused or don't understand something then we put them back to the beginner
   course." Three real links, deterministic, in the order a person would want
   them — and it OFFERS. It never moves you and never un-ticks a module. */
function notYetDoor(c, i) {
  const v = view();
  if (v.said !== 'not-yet') return '';
  const prev = i > 0 ? c.steps[i - 1] : null;
  const step = c.steps[i] || {};
  const pre = (c.prerequisites || []).filter(Boolean);
  const bits = [];
  if (prev) bits.push(`<button class="btn ghost" style="font-size:11.5px" onclick="learnPickModule(${i - 1})">← Back to "${esc(prev.title)}"</button>`);
  if (step.bookSlug) bits.push(`<button class="btn ghost" style="font-size:11.5px" onclick="openReader('${jsq(step.bookSlug)}')">📖 Open ${esc(step.reading || 'the book')}</button>`);
  if (!bits.length && !pre.length) return '';
  return `<div style="flex-basis:100%;margin-top:8px;padding:9px 12px;border-left:3px solid #9ac7e8;background:#241c12;border-radius:0 7px 7px 0">
    <div class="meta" style="margin:0 0 6px">You said not yet. Nothing wrong with that — here is the way back.</div>
    <div class="row" style="gap:6px;flex-wrap:wrap">${bits.join('')}</div>
    ${pre.length ? `<div class="meta" style="margin-top:6px">This course expects: ${pre.map(x => esc(x)).join(' · ')}</div>` : ''}
  </div>`;
}

/* ⚠ AI WORDS ARE THE MODEL'S, ALWAYS AND VISIBLY. They render here, in their
   own block, under a stamp — and they are NEVER written into the attempt
   textarea. Rule 9: "if a model produced the words, they are stamped as the
   model's and never read back as the visitor's own." */
function helpBlock(h) {
  return `<div style="margin-top:12px;padding:10px 13px;border:2px dashed #6b5d4e;border-radius:8px;background:#191309">
    <div class="meta" style="margin:0 0 5px">🤖 ${esc(h.by || 'the model')} — not your words, and not kept with your attempt</div>
    <div style="font-size:13px;line-height:1.55;color:#cbbda3">${h.busy ? 'thinking…' : courseProse(h.text || '')}</div>
  </div>`;
}

function pastAttempts(c, i) {
  const list = sortedAttempts(c.id, i);
  if (!list.length) return '';
  return `
    <details style="margin-top:16px" open>
      <summary class="meta" style="cursor:pointer">📓 What you have tried here — ${list.length} attempt${list.length === 1 ? '' : 's'}</summary>
      ${list.map(a => `<div style="margin-top:9px;padding:9px 12px;border:2px solid #3f3225;border-radius:8px;background:#191309">
        <div class="meta" style="margin:0">${esc(a.at)}${a.before ? ` · you said: <b>${esc(saidLabel(a.before))}</b>` : ''}${
          a.after ? ` · afterwards: <b>${esc(saidLabel(a.after, 'after'))}</b>` : ''}</div>
        <div style="margin-top:5px;font-size:13px;line-height:1.5;color:#e2d5bd;white-space:pre-wrap">${esc(a.text)}</div>
        ${a.stuck ? `<div class="meta" style="margin-top:5px">🕯 Stuck on: ${esc(a.stuck)}</div>` : ''}
      </div>`).join('')}
      ${list.some(a => a.before) ? '' : `<div class="meta" style="margin-top:7px;opacity:.7">No before-and-after on these,
        so there is nothing to compare — that is a real answer, not a gap.</div>`}
    </details>`;
}

/* ---------- keeping it ---------- */

/* ONE PRESS, and the words in the box are yours by definition — no model
   wrote into it, and nothing here can. `after` is asked in the same breath
   rather than as a second ceremony: you have just finished, and that is the
   only moment the answer is worth anything. */
export function keepAttempt(courseId, i) {
  const c = (data.courses || []).find(x => x.id === courseId);
  const box = document.getElementById('lwAttempt');
  const stuckBox = document.getElementById('lwStuck');
  const msg = document.getElementById('lwMsg');
  const say = t => { if (msg) msg.textContent = t; };
  if (!c || !box) return;
  /* READ THE LIVE FIELDS, then fall back to the draft. They are the same thing
     unless a re-render is mid-flight, and preferring the DOM means what you can
     see is what gets kept. */
  const text = (box.value || draft.text).trim();
  if (!text) { say('There is nothing written yet. The page comes first — that is the whole idea.'); return; }
  const v = view();
  const store = workStore();
  if (!store[courseId]) store[courseId] = {};
  if (!Array.isArray(store[courseId][i])) store[courseId][i] = [];
  const entry = {
    at: todayKey(),
    text,
    before: v.said || '',
    /* Asked immediately after, from the same three words. Empty until the
       row below is pressed — an attempt with no "afterwards" is honest and
       common, and the record says so rather than filling it in. */
    after: '',
    stuck: ((stuckBox && stuckBox.value) || draft.stuck || '').trim(),
    by: currentUser(),
  };
  store[courseId][i].push(entry);
  persist();
  logActivity('Worked "' + (c.steps[i] ? c.steps[i].title : 'a module') + '" at the Learning Desk');
  /* AWARDED FROM THE PRESS, never from typing. data/badges.js records why:
     "a badge toast firing while someone is mid-sentence is a machine
     congratulating them for typing." */
  awardBadge('first-attempt');
  if (entry.stuck) awardBadge('first-stuck');
  blip(700, .07);
  clearDraft();
  v.said = null;
  renderLearningDesk();
  /* ★ THE FOLDER RIDES THIS PRESS. One press, both writes — otherwise the copy
     on disk quietly falls behind the copy in the app, and a person who trusts
     the folder loses work they can see on screen. `quiet` so it does not steal
     the message line or fire the badge; it only fires if a folder already
     exists, because writing one for the first time is a decision, not a side
     effect of keeping an attempt. */
  folderAlreadyThere(c).then(there => { if (there) saveCourseFolder(courseId, true); });
  askAfter(courseId, i);
}
/* Has this course been written out before? Asked of the disk, never assumed —
   the folder can be deleted or moved by hand, and it is the person's folder. */
async function folderAlreadyThere(c) {
  if (!courseFolderAvailable()) return false;
  try {
    const res = await window.desktopBridge.courseList(courseSlug(c));
    return !!(res && res.ok && (res.files || []).length);
  } catch (e) { return false; }
}
/* The second half of the honor system, drawn only once there is something to
   attach it to. Same three words, and skipping it is a legitimate answer. */
function askAfter(courseId, i) {
  const el = document.getElementById('lwMsg');
  if (!el) return;
  el.innerHTML = `Kept. Now — honestly, could you do it?
    <span class="row" style="display:inline-flex;gap:5px;margin-left:6px">${SAID.map(s =>
      `<button class="btn ghost" style="font-size:11px;padding:3px 9px"
        onclick="learnAfter(${courseId},${i},'${s.id}')">${s.after}</button>`).join('')}</span>`;
}
export function learnAfter(courseId, i, said) {
  const list = attemptsFor(courseId, i);
  if (!list.length) return;
  list[list.length - 1].after = said;
  persist();
  blip(659, .05, 'sine', .03);
  renderLearningDesk();
}

/* ---------- the printable page ----------
   THROUGH THE ONE EMITTER. lessonToHTML() already turns a lesson node into a
   plain page; a second formatter here would be a second thing to keep in step
   with the format. This builds the node and hands it over. */
export function printPractice(courseId, i) {
  const c = (data.courses || []).find(x => x.id === courseId);
  if (!c || !X.printLesson) return;
  const step = c.steps[i] || {};
  const parts = moduleParts(step.body);
  X.printLesson({
    title: c.title + ' — ' + (step.title || 'Module ' + (i + 1)),
    summary: parts.objective || '',
    steps: [
      parts.practice ? { title: 'The practice', body: parts.practice } : null,
      parts.artifact ? { title: 'What you make', body: parts.artifact } : null,
      parts.reflection ? { title: 'Afterwards, honestly', body: parts.reflection } : null,
    ].filter(Boolean),
  });
  blip(587, .05, 'sine', .03);
}

/* ---------- the folder on disk ----------

   The steward: "hold all these files together… a course folder that people
   can access in the back end."

   ONE PRESS WRITES EVERYTHING, and the same write rides the keep-attempt press
   so the folder can never quietly fall behind what the app holds. What goes in
   it is decided by data/course-folder.js, which is pure and shared; this only
   moves the bytes and reports what happened.

   ABSENT, NOT DEGRADED, on the web build (rule: never two implementations). No
   desktop bridge means no folder — it says so, says how to get one, and offers
   the single-file download the rest of this app already uses. */
export function courseFolderAvailable() {
  return !!(typeof window !== 'undefined' && window.desktopBridge && window.desktopBridge.courseWrite);
}
export async function saveCourseFolder(courseId, quiet) {
  const c = (data.courses || []).find(x => x.id === courseId);
  if (!c) return null;
  const say = t => { const el = document.getElementById('lfMsg'); if (el) el.textContent = t; };
  const { slug, files } = courseFolderFiles(c, { attemptsFor, owned: X.owned });
  if (!courseFolderAvailable()) {
    if (!quiet) say('The folder needs the desktop app — in a browser there is nowhere on your disk to '
                  + 'put it. Use “save the course as one file” instead.');
    return null;
  }
  let wrote = 0;
  for (const f of files) {
    const res = await window.desktopBridge.courseWrite(slug, f.sub, f.name, f.content);
    /* ⚠ LOUD, ALWAYS. A full disk, a read-only drive, a folder someone else has
       open — a save button that quietly does nothing is the house failure mode,
       and this one is about a person's own work. */
    if (!res || !res.ok) { say('Could not write ' + f.name + ' — ' + ((res && res.error) || 'no reason given')); return null; }
    wrote++;
  }
  const where = await window.desktopBridge.courseFolder(slug);
  if (!quiet) {
    awardBadge('course-kept');
    blip(700, .07);
    say(wrote + ' file' + (wrote === 1 ? '' : 's') + ' written to ' + ((where && where.dir) || slug));
    renderLearningDesk();
  }
  return (where && where.dir) || slug;
}
export async function revealCourseFolder(courseId) {
  const c = (data.courses || []).find(x => x.id === courseId);
  if (!c || !courseFolderAvailable()) return;
  const slug = courseSlug(c);
  const res = await window.desktopBridge.courseReveal(slug);
  const el = document.getElementById('lfMsg');
  if (el && (!res || !res.ok)) el.textContent = 'Could not open that folder — ' + ((res && res.error) || 'no reason given');
}
/* The web build's honest substitute: the course as ONE file, through the same
   emitter and the same saveFile/<a download> path written six times already in
   this codebase. Not a second implementation of the folder — a different,
   smaller thing, named as such. */
export async function saveCourseFile(courseId) {
  const c = (data.courses || []).find(x => x.id === courseId);
  if (!c || !X.saveText) return;
  const { slug, files } = courseFolderFiles(c, { attemptsFor, owned: X.owned });
  const md = files.find(f => f.name === 'course.md');
  await X.saveText(slug + '.md', md ? md.content : '');
}
function folderRow(c) {
  const desktop = courseFolderAvailable();
  return `<details style="margin-top:16px">
    <summary class="meta" style="cursor:pointer">🗂 This course as files on your disk</summary>
    <div class="meta" style="margin-top:7px">Plain Markdown in a folder of its own — the course, its
      syllabus, and what you wrote. Yours, readable by anything, with or without the Pavilion.</div>
    <div class="row" style="margin-top:9px;gap:6px;flex-wrap:wrap">
      ${desktop
        ? `<button class="btn" onclick="saveCourseFolder(${c.id})">💾 Save this course to its folder</button>
           <button class="btn ghost" onclick="revealCourseFolder(${c.id})">📂 Open the folder</button>`
        : `<button class="btn" onclick="saveCourseFile(${c.id})">⤓ Save the course as one file</button>`}
    </div>
    ${desktop ? '' : `<div class="meta" style="margin-top:6px;opacity:.8">A folder needs the desktop app —
      a browser has nowhere on your disk to put one. The single file above is the whole course.</div>`}
    <div class="meta" id="lfMsg" style="margin-top:6px"></div>
  </details>`;
}

/* ================================================================
   [MARKING THE HOMEWORK] — hand it in, and be told honestly.

   The steward, 2026-08-15:

     "We should be able to quote unquote submit our homework to the AI, the
      local AI, to be able to judge and grade it and ask us to do more work if
      it's met lacking."

   ⚠ THIS IS THE THING I TALKED HIM OUT OF THIS MORNING, and it is right now
   for a reason that did not exist then. When I offered it as an option the
   answer would have been the MODEL'S idea of good work — a grader with its own
   taste, in a house whose rule is that nothing judges the visitor. He chose the
   honor system instead.

   `**By the end:**` changes that completely. There is now a bar THE AUTHOR
   WROTE, in the course, in their own words. Marking against a stated bar is
   not a machine forming an opinion of you; it is a machine checking one
   sentence against another and showing its working. On your own course, the
   author is you — you are being held to your own standard, which is exactly
   the honor system with an extra pair of eyes.

   SO THE RULES, and each one closes a way this could go wrong:

     · IT MARKS AGAINST THE BAR, QUOTED. The prompt carries `By the end` and
       `Practice` verbatim and says to judge against those and nothing else.
       With no bar stated it says so and marks against the practice alone.
     · THREE WORDS, NOT A SCORE. meets it / not yet / can't tell. A number
       gets averaged and an average of your work is the stick this house keeps
       out — and "can't tell from what you wrote" is rule 6, out loud.
     · IT MAY SEND YOU BACK FOR MORE, which is the half he actually asked for:
       when it is short, it must say what specifically is missing and what to
       do about it.
     · IT CHANGES NOTHING. Not your attempt, not your before/after, not whether
       the module is done. It is an opinion on your record, stamped as the
       model's, and every one of those decisions stays yours.
     · YOU PRESS. And only after the work is kept — you cannot hand in a blank
       page, and the desk will not offer to mark one.
   ================================================================ */
export const MARKS = {
  meets:   { icon: '✓', label: 'meets the bar',  colour: '#7fa36b' },
  'not-yet': { icon: '○', label: 'not yet',      colour: '#d9a441' },
  unclear: { icon: '?', label: 'cannot tell',    colour: '#8fb4d9' },
};
/* The verdict is read off the model's FIRST LINE, which the prompt demands be
   exactly one of three words. Anything else is 'unclear' — a marker that
   cannot be parsed has not marked anything, and guessing which of three it
   meant would be inventing the verdict. */
function readVerdict(text) {
  const first = String(text || '').trim().split('\n')[0].toUpperCase();
  if (/\bMEETS\b/.test(first)) return 'meets';
  if (/\bNOT YET\b|\bNOTYET\b/.test(first)) return 'not-yet';
  return 'unclear';
}
export async function markHomework(courseId, i) {
  const c = (data.courses || []).find(x => x.id === courseId);
  if (!c || !X.askTutor) return;
  const list = sortedAttempts(courseId, i);
  const latest = list[0];
  /* THE BLANK PAGE STILL COMES FIRST, at the door as well as in the drawing.
     There is nothing to mark until you have kept something. */
  if (!latest || !String(latest.text || '').trim()) return;
  const v = view();
  v.mark = { busy: true };
  renderAids();
  const step = c.steps[i] || {};
  const parts = moduleParts(step.body);
  const bar = parts.byTheEnd || '';
  const body = [
    'You are marking one piece of homework for a learner working through a course.',
    '',
    'THE COURSE: ' + c.title,
    'THE MODULE: ' + (step.title || 'Module ' + (i + 1)),
    parts.objective ? 'ITS OBJECTIVE: ' + parts.objective : '',
    parts.theory ? 'THE THEORY IT ASKED THEM TO HOLD:\n' + parts.theory : '',
    parts.practice ? 'THE HOMEWORK IT SET:\n' + parts.practice : '',
    '',
    bar
      ? 'THE BAR, WRITTEN BY THE COURSE\'S OWN AUTHOR — judge against THIS and nothing else. Not against\n'
        + 'your own idea of a good answer, and not against what an expert would write:\n' + bar
      : 'THE COURSE STATES NO BAR for this module, so judge only whether the homework above was actually\n'
        + 'done, and say in your first sentence that the course set no explicit standard here.',
    '',
    'WHAT THEY WROTE:',
    String(latest.text),
    latest.stuck ? '\nTHEY ALSO SAID THEY GOT STUCK ON: ' + latest.stuck : '',
    '',
    'REPLY IN THIS SHAPE, and nothing else:',
    'First line: exactly one of  MEETS  ·  NOT YET  ·  CANNOT TELL',
    'Then two or three sentences on WHAT IS ACTUALLY IN THEIR ANSWER — quote a phrase of theirs.',
    'If NOT YET: say precisely what is missing, then give ONE concrete piece of extra work that would',
    'close that gap. One. Not a syllabus.',
    'If CANNOT TELL: say what they would have to write for you to be able to judge it.',
    'No score, no mark out of anything, no praise for its own sake. Do not rewrite their answer for them.',
  ].filter(Boolean).join('\n');
  let text = '';
  try { text = await X.askTutor(body); } catch (e) { text = ''; }
  v.mark = text
    ? { verdict: readVerdict(text), text, by: X.aiName ? X.aiName() : 'the model', at: todayKey() }
    : { verdict: 'unclear', text: 'No answer came back. Nothing on this desk waits on one — the work is '
        + 'kept either way.', by: 'the Pavilion', at: todayKey() };
  renderAids();
}
export function clearMark() { view().mark = null; renderAids(); }
function markBlock(m) {
  if (m.busy) return `<div class="meta" style="margin-top:10px">marking it…</div>`;
  const look = MARKS[m.verdict] || MARKS.unclear;
  return `<div style="margin-top:12px;padding:10px 13px;border:2px dashed ${look.colour};border-radius:8px;background:#191309">
    <div class="meta" style="margin:0 0 5px">
      <b style="color:${look.colour}">${look.icon} ${look.label}</b> ·
      🤖 ${esc(m.by)} — an opinion on your work, not a change to it</div>
    <div style="font-size:13px;line-height:1.55;color:#cbbda3">${courseProse(m.text)}</div>
    <div class="row" style="margin-top:9px;gap:6px">
      ${m.verdict === 'not-yet'
        ? `<button class="btn" onclick="anotherGo()">✎ Have another go</button>` : ''}
      <button class="btn ghost" onclick="clearMark()">Put it away</button>
    </div>
    <div class="meta" style="margin-top:6px;opacity:.7">Nothing here ticked a module or changed what you
      wrote. Whether this is finished is yours to say.</div>
  </div>`;
}
/* "Ask us to do more work if it's lacking" — made into a press rather than a
   sentiment. It clears the page for a fresh attempt and leaves the marking on
   screen to work against. The previous attempt is untouched; a second go is a
   second entry, because the pair of them is the record. */
export function anotherGo() {
  clearDraft();
  renderLearningDesk();
  const box = document.getElementById('lwAttempt');
  if (box) box.focus();
}

/* ---------- one more module ----------

   The steward: "the local AI generate more coursework and some practice
   problems — for meditation it can ask us about karma, list a book about
   karma, and have a book report about what it says."

   DETERMINISTIC FIRST. What the model is handed — the modules that exist, the
   books on YOUR shelf for this topic, and the lines you wrote about where you
   got stuck — is all counted here. The model writes the module; nothing else.

   AND IT LANDS AS A DRAFT YOU PRESS TO ACCEPT. Nothing is ever appended to
   your course by a machine (rule 9). The draft is shown, stamped, and either
   taken or thrown away by you.

   NO MODEL, NO PROBLEM: "copy the prompt" is always there, and is how the
   whole course pathway already works. A laptop that cannot host a model keeps
   the entire feature. */
function stuckLines(c) {
  const byModule = workStore()[c.id] || {};
  const out = [];
  for (const list of Object.values(byModule)) {
    for (const a of (Array.isArray(list) ? list : [])) if (a && a.stuck) out.push(a.stuck);
  }
  return out.slice(-5);
}
function extendOpts(c) {
  const about = (document.getElementById('lxAbout') || {}).value || '';
  return {
    title: c.title,
    purpose: c.purpose || c.why || '',
    modules: (c.steps || []).map(s => s.title),
    /* The shelf, searched on the course's own subject plus whatever you typed
       into the box — so "karma" finds the books you own about karma. */
    have: X.shelfFor ? X.shelfFor([about, c.title, c.purpose || '', c.track || ''].join(' ')) : [],
    stuck: stuckLines(c),
    about,
  };
}
export function learnSetAbout() { /* the box is read at press time; this only re-renders the count */
  renderExtend();
}
export async function copyModulePrompt(courseId) {
  const c = (data.courses || []).find(x => x.id === courseId);
  if (!c) return;
  const text = buildExtendPrompt(extendOpts(c));
  const say = t => { const el = document.getElementById('lxMsg'); if (el) el.textContent = t; };
  try { await navigator.clipboard.writeText(text); say('Copied. Paste it into ChatGPT, Grok, or whatever you use — then bring the module back below.'); blip(700, .07); }
  catch (e) { say('The clipboard refused. The prompt is below — select it and copy by hand.'); }
  const v = view();
  v.extendPrompt = text;
  renderExtend();
}
export async function askForModule(courseId) {
  const c = (data.courses || []).find(x => x.id === courseId);
  if (!c || !X.askTutor) return;
  const v = view();
  v.extendBusy = true; v.extendDraft = null;
  renderExtend();
  let text = '';
  try { text = await X.askTutor(buildExtendPrompt(extendOpts(c))); } catch (e) { text = ''; }
  v.extendBusy = false;
  v.extendDraft = text ? { text, by: X.aiName ? X.aiName() : 'the model' } : null;
  if (!text) { const el = document.getElementById('lxMsg'); if (el) el.textContent = 'Nothing came back. Copy the prompt instead and use a window you already have open.'; }
  renderExtend();
}
/* Paste a module back in from outside — the laptop path, and the one that
   actually gets used. Same parser the Board uses; a module is just a course
   with one heading in it. */
export function readPastedModule(courseId) {
  const box = document.getElementById('lxPaste');
  const v = view();
  if (!box) return;
  v.extendDraft = box.value.trim() ? { text: box.value, by: 'you pasted it' } : null;
  renderExtend();
}
/* ⚠ THE PARSER IS FOR A WHOLE COURSE, AND THIS IS A FRAGMENT. parseCourse()
   requires a title — reasonably, since a course without one cannot be pinned —
   and a bare `## Module 10` has none, so the first version of this silently
   found zero modules in a perfectly good reply and said "that is not a module
   yet". Give the fragment a title it does not keep, rather than teaching the
   format an exception. A reply that DOES carry its own title (a model handing
   back the whole course) still parses as itself. */
function draftedSteps(text) {
  let src = String(text || '').replace(/^```[a-z]*\s*|\s*```\s*$/g, '').trim();
  if (!/^title:/m.test(src) && !/^#\s+\S/m.test(src)) src = '# A module\n\n' + src;
  const r = parseSteps(src, { user: currentUser() });
  return r.ok ? (r.lesson.steps || []) : [];
}
export function acceptDraftedModule(courseId) {
  const c = (data.courses || []).find(x => x.id === courseId);
  const v = view();
  if (!c || !v.extendDraft) return;
  const steps = draftedSteps(v.extendDraft.text);
  if (!steps.length) {
    const el = document.getElementById('lxMsg');
    if (el) el.textContent = 'That does not contain a module — it needs one `## ` heading with the bold labels under it.';
    return;
  }
  /* ONE MODULE. If the model returned the whole course anyway, take the LAST
     heading — the new one is the one it added — and say plainly that is what
     happened, rather than silently doubling the course. */
  const took = steps[steps.length - 1];
  const many = steps.length > 1;
  c.steps.push({ ...took, done: false });
  persist();
  v.extendDraft = null; v.extendPrompt = null;
  blip(700, .07);
  renderLearningDesk();
  const el = document.getElementById('lxMsg');
  if (el) el.textContent = many
    ? 'Added "' + took.title + '". The reply held ' + steps.length + ' modules and only the last was new, so the rest were left out — check it reads right.'
    : 'Added "' + took.title + '" to the end of the course.';
}
export function discardDraftedModule() {
  const v = view();
  v.extendDraft = null;
  renderExtend();
}
export function learnExtend(on) {
  const v = view();
  v.extending = !!on;
  if (!on) { v.extendDraft = null; v.extendPrompt = null; }
  renderLearningDesk();
}
function extendRow(c) {
  const v = view();
  if (!v.extending) {
    return `<div class="row" style="margin-top:14px">
      <button class="btn ghost" onclick="learnExtend(true)">✎ Ask for one more module</button></div>`;
  }
  return `<div style="margin-top:14px;padding:10px 13px;border:2px solid #55432e;border-radius:8px;background:#1b140d">
    <div class="meta" style="margin:0 0 6px">One more module for this course</div>
    <label>What should it be about? (optional)</label>
    <input type="text" id="lxAbout" placeholder="e.g. karma — a question, a book from my shelf, and a report on what it says"
      value="${esc(v.extendAbout || '')}">
    <div class="meta" style="margin-top:5px;opacity:.8">It is told which modules you already have,
      which of your own books touch this, and anything you wrote about getting stuck.</div>
    <div class="row" style="margin-top:9px;gap:6px;flex-wrap:wrap">
      ${X.aiActive && X.aiActive()
        ? `<button class="btn" onclick="askForModule(${c.id})">✎ Ask the model here</button>` : ''}
      <button class="btn ghost" onclick="copyModulePrompt(${c.id})">📋 Copy the prompt</button>
      <button class="btn ghost" onclick="learnExtend(false)">✕ Never mind</button>
    </div>
    <div id="lxBody"></div>
  </div>`;
}
function renderExtend() {
  const el = document.getElementById('lxBody');
  if (!el) return;
  const v = view();
  const c = currentCourse();
  if (!c) return;
  const steps = v.extendDraft ? draftedSteps(v.extendDraft.text) : [];
  el.innerHTML = `
    <div class="meta" id="lxMsg" style="margin-top:7px"></div>
    ${v.extendBusy ? '<div class="meta" style="margin-top:6px">thinking…</div>' : ''}
    ${v.extendPrompt ? `<textarea rows="6" readonly style="margin-top:8px;font-size:11.5px">${esc(v.extendPrompt)}</textarea>` : ''}
    <label style="margin-top:9px">…or paste a module back in from wherever you drafted it</label>
    <textarea id="lxPaste" rows="4" placeholder="## Module 10 — …" oninput="readPastedModule(${c.id})"></textarea>
    ${v.extendDraft ? `
      <div style="margin-top:10px;padding:9px 12px;border:2px dashed #6b5d4e;border-radius:8px;background:#191309">
        <div class="meta" style="margin:0 0 5px">🤖 ${esc(v.extendDraft.by)} — nothing is on your course until you press</div>
        ${steps.length
          ? `<div style="font-size:13.5px;color:#e2d5bd">${esc(steps[steps.length - 1].title)}</div>
             <div style="margin-top:5px;font-size:12.5px;line-height:1.5;color:#cbbda3">${courseProse(steps[steps.length - 1].body)}</div>
             ${steps.length > 1 ? `<div class="meta" style="margin-top:5px">⚠ ${steps.length} modules came back;
               only the last one is new, and only that one would be added.</div>` : ''}
             <div class="row" style="margin-top:9px;gap:6px">
               <button class="btn" onclick="acceptDraftedModule(${c.id})">✓ Add it to the course</button>
               <button class="btn ghost" onclick="discardDraftedModule()">Throw it away</button>
             </div>`
          : `<div class="meta">That is not a module yet — it needs one <b>## </b> heading with the bold
              labels under it. Nothing has been added.</div>`}
      </div>` : ''}`;
}

/* ---------- the AI's part, and it reacts ---------- */

export async function learnAsk(kind, courseId, i) {
  const c = (data.courses || []).find(x => x.id === courseId);
  const box = document.getElementById('lwAttempt');
  if (!c || !box || !X.askTutor) return;
  const attempt = (box.value || draft.text).trim();
  /* ★ THE GATE, ENFORCED WHERE IT MATTERS rather than only in the renderer.
     A button that is not drawn is still callable from the console, from a
     stale panel, from a test. The rule is the rule at the door too. */
  if (!attempt) return;
  const v = view();
  v.help = { busy: true, by: 'the model' };
  renderAids();
  const step = c.steps[i] || {};
  const parts = moduleParts(step.body);
  const ask = kind === 'another'
    ? 'Write ONE more problem of the same kind and difficulty as the practice below, for the same '
      + 'learner. Just the problem — no worked answer, no hints.'
    : kind === 'theory'
    ? 'Explain the idea this practice rests on, plainly and from the ground up. Assume the learner has '
      + 'read the module and still does not see it. No praise, no preamble.'
    : 'Read what the learner actually wrote and respond to THAT: what is sound in it, what is off, and '
      + 'the single most useful next thing. Do not rewrite it for them.';
  const body = [
    'COURSE: ' + c.title,
    'MODULE: ' + (step.title || 'Module ' + (i + 1)),
    parts.objective ? 'OBJECTIVE: ' + parts.objective : '',
    parts.practice ? 'THE PRACTICE:\n' + parts.practice : '',
    kind === 'look' ? 'WHAT THE LEARNER WROTE:\n' + attempt : '',
    '',
    ask,
  ].filter(Boolean).join('\n');
  let text = '';
  try { text = await X.askTutor(body); }
  catch (e) { text = ''; }
  v.help = text
    ? { text, by: X.aiName ? X.aiName() : 'the model' }
    : { text: 'No answer came back. The desk works without one — that is why nothing here waits on it.',
        by: 'the Pavilion' };
  renderAids();
}
