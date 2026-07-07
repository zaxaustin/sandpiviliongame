import { createClient } from '@supabase/supabase-js';

/* ================================================================
   [SUPABASE] — the network half of Phase 3. NoProvider-style: if the
   env vars aren't set (no .env.local), this degrades to `null` instead
   of throwing, and every caller already knows how to fall back — same
   graceful-failure rule the AI provider and Store's memory mode follow.
   ================================================================ */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = (url && key) ? createClient(url, key) : null;
