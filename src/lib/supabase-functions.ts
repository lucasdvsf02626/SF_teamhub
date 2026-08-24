import { supabase } from "@/integrations/supabase/client";

// Global handler for session expiry - will be set by AuthContext
let sessionExpiredHandler: (() => void) | null = null;

export const setSessionExpiredHandler = (handler: () => void) => {
  sessionExpiredHandler = handler;
};

export const clearSessionExpiredHandler = () => {
  sessionExpiredHandler = null;
};

interface InvokeFunctionOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface InvokeFunctionResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Wrapper for supabase.functions.invoke that automatically handles session expiry.
 * When a 401 is returned, it triggers the session expired flow (sign out + redirect).
 */
export async function invokeFunction<T = unknown>(
  functionName: string,
  options?: InvokeFunctionOptions
): Promise<InvokeFunctionResult<T>> {
  try {
    // Ensure we have a valid session; refresh if expired so the SDK
    // attaches a current-format JWT (not a stale legacy token).
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      if (sessionExpiredHandler) {
        sessionExpiredHandler();
      }
      return {
        data: null,
        error: new Error("Session expired. Please sign in again."),
      };
    }

    // If the token is expired or about to expire, force a refresh before invoking.
    const expiresAt = session.expires_at ?? 0;
    const nowSec = Math.floor(Date.now() / 1000);
    if (expiresAt - nowSec < 30) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        if (sessionExpiredHandler) sessionExpiredHandler();
        return {
          data: null,
          error: new Error("Session expired. Please sign in again."),
        };
      }
    }

    // Let the SDK attach the Authorization header itself — do NOT override it,
    // otherwise a stale legacy-format token can be sent and rejected with
    // UNAUTHORIZED_LEGACY_JWT by the platform's verify_jwt layer.
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: options?.body,
      headers: options?.headers,
    });

    // Check for 401 errors in the response
    if (error) {
      const errorMessage = error.message?.toLowerCase() || '';
      const is401 = errorMessage.includes('401') || 
                    errorMessage.includes('unauthorized') ||
                    errorMessage.includes('session');
      
      if (is401 && sessionExpiredHandler) {
        sessionExpiredHandler();
        return { 
          data: null, 
          error: new Error("Session expired. Please sign in again.") 
        };
      }
      
      return { data: null, error };
    }

    // Check if the function returned an error in the data
    if (data?.error) {
      const dataError = typeof data.error === 'string' ? data.error.toLowerCase() : '';
      const is401 = dataError.includes('unauthorized') || dataError.includes('401');
      
      if (is401 && sessionExpiredHandler) {
        sessionExpiredHandler();
        return { 
          data: null, 
          error: new Error("Session expired. Please sign in again.") 
        };
      }
      
      return { data: null, error: new Error(data.error) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    
    // Check if it's a session-related error
    const errorMessage = error.message.toLowerCase();
    if ((errorMessage.includes('401') || errorMessage.includes('unauthorized')) && sessionExpiredHandler) {
      sessionExpiredHandler();
    }
    
    return { data: null, error };
  }
}
