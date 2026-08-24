export type ThemeMode = "system" | "light" | "mixed" | "dark";

export const THEME_STORAGE_KEY = "sf.theme.mode";
const ALL_CLASSES = ["theme-system", "theme-light", "theme-mixed", "theme-dark", "light"];

function prefersLight() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  ALL_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.add(`theme-${mode}`);

  // Resolve "system" → dark, deliberately.
  //
  // Light mode is NOT finished in this app: the shell paints --sf-bg/--sf-card
  // directly and 78 text utilities across 16 files are hardcoded text-white.
  // Following a light device therefore produced dark surfaces under dark text —
  // an unreadable app for anyone whose phone is in Light appearance (Lee hit
  // exactly this, 7 Aug). Until the light palette is properly built, every
  // mode resolves to the dark token set, which is the one the UI is designed
  // against. The Settings picker marks the light options as unavailable so it
  // does not promise something that does not work.
  void prefersLight;
}

export function getStoredTheme(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (v === "light" || v === "mixed") return "dark"; // see applyTheme: light is unfinished
  return v && ["system", "dark"].includes(v) ? v : "dark";
}

export function setStoredTheme(mode: ThemeMode) {
  if (typeof localStorage !== "undefined") localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
}

export function initTheme() {
  applyTheme(getStoredTheme());
  // React to system changes when in "system" mode
  if (typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", () => {
      if (getStoredTheme() === "system") applyTheme("system");
    });
  }
}
