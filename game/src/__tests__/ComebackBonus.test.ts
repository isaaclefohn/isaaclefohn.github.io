/**
 * Characterization tests for src/game/rewards/ComebackBonus.ts
 *
 * Pure, no React, no storage, no imports. Locks the day-bucketed comeback
 * reward tiers and the "not away long enough" / null guards.
 *
 * `getComebackReward` reads `new Date()` (now) and `new Date(lastPlayDate)`
 * with no injection point, so we freeze the system clock and feed explicit
 * ISO timestamps to make `daysAway = floor(diffMs / 86400000)` deterministic.
 * Testability gap noted in the report.
 */

import { getComebackReward } from '../game/rewards/ComebackBonus';

const DAY = 24 * 60 * 60 * 1000;
const NOW_ISO = '2026-06-15T12:00:00.000Z';

/** ISO timestamp for `days` (may be fractional) before the frozen now. */
function daysAgo(days: number): string {
  return new Date(Date.parse(NOW_ISO) - days * DAY).toISOString();
}

describe('getComebackReward', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null when there is no recorded last-play date', () => {
    expect(getComebackReward(null)).toBeNull();
  });

  it('returns null when the player played today (0 days away)', () => {
    expect(getComebackReward(daysAgo(0))).toBeNull();
  });

  it('returns null at 1 day away (under the 2-day minimum)', () => {
    expect(getComebackReward(daysAgo(1))).toBeNull();
  });

  it('returns null just under 2 full days (floor keeps daysAway at 1)', () => {
    expect(getComebackReward(daysAgo(1.99))).toBeNull();
  });

  it('grants the 2-day reward exactly at 2 days (boundary, no power-up)', () => {
    expect(getComebackReward(daysAgo(2))).toEqual({
      coins: 25,
      gems: 0,
      message: 'Welcome back! Here are some bonus coins!',
      daysAway: 2,
    });
  });

  it('still grants the 2-day reward at 2.99 days (just under the 3-day tier)', () => {
    const r = getComebackReward(daysAgo(2.99));
    expect(r?.daysAway).toBe(2);
    expect(r?.coins).toBe(25);
    expect(r?.powerUp).toBeUndefined();
  });

  it('grants the 3-day reward exactly at 3 days', () => {
    expect(getComebackReward(daysAgo(3))).toEqual({
      coins: 50,
      gems: 2,
      powerUp: { type: 'bomb', count: 1 },
      message: "Good to see you again! Here's a bonus!",
      daysAway: 3,
    });
  });

  it('grants the 7-day reward exactly at 7 days', () => {
    expect(getComebackReward(daysAgo(7))).toEqual({
      coins: 100,
      gems: 5,
      powerUp: { type: 'bomb', count: 2 },
      message: "Welcome back! Here's a gift to get you started!",
      daysAway: 7,
    });
  });

  it('grants the 14-day reward exactly at 14 days', () => {
    expect(getComebackReward(daysAgo(14))).toEqual({
      coins: 200,
      gems: 10,
      powerUp: { type: 'bomb', count: 3 },
      message: "We've missed you! Here's a big welcome back gift!",
      daysAway: 14,
    });
  });

  it('caps at the 14-day tier for very long absences but reports true daysAway', () => {
    const r = getComebackReward(daysAgo(365));
    expect(r?.coins).toBe(200);
    expect(r?.gems).toBe(10);
    expect(r?.daysAway).toBe(365);
  });

  it('rewards scale monotonically up the day tiers', () => {
    const two = getComebackReward(daysAgo(2))!;
    const three = getComebackReward(daysAgo(3))!;
    const seven = getComebackReward(daysAgo(7))!;
    const fourteen = getComebackReward(daysAgo(14))!;
    expect(three.coins).toBeGreaterThan(two.coins);
    expect(seven.coins).toBeGreaterThan(three.coins);
    expect(fourteen.coins).toBeGreaterThan(seven.coins);
  });

  it('returns null for a future last-play date (negative daysAway)', () => {
    // A corrupted/clock-skewed future timestamp floors to a negative
    // daysAway, which is < 2, so no reward is granted.
    expect(getComebackReward(daysAgo(-5))).toBeNull();
  });
});
