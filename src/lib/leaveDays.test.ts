import { describe, it, expect } from 'vitest';
import {
  isWorkingDay,
  workingDaysInclusive,
  calendarDaysInclusive,
  isHalfDay,
  requestDays,
  halfDayLabel,
  formatRequestDays,
} from './leaveDays';

// These functions decide how much leave a member of staff is charged, so a
// regression here costs someone real holiday. The bank holiday list is a
// hand-maintained fixture, which is the part most likely to drift.

describe('isWorkingDay', () => {
  it('counts Monday to Friday', () => {
    // 2026-08-24 is a Monday.
    expect(isWorkingDay('2026-08-24')).toBe(true);
    expect(isWorkingDay('2026-08-25')).toBe(true);
    expect(isWorkingDay('2026-08-26')).toBe(true);
    expect(isWorkingDay('2026-08-27')).toBe(true);
    expect(isWorkingDay('2026-08-28')).toBe(true);
  });

  it('excludes weekends', () => {
    expect(isWorkingDay('2026-08-29')).toBe(false); // Saturday
    expect(isWorkingDay('2026-08-30')).toBe(false); // Sunday
  });

  it('excludes bank holidays that fall on a weekday', () => {
    expect(isWorkingDay('2026-08-31')).toBe(false); // Summer bank holiday, a Monday
    expect(isWorkingDay('2026-12-25')).toBe(false); // Christmas Day, a Friday
    expect(isWorkingDay('2026-01-01')).toBe(false); // New Year's Day, a Thursday
  });

  it('handles a full ISO timestamp, not just a date', () => {
    expect(isWorkingDay('2026-08-24T13:45:00Z')).toBe(true);
    expect(isWorkingDay('2026-08-29T13:45:00Z')).toBe(false);
  });
});

describe('workingDaysInclusive', () => {
  it('charges working days, not calendar days', () => {
    // The case named in the source: a 16-calendar-day span with 12 working
    // days must charge 12. 2026-08-03 (Mon) to 2026-08-18 (Tue).
    expect(calendarDaysInclusive('2026-08-03', '2026-08-18')).toBe(16);
    expect(workingDaysInclusive('2026-08-03', '2026-08-18')).toBe(12);
  });

  it('counts a single working day as 1', () => {
    expect(workingDaysInclusive('2026-08-24', '2026-08-24')).toBe(1);
  });

  it('counts a single weekend day as 0', () => {
    expect(workingDaysInclusive('2026-08-29', '2026-08-29')).toBe(0);
  });

  it('counts a plain Monday-to-Friday week as 5', () => {
    expect(workingDaysInclusive('2026-08-24', '2026-08-28')).toBe(5);
  });

  it('drops a bank holiday from the week containing it', () => {
    // Week of the 2026 summer bank holiday (Mon 31 Aug).
    expect(workingDaysInclusive('2026-08-31', '2026-09-04')).toBe(4);
  });

  it('returns 0 when the span is entirely a weekend', () => {
    expect(workingDaysInclusive('2026-08-29', '2026-08-30')).toBe(0);
  });

  it('returns 0 when end precedes start rather than counting backwards', () => {
    expect(workingDaysInclusive('2026-08-28', '2026-08-24')).toBe(0);
  });

  it('spans a year boundary, excluding both Christmas and New Year', () => {
    // 2026-12-24 (Thu) to 2027-01-01 (Fri). Working days: 24th, 29th, 30th,
    // 31st. Excluded: 25th and 28th (holidays), 26th/27th (weekend),
    // 1 Jan 2027 (holiday).
    expect(workingDaysInclusive('2026-12-24', '2027-01-01')).toBe(4);
  });
});

describe('calendarDaysInclusive', () => {
  it('is inclusive of both ends', () => {
    expect(calendarDaysInclusive('2026-08-24', '2026-08-24')).toBe(1);
    expect(calendarDaysInclusive('2026-08-24', '2026-08-25')).toBe(2);
  });

  it('does not go negative when end precedes start', () => {
    expect(calendarDaysInclusive('2026-08-25', '2026-08-24')).toBe(1);
  });
});

