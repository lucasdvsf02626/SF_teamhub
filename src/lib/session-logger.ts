// Session Debug Logger for troubleshooting authentication issues

interface SessionLogEntry {
  timestamp: Date;
  event: SessionEvent;
  details: Record<string, unknown>;
  expiresAt?: number;
  timeUntilExpiry?: number;
}

type SessionEvent = 
  | 'INIT'
  | 'AUTH_STATE_CHANGE'
  | 'SESSION_CHECK'
  | 'REFRESH_ATTEMPT'
  | 'REFRESH_SUCCESS'
  | 'REFRESH_FAILED'
  | 'REFRESH_SKIPPED'
  | 'RATE_LIMITED'
  | 'EXPIRED'
  | 'WARNING_SHOWN'
  | 'EXTENDED'
  | 'PROACTIVE_REFRESH'
  | 'ERROR';

const MAX_LOG_ENTRIES = 50;
const sessionLogs: SessionLogEntry[] = [];

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 23);
}

function getTimeUntilExpiry(expiresAt?: number): number | undefined {
  if (!expiresAt) return undefined;
  return Math.floor((expiresAt * 1000 - Date.now()) / 1000);
}

export function logSession(
  event: SessionEvent,
  details: Record<string, unknown> = {},
  expiresAt?: number
): void {
  const entry: SessionLogEntry = {
    timestamp: new Date(),
    event,
    details,
    expiresAt,
    timeUntilExpiry: getTimeUntilExpiry(expiresAt),
  };

  // Add to log buffer
  sessionLogs.push(entry);
  if (sessionLogs.length > MAX_LOG_ENTRIES) {
    sessionLogs.shift();
  }

  // Console output with styling
  const timeStr = formatTime(entry.timestamp);
  const expiryStr = entry.timeUntilExpiry !== undefined 
    ? ` [expires in ${entry.timeUntilExpiry}s]`
    : '';

  const styles: Record<SessionEvent, string> = {
    INIT: 'color: #6366f1',
    AUTH_STATE_CHANGE: 'color: #8b5cf6',
    SESSION_CHECK: 'color: #64748b',
    REFRESH_ATTEMPT: 'color: #f59e0b',
    REFRESH_SUCCESS: 'color: #22c55e',
    REFRESH_FAILED: 'color: #ef4444',
    REFRESH_SKIPPED: 'color: #64748b',
    RATE_LIMITED: 'color: #f97316',
    EXPIRED: 'color: #dc2626',
    WARNING_SHOWN: 'color: #eab308',
    EXTENDED: 'color: #22c55e',
    PROACTIVE_REFRESH: 'color: #06b6d4',
    ERROR: 'color: #dc2626; font-weight: bold',
  };

  console.log(
    `%c[Session ${timeStr}] ${event}${expiryStr}`,
    styles[event] || 'color: inherit',
    Object.keys(details).length > 0 ? details : ''
  );
}

export function getSessionLogs(): SessionLogEntry[] {
  return [...sessionLogs];
}

export function exportSessionLogs(): string {
  return JSON.stringify(sessionLogs, null, 2);
}

export function clearSessionLogs(): void {
  sessionLogs.length = 0;
}

// Helper to calculate session health status
export function getSessionHealth(expiresAt?: number): 'healthy' | 'warning' | 'critical' | 'expired' {
  if (!expiresAt) return 'expired';
  
  const timeUntilExpiry = getTimeUntilExpiry(expiresAt);
  if (timeUntilExpiry === undefined) return 'expired';
  
  if (timeUntilExpiry <= 0) return 'expired';
  if (timeUntilExpiry <= 5 * 60) return 'critical'; // < 5 min
  if (timeUntilExpiry <= 15 * 60) return 'warning'; // < 15 min
  return 'healthy';
}
