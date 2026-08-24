/**
 * The single source of truth for "when am I working?".
 *
 * Wraps the `my_shifts(_from, _to)` database RPC (security definer, signed-in
 * user only). The function already merges production line assignments — only
 * for weeks the production manager has actually published — with standing
 * shift patterns, so the app never re-implements that resolution client-side.
 *
 * Row shape (one row per shift; a day can have more than one):
 *   shift_date  "YYYY-MM-DD"
 *   source      'production' (published rota) | 'pattern' (standing pattern)
 *   label       e.g. "Day 8–4"
 *   start_time / end_time  "HH:MM:SS"
 *   line_name   e.g. "Powder Unit 8" — preferred location when present
 *   site_code   fallback location
 *   role        e.g. "Line lead", when the rota says so
 *
 * The generated Supabase types predate this RPC, hence the `as any` on the
 * call — the documented precedent in this repo for new RPCs.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MyShiftRow {
  shift_date: string;
  source: "production" | "pattern";
  label: string | null;
  start_time: string;
  end_time: string;
  line_name: string | null;
  site_code: string | null;
  role: string | null;
}

export function useMyShifts(from: string, to: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["my-shifts", from, to],
    queryFn: async (): Promise<MyShiftRow[]> => {
      const { data, error } = await (supabase.rpc as any)("my_shifts", {
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return (data ?? []) as MyShiftRow[];
    },
    enabled: opts.enabled ?? true,
  });
}

/** "09:00:00" -> "09:00" */
export function formatTime(t: string | null | undefined) {
  return t?.slice(0, 5) ?? "—";
}

/** line_name is the location when present (e.g. "Powder Unit 8"), else site_code. */
export function shiftLocation(s: Pick<MyShiftRow, "line_name" | "site_code">) {
  return s.line_name || s.site_code || "—";
}

export const NO_SHIFTS_COPY =
  "No published shifts yet — your schedule appears here when next week's rota is sent.";
