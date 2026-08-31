// Leave-day maths — the ONE place in this repo that knows how a leave
// request's day count is computed:
//
//   * WORKING days only (Stacey's beta item 5: a 16-calendar-day span with
//     12 working days must charge 12, not 16). Working day = Mon–Fri and not
//     an England & Wales bank holiday.
//   * A half day (leave_requests.day_part 'am'/'pm') counts 0.5 of a working
//     day — and 0 if the single date falls on a weekend/bank holiday.
//   * Rows fetched before the 2026-08-17 migration (or before the generated
//     types are regenerated) may not carry day_part at all: null/undefined is
//     always treated as 'full'.

export type LeaveDayPart = "full" | "am" | "pm";

export interface LeaveDaySpan {
  start_date: string;
  end_date: string;
  // Optional so pre-migration rows (and not-yet-regenerated types) still fit.
  day_part?: LeaveDayPart | null;
}

// England & Wales bank holidays, 2024–2030 fixture.
// KEEP IN SYNC with the identical list in
// hive-vault-guard/src/lib/leaveDays.ts (the two apps share the Hive DB, so a
// request must count the same number of days in both) and, for 2024–2027,
// with the display list in hive-vault-guard/src/lib/ukBankHolidays.ts.
// One-off holidays (coronations, jubilees) must be added here by hand.
const ENGLAND_WALES_BANK_HOLIDAYS: readonly string[] = [
  // 2024
  "2024-01-01", "2024-03-29", "2024-04-01", "2024-05-06", "2024-05-27", "2024-08-26", "2024-12-25", "2024-12-26",
  // 2025
  "2025-01-01", "2025-04-18", "2025-04-21", "2025-05-05", "2025-05-26", "2025-08-25", "2025-12-25", "2025-12-26",
  // 2026 (Boxing Day substitute: 26th is a Saturday)
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  // 2027 (Christmas + Boxing Day substitutes: 25th/26th fall Sat/Sun)
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
  // 2028 (New Year substitute: 1 Jan is a Saturday)
  "2028-01-03", "2028-04-14", "2028-04-17", "2028-05-01", "2028-05-29", "2028-08-28", "2028-12-25", "2028-12-26",
  // 2029
  "2029-01-01", "2029-03-30", "2029-04-02", "2029-05-07", "2029-05-28", "2029-08-27", "2029-12-25", "2029-12-26",
  // 2030
  "2030-01-01", "2030-04-19", "2030-04-22", "2030-05-06", "2030-05-27", "2030-08-26", "2030-12-25", "2030-12-26",
];

const BANK_HOLIDAY_SET = new Set<string>(ENGLAND_WALES_BANK_HOLIDAYS);

const DAY_MS = 86400000;

// UTC-anchored so the count never shifts with the viewer's timezone.
function toUtc(isoDate: string): number {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).getTime();
}

function isoOf(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

// Mon–Fri and not an England & Wales bank holiday.
export function isWorkingDay(isoDate: string): boolean {
  const day = isoDate.slice(0, 10);
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !BANK_HOLIDAY_SET.has(day);
}

// Working days in an inclusive date span (Mon–Fri minus bank holidays).
export function workingDaysInclusive(start: string, end: string): number {
  const s = toUtc(start);
  const e = toUtc(end);
  let n = 0;
  for (let t = s; t <= e; t += DAY_MS) {
    if (isWorkingDay(isoOf(t))) n += 1;
  }
  return n;
}

export function isHalfDay(r: Pick<LeaveDaySpan, "day_part">): boolean {
  return r.day_part === "am" || r.day_part === "pm";
}

// Whole-day inclusive calendar span (end − start + 1). Date-span maths only —
// for a leave request's day count use requestDays, which counts working days.
export function calendarDaysInclusive(start: string, end: string): number {
  return Math.max(0, Math.round((toUtc(end) - toUtc(start)) / DAY_MS)) + 1;
}

// Day count for a leave request: WORKING days only. A half day (am/pm,
// single-date by definition) is 0.5 of a working day — 0 if that date is a
// weekend or bank holiday. null/undefined day_part = 'full'.
export function requestDays(r: LeaveDaySpan): number {
  if (isHalfDay(r)) return isWorkingDay(r.start_date) ? 0.5 : 0;
  return workingDaysInclusive(r.start_date, r.end_date);
}

// "½ day (morning)" / "½ day (afternoon)" for halves, null for full days —
// lets callers keep their own whole-day rendering.
export function halfDayLabel(r: Pick<LeaveDaySpan, "day_part">): string | null {
  if (r.day_part === "am") return "½ day (morning)";
  if (r.day_part === "pm") return "½ day (afternoon)";
  return null;
}

// Full human label: "½ day (morning)" / "2 working days" / "1 working day".
export function formatRequestDays(r: LeaveDaySpan): string {
  const half = halfDayLabel(r);
  if (half) return half;
  const d = workingDaysInclusive(r.start_date, r.end_date);
  return `${d} working day${d === 1 ? "" : "s"}`;
}
