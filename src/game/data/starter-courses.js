/* ================================================================
   [COURSES YOU CAN START FROM] — the real ones, in the app.

   THE DECISION, and it is a narrow one. `SEED_LIBRARY` is `[]` and that
   is permanent: a shelf of 27 books nobody chose was doing the ownership
   argument harm and hiding real bugs. The steward was asked whether
   courses should go the same way and chose a third thing:

     "A starting shelf you choose from."

   So these are NOT pinned, NOT on the board, and NOT progress. They are
   listed in the Receive panel, and pinning one takes the same single
   press as pinning a course you drafted yourself. The board still starts
   empty. Nothing arrives that nobody chose. What changes is that a person
   with no course and no idea what one looks like can read a real one
   instead of a placeholder — which is the difference between an empty
   room and a locked door.

   It also settles a second thing he asked for the same day: the
   Theoretical Minimum course is the method itself, and it had existed
   only in the repo. "Otherwise the standard only exists in the repo and
   in this chat."

   DERIVED FROM THE DIRECTORY, never a hand-written list. Adding a file to
   courses/ is the only step — the same rule that made data/places.js the
   pause menu's one source and tools/migrations/ the schema's. A list that
   must match a directory is rule 4's exact shape, and this project has
   already paid for that three times.

   COST, measured rather than waved at: 36 KB of Markdown inlined into an
   860 KB bundle, about 4%. Named here so it is a decision on the record
   and not a surprise at the next build.
   ================================================================ */

/* Vite inlines the text at build time. `eager` on purpose: a lazily
   fetched chunk is a second failure mode under file://, which is exactly
   where the packaged app runs — and vite.config.js exists in the first
   place because of a file:// path bug that shipped a blank window. */
const FILES = import.meta.glob('/courses/*.course.md', { query: '?raw', import: 'default', eager: true });

/* [{ id, file, text }] — the parsing belongs to data/course-format.js and
   is deliberately not repeated here. This module knows where the text is
   and nothing else about what it means. */
export const STARTER_COURSES = Object.keys(FILES).sort().map(path => ({
  id: path.replace(/^.*\//, '').replace(/\.course\.md$/, ''),
  file: path.replace(/^.*\//, ''),
  text: String(FILES[path] || ''),
}));

export function starterCourse(id) {
  return STARTER_COURSES.find(c => c.id === id) || null;
}
