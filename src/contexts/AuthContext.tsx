import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setSessionExpiredHandler, clearSessionExpiredHandler } from "@/lib/supabase-functions";
import { toast } from "@/hooks/use-toast";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { logSession } from "@/lib/session-logger";
import type { Profile } from "@/types";

interface SessionTimeoutState {
  showWarning: boolean;
  secondsRemaining: number;
  extendSession: () => Promise<boolean>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  profileLoading: boolean;
  sessionTimeout: SessionTimeoutState;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null } | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  handleSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Background refresh interval - check every 5 minutes
const BACKGROUND_CHECK_INTERVAL_MS = 5 * 60 * 1000;
// Trigger proactive refresh when session has less than 15 minutes remaining
const PROACTIVE_REFRESH_THRESHOLD_MS = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Start as true to prevent race condition - will be set false after initial load
  const [profileLoading, setProfileLoading] = useState(true);
  const backgroundRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setProfile(null);
        return;
      }

      setProfile((data as Profile) ?? null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Proactive background session refresh
  const performBackgroundRefresh = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession?.expires_at) {
      logSession('SESSION_CHECK', { source: 'background', result: 'no_session' });
      return;
    }
    
    const timeUntilExpiry = currentSession.expires_at * 1000 - Date.now();
    
    // Only refresh if within threshold
    if (timeUntilExpiry <= PROACTIVE_REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
      logSession('PROACTIVE_REFRESH', { 
        source: 'background_interval',
        timeUntilExpirySeconds: Math.floor(timeUntilExpiry / 1000)
      }, currentSession.expires_at);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        const errMsg = error.message?.toLowerCase() || "";
        if (errMsg.includes("rate limit") || errMsg.includes("429")) {
          logSession('RATE_LIMITED', { source: 'background' }, currentSession.expires_at);
        } else {
          logSession('REFRESH_FAILED', { error: error.message, source: 'background' }, currentSession.expires_at);
        }
        return;
      }
      
      if (data.session) {
        logSession('REFRESH_SUCCESS', { 
          source: 'background',
          newExpiresAt: data.session.expires_at 
        }, data.session.expires_at);
      }
    }
  }, []);

  // Handle session expiry - sign out and redirect
  const handleSessionExpired = useCallback(() => {
    // Only handle once - check if already signed out
    if (!user && !session) return;
    
    logSession('EXPIRED', { source: 'handler' });
    
    // Save current path for redirect after login
    const currentPath = window.location.pathname;
    if (
      currentPath &&
      currentPath !== "/auth" &&
      currentPath !== "/" &&
      currentPath !== "/force-password-change" &&
      currentPath !== "/complete-profile"
    ) {
      localStorage.setItem("sf_redirect_after_login", currentPath);
    }
    
    // Clear state immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Sign out from Supabase (fire and forget)
    supabase.auth.signOut().catch(console.error);
    
    // Show toast notification
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please sign in again.",
      variant: "destructive",
    });
    
    // Redirect to auth page
    window.location.href = '/auth';
  }, [user, session]);

  // Session timeout warning hook
  const { showWarning, secondsRemaining, extendSession, dismissWarning } = useSessionTimeout(session);

  // Register the session expired handler with the supabase-functions utility
  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    return () => clearSessionExpiredHandler();
  }, [handleSessionExpired]);

  // Set up background refresh interval
  useEffect(() => {
    if (session) {
      logSession('INIT', { source: 'AuthProvider', hasSession: true }, session.expires_at);
      
      // Start background refresh interval
      backgroundRefreshRef.current = setInterval(performBackgroundRefresh, BACKGROUND_CHECK_INTERVAL_MS);
      
      // Perform initial check
      performBackgroundRefresh();
    } else {
      logSession('INIT', { source: 'AuthProvider', hasSession: false });
    }
    
    return () => {
      if (backgroundRefreshRef.current) {
        clearInterval(backgroundRefreshRef.current);
        backgroundRefreshRef.current = null;
      }
    };
  }, [session?.access_token, performBackgroundRefresh]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logSession('AUTH_STATE_CHANGE', { event }, session?.expires_at);
        
        setSession(session);
        setUser(session?.user ?? null);

        // Clear potentially stale profile immediately, then refetch
        setProfile(null);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          // Set profileLoading BEFORE setTimeout to prevent race condition
          setProfileLoading(true);
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          // No user, no profile to load
          setProfileLoading(false);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      logSession('SESSION_CHECK', { source: 'initial_load' }, session?.expires_at);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Clear potentially stale profile immediately, then refetch
        setProfile(null);
        setProfileLoading(true);
        fetchProfile(session.user.id);
      } else {
        // No user, no profile to load
        setProfileLoading(false);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null, data: data ? { user: data.user } : null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const PRODUCTION_URL = 'https://teamhub.supplementfactoryuk.com';
    const redirectUrl = `${PRODUCTION_URL}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      profileLoading,
      sessionTimeout: {
        showWarning,
        secondsRemaining,
        extendSession,
      },
      signIn,
      signUp,
      signOut,
      refreshProfile,
      handleSessionExpired,
    }}>
      {children}
      <SessionTimeoutWarning
        open={showWarning}
        secondsRemaining={secondsRemaining}
        onExtend={extendSession}
        onSignOut={() => {
          dismissWarning();
          signOut();
          window.location.href = '/auth';
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
