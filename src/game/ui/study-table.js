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
import { ROLES, ROLE_KEYS, rosterForVisitor } from '../data/roles.js';
import { versionsOf, addVersion, restoreVersion, versionSummary, hasHistory, TAG_ORIGINAL } from '../data/note-versions.js';
import { carriedOf, canAccept } from '../data/carrying.js';

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
/* ---- THE TRAY: what you brought, and which of it is in front of you ----

   The table used to work on exactly one book — whichever you had pocketed —
   so "work through a book" meant one book forever, and putting a second one
   next to it was impossible. The steward asked for both halves:

     "the notes of the book can be loaded there through the back pack so the
      user has to do it, and the book can be broung out and references in the
      same way or one after another."

   So the tray IS THE BACKPACK, filtered to what this surface accepts. No
   third state and no "put down" step: carrying something and walking here is
   putting it on the table, which is the whole point of one carry verb. What
   IS manual — and stays manual — is which one you are working on. Nothing is
   chosen for you; §0 of the plan, and the same rule as the-day.js's picked-up
   path beating an inferred one.

   canAccept() rather than a list of kinds, so adding a kind to
   data/carrying.js works here with nothing edited. */
function trayOf(kind) {
  if (!canAccept('studyTable', kind)) return [];
  return carriedOf(data.carrying || [], kind)
    /* `book` is the deskBook-SHAPED WRAPPER, so the title is book.doc.title.
       This field was called `doc` at first, which made `x.doc.title` read
       undefined and fall back silently to the slug — the chips said
       "personal-first-book" on screen while the heading beside them said
       "The First Book". Named so it cannot be read wrong. */
    .map(e => ({ entry: e, book: docFor(e.ref) }))
    .filter(x => x.book);
}
/* THE SAME SHAPE deskBook() RETURNS, and it has to be: tableBook() may hand
   back either, and everything downstream reads `b.doc.title`. The first
   version returned Store.getDoc()'s entry directly — whose title is top-level,
   not under .doc — so the heading read "Working through undefined" while the
   tray beside it showed the title correctly. Two shapes behind one function is
   the drift this whole day has been about; there is one, and it is this. */
function docFor(slug) {
  try {
    const entry = X.getDoc ? X.getDoc(slug) : null;
    if (!entry) return null;
    return { slug, doc: entry, page: (X.pageIn ? X.pageIn(slug) : 0) || 0, ch: null, view: null, pages: null };
  } catch (e) { return null; }
}

/* THE BOOK IN FRONT OF YOU. Your choice first, then the one you walked in
   with — never a guess. `studyView.slug` is only honoured while you are
   actually carrying it, so setting a book down puts it away here too rather
   than leaving the table pointing at something no longer in your hands. */
export function tableBook() {
  const books = trayOf('book');
  const v = state.studyView;
  if (v && v.slug) {
    const chosen = books.find(x => x.entry.ref === v.slug);
    if (chosen) return chosen.book;
  }
  const pocketed = X.deskBook ? X.deskBook() : null;
  if (pocketed) return pocketed;
  return books.length ? books[0].book : null;
}

/* One press to swap books. Only rendered with more than one on the tray —
   a picker offering one choice is a label pretending to be a control. */
function trayRow(current) {
  const books = trayOf('book');
  const notes = trayOf('note').length;
  if (books.length < 2 && !notes) return '';
  const chips = books.map(x => {
    const on = current && x.entry.ref === current.slug;
    return `<button class="btn ghost" onclick="studySetBook('${jsq(x.entry.ref)}')"
      style="margin:0 6px 6px 0;padding:4px 9px;font-size:12px${on ? ';background:#e0a43c;color:#2a2118' : ''}"
      >\u{1F4D6} ${esc((x.book.doc && x.book.doc.title) || x.entry.label || x.entry.ref)}</button>`;
  }).join('');
  return `<div class="card" style="cursor:default;margin-bottom:10px">
    <div class="s" style="margin:0 0 6px">On the table \u2014 what you carried in. ${books.length > 1
      ? 'Pick one to work through; the others stay here.' : ''}</div>
    ${chips}
    ${notes ? `<div class="s" style="margin-top:4px">\u{1F5D2} ${notes} note${notes === 1 ? '' : 's'}
      you brought, shown beside the part ${notes === 1 ? 'it belongs' : 'they belong'} to.</div>` : ''}
  </div>`;
}
export function studySetBook(slug) {
  const v = view();
  v.slug = slug; v.idx = 1; v.labelling = false;
  cache = null;
  /* THE HEADING LIVES OUTSIDE THIS BODY. renderStudyTable() rewrites
     #planToolBody; the tool's title is drawn one level up by renderToolPanel().
     Re-rendering only the body left the heading naming the PREVIOUS book while
     the pages below it were the new one — which is worse than no heading,
     because it is confidently wrong. Redraw both. */
  if (X.refreshPanel) X.refreshPanel(); else renderStudyTable();
}

