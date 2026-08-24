import { useState, useMemo } from "react";
import { addMonths, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard, SfCardHeader } from "@/components/staff/SfCard";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useMyShifts, formatTime, shiftLocation, NO_SHIFTS_COPY, type MyShiftRow } from "@/hooks/useMyShifts";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StaffShifts() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  // One RPC per visible month. my_shifts merges published production
  // assignments with standing patterns server-side — the single source.
  const { data: shifts = [], isLoading } = useMyShifts(
    format(monthStart, "yyyy-MM-dd"),
    format(monthEnd, "yyyy-MM-dd"),
    { enabled: !!user }
  );

  const byDate = useMemo(() => {
    const m = new Map<string, MyShiftRow[]>();
    for (const s of shifts) {
      const list = m.get(s.shift_date) ?? [];
      list.push(s);
      m.set(s.shift_date, list);
    }
    return m;
  }, [shifts]);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Pad with leading nulls so Monday=col 0
  const leading = (getDay(monthStart) + 6) % 7; // 0=Sun -> shift so Mon=0
  const cells: (Date | null)[] = [...Array(leading).fill(null), ...days];
  while (cells.length % 7) cells.push(null);

  const sel = selected ? byDate.get(format(selected, "yyyy-MM-dd")) ?? [] : [];
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const upcoming = shifts.filter((s) => s.shift_date > todayIso).slice(0, 14);

  return (
    <StaffShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Shifts</h1>
          <p className="text-sm text-white/80 mt-1">Plan ahead — see your rota at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SfCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCursor((c) => addMonths(c, -1))} className="h-8 w-8 grid place-items-center rounded-[10px] hover:bg-white/[0.04] text-muted-foreground"><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-[17px] font-semibold text-white/90">{format(cursor, "MMMM yyyy")}</div>
            <button onClick={() => setCursor((c) => addMonths(c, 1))} className="h-8 w-8 grid place-items-center rounded-[10px] hover:bg-white/[0.04] text-muted-foreground"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-white/85 mb-2">
            {weekdays.map(d => <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const dayShifts = d ? byDate.get(format(d, "yyyy-MM-dd")) ?? [] : [];
              const isSel = !!(d && selected && isSameDay(d, selected));
              const isToday = !!(d && isSameDay(d, new Date()));
              return (
                <button
                  key={i}
                  onClick={() => d && setSelected(d)}
                  disabled={!d}
                  className={cn(
                    "w-full min-h-[56px] sm:min-h-[64px] rounded-[10px] border p-1.5 text-left flex flex-col gap-1 transition-all overflow-hidden",
                    !d && "invisible",
                    isSel ? "border-primary ring-1 ring-primary/30" : "border-[hsl(var(--sf-border))] hover:border-white/15",
                    isToday && !isSel && "ring-1 ring-white/20",
                  )}
                >
                  <div className={cn("text-[11px] font-medium", isToday ? "text-primary font-bold" : "text-white/75")}>{d && format(d, "d")}</div>
                  {dayShifts.length > 0 && (
                    <div className="text-[10px] px-1.5 py-0.5 rounded border truncate bg-[hsl(var(--sf-blue))]/25 text-[hsl(var(--sf-blue))] border-[hsl(var(--sf-blue))]/30">
                      {formatTime(dayShifts[0].start_time)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-white/70 flex-wrap">
            {!isLoading && shifts.length === 0 && <span>{NO_SHIFTS_COPY}</span>}
          </div>
        </SfCard>

        <SfCard>
          <SfCardHeader
            title={selected ? format(selected, "EEE d MMM") : "Select a day"}
            subtitle={sel.length > 0 ? (sel.some((s) => s.source === "production") ? "Published rota" : "Standing pattern") : undefined}
          />
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sel.length > 0 ? (
            <div className="space-y-5">
              {sel.map((s, i) => (
                <div key={`${s.shift_date}-${s.start_time}-${i}`} className="space-y-3 text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Hours</span>
                    <span className="text-foreground font-medium" style={{ fontFamily: "'Geist Mono', monospace" }}>
                      {formatTime(s.start_time)}–{formatTime(s.end_time)}
                    </span>
                  </div>
                  {s.label && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Shift</span>
                      <span className="text-foreground flex items-center gap-2">
                        {s.label}
                        {s.source === "production" && (
                          <span className="inline-flex items-center text-[10px] font-medium text-[hsl(var(--sf-green))] bg-[hsl(var(--sf-green))]/10 border border-[hsl(var(--sf-green))]/30 px-1.5 py-0.5 rounded">
                            Scheduled
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Where</span>
                    <span className="text-foreground">{shiftLocation(s)}</span>
                  </div>
                  {s.role && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Role</span>
                      <span className="text-foreground">{s.role}</span>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground text-center">To request a swap, speak to your manager.</p>
            </div>
          ) : selected ? (
            <p className="text-sm text-white/75">No shift scheduled on this day.</p>
          ) : (
            <p className="text-sm text-white/75">Tap a day on the calendar to see details.</p>
          )}
        </SfCard>
      </div>

      <div className="mt-5">
        <SfCard>
          <SfCardHeader title="Upcoming shifts" subtitle="The next two weeks"
            action={<Link to="/swap-shift" className="text-xs text-primary font-medium hover:underline">Request a swap</Link>} />
          {upcoming.length === 0 ? (
            <p className="text-sm text-white/75 py-4 text-center">{NO_SHIFTS_COPY}</p>
          ) : (
            <ul className="divide-y divide-[hsl(var(--sf-border))]">
              {upcoming.map((s, i) => (
                <li key={`${s.shift_date}-${s.start_time}-${i}`} className="py-3 flex items-center gap-3 text-sm">
                  <div className="w-20 text-xs text-muted-foreground">
                    {format(parseISO(s.shift_date), "EEE")} <span className="text-white font-semibold">{format(parseISO(s.shift_date), "d MMM")}</span>
                  </div>
                  <div className="flex-1 text-white font-semibold" style={{ fontFamily: "'Geist Mono', monospace" }}>
                    {formatTime(s.start_time)}–{formatTime(s.end_time)}
                    {s.label && <span className="ml-2 text-xs text-muted-foreground font-normal" style={{ fontFamily: "inherit" }}>{s.label}</span>}
                  </div>
                  <div className="text-xs text-white text-right">{shiftLocation(s)}</div>
                </li>
              ))}
            </ul>
          )}
        </SfCard>
      </div>
    </StaffShell>
  );
}
