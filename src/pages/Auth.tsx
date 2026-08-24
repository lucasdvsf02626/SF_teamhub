import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ensureFreshSession, signOutLocal } from "@/lib/auth-session";
import sfGroupLogo from "@/assets/sf-logo-white.png";
import { Mail, Lock, ArrowLeft, User, MonitorSmartphone, Eye, EyeOff, QrCode, Monitor } from "lucide-react";
import { useDesktopMode } from "@/hooks/useDesktopMode";

import { logClientError, logToLocalStorage } from "@/lib/client-error-logger";

type AuthMode = "signIn" | "signUp" | "resetRequest" | "setNewPassword" | "forcePasswordChange";

// Helper to log errors to localStorage AND Supabase for remote debugging
const logAuthError = (context: string, error: unknown, extra?: Record<string, unknown>) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[Auth] ${context}:`, error, extra);
  
  // Store in localStorage as backup
  logToLocalStorage('auth', {
    context,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...extra,
  });
  
  // Send to Supabase
  logClientError({
    errorMessage: `[Auth] ${context}: ${errorMessage}`,
    errorStack,
    context: 'auth',
    extraData: extra,
  });
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);

  // Desktop mode toggle (must be declared before any conditional returns)
  const { isDesktopMode, toggleDesktopMode } = useDesktopMode();

  // New cosmetic UI state (does not affect auth behaviour)
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [language, setLanguage] = useState("EN");

  // Log component mount
  useEffect(() => {
    console.log('[Auth] Component mounted', {
      path: location.pathname,
      hash: location.hash ? location.hash.substring(0, 100) : '(none)',
      search: location.search,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Pre-fill email from URL query parameter
  useEffect(() => {
    try {
      console.log('[Auth] Effect: Pre-filling email');
      const searchParams = new URLSearchParams(location.search);
      const emailParam = searchParams.get('email');
      if (emailParam) {
        console.log('[Auth] Email param found:', emailParam);
        setEmail(emailParam);
      }
    } catch (error) {
      logAuthError('Email pre-fill effect failed', error, { search: location.search });
    }
  }, [location.search]);

  // Handle URL hash for errors and recovery mode
  useEffect(() => {
    try {
      const hash = location.hash;
      console.log('[Auth] Effect: Processing URL hash', { hasHash: !!hash });
      
      if (!hash) return;

      // Parse hash parameters
      const hashParams = new URLSearchParams(hash.substring(1));
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      const type = hashParams.get('type');

      console.log('[Auth] Hash params:', { error, errorDescription, type });

      // Handle errors (like expired links)
      if (error) {
        console.log('[Auth] URL contains error, showing toast');
        toast({
          title: "Link Expired",
          description: errorDescription || "Your link has expired. Please request a new one using 'Forgot your password?'",
          variant: "destructive",
        });
        // Clear the hash from URL
        window.history.replaceState(null, '', location.pathname);
        return;
      }

      // Handle recovery mode (password reset link clicked)
      if (type === 'recovery' || hash.includes('type=recovery')) {
        console.log('[Auth] Recovery mode detected, processing...');
        setIsProcessingInvite(true);
        
        // Wait for Supabase to process the recovery token
        const processRecovery = async () => {
          try {
            console.log('[Auth] Getting session for recovery...');
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              console.log('[Auth] Recovery session error:', error);
              toast({
                title: "Link Expired",
                description: "Your password reset link has expired. Please request a new one.",
                variant: "destructive",
              });
              window.history.replaceState(null, '', location.pathname);
            } else if (data.session) {
              console.log('[Auth] Recovery session valid, showing password form');
              // User is authenticated via recovery token - show password form
              setMode("setNewPassword");
              window.history.replaceState(null, '', location.pathname);
            } else {
              console.log('[Auth] Recovery: no error but no session either');
            }
          } catch (err) {
            logAuthError('Recovery processing failed', err);
          } finally {
            setIsProcessingInvite(false);
          }
        };
        
        processRecovery();
        return;
      }

      // Handle invite callback
      if (hash.includes('access_token') || hash.includes('type=invite')) {
        console.log('[Auth] Invite/access token detected, processing...');
        setIsProcessingInvite(true);
        
        const handleInviteToken = async () => {
          try {
            console.log('[Auth] Getting session for invite...');
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              console.log('[Auth] Invite session error:', error);
              logAuthError('Invite token session error', error);
              toast({
                title: "Invitation Error",
                description: "There was a problem processing your invitation. Please try again or contact support.",
                variant: "destructive",
              });
            } else if (data.session) {
              console.log('[Auth] Invite session valid, navigating to app');
              toast({
                title: "Welcome!",
                description: "Your account has been activated. Your workday just got simpler.",
              });
              window.history.replaceState(null, '', location.pathname);
              navigate("/dashboard");
            } else {
              console.log('[Auth] Invite: no error but no session either');
            }
          } catch (err) {
            logAuthError('Invite token handling failed', err);
          } finally {
            setIsProcessingInvite(false);
          }
        };

        handleInviteToken();
      }
    } catch (error) {
      logAuthError('Hash processing effect failed', error, { hash: location.hash });
    }
  }, [location.hash, navigate]);

  // Redirect if already logged in (but not if setting new password or forcing password change)
  useEffect(() => {
    try {
      console.log('[Auth] Effect: Checking redirect', { 
        hasUser: !!user, 
        authLoading, 
        isProcessingInvite, 
        mode 
      });
      
      if (user && !authLoading && !isProcessingInvite && mode !== "setNewPassword" && mode !== "forcePasswordChange") {
        // Check for remembered path
        const rememberedPath = localStorage.getItem('sf_redirect_after_login');
        console.log('[Auth] User logged in, redirecting...', { rememberedPath });
        
        if (rememberedPath) {
          localStorage.removeItem('sf_redirect_after_login');
          if (rememberedPath === '/force-password-change' || rememberedPath === '/complete-profile') {
            navigate("/dashboard");
          } else {
            navigate(rememberedPath);
          }
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      logAuthError('Redirect effect failed', error);
    }
  }, [user, authLoading, isProcessingInvite, mode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === "signUp") {
        const { error } = await signUp(email, password, {
          first_name: firstName,
          surname: surname,
          display_name: `${firstName} ${surname}`.trim(),
        });
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account created!",
            description: "You can now sign in with your credentials.",
          });
          setMode("signIn");
        }
      } else {
        const { error, data } = await signIn(email, password);
        
        if (error) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else if (data?.user) {
          // Check if user must change password
          const { data: profile } = await supabase
            .from("profiles")
            .select("must_change_password")
            .eq("id", data.user.id)
            .single();

          if (profile?.must_change_password) {
            // Session is already valid from signIn, navigate directly
            navigate("/force-password-change");
          } else {
            toast({
              title: "Welcome back!",
              description: "You have successfully signed in.",
            });
            // Check for remembered path
            const rememberedPath = localStorage.getItem('sf_redirect_after_login');
            if (rememberedPath) {
              localStorage.removeItem('sf_redirect_after_login');
              navigate(rememberedPath);
            } else {
              navigate("/dashboard");
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Native Supabase recovery flow (the old Team Hub reset-token edge
      // functions did not move to the Hive). The recovery link lands back on
      // /auth with a #type=recovery hash, handled above.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Could not send reset email.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your inbox",
          description: "If that email is registered, a reset link has been sent.",
        });
        setMode("signIn");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validatePasswordStrength = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return "Password must contain at least one special character (!@#$%^&* etc).";
    }
    return null;
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      toast({
        title: "Weak password",
        description: strengthError,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // The user is logged in — either via a Supabase recovery session
      // (password reset link) or an existing session (forced change).
      const session = await ensureFreshSession();
      if (!session) {
        await signOutLocal();
        toast({
          title: "Session expired",
          description: "Please sign in again, then try setting your password.",
          variant: "destructive",
        });
        setIsLoading(false);
        setMode("signIn");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        // If session is invalid server-side, clear local state and restart login
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("session") && msg.includes("not")) {
          await signOutLocal();
          toast({
            title: "Session error",
            description: "Please sign in again and retry the password change.",
            variant: "destructive",
          });
          setMode("signIn");
          return;
        }

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Clear must_change_password flag if it was a forced change
        if (mode === "forcePasswordChange") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Retry logic for clearing the flag
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
            
            if (!updateSuccess) {
              console.error("Failed to clear must_change_password after all retries");
            }
          }
        }
        
        toast({
          title: "Password updated!",
          description: "You can now continue to the app.",
        });
        setPassword("");
        setConfirmPassword("");
        navigate("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isProcessingInvite) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-foreground">
          {isProcessingInvite ? "Processing your link..." : "Loading..."}
        </div>
      </div>
    );
  }

  const renderForm = () => {
    // Set New Password Form (also used for forced password change)
    if (mode === "setNewPassword" || mode === "forcePasswordChange") {
      return (
        <form onSubmit={handleSetNewPassword} className="space-y-5">
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
                minLength={6}
                required
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
                minLength={6}
                required
              />
            </div>
          </div>

          {mode === "forcePasswordChange" && (
            <p className="text-sm text-muted-foreground text-center mb-4">
              For security, please create a new password to continue.
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Updating..." : "Set New Password"}
          </Button>
        </form>
      );
    }

    // Password Reset Request Form
    if (mode === "resetRequest") {
      return (
        <form onSubmit={handlePasswordResetRequest} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode("signIn")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </form>
      );
    }

    // Sign In / Sign Up Form
    return (
      <>
        {/* No OAuth buttons: the Hive's auth is email/password only — offering
            providers it doesn't have configured is the "UI offers what the
            backend refuses" fault this estate keeps re-learning. */}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signUp" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  type="text"
                  placeholder="Smith"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signIn" && (
                <button
                  type="button"
                  onClick={() => setMode("resetRequest")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "signIn" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={trustDevice}
                onCheckedChange={(v) => setTrustDevice(v === true)}
              />
              Trust this device for 30 days
            </label>
          )}

          <Button
            type="submit"
            className="w-full font-mono tracking-wider uppercase"
            size="lg"
            disabled={isLoading}
          >
            {isLoading
              ? (mode === "signUp" ? "Creating account..." : "Signing in...")
              : (mode === "signUp" ? "Create Account" : "Sign In")}
          </Button>
        </form>

        {mode === "signIn" && (
          <>
            {/* No self-service sign-up: every account is a Hive profile,
                provisioned by an admin. */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                No account? Ask your manager — accounts are set up in the Hive.
              </p>
            </div>
          </>
        )}

        {mode === "signUp" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode("signIn")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}
      </>
    );
  };

  const getTitle = () => {
    switch (mode) {
      case "signUp": return "Let's get you set up";
      case "resetRequest": return "Reset your password";
      case "setNewPassword": return "Set your new password";
      case "forcePasswordChange": return "Let's get you set up";
      default: return "Welcome back";
    }
  };

  // Compact centered layout for non sign-in modes (reset / new password)
  if (mode !== "signIn" && mode !== "signUp") {
    return (
      <div className="min-h-screen bg-[hsl(var(--sf-bg))] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="rounded-[14px] border border-[hsl(var(--sf-border))] bg-[hsl(var(--sf-card))] p-8">
            <div className="flex items-center gap-3 mb-8">
              <img src={sfGroupLogo} alt="SF Group" className="h-[60px] w-auto" />
              <div className="border-l border-border pl-3">
                <h1 className="font-bold text-xl text-white">Team Hub</h1>
                <p className="text-sm text-muted-foreground">{getTitle()}</p>
              </div>
            </div>
            {renderForm()}
          </div>
        </div>
      </div>
    );
  }

  // Split 60/40 layout — sign in / sign up
  return (
    <div className="min-h-screen bg-[hsl(var(--sf-bg))] text-white">
      <div className="grid lg:grid-cols-[3fr_2fr] min-h-screen">
        {/* LEFT — brand panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 border-r border-[hsl(var(--sf-border))] bg-gradient-to-br from-[hsl(var(--sf-bg))] via-[hsl(220_18%_8%)] to-[hsl(var(--sf-bg))] overflow-hidden">
          {/* ambient amber glow */}
          <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <img src={sfGroupLogo} alt="SF Group" className="h-[56px] w-auto" />
            <div className="border-l border-[hsl(var(--sf-border))] pl-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">Powered by Panacea</p>
              <h2 className="font-bold text-lg text-white">Team Hub</h2>
            </div>
          </div>

          <div className="relative max-w-md">
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.05]">
              Welcome <span className="text-primary">back</span>.
            </h1>
            <p className="mt-5 text-base text-muted-foreground leading-relaxed">
              Sign in to clock shifts, book time off, and see what your team is up to today — all in one place.
            </p>

            {/* Static card — never fake live data on a real login page */}
            <div className="mt-10 rounded-[14px] border border-[hsl(var(--sf-border))] bg-[hsl(var(--sf-card))] p-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Supplement Factory · Axiom</p>
                <span className="text-[10px] text-muted-foreground font-mono">SF</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Clock in and out from your phone</p>
                <p className="text-xs text-muted-foreground">Book holiday, report sickness, see your team's calendar — one account, the same one as the Hive.</p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--sf-green))] animate-pulse" />
              All systems operational
            </span>
            <span>·</span>
            <span>SOC2 · GDPR</span>
          </div>
        </div>

        {/* RIGHT — sign in card */}
        <div className="relative flex flex-col">
          {/* Mobile back link */}
          <div className="lg:hidden p-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-[420px]">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <img src={sfGroupLogo} alt="SF Group" className="h-[48px] w-auto" />
                <div className="border-l border-[hsl(var(--sf-border))] pl-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">Powered by Panacea</p>
                  <h2 className="font-bold text-base text-white">Team Hub</h2>
                </div>
              </div>

              <div className="mb-7">
                <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {mode === "signUp"
                    ? "Create your SF Team Hub account."
                    : "Sign in to continue to SF Team Hub."}
                </p>
              </div>

              {renderForm()}
            </div>
          </div>

          {/* Footer row */}
          <div className="px-6 lg:px-12 py-6 border-t border-[hsl(var(--sf-border))] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              By signing in you agree to our{" "}
              <Link to="/terms" className="text-foreground hover:text-primary underline-offset-4 hover:underline">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-foreground hover:text-primary underline-offset-4 hover:underline">Privacy</Link>.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleDesktopMode}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
                {isDesktopMode ? "Mobile view" : "Desktop view"}
              </button>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 w-[80px] text-xs bg-transparent border-[hsl(var(--sf-border))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">EN</SelectItem>
                  <SelectItem value="FR">FR</SelectItem>
                  <SelectItem value="ES">ES</SelectItem>
                  <SelectItem value="DE">DE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Auth;
