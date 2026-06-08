import { describe, it, expect } from 'vitest';
import { dayKey } from './dayKey';

describe('dayKey', () => {
  it('formats a date as local YYYY-MM-DD', () => {
    // Local components, padded. Build a date in local time to avoid UTC drift.
    const d = new Date(2026, 5, 8, 6, 30); // 2026-06-08 06:30 local (month is 0-based)
    expect(dayKey(d)).toBe('2026-06-08');
  });

  it('zero-pads single-digit month and day', () => {
    const d = new Date(2026, 0, 3, 23, 59);
    expect(dayKey(d)).toBe('2026-01-03');
  });

  it('uses LOCAL day, not UTC (no mid-evening rollover)', () => {
    // 11pm local on the 8th is still the 8th locally, even if UTC has ticked over.
    const d = new Date(2026, 5, 8, 23, 0);
    expect(dayKey(d)).toBe('2026-06-08');
  });
});
