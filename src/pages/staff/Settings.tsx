import { useEffect, useState } from "react";
import { Monitor, Sun, SunMoon, Moon, Check } from "lucide-react";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard, SfCardHeader } from "@/components/staff/SfCard";
import { cn } from "@/lib/utils";
import { type ThemeMode, getStoredTheme, setStoredTheme } from "@/lib/theme";

const APP_VERSION = "1.0.0";
const APP_BUILD = import.meta.env.VITE_BUILD_ID ?? "local";

const OPTIONS: Array<{ value: ThemeMode; label: string; description: string; icon: typeof Sun; disabled?: boolean }> = [
  { value: "system", label: "System", description: "Uses the dark theme", icon: Monitor },
  { value: "light", label: "Light", description: "Coming soon — not built yet", icon: Sun, disabled: true },
  { value: "mixed", label: "Mixed", description: "Coming soon — not built yet", icon: SunMoon, disabled: true },
  { value: "dark", label: "Dark", description: "Industrial navy with amber accents", icon: Moon },
];

export default function StaffSettings() {
  const [mode, setMode] = useState<ThemeMode>("system");
  useEffect(() => { setMode(getStoredTheme()); }, []);

  return (
    <StaffShell>
      <h1 className="text-2xl font-semibold text-white mb-1">Settings</h1>
      <p className="text-sm text-white/60 mb-6">Personalize how Team Hub looks.</p>

      <div className="grid gap-5 max-w-2xl">
        <SfCard>
          <SfCardHeader title="Appearance" />
          <ul className="divide-y divide-[hsl(var(--sf-border))] -mx-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    disabled={(opt as any).disabled}
                    onClick={() => { setMode(opt.value); setStoredTheme(opt.value); }}
                    className={cn("flex w-full items-center gap-3 px-3 py-3 text-left rounded-[10px] transition-colors",
                      (opt as any).disabled ? "opacity-45 cursor-not-allowed" : "hover:bg-white/[0.03]")}
                    aria-pressed={active}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-white/80">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-white/90">{opt.label}</span>
                      <span className="block text-xs text-white/70">{opt.description}</span>
                    </span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </SfCard>

        <SfCard>
          <SfCardHeader title="About" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Version</span>
              <span className="font-mono text-white/90">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Build</span>
              <span className="font-mono text-white/90">{APP_BUILD}</span>
            </div>
            <p className="pt-2 text-xs text-white/50">Made by Supplement Factory</p>
          </div>
        </SfCard>

        <SfCard>
          <SfCardHeader title="More" subtitle="Manage your profile and password" />
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <a href="/app/profile" className="px-3 py-2 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-white/90 hover:bg-white/[0.06]">Profile</a>
            <a href="/app/change-password" className="px-3 py-2 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-white/90 hover:bg-white/[0.06]">Change password</a>
            <a href="https://thehive.supplementfactoryuk.com/admin/my-hive" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-white/90 hover:bg-white/[0.06]">View payslip (opens the Hive)</a>
          </div>
        </SfCard>
      </div>
    </StaffShell>
  );
}
