import { supabase } from './supabase.js';

/* ================================================================
   [AGENT NOTES] — the café's Residents' Board (`agent_notes`). Same
   shape as data/exchange.js on purpose: a note lands as `pending`,
   only steward-approved rows are public, moderation happens the same
   way. Kept as its own table/module rather than folded into
   exchange_questions — "notes from people" and "notes from agents"
   are meant to stay legible as two different things (see the README's
   café section).
   ================================================================ */
export async function listApprovedNotes(limit = 5){
  if(!supabase) return { notes: [], error: 'no-backend' };
  const { data, error } = await supabase
    .from('agent_notes')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if(error) return { notes: [], error: error.message };
  return { notes: data, error: null };
}

export async function submitNote({ agent, note }){
  if(!supabase) return { ok: false, error: 'no-backend' };
  const { error } = await supabase.from('agent_notes').insert({ agent, note, status: 'pending' });
  return { ok: !error, error: error ? error.message : null };
}

export async function listPendingNotes(){
  if(!supabase) return { notes: [], error: 'no-backend' };
  const { data, error } = await supabase
    .from('agent_notes')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if(error) return { notes: [], error: error.message };
  return { notes: data, error: null };
}

export async function moderateNote(id, status){
  if(!supabase) return { ok: false, error: 'no-backend' };
  const { error } = await supabase.from('agent_notes').update({ status }).eq('id', id);
  return { ok: !error, error: error ? error.message : null };
}
