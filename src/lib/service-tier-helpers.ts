import { differenceInYears, differenceInDays } from "date-fns";

export interface ServiceTier {
  id: string;
  min_years: number;
  max_years: number | null;
  tier_name: string;
  tier_color: string;
  base_annual_leave: number;
}

/**
 * Static tier ladder — Hive migration (week 1).
 * The old tier-config table was not migrated; this mirrors the
 * display ladder in serviceColors.ts (same names, colours, allowances).
 */
export const DEFAULT_SERVICE_TIERS: ServiceTier[] = [
  { id: "tier-0", min_years: 0, max_years: 0, tier_name: "Ivory Essence", tier_color: "#FFFEF5", base_annual_leave: 22 },
  { id: "tier-1", min_years: 1, max_years: 1, tier_name: "Golden Dawn", tier_color: "#FFD700", base_annual_leave: 22 },
  { id: "tier-2", min_years: 2, max_years: 2, tier_name: "Amber Flame", tier_color: "#FF8C00", base_annual_leave: 22 },
  { id: "tier-3", min_years: 3, max_years: 3, tier_name: "Crimson Fire", tier_color: "#DC143C", base_annual_leave: 22 },
  { id: "tier-4", min_years: 4, max_years: 4, tier_name: "Emerald Crown", tier_color: "#50C878", base_annual_leave: 23 },
  { id: "tier-5", min_years: 5, max_years: 5, tier_name: "Sapphire Royal", tier_color: "#4169E1", base_annual_leave: 24 },
  { id: "tier-6", min_years: 6, max_years: 6, tier_name: "Amethyst Reign", tier_color: "#9966CC", base_annual_leave: 25 },
  { id: "tier-7", min_years: 7, max_years: 7, tier_name: "Mahogany Noble", tier_color: "#8B4513", base_annual_leave: 26 },
  { id: "tier-8", min_years: 8, max_years: 8, tier_name: "Prismatic Crown", tier_color: "#FF0000", base_annual_leave: 27 },
  { id: "tier-9", min_years: 9, max_years: 14, tier_name: "Yin Yang Balance", tier_color: "#FFFFFF", base_annual_leave: 28 },
  { id: "tier-15", min_years: 15, max_years: null, tier_name: "Obsidian Elite", tier_color: "#1C1C1C", base_annual_leave: 33 },
];

export interface ServiceInfo {
  yearsOfService: number;
  daysInCurrentYear: number;
  tier: ServiceTier | null;
  accruedLeave: number;
  proRataAllowance: number;
}

/**
 * Calculate years of service from start date
 */
export function calculateYearsOfService(startDate: Date | string): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const today = new Date();
  return differenceInYears(today, start);
}

/**
 * Calculate days worked in current year (for pro-rata calculation)
 */
export function calculateDaysInCurrentYear(startDate: Date | string): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  
  // If started before this year, count from Jan 1
  if (start < yearStart) {
    return differenceInDays(today, yearStart) + 1;
  }
  
  // If started this year, count from start date
  return differenceInDays(today, start) + 1;
}

/**
 * Get the service tier for a given years of service
 */
export function getServiceTier(yearsOfService: number, tiers: ServiceTier[]): ServiceTier | null {
  // Sort tiers by min_years to ensure correct order
  const sortedTiers = [...tiers].sort((a, b) => a.min_years - b.min_years);
  
  for (const tier of sortedTiers) {
    if (tier.max_years === null) {
      // This is the final tier (10+ years)
      if (yearsOfService >= tier.min_years) {
        return tier;
      }
    } else if (yearsOfService >= tier.min_years && yearsOfService <= tier.max_years) {
      return tier;
    }
  }
  
  // Default to first tier if no match
  return sortedTiers[0] || null;
}

/**
 * Calculate pro-rata leave allowance based on start date within the leave year
 */
export function calculateProRataAllowance(
  startDate: Date | string,
  baseAllowance: number,
  leaveYearStart: Date
): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const today = new Date();
  
  // Calculate end of leave year
  const leaveYearEnd = new Date(leaveYearStart);
  leaveYearEnd.setFullYear(leaveYearEnd.getFullYear() + 1);
  leaveYearEnd.setDate(leaveYearEnd.getDate() - 1);
  
  // If started before this leave year, full allowance
  if (start <= leaveYearStart) {
    return baseAllowance;
  }
  
  // If started after leave year end (shouldn't happen but safety check)
  if (start > leaveYearEnd) {
    return 0;
  }
  
  // Calculate total days in leave year
  const totalDaysInYear = differenceInDays(leaveYearEnd, leaveYearStart) + 1;
  
  // Calculate days remaining from start date to end of leave year
  const daysRemaining = differenceInDays(leaveYearEnd, start) + 1;
  
  // Pro-rata calculation
  const proRata = Math.round((baseAllowance * daysRemaining) / totalDaysInYear);
  
  return proRata;
}

/**
 * Get complete service information for an employee
 */
export function getServiceInfo(
  startDate: Date | string | null,
  tiers: ServiceTier[],
  leaveYearStart?: Date
): ServiceInfo {
  if (!startDate) {
    return {
      yearsOfService: 0,
      daysInCurrentYear: 0,
      tier: tiers.length > 0 ? tiers[0] : null,
      accruedLeave: tiers[0]?.base_annual_leave || 22,
      proRataAllowance: tiers[0]?.base_annual_leave || 22,
    };
  }
  
  const yearsOfService = calculateYearsOfService(startDate);
  const daysInCurrentYear = calculateDaysInCurrentYear(startDate);
  const tier = getServiceTier(yearsOfService, tiers);
  const baseAllowance = tier?.base_annual_leave || 22;
  
  // If leave year start is provided, calculate pro-rata
  const proRataAllowance = leaveYearStart 
    ? calculateProRataAllowance(startDate, baseAllowance, leaveYearStart)
    : baseAllowance;
  
  return {
    yearsOfService,
    daysInCurrentYear,
    tier,
    accruedLeave: baseAllowance,
    proRataAllowance,
  };
}
