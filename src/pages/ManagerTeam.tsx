import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceRingAvatar, getInitials } from "@/components/ServiceRingAvatar";
import { supabase } from "@/integrations/supabase/hive";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSites, formatDuration, fetchPresenceMapForDate } from "@/lib/supabase-helpers";
import { getServiceInfo, DEFAULT_SERVICE_TIERS } from '@sf/core';
import type { PresenceStatus } from "@/types";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, Building2, Filter, Loader2 } from "lucide-react";

const ManagerTeam = () => {
  const { user } = useAuth();
  const [selectedSite, setSelectedSite] = useState("all");
  const [directReportsOnly, setDirectReportsOnly] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch all sites
  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
  });

  // Static tier ladder (the old tier-config table retired in the Hive migration)
  const serviceTiers = DEFAULT_SERVICE_TIERS;

  // Fetch all profiles (non-sensitive directory fields only)
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_staff_directory");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });


  // Fetch today's presence summaries
  const { data: presenceSummaries, isLoading: loadingPresence } = useQuery({
    queryKey: ["presence-summaries", today],
    queryFn: async () => {
      // Derived live from attendance_events (summary table retired)
      const map = await fetchPresenceMapForDate(today);
      return Array.from(map.values()).map((p) => ({
        person_id: p.personId,
        status: p.isIn ? "on_site" : "off",
        primary_site: null as string | null,
        first_sign_in: p.firstIn,
        total_worked_minutes: p.totalWorkedMinutes,
      }));
    },
  });

  // Combine profiles with their presence status and service tier
  const teamData = profiles?.map((profile) => {
    const presence = presenceSummaries?.find((p) => p.person_id === profile.id);
    const serviceInfo = serviceTiers ? getServiceInfo(profile.start_date, serviceTiers) : null;
    return {
      ...profile,
      currentStatus: (presence?.status as PresenceStatus) || "off",
      primarySite: presence?.primary_site || null,
      firstSignIn: presence?.first_sign_in || null,
      totalWorkedMinutes: presence?.total_worked_minutes || 0,
      tierColor: serviceInfo?.tier?.tier_color || null,
      yearsOfService: serviceInfo?.yearsOfService || 0,
    };
  }) || [];

  // Apply filters
  const filteredTeam = teamData.filter((member) => {
    // Direct reports filter
    if (directReportsOnly && user && member.reports_to !== user.id) {
      return false;
    }
    
    // Site filter
    if (selectedSite !== "all" && member.primarySite !== selectedSite) {
      // Also include members who haven't signed in if showing "all"
      if (member.primarySite !== null) return false;
    }
    return true;
  });

  // Calculate status counts
  const statusCounts = {
    on_site: filteredTeam.filter((u) => u.currentStatus === "on_site").length,
    remote: filteredTeam.filter((u) => u.currentStatus === "remote").length,
    leave: filteredTeam.filter((u) => u.currentStatus === "leave").length,
    sick: filteredTeam.filter((u) => u.currentStatus === "sick").length,
    off: filteredTeam.filter((u) => u.currentStatus === "off").length,
  };

  const isLoading = loadingProfiles || loadingPresence;

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 pb-24 lg:pb-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Team Presence</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="card-industrial p-4 text-center">
            <div className="text-3xl font-bold text-status-on-site">{statusCounts.on_site}</div>
            <div className="text-sm text-muted-foreground">On Site</div>
          </div>
          <div className="card-industrial p-4 text-center">
            <div className="text-3xl font-bold text-status-remote">{statusCounts.remote}</div>
            <div className="text-sm text-muted-foreground">On Break</div>
          </div>
          <div className="card-industrial p-4 text-center">
            <div className="text-3xl font-bold text-status-leave">{statusCounts.leave}</div>
            <div className="text-sm text-muted-foreground">On Leave</div>
          </div>
          <div className="card-industrial p-4 text-center">
            <div className="text-3xl font-bold text-status-sick">{statusCounts.sick}</div>
            <div className="text-sm text-muted-foreground">Sick</div>
          </div>
          <div className="card-industrial p-4 text-center col-span-2 lg:col-span-1">
            <div className="text-3xl font-bold text-status-off">{statusCounts.off}</div>
            <div className="text-sm text-muted-foreground">Not Signed In</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card-industrial p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {sites?.map((site) => (
                      <SelectItem key={site.code} value={site.code}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch 
                  id="direct-reports" 
                  checked={directReportsOnly}
                  onCheckedChange={setDirectReportsOnly}
                />
                <Label htmlFor="direct-reports" className="text-sm">
                  Direct reports only
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Team Table */}
        <div className="card-industrial overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Employee</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Department</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Site</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Sign In</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No team members found
                      </td>
                    </tr>
                  ) : (
                    filteredTeam.map((member) => (
                      <tr key={member.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <ServiceRingAvatar 
                              src={undefined}
                              fallback={getInitials(member.first_name, member.surname)}
                              yearsOfService={member.yearsOfService || 0}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-foreground">
                                {member.display_name || `${member.first_name} ${member.surname}`}
                              </p>
                              <p className="text-sm text-muted-foreground lg:hidden">
                                {member.department || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground hidden lg:table-cell">
                          {member.department || "—"}
                        </td>
                        <td className="p-4 text-muted-foreground hidden md:table-cell">
                          {member.primarySite || "—"}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={member.currentStatus} size="sm" />
                        </td>
                        <td className="p-4 text-muted-foreground hidden lg:table-cell">
                          {member.firstSignIn
                            ? format(new Date(member.firstSignIn), "h:mm a")
                            : "—"}
                        </td>
                        <td className="p-4 text-muted-foreground hidden lg:table-cell">
                          {member.currentStatus !== "off" && member.firstSignIn
                            ? formatDuration(
                                Math.floor(
                                  (Date.now() - new Date(member.firstSignIn).getTime()) / 60000
                                )
                              )
                            : member.totalWorkedMinutes > 0
                            ? formatDuration(member.totalWorkedMinutes)
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ManagerTeam;
