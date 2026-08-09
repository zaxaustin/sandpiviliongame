/* ================================================================
   [BOOK STORAGE] — where a book's text actually lives, per book.

   Asked for directly, 2026-08-10:

     "the docker pathway shuld be the main but dont ignore a place for a
      new user to put notes and books either ... lets fix this so docker
      is displayed in the library, and we start testing that."

   THE PAVILION HAS ALWAYS HAD THREE HOMES FOR A TEXT AND NEVER SAID
   WHICH ONE A BOOK WAS IN. There was a single global status line
   ("Local Library storage connected"), which answers a question nobody
   asked; what a person actually wants to know, standing in front of a
   book that will not open, is where THIS one is kept.

   READ FROM THE BOOK, NEVER FROM CONFIGURATION. The answer is whatever
   pointer the book really carries — that is the difference between a
   badge and a guess, and the reason this is a pure function rather than
   a lookup against what happens to be running. A book written to MinIO
   in June still says Docker in December with the container stopped; it
   says Docker AND it will not open, which are two true things.

   WHY THIS IS ITS OWN FILE. `hideAllOv()`, the window exports and the
   resident roster have each drifted, and the Library, Your Shelf, the
   Index and the Catalogue would each have grown their own copy of this
   within a week. One table, four consumers, one test.

   No DOM, no imports — so npm test can hold it.
   ================================================================ */

export const STORAGE_STATES = {
  docker:  { icon:'🐳', label:'Docker',       hint:'The text is in local Docker storage (MinIO) — no practical limit, and shared between machines that reach the same container.' },
  machine: { icon:'💾', label:'this machine', hint:'The text is a real file in the app’s own data folder. Hundreds fit; it does not leave this computer.' },
  save:    { icon:'📄', label:'in the save',  hint:'The text is inside the save itself. Only a few books fit this way — a browser tab has roughly 5–10 MB in total.' },
  summary: { icon:'📝', label:'summary only', hint:'A card with no full text behind it. There is nothing to open yet — bring the book in to read it.' },
};
export const STORAGE_KEYS = Object.keys(STORAGE_STATES);

/* THE ONE DECISION, and the order is the order the app itself writes in:
   shelveAsPersonal tries MinIO first, then a file, then inline. Reading it
   back in the same order means the badge can never disagree with what
   actually happened. */
export function storageOf(doc) {
  const ft = doc && doc.doc && doc.doc.fullText;
  if (!ft) return 'summary';
  const st = ft.storage;
  if (st && st.bucket) return 'docker';
  if (st && st.personal) return 'machine';
  if (typeof ft.text === 'string' && ft.text.length) return 'save';
  /* A fullText object with NO pointer of any kind is a card claiming a text
     it cannot name. Treated as summary rather than invented — rule 6, and a
     wrong badge on a book is worse than an honest "nothing here yet". */
  return 'summary';
}

export function storageBadge(doc) {
  const s = STORAGE_STATES[storageOf(doc)];
  return s ? s.icon + ' ' + s.label : '';
}

/* Does opening this book need a service that might not be running? Only the
   Docker path does — a local file and an inline text are read by the app
   itself. This is what decides whether a stopped container is worth
   mentioning to someone, and it is why `machine` must never trip the MinIO
   warning (a bug this codebase has already had). */
export function needsService(doc) { return storageOf(doc) === 'docker'; }

/* The whole shelf at a glance, for a header line. Deterministic counting —
   rule 7: this is exactly the sort of thing code does exactly and a model
   does approximately. */
export function storageCounts(docs) {
  const out = {};
  for (const k of STORAGE_KEYS) out[k] = 0;
  for (const d of (docs || [])) out[storageOf(d)]++;
  return out;
}

/* "326 in Docker · 59 on this machine · 30 summary only" — built from the
   counts, skipping any home nothing is in, so the line says what is true
   rather than reciting the whole vocabulary every time. */
export function storageSummary(docs) {
  const c = storageCounts(docs);
  const parts = STORAGE_KEYS.filter(k => c[k] > 0)
    .map(k => `${STORAGE_STATES[k].icon} ${c[k]} ${STORAGE_STATES[k].label}`);
  return parts.join(' · ');
}

/* THE LOCAL SHELF HAS A CEILING AND IT IS SAID OUT LOUD.

   The steward's own split: "there should be 2 pathways a local file that
   limmits to 100 books but the docker setup should be the main path".

   Measured 2026-08-04: real books average 563 KB, so 100 of them is about
   56 MB under userData — fine on any machine, and a number a person can
   hold in their head. Past it the answer is not "no", it is "turn Docker on",
   which is why the refusal names the way through rather than just refusing.
   A silent failure here would be the house failure mode on the one action
   the whole Library depends on. */
export const LOCAL_BOOK_CAP = 100;

export function localRoom(docs) {
  const used = storageCounts(docs).machine;
  return { used, cap: LOCAL_BOOK_CAP, left: Math.max(0, LOCAL_BOOK_CAP - used), full: used >= LOCAL_BOOK_CAP };
}

/* Where the NEXT book will go, said before it is written rather than after.
   `hasDocker`/`hasFiles` are passed in — this file must not know what is
   running, or it stops being testable. */
export function nextDestination(docs, { hasDocker, hasFiles } = {}) {
  if (hasDocker) return { where:'docker', line:'→ Docker (MinIO) — no practical limit' };
  const room = localRoom(docs);
  if (hasFiles && !room.full) {
    return { where:'machine', line:`→ this machine (${room.used} of ${room.cap} books used)` };
  }
  if (hasFiles && room.full) {
    return { where:null, full:true,
      line:`The local shelf is full — ${room.cap} books. Start Docker and the text goes there instead, with no practical limit.` };
  }
  return { where:'save', line:'→ inside the save — only a few books fit; the desktop app holds hundreds' };
}
