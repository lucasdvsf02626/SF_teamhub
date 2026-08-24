import { getLeaveYearDates } from "./leave-year-helpers";

export interface SickRequest {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface SicknessMetrics {
  totalDays: number;
  spells: number;
  bradfordScore: number;
  mondayPercentage: number;
  fridayPercentage: number;
  singleDaySpellPercentage: number;
}

export interface PatternWarning {
  type: "monday" | "friday" | "single_day" | "bradford" | "spells";
  severity: "info" | "warning" | "critical";
  message: string;
  detail: string;
}

// Calculate total days in a request
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Check if a date falls on Monday (1) or Friday (5)
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

// Calculate sickness metrics from approved sick requests
export function calculateSicknessMetrics(sickRequests: SickRequest[]): SicknessMetrics {
  const approvedRequests = sickRequests.filter((r) => r.status === "approved");
  
  if (approvedRequests.length === 0) {
    return {
      totalDays: 0,
      spells: 0,
      bradfordScore: 0,
      mondayPercentage: 0,
      fridayPercentage: 0,
      singleDaySpellPercentage: 0,
    };
  }

  const spells = approvedRequests.length;
  let totalDays = 0;
  let mondayCount = 0;
  let fridayCount = 0;
  let singleDaySpells = 0;

  approvedRequests.forEach((request) => {
    const days = calculateDays(request.start_date, request.end_date);
    totalDays += days;

    if (days === 1) {
      singleDaySpells++;
    }

    // Check each day in the request for Monday/Friday
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 1) mondayCount++;
      if (dayOfWeek === 5) fridayCount++;
    }
  });

  // Bradford Score = S² × D
  const bradfordScore = spells * spells * totalDays;

  return {
    totalDays,
    spells,
    bradfordScore,
    mondayPercentage: totalDays > 0 ? (mondayCount / totalDays) * 100 : 0,
    fridayPercentage: totalDays > 0 ? (fridayCount / totalDays) * 100 : 0,
    singleDaySpellPercentage: spells > 0 ? (singleDaySpells / spells) * 100 : 0,
  };
}

// Calculate projected metrics if a new request is approved
export function calculateProjectedMetrics(
  currentRequests: SickRequest[],
  newStartDate: string,
  newEndDate: string
): SicknessMetrics {
  const projectedRequests: SickRequest[] = [
    ...currentRequests.filter((r) => r.status === "approved"),
    {
      id: "projected",
      start_date: newStartDate,
      end_date: newEndDate,
      status: "approved",
    },
  ];

  return calculateSicknessMetrics(projectedRequests);
}

// Detect patterns and generate warnings
export function detectPatterns(
  currentMetrics: SicknessMetrics,
  projectedMetrics: SicknessMetrics,
  thresholds: { low: number; medium: number; alert: number }
): PatternWarning[] {
  const warnings: PatternWarning[] = [];

  // Monday pattern (> 30%)
  if (projectedMetrics.mondayPercentage > 30) {
    warnings.push({
      type: "monday",
      severity: projectedMetrics.mondayPercentage > 50 ? "warning" : "info",
      message: "High Monday absences detected",
      detail: `${Math.round(projectedMetrics.mondayPercentage)}% of your sick days fall on Mondays. This pattern is typically reviewed by HR.`,
    });
  }

  // Friday pattern (> 30%)
  if (projectedMetrics.fridayPercentage > 30) {
    warnings.push({
      type: "friday",
      severity: projectedMetrics.fridayPercentage > 50 ? "warning" : "info",
      message: "High Friday absences detected",
      detail: `${Math.round(projectedMetrics.fridayPercentage)}% of your sick days fall on Fridays. This pattern is typically reviewed by HR.`,
    });
  }

  // Frequent single-day absences (> 60% of spells are single days)
  if (projectedMetrics.singleDaySpellPercentage > 60 && projectedMetrics.spells >= 3) {
    warnings.push({
      type: "single_day",
      severity: "info",
      message: "Frequent single-day absences",
      detail: `${Math.round(projectedMetrics.singleDaySpellPercentage)}% of your sick leave spells are single days. Multiple short absences may trigger a welfare check-in.`,
    });
  }

  // Bradford Score thresholds
  if (projectedMetrics.bradfordScore >= thresholds.alert) {
    warnings.push({
      type: "bradford",
      severity: "critical",
      message: "High Bradford Score - will trigger automatic reporting",
      detail: `Your Bradford Score will be ${projectedMetrics.bradfordScore} (threshold: ${thresholds.alert}). This will automatically notify your manager for a welfare discussion.`,
    });
  } else if (projectedMetrics.bradfordScore >= thresholds.medium) {
    warnings.push({
      type: "bradford",
      severity: "warning",
      message: "Elevated Bradford Score",
      detail: `Your Bradford Score will be ${projectedMetrics.bradfordScore}. Approaching the reporting threshold of ${thresholds.alert}.`,
    });
  } else if (projectedMetrics.bradfordScore >= thresholds.low) {
    warnings.push({
      type: "bradford",
      severity: "info",
      message: "Bradford Score tracking",
      detail: `Your Bradford Score will be ${projectedMetrics.bradfordScore}. Monitored for attendance patterns.`,
    });
  }

  // Multiple spells warning
  if (projectedMetrics.spells >= 4) {
    warnings.push({
      type: "spells",
      severity: "warning",
      message: "Multiple absence spells this year",
      detail: `This will be your ${projectedMetrics.spells}${getOrdinalSuffix(projectedMetrics.spells)} separate absence spell. Multiple spells may prompt a return-to-work conversation.`,
    });
  } else if (projectedMetrics.spells === 3) {
    warnings.push({
      type: "spells",
      severity: "info",
      message: "Third absence spell this year",
      detail: "This will be your 3rd separate absence spell. Frequent separate absences are reviewed under attendance policy.",
    });
  }

  return warnings;
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
