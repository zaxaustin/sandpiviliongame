import { SEED_LIBRARY } from './seed.js';

/* ----- The library, read synchronously. Every call site (renderShelf,
   Quill's grounding, the Index, …) calls Store.listDocs/getDoc/allDocs
   mid-render, so this has to be synchronous and always ready.
   It is the bundled seed plus the books you added yourself. There is no
   remote catalogue and no fetch: a hosted mirror lived here until
   2026-08-02 and was removed outright rather than left dormant, per
   CLAUDE.md's standing decision. Deleting it also retired a real hazard —
   the fallback path was the only path anyone actually ran, which meant it
   was load-bearing while still being written and tested as a fallback. */
let libraryDocs = SEED_LIBRARY;
let librarySource = 'seed';

/* ----- The personal shelf — books the user added themselves, living in
   their own save (and, on desktop, the app's own data folder), never in
   the shipped seed. Registered as a getter rather than imported
   directly because entities.js (which owns `data`) already imports this
   file — a function handed in at startup breaks the cycle. Personal docs
   are appended after the certified library everywhere, and each carries
   `personal:true` so every surface can say plainly whose shelf it's on. */
let personalDocsFn = null;
export function registerPersonalDocs(fn){ personalDocsFn = fn; }
function personalDocs(){
  try{ return (personalDocsFn && personalDocsFn()) || []; }catch(e){ return []; }
}
/* ----- The steward's override layer. A certified entry lives in `seed.js`,
   which is source code and so cannot be edited from inside the running game. So a librarian's corrections are kept as a thin
   patch keyed by slug in the save, applied on every read here. The book's
   text is never touched: only its catalogue card — title, attribution,
   licence, source, summary, which shelf it stands on, and whether it's
   hidden. Exportable from the Steward's Index, so a real correction can be
   folded back into `seed.js` and stop being an override. */
let overridesFn = null;
export function registerCatalogOverrides(fn){ overridesFn = fn; }
function overrides(){
  try{ return (overridesFn && overridesFn()) || {}; }catch(e){ return {}; }
}
function applyOverrides(list){
  const ov = overrides();
  if(!ov || !Object.keys(ov).length) return list;
  const out=[];
  for(const d of list){
    const o = ov[d.slug];
    if(!o){ out.push(d); continue; }
    if(o.hidden) continue; // a steward pulled it from the shelves
    out.push({ ...d, ...stripMeta(o), doc:{ ...d.doc, ...(o.summary!==undefined?{summary:o.summary}:{}) }, edited:true });
  }
  return out;
}
function stripMeta(o){ const { summary, hidden, editedAt, ...rest } = o; return rest; }
function mergedDocs(){
  const p = personalDocs();
  return applyOverrides(p.length ? libraryDocs.concat(p) : libraryDocs);
}
/* Kept as a resolved promise so the handful of callers that await it (the
   title screen's status line) need no change. There is nothing to wait for
   any more: the catalogue is the bundled seed plus whatever you added, and
   that is the whole design. See CLAUDE.md's 2026-07-12 standing decision. */
const libraryReady = Promise.resolve();

/* ================================================================
   [THE DATABASE, IF THERE IS ONE] — added 2026-08-03.

   The local Postgres holds what the Pavilion KNOWS about a book: its card,
   its shelf, its chapters, its health. MinIO still holds the text. This is
   the one place the two meet.

   WHY THIS IS A ONE-TIME HYDRATION AND NOT A QUERY BEHIND allDocs().
   Every call site above calls listDocs/getDoc/allDocs *mid-render*, so the
   read has to be synchronous and always ready. A query is not. So the
   catalogue is pulled ONCE at startup into the same in-memory list the seed
   fills, and nothing downstream changes. Queries are used only for the
   genuinely new things — search, the sorter's next twenty, a book's
   chapters — all of which already run in async handlers.

   IT MERGES UPWARD, AND THAT IS THE IMPORTANT PART. The rows loaded by
   tools/load-library.mjs came from MinIO object NAMES: guessed titles, no
   author, no licence, and no shelf. The real cards are in the save. So
   hydration is a union in which the save WINS on every field it has, and
   the shelves the visitor has already assigned are written back up into the
   database rather than being replaced by nulls. Getting this backwards
   would silently erase a sorting session, which is the exact class of bug
   test/live/librarian-safety.mjs exists to prevent.

   AND IT IS ENTIRELY OPTIONAL. No desktop bridge, no database, no Docker:
   every function here returns null or false and the Pavilion is exactly
   what it was. That is a release gate, not a preference — the beta ships to
   people who have never installed a container.
   ================================================================ */
function bridge(){
  const b = (typeof window !== 'undefined') && window.desktopBridge;
  return (b && typeof b.dbQuery === 'function') ? b : null;
}
export function dbAvailable(){ return !!bridge(); }

export async function dbQuery(name, params){
  const b = bridge(); if(!b) return null;
  try { return await b.dbQuery(name, params); } catch(e){ return null; }
}
export async function dbWrite(name, params){
  const b = bridge(); if(!b || !b.dbWrite) return null;
  try { return await b.dbWrite(name, params); } catch(e){ return null; }
}

