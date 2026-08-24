import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard, SfCardHeader } from "@/components/staff/SfCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/hive";
import { toast } from "@/hooks/use-toast";

export default function StaffSickness() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [notify, setNotify] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");

  const { data: sickRequests = [] } = useQuery({
    queryKey: ["my-sick-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date, reason, status, created_at")
        .eq("person_id", user!.id)
        .eq("request_type", "sickness")
        .order("start_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("leave_requests").insert({
        person_id: user.id,
        request_type: "sickness",
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-sick-requests"] });
      qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
      setReason("");
      toast({ title: "Sickness reported", description: "Your manager can now see it in their approvals." });
    },
    onError: (e: any) => toast({ title: "Couldn't submit", description: e?.message, variant: "destructive" }),
  });

  return (
    <StaffShell>
      <h1 className="text-2xl font-semibold text-white mb-1">Sickness</h1>
      <p className="text-sm text-white/60 mb-6">Let your manager know you're unwell — quickly.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SfCard>
          <SfCardHeader title="Report sickness" />
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!startDate || !endDate) { toast({ title: "Pick both dates", variant: "destructive" }); return; } submit.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Start date</span>
                <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="mt-1 w-full h-10 px-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Expected return</span>
                <input value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} type="date" className="mt-1 w-full h-10 px-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-muted-foreground">Reason</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-1 w-full px-3 py-2 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm resize-none" placeholder="A short note for your manager…" />
            </label>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[10px] border border-[hsl(var(--sf-border))] bg-white/[0.02]">
              <div>
                <div className="text-sm text-foreground font-medium">Notify manager</div>
                <div className="text-xs text-muted-foreground">Send an immediate notification.</div>
              </div>
              <button type="button" onClick={() => setNotify(v => !v)}
                className={`h-6 w-11 rounded-full transition-colors relative ${notify ? "bg-primary" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 ${notify ? "left-5" : "left-0.5"} h-5 w-5 rounded-full bg-white transition-all`} />
              </button>
            </label>
            <button type="submit" disabled={submit.isPending} className="w-full h-11 rounded-[10px] bg-[hsl(var(--sf-red))] text-white font-semibold text-sm hover:brightness-110 disabled:opacity-60">
              {submit.isPending ? "Submitting…" : "Submit report"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">Need a return-to-work form? <a href="/app/return-to-work" className="text-primary hover:underline">Open it here</a>.</p>
          </form>
        </SfCard>

        <SfCard>
          <SfCardHeader title="Recent reports" />
          <ul className="divide-y divide-[hsl(var(--sf-border))]">
            {sickRequests.map((r: any) => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm text-white/90 font-medium">
                    {format(new Date(r.start_date), "d MMM")}
                    {r.start_date !== r.end_date && ` – ${format(new Date(r.end_date), "d MMM")}`}
                  </div>
                  <div className="text-xs text-white/60 line-clamp-1">{r.reason || "No reason given"}</div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-white/80 capitalize">{r.status}</span>
              </li>
            ))}
            {sickRequests.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No reports yet.</li>}
          </ul>
        </SfCard>
      </div>
    </StaffShell>
  );
}
