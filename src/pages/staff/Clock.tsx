import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard, SfCardHeader } from "@/components/staff/SfCard";
import { useClock, formatHMS, formatHM } from "@/contexts/ClockContext";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptic } from "@/hooks/useHaptic";
import { supabase } from "@/integrations/supabase/hive";
import { getTodayStatus } from "@/lib/supabase-helpers";
import { toast } from "@/hooks/use-toast";
import { Play, Square, Coffee, Loader2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StaffClock() {
  const { user } = useAuth();
  const { clockedIn, elapsedSec, attemptClockIn, clockOutNow, onBreak, toggleBreak } = useClock();
  const { triggerHaptic } = useHaptic();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // Door-poster entry (?via=wall): the wall QR is a generic link, never an
  // identity — whoever's phone scanned it is who gets clocked, because the
  // insert runs under this session and RLS pins person_id = auth.uid().
  // The param is consumed once so a refresh doesn't re-prompt.
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallPrompt, setWallPrompt] = useState(searchParams.get("via") === "wall");
  const dismissWallPrompt = () => {
    setWallPrompt(false);
    if (searchParams.has("via")) setSearchParams({}, { replace: true });
  };

  // Today's attendance events for activity timeline (same source as AttendanceHistory)
  const { data: todayEvents = [] } = useQuery({
    queryKey: ["today-attendance-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance_events")
        .select("*")
        .eq("person_id", user.id)
        .gte("recorded_at", `${today}T00:00:00`)
        .lte("recorded_at", `${today}T23:59:59`)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const eventLabel = (e: any) => {
    const map: Record<string, string> = {
      in: "Clocked in",
      out: "Clocked out",
    };
    const src = e.source ? ` · ${e.source}` : "";
    return `${map[e.direction] ?? e.direction}${src}`;
  };

  const handleClock = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const status = await getTodayStatus(user.id);

      if (status.isSignedIn) {
        // ClockContext writes the 'out' row and stops the geofence watcher.
        await clockOutNow();
        triggerHaptic("action");
        toast({ title: "Clocked out", description: "Have a good rest.", variant: "success" as any });
      } else {
        // ClockContext checks the site geofence, writes the 'in' row and
        // starts the leave-site watcher.
        const result = await attemptClockIn();
        if (!result.ok) {
          triggerHaptic("action");
          toast({ title: "Not clocked in", description: result.message, variant: "destructive" });
          return;
        }
        triggerHaptic("success");
        toast({ title: "Clocked in", description: "Have a good shift.", variant: "success" as any });
      }
      queryClient.invalidateQueries({ queryKey: ["today-attendance-events"] });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed", description: e?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Breaks are a local timer convenience only — the Hive attendance ledger
  // records in/out; break events did not survive the migration.
  const handleBreakToggle = () => {
    toggleBreak();
    triggerHaptic("action");
  };

  return (
    <StaffShell>
      <h1 className="text-2xl font-semibold mb-1">Clock In / Out</h1>
      <p className="text-sm text-muted-foreground mb-6">Record your time from your phone.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SfCard className="lg:col-span-2 flex flex-col items-center text-center py-10">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Current time · {now}</div>
          <button
            onClick={handleClock}
            disabled={submitting}
            className={cn(
              "w-full h-16 rounded-full flex items-center justify-center gap-2.5 font-bold uppercase tracking-wider text-base transition-all active:scale-[0.99] ring-2 ring-offset-2 bg-gradient-to-tr from-orange-700 via-orange-500 to-yellow-400 text-primary-foreground ring-amber-300/70 shadow-[0_10px_30px_-10px_hsl(24_95%_53%/0.7)] hover:brightness-110",
              clockedIn && "bg-none bg-[hsl(var(--sf-red))]/15 text-[hsl(var(--sf-red))] ring-[hsl(var(--sf-red))]/50 shadow-none",
              submitting && "opacity-70"
            )}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : clockedIn ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {clockedIn ? "Clock out" : "Clock in"}
          </button>
          {!clockedIn && <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1"><Smartphone className="h-3 w-3" /> From your phone</div>}
          <div className="mt-6 text-4xl tabular-nums font-semibold" style={{ fontFamily: "'Geist Mono', monospace", color: "#FFFFFF" }}>{formatHMS(elapsedSec)}</div>
          <div className="text-sm text-muted-foreground mt-1">Worked today: <span className="text-white font-semibold">{clockedIn ? formatHM(elapsedSec) : "0h 0m"}</span></div>

          {clockedIn && (
            <button onClick={handleBreakToggle}
              className={cn(
                "mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border text-sm font-medium",
                onBreak
                  ? "border-[hsl(var(--sf-green))]/40 bg-[hsl(var(--sf-green))]/10 text-[hsl(var(--sf-green))]"
                  : "border-[hsl(var(--sf-border))] text-muted-foreground hover:text-foreground"
              )}
            >
              <Coffee className="h-4 w-4" /> {onBreak ? "End break" : "Start break"}
            </button>
          )}
        </SfCard>

        <SfCard>
          <SfCardHeader title="Activity timeline" subtitle="Today" />
          <ol className="space-y-4">
            {todayEvents.length === 0 && !clockedIn && (
              <li className="text-sm text-muted-foreground">No activity yet today.</li>
            )}
            {todayEvents.map((e: any) => (
              <li key={e.id} className="flex gap-3">
                <div className="text-xs text-muted-foreground w-12 tabular-nums" style={{ fontFamily: "'Geist Mono', monospace" }}>
                  {format(new Date(e.recorded_at), "HH:mm")}
                </div>
                <div className="relative pl-4 border-l border-[hsl(var(--sf-border))] flex-1">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-sm text-foreground">{eventLabel(e)}</div>
                </div>
              </li>
            ))}
            {clockedIn && (
              <li className="flex gap-3">
                <div className="text-xs text-muted-foreground w-12 tabular-nums" style={{ fontFamily: "'Geist Mono', monospace" }}>now</div>
                <div className="relative pl-4 border-l border-[hsl(var(--sf-border))] flex-1">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--sf-green))] animate-pulse" />
                  <div className="text-sm text-[hsl(var(--sf-green))] font-medium">{onBreak ? "On break" : "Working"}</div>
                </div>
              </li>
            )}
          </ol>
        </SfCard>
      </div>

      <Dialog open={wallPrompt} onOpenChange={(o) => !o && dismissWallPrompt()}>
        <DialogContent className="max-w-sm rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold">Door poster scanned</DialogTitle>
            <DialogDescription>
              This phone's login is your identity — nobody can clock you from another
              device. The geofence still applies.
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full h-14 text-base font-bold rounded-[16px] bg-gradient-to-tr from-orange-700 via-orange-500 to-yellow-400"
            disabled={submitting}
            onClick={async () => { await handleClock(); dismissWallPrompt(); }}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm clock in / out"}
          </Button>
          <button className="text-xs text-muted-foreground mx-auto" onClick={dismissWallPrompt}>
            Not now
          </button>
        </DialogContent>
      </Dialog>
    </StaffShell>
  );
}
