import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  app: "Home",
  admin: "Admin",
  manager: "Manager",
  history: "History",
  leave: "Leave",
  team: "Team",
  calendar: "Calendar",
  profile: "Profile",
  inbox: "Inbox",
  notifications: "Notification Settings",
  certifications: "Certifications",
  "service-tiers": "Years of Service",
  "change-password": "Change Password",
  presence: "Overview",
  analytics: "Analytics",
  "leave-management": "Leave Management",
  users: "Users",
  sites: "Sites",
  email: "Emails",
  "error-logs": "Error Logs",
  "sync-monitoring": "Sync Monitor",
  "attendance-observability": "Attendance Obs.",
  new: "New",
  t: "Thread",
  settings: "PIN Admin",
  "bulk-import": "Bulk Import",
  "absence-report": "Absence Report",
  today: "Team Today",
  approvals: "Approvals",
  kiosk: "Kiosk",
  contact: "Contact",
  directory: "Directory",
  payroll: "Payroll",
};

export function AppBreadcrumb() {
  const location = useLocation();
  const { profile, profileLoading } = useAuth();

  // Only show for permission level 4+ (admin/architect)
  if (profileLoading || (profile?.permission_level || 1) < 4) return null;

  const segments = location.pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: routeLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    path: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <Breadcrumb className="px-4 lg:px-6 py-2 border-b border-border bg-muted/50">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/app" className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
