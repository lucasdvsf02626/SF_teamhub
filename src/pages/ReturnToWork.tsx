import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/hive";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  HeartPulse,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

const ReturnToWork = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const leaveRequestId = searchParams.get("requestId");

  const [returnDate, setReturnDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [feelingWell, setFeelingWell] = useState(true);
  const [ongoingConcerns, setOngoingConcerns] = useState("");
  const [adjustmentsNeeded, setAdjustmentsNeeded] = useState("");
  const [medicalClearance, setMedicalClearance] = useState(false);
  const [notes, setNotes] = useState("");

  // Fetch the leave request if ID is provided
  const { data: leaveRequest, isLoading: requestLoading } = useQuery({
    queryKey: ["leave-request", leaveRequestId],
    queryFn: async () => {
      if (!leaveRequestId) return null;
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("id", leaveRequestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leaveRequestId,
  });

  // Check if RTW form already exists
  const { data: existingForm } = useQuery({
    queryKey: ["rtw-form", leaveRequestId],
    queryFn: async () => {
      if (!leaveRequestId) return null;
      const { data, error } = await supabase
        .from("return_to_work_forms")
        .select("*")
        .eq("leave_request_id", leaveRequestId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!leaveRequestId,
  });

  // Submit form mutation
  const submitForm = useMutation({
    mutationFn: async () => {
      if (!user || !leaveRequestId) throw new Error("Missing required data");

      const { error } = await supabase.from("return_to_work_forms").insert({
        leave_request_id: leaveRequestId,
        person_id: user.id,
        return_date: returnDate,
        feeling_well: feelingWell,
        ongoing_concerns: ongoingConcerns || null,
        adjustments_needed: adjustmentsNeeded || null,
        medical_clearance: medicalClearance,
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-rtw"] });
      toast({
        title: "Form Submitted",
        description: "Your return to work form has been submitted successfully.",
      });
      navigate("/app");
    },
    onError: (error) => {
      console.error("Failed to submit form:", error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm.mutate();
  };

  if (requestLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (existingForm) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-10 max-w-2xl mx-auto">
          <Card className="card-industrial">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-status-on-site mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                Form Already Submitted
              </h2>
              <p className="text-muted-foreground mb-6">
                You've already completed the return to work form for this absence.
              </p>
              <Button onClick={() => navigate("/app")}>
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!leaveRequest) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-10 max-w-2xl mx-auto">
          <Card className="card-industrial">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                No Absence Found
              </h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find the sick leave absence to create a return to work form for.
              </p>
              <Button onClick={() => navigate("/app")}>
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 max-w-2xl mx-auto pb-24 lg:pb-10">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 mb-4"
            onClick={() => navigate("/app")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Return to Work</h1>
              <p className="text-muted-foreground">Welcome back, {profile?.first_name}!</p>
            </div>
          </div>
        </div>

        {/* Absence Summary */}
        <Card className="card-industrial mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Absence Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-medium text-foreground">
                  {format(new Date(leaveRequest.start_date), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">To</p>
                <p className="font-medium text-foreground">
                  {format(new Date(leaveRequest.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            {leaveRequest.reason && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Reason given</p>
                <p className="text-foreground">{leaveRequest.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle>Return to Work Form</CardTitle>
            <CardDescription>
              Please complete this form to confirm your return and share any relevant information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Return Date */}
              <div className="space-y-2">
                <Label htmlFor="return-date">Return Date</Label>
                <Input
                  id="return-date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                />
              </div>

              {/* Feeling Well */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <Label htmlFor="feeling-well" className="text-base">
                    Are you feeling well enough to return to work?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Be honest - your wellbeing matters to us
                  </p>
                </div>
                <Switch
                  id="feeling-well"
                  checked={feelingWell}
                  onCheckedChange={setFeelingWell}
                />
              </div>

              {/* Ongoing Concerns */}
              <div className="space-y-2">
                <Label htmlFor="concerns">Any ongoing health concerns?</Label>
                <Textarea
                  id="concerns"
                  placeholder="Share any health concerns we should be aware of..."
                  value={ongoingConcerns}
                  onChange={(e) => setOngoingConcerns(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Adjustments Needed */}
              <div className="space-y-2">
                <Label htmlFor="adjustments">Do you need any workplace adjustments?</Label>
                <Textarea
                  id="adjustments"
                  placeholder="e.g., modified duties, flexible hours, ergonomic equipment..."
                  value={adjustmentsNeeded}
                  onChange={(e) => setAdjustmentsNeeded(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Medical Clearance */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <Label htmlFor="medical-clearance" className="text-base">
                    Medical clearance received?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Required for absences over 7 days
                  </p>
                </div>
                <Switch
                  id="medical-clearance"
                  checked={medicalClearance}
                  onCheckedChange={setMedicalClearance}
                />
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any other information you'd like to share..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/app")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitForm.isPending}>
                  {submitForm.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Form"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ReturnToWork;
