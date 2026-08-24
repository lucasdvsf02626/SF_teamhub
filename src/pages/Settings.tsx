import { useEffect, useState } from "react";
import { Monitor, Moon, Check } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type ThemeMode,
  getStoredTheme,
  setStoredTheme,
} from "@/lib/theme";

const APP_VERSION = "1.0.0";
const APP_BUILD = import.meta.env.VITE_BUILD_ID ?? "local";

const OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Moon;
}> = [
  // Light and Mixed withdrawn for good (Lee, 18 Aug 2026: "withdraw").
  // They were never finished: applyTheme resolved every mode to dark since
  // 7 Aug and nobody noticed. getStoredTheme still coerces old stored
  // light/mixed values to dark, so nobody is stranded.
  { value: "system", label: "System", description: "Follows your device setting", icon: Monitor },
  { value: "dark", label: "Dark", description: "Industrial navy with amber accents", icon: Moon },
];

export default function SettingsPage() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    setMode(getStoredTheme());
  }, []);

  function handleSelect(next: ThemeMode) {
    setMode(next);
    setStoredTheme(next);
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl space-y-6 p-4">
        <header>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Personalize how Team Hub looks.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = mode === opt.value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      )}
                      aria-pressed={active}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{opt.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {opt.description}
                        </span>
                      </span>
                      {active && <Check className="h-4 w-4 text-primary" aria-label="Selected" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build</span>
              <span className="font-mono">{APP_BUILD}</span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">Made by Supplement Factory</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
