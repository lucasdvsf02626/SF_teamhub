import { describe, it, expect } from 'vitest';
import { calculateDistance, isWithinGeofence, formatDistance } from './geo-helpers';

// Geofencing gates clock-in, so a fault here either lets someone clock in from
// home or blocks someone standing in the car park.

describe('calculateDistance', () => {
  it('is zero for the same point', () => {
    expect(calculateDistance(53.4808, -2.2426, 53.4808, -2.2426)).toBe(0);
  });

  it('matches a known separation', () => {
    // Greenwich Observatory to the Eiffel Tower. The great-circle distance is
    // ~334 km: 2.62 deg of latitude is ~291 km, and 2.30 deg of longitude at
    // 50N is ~164 km, so sqrt(291^2 + 164^2) ~= 334.
    const d = calculateDistance(51.4769, -0.0005, 48.8584, 2.2945);
    expect(d).toBeGreaterThan(333_000);
    expect(d).toBeLessThan(335_000);
  });

  it('is accurate over the short distances a geofence actually uses', () => {
    // One ten-thousandth of a degree of latitude is ~11.1 m anywhere on Earth.
    const d = calculateDistance(53.4808, -2.2426, 53.4809, -2.2426);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(12);
  });

  it('is symmetric', () => {
    const there = calculateDistance(53.4808, -2.2426, 51.5074, -0.1278);
    const back = calculateDistance(51.5074, -0.1278, 53.4808, -2.2426);
    expect(there).toBeCloseTo(back, 6);
  });

  it('handles crossing the equator and the prime meridian', () => {
    expect(calculateDistance(-1, -1, 1, 1)).toBeGreaterThan(0);
    expect(Number.isFinite(calculateDistance(-33.8688, 151.2093, 40.7128, -74.006))).toBe(true);
  });
});

describe('isWithinGeofence', () => {
  const siteLat = 53.4808;
  const siteLng = -2.2426;

  it('admits a point at the site', () => {
    const r = isWithinGeofence(siteLat, siteLng, siteLat, siteLng, 100);
    expect(r.isWithin).toBe(true);
    expect(r.distance).toBe(0);
  });

  it('rejects a point well outside the radius', () => {
    const r = isWithinGeofence(51.5074, -0.1278, siteLat, siteLng, 100);
    expect(r.isWithin).toBe(false);
    expect(r.distance).toBeGreaterThan(100);
  });

  it('treats the boundary as inside', () => {
    // Distance is compared with <=, so a point exactly on the radius counts.
    const d = calculateDistance(siteLat, siteLng, siteLat + 0.0001, siteLng);
    const r = isWithinGeofence(siteLat + 0.0001, siteLng, siteLat, siteLng, d);
    expect(r.isWithin).toBe(true);
  });

  it('rounds the reported distance to whole metres', () => {
    const r = isWithinGeofence(siteLat + 0.0001, siteLng, siteLat, siteLng, 100);
    expect(Number.isInteger(r.distance)).toBe(true);
  });

  it('rejects everything when the radius is zero, except the exact point', () => {
    expect(isWithinGeofence(siteLat, siteLng, siteLat, siteLng, 0).isWithin).toBe(true);
    expect(isWithinGeofence(siteLat + 0.001, siteLng, siteLat, siteLng, 0).isWithin).toBe(false);
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre', () => {
    expect(formatDistance(0)).toBe('0m');
    expect(formatDistance(999)).toBe('999m');
  });

  it('switches to kilometres at a kilometre', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(12345)).toBe('12.3km');
  });
});