/* WHICH HOME, for the one line that tells the visitor. Everything else in
   this file deliberately cannot tell the difference — the whole design is
   that a panel asks for 'searchNotes' and never learns where it ran. This
   exists so a person can be told, and for nothing else.
   -> { up, kind:'docker'|'embedded'|null, label, error } or null in a browser. */
export async function dbStatus(){
  const b = bridge(); if(!b || !b.dbStatus) return null;
  try { return await b.dbStatus(); } catch(e){ return null; }
}

/* A database row -> the shape every panel in this app already expects.
   `doc.fullText.storage` is how the Reader finds the text in MinIO, exactly
   as a hand-shelved book does today. */
function docFromRow(r, bucket){
  return {
    slug: r.slug,
    title: r.title,
    attribution: r.attribution || '',
    license: r.license || '',
    source_url: r.source_url || '',
    tradition: r.shelf || 'Personal',
    kind: r.kind || 'book',
    part: r.part || undefined,
    personal: true,
    fromDb: true,
    health: r.health || 'ok',
    doc: {
      summary: '',
      sections: [],
      fullText: r.text_key ? { storage: { bucket, key: r.text_key } } : undefined,
    },
  };
}

/* Called once at startup, before the world is drawn. Returns a small report
   so the title screen can say plainly where the shelves came from. */
export async function hydrateFromDb(opts = {}){
  const bucket = opts.bucket || 'sand-pavilion-library';
  const rows = await dbQuery('catalogue');
  if(!rows) return { ok:false, books:0, pushed:0 };     // no database at all

  /* AN EMPTY DATABASE IS NOT THE SAME AS NO DATABASE, and until 2026-08-04
     this function could not tell the difference — it returned early on zero
     rows, so nothing was ever written UP. That was invisible while the only
     database was the steward's, which has had 294 books in it since the day
     it was created. The embedded one starts empty on every machine, which
     makes the empty case the COMMON case: books stayed empty forever, and
     with it every join that hangs off books — notes (slug is a foreign key
     into it), v_notes_by_book, v_note_counts.

     So the push below happens either way, and it carries the books the save
     has that the database does not. */
  const mine = personalDocs();
  const bySlug = new Map(mine.map(d => [d.slug, d]));

  /* THE SAVE WINS. A real card beats a filename-derived one on every field,
     and a shelf the visitor assigned beats a null every time. */
  const merged = rows.map(r => {
    const own = bySlug.get(r.slug);
    const base = docFromRow(r, bucket);
    if(!own) return base;
    bySlug.delete(r.slug);              // matched; not a new book
    return {
      ...base,
      title:       own.title       || base.title,
      attribution: own.attribution || base.attribution,
      license:     own.license     || base.license,
      source_url:  own.source_url  || base.source_url,
      tradition:   own.tradition   || base.tradition,
      kind:        own.kind        || base.kind,
      doc: { ...base.doc, ...own.doc,
             fullText: (own.doc && own.doc.fullText) || base.doc.fullText },
    };
  });

  /* Only claim the library came from the database when it actually did.
     An empty database leaves the seed + save exactly as they were.

     The seed is concatenated, never merged, so a seed book arriving back
     from the database would appear TWICE. It can arrive now: the push below
     sends the seed up as well, because notes.slug is a foreign key into
     books and a note on a seed book has to have somewhere to point. Filtered
     by slug rather than trusted not to happen. */
  const seedSlugs = new Set(SEED_LIBRARY.map(d => d.slug));
  if(rows.length){
    libraryDocs = SEED_LIBRARY.concat(merged.filter(d => !seedSlugs.has(d.slug)));
    librarySource = 'postgres';
  }

  /* Carry the save's real cards back UP, so the database stops being wrong
     and the next run needs none of this. Best-effort: if the write fails the
     app is unaffected, because the in-memory merge above already happened.

     `bySlug` still holds every book the save has that the database has NOT —
     on a first run against the embedded database, that is all of them. They
     go up too, or the database can never learn about a book the visitor
     added, and notes about it have nowhere to hang.

     THE SEED GOES UP AS WELL, and that is not tidiness. `notes.slug` is a
     foreign key into books, writeMany is one transaction, and a single note
     on a seed book would therefore roll back the entire note index — every
     note unsearchable because of one. The seed books are real books on the
     visitor's shelf; the database may as well know them. Their double is
     filtered on the way back down, just above. */
  const outgoing = merged
    .concat([...bySlug.values()])
    .concat(SEED_LIBRARY.filter(d => !merged.some(m => m.slug === d.slug)
                                  && !bySlug.has(d.slug)));
  const pushed = outgoing.filter(d => d.tradition && d.tradition !== 'Personal').length;
  const b = bridge();
  if(b && b.dbWriteMany && outgoing.length){
    const params = outgoing.map(d => [
      d.slug, d.title || '', d.attribution || '', d.license || '', d.source_url || '',
      (d.tradition && d.tradition !== 'Personal') ? d.tradition : null,
      d.kind || 'book', d.part || null,
      (d.doc && d.doc.fullText && d.doc.fullText.storage && d.doc.fullText.storage.key) || null,
      null,
    ]);
    try { await b.dbWriteMany('upsertCard', params); } catch(e){ /* best effort */ }
  }
  return { ok: rows.length > 0, books: merged.length, pushed,
           seeded: bySlug.size, unmatched: bySlug.size };
}

