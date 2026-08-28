import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getServiceTierDisplay, getLighterColor, getDarkerColor, RING_SIZES, type RingSize, type ServiceTierDisplay } from '@sf/core';
import { cn } from "@/lib/utils";

interface ServiceRingAvatarProps {
  src?: string | null;
  fallback: string;
  yearsOfService: number;
  size?: RingSize;
  className?: string;
  showTooltip?: boolean;
}

function getRingStyle(tier: ServiceTierDisplay) {
  // Rainbow gradient for Prismatic Crown (Year 9)
  if (tier.hasRainbow) {
    return {
      background: `
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 20%),
        radial-gradient(circle at 70% 70%, rgba(0,0,0,0.3) 0%, transparent 25%),
        conic-gradient(from 0deg, #FF0000, #FF8C00, #FFD700, #50C878, #4169E1, #9966CC, #FF0000)
      `,
      boxShadow: '0 4px 20px rgba(255,0,0,0.3), 0 0 40px rgba(255,215,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)',
    };
  }

  // Yin Yang for Year 10+
  if (tier.hasYinYang) {
    return {
      background: `
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, transparent 25%),
        radial-gradient(circle at 50% 25%, #1a1a1a 8%, transparent 8%),
        radial-gradient(circle at 50% 75%, #FFFFFF 8%, transparent 8%),
        radial-gradient(circle at 70% 70%, rgba(0,0,0,0.4) 0%, transparent 30%),
        conic-gradient(from 90deg at 50% 50%, #FFFFFF 0deg, #FFFFFF 180deg, #0a0a0a 180deg, #0a0a0a 360deg)
      `,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
    };
  }

  // Special handling for Obsidian Elite (Year 15+)
  if (tier.color === '#1C1C1C') {
    return {
      background: `
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 25%),
        radial-gradient(circle at 70% 70%, rgba(0,0,0,0.6) 0%, transparent 30%),
        radial-gradient(circle at 50% 50%, #3a3a3a 0%, #1C1C1C 50%, #0a0a0a 100%)
      `,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.3)',
    };
  }

  // 3D half-globe effect for all other tiers
  const lighter = getLighterColor(tier.color, 25);
  const darker = getDarkerColor(tier.color, 25);
  
  return {
    background: `
      radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7) 0%, transparent 25%),
      radial-gradient(circle at 70% 70%, rgba(0,0,0,0.3) 0%, transparent 30%),
      radial-gradient(circle at 50% 50%, ${lighter} 0%, ${tier.color} 50%, ${darker} 100%)
    `,
    boxShadow: `0 4px 20px ${tier.color}60, inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)`,
  };
}

export function ServiceRingAvatar({
  src,
  fallback,
  yearsOfService,
  size = "md",
  className,
  showTooltip = true,
}: ServiceRingAvatarProps) {
  const tier = getServiceTierDisplay(yearsOfService);
  const dimensions = RING_SIZES[size];
  const ringStyle = getRingStyle(tier);

  const avatarContent = (
    <div
      className={cn("relative inline-flex items-center justify-center flex-shrink-0", className)}
      style={{
        width: dimensions.avatar + dimensions.ring * 2,
        height: dimensions.avatar + dimensions.ring * 2,
      }}
    >
      {/* Animated shimmer edge */}
      <div
        className="absolute inset-0 rounded-full animate-[ring-shimmer_1.5s_linear_infinite]"
        style={{
          background: tier.hasRainbow 
            ? 'conic-gradient(from 0deg, transparent 0deg, transparent 340deg, rgba(255,255,255,0.8) 350deg, transparent 360deg)'
            : tier.hasYinYang
            ? 'conic-gradient(from 0deg, transparent 0deg, transparent 340deg, rgba(255,255,255,0.6) 350deg, transparent 360deg)'
            : `conic-gradient(from 0deg, transparent 0deg, transparent 340deg, ${tier.color}cc 350deg, transparent 360deg)`,
          filter: 'blur(2px)',
        }}
      />

      {/* Ring with 3D effect */}
      <div
        className="absolute inset-0 rounded-full shadow-xl"
        style={ringStyle}
      />
      
      {/* Inner circle (background) */}
      <div
        className="absolute rounded-full bg-background"
        style={{
          width: dimensions.avatar,
          height: dimensions.avatar,
        }}
      />
      
      {/* Avatar */}
      <Avatar
        className="relative z-10"
        style={{
          width: dimensions.avatar,
          height: dimensions.avatar,
        }}
      >
        <AvatarImage src={src || undefined} alt="Profile" />
        <AvatarFallback 
          className="text-foreground"
          style={{ 
            fontSize: dimensions.avatar * 0.35,
            backgroundColor: 'hsl(var(--muted))',
          }}
        >
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  );

  if (!showTooltip) return avatarContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={getRingStyle(tier)} 
            />
            <span className="font-semibold">{tier.tierName}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {yearsOfService >= 15 ? '15+' : yearsOfService >= 10 ? '10+' : yearsOfService} {yearsOfService === 1 ? 'year' : 'years'} of service
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Helper function to get initials from names
export function getInitials(firstName?: string | null, surname?: string | null): string {
  return `${firstName?.[0] || ""}${surname?.[0] || ""}`.toUpperCase() || "?";
}
