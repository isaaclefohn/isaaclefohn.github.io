/**
 * Tests for the rewarded-ad streak-shield refill gate.
 *
 * The store action `addStreakShieldFromAd` wraps `canClaimRewardedShield`
 * for both the up-front gate (UI shows the offer) AND the re-validation
 * after the ad watch (defense in depth). Tests target the pure function
 * directly — the store wrapper is a thin pass-through that requires a
 * Zustand + AsyncStorage harness this jest config doesn't load.
 */

import {
  canClaimRewardedShield,
  MAX_STREAK_SHIELDS,
  REWARDED_SHIELD_COOLDOWN_DAYS,
} from '../game/engine/streakShield';

// Use plain ISO date strings so the math is easy to read.
const TODAY = '2026-06-14';

function daysBefore(today: string, n: number): string {
  const d = new Date(today + 'T00:00:00');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('canClaimRewardedShield', () => {
  it('rejects when there is no streak to protect', () => {
    expect(
      canClaimRewardedShield({
        today: TODAY,
        currentStreak: 0,
        streakShields: 0,
        streakShieldAdLastDate: null,
      }),
    ).toBe(false);
  });

  it('rejects when a shield is already held', () => {
    expect(
      canClaimRewardedShield({
        today: TODAY,
        currentStreak: 3,
        streakShields: MAX_STREAK_SHIELDS,
        streakShieldAdLastDate: null,
      }),
    ).toBe(false);
  });

  it('accepts when streak ≥ 1, no shield, never refilled', () => {
    expect(
      canClaimRewardedShield({
        today: TODAY,
        currentStreak: 1,
        streakShields: 0,
        streakShieldAdLastDate: null,
      }),
    ).toBe(true);
  });

  it('rejects when the throttle is still active (< cooldown days)', () => {
    expect(
      canClaimRewardedShield({
        today: TODAY,
        currentStreak: 3,
        streakShields: 0,
        streakShieldAdLastDate: daysBefore(TODAY, REWARDED_SHIELD_COOLDOWN_DAYS - 1),
      }),
    ).toBe(false);
  });

  it('accepts on the exact cooldown boundary', () => {
    expect(
      canClaimRewardedShield({
        today: TODAY,
        currentStreak: 5,
        streakShields: 0,
        streakShieldAdLastDate: daysBefore(TODAY, REWARDED_SHIELD_COOLDOWN_DAYS),
      }),
    ).toBe(true);
  });

  it('accepts well after the cooldown', () => {
    expect(
      canClaimRewardedShield({
        today: TODAY,
        currentStreak: 12,
        streakShields: 0,
        streakShieldAdLastDate: daysBefore(TODAY, 30),
      }),
    ).toBe(true);
  });

  it('rejects same-day claim (zero days since last refill)', () => {
    // A player who just refilled cannot immediately refill again, even
    // if they spend the shield in the same session (which they can't,
    // since spending requires a date crossing — but belt-and-suspenders).
    expect(
      canClaimRewardedShield({
        today: TODAY,
        currentStreak: 3,
        streakShields: 0,
        streakShieldAdLastDate: TODAY,
      }),
    ).toBe(false);
  });
});
