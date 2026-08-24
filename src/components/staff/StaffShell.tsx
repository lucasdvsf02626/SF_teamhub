import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Clock, CalendarDays, Plane, Thermometer,
  Users, Settings, Search, Plus,
  ShieldCheck, LogOut, QrCode, FileCheck,
} from "lucide-react";
import sfLogo from "@/assets/sf-logo-white.png";
import { cn } from "@/lib/utils";
import { useClock, formatHMS } from "@/contexts/ClockContext";
import { useAuth } from "@/contexts/AuthContext";
import { ScanButton } from "@/components/ScanButton";
import { QrQuickSheet } from "@/components/QrQuickSheet";

type NavItem = { to: string; label: string; icon: any };

const staffNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clock",     label: "Clock In/Out", icon: Clock },
  { to: "/shifts",    label: "My Shifts",  icon: CalendarDays },
  { to: "/time-off",  label: "Time Off",   icon: Plane },
  { to: "/sickness",  label: "Sickness",   icon: Thermometer },
  { to: "/documents", label: "My Documents", icon: FileCheck },
  { to: "/team",      label: "Team",       icon: Users },
  { to: "/settings",  label: "Settings",   icon: Settings },
];

const managerNav: NavItem[] = [
  { to: "/manager/today",     label: "My Team Today", icon: Users },
  { to: "/manager/approvals", label: "Approvals",     icon: ShieldCheck },
  { to: "/app/calendar",      label: "Team Calendar", icon: CalendarDays },
];

// Admin lives in the Hive — the staff app has no admin nav.

const mobileTabs = [
  { to: "/dashboard", label: "Home",   icon: LayoutDashboard },
  { to: "/clock",     label: "Clock",  icon: Clock },
  { to: "/shifts",    label: "Shifts", icon: CalendarDays },
  { to: "/time-off",  label: "Time Off", icon: Plane },
  { to: "/settings",  label: "More",   icon: Settings },
];

function getInitials(p: { first_name?: string | null; surname?: string | null; display_name?: string | null; email?: string | null } | null) {
  if (!p) return "?";
  const f = (p.first_name || "").trim()[0];
  const s = (p.surname || "").trim()[0];
  if (f || s) return `${f || ""}${s || ""}`.toUpperCase();
  const dn = (p.display_name || p.email || "?").trim();
  return dn.slice(0, 2).toUpperCase();
}