/* MIRROR THE NOTES, so they can be searched as one body of text.

   The save owns them; the database indexes them. That direction never
   reverses — `notes.save_key` is UNIQUE precisely so a note can be carried
   up repeatedly without ever being duplicated, and nothing down here is
   read back into the save.

   Takes the output of gatherNotes(), which already unifies the six separate
   stores (data.notes, bookNotes, chatNotes, research, grant, hall) into one
   shape with a stable key. That function existed before this did; migration
   002 was written against its key format on purpose.

   PRUNING IS PART OF SYNCING, not an extra. A note deleted from the save
   that survives in the index is a search result you cannot open — the silent
   wrong answer, which is worse here than showing nothing.

   Best-effort throughout: this is derived data. If it fails, search is stale
   until the next sync and nothing else notices. */
let lastNoteSig = null;
export async function syncNotes(notes, opts = {}){
  const b = bridge();
  if(!b || !b.dbWriteMany || !Array.isArray(notes)) return null;

  /* Callers sync before searching, which means on every keystroke. Re-writing
     three hundred unchanged notes each time is work nobody asked for, so the
     set is fingerprinted first: the keys, and the length of what is in them.
     Not a hash of the text — this only has to notice CHANGE, and any edit
     moves either a key or a length. */
  const sig = notes.length + '|' + notes.map(n => n.key + ':' + (n.text||'').length).join(',');
  if(!opts.force && sig === lastNoteSig) return { ok:true, n:notes.length, skipped:true };

  const rows = notes.map(n => {
    // book notes carry a 0-based chapter index and page; the others carry
    // neither, and an ABSENT field beats a guessed one (the reader's rule)
    const ch   = Number.isInteger(n.ch)   ? n.ch   : null;
    const page = Number.isInteger(n.page) ? n.page : null;
    return [
      n.source || 'mynotes',
      n.slug || null,
      ch, page,
      (n.title || '').slice(0, 300),
      n.text || '',
      null,                                   // tags: not in the save yet
      n.folder || null,
      (n.date || '').slice(0, 10) || null,    // DATE column wants YYYY-MM-DD
      n.key,
    ];
  }).filter(r => r[9] && r[5]);               // a note with no key or no body
                                              // cannot be indexed or found

  try {
    if(rows.length) await b.dbWriteMany('upsertNote', rows);
    if(b.dbWrite) await b.dbWrite('pruneNotes', [rows.map(r => r[9])]);
    lastNoteSig = sig;                    // only after it actually landed
    return { ok:true, n: rows.length };
  } catch(e){ return null; }
}

/* ================================================================
   [STORE] — the adapter. Player save data (load/save/reset) stays
   local-only — there's no account system yet to hang a network save
   on. Library reads are the one piece Phase 3 actually wires up today.
   ================================================================ */
export const Store = (() => {
  const KEY = 'sandPavilionSave.v2';
  let mem = null, ls = null;
  try { // feature-detect: works when deployed; falls back to memory in previews
    const t = '__sp_probe'; window.localStorage.setItem(t,'1'); window.localStorage.removeItem(t);
    ls = window.localStorage;
  } catch(e) { ls = null; }
  return {
    mode: ls ? 'local' : 'memory',
    load(){
      if(ls){ try { return JSON.parse(ls.getItem(KEY) || 'null'); } catch(e){} }
      return mem;
    },
    // returns false if the write actually failed (e.g. quota exceeded) so a
    // caller can warn the visitor instead of silently losing their progress
    save(data){
      mem = data;
      if(ls){ try { ls.setItem(KEY, JSON.stringify(data)); return true; } catch(e){ return false; } }
      return true; // memory-only mode "succeeds" by design — already surfaced via the preview-mode banner
    },
    reset(){
      mem = null;
      if(ls){ try { ls.removeItem(KEY); } catch(e){} }
    },
    // Library access — the bundled seed plus your own books. No network, no
    // remote catalogue, nothing to wait for.
    get libraryMode(){ return librarySource; },
    libraryReady,
    registerPersonalDocs,
    registerCatalogOverrides,
    // the database — Docker Postgres or the built-in one, see the block above
    dbAvailable, dbQuery, dbWrite, dbStatus, hydrateFromDb, syncNotes,
    allDocs(){ return mergedDocs(); },
    listDocs(tradition){ return mergedDocs().filter(d => d.tradition === tradition); },
    getDoc(slug){ return mergedDocs().find(d => d.slug === slug) || null; },

    /* There is no server-side search any more, and there was never a good
       reason for one at this scale. Returning null is the documented signal
       for "fall back to local substring matching," which is what every caller
       already does — see renderSearch() in overlays.js. Kept as a function
       rather than deleted so the fallback stays a deliberate branch instead of
       becoming an implicit one. */
    async searchDocs(){ return null; },

  };
})();
