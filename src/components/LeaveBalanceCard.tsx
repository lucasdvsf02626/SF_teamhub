import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/hive";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Palmtree, Thermometer, Loader2, Clock } from "lucide-react";
import { getLeaveYearDates, formatLeaveYearPeriod } from '@sf/core';
import { getServiceInfo, DEFAULT_SERVICE_TIERS } from '@sf/core';
import { getServiceTierDisplay } from '@sf/core';
import { format } from "date-fns";
import { requestDays } from '@sf/core';

interface LeaveBalance {
  id: string;
  person_id: string;
  year: number;
  annual_leave_allowance: number;
  sick_day_allowance: number;
  carry_over_days: number;
}

interface LeaveSettings {
  id: string;
  leave_year_start_month: number;
  leave_year_start_day: number;
}

export function LeaveBalanceCard() {
  const { user, profile } = useAuth();

  // Fetch leave year settings
  const { data: settings } = useQuery({
    queryKey: ["leave-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LeaveSettings | null;
    },
  });

  const startMonth = settings?.leave_year_start_month || 1;
  const startDay = settings?.leave_year_start_day || 1;
  const { start: yearStart, end: yearEnd, year: leaveYear } = getLeaveYearDates(startMonth, startDay);

  // Calculate service info (static tier ladder — config table retired)
  const serviceInfo = getServiceInfo(
    profile?.start_date || null,
    DEFAULT_SERVICE_TIERS,
    yearStart
  );

  // Fetch leave balance (for carry over days only now)
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["my-leave-balance", user?.id, leaveYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("person_id", user?.id)
        .eq("year", leaveYear)
        .maybeSingle();

      if (error) throw error;
      return data as LeaveBalance | null;
    },
    enabled: !!user && !!settings,
  });

  // Fetch used leave from approved requests within leave year
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["my-leave-usage", user?.id, yearStart.toISOString(), yearEnd.toISOString()],
    queryFn: async () => {
      const yearStartStr = format(yearStart, "yyyy-MM-dd");
      const yearEndStr = format(yearEnd, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("leave_requests")
        .select("request_type, start_date, end_date, day_part")
        .eq("person_id", user?.id)
        .eq("status", "approved")
        .gte("start_date", yearStartStr)
        .lte("start_date", yearEndStr);

      if (error) throw error;

      // Calculate total days used — always in WORKING days via requestDays.
      let leave_used = 0;
      let sick_used = 0;
      let lieu_used = 0;

      data?.forEach((request: any) => {
        const days = requestDays(request);

        // Only 'holiday' decrements the annual leave balance. Time in lieu is
        // its own line and never touches annual or sick. Closure rows are
        // excluded from sickness maths entirely.
        if (request.request_type === "holiday") {
          leave_used += days;
        } else if (request.request_type === "sickness") {
          sick_used += days;
        } else if (request.request_type === "lieu") {
          lieu_used += days;
        }
      });

      return { leave_used, sick_used, lieu_used };
    },
    enabled: !!user && !!settings,
  });


  const isLoading = balanceLoading || usageLoading;

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Use service tier allowance, fall back to database balance, then default
  const baseAllowance = serviceInfo.accruedLeave || balance?.annual_leave_allowance || 22;
  const carryOver = balance?.carry_over_days || 0;
  const annualAllowance = baseAllowance + carryOver;
  const leaveUsed = usage?.leave_used || 0;
  const sickUsed = usage?.sick_used || 0;
  const lieuUsed = usage?.lieu_used || 0;
  const leaveRemaining = Math.max(0, annualAllowance - leaveUsed);

  const leavePercentUsed = (leaveUsed / annualAllowance) * 100;

  const yearPeriod = formatLeaveYearPeriod(startMonth, startDay);

  return (
    <div className="space-y-4">
      {/* Service Tier Banner */}
      {serviceInfo.tier && profile?.start_date && (
        <Card className="border-2" style={{ borderColor: getServiceTierDisplay(serviceInfo.yearsOfService).color }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold"
                  style={{
                    backgroundColor: getServiceTierDisplay(serviceInfo.yearsOfService).color,
                    color: getServiceTierDisplay(serviceInfo.yearsOfService).color === '#FFFEF5' || getServiceTierDisplay(serviceInfo.yearsOfService).color === '#FFFFFF' ? '#1a1a1a' : '#ffffff',
                    animation: getServiceTierDisplay(serviceInfo.yearsOfService).hasRainbow ? 'rainbow-spin 3s linear infinite' : undefined,
                  }}
                >
                  <span>Year {serviceInfo.yearsOfService + 1}</span>
                  <span className="text-xs opacity-80">• {getServiceTierDisplay(serviceInfo.yearsOfService).tierName}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Started {format(new Date(profile.start_date), "d MMM yyyy")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Base Holiday Allowance</p>
                <p className="text-xl font-bold text-foreground">
                  {serviceInfo.accruedLeave} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Annual Leave Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Palmtree className="w-4 h-4 text-primary" />
              </div>
              Annual Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-foreground">{leaveRemaining}</span>
              <span className="text-sm text-muted-foreground">
                of {annualAllowance} days remaining
              </span>
            </div>
            <Progress 
              value={100 - leavePercentUsed} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {leaveUsed} used
                {carryOver > 0 && ` • ${carryOver} carried over`}
              </span>
              <span>{yearPeriod}</span>
            </div>
          </CardContent>
        </Card>

        {/* Sick Days Recorded Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Thermometer className="w-4 h-4 text-orange-500" />
              </div>
              Sick Days Recorded
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-foreground">{sickUsed}</span>
              <span className="text-sm text-muted-foreground">
                days this year
              </span>
            </div>
            <div className="h-2" /> {/* Spacer to match annual leave card height */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Recorded absences</span>
              <span>{yearPeriod}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time in lieu — its own line, never deducted from annual or sick. */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <span className="text-base font-medium text-foreground">
              Time in lieu taken: {lieuUsed} day{lieuUsed === 1 ? "" : "s"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{yearPeriod}</span>
        </CardContent>
      </Card>
    </div>
  );
}
