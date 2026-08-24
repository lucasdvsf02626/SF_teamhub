import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { ManagerPatternAlert } from "@/components/ManagerPatternAlert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/hive";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  CalendarDays,
  Thermometer,
  MessageSquare,
  Inbox,
  Paperclip
} from "lucide-react";
import { getLeaveYearDates } from "@/lib/leave-year-helpers";
import { calculateSicknessMetrics, detectPatterns, type SickRequest } from "@/lib/sickness-pattern-helpers";
import { requestDays, formatRequestDays, halfDayLabel, type LeaveDayPart } from "@/lib/leaveDays";

// leave_requests.request_type: holiday | sickness | lieu | closure | other
type RequestType = "holiday" | "sickness" | "lieu" | "closure" | "other";

const TYPE_LABEL: Record<string, string> = {
  holiday: "Annual Leave",
  sickness: "Sick Day",
  lieu: "Time in Lieu",
  closure: "Company Closure",
  other: "Other Leave",
};

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
  certificate_url: string | null;
  certificate_filename: string | null;
  profiles: {
    first_name: string | null;
    surname: string | null;
    display_name: string | null;
    department: string | null;
    avatar_url: string | null;
    reports_to?: string | null;
  };
}

const ManagerApprovals = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  // L4+ see everyone; anyone below only sees their own direct reports.
  const isAdmin = (profile?.permission_level ?? 1) >= 4;

  // Book-leave-for-a-direct form state
  const [bookOpen, setBookOpen] = useState(false);
  const [bookPersonId, setBookPersonId] = useState("");
  const [bookType, setBookType] = useState<RequestType>("holiday");
  const [bookStart, setBookStart] = useState("");
  const [bookEnd, setBookEnd] = useState("");
  const [bookDayPart, setBookDayPart] = useState<LeaveDayPart>("full");
  const [bookReason, setBookReason] = useState("");

  // Fetch all leave requests with user profiles
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["all-leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          profiles!leave_requests_person_id_fkey (
            first_name,
            surname,
            display_name,
            department,
            avatar_url,
            email,
            reports_to
          )
        `)
        .order("created_at", { ascending: false });
      
      
      if (error) throw error;
      const rows = data as (LeaveRequest & { profiles: LeaveRequest["profiles"] & { email: string | null } })[];

      // certificate_url holds a private-bucket storage path (legacy rows may
      // hold a full URL) — resolve paths to short-lived signed URLs here so
      // the render below can stay a plain link.
      return Promise.all(rows.map(async (r) => {
        if (!r.certificate_url || r.certificate_url.startsWith('http')) return r;
        const { data: signed } = await supabase.storage
          .from('sick-certificates')
          .createSignedUrl(r.certificate_url, 3600);
        return { ...r, certificate_url: signed?.signedUrl ?? null };
      }));
    },
  });

  // Below L4, a viewer only sees requests whose person reports to them.
  const visibleRequests = useMemo(
    () => (isAdmin ? requests : requests.filter((r: any) => r.profiles?.reports_to === user?.id)),
    [requests, isAdmin, user?.id]
  );

  // Directs picker: their own reports, or all live staff for L4+.
  const { data: bookableStaff = [] } = useQuery({
    queryKey: ["bookable-staff", user?.id, isAdmin],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, first_name, surname, display_name, reports_to")
        .order("first_name");
      if (!isAdmin) q = q.eq("reports_to", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const bookLeave = useMutation({
    mutationFn: async () => {
      // Always via the SECURITY DEFINER RPC — it re-checks manager rights
      // server-side. Never a direct insert from the client.
      const { error } = await (supabase as any).rpc("book_leave_for_direct", {
        person_id: bookPersonId,
        request_type: bookType,
        start_date: bookStart,
        end_date: bookDayPart === "full" ? bookEnd : bookStart,
        day_part: bookDayPart,
        reason: bookReason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
      setBookOpen(false);
      setBookPersonId(""); setBookStart(""); setBookEnd(""); setBookReason("");
      setBookDayPart("full"); setBookType("holiday");
      toast({ title: "Leave booked", description: "The request has been created for your team member." });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't book leave", description: e?.message, variant: "destructive" }),
  });



  // Fetch all sick requests for pattern analysis
  const { data: allSickRequests = [] } = useQuery({
    queryKey: ["all-sick-requests-for-patterns"],
    queryFn: async () => {
      const leaveYearDates = getLeaveYearDates(1, 1);
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, person_id, start_date, end_date, status")
        .eq("request_type", "sickness")
        .gte("start_date", format(leaveYearDates.start, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
  });

  // Memoize pattern data for all sick requests to prevent recalculation on each render
  const patternDataByUser = useMemo(() => {
    const dataMap = new Map<string, { metrics: ReturnType<typeof calculateSicknessMetrics>; warnings: ReturnType<typeof detectPatterns> }>();
    
    const thresholds = BRADFORD_THRESHOLDS;
    
    // Get unique user IDs from sick requests
    const uniqueUserIds = new Set(allSickRequests.map(r => r.person_id));
    
    uniqueUserIds.forEach(userId => {
      const userSickRequests = allSickRequests
        .filter(r => r.person_id === userId)
        .map(r => ({ id: r.id, start_date: r.start_date, end_date: r.end_date, status: r.status })) as SickRequest[];
      
      const metrics = calculateSicknessMetrics(userSickRequests);
      const warnings = detectPatterns(metrics, metrics, thresholds);
      
      dataMap.set(userId, { metrics, warnings });
    });
    
    return dataMap;
  }, [allSickRequests]);

  // Update request mutation
  const updateRequest = useMutation({
    mutationFn: async ({ id, status, request }: { 
      id: string; 
      status: RequestStatus; 
      request: LeaveRequest & { profiles: LeaveRequest["profiles"] & { email: string | null } };
    }) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
      setSelectedRequest(null);
      setReviewNotes("");
      setActionType(null);
      toast({
        title: status === "approved" ? "Request Approved" : "Request Rejected",
        description: `The leave request has been ${status}.`,
      });
    },
    onError: (error) => {
      console.error("Failed to update request:", error);
      toast({
        title: "Error",
        description: "Failed to update the request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const pendingRequests = visibleRequests.filter((r) => r.status === "pending");
  const processedRequests = visibleRequests.filter((r) => r.status !== "pending");

  const getTypeIcon = (type: RequestType) => {
    return type === "sickness" ? (
      <Thermometer className="w-5 h-5 text-status-sick" />
    ) : (
      <CalendarDays className="w-5 h-5 text-primary" />
    );
  };


  const handleAction = (request: LeaveRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;
    updateRequest.mutate({
      id: selectedRequest.id,
      status: actionType === "approve" ? "approved" : "rejected",
      request: selectedRequest as any,
    });
  };

  const RequestCard = ({ request, showActions = true }: { request: LeaveRequest; showActions?: boolean }) => (
    <div className={`card-industrial p-6 ${request.status === "cancelled" ? "opacity-60 grayscale" : ""}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex items-start gap-4 flex-1">
          <UserAvatar
            firstName={request.profiles.first_name}
            surname={request.profiles.surname}
            avatarUrl={request.profiles.avatar_url}
            size="lg"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">
                {request.profiles.display_name || `${request.profiles.first_name} ${request.profiles.surname}`}
              </h3>
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                {getTypeIcon(request.request_type)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {request.profiles.department || "No department"}
            </p>
            <div className="flex items-center gap-2 text-foreground flex-wrap">
              <span className="font-medium">
                {TYPE_LABEL[request.request_type] ?? request.request_type}
              </span>
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
              <span className="text-muted-foreground">•</span>
              <span>
                {format(new Date(request.start_date), "MMM d")}
                {request.start_date !== request.end_date && (
                  <> — {format(new Date(request.end_date), "MMM d")}</>
                )}
              </span>
              <span className="text-muted-foreground">
                ({formatRequestDays(request)})
              </span>
            </div>

            {request.reason && (
              <p className="text-sm text-muted-foreground mt-2">
                "{request.reason}"
              </p>
            )}
            {/* Certificate indicator */}
            {request.certificate_url && (
              <div className="flex items-center gap-1 mt-2 text-sm text-primary">
                <Paperclip className="w-3.5 h-3.5" />
                <a href={request.certificate_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {request.certificate_filename || "View Certificate"}
                </a>
              </div>
            )}
            {/* Pattern Alert for sick requests */}
            {request.request_type === "sickness" && showActions && request.status === "pending" && (() => {
              const patternData = patternDataByUser.get(request.person_id);
              if (patternData && (patternData.metrics.totalDays > 0 || patternData.warnings.length > 0)) {
                return (
                  <ManagerPatternAlert
                    userId={request.person_id}
                    employeeName={request.profiles.display_name || `${request.profiles.first_name} ${request.profiles.surname}`}
                    currentMetrics={patternData.metrics}
                    warnings={patternData.warnings}
                    certificateUrl={request.certificate_url}
                    certificateFilename={request.certificate_filename}
                  />
                );
              }
              return null;
            })()}
          </div>
        </div>

        {showActions && request.status === "pending" && (
          <div className="flex items-center gap-2 lg:flex-col">
            <Button
              size="sm"
              className="gap-1.5 bg-status-on-site hover:bg-status-on-site/90"
              onClick={() => handleAction(request, "approve")}
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleAction(request, "reject")}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </div>
        )}

        {!showActions && (
          <div className="flex items-center">
            {request.status === "approved" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-on-site/10 text-status-on-site text-sm font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approved
              </span>
            ) : request.status === "cancelled" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                <XCircle className="w-3.5 h-3.5" />
                Cancelled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 pb-24 lg:pb-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Leave Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve leave and sick day requests
          </p>
        </div>

        {/* Book leave on behalf of a direct report (RPC only) */}
        <div className="mb-6">
          <Button className="gap-2" onClick={() => setBookOpen(true)}>
            <CalendarDays className="w-4 h-4" />
            Book leave for a team member
          </Button>
        </div>

        {/* Pending Count */}
        {pendingRequests.length > 0 && (
          <div className="card-industrial p-4 mb-6 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Awaiting your review
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="card-industrial p-12 text-center">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Requests</h3>
            <p className="text-muted-foreground">
              There are no leave requests to review at this time.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="processed" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Processed ({processedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="card-industrial p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-status-on-site mx-auto mb-3" />
                  <p className="text-muted-foreground">All caught up! No pending requests.</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <RequestCard key={request.id} request={request} showActions />
                ))
              )}
            </TabsContent>

            <TabsContent value="processed" className="space-y-4">
              {processedRequests.length === 0 ? (
                <div className="card-industrial p-8 text-center">
                  <p className="text-muted-foreground">No processed requests yet.</p>
                </div>
              ) : (
                processedRequests.map((request) => (
                  <RequestCard key={request.id} request={request} showActions={false} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
          setReviewNotes("");
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve Request" : "Reject Request"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? "This will approve the leave request and notify the employee."
                  : "This will reject the leave request. Please provide a reason if applicable."}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="font-medium text-foreground">
                    {selectedRequest.profiles.display_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {TYPE_LABEL[selectedRequest.request_type] ?? selectedRequest.request_type} •{" "}
                    {format(new Date(selectedRequest.start_date), "MMM d")}
                    {selectedRequest.start_date !== selectedRequest.end_date && (
                      <> — {format(new Date(selectedRequest.end_date), "MMM d")}</>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Add a note (optional)
                  </label>
                  <Textarea
                    placeholder="Add any comments for the employee..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(null);
                      setActionType(null);
                      setReviewNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmAction}
                    disabled={updateRequest.isPending}
                    className={actionType === "approve" 
                      ? "bg-status-on-site hover:bg-status-on-site/90" 
                      : "bg-destructive hover:bg-destructive/90"
                    }
                  >
                    {updateRequest.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : actionType === "approve" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Book leave for a direct report — submitted via the RPC only */}
        <Dialog open={bookOpen} onOpenChange={setBookOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Book leave for a team member</DialogTitle>
              <DialogDescription>
                {isAdmin
                  ? "Choose any member of staff and book their leave."
                  : "Choose one of your direct reports and book their leave."}
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!bookPersonId || !bookStart || (bookDayPart === "full" && !bookEnd)) {
                  toast({ title: "Missing details", description: "Pick a person and the dates.", variant: "destructive" });
                  return;
                }
                bookLeave.mutate();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Team member</label>
                <select
                  value={bookPersonId}
                  onChange={(e) => setBookPersonId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select…</option>
                  {bookableStaff.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name || `${p.first_name ?? ""} ${p.surname ?? ""}`.trim()}
                    </option>
                  ))}
                </select>
                {bookableStaff.length === 0 && (
                  <p className="text-xs text-muted-foreground">No one reports to you yet.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  value={bookType}
                  onChange={(e) => setBookType(e.target.value as RequestType)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="holiday">Annual Leave</option>
                  <option value="sickness">Sick Day</option>
                  <option value="lieu">Time in Lieu</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "full", label: "Full day(s)" },
                    { value: "am", label: "Half day, AM" },
                    { value: "pm", label: "Half day, PM" },
                  ] as { value: LeaveDayPart; label: string }[]).map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => { setBookDayPart(d.value); if (d.value !== "full" && bookStart) setBookEnd(bookStart); }}
                      className={`h-10 rounded-md border text-xs font-medium ${
                        bookDayPart === d.value ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {bookDayPart !== "full" && (
                  <p className="text-xs text-muted-foreground">Half days cover a single date.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{bookDayPart === "full" ? "Start date" : "Date"}</label>
                  <input
                    type="date"
                    value={bookStart}
                    onChange={(e) => { setBookStart(e.target.value); if (bookDayPart !== "full") setBookEnd(e.target.value); }}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  />
                </div>
                {bookDayPart === "full" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End date</label>
                    <input
                      type="date"
                      value={bookEnd}
                      min={bookStart}
                      onChange={(e) => setBookEnd(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                )}
              </div>

              {bookStart && (bookEnd || bookDayPart !== "full") && (
                <p className="text-xs text-muted-foreground">
                  Duration: {formatRequestDays({ start_date: bookStart, end_date: bookDayPart === "full" ? bookEnd : bookStart, day_part: bookDayPart })}
                </p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea value={bookReason} onChange={(e) => setBookReason(e.target.value)} rows={3} />
              </div>

              <Button type="submit" className="w-full" disabled={bookLeave.isPending}>
                {bookLeave.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Book leave
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

    </AppLayout>
  );
};

export default ManagerApprovals;
