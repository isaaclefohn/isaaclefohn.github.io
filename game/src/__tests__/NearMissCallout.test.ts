/**
 * Pure-function coverage for the near-miss gate.
 *
 * The callout has high emotional stakes — fire too often and it
 * loses meaning; fire too rarely and a real "so close" moment goes
 * unrewarded. The 85% threshold is the load-bearing constant; this
 * test file pins its boundary so a future "let's make it 70%"
 * decision is intentional, not an accident.
 */

import { isNearMiss, NEAR_MISS_THRESHOLD } from '../utils/nearMiss';

describe('isNearMiss', () => {
  it('returns false when the player has no best score on record', () => {
    // best === 0 is the first-run case. Showing "0 points from your
    // best" would be both nonsensical AND demotivating to a brand-
    // new player.
    expect(isNearMiss(100, 0)).toBe(false);
    expect(isNearMiss(0, 0)).toBe(false);
  });

  it('returns false when the player BEAT their best (celebration, different emotion)', () => {
    // A new-best run gets handled by the existing "New best!"
    // affordance. The callout would feel weird ("so close" when
    // they actually went past) — different dopamine moment.
    expect(isNearMiss(1500, 1000)).toBe(false);
    expect(isNearMiss(1001, 1000)).toBe(false);
    expect(isNearMiss(1000, 1000)).toBe(false); // tie also handled separately
  });

  it('returns false below the 85% threshold (not close enough)', () => {
    // The gate is the difference between "you almost did it!" and
    // "you played a normal run." Below 85% it would dilute every
    // run; the callout works by being scarce.
    expect(isNearMiss(800, 1000)).toBe(false); // 80%
    expect(isNearMiss(0, 1000)).toBe(false);
    expect(isNearMiss(849, 1000)).toBe(false); // 84.9%
  });

  it('returns true exactly AT the 85% threshold (inclusive boundary)', () => {
    expect(isNearMiss(850, 1000)).toBe(true); // 85.0%
  });

  it('returns true throughout the near-miss band (85% to 99.something%)', () => {
    expect(isNearMiss(900, 1000)).toBe(true); // 90%
    expect(isNearMiss(950, 1000)).toBe(true); // 95%
    expect(isNearMiss(999, 1000)).toBe(true); // 99.9% — the most agonizing case
  });

  it('handles real-world best scores correctly', () => {
    // Mid-game zen run with best=12500, current=11200 → 89.6% → near miss
    expect(isNearMiss(11200, 12500)).toBe(true);
    // High-end run with best=100000, current=82000 → 82% → no callout
    expect(isNearMiss(82000, 100000)).toBe(false);
    // Tiny score range where every point matters
    expect(isNearMiss(85, 100)).toBe(true);
    expect(isNearMiss(84, 100)).toBe(false);
  });

  it('exports the threshold constant for downstream callers', () => {
    // Pinning the constant value so a future change is intentional.
    expect(NEAR_MISS_THRESHOLD).toBe(0.85);
  });
});
