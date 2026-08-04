/* ================================================================
   [THE STUDY TABLE] — working through a book one story at a time.

   Built 2026-08-04 from the steward's own description of the workflow:

     "where can i go to have the book along side me to go over the
      stories there and make a plan to digest these teachings one by
      one and have notes of it grow"

   WHY THIS IS ITS OWN FILE. `overlays.js` is ~12,400 lines and he asked
   for it to be broken up. Adding a whole workroom to it would have made
   that worse, so this is the pilot for the split: a panel that lives
   outside the monolith from the first line, proving the pattern before
   any existing region is moved.

   HOW IT TALKS TO overlays.js, and why it is this way round. The few
   things it needs that still live there — writing a book note, loading a
   book's text, the pocketed book — are INJECTED once via initStudyTable()
   rather than imported. overlays.js imports this file; this file imports
   nothing from overlays.js. No cycle, and the seam is written down
   instead of implied.

   The window-export block stays in overlays.js, which owns it. Every
   function called from an inline handler here is exported and re-listed
   there — `npm test` checks that join in both directions, because it has
   bitten twice.
   ================================================================ */

import { state, data, persist, todayKey, logActivity } from '../entities.js';
import { blip } from '../main.js';
import { esc, jsq } from './dom.js';
import { paginate } from '../data/retrieval.js';
import { findChapters } from '../data/chapters.js';
import { mergeMarks, unitsFor, unitAt, unitLabel } from '../data/marks.js';

/* Injected once, at import time in overlays.js. */
let X = {};
export function initStudyTable(deps) { X = deps || {}; }

/* ---------- the book, divided ---------- */

function marksOf(slug) {
  if (!data.bookMarks) data.bookMarks = {};
  return data.bookMarks[slug] || [];
}
/* Pagination and detection are the expensive half, so one book's worth is
   cached against the slug AND the page count — a re-imported book with a
   different length must not keep the old division. */
let cache = null;
function bookUnits(slug, text) {
  const pages = paginate(text);
  if (!cache || cache.slug !== slug || cache.pageCount !== pages.length || cache.stamp !== stampOf(slug)) {
    const detected = findChapters(pages).marks;
    cache = {
      slug, pages, pageCount: pages.length, stamp: stampOf(slug),
      units: unitsFor(pages.length, mergeMarks(detected, marksOf(slug), pages.length)),
      detectedCount: detected.length,
    };
  }
  return cache;
}
/* Cheap fingerprint of the hand marks, so labelling something rebuilds the
   division immediately instead of showing yesterday's. */
function stampOf(slug) { return marksOf(slug).map(m => m.page + ':' + m.label).join('|'); }
export function invalidateStudyCache() { cache = null; }

/* ---------- what the panel is looking at ---------- */

function view() {
  const s = state.studyView = state.studyView || { slug: null, idx: 1, labelling: false };
  return s;
}
/* The book on the table is the one you walked over with — the same pocket
   the desk's book panel already uses, so the two never disagree about which
   book you are holding. */
function tableBook() { return X.deskBook ? X.deskBook() : null; }

/* ---------- render ---------- */

export async function renderStudyTable() {
  const el = document.getElementById('planToolBody');
  if (!el) return;
  const b = tableBook();
  if (!b) {
    el.innerHTML = `<div class="meta">Nothing on the table yet. Open any book and press <b>↓ pocket</b> in the
      Reader — it comes with you, and this is where you work through it.</div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" onclick="openMyLibrary()">📚 Your shelves</button>
        <button class="btn ghost" onclick="openIndex()">🗂 The whole Index</button>
      </div>`;
    return;
  }
  const text = X.loadBookText ? await X.loadBookText(b.slug) : null;
  if (!text) {
    /* A summary-only book has no pages to divide. Say so once, plainly,
       rather than showing an empty workroom that looks broken. */
    el.innerHTML = `<div class="meta"><b>${esc(b.doc.title)}</b> is a summary rather than the full text, so there
      is nothing here to work through page by page. Notes on it still work everywhere else.</div>`;
    return;
  }
  const v = view();
  const bk = bookUnits(b.slug, text);
  if (v.slug !== b.slug) { v.slug = b.slug; v.idx = (unitAt(bk.units, b.page || 0) || bk.units[0] || {}).idx || 1; v.labelling = false; }
  const unit = bk.units.find(u => u.idx === v.idx) || bk.units[0];
  if (!unit) { el.innerHTML = `<div class="meta">This book has no pages to divide.</div>`; return; }

  el.innerHTML = navRow(b, bk, unit) + labelRow(unit, bk) + textRow(bk, unit) + notesRow(b, unit);
}

