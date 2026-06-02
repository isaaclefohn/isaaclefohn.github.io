/**
 * Characterization tests for src/game/rewards/TreasureHunt.ts
 *
 * Pure, no React, no storage, no imports. Locks the reward table invariants,
 * the seeded weighted roll, and the tier->color map.
 *
 * SUSPECTED BUG (negative seed collapses to the lowest reward): rollTreasure
 * computes `rand = ((seed*9301 + 49297) % 233280) / 233280`. JS `%` keeps the
 * dividend's sign, so for any NEGATIVE seed `rand` is negative, `target` is
 * negative, and the first loop iteration (`target -= 50; if (target <= 0)`)
 * always returns TREASURE_REWARDS[0] (common, 100 coins). Across 2000 negative
 * seeds, 2000/2000 return common#1 — no rare/epic/legendary is ever reachable.
 * The roll is still deterministic, so we LOCK that, but we also add a flagged
 * test asserting the CORRECT behavior (negative seeds should distribute across
 * tiers like non-negative seeds do). That test is expected to FAIL. See report.
 */

import {
  TREASURE_REWARDS,
  TreasureReward,
  PIECES_REQUIRED,
  rollTreasure,
  getTreasureTierColor,
} from '../game/rewards/TreasureHunt';

describe('TREASURE_REWARDS table', () => {
  it('has 6 reward entries', () => {
    expect(TREASURE_REWARDS).toHaveLength(6);
  });

  it('every reward has a positive weight', () => {
    for (const r of TREASURE_REWARDS) {
      expect(r.weight).toBeGreaterThan(0);
    }
  });

  it('every reward has non-negative currency and power-up counts', () => {
    for (const r of TREASURE_REWARDS) {
      expect(r.coins).toBeGreaterThanOrEqual(0);
      expect(r.gems).toBeGreaterThanOrEqual(0);
      expect(r.powerUps.bomb).toBeGreaterThanOrEqual(0);
      expect(r.powerUps.rowClear).toBeGreaterThanOrEqual(0);
      expect(r.powerUps.colorClear).toBeGreaterThanOrEqual(0);
    }
  });

  it('weights are descending (rarer tiers are less likely)', () => {
    const weights = TREASURE_REWARDS.map((r) => r.weight);
    const sorted = [...weights].sort((a, b) => b - a);
    expect(weights).toEqual(sorted);
  });

  it('only uses the four documented tiers', () => {
    const tiers = ['common', 'rare', 'epic', 'legendary'];
    for (const r of TREASURE_REWARDS) {
      expect(tiers).toContain(r.tier);
    }
  });
});

describe('PIECES_REQUIRED', () => {
  it('is 5 map pieces', () => {
    expect(PIECES_REQUIRED).toBe(5);
  });
});

describe('rollTreasure', () => {
  it('is deterministic for the same seed', () => {
    expect(rollTreasure(12345)).toEqual(rollTreasure(12345));
  });

  it('always returns a reward that exists in the table', () => {
    for (let seed = 0; seed < 500; seed++) {
      expect(TREASURE_REWARDS).toContainEqual(rollTreasure(seed));
    }
  });

  it('produces the locked reward for a fixed seed (regression snapshot)', () => {
    // seed 1 -> common #1 (verified deterministically).
    expect(rollTreasure(1)).toEqual(TREASURE_REWARDS[0]);
    expect(rollTreasure(1).coins).toBe(100);
  });

  it('seed 0 rolls the first (common) reward', () => {
    expect(rollTreasure(0)).toEqual(TREASURE_REWARDS[0]);
  });

  it('reaches every tier across a wide non-negative seed sweep', () => {
    const tiers = new Set<TreasureReward['tier']>();
    for (let seed = 0; seed < 5000; seed++) {
      tiers.add(rollTreasure(seed).tier);
    }
    expect(tiers).toEqual(new Set(['common', 'rare', 'epic', 'legendary']));
  });

  it('roughly respects the weighted distribution (common is the most frequent)', () => {
    const counts: Record<string, number> = {};
    const N = 5000;
    for (let seed = 0; seed < N; seed++) {
      const t = rollTreasure(seed).tier;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    // common (weight 50+30=80 of 112) should dominate; legendary (weight 2) rare.
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic ?? 0);
    expect((counts.legendary ?? 0)).toBeLessThan(counts.epic ?? 0);
  });

  it('a huge seed still returns a valid reward deterministically', () => {
    expect(rollTreasure(2_000_000_000)).toEqual(rollTreasure(2_000_000_000));
    expect(TREASURE_REWARDS).toContainEqual(rollTreasure(2_000_000_000));
  });

  it('a negative seed is still deterministic (current behavior locked)', () => {
    // Determinism holds even though the value is degenerate (see flagged bug).
    expect(rollTreasure(-1)).toEqual(rollTreasure(-1));
  });

  // ---- SUSPECTED BUG (expected to FAIL) ------------------------------------
  // Negative seeds collapse to the lowest reward because JS `%` keeps the
  // dividend's sign -> rand < 0 -> target < 0 -> first iteration returns
  // TREASURE_REWARDS[0]. A correct weighted roll should still spread negative
  // seeds across all tiers (the player should not be silently denied rare+
  // rewards just because the seed happened to be negative).
  it('negative seeds should still reach tiers above common (flagged bug)', () => {
    const tiers = new Set<TreasureReward['tier']>();
    for (let seed = -1; seed >= -2000; seed--) {
      tiers.add(rollTreasure(seed).tier);
    }
    // We expect more than just {'common'} for a fair weighted roll.
    expect(tiers.size).toBeGreaterThan(1);
  });
});

describe('getTreasureTierColor', () => {
  it('maps each tier to its documented hex color', () => {
    expect(getTreasureTierColor('common')).toBe('#94A3B8');
    expect(getTreasureTierColor('rare')).toBe('#60A5FA');
    expect(getTreasureTierColor('epic')).toBe('#C084FC');
    expect(getTreasureTierColor('legendary')).toBe('#FACC15');
  });

  it('returns a color for every tier present in the table', () => {
    for (const r of TREASURE_REWARDS) {
      expect(getTreasureTierColor(r.tier)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
