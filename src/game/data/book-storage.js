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

/* THE LOCAL SHELF HAS A CEILING, IT IS SAID OUT LOUD, AND YOU SET IT.

   The steward's original split was "a local file that limmits to 100 books
   but the docker setup should be the main path" — and 100 was chosen for
   holdability, not for safety: real books average 563 KB, so 100 is about
   56 MB under userData.

   THAT NUMBER STOPPED BEING RIGHT ON 2026-08-10, when Docker moved to the
   Inner Pavilion. While Docker was one copyable command away, a wall at 100
   was a nudge. Once the way past it is EARNED, a wall at 100 is a wall — and
   the Outer court is supposed to support itself. Worse, every document said
   the desktop app held "hundreds", which one hundred is not.

     "let the user set a limit after they understand there own disk space
      500 is a good defult"

   So: 500 by default (~282 MB, nothing on a modern machine), and the visitor
   may set their own once the panel has shown them what their library actually
   weighs and what the disk has spare. The cap is a guardrail a person chooses,
   not a limit the app imposes.

   PURE, so the cap ARRIVES AS AN ARGUMENT. This module must not read `data` —
   that is what keeps it testable, and it is why the caller passes the number
   rather than this file reaching for it. */
/* ⚠ THE BROWSER'S WALL, MEASURED RATHER THAN ASSUMED (2026-08-18).

   In a tab every book's text goes INTO the save, and the save is one
   localStorage key. Against the deployed build, adding real-sized (563 KB)
   books one at a time: books 1–9 fine, and the NINTH takes it to ~5.07 MB
   where `setItem` throws QuotaExceededError. Chrome's per-origin quota is
   ~5 MB and it is a hard wall, not a soft one.

   What happened at that wall was honest but late: persist() catches the throw,
   Store.save() returns false, and the visitor gets one alert saying storage may
   be full — AFTER the book is already on the shelf in memory and will not
   survive a reload. Nobody wants to find out that way.

   So the refusal moves BEFORE the write. WEB_SAVE_CEILING leaves ~700 KB of
   headroom below the measured wall, because the save is not only books: notes,
   days, courses and progress all live in the same key and keep growing after
   the last book is added. Reserve for them, or the library fills the room its
   own notes need.

   This is a browser number ONLY. The desktop app writes text to real files and
   is bounded by DEFAULT_LOCAL_BOOK_CAP below instead — which is why the honest
   refusal names the desktop app rather than telling anyone to delete a book. */
export const WEB_SAVE_CEILING = 4300 * 1024;
export function webRoom(saveBytes, incomingBytes){
  const used = Math.max(0, saveBytes || 0);
  const next = used + Math.max(0, incomingBytes || 0);
  return { used, next, ceiling: WEB_SAVE_CEILING, fits: next <= WEB_SAVE_CEILING,
           freeBytes: Math.max(0, WEB_SAVE_CEILING - used) };
}

export const DEFAULT_LOCAL_BOOK_CAP = 500;

/* The floor exists so a mistyped 0 cannot make the shelf unusable, and the
   ceiling so a fat-fingered 999999 does not silently promise what a disk
   cannot hold. Both are advisory bounds on a person's own choice. */
export const LOCAL_CAP_MIN = 25;
export const LOCAL_CAP_MAX = 5000;

export function normalizeCap(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_LOCAL_BOOK_CAP;
  return Math.min(LOCAL_CAP_MAX, Math.max(LOCAL_CAP_MIN, v));
}

export function localRoom(docs, cap) {
  const limit = cap == null ? DEFAULT_LOCAL_BOOK_CAP : normalizeCap(cap);
  const used = storageCounts(docs).machine;
  return { used, cap: limit, left: Math.max(0, limit - used), full: used >= limit };
}

/* WHAT THE SHELF WEIGHS, from the same 563 KB measurement the cap is reasoned
   from. An estimate, and labelled as one wherever it is shown — the desktop
   bridge can report the real bytes on disk, and where it does, that wins. */
export const AVG_BOOK_BYTES = 563 * 1024;
export function estimatedBytes(docs) { return storageCounts(docs).machine * AVG_BOOK_BYTES; }
export function humanBytes(n) {
  const b = Number(n) || 0;
  if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
  if (b >= 1048576) return Math.round(b / 1048576) + ' MB';
  if (b >= 1024) return Math.round(b / 1024) + ' KB';
  return b + ' B';
}

/* Where the NEXT book will go, said before it is written rather than after.
   `hasDocker`/`hasFiles` are passed in — this file must not know what is
   running, or it stops being testable. */
export function nextDestination(docs, { hasDocker, hasFiles, cap } = {}) {
  if (hasDocker) return { where:'docker', line:'→ Docker (MinIO) — no practical limit' };
  const room = localRoom(docs, cap);
  if (hasFiles && !room.full) {
    return { where:'machine', line:`→ this machine (${room.used} of ${room.cap} books used)` };
  }
  if (hasFiles && room.full) {
    /* THE REFUSAL NAMES TWO WAYS THROUGH, not one. It used to name only
       Docker, which was fair while Docker was a copyable command; now that it
       sits behind the Inner Pavilion, a refusal whose only exit is "become a
       contributor" would be a dead end wearing a signpost. The limit is the
       visitor's own setting, so raising it is the first answer and the one
       almost everybody wants. */
    return { where:null, full:true,
      line:`The local shelf is full at your limit of ${room.cap} books. Raise the limit in `
         + `"Where your books are kept" — it is your disk, and the panel shows what is left on it. `
         + `Docker lifts it entirely, with no practical limit.` };
  }
  return { where:'save',
    line:`→ inside the save — only a few books fit; the desktop app holds ${DEFAULT_LOCAL_BOOK_CAP} by default` };
}
