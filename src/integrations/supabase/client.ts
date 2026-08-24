import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// CANONICAL TARGET — pinned in code on purpose. Do not switch back to env vars.
//
// Team Hub runs on the Hive database (zbltbvizmlvotayjjcum) per the 5 Aug 2026
// one-app ruling. The Lovable project's own Supabase integration still points
// at the retired pre-migration project (tiornvtwymjhsrrpbwvr) and its bot has
// twice regenerated .env back to it (18 Aug 20:02 UTC being the second time).
// A build shipped from that state fails every clock-in with PGRST205
// "attendance_events not found". Pinning here makes .env rewrites harmless.
// The publishable (anon) key is public by design; RLS is the security boundary.
const SUPABASE_URL = 'https://zbltbvizmlvotayjjcum.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibHRidml6bWx2b3RheWpqY3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjY1NzgsImV4cCI6MjA4MDAwMjU3OH0.BmBq2YmGYmwwyfoEwT6BQOqMPTyyPitJlfH4ETNXjDw';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