describe('isHalfDay', () => {
  it('is true only for am and pm', () => {
    expect(isHalfDay({ day_part: 'am' })).toBe(true);
    expect(isHalfDay({ day_part: 'pm' })).toBe(true);
    expect(isHalfDay({ day_part: 'full' })).toBe(false);
  });

  it('treats a missing day_part as a full day', () => {
    // Rows written before the 2026-08-17 migration have no day_part.
    expect(isHalfDay({ day_part: null })).toBe(false);
    expect(isHalfDay({})).toBe(false);
  });
});

describe('requestDays', () => {
  it('charges half a day for am or pm', () => {
    expect(requestDays({ start_date: '2026-08-24', end_date: '2026-08-24', day_part: 'am' })).toBe(0.5);
    expect(requestDays({ start_date: '2026-08-24', end_date: '2026-08-24', day_part: 'pm' })).toBe(0.5);
  });

  it('charges nothing for a half day on a non-working day', () => {
    expect(requestDays({ start_date: '2026-08-29', end_date: '2026-08-29', day_part: 'am' })).toBe(0);
    expect(requestDays({ start_date: '2026-08-31', end_date: '2026-08-31', day_part: 'pm' })).toBe(0);
  });

  it('falls back to a full-day count when day_part is absent', () => {
    expect(requestDays({ start_date: '2026-08-24', end_date: '2026-08-28' })).toBe(5);
    expect(requestDays({ start_date: '2026-08-24', end_date: '2026-08-28', day_part: null })).toBe(5);
  });
});

describe('labels', () => {
  it('names the half of the day', () => {
    expect(halfDayLabel({ day_part: 'am' })).toBe('½ day (morning)');
    expect(halfDayLabel({ day_part: 'pm' })).toBe('½ day (afternoon)');
    expect(halfDayLabel({ day_part: 'full' })).toBeNull();
  });

  it('singularises a one-day request', () => {
    expect(formatRequestDays({ start_date: '2026-08-24', end_date: '2026-08-24' })).toBe('1 working day');
    expect(formatRequestDays({ start_date: '2026-08-24', end_date: '2026-08-25' })).toBe('2 working days');
  });

  it('prefers the half-day label over a day count', () => {
    expect(formatRequestDays({ start_date: '2026-08-24', end_date: '2026-08-24', day_part: 'am' }))
      .toBe('½ day (morning)');
  });
});

describe('bank holiday fixture', () => {
  // Checked against the England & Wales calendar. Substitute days are the
  // easiest thing to get wrong, so they are asserted explicitly.
  it('uses substitute days when a holiday falls at a weekend', () => {
    expect(isWorkingDay('2026-12-28')).toBe(false); // Boxing Day sub (26th is a Sat)
    expect(isWorkingDay('2027-12-27')).toBe(false); // Christmas sub (25th is a Sat)
    expect(isWorkingDay('2027-12-28')).toBe(false); // Boxing Day sub (26th is a Sun)
    expect(isWorkingDay('2028-01-03')).toBe(false); // New Year sub (1st is a Sat)
  });

  it('places Easter correctly', () => {
    // Easter Sunday 2026 is 5 April, 2027 is 28 March, 2028 is 16 April.
    expect(isWorkingDay('2026-04-03')).toBe(false); // Good Friday
    expect(isWorkingDay('2026-04-06')).toBe(false); // Easter Monday
    expect(isWorkingDay('2027-03-26')).toBe(false);
    expect(isWorkingDay('2027-03-29')).toBe(false);
    expect(isWorkingDay('2028-04-14')).toBe(false);
    expect(isWorkingDay('2028-04-17')).toBe(false);
  });

  it('has no cover beyond 2030 — this test is the reminder', () => {
    // The fixture stops at 2030. Once that year is in sight, extend the list
    // in leaveDays.ts (and the copy in hive-vault-guard) or every 2031 date
    // silently bills staff for holidays they did not take.
    expect(isWorkingDay('2030-12-25')).toBe(false);
    expect(isWorkingDay('2031-12-25')).toBe(true); // wrong in reality, correct for the fixture
  });
});
