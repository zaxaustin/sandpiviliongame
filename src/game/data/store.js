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
