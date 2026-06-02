/**
 * Characterization tests for src/game/rewards/FreeChest.ts
 *
 * Pure. Locks the 4-hour cooldown math and the seed-deterministic reward
 * roll (coins scale with level + capped at level 100, occasional gems,
 * optional power-up by roll band).
 */

import {
  FREE_CHEST_INTERVAL_MS,
  getFreeChestTimeRemaining,
  isFreeChestReady,
  rollFreeChest,
} from '../game/rewards/FreeChest';

describe('FREE_CHEST_INTERVAL_MS', () => {
  it('is 4 hours', () => {
    expect(FREE_CHEST_INTERVAL_MS).toBe(4 * 60 * 60 * 1000);
  });
});

describe('getFreeChestTimeRemaining', () => {
  it('is 0 (claimable) when never claimed before', () => {
    expect(getFreeChestTimeRemaining(null, 1000)).toBe(0);
  });

  it('is the full interval immediately after a claim', () => {
    expect(getFreeChestTimeRemaining(1000, 1000)).toBe(FREE_CHEST_INTERVAL_MS);
  });

  it('counts down as time passes', () => {
    const claimedAt = 0;
    const now = 60 * 60 * 1000; // 1h later
    expect(getFreeChestTimeRemaining(claimedAt, now)).toBe(FREE_CHEST_INTERVAL_MS - now);
  });

  it('clamps to 0 once the interval has fully elapsed', () => {
    expect(getFreeChestTimeRemaining(0, FREE_CHEST_INTERVAL_MS)).toBe(0);
    expect(getFreeChestTimeRemaining(0, FREE_CHEST_INTERVAL_MS + 10_000)).toBe(0);
  });
});

describe('isFreeChestReady', () => {
  it('is ready when never claimed', () => {
    expect(isFreeChestReady(null, 1000)).toBe(true);
  });

  it('is not ready right after claiming', () => {
    expect(isFreeChestReady(1000, 1000)).toBe(false);
  });

  it('is ready exactly at the interval boundary', () => {
    expect(isFreeChestReady(0, FREE_CHEST_INTERVAL_MS)).toBe(true);
  });

  it('is not ready one ms before the boundary', () => {
    expect(isFreeChestReady(0, FREE_CHEST_INTERVAL_MS - 1)).toBe(false);
  });
});

describe('rollFreeChest', () => {
  it('is deterministic for a fixed (level, seed)', () => {
    expect(rollFreeChest(50, 12345)).toEqual(rollFreeChest(50, 12345));
  });

  it('produces the locked reward for level 50, seed 12345', () => {
    expect(rollFreeChest(50, 12345)).toEqual({ coins: 153, gems: 0, powerUp: undefined });
  });

  it('scales the base coin reward with level (level 0 is the floor)', () => {
    expect(rollFreeChest(0, 1)).toEqual({ coins: 37, gems: 0, powerUp: undefined });
  });

  it('caps the level scaling at level 100 (level 500 == level 100)', () => {
    const atCap = rollFreeChest(100, 1);
    const aboveCap = rollFreeChest(500, 1);
    expect(atCap).toEqual(aboveCap);
    expect(atCap.coins).toBe(224);
  });

  it('always returns a non-negative integer coin amount', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = rollFreeChest(37, seed);
      expect(Number.isInteger(r.coins)).toBe(true);
      expect(r.coins).toBeGreaterThanOrEqual(0);
      expect(r.gems).toBeGreaterThanOrEqual(0);
    }
  });

  it('can award gems and a power-up on a lucky seed', () => {
    // seed 5 is a known "lucky" roll (verified deterministically).
    const r = rollFreeChest(50, 5);
    expect(r.gems).toBe(2);
    expect(r.powerUp).toEqual({ type: 'colorClear', count: 1 });
  });

  it('can award nothing extra (no gems, no power-up) on an unlucky seed', () => {
    const r = rollFreeChest(50, 1);
    expect(r.gems).toBe(0);
    expect(r.powerUp).toBeUndefined();
  });

  it('only ever rolls the three documented power-up types', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const pu = rollFreeChest(50, seed).powerUp;
      if (pu) seen.add(pu.type);
    }
    seen.forEach((t) => expect(['bomb', 'rowClear', 'colorClear']).toContain(t));
    // Sanity: across 300 seeds at least one power-up should appear.
    expect(seen.size).toBeGreaterThan(0);
  });
});
