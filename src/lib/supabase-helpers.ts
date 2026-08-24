import { supabase } from "@/integrations/supabase/hive";
import type { PresenceStatus, AttendanceDirection } from "@/types";

// Fetch all sites
export async function fetchSites() {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

// Fetch site by code
export async function fetchSiteByCode(code: string) {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Fetch current user's profile
export async function fetchCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Fetch the staff directory — non-sensitive fields only.
// `profiles` itself is RLS-locked to self / direct reports / admins, so this
// goes through the `get_staff_directory` RPC, which never returns email,
// phone, permission_level, payroll_id, employee_number or PIN.
export async function fetchAllProfiles() {
  const { data, error } = await supabase.rpc("get_staff_directory");
  if (error) throw error;
  return data ?? [];
}

// Search the staff directory. Filtering happens in memory on the already
// column-limited directory rows, so no user input is ever interpolated into a
// query string.
export async function searchProfiles(query: string) {
  const rows = (await fetchAllProfiles()) as any[];
  const needle = query.trim().toLowerCase();
  if (!needle) return rows.slice(0, 20);

  return rows
    .filter((p) =>
      [p.display_name, p.first_name, p.surname]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(needle))
    )
    .slice(0, 20);
}


// Get today's attendance status for a person
export async function getTodayStatus(personId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("attendance_events")
    .select("*")
    .eq("person_id", personId)
    .gte("recorded_at", `${today}T00:00:00`)
    .lte("recorded_at", `${today}T23:59:59`)
    .order("recorded_at", { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) {
    return { isSignedIn: false, events: [] as typeof data };
  }

  const latestEvent = data[0];
  const isSignedIn = latestEvent.direction === "in";

  return { isSignedIn, events: data, latestEvent };
}

// Record an attendance event. Phone clock-ins write source 'phone';
// the geofence auto clock-out writes source 'geofence' (allowed by the
// check constraint). Location audit data goes in metadata.
export async function recordAttendanceEvent(
  personId: string,
  direction: AttendanceDirection,
  siteId: string | null = null,
  source: "phone" | "geofence" = "phone",
  metadata: Record<string, unknown> | null = null
) {
  const { data, error } = await supabase
    .from("attendance_events")
    .insert({
      person_id: personId,
      direction,
      source,
      site_id: siteId,
      metadata: metadata as never,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Geofence site resolution.
// The site a person clocks in against comes from their current shift
// assignment (pattern -> site_id); if they have none, fall back to the
// single active site. Coordinates live on the Hive `sites` table
// (latitude, longitude, radius_m) — never hard-coded in the app.
// ---------------------------------------------------------------------------
export interface GeofenceSite {
  id: string;
  code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radius_m: number | null;
}

export async function fetchGeofenceSiteForUser(personId: string): Promise<GeofenceSite | null> {
  const today = new Date().toISOString().split("T")[0];

  // 1) Site from the user's shift assignment that's in effect today
  const { data: assignments } = await supabase
    .from("staff_shift_assignments")
    .select("pattern_id, effective_from, effective_to")
    .eq("person_id", personId)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (assignments && assignments.length > 0) {
    const { data: pattern } = await supabase
      .from("staff_shift_patterns")
      .select("site_id")
      .eq("id", assignments[0].pattern_id)
      .maybeSingle();

    if (pattern?.site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("id, code, name, latitude, longitude, radius_m")
        .eq("id", pattern.site_id)
        .maybeSingle();
      if (site) return site as GeofenceSite;
    }
  }

  // 2) Fall back to the single active site
  const { data: sites } = await supabase
    .from("sites")
    .select("id, code, name, latitude, longitude, radius_m")
    .eq("is_active", true)
    .order("name")
    .limit(2);

  if (sites && sites.length >= 1) return sites[0] as GeofenceSite;
  return null;
}

// ---------------------------------------------------------------------------
// Presence, derived live from attendance_events (the old
// per-day summary table did not survive the Hive migration).
// "In" = the person's latest event today has direction 'in'.
// ---------------------------------------------------------------------------
export interface TodayPresence {
  personId: string;
  isIn: boolean;
  firstIn: string | null;        // ISO timestamp of first 'in' that day
  lastOut: string | null;        // ISO timestamp of last 'out' that day
  lastEventAt: string;           // ISO timestamp of latest event that day
  totalWorkedMinutes: number;    // paired in→out time; an open session today counts up to now
}

export async function fetchPresenceMapForDate(dateStr: string): Promise<Map<string, TodayPresence>> {
  const { data, error } = await supabase
    .from("attendance_events")
    .select("person_id, direction, recorded_at")
    .gte("recorded_at", `${dateStr}T00:00:00`)
    .lte("recorded_at", `${dateStr}T23:59:59`)
    .order("recorded_at", { ascending: true });

  if (error) throw error;

  const isToday = dateStr === new Date().toISOString().split("T")[0];
  const map = new Map<string, TodayPresence>();
  const openIn = new Map<string, number>(); // person_id -> ms epoch of unmatched 'in'

  for (const ev of data ?? []) {
    const cur = map.get(ev.person_id) ?? {
      personId: ev.person_id,
      isIn: false,
      firstIn: null,
      lastOut: null,
      lastEventAt: ev.recorded_at,
      totalWorkedMinutes: 0,
    };
    cur.isIn = ev.direction === "in";
    cur.lastEventAt = ev.recorded_at;
    if (ev.direction === "in") {
      if (!cur.firstIn) cur.firstIn = ev.recorded_at;
      if (!openIn.has(ev.person_id)) openIn.set(ev.person_id, new Date(ev.recorded_at).getTime());
    } else {
      cur.lastOut = ev.recorded_at;
      const started = openIn.get(ev.person_id);
      if (started !== undefined) {
        cur.totalWorkedMinutes += (new Date(ev.recorded_at).getTime() - started) / 60000;
        openIn.delete(ev.person_id);
      }
    }
    map.set(ev.person_id, cur);
  }

  // Open sessions: count up to now, but only for today
  if (isToday) {
    for (const [personId, started] of openIn) {
      const cur = map.get(personId);
      if (cur) cur.totalWorkedMinutes += (Date.now() - started) / 60000;
    }
  }
  for (const cur of map.values()) {
    cur.totalWorkedMinutes = Math.round(cur.totalWorkedMinutes);
  }
  return map;
}

export async function fetchTodayPresenceMap(): Promise<Map<string, TodayPresence>> {
  return fetchPresenceMapForDate(new Date().toISOString().split("T")[0]);
}

// Format duration in minutes to hours and minutes
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

// Get status label
export function getStatusLabel(status: PresenceStatus): string {
  const labels: Record<PresenceStatus, string> = {
    on_site: "On Site",
    on_break: "On Break",
    remote: "Remote",
    leave: "Holiday",
    sick: "Sick",
    off: "Off Site",
  };
  return labels[status] || status;
}
