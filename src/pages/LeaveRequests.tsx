import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, eachDayOfInterval, getYear } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { LeaveBalanceCard } from "@/components/LeaveBalanceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/hive";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  CalendarDays,
  Thermometer,
  Paperclip,
  Upload,
  X,
  Flag,
  Ban,
  Building2,
  Undo2
} from "lucide-react";
import { SicknessPatternWarning } from "@/components/SicknessPatternWarning";
import { getLeaveYearDates } from '@sf/core';
import {
  calculateSicknessMetrics,
  calculateProjectedMetrics,
  detectPatterns,
  type SickRequest,
} from '@sf/core';
import { getUKBankHolidays, isBankHoliday, type BankHoliday } from '@sf/core';

import { requestDays, formatRequestDays, halfDayLabel, type LeaveDayPart } from '@sf/core';

// leave_requests.request_type: holiday | sickness | lieu | closure | other
type RequestType = "holiday" | "sickness" | "lieu" | "closure" | "other";

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  holiday: "Annual Leave",
  sickness: "Sick Day",
  lieu: "Time in Lieu",
  closure: "Company Closure",
  other: "Other",
};

// 'closure' is booked by the company, never requested by staff.
const REQUEST_TYPE_OPTIONS: { value: RequestType; label: string }[] = [
  { value: "holiday", label: "Annual Leave" },
  { value: "sickness", label: "Sick Day" },
  { value: "lieu", label: "Time in Lieu" },
  { value: "other", label: "Other" },
];

// Static Bradford-factor thresholds (the old settings table did not migrate)
const BRADFORD_THRESHOLDS = { low: 50, medium: 200, alert: 200 };
type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

