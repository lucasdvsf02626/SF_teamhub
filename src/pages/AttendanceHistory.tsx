import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/hive";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import { formatDuration } from "@/lib/supabase-helpers";

interface DailySummary {
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  totalWorkedMinutes: number;
  inProgress: boolean;
}

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["attendance-events", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("attendance_events")
        .select("*")
        .eq("person_id", user.id)
        .gte("recorded_at", `${startDate}T00:00:00`)
        .lte("recorded_at", `${endDate}T23:59:59`)
        .order("recorded_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Derive daily summaries from the in/out ledger (the old summary table
  // did not survive the Hive migration — this is now computed client-side)
  const summaries: DailySummary[] = useMemo(() => {
    if (!events || events.length === 0) return [];

    const byDay = new Map<string, { at: Date; direction: string }[]>();
    for (const ev of [...events].reverse()) {
      // reverse → chronological order
      const at = new Date(ev.recorded_at);
      const day = format(at, "yyyy-MM-dd");
      const list = byDay.get(day) ?? [];
      list.push({ at, direction: ev.direction });
      byDay.set(day, list);
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const result: DailySummary[] = [];
    for (const [day, list] of byDay) {
      let firstIn: Date | null = null;
      let lastOut: Date | null = null;
      let total = 0;
      let openIn: Date | null = null;

      for (const ev of list) {
        if (ev.direction === "in") {
          if (!firstIn) firstIn = ev.at;
          if (!openIn) openIn = ev.at;
        } else {
          lastOut = ev.at;
          if (openIn) {
            total += (ev.at.getTime() - openIn.getTime()) / 60000;
            openIn = null;
          }
        }
      }

      const inProgress = !!openIn && day === todayStr;
      // A still-open session today counts up to now
      if (inProgress && openIn) {
        total += (Date.now() - openIn.getTime()) / 60000;
      }

      result.push({
        date: day,
        firstIn: firstIn ? firstIn.toISOString() : null,
        lastOut: lastOut ? lastOut.toISOString() : null,
        totalWorkedMinutes: Math.round(total),
        inProgress,
      });
    }

    return result.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [events]);

  const goToPreviousMonth = () => {
    setSelectedMonth((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    const next = new Date(selectedMonth);
    next.setMonth(next.getMonth() + 1);
    if (next <= new Date()) {
      setSelectedMonth(next);
    }
  };

  const getDirectionBadge = (direction: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      in: { label: "Sign In", variant: "default" },
      out: { label: "Sign Out", variant: "secondary" },
    };
    const config = variants[direction] || { label: direction, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalMinutes = summaries.reduce((acc, s) => acc + s.totalWorkedMinutes, 0);
  const daysWorked = summaries.length;

  return (
    <AppLayout>
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance History</h1>
          <p className="text-muted-foreground">View your past attendance records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium">
            {format(selectedMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            disabled={selectedMonth >= startOfMonth(new Date())}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysWorked}</div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalMinutes)}</div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Day</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {daysWorked > 0 ? formatDuration(Math.round(totalMinutes / daysWorked)) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Summaries */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : summaries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>First Sign In</TableHead>
                  <TableHead>Last Sign Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <TableRow key={summary.date}>
                    <TableCell className="font-medium">
                      {format(new Date(summary.date), "EEE, MMM d")}
                    </TableCell>
                    <TableCell>
                      {summary.firstIn
                        ? format(new Date(summary.firstIn), "h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {summary.lastOut
                        ? format(new Date(summary.lastOut), "h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {summary.totalWorkedMinutes
                        ? formatDuration(summary.totalWorkedMinutes)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {summary.inProgress ? (
                        <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-500/30">On Site</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Completed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No attendance records for this month
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detailed Events */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : events && events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {format(new Date(event.recorded_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>{getDirectionBadge(event.direction)}</TableCell>
                    <TableCell className="capitalize">{event.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No events for this month
            </p>
          )}
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}