function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div className="mt-3">
      {title && <div className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>}
      <div className="space-y-1">
        {items.map((n) => (
          <NavLink
            key={n.to} to={n.to}
            className={({ isActive }) => cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-colors",
              isActive
                ? "text-primary bg-primary/5 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            )}
          >
            <n.icon className="h-[18px] w-[18px]" />
            <span className="font-medium">{n.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function Sidebar() {
  const { profile, signOut } = useAuth();
  const level = profile?.permission_level ?? 2;
  const navigate = useNavigate();

  const displayName =
    [profile?.first_name, profile?.surname].filter(Boolean).join(" ") ||
    profile?.display_name ||
    profile?.email ||
    "Staff";

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-[hsl(var(--sf-border))] bg-[hsl(var(--sf-card))]">
      <div className="h-16 flex items-center px-5 border-b border-[hsl(var(--sf-border))]">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-[10px] bg-primary grid place-items-center text-primary-foreground font-bold">SF</div>
          <div className="leading-tight">
            <div className="font-semibold text-foreground text-sm">SF Team Hub</div>
            <div className="text-[10px] text-muted-foreground">Powered by Panacea</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <NavSection items={staffNav} />
        {level >= 3 && <NavSection title="Manager" items={managerNav} />}
      </nav>
      <div className="border-t border-[hsl(var(--sf-border))] p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-orange-600 grid place-items-center text-primary-foreground text-sm font-bold">
          {getInitials(profile)}
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{displayName}</div>
          <div className="text-[11px] text-muted-foreground truncate">{profile?.job_title || "Staff"}</div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate("/auth"); }}
          className="h-8 w-8 grid place-items-center rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

function LiveDate() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="hidden lg:flex flex-col items-end leading-tight">
      <div className="text-sm text-foreground font-medium">
        {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
      </div>
      <div className="text-xs text-muted-foreground font-mono" style={{ fontFamily: "'Geist Mono', monospace" }}>
        {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}

function ClockPill() {
  const { clockedIn, elapsedSec } = useClock();
  if (!clockedIn) {
    return (
      <Link to="/clock" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-[hsl(var(--sf-border))] text-muted-foreground text-xs font-medium hover:text-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60" /> Clocked out
      </Link>
    );
  }
  return (
    <Link to="/clock" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--sf-green))]/10 border border-[hsl(var(--sf-green))]/30 text-[hsl(var(--sf-green))] text-xs font-semibold">
      <span className="h-2 w-2 rounded-full bg-[hsl(var(--sf-green))] animate-pulse" />
      Clocked in <span style={{ fontFamily: "'Geist Mono', monospace" }}>{formatHMS(elapsedSec)}</span>
    </Link>
  );
}

function TopBar() {
  return (
    <header className="min-h-16 pt-[env(safe-area-inset-top)] shrink-0 border-b border-[hsl(var(--sf-border))] bg-[hsl(var(--sf-bg))]/80 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--sf-bg))]/60 px-4 md:px-6 flex items-center gap-3 md:gap-4">
      <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0" aria-label="Team Hub home">
        <img src={sfLogo} alt="Supplement Factory" className="h-6 w-auto" />
        <span className="hidden sm:block h-5 w-px bg-white/15" />
        <span className="hidden sm:block font-semibold text-sm text-white/90">Team Hub</span>
      </Link>
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search shifts, teammates, requests…"
            className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-white/[0.03] border border-[hsl(var(--sf-border))] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>
      <div className="flex-1 md:hidden" />
      <ScanButton />
      <LiveDate />
      <ClockPill />
    </header>
  );
}

function MobileTabs() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const [qrOpen, setQrOpen] = useState(false);

  const renderTab = (t: (typeof mobileTabs)[number]) => {
    const active = pathname.startsWith(t.to);
    return (
      <NavLink key={t.to} to={t.to} className={cn(
        "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}>
        <span className={cn(
          "grid place-items-center h-8 w-12 rounded-full transition-colors",
          active && "bg-primary/15"
        )}>
          <t.icon className="h-5 w-5" />
        </span>
        {t.label}
      </NavLink>
    );
  };

  const displayName =
    [profile?.first_name, profile?.surname].filter(Boolean).join(" ") ||
    profile?.display_name ||
    null;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 min-h-[72px] bg-[hsl(var(--sf-card))]/95 backdrop-blur border-t border-white/[0.06] rounded-t-[24px] grid grid-cols-6 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
        {mobileTabs.slice(0, 2).map(renderTab)}
        {/* Not a route: pops the full-screen identity QR over whatever page
            you're on — the code people hold up at a terminal. Raised centre
            button, the dock's anchor. */}
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground"
          aria-label="Show my sign-in / sign-off code"
        >
          <span className="h-9 w-12 rounded-full bg-gradient-to-tr from-orange-700 via-orange-500 to-yellow-400 text-primary-foreground grid place-items-center ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[hsl(var(--sf-card))] shadow-[0_6px_20px_-6px_hsl(24_95%_53%/0.6)]">
            <QrCode className="h-5 w-5" />
          </span>
          My Code
        </button>
        {mobileTabs.slice(2).map(renderTab)}
      </nav>
      <QrQuickSheet open={qrOpen} onOpenChange={setQrOpen} name={displayName} />
    </>
  );
}

export function StaffShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[hsl(var(--sf-bg))] text-foreground" style={{ fontFamily: "'Outfit', 'Geist', system-ui, sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
      <MobileTabs />
    </div>
  );
}