interface LeaveRequest {
  id: string;
  person_id: string;
  request_type: RequestType;
  start_date: string;
  end_date: string;
  day_part?: LeaveDayPart | null;
  reason: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

const LeaveRequests = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("holiday");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [dayPart, setDayPart] = useState<LeaveDayPart>("full");
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);

  // A half day is a single date by definition — pin the end date to the start.
  const setDuration = (next: LeaveDayPart) => {
    setDayPart(next);
    if (next !== "full" && startDate) setEndDate(startDate);
  };

  const onStartDateChange = (v: string) => {
    setStartDate(v);
    if (dayPart !== "full") setEndDate(v);
  };


  // Fetch leave year settings
  const { data: leaveSettings } = useQuery({
    queryKey: ["leave-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || { leave_year_start_month: 1, leave_year_start_day: 1 };
    },
  });

  // Calculate leave year dates
  const leaveYearDates = useMemo(() => {
    if (!leaveSettings) return null;
    return getLeaveYearDates(leaveSettings.leave_year_start_month, leaveSettings.leave_year_start_day);
  }, [leaveSettings]);

  // Fetch sick requests for current leave year (for pattern detection)
  const { data: sickRequests = [], isLoading: sickRequestsLoading } = useQuery({
    queryKey: ["sick-requests-year", user?.id, leaveYearDates?.start],
    queryFn: async () => {
      if (!leaveYearDates) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date, status")
        .eq("person_id", user?.id)
        .eq("request_type", "sickness")
        .gte("start_date", format(leaveYearDates.start, "yyyy-MM-dd"))
        .lte("start_date", format(leaveYearDates.end, "yyyy-MM-dd"));
      if (error) throw error;
      return data as SickRequest[];
    },
    enabled: !!user && !!leaveYearDates,
  });

  // Calculate sickness metrics and warnings
  const sicknessAnalysis = useMemo(() => {
    const currentMetrics = calculateSicknessMetrics(sickRequests);
    
    if (!startDate || !endDate || requestType !== "sickness") {
      return {
        currentMetrics,
        projectedMetrics: currentMetrics,
        warnings: [],
      };
    }

    const projectedMetrics = calculateProjectedMetrics(sickRequests, startDate, endDate);
    const warnings = detectPatterns(currentMetrics, projectedMetrics, BRADFORD_THRESHOLDS);

    return { currentMetrics, projectedMetrics, warnings };
  }, [sickRequests, startDate, endDate, requestType]);

  // Fetch user's leave requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-leave-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("person_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user,
  });

  // Fetch leave balance
  const { data: leaveBalance } = useQuery({
    queryKey: ["my-leave-balance", user?.id],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("person_id", user?.id)
        .eq("year", currentYear)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Days used, in WORKING days (cancelled rows count zero — they are filtered out)
  const usedDays = requests
    .filter((r) => r.status === "approved" && r.request_type === requestType)
    .reduce((sum, r) => sum + requestDays(r), 0);

  // Time in lieu never touches the annual or sick balance — it is its own line.
  const lieuDays = requests
    .filter((r) => r.status === "approved" && r.request_type === "lieu")
    .reduce((sum, r) => sum + requestDays(r), 0);

  const remainingDays = requestType === "holiday"
    ? (leaveBalance?.annual_leave_allowance || 0) + (leaveBalance?.carry_over_days || 0) - usedDays
    : requestType === "sickness"
      ? (leaveBalance?.sick_day_allowance || 0) - usedDays
      : 0;

  // Check balance when dates change
  useEffect(() => {
    if (startDate && endDate && leaveBalance && (requestType === "holiday" || requestType === "sickness")) {
      const requested = requestDays({ start_date: startDate, end_date: endDate, day_part: dayPart });
      if (requested > remainingDays) {
        setBalanceWarning(
          `This request (${requested} working day${requested === 1 ? "" : "s"}) exceeds your remaining balance (${remainingDays} days). Your manager may still approve it as an exception.`
        );
      } else {
        setBalanceWarning(null);
      }
    } else {
      setBalanceWarning(null);
    }
  }, [startDate, endDate, dayPart, requestType, remainingDays, leaveBalance]);


  // Upload certificate to storage
  const uploadCertificate = async (): Promise<{ url: string; filename: string } | null> => {
    if (!certificateFile || !user) return null;
    
    setIsUploadingCertificate(true);
    try {
      const fileExt = certificateFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sick-certificates')
        .upload(fileName, certificateFile);

      if (uploadError) throw uploadError;

      // The bucket is private (medical data): store the storage path, and
      // readers mint a short-lived signed URL when they actually open it.
      return { url: fileName, filename: certificateFile.name };
    } catch (error) {
      console.error('Failed to upload certificate:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload certificate. You can add it later.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingCertificate(false);
    }
  };

  // Create leave request mutation
  const createRequest = useMutation({
    mutationFn: async () => {
      // Upload certificate if present
      let certificateData: { url: string; filename: string } | null = null;
      if (requestType === "sickness" && certificateFile) {
        certificateData = await uploadCertificate();
      }

      const { error } = await supabase
        .from("leave_requests")
        // Cast: the generated types lag the 2026-08-17 migration, so day_part
        // is not in the Insert type yet even though the column exists.
        .insert({
          person_id: user?.id,
          request_type: requestType,
          start_date: startDate,
          end_date: dayPart === "full" ? endDate : startDate,
          day_part: dayPart,
          reason: reason || null,
          certificate_url: certificateData?.url || null,
          certificate_filename: certificateData?.filename || null,
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      setIsDialogOpen(false);
      setRequestType("holiday");
      setStartDate("");
      setEndDate("");
      setReason("");
      setDayPart("full");
      setCertificateFile(null);
      toast({
        title: "Request Submitted",
        description: "Your leave request has been submitted for approval.",
      });
    },
    onError: (error) => {
      console.error("Failed to submit request:", error);
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel (never delete): own pending rows, or approved rows that start in
  // the future. Amend = cancel, then reopen the form prefilled.
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const canCancel = (r: LeaveRequest) =>
    r.status === "pending" || (r.status === "approved" && r.start_date > todayIso);

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "cancelled" } as any)
        .eq("id", id)
        .eq("person_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-usage"] });
      toast({ title: "Request cancelled", description: "It no longer counts towards your balance." });
    },
    onError: () => toast({ title: "Couldn't cancel", description: "Please try again.", variant: "destructive" }),
  });

  const amendRequest = (r: LeaveRequest) => {
    cancelRequest.mutate(r.id, {
      onSuccess: () => {
        setRequestType(r.request_type);
        setStartDate(r.start_date);
        setEndDate(r.end_date);
        setDayPart((r.day_part as LeaveDayPart) ?? "full");
        setReason(r.reason ?? "");
        setIsDialogOpen(true);
        toast({ title: "Amending request", description: "The old request was cancelled — submit the new one." });
      },
    });
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-on-site/10 text-status-on-site text-sm font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
            <Ban className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
    }
  };

  const getTypeIcon = (type: RequestType) => {
    if (type === "sickness") return <Thermometer className="w-5 h-5 text-status-sick" />;
    if (type === "lieu") return <Clock className="w-5 h-5 text-sky-500" />;
    if (type === "closure") return <Building2 className="w-5 h-5 text-violet-500" />;
    return <CalendarDays className="w-5 h-5 text-primary" />;
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || (dayPart === "full" && !endDate)) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    createRequest.mutate();
  };


  return (
    <AppLayout>
      <div className="p-6 lg:p-10 pb-24 lg:pb-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Leave Requests</h1>
            <p className="text-muted-foreground">
              Submit and track your leave and sick day requests
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
                <DialogDescription>
                  Fill in the details for your leave or sick day request.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Request Type</Label>
                  <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            {opt.value === "sickness" ? (
                              <Thermometer className="w-4 h-4" />
                            ) : (
                              <CalendarDays className="w-4 h-4" />
                            )}
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "full", label: "Full day(s)" },
                      { value: "am", label: "Half day, morning" },
                      { value: "pm", label: "Half day, afternoon" },
                    ] as { value: LeaveDayPart; label: string }[]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDuration(opt.value)}
                        className={`h-auto min-h-10 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          dayPart === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {dayPart !== "full" && (
                    <p className="text-xs text-muted-foreground">
                      Half days cover a single date — the end date matches the start date.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">{dayPart === "full" ? "Start Date" : "Date"}</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => onStartDateChange(e.target.value)}
                      required
                    />
                  </div>
                  {dayPart === "full" && (
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        required
                      />
                    </div>
                  )}
                </div>


                {startDate && endDate && (() => {
                  // Calculate bank holidays in the selected range
                  const start = parseISO(startDate);
                  const end = parseISO(endDate);
                  const bankHolidays = [...getUKBankHolidays(getYear(start)), ...getUKBankHolidays(getYear(end))];
                  const daysInRange = eachDayOfInterval({ start, end });
                  const holidaysInRange = daysInRange
                    .map(day => isBankHoliday(day, bankHolidays))
                    .filter((h): h is BankHoliday => h !== null);
                  
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Duration: {formatRequestDays({ start_date: startDate, end_date: endDate, day_part: dayPart })} • Remaining balance: {remainingDays} days
                      </p>
                      {holidaysInRange.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium mb-1">
                            <Flag className="w-4 h-4" />
                            Bank Holiday{holidaysInRange.length > 1 ? 's' : ''} included:
                          </div>
                          <ul className="text-sm text-red-600/80 dark:text-red-400/80 space-y-0.5 ml-6">
                            {holidaysInRange.map((h, i) => (
                              <li key={i}>
                                {h.name} ({format(h.date, "EEE, d MMM")})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {balanceWarning && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-600">
                          ⚠️ {balanceWarning}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sickness Pattern Warning - only show for sick day requests */}
                {requestType === "sickness" && startDate && endDate && (
                  <SicknessPatternWarning
                    currentMetrics={sicknessAnalysis.currentMetrics}
                    projectedMetrics={sicknessAnalysis.projectedMetrics}
                    warnings={sicknessAnalysis.warnings}
                    isLoading={sickRequestsLoading}
                  />
                )}

                {/* Certificate Upload - only for sick days */}
                {requestType === "sickness" && (
                  <div className="space-y-2">
                    <Label htmlFor="certificate">Fit Note / Certificate (Optional)</Label>
                    {certificateFile ? (
                      <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{certificateFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setCertificateFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          id="certificate"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast({
                                  title: "File too large",
                                  description: "Maximum file size is 5MB",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setCertificateFile(file);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => document.getElementById("certificate")?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          Upload Fit Note or Certificate
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, JPG, or PNG (max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Add any additional details..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRequest.isPending || isUploadingCertificate}>
                    {createRequest.isPending || isUploadingCertificate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isUploadingCertificate ? "Uploading..." : "Submitting..."}
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Leave Balance Tracker */}
        <div className="mb-8">
          <LeaveBalanceCard />
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="card-industrial p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Requests Yet</h3>
            <p className="text-muted-foreground mb-6">
              You haven't submitted any leave or sick day requests.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Submit Your First Request
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className={`card-industrial p-6 ${request.status === "cancelled" ? "opacity-60 grayscale" : ""}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      {getTypeIcon(request.request_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type}
                        {request.request_type === "closure" && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500">
                            Company closure
                          </span>
                        )}
                        {request.day_part && request.day_part !== "full" && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                            {halfDayLabel({ day_part: request.day_part })}
                          </span>
                        )}
                      </h3>
                      <p className="text-muted-foreground">
                        {format(new Date(request.start_date), "MMM d, yyyy")}
                        {request.start_date !== request.end_date && (
                          <> — {format(new Date(request.end_date), "MMM d, yyyy")}</>
                        )}
                        <span className="text-sm ml-2">({formatRequestDays(request)})</span>
                      </p>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.reason}
                        </p>
                      )}
                      {request.review_notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Manager note: {request.review_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {getStatusBadge(request.status)}
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), "MMM d, yyyy")}
                    </span>
                    {canCancel(request) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={cancelRequest.isPending}
                          onClick={() => amendRequest(request)}
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Amend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={cancelRequest.isPending}
                          onClick={() => cancelRequest.mutate(request.id)}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LeaveRequests;
