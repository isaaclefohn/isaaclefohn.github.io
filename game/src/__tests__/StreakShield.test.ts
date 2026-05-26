import {
  applyStreakShield,
  MAX_STREAK_SHIELDS,
  SHIELD_GRANT_INTERVAL,
} from '../game/engine/streakShield';

// Calendar helpers — keep dates as plain YYYY-MM-DD strings so tests read
// naturally and match the store's date format exactly.
const YESTERDAY = '2026-05-24';
const TODAY = '2026-05-25';
const TWO_DAYS_AGO = '2026-05-23';
const THREE_DAYS_AGO = '2026-05-22';

describe('streak shield — loss-aversion clamp', () => {
  it('is a no-op when the player already played today', () => {
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: TODAY,
      currentStreak: 4,
      streakShields: 1,
    });
    expect(result.newStreak).toBe(4);
    expect(result.newShields).toBe(1);
    expect(result.shieldConsumed).toBe(false);
    expect(result.shieldGranted).toBe(false);
  });

  it('starts the streak at 1 on first ever play', () => {
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: null,
      currentStreak: 0,
      streakShields: 0,
    });
    expect(result.newStreak).toBe(1);
  });

  it('continues the streak naturally when played yesterday', () => {
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: YESTERDAY,
      currentStreak: 3,
      streakShields: 0,
    });
    expect(result.newStreak).toBe(4);
    expect(result.shieldConsumed).toBe(false);
    expect(result.shieldGranted).toBe(false);
  });

  it('resets the streak when a single day is missed with NO shield', () => {
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: TWO_DAYS_AGO,
      currentStreak: 7,
      streakShields: 0,
    });
    expect(result.newStreak).toBe(1);
    expect(result.shieldConsumed).toBe(false);
  });

  it('CONSUMES a shield to save the streak on a single-day miss', () => {
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: TWO_DAYS_AGO,
      currentStreak: 7,
      streakShields: 1,
    });
    expect(result.newStreak).toBe(8);
    expect(result.newShields).toBe(0);
    expect(result.shieldConsumed).toBe(true);
  });

  it('does NOT save a multi-day absence even with a shield (gap >= 3)', () => {
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: THREE_DAYS_AGO,
      currentStreak: 7,
      streakShields: 1,
    });
    expect(result.newStreak).toBe(1);
    expect(result.shieldConsumed).toBe(false);
    // Shield is preserved — wasn't burned on a real-churn absence.
    expect(result.newShields).toBe(1);
  });

  it('GRANTS a shield when streak crosses a multiple of the grant interval', () => {
    // 4 → 5 (the canonical D5 grant per the addiction research)
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: YESTERDAY,
      currentStreak: SHIELD_GRANT_INTERVAL - 1,
      streakShields: 0,
    });
    expect(result.newStreak).toBe(SHIELD_GRANT_INTERVAL);
    expect(result.newShields).toBe(MAX_STREAK_SHIELDS);
    expect(result.shieldGranted).toBe(true);
  });

  it('does NOT double-grant when shield slot is already full', () => {
    // 4 → 5, but player already holds a shield.
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: YESTERDAY,
      currentStreak: SHIELD_GRANT_INTERVAL - 1,
      streakShields: MAX_STREAK_SHIELDS,
    });
    expect(result.newStreak).toBe(SHIELD_GRANT_INTERVAL);
    expect(result.newShields).toBe(MAX_STREAK_SHIELDS);
    expect(result.shieldGranted).toBe(false);
  });

  it('grants again at the next milestone after consumption', () => {
    // Player hits streak 10 (next milestone after consuming one at 5/6/etc).
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: YESTERDAY,
      currentStreak: 9,
      streakShields: 0,
    });
    expect(result.newStreak).toBe(10);
    expect(result.shieldGranted).toBe(true);
    expect(result.newShields).toBe(MAX_STREAK_SHIELDS);
  });

  it('does NOT grant on a reset (streak going to 1 is not a milestone)', () => {
    const result = applyStreakShield({
      today: TODAY,
      lastPlayDate: THREE_DAYS_AGO,
      currentStreak: 12,
      streakShields: 0,
    });
    expect(result.newStreak).toBe(1);
    expect(result.shieldGranted).toBe(false);
  });
});
