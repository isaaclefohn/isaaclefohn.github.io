/**
 * Characterization tests for src/game/rewards/LoginCalendar.ts
 *
 * Pure, no React, no storage, no imports. Locks the 28-day reward schedule,
 * the per-day reward formula (incl. the big-day and grand-finale branches),
 * and the claim/next-day month-rollover logic.
 *
 * `getCurrentMonthId` / `canClaimCalendarDay` / `getNextClaimableDay` read
 * `new Date()` internally with no injection point, so the month-rollover
 * branch is exercised by passing a deliberately-stale month, and the
 * same-month branch by passing the live month id (read from the function
 * itself under a frozen clock). Testability gap noted in the report.
 */

import {
  getLoginCalendar,
  CalendarDay,
  canClaimCalendarDay,
  getCurrentMonthId,
  getNextClaimableDay,
} from '../game/rewards/LoginCalendar';

describe('getLoginCalendar', () => {
  let cal: CalendarDay[];
  beforeAll(() => {
    cal = getLoginCalendar();
  });

  it('has exactly 28 days numbered 1..28 in order', () => {
    expect(cal).toHaveLength(28);
    expect(cal.map((d) => d.day)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });

  it('marks every 7th day as a big day', () => {
    for (const d of cal) {
      expect(d.isBigDay).toBe(d.day % 7 === 0);
    }
    // explicit boundaries
    expect(cal[6].isBigDay).toBe(true); // day 7
    expect(cal[13].isBigDay).toBe(true); // day 14
    expect(cal[20].isBigDay).toBe(true); // day 21
    expect(cal[27].isBigDay).toBe(true); // day 28 (also % 7 === 0)
  });

  it('marks only day 28 as the grand finale', () => {
    expect(cal.filter((d) => d.isGrandFinale).map((d) => d.day)).toEqual([28]);
  });

  it('every day awards a non-negative coin amount', () => {
    for (const d of cal) {
      expect(d.coins).toBeGreaterThanOrEqual(0);
      expect(d.gems).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses the base coin formula on ordinary (non-big) days', () => {
    // coins = 10 + floor(day / 3) * 5
    expect(cal[0]).toMatchObject({ day: 1, coins: 10, gems: 0 }); // 10 + 0
    expect(cal[1]).toMatchObject({ day: 2, coins: 10 }); // 10 + 0
    expect(cal[2]).toMatchObject({ day: 3, coins: 15 }); // 10 + 5
    expect(cal[5]).toMatchObject({ day: 6, coins: 20 }); // 10 + 10
    expect(cal[26]).toMatchObject({ day: 27, coins: 55 }); // 10 + floor(27/3)*5 = 55
  });

  it('day 7: big day, coins = day*5, gems = 3, no power-up yet', () => {
    expect(cal[6]).toMatchObject({
      day: 7,
      coins: 35, // 7 * 5
      gems: 3, // floor(7/7)*3
      powerUpCount: 0,
      isBigDay: true,
      isGrandFinale: false,
    });
    expect(cal[6].powerUp).toBeUndefined();
  });

  it('day 14: big day with a bomb power-up', () => {
    expect(cal[13]).toMatchObject({
      day: 14,
      coins: 70, // 14 * 5
      gems: 6, // floor(14/7)*3
      powerUp: 'bomb',
      powerUpCount: 1, // floor(14/14)
      isBigDay: true,
      isGrandFinale: false,
    });
  });

  it('day 21: big day with a rowClear power-up', () => {
    expect(cal[20]).toMatchObject({
      day: 21,
      coins: 105, // 21 * 5
      gems: 9, // floor(21/7)*3
      powerUp: 'rowClear',
      powerUpCount: 1, // floor(21/14)
      isBigDay: true,
      isGrandFinale: false,
    });
  });

  it('day 28: grand finale overrides the big-day branch with the premium prize', () => {
    expect(cal[27]).toMatchObject({
      day: 28,
      coins: 250,
      gems: 15,
      powerUp: 'colorClear',
      powerUpCount: 3,
      isBigDay: true,
      isGrandFinale: true,
    });
  });

  it('is a stable, deterministic schedule (no RNG)', () => {
    expect(getLoginCalendar()).toEqual(getLoginCalendar());
  });
});

describe('getCurrentMonthId', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('formats the local year-month as YYYY-MM with zero padding', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 9, 12, 0, 0)); // local Jan 2026
    expect(getCurrentMonthId()).toBe('2026-01');
  });

  it('uses the local month (December boundary)', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 11, 31, 12, 0, 0)); // local Dec 2026
    expect(getCurrentMonthId()).toBe('2026-12');
  });
});

describe('canClaimCalendarDay', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0)); // local June 2026
  });

  it('allows a claim when the stored month differs from the current month (reset)', () => {
    expect(canClaimCalendarDay(1, 27, '1999-01')).toBe(true);
  });

  it('allows a claim when lastClaimedMonth is null (never claimed)', () => {
    expect(canClaimCalendarDay(1, 0, null)).toBe(true);
  });

  it('allows claiming the next sequential day within the same month', () => {
    const month = getCurrentMonthId();
    expect(canClaimCalendarDay(5, 4, month)).toBe(true);
  });

  it('rejects re-claiming the same day within the same month (boundary, not >)', () => {
    const month = getCurrentMonthId();
    expect(canClaimCalendarDay(4, 4, month)).toBe(false);
  });

  it('rejects claiming an earlier day within the same month', () => {
    const month = getCurrentMonthId();
    expect(canClaimCalendarDay(3, 4, month)).toBe(false);
  });
});

describe('getNextClaimableDay', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
  });

  it('resets to day 1 on a new month', () => {
    expect(getNextClaimableDay(27, '1999-01')).toBe(1);
  });

  it('resets to day 1 when never claimed (null month)', () => {
    expect(getNextClaimableDay(0, null)).toBe(1);
  });

  it('advances to lastClaimedDay + 1 within the same month', () => {
    expect(getNextClaimableDay(4, getCurrentMonthId())).toBe(5);
  });

  it('caps the next day at 28 (boundary)', () => {
    expect(getNextClaimableDay(28, getCurrentMonthId())).toBe(28);
  });

  it('caps at 28 even for an out-of-range stored day', () => {
    expect(getNextClaimableDay(99, getCurrentMonthId())).toBe(28);
  });
});
