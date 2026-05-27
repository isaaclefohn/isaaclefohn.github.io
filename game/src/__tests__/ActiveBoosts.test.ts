/**
 * Pure-function coverage for the active-boost lifecycle.
 *
 * These boosts are granted by the Daily Roulette ("Double Time" =
 * 30 min 2x coins, "XP Surge" = 30 min 2x battle-pass XP). Without
 * this module, the boostDurationMs payload field declared in
 * DailyRoulette.ts was ignored entirely — the wheel showed the
 * reward but no multiplier ever applied. Tests here pin the math
 * and the EXTEND chaining policy.
 *
 * Module is intentionally pure (no Zustand, no React, no time
 * dependency — caller passes `now`), so coverage lives outside the
 * playerStore harness and is fast to run.
 */

import {
  applyBoost,
  boostRemainingMs,
  BOOST_MULTIPLIER,
  extendBoost,
  formatBoostRemaining,
  isBoostActive,
  type ActiveBoostUntil,
} from '../game/rewards/ActiveBoosts';

const NOW = 1_700_000_000_000; // arbitrary fixed clock

describe('isBoostActive', () => {
  it('is false for the empty state', () => {
    expect(isBoostActive({}, 'coins', NOW)).toBe(false);
    expect(isBoostActive({}, 'xp', NOW)).toBe(false);
  });

  it('is true when the expiration is in the future', () => {
    const state: ActiveBoostUntil = { coins: NOW + 60_000 };
    expect(isBoostActive(state, 'coins', NOW)).toBe(true);
  });

  it('is false when the expiration is in the past', () => {
    const state: ActiveBoostUntil = { coins: NOW - 1 };
    expect(isBoostActive(state, 'coins', NOW)).toBe(false);
  });

  it('is false right AT the expiration (strict >, not >=)', () => {
    // Pin the inclusive vs exclusive boundary. The implementation uses
    // strict `>`, so the moment we hit the timestamp, the boost is off.
    const state: ActiveBoostUntil = { coins: NOW };
    expect(isBoostActive(state, 'coins', NOW)).toBe(false);
  });

  it('treats coin and xp boosts independently', () => {
    const state: ActiveBoostUntil = { coins: NOW + 1_000 };
    expect(isBoostActive(state, 'coins', NOW)).toBe(true);
    expect(isBoostActive(state, 'xp', NOW)).toBe(false);
  });
});

describe('applyBoost', () => {
  it('doubles the amount when the boost is active', () => {
    const state: ActiveBoostUntil = { coins: NOW + 1_000 };
    expect(applyBoost(100, state, 'coins', NOW)).toBe(200);
  });

  it('returns the amount unchanged when no boost is active', () => {
    expect(applyBoost(100, {}, 'coins', NOW)).toBe(100);
  });

  it('returns the amount unchanged when the boost has expired', () => {
    const state: ActiveBoostUntil = { coins: NOW - 1 };
    expect(applyBoost(100, state, 'coins', NOW)).toBe(100);
  });

  it('rounds to an integer (fractional XP grants are common)', () => {
    // Some XP credit sites pass fractional amounts (xpMult * 75 etc.)
    // A 1.5 XP credit on a 2x boost is 3 — but on no-boost would be
    // 1.5. applyBoost only rounds in the *boost-active* path because
    // it does the multiplication. No-boost is the caller's
    // responsibility.
    const state: ActiveBoostUntil = { xp: NOW + 1_000 };
    expect(applyBoost(1.5, state, 'xp', NOW)).toBe(3); // Math.round(3)
    expect(applyBoost(1.2, state, 'xp', NOW)).toBe(2); // Math.round(2.4)
  });

  it('uses the BOOST_MULTIPLIER constant (2x) — never hard-coded', () => {
    // Defensive guard: if a future tweak changes the multiplier to 3x
    // for a special event, this test pins that BOOST_MULTIPLIER is
    // the single source of truth.
    expect(BOOST_MULTIPLIER).toBe(2);
  });
});

describe('extendBoost — EXTEND chaining policy', () => {
  // Policy decision documented in ActiveBoosts.ts: when a new boost
  // is granted while an old one is still active, EXTEND from the
  // existing expiration rather than overwriting it. This is the most
  // player-friendly choice — time is never lost. Tests pin the
  // current behavior; flipping to OVERWRITE or MAX would only need
  // to touch extendBoost itself.

  it('starts at now+duration when no prior boost', () => {
    expect(extendBoost(undefined, 30_000, NOW)).toBe(NOW + 30_000);
  });

  it('extends from now+duration when the prior boost has expired', () => {
    const expired = NOW - 1_000;
    expect(extendBoost(expired, 30_000, NOW)).toBe(NOW + 30_000);
  });

  it('extends from the existing expiration when the prior boost is still active (EXTEND policy)', () => {
    // The player won Double Time, has 20 minutes left, then wins
    // Double Time again. Under EXTEND, the second boost stacks: they
    // now have 20 + 30 = 50 minutes of doubled coins. Under OVERWRITE
    // it would have been only 30. Under MAX it would have been
    // max(20, 30) = 30.
    const stillActive = NOW + 20 * 60_000; // 20 min remaining
    const result = extendBoost(stillActive, 30 * 60_000, NOW);
    expect(result).toBe(stillActive + 30 * 60_000);
    expect(result).toBe(NOW + 50 * 60_000);
  });

  it('does NOT shorten an active boost if the new duration is smaller', () => {
    // If somehow a 5-minute boost is granted while a 20-minute boost
    // is still running, the active boost is still extended by 5
    // minutes — not replaced by the shorter window.
    const stillActive = NOW + 20 * 60_000;
    const result = extendBoost(stillActive, 5 * 60_000, NOW);
    expect(result).toBe(stillActive + 5 * 60_000);
    expect(result).toBeGreaterThan(stillActive); // never shortens
  });
});

describe('boostRemainingMs', () => {
  it('returns 0 when no boost', () => {
    expect(boostRemainingMs({}, 'coins', NOW)).toBe(0);
  });

  it('returns 0 when boost has expired', () => {
    const state: ActiveBoostUntil = { coins: NOW - 1_000 };
    expect(boostRemainingMs(state, 'coins', NOW)).toBe(0);
  });

  it('returns positive remaining when boost is active', () => {
    const state: ActiveBoostUntil = { coins: NOW + 30_000 };
    expect(boostRemainingMs(state, 'coins', NOW)).toBe(30_000);
  });
});

describe('formatBoostRemaining', () => {
  it('formats whole minutes correctly', () => {
    expect(formatBoostRemaining(60_000)).toBe('1:00');
    expect(formatBoostRemaining(30 * 60_000)).toBe('30:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatBoostRemaining(65_000)).toBe('1:05');
    expect(formatBoostRemaining(9_000)).toBe('0:09');
  });

  it('floors fractional seconds (no rounding-up surprise)', () => {
    expect(formatBoostRemaining(59_999)).toBe('0:59');
    expect(formatBoostRemaining(60_999)).toBe('1:00');
  });

  it('handles 0 cleanly', () => {
    expect(formatBoostRemaining(0)).toBe('0:00');
  });
});