function navRow(b, bk, unit) {
  const n = bk.units.length;
  /* Say WHERE the division came from. A page-sized unit means the book told
     us nothing and nobody has said otherwise yet — which is an invitation to
     label it, not a failure. */
  const from = unit.source === 'hand' ? 'you named this one'
    : unit.source === 'detected' ? 'found in the text'
    : unit.source === 'implicit' ? 'before the first mark'
    : 'no divisions found yet — mark them as you read';
  return `<div class="row" style="align-items:center;gap:8px;flex-wrap:wrap">
      <button class="btn ghost" style="font-size:12px;padding:3px 10px" ${unit.idx <= 1 ? 'disabled' : ''} onclick="studyStep(-1)">◀</button>
      <b style="flex:1;text-align:center">${esc(unitLabel(unit))}</b>
      <button class="btn ghost" style="font-size:12px;padding:3px 10px" ${unit.idx >= n ? 'disabled' : ''} onclick="studyStep(1)">▶</button>
    </div>
    <div class="meta" style="margin-top:2px;text-align:center">${unit.idx} of ${n} · ${esc(from)}</div>
    <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
      <button class="btn" onclick="studyOpenHere()">📖 Read it here</button>
      <button class="btn ghost" onclick="studyLabelToggle()">✎ ${unit.source === 'hand' ? 'Rename this' : 'Label this page'}</button>
      ${unit.source === 'hand' ? `<button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="studyUnlabel(${unit.from})">✕ unmark</button>` : ''}
    </div>`;
}

function labelRow(unit, bk) {
  if (!view().labelling) return '';
  /* Labelling marks THE PAGE YOU ARE ON, which for a unit you are viewing is
     its first page. The wording says so, because "label this page" is
     ambiguous the moment a unit spans nine of them. */
  return `<div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
      <div class="s">Naming page ${unit.from + 1} as the start of a story. Your words — this is your own
        commentary on the book, and it outranks anything we detected.</div>
      <input type="text" id="studyLabelInput" maxlength="90" placeholder="e.g. Advice to Sigālaka — the six directions"
        value="${esc(unit.source === 'hand' ? unit.label : '')}"
        onkeydown="if(event.key==='Enter'){event.preventDefault();studyLabelSave();}">
      <div class="row" style="margin-top:8px">
        <button class="btn" onclick="studyLabelSave()">Keep it</button>
        <button class="btn ghost" onclick="studyLabelToggle()">Cancel</button>
      </div>
    </div>`;
}

function textRow(bk, unit) {
  const slice = bk.pages.slice(unit.from, unit.to + 1).join('\n\n');
  const shown = slice.length > 2400 ? slice.slice(0, 2400) + '…' : slice;
  return `<div class="card" style="cursor:default;margin-top:10px;max-height:260px;overflow:auto">
      <div style="white-space:pre-wrap;font-size:12.5px;line-height:1.55">${esc(shown)}</div>
    </div>
    ${slice.length > 2400 ? `<div class="meta" style="margin-top:4px">Showing the opening of this one — press 📖 to read all of it.</div>` : ''}`;
}

/* Notes belonging to THIS story: the ones written on its pages. Book notes
   have recorded their page since the reader learned to; this is the first
   thing that groups them by a division the reader chose himself. */
export function notesInUnit(slug, unit) {
  return (data.bookNotes[slug] || [])
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.page !== undefined && n.page >= unit.from && n.page <= unit.to);
}

