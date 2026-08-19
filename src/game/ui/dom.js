/* ================================================================
   [DOM HELPERS] — the two escaping functions, in one place.

   The first extraction out of `overlays.js`, and deliberately the
   smallest possible one: two pure string functions with no imports and
   no state. It exists because `ui/study-table.js` needs them too, and a
   second copy of an escaping rule is exactly the drift this project has
   paid for three times.

   Nothing else moves here. `esc` is called several hundred times in
   overlays.js and the change there is a single line — which is the point
   of starting with this file rather than a panel.
   ================================================================ */

/* For text going into HTML. */
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ESCAPE FIRST, THEN ONE MARK. A lesson step can hold real prose since
   2026-08-10, and the portable course format asks authors to label the parts
   of a step — "**Practice:** read it once" — because that is what a model
   emits when you ask it for Markdown. Rendered through esc() alone those
   asterisks show up raw, which was visible the first time anyone LOOKED at a
   multi-paragraph step rather than asserting its text was present.

   DELIBERATELY ONE MARK, not a Markdown renderer. Bold is the only thing the
   format asks for; headings, links and lists inside a step body are somebody
   else's problem and every one of them is a way to smuggle HTML. esc() runs
   FIRST and this only ever introduces <b>, so there is no path from author
   text to markup — the substitution operates on already-escaped output where
   `<` cannot exist. Anything unmatched stays as literal asterisks, which is
   the honest failure. */
export function mdLite(s) {
  return esc(s == null ? '' : s).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
}

/* A COURSE'S PROSE — paragraphs, soft line breaks, and the bold labels
   ("**Practice:** …") the portable format asks authors for and a model emits.
   mdLite escapes FIRST and introduces only <b>, so this can never turn author
   text into markup; paragraphs and breaks are structure this adds, not markup
   it honours.

   It lived in overlays.js as a one-liner until 2026-08-15, when the Learning
   Desk needed the same thing — and the desk's first version reached for
   mdLite() alone instead. LOOKING at it showed why that is not the same: a
   three-bullet practice rendered as one running sentence, "- In Falstad… - On
   paper… - Write three sentences…", which reads as prose that has lost its
   punctuation rather than as a list of three things to do. Two renderers for
   one kind of text is the drift rule 4 is about; there is one, and it is
   here, beside the escaping it depends on. */
export const courseProse = s => String(s == null ? '' : s).split(/\n\s*\n/).filter(p => p.trim())
  .map(p => `<p style="margin:.5em 0">${mdLite(p).replace(/\n/g, '<br>')}</p>`).join('');

/* ★ WHAT GETS YOU TO THE NEXT MODULE, drawn. `moduleChecklist()` in
   data/course-format.js derives the rows; this is the only thing that paints
   them, and it is here rather than in either caller for the same reason
   courseProse is — the Board and the Learning Desk both show this list, and
   two renderers for one list is the drift rule 4 is about. The Board would
   have grown one and the desk the other, and they would have disagreed about
   what "done" looks like within a week.

   `doors` maps a row's `door` string to HTML the caller supplies, because the
   two rooms open different things: the Board sends you to the desk, and the
   desk is already the desk. dom.js knows nothing about either. */
