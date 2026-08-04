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
