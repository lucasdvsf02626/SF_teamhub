import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signOutLocal } from "@/lib/auth-session";
import { logSession } from "@/lib/session-logger";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Check, X, Loader2, Shield, Lock, LogOut } from "lucide-react";
import sfGroupLogo from "@/assets/sf-group-logo.png";

export default function ForcePasswordChange() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshProfile, user, profile, isLoading: authLoading, profileLoading } = useAuth();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use AuthContext's profile instead of making our own query
  // This prevents race conditions and ensures consistency
  useEffect(() => {
    // Still loading auth or profile state - wait
    if (authLoading || profileLoading) return;
    
    // No user - redirect to auth
    if (!user) {
      logSession('SESSION_CHECK', { result: 'no_user', action: 'redirect_to_auth' });
      navigate("/auth");
      return;
    }
    
    // Profile loaded and password change not required - redirect to app
    if (profile && profile.must_change_password === false) {
      logSession('SESSION_CHECK', { 
        result: 'password_already_changed',
        action: 'redirect_to_app'
      });
      navigate("/app");
      return;
    }
    
    logSession('INIT', { page: 'ForcePasswordChange', userId: user.id });
  }, [authLoading, profileLoading, user, profile, navigate]);

  const passwordRequirements = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "One number", test: (p: string) => /[0-9]/.test(p) },
    { label: "One special character (!@#$%^&* etc)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.test(password));
  const passwordsMatch = password === confirmPassword && password.length > 0;

  // Show loading while auth is initializing or profile is still loading
  if (authLoading || profileLoading || (!profile && user)) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-foreground">Verifying session...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify session is still valid before attempting update
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await signOutLocal();
      toast({
        title: "Session expired",
        description: "Please sign in again to change your password.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    if (!allRequirementsMet) {
      toast({
        title: "Weak password",
        description: "Please ensure your password meets all requirements.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Clear must_change_password flag with retry logic
      if (user) {
        let retryCount = 0;
        const maxRetries = 3;
        let updateSuccess = false;
        
        while (retryCount < maxRetries && !updateSuccess) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ must_change_password: false })
            .eq("id", user.id);
          
          if (updateError) {
            retryCount++;
            console.error(`Failed to clear must_change_password (attempt ${retryCount}/${maxRetries}):`, updateError);
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            }
          } else {
            updateSuccess = true;
          }
        }
        
        // Refresh the profile to update the must_change_password flag in context
        await refreshProfile();
      }
      
      toast({
        title: "You're all set",
        description: "Your password has been changed successfully. Your workday just got simpler.",
      });

      // Check for remembered page
      const rememberedPath = localStorage.getItem('sf_redirect_after_login');
      if (rememberedPath) {
        localStorage.removeItem('sf_redirect_after_login');
        navigate(rememberedPath);
      } else {
        navigate("/app");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <img 
              src={sfGroupLogo} 
              alt="SF Group" 
              className="h-[72px] w-auto"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Welcome</CardTitle>
            </div>
            <CardDescription>
              Let's get you set up. This will only take a moment.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Password Requirements:</p>
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {req.test(password) ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={req.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    {req.label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm pt-2 border-t border-border mt-2">
                {passwordsMatch ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={passwordsMatch ? "text-green-600" : "text-muted-foreground"}>
                  Passwords match
                </span>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isLoading || !allRequirementsMet || !passwordsMatch}
            >
              {isLoading ? "Updating..." : "Set New Password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={async () => {
                await signOutLocal();
                navigate("/auth");
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Restart Login
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-2">
              Your data is protected and encrypted at all times.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
