import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logToLocalStorage } from "@/lib/client-error-logger";
import { initTheme } from "@/lib/theme";
import { startVersionWatch } from "@/lib/version-watch";

initTheme();
startVersionWatch();

// Diagnostic banner — confirms which Supabase backend the live build is talking to
import { supabase } from "@/integrations/supabase/client";
console.info(
  '[SF Team Hub] Supabase URL:',
  (supabase as unknown as { supabaseUrl?: string }).supabaseUrl ?? 'pinned (see integrations/supabase/client.ts)',
  '| Host:',
  typeof window !== 'undefined' ? window.location.host : 'ssr'
);

// Global error handler for uncaught exceptions (console + localStorage only —
// the remote error-log pipeline was retired in the Hive migration)
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[GlobalErrorHandler] Uncaught exception:', { message, source, lineno, colno });

  logToLocalStorage('global_error', {
    message: String(message),
    source,
    lineno,
    colno,
    stack: error?.stack
  });

  return false; // Allow default handling
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;

  console.error('[GlobalErrorHandler] Unhandled promise rejection:', reason);

  logToLocalStorage('unhandled_rejection', {
    message,
    stack,
    reason: String(reason)
  });
};

createRoot(document.getElementById("root")!).render(<App />);
