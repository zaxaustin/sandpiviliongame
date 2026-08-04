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

/* For a string going into a JS single-quoted literal that is ITSELF inside
   an HTML attribute — two layers, and getting one of them wrong is a button
   that silently does nothing (the house failure mode). Escape for JS first,
   then for HTML, in that order. */
export function jsq(s) {
  return esc(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}
