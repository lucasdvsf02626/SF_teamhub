/**
 * Client error logging — Hive migration (week 1).
 *
 * The old error-log table no longer exists; errors go to the console.
 * A small localStorage ring buffer is kept so the ErrorBoundary's
 * "copy error details for support" flow still works offline.
 */

interface ClientErrorEntry {
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  context?: string;
  extraData?: Record<string, unknown>;
}

const MAX_STORED_LOGS = 20;

export function logClientError(entry: ClientErrorEntry): void {
  console.error(`[${entry.context || "client-error"}]`, entry.errorMessage, entry.extraData ?? "");
}

export function logToLocalStorage(kind: string, data: Record<string, unknown>): void {
  try {
    const key = kind === "error_boundary" ? "sf_error_boundary_logs" : "sf_auth_error_logs";
    const logs = JSON.parse(localStorage.getItem(key) || "[]");
    logs.push({ kind, ...data, timestamp: new Date().toISOString() });
    while (logs.length > MAX_STORED_LOGS) logs.shift();
    localStorage.setItem(key, JSON.stringify(logs));
  } catch {
    // localStorage unavailable — nothing to do
  }
}
