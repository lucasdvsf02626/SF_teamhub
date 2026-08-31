import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getServiceInfo, DEFAULT_SERVICE_TIERS } from '@sf/core';
import { 
  User, 
  Loader2, 
  Save,
  Building2,
  Calendar,
  Mail,
  MapPin,
  Award,
  ChevronRight,
  Camera,
  Trash2,
  Gift,
  TrendingUp
} from "lucide-react";
import { ServiceTierBadge } from "@/components/ServiceTierBadge";
import { ServiceRingAvatar, getInitials } from "@/components/ServiceRingAvatar";

const ProfileSettings = () => {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    display_name: "",
    phone: "",
    bio: "",
  });

  // Static tier ladder (the old tier-config table retired in the Hive migration)
  const serviceTiers = DEFAULT_SERVICE_TIERS;

  // Calculate service tier for profile
  const serviceInfo = profile?.start_date && serviceTiers 
    ? getServiceInfo(profile.start_date, serviceTiers) 
    : null;

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image under 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${profile.id}/${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast({
        title: "Photo updated",
        description: "Your profile photo has been changed.",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;

    setIsUploadingAvatar(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast({
        title: "Photo removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error) {
      console.error("Remove avatar error:", error);
      toast({
        title: "Error",
        description: "Could not remove photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile) throw new Error("No profile");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: data.display_name,
          phone: data.phone,
          bio: data.bio,
        })
        .eq("id", profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 pb-24 lg:pb-10 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your personal information
          </p>
        </div>

        {/* Appearance shortcut → /app/settings */}
        <Link
          to="/app/settings"
          className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Appearance</p>
              <p className="text-xs text-muted-foreground">Theme, colors, and display</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar with upload overlay */}
              <div className="relative group">
                <ServiceRingAvatar
                  src={profile.avatar_url}
                  fallback={getInitials(profile.first_name || profile.display_name, profile.surname)}
                  yearsOfService={serviceInfo?.yearsOfService || 0}
                  size="lg"
                />
                
                {/* Upload overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-foreground">
                  {profile.display_name || `${profile.first_name} ${profile.surname}`}
                </h2>
                <p className="text-muted-foreground">{profile.job_title || "Team Member"}</p>
                {profile.department && (
                  <p className="text-sm text-muted-foreground">{profile.department}</p>
                )}
                
                {/* Photo actions */}
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Change photo
                  </Button>
                  {profile.avatar_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG or WebP. Max 2MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Profile Form */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, display_name: e.target.value }))
                  }
                  placeholder="How you want to be called"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+44 7xxx xxx xxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="A short description about yourself..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Read-only Employment Details */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Employment Details
            </CardTitle>
            <CardDescription>Contact your admin to update these details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{profile.email || "Not set"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium text-foreground">{profile.company || "Not set"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium text-foreground">
                    {profile.start_date 
                      ? format(new Date(profile.start_date), "MMM d, yyyy") 
                      : "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Work Location</p>
                  <p className="font-medium text-foreground">
                    {profile.work_city || profile.work_country_code || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Years of Service */}
        {serviceInfo && serviceInfo.tier && (
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Years of Service
              </CardTitle>
              <CardDescription>Your service recognition and holiday accrual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Tier Badge */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                <ServiceTierBadge 
                  tier={serviceInfo.tier} 
                  yearsOfService={serviceInfo.yearsOfService} 
                  size="lg" 
                />
                <div>
                  <p className="font-semibold text-foreground">{serviceInfo.tier.tier_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {serviceInfo.yearsOfService === 0 
                      ? "First year of service" 
                      : `${serviceInfo.yearsOfService} ${serviceInfo.yearsOfService === 1 ? 'year' : 'years'} of service`}
                  </p>
                </div>
              </div>

              {/* Holiday Accrual Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  Holiday Accrual Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-2xl font-bold text-primary">{serviceInfo.tier.base_annual_leave}</p>
                    <p className="text-xs text-muted-foreground">Days per year</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-2xl font-bold text-foreground">
                      {serviceInfo.tier.base_annual_leave - 22}
                    </p>
                    <p className="text-xs text-muted-foreground">Bonus days earned</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Base allowance of 22 days + {serviceInfo.tier.base_annual_leave - 22} bonus days for your years of service
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </AppLayout>
  );
};

export default ProfileSettings;
