/**
 * Calculate the current leave year start and end dates based on settings
 */
export function getLeaveYearDates(startMonth: number, startDay: number) {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Create this year's start date
  const thisYearStart = new Date(currentYear, startMonth - 1, startDay);
  
  if (today >= thisYearStart) {
    // Current period: thisYearStart to next year's start - 1 day
    const endDate = new Date(currentYear + 1, startMonth - 1, startDay);
    endDate.setDate(endDate.getDate() - 1);
    return {
      start: thisYearStart,
      end: endDate,
      year: currentYear
    };
  } else {
    // Current period: last year's start to this year's start - 1 day
    const lastYearStart = new Date(currentYear - 1, startMonth - 1, startDay);
    const endDate = new Date(thisYearStart);
    endDate.setDate(endDate.getDate() - 1);
    return {
      start: lastYearStart,
      end: endDate,
      year: currentYear - 1
    };
  }
}

/**
 * Format leave year dates for display
 */
export function formatLeaveYearPeriod(startMonth: number, startDay: number): string {
  const { start, end } = getLeaveYearDates(startMonth, startDay);
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-GB', formatOptions)} - ${end.toLocaleDateString('en-GB', formatOptions)}`;
}

/**
 * Get month names for dropdown
 */
export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

/**
 * Get days for a given month (accounts for February)
 */
export function getDaysInMonth(month: number): number[] {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonth[month - 1];
  return Array.from({ length: maxDays }, (_, i) => i + 1);
}
