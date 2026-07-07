import { supabase } from './supabase.js';

/* ================================================================
   [AUTH] — optional accounts, same NoProvider shape as the AI
   connection and the Supabase-backed Library: without a configured
   client, every export here just reports "signed out," and local-only
   play works exactly as it always has. Logging in is an enhancement
   (cross-device save sync, real steward powers for the café) — never
   a requirement to play.

   Magic links, not passwords: `sendMagicLink(email)` emails a one-time
   sign-in link. Clicking it in a mail client typically opens a *new*
   browser tab — that new tab is where the session actually lands (via
   Supabase's own URL-token detection on page load), not the original
   tab that requested the link. The UI just needs to say so plainly.
   ================================================================ */
const authState = { session: null, profile: null, loading: !!supabase };
const listeners = new Set();
function notify(){ listeners.forEach(fn => { try{ fn(authState); }catch(e){} }); }
export function onAuthChange(fn){ listeners.add(fn); return () => listeners.delete(fn); }
export function getAuthState(){ return authState; }
export function isLoggedIn(){ return !!authState.session; }
export function isSteward(){ return authState.profile?.role === 'steward'; }
export function userEmail(){ return authState.session?.user?.email || null; }

async function loadProfile(userId){
  try{
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data || null;
  }catch(e){ return null; }
}

if(supabase){
  supabase.auth.getSession().then(async ({ data:{ session } }) => {
    authState.session = session;
    authState.profile = session ? await loadProfile(session.user.id) : null;
    authState.loading = false;
    notify();
  });
  supabase.auth.onAuthStateChange(async (_event, session) => {
    authState.session = session;
    authState.profile = session ? await loadProfile(session.user.id) : null;
    authState.loading = false;
    notify();
  });
}

export async function sendMagicLink(email){
  if(!supabase) return { ok:false, error:'no-backend' };
  const { error } = await supabase.auth.signInWithOtp({
    email, options:{ emailRedirectTo: window.location.origin },
  });
  return { ok:!error, error: error ? error.message : null };
}

export async function signOut(){
  if(!supabase) return;
  await supabase.auth.signOut();
}
