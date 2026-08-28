import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DEFAULT_SERVICE_TIERS,
  calculateYearsOfService,
  getServiceTier,
  calculateProRataAllowance,
  getServiceInfo,
} from './service-tier-helpers';

// These decide how many days of annual leave someone is entitled to, so an
// off-by-one at a tier boundary hands out — or withholds — a real day.

afterEach(() => {
  vi.useRealTimers();
});

describe('DEFAULT_SERVICE_TIERS', () => {
  it('covers every length of service with no gap and no overlap', () => {
    const sorted = [...DEFAULT_SERVICE_TIERS].sort((a, b) => a.min_years - b.min_years);
    expect(sorted[0].min_years).toBe(0);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      expect(current.max_years).not.toBeNull();
      // Each tier must hand straight over to the next.
      expect(next.min_years).toBe((current.max_years as number) + 1);
    }

    // The last tier is open-ended, so nobody falls off the end.
    expect(sorted[sorted.length - 1].max_years).toBeNull();
  });

  it('never reduces someone\'s allowance as service grows', () => {
    const sorted = [...DEFAULT_SERVICE_TIERS].sort((a, b) => a.min_years - b.min_years);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].base_annual_leave).toBeGreaterThanOrEqual(sorted[i - 1].base_annual_leave);
    }
  });

  it('starts at the statutory-plus baseline of 22 days', () => {
    expect(sortedFirst().base_annual_leave).toBe(22);
  });

  function sortedFirst() {
    return [...DEFAULT_SERVICE_TIERS].sort((a, b) => a.min_years - b.min_years)[0];
  }
});

describe('getServiceTier', () => {
  const tiers = DEFAULT_SERVICE_TIERS;

  it('places each of the first nine years in its own tier', () => {
    expect(getServiceTier(0, tiers)?.tier_name).toBe('Ivory Essence');
    expect(getServiceTier(1, tiers)?.tier_name).toBe('Golden Dawn');
    expect(getServiceTier(4, tiers)?.tier_name).toBe('Emerald Crown');
    expect(getServiceTier(8, tiers)?.tier_name).toBe('Prismatic Crown');
  });

  it('groups years 9 to 14 together', () => {
    expect(getServiceTier(9, tiers)?.tier_name).toBe('Yin Yang Balance');
    expect(getServiceTier(12, tiers)?.tier_name).toBe('Yin Yang Balance');
    expect(getServiceTier(14, tiers)?.tier_name).toBe('Yin Yang Balance');
  });

  it('promotes at exactly 15 years and stays there', () => {
    expect(getServiceTier(14, tiers)?.tier_name).toBe('Yin Yang Balance');
    expect(getServiceTier(15, tiers)?.tier_name).toBe('Obsidian Elite');
    expect(getServiceTier(40, tiers)?.tier_name).toBe('Obsidian Elite');
  });

  it('awards the expected allowance at each boundary', () => {
    expect(getServiceTier(3, tiers)?.base_annual_leave).toBe(22);
    expect(getServiceTier(4, tiers)?.base_annual_leave).toBe(23);
    expect(getServiceTier(5, tiers)?.base_annual_leave).toBe(24);
    expect(getServiceTier(9, tiers)?.base_annual_leave).toBe(28);
    expect(getServiceTier(15, tiers)?.base_annual_leave).toBe(33);
  });

  it('falls back to the lowest tier for a nonsensical negative value', () => {
    expect(getServiceTier(-1, tiers)?.tier_name).toBe('Ivory Essence');
  });

  it('returns null when given no tiers at all', () => {
    expect(getServiceTier(5, [])).toBeNull();
  });
});

describe('calculateYearsOfService', () => {
  it('counts completed years, not started ones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));

    expect(calculateYearsOfService('2026-08-24')).toBe(0); // a day in
    expect(calculateYearsOfService('2025-08-26')).toBe(0); // a day short of a year
    expect(calculateYearsOfService('2025-08-25')).toBe(1); // exactly a year
    expect(calculateYearsOfService('2016-08-25')).toBe(10);
  });

  it('accepts a Date as well as a string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));
    expect(calculateYearsOfService(new Date('2020-08-25'))).toBe(6);
  });
});

describe('calculateProRataAllowance', () => {
  // A leave year running 1 Jan to 31 Dec 2026 — 365 days.
  const leaveYearStart = new Date(2026, 0, 1);

  it('gives the full allowance to someone who started before the leave year', () => {
    expect(calculateProRataAllowance(new Date(2020, 5, 1), 28, leaveYearStart)).toBe(28);
  });

  it('gives the full allowance to someone who started on day one', () => {
    expect(calculateProRataAllowance(new Date(2026, 0, 1), 28, leaveYearStart)).toBe(28);
  });

  it('halves the allowance for a start at the midpoint', () => {
    // 1 July leaves 184 of 365 days, so 28 * 184/365 = 14.1, rounding to 14.
    expect(calculateProRataAllowance(new Date(2026, 6, 1), 28, leaveYearStart)).toBe(14);
  });

  it('gives almost nothing to someone starting on the last day', () => {
    expect(calculateProRataAllowance(new Date(2026, 11, 31), 28, leaveYearStart)).toBe(0);
  });

  it('gives nothing for a start beyond the leave year', () => {
    expect(calculateProRataAllowance(new Date(2027, 5, 1), 28, leaveYearStart)).toBe(0);
  });

  it('never exceeds the base allowance', () => {
    for (const month of [0, 3, 6, 9, 11]) {
      const result = calculateProRataAllowance(new Date(2026, month, 15), 22, leaveYearStart);
      expect(result).toBeLessThanOrEqual(22);
      expect(result).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getServiceInfo', () => {
  it('falls back to the baseline when there is no start date on record', () => {
    const info = getServiceInfo(null, DEFAULT_SERVICE_TIERS);
    expect(info.yearsOfService).toBe(0);
    expect(info.accruedLeave).toBe(22);
    expect(info.proRataAllowance).toBe(22);
    expect(info.tier?.tier_name).toBe('Ivory Essence');
  });

  it('returns the full allowance when no leave year is supplied', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));

    const info = getServiceInfo('2020-01-01', DEFAULT_SERVICE_TIERS);
    expect(info.yearsOfService).toBe(6);
    expect(info.tier?.tier_name).toBe('Amethyst Reign');
    expect(info.accruedLeave).toBe(25);
    expect(info.proRataAllowance).toBe(25);
  });

  it('pro-rates a mid-year joiner', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));

    const info = getServiceInfo('2026-07-01', DEFAULT_SERVICE_TIERS, new Date(2026, 0, 1));
    expect(info.yearsOfService).toBe(0);
    expect(info.accruedLeave).toBe(22);
    expect(info.proRataAllowance).toBeLessThan(22);
    expect(info.proRataAllowance).toBeGreaterThan(0);
  });
});
