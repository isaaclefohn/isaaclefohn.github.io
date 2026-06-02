/**
 * Characterization tests for src/game/modes/Tournament.ts
 *
 * Pure, no React, no storage. Locks tier gating, prize-by-rank mapping,
 * countdown math, and the seeded final-rank simulation.
 *
 * NOTE: `simulateFinalRank` has a suspected bug for non-positive scores
 * (a score of 0 or negative is awarded rank 1 / first place). The test
 * below asserts the CORRECT behavior and is expected to FAIL until the
 * module guards against playerScore <= 0. See final report.
 */

import {
  TOURNAMENT_TIERS,
  TournamentTier,
  isTournamentAvailable,
  getHighestTier,
  getTimeRemaining,
  getPrizeForRank,
  simulateFinalRank,
} from '../game/modes/Tournament';

describe('TOURNAMENT_TIERS config', () => {
  it('defines all four tiers with the documented entry levels', () => {
    expect(TOURNAMENT_TIERS.bronze.entryLevel).toBe(5);
    expect(TOURNAMENT_TIERS.silver.entryLevel).toBe(25);
    expect(TOURNAMENT_TIERS.gold.entryLevel).toBe(75);
    expect(TOURNAMENT_TIERS.diamond.entryLevel).toBe(150);
  });

  it('only bronze is free to enter', () => {
    expect(TOURNAMENT_TIERS.bronze.entryFee).toBe(0);
    expect(TOURNAMENT_TIERS.silver.entryFee).toBeGreaterThan(0);
    expect(TOURNAMENT_TIERS.gold.entryFee).toBeGreaterThan(0);
    expect(TOURNAMENT_TIERS.diamond.entryFee).toBeGreaterThan(0);
  });

  it('prize coins are strictly ordered first > second > third > topTen > participation', () => {
    (Object.keys(TOURNAMENT_TIERS) as TournamentTier[]).forEach((tier) => {
      const p = TOURNAMENT_TIERS[tier].prizes;
      expect(p.first.coins).toBeGreaterThan(p.second.coins);
      expect(p.second.coins).toBeGreaterThan(p.third.coins);
      expect(p.third.coins).toBeGreaterThan(p.topTen.coins);
      expect(p.topTen.coins).toBeGreaterThan(p.participation.coins);
    });
  });
});

describe('isTournamentAvailable', () => {
  it('is true when player is exactly at the entry level (boundary)', () => {
    expect(isTournamentAvailable('bronze', 5)).toBe(true);
    expect(isTournamentAvailable('silver', 25)).toBe(true);
  });

  it('is false one level below entry', () => {
    expect(isTournamentAvailable('bronze', 4)).toBe(false);
    expect(isTournamentAvailable('diamond', 149)).toBe(false);
  });

  it('is true well above entry', () => {
    expect(isTournamentAvailable('diamond', 999)).toBe(true);
  });

  it('handles level 0', () => {
    expect(isTournamentAvailable('bronze', 0)).toBe(false);
  });
});

describe('getHighestTier', () => {
  it('returns null below the lowest entry level', () => {
    expect(getHighestTier(0)).toBeNull();
    expect(getHighestTier(4)).toBeNull();
  });

  it('returns bronze at level 5..24', () => {
    expect(getHighestTier(5)).toBe('bronze');
    expect(getHighestTier(24)).toBe('bronze');
  });

  it('returns silver at level 25..74', () => {
    expect(getHighestTier(25)).toBe('silver');
    expect(getHighestTier(74)).toBe('silver');
  });

  it('returns gold at level 75..149', () => {
    expect(getHighestTier(75)).toBe('gold');
    expect(getHighestTier(149)).toBe('gold');
  });

  it('returns diamond at level 150+', () => {
    expect(getHighestTier(150)).toBe('diamond');
    expect(getHighestTier(10000)).toBe('diamond');
  });
});

describe('getTimeRemaining', () => {
  it('reports expired when endsAt is in the past', () => {
    expect(getTimeRemaining(1000, 2000)).toEqual({ hours: 0, minutes: 0, expired: true });
  });

  it('reports expired exactly at the deadline (diff === 0)', () => {
    expect(getTimeRemaining(5000, 5000)).toEqual({ hours: 0, minutes: 0, expired: true });
  });

  it('splits remaining time into hours and minutes', () => {
    const now = 0;
    const endsAt = (2 * 60 + 30) * 60 * 1000; // 2h30m
    expect(getTimeRemaining(endsAt, now)).toEqual({ hours: 2, minutes: 30, expired: false });
  });

  it('truncates partial minutes downward', () => {
    const now = 0;
    const endsAt = 90 * 1000; // 1m30s
    expect(getTimeRemaining(endsAt, now)).toEqual({ hours: 0, minutes: 1, expired: false });
  });
});

