import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard, SfCardHeader } from "@/components/staff/SfCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/hive";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { requestDays, formatRequestDays, halfDayLabel, type LeaveDayPart, type LeaveDaySpan } from '@sf/core';

function Ring({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20">
      <circle cx="40" cy="40" r={r} stroke="hsl(var(--sf-border))" strokeWidth="6" fill="none" />
      <circle cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - c * pct} transform="rotate(-90 40 40)" />
    </svg>
  );
}

const statusPill = (s: string) =>
  s === "approved" ? "bg-[hsl(var(--sf-green))]/15 text-[hsl(var(--sf-green))]"
  : s === "rejected" ? "bg-[hsl(var(--sf-red))]/15 text-[hsl(var(--sf-red))]"
  : s === "cancelled" ? "bg-white/[0.06] text-white/50"
  : "bg-primary/15 text-primary";

const TYPE_LABEL: Record<string, string> = {
  holiday: "Annual",
  leave: "Annual",
  sickness: "Sick",
  lieu: "Time in lieu",
  closure: "Company closure",
  other: "Other",
};

const DURATIONS: { value: LeaveDayPart; label: string }[] = [
  { value: "full", label: "Full day(s)" },
  { value: "am", label: "Half day, AM" },
  { value: "pm", label: "Half day, PM" },
];

// The generated Supabase types predate the 2026-08-17 day_part migration, so
// the row shape this page relies on is declared here rather than inferred.
interface LeaveRequestRow extends LeaveDaySpan {
  id: string;
  status: string;
  request_type: string;
  reason: string | null;
  created_at: string;
}

// Not every card carries a unit or a caption, so the optional fields have to be
// declared — otherwise TypeScript infers a union and none of them are reachable.
interface BalanceCard {
  label: string;
  used: number;
  total: number;
  color: string;
  unit?: string;
  captionText?: string;
  captionOnly?: boolean;
}

