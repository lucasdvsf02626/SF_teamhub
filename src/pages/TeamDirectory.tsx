import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/hive";
import { fetchTodayPresenceMap } from "@/lib/supabase-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamMemberDetailDialog } from "@/components/TeamMemberDetailDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Search, Building2, Mail, Phone, Cake, Palmtree, ThermometerSnowflake, PartyPopper } from "lucide-react";
import { format, addDays, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";
import type { PresenceStatus } from "@/types";

interface TeamMember {
  id: string;
  display_name: string | null;
  first_name: string | null;
  surname: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  birthday: string | null;
  start_date: string | null;
  status: PresenceStatus;
  site: string | null;
  currentLeaveType: 'sick' | 'annual' | null;
  isBirthday: boolean;
}

export default function TeamDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch the staff directory. This deliberately goes through the
  // `get_staff_directory` RPC rather than reading `profiles` directly: the
  // profiles table is now RLS-locked to self / direct reports / admins, and the
  // directory exposes ONLY non-sensitive fields (no email, phone, permission
  // level, payroll id or PIN).
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["team-directory-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_staff_directory");
      if (error) throw error;
      return ((data ?? []) as any[]).map((p) => ({
        ...p,
        // Day/month only — the birth year is never sent to the client.
        birthday: p.birthday_md ? `2000-${p.birthday_md}` : null,
        email: null as string | null,
        phone: null as string | null,
      }));
    },
  });


  // Fetch today's presence summaries
  const { data: presenceSummaries } = useQuery({
    queryKey: ["team-directory-presence"],
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

  // Fetch current approved leave (sick/holiday)
  const { data: currentLeave } = useQuery({
    queryKey: ["team-directory-current-leave"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("person_id, request_type")
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today);
      
      if (error) throw error;
      return data;
    },
  });

  // Check if today is someone's birthday
  const isTodayBirthday = (birthday: string | null): boolean => {
    if (!birthday) return false;
    const today = new Date();
    const bday = new Date(birthday);
    return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
  };

  // Get upcoming birthdays this week (including today)
  const upcomingBirthdays = useMemo(() => {
    if (!profiles) return [];
    
    const today = startOfDay(new Date());
    const weekFromNow = addDays(today, 7);
    
    return profiles
      .filter(p => p.birthday)
      .map(p => {
        const bday = new Date(p.birthday!);
        // Create this year's birthday date
        const thisYearBirthday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        // If birthday already passed this year, check next year
        const birthdayThisWeek = isBefore(thisYearBirthday, today) 
          ? new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate())
          : thisYearBirthday;
        
        return {
          ...p,
          upcomingBirthday: birthdayThisWeek,
          isToday: isSameDay(birthdayThisWeek, today),
        };
      })
      .filter(p => {
        const bd = p.upcomingBirthday;
        return (isSameDay(bd, today) || isAfter(bd, today)) && isBefore(bd, weekFromNow);
      })
      .sort((a, b) => a.upcomingBirthday.getTime() - b.upcomingBirthday.getTime())
      .slice(0, 5); // Show max 5
  }, [profiles]);

  // Combine profiles with presence and leave data
  const teamMembers: TeamMember[] = (profiles || []).map((profile) => {
    const presence = presenceSummaries?.find((p) => p.person_id === profile.id);
    const leave = currentLeave?.find((l) => l.person_id === profile.id);
    
    let currentLeaveType: 'sick' | 'annual' | null = null;
    if (leave) {
      currentLeaveType = leave.request_type === 'sickness' ? 'sick' : 'annual';
    }

    return {
      ...profile,
      status: (presence?.status as PresenceStatus) || "off",
      site: presence?.primary_site || null,
      currentLeaveType,
      isBirthday: isTodayBirthday(profile.birthday),
    };
  });

  // Get unique departments
  const departments = [...new Set(teamMembers.map((m) => m.department).filter(Boolean))].sort();

  // Count people on leave
  const sickCount = teamMembers.filter(m => m.currentLeaveType === 'sick').length;
  const holidayCount = teamMembers.filter(m => m.currentLeaveType === 'annual').length;

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    const name = member.display_name || `${member.first_name || ""} ${member.surname || ""}`.trim();
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.job_title?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartment = departmentFilter === "all" || member.department === departmentFilter;
    
    // Handle status filter including leave types
    let matchesStatus = true;
    if (statusFilter === "sick") {
      matchesStatus = member.currentLeaveType === 'sick';
    } else if (statusFilter === "leave") {
      matchesStatus = member.currentLeaveType === 'annual';
    } else if (statusFilter !== "all") {
      matchesStatus = member.status === statusFilter && !member.currentLeaveType;
    }
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Group by status for summary (excluding people on leave from on_site etc)
  const statusCounts = teamMembers.reduce((acc, member) => {
    if (member.currentLeaveType === 'sick') {
      acc['sick'] = (acc['sick'] || 0) + 1;
    } else if (member.currentLeaveType === 'annual') {
      acc['leave'] = (acc['leave'] || 0) + 1;
    } else {
      acc[member.status] = (acc[member.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const getName = (member: TeamMember) => {
    return member.display_name || `${member.first_name || ""} ${member.surname || ""}`.trim() || "Unknown";
  };

  const handleCardClick = (member: TeamMember) => {
    setSelectedMember(member);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Team Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            View all team members and their current status
          </p>
        </div>

        {/* Upcoming Birthdays Card */}
        {upcomingBirthdays.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <PartyPopper className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold text-foreground">Upcoming Birthdays</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {upcomingBirthdays.map(person => {
                  const name = person.display_name || `${person.first_name || ""} ${person.surname || ""}`.trim();
                  return (
                    <div 
                      key={person.id} 
                      className="flex items-center gap-2 bg-background/80 rounded-full px-3 py-1.5"
                    >
                      <UserAvatar
                        firstName={person.first_name}
                        surname={person.surname}
                        avatarUrl={person.avatar_url}
                        size="sm"
                      />
                      <div className="text-sm">
                        <span className="font-medium">{name}</span>
                        <span className="text-muted-foreground ml-1">
                          {person.isToday ? (
                            <Badge className="bg-pink-500 text-white text-xs ml-1">Today! 🎂</Badge>
                          ) : (
                            format(person.upcomingBirthday, "EEE, MMM d")
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { status: "on_site" as PresenceStatus, label: "On Site" },
            { status: "on_break" as PresenceStatus, label: "On Break" },
            { status: "remote" as PresenceStatus, label: "Remote" },
            { status: "leave" as PresenceStatus, label: "Holiday" },
            { status: "sick" as PresenceStatus, label: "Sick" },
            { status: "off" as PresenceStatus, label: "Off Site" },
          ].map(({ status, label }) => (
            <Card 
              key={status} 
              className={`cursor-pointer transition-all ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {statusCounts[status] || 0}
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept!}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team Grid */}
        {profilesLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading team directory...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No team members found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map((member) => (
              <Card 
                key={member.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleCardClick(member)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      firstName={member.first_name}
                      surname={member.surname}
                      avatarUrl={member.avatar_url}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {getName(member)}
                        </h3>
                        {member.isBirthday && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Cake className="h-4 w-4 text-pink-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Birthday today!</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.job_title || "No title"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.department || "No department"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Contact buttons */}
                  <div className="mt-3 flex items-center gap-2">
                    {member.email && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `mailto:${member.email}`;
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{member.email}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {member.phone && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${member.phone}`;
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{member.phone}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!member.email && !member.phone && (
                      <span className="text-xs text-muted-foreground">No contact info</span>
                    )}
                  </div>

                  {/* Status badges */}
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    {member.currentLeaveType === 'sick' ? (
                      <Badge variant="destructive" className="gap-1">
                        <ThermometerSnowflake className="h-3 w-3" />
                        Off Sick
                      </Badge>
                    ) : member.currentLeaveType === 'annual' ? (
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1">
                        <Palmtree className="h-3 w-3" />
                        On Holiday
                      </Badge>
                    ) : (
                      <StatusBadge status={member.status} size="sm" />
                    )}
                    {member.site && !member.currentLeaveType && (
                      <span className="text-xs text-muted-foreground">
                        {member.site}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Total count */}
        <p className="mt-4 text-sm text-muted-foreground text-center">
          Showing {filteredMembers.length} of {teamMembers.length} team members
        </p>
      </div>

      {/* Member detail dialog */}
      <TeamMemberDetailDialog
        member={selectedMember}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </AppLayout>
  );
}
