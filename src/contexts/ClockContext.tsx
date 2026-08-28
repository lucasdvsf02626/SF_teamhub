import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { isWithinGeofence } from '@sf/core';
import {
  recordAttendanceEvent,
  fetchGeofenceSiteForUser,
  type GeofenceSite,
} from "@/lib/supabase-helpers";
import { toast } from "@/hooks/use-toast";

// -----------------------------------------------------------------------------
// Geofenced clock engine — the single home for clock-in/out writes so the same
// rules apply wherever the user clocks in from (staff Clock page, EmployeeHome).
//
// Clock-in: requires being inside the site radius (distance to site centre
// <= radius_m) when the device gives us a position. If geolocation is denied
// or unavailable we ALLOW the clock-in and record metadata.location =
// 'unavailable' — never hard-block someone whose phone has no signal indoors;
// the kiosk is the fallback.
//
// Auto clock-out: while clocked in we watch position and, if the user moves
// further than radius_m + AUTO_CLOCKOUT_GRACE_M (46 m ≈ 50 yards) from the
// site centre with a fix accuracy better than 100 m (to avoid GPS-jitter
// logouts), we write an 'out' event with source 'geofence' and stop watching.
//
// HONEST LIMITATION: this is a PWA — navigator.geolocation.watchPosition only
// runs while the app is OPEN in the foreground. If the user walks off site
// with the app closed or backgrounded, no geofence event fires. True
// background geofencing needs the native wrapper (Capacitor) when the store
// build happens. Until then the kiosk sign-out and the end-of-day auto-expiry
// remain the backstop.
// -----------------------------------------------------------------------------

const AUTO_CLOCKOUT_GRACE_M = 46;       // ~50 yards beyond the site radius
const MAX_ACCURACY_FOR_AUTO_OUT_M = 100; // ignore fixes worse than this
const WATCH_THROTTLE_MS = 20_000;        // process at most one fix per 20s

export type ClockInResult =
  | { ok: true; message?: undefined }
  | { ok: false; message: string };

type ClockState = {
  clockedIn: boolean;
  startedAt: number | null;     // ms epoch
  elapsedSec: number;           // live ticking seconds
  onBreak: boolean;
  locating: boolean;            // true while we wait for a GPS fix at clock-in
  /** Geofence-checked clock-in. Writes the attendance row itself. */
  attemptClockIn: () => Promise<ClockInResult>;
  /** Manual clock-out. Writes the attendance row itself. */
  clockOutNow: () => Promise<void>;
  toggleBreak: () => void;
};

const ClockCtx = createContext<ClockState | null>(null);
const LS_KEY = "sf.clock.v1";

