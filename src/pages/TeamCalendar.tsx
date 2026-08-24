import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/hive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Palmtree, Thermometer, Calendar, Users, Flag } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
  getYear
} from "date-fns";
import { getUKBankHolidays, isBankHoliday, type BankHoliday } from "@/lib/uk-bank-holidays";

interface LeaveRequest {
  id: string;
  person_id: string;
  request_type: "holiday" | "sickness" | "other";
  start_date: string;
  end_date: string;
  status: string;
  profiles: {
    display_name: string | null;
    first_name: string | null;
    surname: string | null;
    avatar_url: string | null;
  };
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function TeamCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<"all" | "holiday" | "sickness">("all");

  // Fetch approved leave requests
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ["team-leave-calendar", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          id,
          person_id,
          request_type,
          start_date,
          end_date,
          status,
          profiles!leave_requests_person_id_fkey (
            display_name,
            first_name,
            surname,
            avatar_url
          )
        `)
        .eq("status", "approved")
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"))
        .gte("end_date", format(monthStart, "yyyy-MM-dd"));

      if (error) throw error;
      return data as unknown as LeaveRequest[];
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get bank holidays for the current year and adjacent years
  const bankHolidays = useMemo(() => {
    const year = getYear(currentMonth);
    return [...getUKBankHolidays(year - 1), ...getUKBankHolidays(year), ...getUKBankHolidays(year + 1)];
  }, [currentMonth]);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getLeaveForDay = (day: Date) => {
    if (!leaveRequests) return [];
    
    return leaveRequests.filter((leave) => {
      if (filterType !== "all" && leave.request_type !== filterType) return false;
      
      const startDate = parseISO(leave.start_date);
      const endDate = parseISO(leave.end_date);
      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const getEmployeeName = (leave: LeaveRequest) => {
    const profile = leave.profiles;
    return profile.display_name || 
      `${profile.first_name || ""} ${profile.surname || ""}`.trim() || 
      "Unknown";
  };

  // Get who's out today
  const todayLeave = getLeaveForDay(new Date());

  // Generate color for each user (consistent per person_id)
  const getUserColor = (userId: string) => {
    const colors = [
      "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
      "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
      "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
      "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
      "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
      "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30",
      "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30",
    ];
    const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getUserBgColor = (userId: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-rose-500",
    ];
    const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-7 h-7 text-primary" />
              Team Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              View approved leave and sick days across the team
            </p>
          </div>

          {/* Filter */}
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="holiday">
                <span className="flex items-center gap-2">
                  <Palmtree className="w-4 h-4" /> Annual Leave
                </span>
              </SelectItem>
              <SelectItem value="sickness">
                <span className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4" /> Sick Days
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Who's Out Today Card */}
        {todayLeave.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Who's Out Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {todayLeave.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={leave.profiles.avatar_url || undefined} />
                      <AvatarFallback className={`${getUserBgColor(leave.person_id)} text-white text-xs`}>
                        {getInitials(getEmployeeName(leave))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{getEmployeeName(leave)}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {leave.request_type !== "sickness" ? (
                          <>
                            <Palmtree className="w-3 h-3" /> Annual Leave
                          </>
                        ) : (
                          <>
                            <Thermometer className="w-3 h-3" /> Sick Day
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-3xl lg:text-4xl font-bold tracking-tight">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="secondary" onClick={() => setCurrentMonth(new Date())}>
                  Back to today
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                Loading calendar...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {/* Week day headers */}
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day) => {
                  const dayLeave = getLeaveForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const bankHoliday = isBankHoliday(day, bankHolidays);

                  return (
                    <Popover key={day.toISOString()}>
                      <PopoverTrigger asChild>
                        <div
                          className={`bg-card min-h-[100px] p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                            !isCurrentMonth ? "opacity-40" : ""
                          } ${bankHoliday ? "bg-red-500/5" : ""}`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <div
                              className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                                isTodayDate
                                  ? "bg-primary text-primary-foreground"
                                  : bankHoliday
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-foreground"
                              }`}
                            >
                              {format(day, "d")}
                            </div>
                            {bankHoliday && (
                              <Flag className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                          {bankHoliday && (
                            <div className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 mb-1 truncate">
                              {bankHoliday.name}
                            </div>
                          )}
                          <div className="space-y-1">
                            {dayLeave.slice(0, bankHoliday ? 2 : 3).map((leave) => (
                              <div
                                key={leave.id}
                                className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 ${getUserColor(
                                  leave.person_id
                                )}`}
                              >
                                {leave.request_type !== "sickness" ? (
                                  <Palmtree className="w-3 h-3 flex-shrink-0" />
                                ) : (
                                  <Thermometer className="w-3 h-3 flex-shrink-0" />
                                )}
                                <span className="truncate hidden sm:inline">{getEmployeeName(leave)}</span>
                                <span className="sm:hidden font-medium">{getInitials(getEmployeeName(leave))}</span>
                              </div>
                            ))}
                            {dayLeave.length > (bankHoliday ? 2 : 3) && (
                              <div className="text-xs text-muted-foreground pl-1">
                                +{dayLeave.length - (bankHoliday ? 2 : 3)} more
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverTrigger>
                      {(dayLeave.length > 0 || bankHoliday) && (
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">
                              {format(day, "EEEE, MMMM d")}
                            </h4>
                            {bankHoliday && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <Flag className="w-4 h-4 text-red-500" />
                                <span className="font-medium text-sm text-red-600 dark:text-red-400">
                                  {bankHoliday.name}
                                </span>
                              </div>
                            )}
                            {dayLeave.length > 0 && (
                              <div className="space-y-2">
                                {dayLeave.map((leave) => (
                                  <div
                                    key={leave.id}
                                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                                  >
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={leave.profiles.avatar_url || undefined} />
                                      <AvatarFallback className={`${getUserBgColor(leave.person_id)} text-white text-sm`}>
                                        {getInitials(getEmployeeName(leave))}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm">{getEmployeeName(leave)}</p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        {leave.request_type !== "sickness" ? (
                                          <>
                                            <Palmtree className="w-3 h-3" /> Annual Leave
                                          </>
                                        ) : (
                                          <>
                                            <Thermometer className="w-3 h-3" /> Sick Day
                                          </>
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {format(parseISO(leave.start_date), "MMM d")} - {format(parseISO(leave.end_date), "MMM d")}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Palmtree className="w-4 h-4 text-green-600" />
            <span>Annual Leave</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Thermometer className="w-4 h-4 text-orange-600" />
            <span>Sick Day</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flag className="w-4 h-4 text-red-500" />
            <span>Bank Holiday</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
            <span className="text-xs italic">Tap any day to see details</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}