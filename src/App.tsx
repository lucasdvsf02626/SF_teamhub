import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/InstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SplashScreenManager } from "@/components/SplashScreenManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProfileCompletion from "./pages/ProfileCompletion";
import EmployeeHome from "./pages/EmployeeHome";
import AttendanceHistory from "./pages/AttendanceHistory";
import LeaveRequests from "./pages/LeaveRequests";
import ProfileSettings from "./pages/ProfileSettings";
import ManagerTeam from "./pages/ManagerTeam";
import ManagerApprovals from "./pages/ManagerApprovals";
import TeamCalendar from "./pages/TeamCalendar";
import TeamDirectory from "./pages/TeamDirectory";
import ReturnToWork from "./pages/ReturnToWork";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import ChangePassword from "./pages/ChangePassword";
import Onboarding from "./pages/Onboarding";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";
import SettingsPage from "./pages/Settings";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffClock from "./pages/staff/Clock";
import WallPoster from "./pages/WallPoster";
import StaffShifts from "./pages/staff/Shifts";
import StaffTimeOff from "./pages/staff/TimeOff";
import StaffSickness from "./pages/staff/Sickness";
import StaffDocuments from "./pages/staff/Documents";
import StaffStub from "./pages/staff/Stub";
import StaffTeam from "./pages/staff/Team";
import StaffSettings from "./pages/staff/Settings";
import { ClockProvider } from "./contexts/ClockContext";

const queryClient = new QueryClient();

const Protected = ({ children, level = 2 }: { children: React.ReactNode; level?: number }) => (
  <ProtectedRoute minPermissionLevel={level}>{children}</ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SplashScreenManager />
          <BrowserRouter>
            <ClockProvider>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* New redesigned staff app — all protected, level 2+ */}
              <Route path="/dashboard" element={<Protected><StaffDashboard /></Protected>} />
              <Route path="/clock"     element={<Protected><StaffClock /></Protected>} />
              <Route path="/wall-poster" element={<Protected><WallPoster /></Protected>} />
              <Route path="/shifts"    element={<Protected><StaffShifts /></Protected>} />
              <Route path="/time-off"  element={<Protected><StaffTimeOff /></Protected>} />
              <Route path="/sickness"  element={<Protected><StaffSickness /></Protected>} />
              <Route path="/documents" element={<Protected><StaffDocuments /></Protected>} />
              <Route path="/swap-shift" element={<Protected><StaffStub title="Swap Shift" blurb="Ask a teammate to cover a shift, or pick one up." /></Protected>} />
              <Route path="/payslips"  element={<Protected><StaffStub title="Payslips" blurb="Payslips live in the Hive, behind your PIN." /></Protected>} />

              {/* Redirect new shell routes to existing production pages */}
              <Route path="/team"     element={<Protected><StaffTeam /></Protected>} />
              <Route path="/settings" element={<Protected><StaffSettings /></Protected>} />

              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/complete-profile" element={
                <ProtectedRoute minPermissionLevel={2} skipProfileCheck>
                  <ProfileCompletion />
                </ProtectedRoute>
              } />
              <Route path="/force-password-change" element={
                <ProtectedRoute minPermissionLevel={2} skipProfileCheck skipPasswordCheck>
                  <ForcePasswordChange />
                </ProtectedRoute>
              } />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Employee routes - Level 2+ (kept fully intact) */}
              <Route path="/app" element={<Protected><EmployeeHome /></Protected>} />
              <Route path="/app/history" element={<Protected><AttendanceHistory /></Protected>} />
              <Route path="/app/leave" element={<Protected><LeaveRequests /></Protected>} />
              <Route path="/app/profile" element={<Protected><ProfileSettings /></Protected>} />
              <Route path="/app/settings" element={<Protected><SettingsPage /></Protected>} />
              <Route path="/app/change-password" element={<Protected><ChangePassword /></Protected>} />
              <Route path="/app/return-to-work" element={<Protected><ReturnToWork /></Protected>} />
              <Route path="/app/team" element={<Protected><TeamDirectory /></Protected>} />
              <Route path="/app/calendar" element={<Protected><TeamCalendar /></Protected>} />

              {/* Manager routes - Level 3+ (managers approve leave/sickness in this app) */}
              <Route path="/manager/today" element={<Protected level={3}><ManagerTeam /></Protected>} />
              <Route path="/manager/approvals" element={<Protected level={3}><ManagerApprovals /></Protected>} />

              {/* Admin lives in the Hive now — no /admin routes in the staff app. */}

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <InstallPrompt />
            </ClockProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