export function ClockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { requestLocation, loading: locating } = useGeolocation();

  const [startedAt, setStartedAt] = useState<number | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}").startedAt ?? null; } catch { return null; }
  });
  const [onBreak, setOnBreak] = useState<boolean>(() => {
    try { return !!JSON.parse(localStorage.getItem(LS_KEY) || "{}").onBreak; } catch { return false; }
  });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [site, setSite] = useState<GeofenceSite | null>(null);

  // One geofence logout per clock-in session
  const geofenceFiredRef = useRef(false);
  const lastFixProcessedRef = useRef(0);

  // Live ticker
  useEffect(() => {
    if (!startedAt) { setElapsedSec(0); return; }
    const tick = () => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ startedAt, onBreak }));
  }, [startedAt, onBreak]);

  // Load the user's geofence site (shift assignment site, else the single
  // active site) whenever we might need it: on clock-in and on app reload
  // while already clocked in.
  useEffect(() => {
    if (!user || !startedAt || site) return;
    let cancelled = false;
    fetchGeofenceSiteForUser(user.id)
      .then((s) => { if (!cancelled) setSite(s); })
      .catch(() => { /* no site → no geofence; kiosk remains the backstop */ });
    return () => { cancelled = true; };
  }, [user, startedAt, site]);

  const stopLocal = useCallback(() => {
    setStartedAt(null);
    setOnBreak(false);
  }, []);

  const attemptClockIn = useCallback(async (): Promise<ClockInResult> => {
    if (!user) return { ok: false, message: "You need to be signed in to clock in." };

    // Resolve the site fresh at clock-in (coordinates live in the sites table)
    let clockSite: GeofenceSite | null = null;
    try {
      clockSite = await fetchGeofenceSiteForUser(user.id);
    } catch {
      clockSite = null;
    }

    // Ask the device where we are. null = denied / unavailable / timed out.
    const position = await requestLocation();

    let metadata: Record<string, unknown>;
    if (position) {
      metadata = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      };

      const hasGeofence =
        clockSite?.latitude != null && clockSite?.longitude != null && clockSite?.radius_m != null;

      if (hasGeofence && clockSite) {
        const { isWithin, distance } = isWithinGeofence(
          position.coords.latitude,
          position.coords.longitude,
          clockSite.latitude as number,
          clockSite.longitude as number,
          clockSite.radius_m as number
        );
        metadata.distance_m = distance;
        metadata.site_code = clockSite.code;

        if (!isWithin) {
          // On-site check failed: refuse the clock-in.
          return {
            ok: false,
            message: `You need to be at ${clockSite.name} to clock in — you're about ${distance}m away.`,
          };
        }
      }
    } else {
      // Geolocation denied or unavailable: allow, but record it honestly.
      metadata = { location: "unavailable" };
    }

    await recordAttendanceEvent(user.id, "in", clockSite?.id ?? null, "phone", metadata);

    setSite(clockSite);
    geofenceFiredRef.current = false;
    lastFixProcessedRef.current = 0;
    setStartedAt(Date.now());
    setOnBreak(false);
    return { ok: true };
  }, [user, requestLocation]);

  const clockOutNow = useCallback(async () => {
    if (!user) return;
    await recordAttendanceEvent(user.id, "out", site?.id ?? null, "phone", null);
    stopLocal();
  }, [user, site, stopLocal]);

  // ---------------------------------------------------------------------------
  // Auto clock-out watcher. Foreground-only (see the limitation note above).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user || !startedAt) return;
    if (!site || site.latitude == null || site.longitude == null || site.radius_m == null) return;
    if (!("geolocation" in navigator)) return;

    const siteLat = site.latitude;
    const siteLng = site.longitude;
    const leaveThresholdM = site.radius_m + AUTO_CLOCKOUT_GRACE_M;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Throttle: at most one processed fix per WATCH_THROTTLE_MS
        const now = Date.now();
        if (now - lastFixProcessedRef.current < WATCH_THROTTLE_MS) return;
        lastFixProcessedRef.current = now;

        if (geofenceFiredRef.current) return;
        // Ignore low-quality fixes so GPS jitter can't log people out
        if (pos.coords.accuracy > MAX_ACCURACY_FOR_AUTO_OUT_M) return;

        const { isWithin, distance } = isWithinGeofence(
          pos.coords.latitude, pos.coords.longitude, siteLat, siteLng, leaveThresholdM
        );
        if (isWithin) return;

        // They've left the site: one geofence logout per clock-in session.
        geofenceFiredRef.current = true;
        recordAttendanceEvent(user.id, "out", site.id, "geofence", {
          distance_m: distance,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          site_code: site.code,
          timestamp: new Date().toISOString(),
        })
          .then(() => {
            stopLocal();
            toast({ title: "Clocked out", description: "Clocked out — you left the site.", variant: "success" as any });
          })
          .catch(() => {
            // Write failed (offline, RLS…). Let a later fix retry rather than
            // silently losing the clock-out.
            geofenceFiredRef.current = false;
          });
      },
      () => { /* watch error (permission revoked etc.) — kiosk is the backstop */ },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, startedAt, site, stopLocal]);

  const toggleBreak = useCallback(() => setOnBreak(b => !b), []);

  return (
    <ClockCtx.Provider value={{
      clockedIn: !!startedAt, startedAt, elapsedSec, onBreak, locating,
      attemptClockIn, clockOutNow, toggleBreak,
    }}>
      {children}
    </ClockCtx.Provider>
  );
}

export function useClock() {
  const v = useContext(ClockCtx);
  if (!v) throw new Error("useClock must be used inside <ClockProvider>");
  return v;
}

export function formatHMS(sec: number) {
  const h = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatHM(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}
