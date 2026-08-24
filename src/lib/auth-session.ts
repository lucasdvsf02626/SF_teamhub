import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSession } from "@/lib/session-logger";

export async function ensureFreshSession(): Promise<Session | null> {
  logSession('SESSION_CHECK', { source: 'ensureFreshSession' });
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    logSession('SESSION_CHECK', { result: 'no_session' });
    return null;
  }

  // Check if session expires in less than 5 minutes
  const expiresAt = session.expires_at;
  if (expiresAt) {
    const expiresInMs = expiresAt * 1000 - Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;
    
    // Session is still valid with plenty of time - no refresh needed
    if (expiresInMs > fiveMinutesMs) {
      logSession('REFRESH_SKIPPED', { 
        reason: 'session_valid',
        expiresInSeconds: Math.floor(expiresInMs / 1000)
      }, expiresAt);
      return session;
    }
    
    logSession('REFRESH_ATTEMPT', { 
      reason: 'expiring_soon',
      expiresInSeconds: Math.floor(expiresInMs / 1000)
    }, expiresAt);
  }

  // Session expiring soon, try to refresh
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    const errMsg = error.message?.toLowerCase() || "";
    
    // Don't treat rate limits or temporary errors as session expiry
    if (errMsg.includes("rate limit") || errMsg.includes("429")) {
      logSession('RATE_LIMITED', { error: error.message }, session.expires_at);
      return session; // Use existing session
    }
    
    // Return existing session if it's not yet expired
    if (session.expires_at && session.expires_at * 1000 > Date.now()) {
      logSession('REFRESH_FAILED', { 
        error: error.message, 
        action: 'using_existing_session' 
      }, session.expires_at);
      return session;
    }
    
    logSession('REFRESH_FAILED', { 
      error: error.message, 
      action: 'session_expired' 
    });
    return null;
  }

  if (data.session) {
    logSession('REFRESH_SUCCESS', { 
      newExpiresAt: data.session.expires_at 
    }, data.session.expires_at);
  }

  return data.session ?? session;
}

export async function signOutLocal(): Promise<void> {
  logSession('AUTH_STATE_CHANGE', { action: 'sign_out_local' });
  try {
    // Some supabase-js typings don't include scope; runtime supports it.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
}
