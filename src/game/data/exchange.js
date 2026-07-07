import { supabase } from './supabase.js';

/* ================================================================
   [EXCHANGE] — the café's notice board (`exchange_questions`). A thin
   wrapper so ui/overlays.js never touches Supabase directly, same
   separation `Store` already draws around `localStorage`.

   Moderation note: RLS lets anyone insert a row, but only as
   status:'pending', and only lets everyone *read* rows already
   status:'approved' — there's no in-game "approve" button on purpose.
   Real steward auth doesn't exist yet, so today a submission is only
   ever promoted by a person in the Supabase dashboard/SQL editor, the
   same manual gate library_documents already uses.
   ================================================================ */
export async function listApprovedQuestions(limit = 3){
  if(!supabase) return { posts: [], error: 'no-backend' };
  const { data, error } = await supabase
    .from('exchange_questions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if(error) return { posts: [], error: error.message };
  return { posts: data, error: null };
}

export async function submitQuestion({ title, body, external_url, author }){
  if(!supabase) return { ok: false, error: 'no-backend' };
  const { error } = await supabase.from('exchange_questions').insert({
    title, body, external_url: external_url || null, author: author || null, status: 'pending',
  });
  return { ok: !error, error: error ? error.message : null };
}
