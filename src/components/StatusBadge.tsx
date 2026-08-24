import { cn } from "@/lib/utils";
import { PresenceStatus } from "@/types";
import { getStatusLabel } from "@/lib/supabase-helpers";
import { 
  Building2, 
  Coffee, 
  Home, 
  Palmtree, 
  Thermometer, 
  LogOut 
} from "lucide-react";

interface StatusBadgeProps {
  status: PresenceStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusIcons: Record<PresenceStatus, React.ComponentType<{ className?: string }>> = {
  on_site: Building2,
  on_break: Coffee,
  remote: Home,
  leave: Palmtree,
  sick: Thermometer,
  off: LogOut,
};

export function StatusBadge({ status, size = "md", showIcon = true }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const statusClasses: Record<PresenceStatus, string> = {
    on_site: "status-on-site",
    on_break: "status-on-break",
    remote: "status-remote",
    leave: "status-leave",
    sick: "status-sick",
    off: "status-off",
  };

  const Icon = statusIcons[status];

  return (
    <span
      className={cn(
        "status-badge",
        statusClasses[status],
        sizeClasses[size]
      )}
    >
      {showIcon && Icon && (
        <Icon className={iconSizes[size]} />
      )}
      {getStatusLabel(status)}
    </span>
  );
}
