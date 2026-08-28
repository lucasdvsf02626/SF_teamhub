import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { JOB_TITLES, DEPARTMENTS } from '@sf/core';

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = jobTitle && department;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error("Please select your job title and department");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          job_title: jobTitle,
          department: department,
          display_name: displayName || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile?.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile completed successfully");
      navigate("/app", { replace: true });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">SF</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">Team Hub</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Almost there</CardTitle>
            <CardDescription className="mt-2">
              Just a couple of details so everything works smoothly for you.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title <span className="text-destructive">*</span></Label>
              <Select value={jobTitle} onValueChange={setJobTitle}>
                <SelectTrigger id="jobTitle">
                  <SelectValue placeholder="Select your job title" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {JOB_TITLES.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you'd like to be called"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your contact number"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
