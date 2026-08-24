import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { SessionCountdownBadge } from "@/components/SessionCountdownBadge";
import { PanaceaFooter } from "@/components/layout/PanaceaFooter";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { QrQuickSheet } from "@/components/QrQuickSheet";
import sfGroupLogo from "@/assets/sf-logo-white.png";

import {
  Home,
  Users,
  Settings,
  LogOut,
  History,
  CalendarDays,
  ClipboardCheck,
  Calendar,
  User,
  Menu,
  MonitorSmartphone,
  KeyRound,
  QrCode
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
}

// Navigation configuration with groups
const employeeItems = [
  { path: "/app", label: "Home", icon: Home },
  { path: "/app/history", label: "History", icon: History },
  { path: "/app/leave", label: "Leave", icon: CalendarDays },
  { path: "/app/team", label: "Team", icon: Users },
  { path: "/app/calendar", label: "Calendar", icon: Calendar },
];

const managerItems = [
  { path: "/manager/today", label: "Team Today", icon: ClipboardCheck },
  { path: "/manager/approvals", label: "Approvals", icon: ClipboardCheck },
];

// Admin lives in the Hive — the staff app has no admin nav.

const settingsItems = [
  { path: "/app/profile", label: "Profile", icon: User },
  { path: "/app/settings", label: "Appearance", icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, sessionTimeout, isLoading } = useAuth();

  // Desktop mode toggle
  const { isDesktopMode, toggleDesktopMode } = useDesktopMode();

  // Full-screen identity QR, openable from the bottom nav on any page.
  const [qrOpen, setQrOpen] = useState(false);

  const permissionLevel = profile?.permission_level || 1;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/app" && location.pathname.startsWith(path.split("/").slice(0, 3).join("/")));

  // LOADING CHECK AFTER ALL HOOKS - React requires hooks to be called in same order every render
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card/50 hidden lg:flex flex-col">
        {/* Logo - more compact */}
        <div className="p-4 border-b border-border">
          <Link to="/app" className="flex flex-col items-center gap-1">
            <img 
              src={sfGroupLogo} 
              alt="SF Group" 
              className="h-14 w-auto"
            />
            <div className="text-center">
              <h1 className="font-bold text-sm text-foreground">Team Hub</h1>
              <p className="text-[10px] text-muted-foreground">Powered by Panacea</p>
            </div>
          </Link>
          {sessionTimeout.showWarning && (
            <div className="mt-2 flex justify-center">
              <SessionCountdownBadge
                showWarning={sessionTimeout.showWarning}
                secondsRemaining={sessionTimeout.secondsRemaining}
                onExtend={sessionTimeout.extendSession}
              />
            </div>
          )}
        </div>

        {/* Navigation - compact spacing */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {/* Employee Items */}
          {permissionLevel >= 1 && employeeItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                  isActive(item.path) 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Manager Items */}
          {permissionLevel >= 3 && (
            <>
              <div className="pt-2 pb-1 px-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Manager</span>
              </div>
              {managerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                      isActive(item.path)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}

          {/* Admin lives in the Hive — no admin section in the staff app. */}
        </nav>

        {/* User info & Footer - compact */}
        <div className="p-2 border-t border-border">
          {profile && (
            <div className="mb-2 px-3 py-1.5">
              <p className="text-xs font-medium text-foreground truncate">
                {profile.display_name || profile.email}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Level {permissionLevel}
              </p>
            </div>
          )}
          
          {/* Settings Links - compact */}
          {settingsItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-3">
            <img 
              src={sfGroupLogo} 
              alt="SF Group" 
              className="h-12 w-auto"
            />
            <div className="border-l border-border pl-2">
              <h1 className="font-bold text-foreground text-sm">Team Hub</h1>
              <p className="text-xs text-muted-foreground">Powered by Panacea</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Session countdown badge in mobile header */}
            <SessionCountdownBadge
              showWarning={sessionTimeout.showWarning}
              secondsRemaining={sessionTimeout.secondsRemaining}
              onExtend={sessionTimeout.extendSession}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/app/profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/change-password" className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Change Password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleDesktopMode}>
                  <MonitorSmartphone className="w-4 h-4 mr-2" />
                  {isDesktopMode ? "Mobile View" : "Desktop View"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <AppBreadcrumb />
        <div className="flex-1">
          {children}
        </div>
        <PanaceaFooter />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-1.5 flex justify-around">
        {/* Home */}
        <Link
          to="/app"
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
            location.pathname === "/app" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Home className="w-4 h-4" />
          Home
        </Link>
        
        {/* Leave */}
        <Link
          to="/app/leave"
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
            location.pathname === "/app/leave" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <CalendarDays className="w-4 h-4" />
          Leave
        </Link>

        {/* My Code — not a route: pops the full-screen identity QR over
            whatever page you're on. */}
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all text-muted-foreground"
          aria-label="Show my sign-in / sign-off code"
        >
          <QrCode className="w-4 h-4" />
          My Code
        </button>

        {/* Team */}
        <Link
          to="/app/team"
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
            location.pathname === "/app/team" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Users className="w-4 h-4" />
          Team
        </Link>

        {/* Calendar */}
        <Link
          to="/app/calendar"
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
            location.pathname === "/app/calendar" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Calendar className="w-4 h-4" />
          Calendar
        </Link>
        
        {/* History */}
        <Link
          to="/app/history"
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
            location.pathname === "/app/history" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <History className="w-4 h-4" />
          History
        </Link>
      </nav>

      <QrQuickSheet
        open={qrOpen}
        onOpenChange={setQrOpen}
        name={profile?.display_name || [profile?.first_name, profile?.surname].filter(Boolean).join(" ") || null}
      />
    </div>
  );
}