describe('getPrizeForRank', () => {
  const cfg = TOURNAMENT_TIERS.gold;

  it('rank 1 -> first prize', () => {
    expect(getPrizeForRank(1, cfg)).toEqual(cfg.prizes.first);
  });
  it('rank 2 -> second prize', () => {
    expect(getPrizeForRank(2, cfg)).toEqual(cfg.prizes.second);
  });
  it('rank 3 -> third prize', () => {
    expect(getPrizeForRank(3, cfg)).toEqual(cfg.prizes.third);
  });
  it('rank 4 -> topTen prize (boundary just above podium)', () => {
    expect(getPrizeForRank(4, cfg)).toEqual(cfg.prizes.topTen);
  });
  it('rank 10 -> topTen prize (inclusive upper boundary)', () => {
    expect(getPrizeForRank(10, cfg)).toEqual(cfg.prizes.topTen);
  });
  it('rank 11 -> participation prize', () => {
    expect(getPrizeForRank(11, cfg)).toEqual(cfg.prizes.participation);
  });
  it('huge rank -> participation prize', () => {
    expect(getPrizeForRank(9999, cfg)).toEqual(cfg.prizes.participation);
  });
});

describe('simulateFinalRank', () => {
  it('is deterministic for the same (score, tier, seed)', () => {
    const a = simulateFinalRank(5000, 'bronze', 1);
    const b = simulateFinalRank(5000, 'bronze', 1);
    expect(a).toBe(b);
  });

  it('always returns a positive integer rank', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rank = simulateFinalRank(3000, 'silver', seed);
      expect(Number.isInteger(rank)).toBe(true);
      expect(rank).toBeGreaterThanOrEqual(1);
    }
  });

  it('tougher tiers never give a better rank than easier tiers for the same positive score+seed', () => {
    const score = 4000;
    const seed = 7;
    const bronze = simulateFinalRank(score, 'bronze', seed);
    const diamond = simulateFinalRank(score, 'diamond', seed);
    // Diamond bots are stronger, so rank should be the same or worse (>=).
    expect(diamond).toBeGreaterThanOrEqual(bronze);
  });

  // Corrected-semantics lock (was a snapshot of the buggy formula's magic
  // numbers; the bug — competitorAvg derived from playerScore — is fixed,
  // so this now asserts the meaningful contract instead of arbitrary ranks).
  it('ranks by score against a fixed per-tier benchmark', () => {
    // A tiny score lands at the bottom of the bracket regardless of seed.
    expect(simulateFinalRank(100, 'bronze', 1)).toBeGreaterThanOrEqual(50);
    expect(simulateFinalRank(100, 'bronze', 42)).toBeGreaterThanOrEqual(50);
    // A dominant score (>= 2x the bronze benchmark of 1500) takes first.
    expect(simulateFinalRank(4000, 'bronze', 1)).toBe(1);
    // The SAME score that wins bronze should NOT win diamond (8000
    // benchmark) — it falls into a much lower band there.
    expect(simulateFinalRank(4000, 'diamond', 7)).toBeGreaterThan(
      simulateFinalRank(4000, 'bronze', 7),
    );
    // Determinism: same inputs, same rank.
    expect(simulateFinalRank(4000, 'bronze', 1)).toBe(simulateFinalRank(4000, 'bronze', 1));
  });

  // ---- SUSPECTED BUG #1 (expected to FAIL) ----------------------------
  // The player's rank is INDEPENDENT of how well they actually played.
  // competitorAvg = playerScore * strength * (0.7 + rng*0.6), so the ratio
  // playerScore / competitorAvg = 1 / (strength*(0.7+rng*0.6)) cancels the
  // score entirely. A player scoring 100 and a player scoring 1,000,000
  // get the *same* rank for the same seed+tier. A higher score should
  // never produce a worse-or-equal rank than a far lower score.
  it('a much higher score should rank at least as well as a tiny score (same seed/tier)', () => {
    const tiny = simulateFinalRank(100, 'bronze', 1);
    const huge = simulateFinalRank(1_000_000, 'bronze', 1);
    expect(huge).toBeLessThan(tiny);
  });

  // ---- SUSPECTED BUG #2 (expected to FAIL) ----------------------------
  // A player who never scores (0) — or a corrupted negative score —
  // satisfies `playerScore >= competitorAvg * 2` because competitorAvg
  // collapses to 0, so they are awarded rank 1 (first place). Worse, in
  // bronze a *positive* score can never reach the rank-1 band, so scoring
  // zero literally beats scoring a million. A non-positive score should
  // never win.
  it('a zero score should NOT be awarded first place', () => {
    expect(simulateFinalRank(0, 'bronze', 1)).toBeGreaterThan(1);
  });

  it('a negative score should NOT be awarded first place', () => {
    expect(simulateFinalRank(-100, 'diamond', 42)).toBeGreaterThan(1);
  });
});
