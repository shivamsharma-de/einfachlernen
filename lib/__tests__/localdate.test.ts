import { describe, expect, it } from 'vitest';
import { addDaysLocal, localISODate } from '../localdate';

describe('localISODate', () => {
  it('uses the local calendar date, not the UTC date', () => {
    // 00:30 on 26 Oct in Berlin (UTC+1 on that date) is still 25 Oct in UTC.
    const berlinEarly = new Date(2026, 9, 26, 0, 30); // local-time constructor
    expect(localISODate(berlinEarly)).toBe('2026-10-26');
  });

  it('zero-pads month and day', () => {
    expect(localISODate(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('is stable across the whole local day', () => {
    expect(localISODate(new Date(2026, 9, 26, 0, 0))).toBe('2026-10-26');
    expect(localISODate(new Date(2026, 9, 26, 23, 59))).toBe('2026-10-26');
  });
});

describe('addDaysLocal', () => {
  it('moves across month and year boundaries', () => {
    expect(addDaysLocal(1, new Date(2026, 9, 31, 10))).toBe('2026-11-01');
    expect(addDaysLocal(1, new Date(2026, 11, 31, 10))).toBe('2027-01-01');
  });

  it('goes backwards with a negative offset', () => {
    expect(addDaysLocal(-1, new Date(2026, 2, 1, 10))).toBe('2026-02-28');
  });
});
