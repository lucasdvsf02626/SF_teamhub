import { useState, useEffect, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSession } from "@/lib/session-logger";

// Warning shown at 5 minutes before expiry - gives users comfortable time
const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000;
// Proactive background refresh at 15 minutes before expiry
const PROACTIVE_REFRESH_MS = 15 * 60 * 1000;

interface UseSessionTimeoutResult {
  showWarning: boolean;
  secondsRemaining: number;
  extendSession: () => Promise<boolean>;
  dismissWarning: () => void;
}

export function useSessionTimeout(session: Session | null | undefined): UseSessionTimeoutResult {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes default
  const [warningDismissed, setWarningDismissed] = useState(false);
  const lastRefreshAttempt = useRef<number>(0);
  const proactiveRefreshDone = useRef<boolean>(false);
  
  // Safe access to session properties
  const sessionExpiresAt = session?.expires_at ?? null;
  const sessionAccessToken = session?.access_token ?? null;

  const extendSession = useCallback(async (): Promise<boolean> => {
    logSession('REFRESH_ATTEMPT', { source: 'user_action' }, sessionExpiresAt);
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        logSession('REFRESH_FAILED', { error: error.message }, sessionExpiresAt);
        return false;
      }
      if (data.session) {
        logSession('EXTENDED', { newExpiresAt: data.session.expires_at }, data.session.expires_at);
        setShowWarning(false);
        setWarningDismissed(false);
        proactiveRefreshDone.current = false;
        return true;
      }
      return false;
    } catch (err) {
      logSession('ERROR', { error: String(err) }, sessionExpiresAt);
      return false;
    }
  }, [sessionExpiresAt]);

  const dismissWarning = useCallback(() => {
    setWarningDismissed(true);
    setShowWarning(false);
    logSession('WARNING_SHOWN', { action: 'dismissed' }, sessionExpiresAt);
  }, [sessionExpiresAt]);

  // Proactive background refresh - silently extends session before warning
  const tryProactiveRefresh = useCallback(async () => {
    // Debounce: don't refresh more than once per 30 seconds
    const now = Date.now();
    if (now - lastRefreshAttempt.current < 30000) {
      logSession('REFRESH_SKIPPED', { reason: 'debounced' }, sessionExpiresAt);
      return;
    }
    
    if (proactiveRefreshDone.current) {
      logSession('REFRESH_SKIPPED', { reason: 'already_done_this_cycle' }, sessionExpiresAt);
      return;
    }

    lastRefreshAttempt.current = now;
    logSession('PROACTIVE_REFRESH', { source: 'background' }, sessionExpiresAt);

    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        const errMsg = error.message?.toLowerCase() || "";
        if (errMsg.includes("rate limit") || errMsg.includes("429")) {
          logSession('RATE_LIMITED', { error: error.message }, sessionExpiresAt);
        } else {
          logSession('REFRESH_FAILED', { error: error.message, source: 'proactive' }, sessionExpiresAt);
        }
        return;
      }
      if (data.session) {
        logSession('REFRESH_SUCCESS', { 
          source: 'proactive', 
          newExpiresAt: data.session.expires_at 
        }, data.session.expires_at);
        proactiveRefreshDone.current = true;
      }
    } catch (err) {
      logSession('ERROR', { error: String(err), source: 'proactive' }, sessionExpiresAt);
    }
  }, [sessionExpiresAt]);

  useEffect(() => {
    if (!sessionExpiresAt) {
      setShowWarning(false);
      return;
    }

    const expiresAt = sessionExpiresAt * 1000;
    
    const checkExpiry = () => {
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      // If already expired
      if (timeUntilExpiry <= 0) {
        logSession('EXPIRED', {}, sessionExpiresAt);
        setShowWarning(false);
        return;
      }

      // Calculate seconds remaining
      const seconds = Math.ceil(timeUntilExpiry / 1000);
      setSecondsRemaining(seconds);

      // Proactive refresh at 15 minutes
      if (timeUntilExpiry <= PROACTIVE_REFRESH_MS && timeUntilExpiry > WARNING_BEFORE_EXPIRY_MS) {
        tryProactiveRefresh();
      }

      // Show warning if within the warning window and not dismissed
      if (timeUntilExpiry <= WARNING_BEFORE_EXPIRY_MS && !warningDismissed) {
        if (!showWarning) {
          logSession('WARNING_SHOWN', { secondsRemaining: seconds }, sessionExpiresAt);
        }
        setShowWarning(true);
      }
    };

    // Check immediately
    logSession('SESSION_CHECK', { expiresAt: sessionExpiresAt }, sessionExpiresAt);
    checkExpiry();

    // Set up interval to check every second
    const intervalId = setInterval(checkExpiry, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [sessionExpiresAt, warningDismissed, showWarning, tryProactiveRefresh]);

  // Reset state when session changes (new session)
  useEffect(() => {
    setWarningDismissed(false);
    proactiveRefreshDone.current = false;
    if (sessionExpiresAt) {
      logSession('AUTH_STATE_CHANGE', { 
        hasSession: true, 
        expiresAt: sessionExpiresAt 
      }, sessionExpiresAt);
    }
  }, [sessionAccessToken, sessionExpiresAt]);

  return {
    showWarning,
    secondsRemaining,
    extendSession,
    dismissWarning,
  };
}
