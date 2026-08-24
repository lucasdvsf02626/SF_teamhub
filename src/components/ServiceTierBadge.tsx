import { Award } from "lucide-react";
import type { ServiceTier } from "@/lib/service-tier-helpers";

interface ServiceTierBadgeProps {
  tier: ServiceTier | null;
  yearsOfService: number;
  size?: "sm" | "md" | "lg";
  showYears?: boolean;
}

export function ServiceTierBadge({
  tier,
  yearsOfService,
  size = "md",
  showYears = true,
}: ServiceTierBadgeProps) {
  if (!tier) return null;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  // Determine text color based on background brightness
  const getTextColor = (bgColor: string) => {
    // Convert hex to RGB
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
  };

  const textColor = getTextColor(tier.tier_color);

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: tier.tier_color,
        color: textColor,
        border: `1px solid ${textColor}20`,
      }}
    >
      <Award className={iconSizes[size]} />
      <span>{yearsOfService} {yearsOfService === 1 ? 'year' : 'years'}</span>
    </div>
  );
}
