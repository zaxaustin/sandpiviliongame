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

/* The one <select> skin used across the panels. It lived in overlays.js until
   the Learning Tree moved out and took a `<select>` with it — a bare constant,
   so it crashed at runtime rather than at build time, and neither `npm test`
   nor the bundler said a word. A shared look belongs in one place; the
   alternative was a third copy of the same nine declarations. */
export const NOTE_SELECT_STYLE =
  'width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;' +
  'color:#f5e9d4;font-family:inherit;font-size:13px;padding:7px 9px';

/* For a string going into a JS single-quoted literal that is ITSELF inside
   an HTML attribute — two layers, and getting one of them wrong is a button
   that silently does nothing (the house failure mode). Escape for JS first,
   then for HTML, in that order. */
export function jsq(s) {
  return esc(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}
