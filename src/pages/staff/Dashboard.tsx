import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard, SfCardHeader } from "@/components/staff/SfCard";
import { ServiceRingAvatar } from "@/components/ServiceRingAvatar";
import { useClock, formatHMS, formatHM } from "@/contexts/ClockContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMyShifts, formatTime, shiftLocation } from "@/hooks/useMyShifts";
import { supabase } from "@/integrations/supabase/hive";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight, MapPin, Play, Square, User } from "lucide-react";
import { cn } from "@/lib/utils";

/** Subtle marker for rows that come from a published production rota rather
 *  than a standing pattern. */
function ScheduledBadge() {
  return (
    <span className="inline-flex items-center text-[10px] font-medium text-[hsl(var(--sf-green))] bg-[hsl(var(--sf-green))]/10 border border-[hsl(var(--sf-green))]/30 px-1.5 py-0.5 rounded">
      Scheduled
    </span>
  );
}

function ClockCard({ siteLabel }: { siteLabel: string }) {
  const { clockedIn, elapsedSec, startedAt, attemptClockIn, clockOutNow } = useClock();
  const [busy, setBusy] = useState(false);
  const startedLabel = startedAt
    ? new Date(startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";

  // Clock in/out goes through ClockContext so the geofence check and the
  // leave-site watcher apply here exactly as on the Clock page.
  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (clockedIn) {
        await clockOutNow();
        toast({ title: "Clocked out", description: "Have a good rest.", variant: "success" as any });
      } else {
        const result = await attemptClockIn();
        if (!result.ok) {
          toast({ title: "Not clocked in", description: result.message, variant: "destructive" });
          return;
        }
        toast({ title: "Clocked in", description: "Have a good shift.", variant: "success" as any });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed", description: e?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // The My Code pill shape, widened: full-width, half-height, same amber rim.
  // Replaces the old circle + black bezel so the whole dashboard fits one screen.
  return (
    <SfCard className="md:col-span-2 p-4">
      <button
        onClick={handleClick}
        disabled={busy}
        className={cn(
          "w-full h-16 rounded-full flex items-center justify-center gap-2.5 font-bold uppercase tracking-wider text-base transition-all active:scale-[0.99] ring-2 ring-offset-2 ring-offset-[hsl(var(--sf-card))]",
          clockedIn
            ? "bg-[hsl(var(--sf-red))]/15 text-[hsl(var(--sf-red))] ring-[hsl(var(--sf-red))]/50"
            : "bg-gradient-to-tr from-orange-700 via-orange-500 to-yellow-400 text-primary-foreground ring-amber-300/70 shadow-[0_10px_30px_-10px_hsl(24_95%_53%/0.7)] hover:brightness-110"
        )}
      >
        {clockedIn ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        {clockedIn ? "Clock out" : "Clock in"}
      </button>
      <div className="mt-3 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-3xl font-semibold tabular-nums" style={{ fontFamily: "'Geist Mono', monospace", color: "#FFFFFF" }}>
          {formatHMS(elapsedSec)}
        </div>
        <div className="flex items-center gap-x-3 text-xs text-muted-foreground">
          <span>Today <span className="text-white font-semibold">{clockedIn ? formatHM(elapsedSec) : "0h 0m"}</span></span>
          <span>Started <span className="text-white font-semibold">{startedLabel}</span></span>
          {siteLabel !== "—" && <span className="text-white font-medium">{siteLabel}</span>}
        </div>
      </div>
    </SfCard>
  );
}



/** Days without sickness, from the person's own leave history. The streak is
 *  calendar days since the last sickness spell ended (or since start date if
 *  none); the record is the longest such gap ever — Lee's ask, 6 Aug:
 *  gamify attendance the way fitness apps gamify workouts. */
function StreakChips({ userId, startDate }: { userId: string; startDate: string | null }) {
  const { data: spells = [] } = useQuery({
    queryKey: ["sickness-spells", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("start_date, end_date")
        .eq("person_id", userId)
        .eq("request_type", "sickness")
        .eq("status", "approved")
        .order("start_date");
      if (error) throw error;
      return data ?? [];
    },
  });
  const dayMs = 86400000;
  const today = new Date();
  const origin = startDate ? new Date(startDate) : null;
  const gaps: number[] = [];
  let prevEnd: Date | null = origin;
  for (const s of spells as any[]) {
    const st = new Date(s.start_date);
    if (prevEnd) gaps.push(Math.max(0, Math.floor((st.getTime() - prevEnd.getTime()) / dayMs) - 1));
    const en = new Date(s.end_date);
    prevEnd = !prevEnd || en > prevEnd ? en : prevEnd;
  }
  const current = prevEnd ? Math.max(0, Math.floor((today.getTime() - prevEnd.getTime()) / dayMs)) : null;
  const longest = current !== null ? Math.max(current, ...(gaps.length ? gaps : [0])) : null;
  if (current === null) return null;
  return (
    <div className="flex items-center gap-2 mt-2.5">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-orange-500/50 bg-orange-500/10 text-sm font-bold text-orange-400">
        🔥 {current} day{current === 1 ? "" : "s"} sickness-free
      </span>
      {longest !== null && longest > current && (
        <span className="text-xs text-muted-foreground font-semibold">Best: {longest}</span>
      )}
      {longest !== null && longest <= current && current > 0 && (
        <span className="text-xs font-semibold text-[hsl(var(--sf-green))]">Personal best!</span>
      )}
    </div>
  );
}

/** Mon–Sun strip: a filled ring for each day already worked this week (from
 *  the person's own attendance events), today highlighted, plus total time on
 *  site this week from paired in/out events. Read-only on the person's own data. */
function WeekStrip({ userId }: { userId: string }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { data: events = [] } = useQuery({
    queryKey: ["week-attendance", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_events")
        .select("recorded_at, direction")
        .eq("person_id", userId)
        .gte("recorded_at", weekStart.toISOString())
        .order("recorded_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  // Pair ins with outs chronologically; an unclosed trailing 'in' counts to now.
  let weekMs = 0;
  let openIn: number | null = null;
  for (const e of events as any[]) {
    const t = new Date(e.recorded_at).getTime();
    if (e.direction === "in" && openIn === null) openIn = t;
    if (e.direction === "out" && openIn !== null) { weekMs += t - openIn; openIn = null; }
  }
  if (openIn !== null) weekMs += Date.now() - openIn;
  const weekH = Math.floor(weekMs / 3600000);
  const weekM = Math.floor((weekMs % 3600000) / 60000);
  const worked = new Set(events.map((e: any) => format(new Date(e.recorded_at), "yyyy-MM-dd")));
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="mt-3">
      {weekMs > 0 && (
        <div className="text-base text-muted-foreground mb-2">
          At the factory this week: <span className="text-white font-extrabold text-lg">{weekH}h {weekM}m</span>
        </div>
      )}
    <div className="flex items-center gap-2">
      {days.map((d) => {
        const iso = format(d, "yyyy-MM-dd");
        const isToday = iso === todayIso;
        const done = worked.has(iso);
        return (
          <div key={iso} className="flex flex-col items-center gap-1.5 flex-1 max-w-[52px]">
            <span className="text-[10px] font-semibold text-muted-foreground">{format(d, "EEEEE")}</span>
            <span
              className={cn(
                "h-8 w-8 grid place-items-center rounded-full text-xs font-bold border transition-colors",
                isToday
                  ? "bg-gradient-to-tr from-orange-700 via-orange-500 to-yellow-400 text-primary-foreground border-transparent shadow-[0_6px_18px_-6px_hsl(24_95%_53%/0.7)]"
                  : done
                    ? "bg-[hsl(var(--sf-green))]/15 text-[hsl(var(--sf-green))] border-[hsl(var(--sf-green))]/40"
                    : iso < todayIso
                      ? "text-muted-foreground/60 border-white/[0.06]"
                      : "text-muted-foreground/40 border-white/[0.06]"
              )}
            >
              {done && !isToday ? <Check className="h-4 w-4" /> : format(d, "d")}
            </span>
          </div>
        );
      })}
    </div>
    </div>
  );
}


export default function StaffDashboard() {
  const { profile, user } = useAuth();
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const greetingName = profile?.first_name || profile?.display_name?.split(" ")[0] || "there";

  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // The single source for the rota: my_shifts merges published production
  // assignments with standing patterns server-side, for the signed-in user only.
  const todayIso = format(today, "yyyy-MM-dd");
  const { data: myShifts = [] } = useMyShifts(todayIso, format(addDays(today, 14), "yyyy-MM-dd"), {
    enabled: !!user,
  });
  const todayShifts = myShifts.filter((s) => s.shift_date === todayIso);




  const siteLabel = todayShifts.length > 0 ? shiftLocation(todayShifts[0]) : "—";

  return (
    <StaffShell>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] md:text-4xl font-extrabold tracking-tight leading-tight" style={{ color: "#FFFFFF" }}>{greeting}, {greetingName} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">{todayLabel}</p>
          </div>
          {/* The person's Hive photo — tap to change it in the app; the upload
              writes profiles.avatar_url, which IS the Hive's copy, so it syncs
              both ways by construction. The ring is the SERVICE TIER ring from
              /admin/service-tiers (Lee, 6 Aug) — same component the directory
              uses, driven by years of service from start_date. */}
          <Link to="/profile-settings" aria-label="Change your photo" className="shrink-0 mt-1">
            <ServiceRingAvatar
              src={profile?.avatar_url}
              fallback={`${profile?.first_name?.[0] ?? ""}${profile?.surname?.[0] ?? ""}` || "?"}
              yearsOfService={profile?.start_date ? Math.max(0, Math.floor((Date.now() - new Date(profile.start_date).getTime()) / (365.25 * 86400000))) : 0}
              size="sm"
            />
          </Link>
        </div>
        {user && <StreakChips userId={user.id} startDate={profile?.start_date ?? null} />}
        {user && <WeekStrip userId={user.id} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ClockCard siteLabel={siteLabel} />
        <SfCard>
          <SfCardHeader
            title="Today's shift"
            subtitle={todayShifts.length === 0 ? "No shift scheduled" : undefined}
          />
          {todayShifts.length > 0 ? (
            <ul className="space-y-4 text-sm">
              {todayShifts.map((s, i) => (
                <li key={`${s.shift_date}-${s.start_time}-${i}`} className="space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold" style={{ fontFamily: "'Geist Mono', monospace" }}>
                      {formatTime(s.start_time)}–{formatTime(s.end_time)}
                    </span>
                    {s.label && <span className="text-muted-foreground">{s.label}</span>}
                    {s.source === "production" && <ScheduledBadge />}
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> {shiftLocation(s)}
                  </div>
                  {s.role && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" /> <span className="text-white font-medium">{s.role}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">You're not rostered today. Enjoy the day off.</p>
          )}
          <Link to="/shifts" className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            View schedule <ChevronRight className="h-4 w-4" />
          </Link>
        </SfCard>
      </div>


    </StaffShell>
  );
}
