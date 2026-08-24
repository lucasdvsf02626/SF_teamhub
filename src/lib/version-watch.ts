// Stale-bundle watchdog.
//
// Home-screen PWAs (especially iOS) cache index.html so aggressively that
// users keep running builds from before a deploy — including builds baked
// with a retired Supabase URL, which then fail with "table not found in
// schema cache" on clock-in. This module lets a deployed client discover
// that a newer build exists and reload itself onto it, so nobody has to
// delete and re-add the home-screen icon again.
//
// How: every build ships a /version.json containing its build id (emitted
// by vite.config.ts, which also bakes the same id into the bundle as
// __APP_BUILD_ID__). We re-fetch that file, bypassing every cache, when the
// app starts, whenever it returns to the foreground, and on a slow interval.
// A mismatch means the server has a newer build than the one running.

declare const __APP_BUILD_ID__: string;

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_GUARD_KEY = "teamhub.forced-reload-for";

async function fetchServerBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { buildId?: string };
    return typeof body.buildId === "string" ? body.buildId : null;
  } catch {
    return null; // offline or version.json missing (pre-watchdog deploy) — never break the app
  }
}

async function forceUpdateTo(serverBuildId: string): Promise<void> {
  // One forced reload per server build id — if the host keeps serving us the
  // old HTML despite the cache-busted URL, don't reload-loop the user.
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === serverBuildId) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, serverBuildId);
  } catch {
    // sessionStorage unavailable (private mode edge cases) — still try once
  }

  console.info(
    `[VersionWatch] New build available (running ${__APP_BUILD_ID__}, server has ${serverBuildId}) — updating`
  );

  // Drop any CacheStorage entries (e.g. left behind by push-notification
  // service workers) so nothing can re-serve the old bundle.
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // best effort
  }

  // Navigate with a cache-busting query param: a changed URL forces even an
  // iOS home-screen app to fetch fresh HTML instead of replaying its cache.
  const url = new URL(window.location.href);
  url.searchParams.set("v", serverBuildId);
  window.location.replace(url.toString());
}

async function checkOnce(): Promise<void> {
  const serverBuildId = await fetchServerBuildId();
  if (serverBuildId && serverBuildId !== __APP_BUILD_ID__) {
    await forceUpdateTo(serverBuildId);
  }
}

export function startVersionWatch(): void {
  if (typeof window === "undefined") return;

  // Shortly after launch: catches the "opened a day-old cached copy" case.
  window.setTimeout(checkOnce, 4000);

  // On returning to the foreground: catches the "left it open on the home
  // screen overnight" case, the most common one for clock-in.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkOnce();
  });

  // And a slow safety-net poll while the app stays open (kiosk tablets).
  window.setInterval(checkOnce, CHECK_INTERVAL_MS);
}