/* ---------- render ---------- */

export async function renderStudyTable() {
  const el = document.getElementById('planToolBody');
  if (!el) return;
  const b = tableBook();
  if (!b) {
    /* THE EMPTY STATE POINTS AT THE BACKPACK, because that is now how things
       get here. It used to name pocketing only, which was the single narrow
       door — and the reason the table could hold one book forever. */
    el.innerHTML = `<div class="meta">Nothing on the table yet. Put a book in your <b>🎒 backpack</b> —
      from any shelf, or <b>🎒 Take with you</b> in the Reader — and it is here when you sit down.
      Bring notes the same way and they sit beside the part they belong to.</div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" onclick="openInventory()">🎒 Your backpack</button>
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

  el.innerHTML = trayRow(b) + navRow(b, bk, unit) + labelRow(unit, bk) + textRow(bk, unit)
    + carriedNotesRow(b, unit) + notesRow(b, unit) + draftRow(b, bk) + chatRow(b, unit);
}

/* The way OUT of the table, and it only appears once there is work to build
   from — an empty "draft a lesson" button is a promise the panel cannot keep. */
function draftRow(b, bk) {
  const worked = workedUnits(b.slug, bk.units);
  if (!worked.length) return '';
  return `<div class="card" style="cursor:default;margin-top:14px;border-color:#8fb4d9">
      <div class="t">Make a lesson out of this</div>
      <div class="s" style="margin-top:5px">You have notes on <b>${worked.length}</b> part${worked.length === 1 ? '' : 's'} of
        this book. Those parts, in order, become the steps — each one linking back to its own pages. It opens
        in the lesson writer for you to change before anything is kept.</div>
      <div class="row" style="margin-top:8px">
        <button class="btn" onclick="studyDraftLesson()">✎ Draft a lesson from these notes</button>
      </div>
      <div class="meta" id="studyDraftMsg" style="margin:6px 0 0"></div>
    </div>`;
}

/* ---------- the chat, grounded in THIS story ----------

   The steward's own words for what he wanted here:

     "an ai chat window there so i can say i wana make a small lesson on this
      story help me break it down and the lessons we can gain from it."

   ONE AT A TIME, ONE THREAD EACH — the same rule the Writing Desk's picker
   follows. Calling the Tutor over must never hand her the Steward's last four
   exchanges as if they were her own.

   The DEFAULT is derived, not named: whoever carries `studio: true` in
   data/roles.js, which is the Steward, because his duty there is literally
   pre-notes on a book and shaping raw material. npm test asserts exactly one. */
function studioDefault() {
  const r = ROLE_KEYS.find(k => ROLES[k].studio);
  return r || 'steward';
}
function chatState() {
  const c = state.studyChat = state.studyChat || {};
  if (!c.agent || !ROLES[c.agent]) c.agent = studioDefault();
  c.byAgent = c.byAgent || {};
  c.byAgent[c.agent] = c.byAgent[c.agent] || { history: [] };
  return c;
}
function residents() {
  return (X.residents ? X.residents() : rosterForVisitor());
}

function chatRow(b, unit) {
  if (!X.askResident) return '';
  const c = chatState(), key = c.agent, t = c.byAgent[key], r = ROLES[key] || { label: key };
  if (X.aiActive && !X.aiActive()) {
    return `<h4 style="margin:14px 0 4px">Talk it through</h4>
      <div class="meta">No local AI connected (⚙ Manage AI connections). Everything else on this table works without one.</div>`;
  }
  const picker = residents().map(p => `<button class="btn ${p.key === key ? '' : 'ghost'}" style="font-size:11px;padding:3px 10px"
      title="${esc(p.title || '')}" onclick="studySetAgent('${jsq(p.key)}')">${esc(p.label)}${(c.byAgent[p.key] && c.byAgent[p.key].history.length) ? ' •' : ''}</button>`).join('');
  const quick = [
    ['Break this one down', 'Help me break this story down — what is actually happening in it, and how is it built?'],
    ['What can we take from it', 'What can we take from this story? The lessons in it, plainly.'],
    ['Draft a small lesson', 'I want to make a small lesson on this story for someone new to it. Where would you start?'],
  ];
  return `<h4 style="margin:14px 0 4px">Talk it through — about this one</h4>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">${picker}</div>
    <div class="meta" style="margin-top:0">${esc(r.label)} is reading <b>${esc(unit.label)}</b> with you. One at a time; each keeps their own thread.</div>
    <div class="row" style="margin:6px 0;gap:6px;flex-wrap:wrap">
      ${quick.map(([label, prompt]) => `<button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="studyFillPrompt('${jsq(prompt)}')">${esc(label)}</button>`).join('')}
    </div>
    <div id="studyChatLog">${(t.history || []).map((h, i) => `<div class="card" style="cursor:default">
        <div class="t">${h.role === 'user' ? 'You' : esc(r.label)}</div>
        <div class="s" style="white-space:pre-wrap">${esc(h.content)}</div>
        ${h.role === 'assistant' ? `<div class="row" style="margin-top:6px"><button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="studyKeepReply(${i})">✎ Keep this as a note</button></div>` : ''}
      </div>`).join('')}</div>
    <textarea id="studyAskInput" rows="2" placeholder="Ask ${esc(r.label)} about this story…"></textarea>
    <div class="row" style="margin-top:6px;align-items:center">
      <button class="btn" onclick="studyAsk()">Ask</button>
      <span class="meta" id="studyAskMsg" style="margin:0"></span>
    </div>`;
}

/* WHAT THE RESIDENT IS ACTUALLY SHOWN. The story's own text — bounded, and
   declared an excerpt rather than silently truncated — plus the visitor's own
   notes on it. This is the difference between a resident who has read what you
   are reading and one guessing from a title. */
function grounding(b, unit, bk) {
  const full = bk.pages.slice(unit.from, unit.to + 1).join('\n\n');
  const CAP = 6000;
  const body = full.length > CAP ? full.slice(0, CAP) : full;
  const mine = notesInUnit(b.slug, unit).map(({ n }) => '- ' + (n.text || '')).join('\n');
  return `\n\nTHE VISITOR IS WORKING THROUGH A BOOK, ONE STORY AT A TIME, AND THIS IS THE ONE IN FRONT OF THEM.\n`
    + `BOOK: "${b.doc.title}"${b.doc.attribution ? ' by ' + b.doc.attribution : ''}\n`
    + `THIS PART: "${unit.label}"${unit.source === 'hand' ? ' (they named it themselves)' : ''} — ${unitLabel(unit)}\n`
    + (full.length > CAP ? `\nTHE OPENING OF ITS TEXT (an excerpt — the part is longer than this):\n` : `\nITS TEXT IN FULL:\n`)
    + body
    + (mine ? `\n\nWHAT THEY HAVE ALREADY WRITTEN ABOUT THIS PART — build on it rather than repeating it:\n${mine}` : `\n\n(they have not written anything on this part yet)`)
    + `\n\nStay with THIS part. Speak from the text above and say plainly when something is not in it; `
    + `they are studying carefully, not looking for a summary of the whole book.`;
}

export function studySetAgent(key) {
  if (!ROLES[key]) return;
  const c = chatState();
  if (c.agent === key) return;
  c.agent = key; chatState();
  blip(560, .05, 'sine', .03);
  renderStudyTable();
}
export function studyFillPrompt(text) {
  const el = document.getElementById('studyAskInput');
  if (el) { el.value = text; el.focus(); }
}
export async function studyAsk() {
  const b = tableBook(); if (!b || !cache) return;
  const unit = cache.units.find(u => u.idx === view().idx); if (!unit) return;
  const input = document.getElementById('studyAskInput'); if (!input) return;
  const q = input.value.trim(); if (!q) return;
  const c = chatState(), key = c.agent, thread = c.byAgent[key];
  thread.history.push({ role: 'user', content: q });
  input.value = '';
  await renderStudyTable();
  const msg = () => document.getElementById('studyAskMsg');
  const m = msg(); if (m) m.textContent = '…';
  try {
    const reply = await X.askResident(key, thread.history, grounding(b, unit, cache));
    thread.history.push({ role: 'assistant', content: reply });
    logActivity('Talked with ' + ((ROLES[key] || {}).label || key) + ' about "' + unit.label + '".');
  } catch (e) {
    thread.history.push({ role: 'assistant', content: (ROLES[key] || {}).label + "'s connection flickered — no answer this time." });
  }
  await renderStudyTable();
}
/* A reply worth keeping becomes a note on THIS story, through the Reader's own
   path — so it is indistinguishable from one written by hand and carries the
   same page and the same doors. */
export function studyKeepReply(i) {
  const b = tableBook(); if (!b || !cache) return;
  const unit = cache.units.find(u => u.idx === view().idx); if (!unit) return;
  const c = chatState(), t = c.byAgent[c.agent];
  const h = (t.history || [])[i]; if (!h || h.role !== 'assistant') return;
  if (X.writeBookNote) X.writeBookNote(b.slug, h.content, unit.from);
  blip(700, .06, 'sine', .03);
  renderStudyTable().then(() => {
    const m = document.getElementById('studyMsg');
    if (m) m.textContent = '✓ kept on p. ' + (unit.from + 1);
  });
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

/* NOTES YOU CARRIED IN, beside the part they belong to.

   The other half of what the tray is for: "the notes of the book can be
   loaded there through the back pack so the user has to do it." A note in
   your backpack that names a page in THIS book, and falls inside the part
   you are looking at, is shown here — because that is the moment it is
   useful, and no other moment.

   It is a REFERENCE, not a copy: X.noteByKey resolves it live, so a note
   edited elsewhere reads correctly here and a note deleted elsewhere simply
   stops appearing rather than becoming a ghost. Same rule as the backpack
   itself. */
function carriedNotesIn(b, unit) {
  const out = [];
  for (const e of carriedOf(data.carrying || [], 'note')) {
    const n = X.noteByKey ? X.noteByKey(e.ref) : null;
    if (!n || n.slug !== b.slug) continue;
    const page = Number.isInteger(n.page) ? n.page : null;
    if (page == null || page < unit.from || page > unit.to) continue;
    out.push({ e, n, page });
  }
  return out.sort((a, x) => a.page - x.page);
}
function carriedNotesRow(b, unit) {
  const carried = carriedNotesIn(b, unit);
  if (!carried.length) return '';
  return `<h4 style="margin:14px 0 4px">\u{1F5D2} Notes you brought \u00b7 ${carried.length}</h4>
    <div class="meta" style="margin:0 0 6px">From your backpack, and only the ones that land in this part.</div>
    ${carried.map(({ e, n, page }) => `<div class="card" style="cursor:default;border-color:#8fb4d9">
      <div class="s">p. ${page + 1}${n.where ? ' \u00b7 ' + esc(n.where) : ''}</div>
      <div style="white-space:pre-wrap">${esc((n.text || '').length > 220 ? n.text.slice(0, 220) + '\u2026' : (n.text || ''))}</div>
      <div class="row" style="margin-top:6px">
        <button class="btn ghost" style="font-size:11px;padding:3px 10px"
          onclick="openNotesLog('${jsq(e.ref)}')">Open where it lives</button>
      </div>
    </div>`).join('')}`;
}

function notesRow(b, unit) {
  const mine = notesInUnit(b.slug, unit);
  const canTidy = !!(X.askResident && (!X.aiActive || X.aiActive()));
  return `<h4 style="margin:14px 0 4px">Your notes on this one${mine.length ? ' · ' + mine.length : ''}</h4>
    ${mine.length ? mine.map(({ n, i }) => `<div class="card" style="cursor:default">
        <div class="s">${esc(n.ts || '')} · p. ${(n.page || 0) + 1}${hasHistory(n) ? ` · <span style="color:#c9a86a">${versionsOf(n).length} versions</span>` : ''}</div>
        <div style="white-space:pre-wrap">${esc((n.text || '').length > 220 ? n.text.slice(0, 220) + '…' : n.text)}</div>
        <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">
          ${canTidy ? `<button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="studyTidyNote(${i})"
              title="A cleaner version, kept BESIDE yours — nothing you wrote is replaced">✨ Tidy this up</button>` : ''}
          ${hasHistory(n) ? `<button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="studyToggleHistory(${i})">🕐 ${view().openHistory === i ? 'hide' : 'history'}</button>` : ''}
        </div>
        ${view().openHistory === i ? historyStrip(n, i) : ''}
      </div>`).join('') : `<div class="meta">Nothing yet on this one.</div>`}
    <textarea id="studyNoteInput" rows="3" style="margin-top:8px"
      placeholder="What is this story actually saying? Your note keeps this page."></textarea>
    <div class="row" style="margin-top:6px;align-items:center">
      <button class="btn" onclick="studyAddNote()">✎ Keep this note</button>
      <span class="meta" id="studyMsg" style="margin:0"></span>
    </div>`;
}

/* THE HISTORY, shown as what it is: a short list of what this note has been,
   oldest first, with the current one marked. Every earlier version can be made
   current again — and doing so APPENDS it, so pressing restore can itself be
   undone. See data/note-versions.js for why that is the whole design. */
function historyStrip(n, i) {
  const rows = versionSummary(n, 90);
  return `<div style="margin-top:8px;border-top:1px solid #55432e;padding-top:8px">
    ${rows.map(v => `<div class="s" style="margin-bottom:6px;${v.current ? 'color:#f5e9d4' : 'opacity:.75'}">
        <span class="badge lic">${esc(v.tag)}${v.by ? ' · ' + esc((ROLES[v.by] || {}).label || v.by) : ''}</span>
        ${v.current ? '<span class="badge" style="border-color:#7fb069;color:#9fd07f">now</span>' : ''}
        ${esc(v.ts || '')}
        <div style="white-space:pre-wrap;margin-top:2px">${esc(v.preview)}</div>
        ${v.current ? '' : `<button class="btn ghost" style="font-size:10.5px;padding:2px 8px;margin-top:3px" onclick="studyRestoreVersion(${i},${v.i})">↩ make this the one</button>`}
      </div>`).join('')}
    <div class="meta" style="margin:0">Nothing here is ever deleted — going back adds to the list rather than cutting it short.</div>
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

export function studyToggleHistory(i) {
  const v = view();
  v.openHistory = (v.openHistory === i) ? null : i;
  renderStudyTable();
}
export function studyRestoreVersion(noteIndex, versionIndex) {
  const b = tableBook(); if (!b) return;
  const n = (data.bookNotes[b.slug] || [])[noteIndex]; if (!n) return;
  restoreVersion(n, versionIndex);
  persist();
  blip(620, .06, 'sine', .03);
  renderStudyTable();
}
/* ✎ TIDY THIS UP — the one place an AI touches the visitor's own writing, and
   it never touches it. A cleaner version is APPENDED beside theirs, tagged
   `ai-cleanup` and credited to whoever is at the table; theirs stays tagged
   `original` and stays readable in the history. There is no press in this
   panel that can lose a sentence.

   Deliberately asks for the note back and NOTHING else — a model that
   volunteers "Here's a tidied version:" would put that preamble into the
   visitor's own note, so the obvious wrappers are stripped on the way in. */
export async function studyTidyNote(i) {
  const b = tableBook(); if (!b || !cache) return;
  const unit = cache.units.find(u => u.idx === view().idx); if (!unit) return;
  const n = (data.bookNotes[b.slug] || [])[i]; if (!n) return;
  if (!X.askResident) return;
  const key = chatState().agent;
  const say = t => { const el = document.getElementById('studyMsg'); if (el) el.textContent = t; };
  say('tidying…');
  try {
    const asked = 'Here is a note the reader wrote about this part, in their own words:\n\n"'
      + (n.text || '') + '"\n\n'
      + 'Give it back tidier — clearer, better ordered, the same length or shorter. Keep THEIR meaning, '
      + 'THEIR voice and anything they noticed; add no new claims and no flattery. If it is already clear, '
      + 'return it nearly unchanged. Reply with the tidied note ALONE — no preamble, no quotation marks, '
      + 'no explanation of what you changed.';
    let out = await X.askResident(key, [{ role: 'user', content: asked }], grounding(b, unit, cache));
    out = String(out || '')
      .replace(/^\s*(?:here(?:'s| is)[^:\n]*:|tidied(?: note)?:|revised:)\s*/i, '')
      .replace(/^\s*["“”']+|["“”']+\s*$/g, '')
      .trim();
    if (!out) { say('nothing came back — try again.'); return; }
    const before = versionsOf(n).length;
    addVersion(n, out, 'ai-cleanup', key);
    persist();
    const after = versionsOf(n).length;
    view().openHistory = i;                   // show them what changed, immediately
    await renderStudyTable();
    say(after > before ? '✨ tidied — yours is kept below as "original"' : 'it was already clear; nothing changed');
    blip(700, .06, 'sine', .03);
  } catch (e) {
    say('the connection flickered — your note is untouched.');
  }
}

/* ---------- DRAFT A LESSON FROM THE WORK YOU ACTUALLY DID ----------

   Stage 1d, and the payoff of the whole table:

     "then with all these notes i would like to draft a lesson plan slowly and
      with guidlnes."

   THE STRUCTURE IS NOT THE MODEL'S JOB. The stories you named and took notes
   on ARE the lesson — that sequence is real work you already did, and code
   knows it exactly. So the steps are built here, in order, one per story you
   actually worked. The model is asked for one thing only: the body of each
   step, written from YOUR notes on that story. Deterministic code first; the
   model for what code cannot do.

   Every step carries its page range, which means readingIn() (data/lesson-doc.js)
   turns each one into a real door into the book with nothing extra to write.

   And it lands in the AUTHORING FORM, not in the tree. You read it, change it,
   and press. Nothing reaches the wall without that press. */
export function workedUnits(slug, units) {
  return (units || []).map(u => ({ unit: u, notes: notesInUnit(slug, u) }))
    .filter(x => x.notes.length);
}
export async function studyDraftLesson() {
  const b = tableBook(); if (!b || !cache) return;
  const worked = workedUnits(b.slug, cache.units);
  const say = t => { const el = document.getElementById('studyDraftMsg'); if (el) el.textContent = t; };
  if (!worked.length) { say('Take a note on a story or two first — the lesson is built out of the ones you have actually worked.'); return; }

  /* The skeleton, built from real work rather than asked for. */
  const steps = worked.map(({ unit }) => ({
    title: `${unit.label} — pp. ${unit.from + 1}–${unit.to + 1}`,
    body: '',
  }));

  if (X.draftText && (!X.aiActive || X.aiActive())) {
    say('drafting from your notes…');
    try {
      const material = worked.map(({ unit, notes }, i) =>
        `${i + 1}. ${unit.label}\n` + notes.map(({ n }) => '   - ' + (n.text || '')).join('\n')).join('\n\n');
      const asked = 'I have worked through parts of "' + b.doc.title + '" and taken these notes:\n\n'
        + material + '\n\n'
        + 'Write ONE line for each numbered part, in the same order, saying what a learner should actually DO '
        + 'with that part — drawn from my notes above, not from general knowledge. Format each as:\n'
        + '<number>. <what to do>\n'
        + 'Nothing else. No heading, no commentary. Do not mention this application, its rooms or its '
        + 'residents — these are instructions for reading a book.';
      const reply = await X.draftText(asked);
      /* Parsed leniently and NEVER trusted to be complete — a step the model
         skipped keeps the reader's own note as its body, so the draft is whole
         either way. A half-filled form is worse than an honest one. */
      const byIndex = {};
      for (const line of String(reply || '').split('\n')) {
        const m = /^\s*(\d{1,2})\s*[.)\]:-]\s*(\S.*)$/.exec(line);
        if (m) byIndex[Number(m[1])] = m[2].trim();
      }
      steps.forEach((s, i) => { s.body = byIndex[i + 1] || ''; });
    } catch (e) { say('the connection flickered — drafting the shape without it.'); }
  }
  /* Where the model said nothing, the reader's own words stand. */
  steps.forEach((s, i) => {
    if (!s.body) {
      const first = worked[i].notes[0];
      s.body = first ? String(first.n.text || '').replace(/\s+/g, ' ').slice(0, 220) : '';
    }
  });

  if (!X.openLessonWriter) return;
  X.openLessonWriter({
    title: b.doc.title + ' — what I found in it',
    summary: `A path through ${worked.length} part${worked.length === 1 ? '' : 's'} of "${b.doc.title}", built from the notes I took working through it.`,
    bookSlug: b.slug,
    steps,
  });
}

/* For the toolbox button, so it names the book you are working through. */
export function studyTableLabel() {
  const b = tableBook();
  return b ? 'Work through ' + b.doc.title : 'Work through a book';
}
