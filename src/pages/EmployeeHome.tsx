import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, differenceInDays } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { MyQrCard } from "@/components/MyQrCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceRingAvatar, getInitials } from "@/components/ServiceRingAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useClock } from "@/contexts/ClockContext";
import { useHaptic } from "@/hooks/useHaptic";
import { getTodayStatus, formatDuration } from "@/lib/supabase-helpers";
import { getServiceInfo, DEFAULT_SERVICE_TIERS } from "@/lib/service-tier-helpers";
import { supabase } from "@/integrations/supabase/hive";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  LogIn,
  LogOut,
  Clock,
  MapPin,
  Calendar,
  ChevronRight,
  Loader2,
  AlertTriangle,
  HeartPulse,
  Palmtree
} from "lucide-react";
import type { PresenceStatus, AttendanceDirection } from "@/types";
import { FirstWeekNudge } from "@/components/nudges/FirstWeekNudge";

const EmployeeHome = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { attemptClockIn, clockOutNow, locating: geoLoading } = useClock();
  const { triggerHaptic } = useHaptic();

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signInTime, setSignInTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);

  // Calculate service tier for profile (static ladder — config table retired)
  const serviceInfo = profile?.start_date
    ? getServiceInfo(profile.start_date, DEFAULT_SERVICE_TIERS)
    : null;

  // Fetch pending RTW forms (approved sickness ended within 7 days, no RTW form yet)
  const { data: pendingRTW } = useQuery({
    queryKey: ["pending-rtw", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");

      // Find approved sickness leave that ended recently
      const { data: sickLeave, error: leaveError } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date")
        .eq("person_id", user.id)
        .eq("request_type", "sickness")
        .eq("status", "approved")
        .lte("end_date", today)
        .gte("end_date", sevenDaysAgo)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (leaveError || !sickLeave) return null;

      // Check if RTW form already exists
      const { data: existingForm } = await supabase
        .from("return_to_work_forms")
        .select("id")
        .eq("leave_request_id", sickLeave.id)
        .maybeSingle();

      if (existingForm) return null;

      return sickLeave;
    },
    enabled: !!user,
  });

  // Fetch upcoming approved leave
  const { data: upcomingLeave } = useQuery({
    queryKey: ["upcoming-leave", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("person_id", user.id)
        .eq("status", "approved")
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    // Check if onboarding is needed (first-time users)
    if (user && !authLoading && !localStorage.getItem("sf_onboarding_complete")) {
      localStorage.setItem("sf_onboarding_complete", "true"); // Only show once
      navigate("/onboarding");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadTodayStatus();
    }
  }, [user]);

  const loadTodayStatus = async () => {
    if (!user) return;

    try {
      const status = await getTodayStatus(user.id);
      setIsSignedIn(status.isSignedIn);

      if (status.isSignedIn && status.events.length > 0) {
        // Events are ordered newest-first; the latest 'in' opened this session
        const signInEvent = status.events.find(e => e.direction === "in");
        if (signInEvent) {
          setSignInTime(new Date(signInEvent.recorded_at));
        }
      }
    } catch (error) {
      console.error("Failed to load status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendanceEvent = async (direction: AttendanceDirection) => {
    if (!user) return;

    setIsSubmitting(true);
    setLocationWarning(null);

    try {
      // Both directions go through ClockContext, which owns the geofence:
      // clock-in is refused off-site (unless geolocation is unavailable,
      // recorded as metadata.location = 'unavailable'), and while clocked in
      // a foreground watcher auto-clocks-out anyone who leaves the site.
      if (direction === "in") {
        const result = await attemptClockIn();
        if (!result.ok) {
          setLocationWarning(result.message);
          triggerHaptic('action');
          toast({
            title: "Not signed in",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        setIsSignedIn(true);
        setSignInTime(new Date());
        triggerHaptic('success');
        toast({
          title: "Signed In",
          description: `Have a good shift, ${profile?.first_name || ""}!`,
        });
      } else {
        await clockOutNow();
        setIsSignedIn(false);
        setSignInTime(null);
        triggerHaptic('action');
        toast({
          title: "Signed Out",
          description: `See you next time, ${profile?.first_name || ""}!`,
        });
      }
    } catch (error) {
      console.error("Failed to record event:", error);
      toast({
        title: "Error",
        description: "Failed to record your attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWorkedDuration = () => {
    if (!signInTime) return 0;
    return Math.floor((Date.now() - signInTime.getTime()) / 60000);
  };

  const currentStatus: PresenceStatus = isSignedIn ? "on_site" : "off";

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 max-w-3xl mx-auto pb-24 lg:pb-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <ServiceRingAvatar
            src={profile?.avatar_url}
            fallback={getInitials(profile?.first_name, profile?.surname)}
            yearsOfService={serviceInfo?.yearsOfService || 0}
            size="xl"
          />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {profile?.display_name || profile?.email || "Welcome"}
            </h1>
            <p className="text-muted-foreground">{profile?.job_title || "Team Member"}</p>
            <p className="text-sm text-muted-foreground">
              {profile?.department || ""} {profile?.company ? `• ${profile.company}` : ""}
            </p>
          </div>
        </div>

        {/* Location Warning */}
        {locationWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-600">{locationWarning}</p>
          </div>
        )}

        {/* First-week nudge */}
        <FirstWeekNudge createdAt={user?.created_at} />

        {/* Status Card */}
        <div className="card-industrial p-6 lg:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Current Status</h2>
            <StatusBadge status={currentStatus} size="lg" />
          </div>

          {isSignedIn && signInTime && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Signed in at
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {signInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <MapPin className="w-4 h-4" />
                  Duration
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {formatDuration(getWorkedDuration())}
                </p>
              </div>
            </div>
          )}

          {/* Main Sign In/Out Button */}
          <Button
            variant={isSignedIn ? "signOut" : "signIn"}
            size="xl"
            className="w-full gap-3 mb-4"
            onClick={() => handleAttendanceEvent(isSignedIn ? "out" : "in")}
            disabled={isSubmitting || geoLoading}
          >
            {isSubmitting || geoLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                {geoLoading ? "Getting location..." : "Processing..."}
              </>
            ) : isSignedIn ? (
              <>
                <LogOut className="w-6 h-6" />
                Sign Out
              </>
            ) : (
              <>
                <LogIn className="w-6 h-6" />
                Sign In
              </>
            )}
          </Button>
        </div>

        {/* The rotating identity QR — same card as /dashboard, near the top
            because it is the first thing needed at the start of a shift. */}
        <div className="mb-6">
          <MyQrCard name={profile?.display_name ?? null} />
        </div>

        {/* Return to Work Prompt */}
        {pendingRTW && (
          <div className="card-industrial p-4 mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Welcome Back!</p>
                <p className="text-sm text-muted-foreground">
                  Please complete your return to work form
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/app/return-to-work?requestId=${pendingRTW.id}`)}
              >
                Complete
              </Button>
            </div>
          </div>
        )}

        {/* Upcoming Holidays */}
        {upcomingLeave && upcomingLeave.length > 0 && (
          <div className="card-industrial p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Palmtree className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Upcoming Time Off</p>
                <p className="text-sm text-muted-foreground">Your approved leave</p>
              </div>
            </div>

            <div className="space-y-3">
              {upcomingLeave.map((leave) => {
                const startDate = new Date(leave.start_date);
                const endDate = new Date(leave.end_date);
                const days = differenceInDays(endDate, startDate) + 1;

                return (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">
                        {leave.request_type === "sickness" ? "🤒 Sick Day" : "🏖️ Annual Leave"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(startDate, "d MMM")}
                        {leave.start_date !== leave.end_date && ` - ${format(endDate, "d MMM yyyy")}`}
                        {leave.start_date === leave.end_date && ` ${format(startDate, "yyyy")}`}
                        <span className="ml-2 text-muted-foreground/70">({days} {days === 1 ? 'day' : 'days'})</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600 bg-green-500/10">
                      Approved
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </h3>

          <button
            onClick={() => navigate("/app/history")}
            className="card-industrial w-full p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">View My Attendance</p>
              <p className="text-sm text-muted-foreground">See your sign in history</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default EmployeeHome;
