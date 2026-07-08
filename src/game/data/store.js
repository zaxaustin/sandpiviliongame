import { SEED_LIBRARY } from './seed.js';
import { supabase } from './supabase.js';

/* ----- Library mirror — fetched once, read synchronously ever after.
   Every call site (renderShelf, Quill's grounding, the Index, …) calls
   Store.listDocs/getDoc/allDocs synchronously, mid-render; making those
   async would ripple through every overlay that touches the Library.
   Instead: start from the bundled seed (works instantly, offline-safe),
   then quietly swap in the Supabase mirror if and when it arrives. If
   Supabase isn't configured, comes back empty, or the fetch fails, the
   seed just stays — the same NoProvider-style fallback the AI connection
   already uses, applied here to data instead of a chat reply. */
let libraryDocs = SEED_LIBRARY;
let librarySource = 'seed';
const libraryReady = (async () => {
  if(!supabase) return;
  try{
    const { data: rows, error } = await supabase.from('library_documents').select('*');
    if(error || !rows || !rows.length) return;
    libraryDocs = rows.map(r => ({
      slug:r.slug, tradition:r.tradition, title:r.title, license:r.license,
      source_url:r.source_url, attribution:r.attribution, doc:r.doc,
      added:r.added, category:r.category||'classical',
    }));
    librarySource = 'supabase';
  }catch(e){ /* stays on the seed — never a hard failure */ }
})();

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
    // Library access — reads the in-memory mirror above (seed until/unless
    // Supabase's fetch resolves). `libraryReady` lets a caller that cares
    // (e.g. the title screen's status line) wait for the real answer.
    get libraryMode(){ return librarySource; },
    libraryReady,
    allDocs(){ return libraryDocs; },
    listDocs(tradition){ return libraryDocs.filter(d => d.tradition === tradition); },
    getDoc(slug){ return libraryDocs.find(d => d.slug === slug) || null; },

    /* Real search — Postgres full-text search (tsvector + ts_rank) via
       the search_library_documents() function, word-stemmed and ranked
       by relevance (title matches outrank an incidental mention in a
       section body). Deliberately kept separate from allDocs() rather
       than folded into the synchronous mirror above: a network call
       can't be synchronous, and every existing call site (shelf
       rendering, Quill's grounding) depends on allDocs() staying that
       way. Returns null (not an empty array) when it can't really
       search — signals the caller to fall back to local substring
       matching, the same NoProvider-style pattern used everywhere else
       in this file. */
    async searchDocs(query){
      const q = (query||'').trim();
      if(!supabase || !q) return null;
      try{
        const { data: rows, error } = await supabase.rpc('search_library_documents', { search_query:q });
        if(error || !rows) return null;
        return rows.map(r => ({
          slug:r.slug, tradition:r.tradition, title:r.title, license:r.license,
          source_url:r.source_url, attribution:r.attribution, doc:r.doc,
          added:r.added, category:r.category||'classical',
        }));
      }catch(e){ return null; }
    },

    // Account save sync (Phase 3) — reads/writes `player_saves`, one row
    // per logged-in user. Never called unless a session exists; the
    // orchestration (first-sync vs. conflict) lives in entities.js, which
    // already owns `data`/`persist`. This stays a thin, honest wrapper.
    async pullAccountSave(userId){
      if(!supabase) return null;
      try{
        const { data: row, error } = await supabase.from('player_saves')
          .select('data,updated_at').eq('user_id', userId).maybeSingle();
        if(error || !row) return null;
        return row;
      }catch(e){ return null; }
    },
    async pushAccountSave(userId, saveData){
      if(!supabase) return false;
      try{
        const { error } = await supabase.from('player_saves')
          .upsert({ user_id:userId, data:saveData, updated_at:new Date().toISOString() });
        return !error;
      }catch(e){ return false; }
    },
  };
})();
