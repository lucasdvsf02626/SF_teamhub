import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  minPermissionLevel: number;
  skipProfileCheck?: boolean;
  skipPasswordCheck?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  minPermissionLevel, 
  skipProfileCheck = false,
  skipPasswordCheck = false,
}: ProtectedRouteProps) => {
  const { user, profile, isLoading, profileLoading } = useAuth();
  const location = useLocation();

  // Wait for both auth and profile to finish loading
  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user must change password (unless on the force password change page)
  if (!skipPasswordCheck && profile?.must_change_password && location.pathname !== "/force-password-change") {
    return <Navigate to="/force-password-change" replace />;
  }

  // Check if profile is incomplete (missing required fields)
  const isProfileIncomplete = profile && (!profile.job_title || !profile.department);
  
  // Redirect to profile completion if needed (unless we're already there or skipProfileCheck is true)
  if (!skipProfileCheck && isProfileIncomplete && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  const userPermissionLevel = profile?.permission_level ?? 2;

  if (userPermissionLevel < minPermissionLevel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="card-industrial p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Required level: <span className="font-mono font-semibold text-foreground">{minPermissionLevel}</span>
            {" · "}Your level: <span className="font-mono font-semibold text-foreground">{userPermissionLevel}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
