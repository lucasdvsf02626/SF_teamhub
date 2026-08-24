// Loosely-typed data client.
//
// The generated `types.ts` in this folder is regenerated against the Lovable
// Cloud project, while the app's data lives in the shared Hive database
// (leave_requests, leave_balances, sites, attendance_events, …). Until the
// types are regenerated from Hive, importing the strictly-typed client makes
// every legitimate query a type error.
//
// This module re-exports the SAME client instance (identical runtime
// behaviour, same auth session) with a permissive schema type so table names
// and columns that exist in Hive but not in the generated union still compile.
// Delete this shim and go back to `./client` once types.ts is regenerated
// against the Hive database.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "./client";

export const supabase = typedClient as unknown as SupabaseClient<any, "public", any>;