export default function StaffTimeOff() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [dayPart, setDayPart] = useState<LeaveDayPart>("full");
  const [requestType, setRequestType] = useState<"holiday" | "lieu">("holiday");

  // A half day covers a single date — pin the end date to the start.
  const setDuration = (next: LeaveDayPart) => {
    setDayPart(next);
    if (next !== "full" && startDate) setEndDate(startDate);
  };
  const onStartDateChange = (v: string) => {
    setStartDate(v);
    if (dayPart !== "full") setEndDate(v);
  };

  const { data: leaveBalance } = useQuery({
    queryKey: ["my-leave-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("person_id", user!.id)
        .eq("year", new Date().getFullYear())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-leave-requests", user?.id],
    queryFn: async (): Promise<LeaveRequestRow[]> => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("person_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Cast for the same reason as the interface above: the generated types
      // lag the day_part migration.
      return (data ?? []) as unknown as LeaveRequestRow[];
    },
    enabled: !!user,
  });

  // All day counts go through requestDays — working days, half days as 0.5,
  // weekends and England & Wales bank holidays excluded. Cancelled rows are
  // never counted.
  const annualUsed = requests
    .filter((r) => r.status === "approved" && (r.request_type === "holiday" || r.request_type === "leave"))
    .reduce((s: number, r) => s + requestDays(r), 0);
  const sickUsed = requests
    .filter((r) => r.status === "approved" && r.request_type === "sickness")
    .reduce((s: number, r) => s + requestDays(r), 0);
  const lieuUsed = requests
    .filter((r) => r.status === "approved" && r.request_type === "lieu")
    .reduce((s: number, r) => s + requestDays(r), 0);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const annualTotal = (leaveBalance?.annual_leave_allowance ?? 0) + (leaveBalance?.carry_over_days ?? 0);

  const balances: BalanceCard[] = [
    { label: "Annual",   used: annualUsed, total: annualTotal, color: "hsl(var(--sf-amber))" },
    { label: "Sick",     used: sickUsed,   total: Math.max(sickUsed, 1), color: "hsl(var(--sf-red))", captionText: "days used" },
    { label: "Remaining", used: Math.max(annualTotal - annualUsed, 0), total: Math.max(annualTotal, 1), color: "hsl(var(--sf-green))" },
    { label: "Pending",  used: pendingCount, total: Math.max(pendingCount, 1), color: "hsl(var(--sf-blue))", unit: " req", captionOnly: true },
  ];

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      // Cast: generated types lag the day_part migration.
      const { error } = await supabase.from("leave_requests").insert({
        person_id: user.id,
        request_type: requestType,
        start_date: startDate,
        end_date: dayPart === "full" ? endDate : startDate,
        day_part: dayPart,
        reason: reason || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
      setStartDate(""); setEndDate(""); setReason(""); setDayPart("full"); setRequestType("holiday");
      toast({ title: "Request submitted", description: "Awaiting your manager's approval." });
    },
    onError: (e: Error) => toast({ title: "Couldn't submit", description: e?.message, variant: "destructive" }),
  });

  // Cancel, never delete: own pending rows, or approved rows starting later.
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const canCancel = (r: LeaveRequestRow) =>
    r.status === "pending" || (r.status === "approved" && r.start_date > todayIso);

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "cancelled" } as any)
        .eq("id", id)
        .eq("person_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
      toast({ title: "Request cancelled", description: "It no longer counts towards your balance." });
    },
    onError: (e: Error) => toast({ title: "Couldn't cancel", description: e?.message, variant: "destructive" }),
  });

  // Amend = cancel the old row, then prefill a fresh form with its values.
  const amend = (r: LeaveRequestRow) => {
    cancel.mutate(r.id, {
      onSuccess: () => {
        setRequestType(r.request_type === "lieu" ? "lieu" : "holiday");
        setStartDate(r.start_date);
        setEndDate(r.end_date);
        setDayPart((r.day_part as LeaveDayPart) ?? "full");
        setReason(r.reason ?? "");
        toast({ title: "Amending request", description: "The old request was cancelled — submit the new one." });
      },
    });
  };

  return (
    <StaffShell>
      <h1 className="text-2xl font-semibold text-white mb-1">Time Off</h1>
      <p className="text-sm text-white/60 mb-6">Track balances, request leave, see your history.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {balances.map((b) => (
          <SfCard key={b.label} className="flex items-center gap-4">
            <div className="relative">
              <Ring value={b.used} max={b.total} color={b.color} />
              <div className="absolute inset-0 grid place-items-center font-semibold text-white tabular-nums" style={{ fontFamily: "'Geist Mono', monospace", fontSize: String(b.used).length > 2 ? 16 : 22 }}>
                {b.used}{b.captionOnly ? "" : (b.unit ?? "")}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white/90">{b.label}</div>
              <div className="text-xs text-white/60 truncate">{b.captionText ?? `of ${b.total}${b.unit ?? ""}`}</div>
            </div>
          </SfCard>
        ))}
      </div>

      {/* Time in lieu is its own line — it never touches annual or sick. */}
      <SfCard className="mb-5 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/90">
          Time in lieu taken: {lieuUsed} day{lieuUsed === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-white/50">Not deducted from annual leave</span>
      </SfCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SfCard>
          <SfCardHeader title="Request time off" />
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!startDate || (dayPart === "full" && !endDate)) { toast({ title: "Pick both dates", variant: "destructive" }); return; } submit.mutate(); }}>
            <label className="block">
              <span className="text-xs text-muted-foreground">Type</span>
              <select value={requestType} onChange={(e) => setRequestType(e.target.value as "holiday" | "lieu")} className="mt-1 w-full h-10 px-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm">
                <option value="holiday">Annual leave</option>
                <option value="lieu">Time in lieu</option>
              </select>
            </label>

            <div>
              <span className="text-xs text-muted-foreground">Duration</span>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => (
                  <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                    className={cn("h-10 rounded-[10px] border text-xs font-medium transition-colors",
                      dayPart === d.value ? "border-primary bg-primary/15 text-primary" : "border-[hsl(var(--sf-border))] text-white/60 hover:bg-white/[0.04]")}>
                    {d.label}
                  </button>
                ))}
              </div>
              {dayPart !== "full" && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">Half days cover a single date — the end date matches the start date.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">{dayPart === "full" ? "Start date" : "Date"}</span>
                <input value={startDate} onChange={(e) => onStartDateChange(e.target.value)} type="date" className="mt-1 block w-full min-w-0 h-10 px-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm appearance-none" />
              </label>
              {dayPart === "full" && (
                <label className="block">
                  <span className="text-xs text-muted-foreground">End date</span>
                  <input value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} type="date" className="mt-1 block w-full min-w-0 h-10 px-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm appearance-none" />
                </label>
              )}
            </div>

            {startDate && (endDate || dayPart !== "full") && (
              <p className="text-xs text-muted-foreground">
                Duration: {formatRequestDays({ start_date: startDate, end_date: dayPart === "full" ? endDate : startDate, day_part: dayPart })}
                {requestType === "holiday" && ` · Remaining balance: ${Math.max(annualTotal - annualUsed, 0)} days`}
              </p>
            )}
            <label className="block">
              <span className="text-xs text-muted-foreground">Reason (optional)</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm resize-none" placeholder="Anything your manager should know?" />
            </label>
            <button type="submit" disabled={submit.isPending} className="w-full h-11 rounded-[10px] bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 disabled:opacity-60">
              {submit.isPending ? "Submitting…" : "Submit request"}
            </button>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a href="/sickness" className="h-11 rounded-full grid place-items-center text-sm font-bold uppercase tracking-wide bg-[hsl(var(--sf-red))]/15 text-[hsl(var(--sf-red))] ring-2 ring-[hsl(var(--sf-red))]/40 ring-offset-2 ring-offset-[hsl(var(--sf-card))]">Report sickness</a>
              <a href="/app/return-to-work" className="h-11 rounded-full grid place-items-center text-sm font-bold uppercase tracking-wide bg-[hsl(var(--sf-green))]/15 text-[hsl(var(--sf-green))] ring-2 ring-[hsl(var(--sf-green))]/40 ring-offset-2 ring-offset-[hsl(var(--sf-card))]">Return to work</a>
            </div>
          </form>
        </SfCard>

        <SfCard>
          <SfCardHeader title="History" subtitle="Your recent requests" />
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <ul className="divide-y divide-[hsl(var(--sf-border))]">
              {requests.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No requests yet.</li>}
              {requests.slice(0, 12).map((h) => (
                <li key={h.id} className={cn("py-3 flex items-center gap-3", h.status === "cancelled" && "opacity-50")}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/90 font-medium flex items-center gap-2 flex-wrap">
                      <span>
                        {TYPE_LABEL[h.request_type] ?? h.request_type} · {format(new Date(h.start_date), "d MMM")}{h.start_date !== h.end_date ? `–${format(new Date(h.end_date), "d MMM")}` : ""}
                      </span>
                      {h.request_type === "closure" && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">Closure</span>
                      )}
                      {h.day_part && h.day_part !== "full" && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">{halfDayLabel({ day_part: h.day_part })}</span>
                      )}
                    </div>
                    <div className="text-xs text-white/60">{formatRequestDays(h)}</div>
                  </div>
                  {canCancel(h) && (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => amend(h)} disabled={cancel.isPending} className="text-[11px] px-2 py-1 rounded-full bg-white/[0.06] text-white/80 hover:bg-white/[0.12]">Amend</button>
                      <button type="button" onClick={() => cancel.mutate(h.id)} disabled={cancel.isPending} className="text-[11px] px-2 py-1 rounded-full bg-[hsl(var(--sf-red))]/15 text-[hsl(var(--sf-red))] hover:brightness-125">Cancel</button>
                    </div>
                  )}
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize", statusPill(h.status))}>{h.status}</span>
                </li>
              ))}
            </ul>
          )}
        </SfCard>
      </div>
    </StaffShell>
  );
}