export function checklistHTML(list, doors, opts) {
  if (!list || !list.any) return '';
  const d = doors || {};
  /* THE LEAD IS SUPPRESSIBLE, and the desk suppresses it. LOOKING at the desk
     showed the same reading instruction twice on one screen — once as its own
     "First — go through these" block with the full list, and again three
     inches below in the checklist. That is the bug we fixed yesterday (the
     purpose paragraph, rendered by the meta line AND the syllabus), and the
     fix then was the same as the fix now: one of them defers. The Board keeps
     it, because there the checklist is the only place it is stated plainly. */
  const lead = (!opts || opts.lead !== false) ? (list.lead || '') : '';
  const counted = list.rows.filter(r => r.counted);
  const yours = list.rows.filter(r => !r.counted);
  const row = r => `<div style="display:flex;gap:8px;align-items:baseline;margin:5px 0">
      <span style="flex:0 0 auto;width:15px;text-align:center;color:${r.done ? '#7fa36b' : '#8a7a5f'}">${r.done ? '✓' : '○'}</span>
      <span style="flex:0 0 auto;opacity:.8">${r.icon}</span>
      <span style="flex:1;font-size:13px;line-height:1.5;color:${r.done ? '#9db98a' : '#e2d5bd'}">${esc(r.text)}
        <span class="meta" style="opacity:.7"> — ${esc(r.how)}</span>
        ${!r.done && r.door && d[r.door] ? d[r.door] : ''}</span>
    </div>`;
  const mine = r => `<div style="display:flex;gap:8px;align-items:baseline;margin:5px 0">
      <span style="flex:0 0 auto;width:15px;text-align:center;opacity:.45">·</span>
      <span style="flex:0 0 auto;opacity:.8">${r.icon}</span>
      <span style="flex:1;font-size:13px;line-height:1.5;color:#cbbda3">${esc(r.text)}</span>
    </div>`;
  /* A REAL CLASS, not a shape a test has to infer. The first live suite found
     this box by looking for a div whose text starts with the heading — and got
     the WHOLE MODULE ROW, because the box's own textContent starts with the
     heading too and document order hands you the outer one first. Every
     assertion then read the module's prose and passed or failed on the wrong
     text entirely. A surface worth testing is worth naming. */
  return `<div class="modChecklist" style="margin-top:12px;padding:10px 12px;border:2px solid #55432e;border-radius:8px;background:#1b140d">
    <div class="meta" style="margin:0 0 6px">What gets you to the next module${counted.length
      ? ' — <b>' + list.done + ' of ' + counted.length + '</b>' : ''}</div>
    ${lead ? `<div style="margin:0 0 8px;padding-left:2px;font-size:13px;line-height:1.5;color:#cbbda3">
        📖 ${esc(lead)}</div>` : ''}
    ${counted.map(row).join('')}
    ${yours.length ? `<div class="meta" style="margin:9px 0 3px;opacity:.75;border-top:1px solid #3a2e1c;padding-top:7px">
        And these are yours to say — nobody can check them for you</div>
      ${yours.map(mine).join('')}` : ''}
  </div>`;
}

/* The one <select> skin used across the panels. It lived in overlays.js until
   the Learning Tree moved out and took a `<select>` with it — a bare constant,
   so it crashed at runtime rather than at build time, and neither `npm test`
   nor the bundler said a word. A shared look belongs in one place; the
   alternative was a third copy of the same nine declarations. */
export const NOTE_SELECT_STYLE =
  'width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;' +
  'color:#f5e9d4;font-family:inherit;font-size:13px;padding:7px 9px';

/* ⚠ IS THE TITLE SCREEN STILL UP? — and why a one-line predicate earns a home.

   Three panels are reachable BEFORE "Enter the Grounds" is pressed: the
   Connections panel, the welcome panel, and the walk. #title is z-index:10 and
   an .overlay is z-index:9, so anything else opened while the title screen is
   showing mounts BEHIND it — .open applied, state.ui set, and nothing visible.
   That shipped: "🧭 New here? Start here" was invisible for months.

   The three that belong there get a z-index exception in style.css and npm test
   derives the list. This is the other half: a panel that does NOT belong over
   the title screen must not be opened from one. The Connections panel's
   "← Back to menu" did exactly that, and the pause menu is the worst possible
   landing — it is full of PLACES buttons that would each open another invisible
   overlay, so raising its z-index would have traded one dead button for a menu
   of them.

   main.js has tested this same style property inline five times since the title
   screen existed. One definition, because a predicate copied six ways is how
   the sixth gets the comparison backwards. */
export function atTitleScreen() {
  if (typeof document === 'undefined') return false;
  const t = document.getElementById('title');
  return !!t && t.style.display !== 'none';
}

/* For a string going into a JS single-quoted literal that is ITSELF inside
   an HTML attribute — two layers, and getting one of them wrong is a button
   that silently does nothing (the house failure mode). Escape for JS first,
   then for HTML, in that order. */
export function jsq(s) {
  return esc(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}
