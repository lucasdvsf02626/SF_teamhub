import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard } from "@/components/staff/SfCard";
import { supabase } from "@/integrations/supabase/hive";
import { fetchTodayPresenceMap } from "@/lib/supabase-helpers";
import { UserAvatar } from "@/components/UserAvatar";
import { Search, Users, MapPin, Coffee, Home, Plane, Thermometer, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/types";

interface Member {
  id: string;
  display_name: string | null;
  first_name: string | null;
  surname: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  email: string | null;
  status: PresenceStatus | "off";
  site: string | null;
  currentLeaveType: "sick" | "annual" | null;
}

const STATUS_META: Record<string, { label: string; icon: any; cls: string }> = {
  on_site:  { label: "On Site",  icon: MapPin,       cls: "text-[hsl(var(--sf-green))] bg-[hsl(var(--sf-green))]/10 border-[hsl(var(--sf-green))]/30" },
  on_break: { label: "On Break", icon: Coffee,       cls: "text-amber-300 bg-amber-500/10 border-amber-400/30" },
  remote:   { label: "Remote",   icon: Home,         cls: "text-[hsl(var(--sf-blue))] bg-[hsl(var(--sf-blue))]/10 border-[hsl(var(--sf-blue))]/30" },
  leave:    { label: "Holiday",  icon: Plane,        cls: "text-violet-300 bg-violet-500/10 border-violet-400/30" },
  sick:     { label: "Sick",     icon: Thermometer,  cls: "text-[hsl(var(--sf-red))] bg-[hsl(var(--sf-red))]/10 border-[hsl(var(--sf-red))]/30" },
  off:      { label: "Off Site", icon: UserX,        cls: "text-white/70 bg-white/5 border-[hsl(var(--sf-border))]" },
};

export default function StaffTeam() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");

  const { data: profiles = [] } = useQuery({
    queryKey: ["staff-team-profiles"],
    queryFn: async () => {
      // Non-sensitive directory only (see get_staff_directory).
      const { data, error } = await supabase.rpc("get_staff_directory");
      if (error) throw error;
      return ((data ?? []) as any[]).map((p) => ({ ...p, email: null as string | null }));
    },
  });


  const { data: presence = [] } = useQuery({
    queryKey: ["staff-team-presence"],
    queryFn: async () => {
      // Derived live from attendance_events (summary table retired)
      const map = await fetchTodayPresenceMap();
      return Array.from(map.values()).map((p) => ({
        person_id: p.personId,
        status: p.isIn ? "on_site" : "off",
        primary_site: null as string | null,
      }));
    },
  });

  const { data: currentLeave = [] } = useQuery({
    queryKey: ["staff-team-current-leave"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("person_id, request_type")
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const members: Member[] = useMemo(() => profiles.map((p: any) => {
    const pr = presence.find((x: any) => x.person_id === p.id);
    const lv = currentLeave.find((x: any) => x.person_id === p.id);
    const leaveType = lv ? (lv.request_type === "sickness" ? "sick" : "annual") : null;
    return {
      ...p,
      status: (pr?.status as PresenceStatus) || "off",
      site: pr?.primary_site || null,
      currentLeaveType: leaveType,
    };
  }), [profiles, presence, currentLeave]);

  const departments = useMemo(() => [...new Set(members.map(m => m.department).filter(Boolean))].sort(), [members]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of members) {
      const k = m.currentLeaveType === "sick" ? "sick" : m.currentLeaveType === "annual" ? "leave" : m.status;
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [members]);

  const filtered = members.filter(m => {
    const name = (m.display_name || `${m.first_name || ""} ${m.surname || ""}`).toLowerCase();
    const matchQ = !q || name.includes(q.toLowerCase()) || (m.job_title?.toLowerCase().includes(q.toLowerCase()));
    const matchD = dept === "all" || m.department === dept;
    return matchQ && matchD;
  });

  const summaryOrder = ["on_site", "on_break", "remote", "leave", "sick", "off"];

  return (
    <StaffShell>
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-white">Team</h1>
      </div>
      <p className="text-sm text-white/60 mb-6">{members.length} teammates · live status</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {summaryOrder.map(k => {
          const m = STATUS_META[k];
          const Icon = m.icon;
          return (
            <SfCard key={k} className="!p-3">
              <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-semibold mb-2", m.cls)}>
                <Icon className="h-3 w-3" /> {m.label}
              </div>
              <div className="text-2xl font-semibold text-white tabular-nums">{counts[k] || 0}</div>
            </SfCard>
          );
        })}
      </div>

      <SfCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search by name or job title…"
              className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/40"
            />
          </div>
          <select value={dept} onChange={e => setDept(e.target.value)}
            className="h-10 px-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm text-white">
            <option value="all">All departments</option>
            {departments.map(d => <option key={d!} value={d!}>{d}</option>)}
          </select>
        </div>
      </SfCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(m => {
          const key = m.currentLeaveType === "sick" ? "sick" : m.currentLeaveType === "annual" ? "leave" : m.status;
          const meta = STATUS_META[key] || STATUS_META.off;
          const Icon = meta.icon;
          return (
            <SfCard key={m.id} className="!p-4">
              <div className="flex items-center gap-3">
                <UserAvatar firstName={m.first_name} surname={m.surname} avatarUrl={m.avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{m.display_name || `${m.first_name || ""} ${m.surname || ""}`.trim() || "Unknown"}</div>
                  <div className="text-xs text-white/60 truncate">{m.job_title || "—"}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold", meta.cls)}>
                  <Icon className="h-3 w-3" /> {meta.label}
                </span>
                {m.site && <span className="text-[11px] text-white/60 truncate">{m.site}</span>}
              </div>
            </SfCard>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center py-10 text-white/60 text-sm">No teammates match.</div>}
      </div>
    </StaffShell>
  );
}