function notesRow(b, unit) {
  const mine = notesInUnit(b.slug, unit);
  return `<h4 style="margin:14px 0 4px">Your notes on this one${mine.length ? ' · ' + mine.length : ''}</h4>
    ${mine.length ? mine.map(({ n, i }) => `<div class="card" style="cursor:default">
        <div class="s">${esc(n.ts || '')} · p. ${(n.page || 0) + 1}</div>
        <div style="white-space:pre-wrap">${esc((n.text || '').length > 220 ? n.text.slice(0, 220) + '…' : n.text)}</div>
      </div>`).join('') : `<div class="meta">Nothing yet on this one.</div>`}
    <textarea id="studyNoteInput" rows="3" style="margin-top:8px"
      placeholder="What is this story actually saying? Your note keeps this page."></textarea>
    <div class="row" style="margin-top:6px;align-items:center">
      <button class="btn" onclick="studyAddNote()">✎ Keep this note</button>
      <span class="meta" id="studyMsg" style="margin:0"></span>
    </div>`;
}

/* ---------- the actions ---------- */

export function studyStep(dir) {
  const v = view();
  v.idx = Math.max(1, v.idx + (dir > 0 ? 1 : -1));
  v.labelling = false;
  blip(dir > 0 ? 600 : 460, .05, 'sine', .03);
  renderStudyTable();
}
export function studyLabelToggle() { const v = view(); v.labelling = !v.labelling; renderStudyTable(); }

export function studyLabelSave() {
  const b = tableBook(); if (!b || !cache) return;
  const unit = cache.units.find(u => u.idx === view().idx); if (!unit) return;
  const input = document.getElementById('studyLabelInput');
  const label = (input ? input.value : '').trim();
  if (!label) return;
  if (!data.bookMarks) data.bookMarks = {};
  const list = data.bookMarks[b.slug] = (data.bookMarks[b.slug] || []).filter(m => m.page !== unit.from);
  list.push({ page: unit.from, label, ts: todayKey() });
  list.sort((a, z) => a.page - z.page);
  persist();
  invalidateStudyCache();
  /* Where the database is running this becomes a real chapter record with
     source='hand' and confirmed — the column that has existed since the
     schema went in and that nothing ever wrote to. Absent without it, and
     nothing here depends on the write succeeding. */
  if (X.mirrorMarks) X.mirrorMarks(b.slug);
  logActivity('Named a story in "' + b.doc.title + '": "' + label + '".');
  blip(700, .06, 'sine', .03);
  const v = view();
  v.labelling = false;
  renderStudyTable().then(() => {
    // the division just changed under us; land on the story you named
    const bk = cache;
    const u = bk && unitAt(bk.units, unit.from);
    if (u) { v.idx = u.idx; renderStudyTable(); }
  });
}

export function studyUnlabel(page) {
  const b = tableBook(); if (!b) return;
  if (!data.bookMarks) data.bookMarks = {};
  data.bookMarks[b.slug] = (data.bookMarks[b.slug] || []).filter(m => m.page !== page);
  persist();
  invalidateStudyCache();
  if (X.mirrorMarks) X.mirrorMarks(b.slug);
  blip(392, .05, 'sine', .03);
  renderStudyTable();
}

export function studyOpenHere() {
  const b = tableBook(); if (!b || !cache) return;
  const unit = cache.units.find(u => u.idx === view().idx); if (!unit) return;
  if (X.openBookAt) X.openBookAt(b.slug, unit.from);
}

export function studyAddNote() {
  const b = tableBook(); if (!b || !cache) return;
  const unit = cache.units.find(u => u.idx === view().idx); if (!unit) return;
  const input = document.getElementById('studyNoteInput'); if (!input) return;
  const text = input.value.trim(); if (!text) return;
  /* Through the Reader's own path, so a note written here is identical to one
     written there — same shape, same chapter and page, same four doors. */
  if (X.writeBookNote) X.writeBookNote(b.slug, text, unit.from);
  input.value = '';
  renderStudyTable().then(() => {
    const msg = document.getElementById('studyMsg');
    if (msg) msg.textContent = '✓ kept on p. ' + (unit.from + 1);
  });
  blip(700, .06, 'sine', .03);
}

/* For the toolbox button, so it names the book you are working through. */
export function studyTableLabel() {
  const b = tableBook();
  return b ? 'Work through ' + b.doc.title : 'Work through a book';
}
