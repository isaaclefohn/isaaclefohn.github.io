/**
 * Characterization tests for two previously-0%-covered LIVE pure-logic
 * modules. Both were read line-by-line during the coverage pass and found
 * correct; these lock their behavior as regression snapshots.
 *
 *  - Leaderboards: deterministic local leaderboard generation + medal/reward
 *    bands. (Note verified during review: getCurrentWeekSeed's "every
 *    Monday" comment is inaccurate — the boundary is Jan-1-aligned — but
 *    the seed is still deterministic + weekly, not a functional bug; and
 *    getRankMedal's "Nth" suffix is only ever rendered for ranks 1-20 in
 *    the 20-entry board, where "th" is grammatically correct.)
 *  - BlockMastery: XP→tier mapping, progress, and the capped coin bonus.
 */

import {
  generateWeeklyLeaderboard,
  getCurrentWeekSeed,
  getRankMedal,
  getLeaderboardRewards,
} from '../game/leaderboards/Leaderboards';
import {
  getMasteryTier,
  getNextMasteryTier,
  getMasteryProgress,
  getTotalMasteryBonus,
  getMasteryCoinMultiplier,
  MASTERY_TIERS,
  BLOCK_COLORS,
  type BlockColor,
} from '../game/systems/BlockMastery';

const lbParams = (overrides = {}) => ({
  playerName: 'Isaac',
  playerCode: 'ABC-123',
  playerScore: 1000,
  playerSR: 1200,
  weekSeed: 202622,
  ...overrides,
});

describe('Leaderboards.generateWeeklyLeaderboard', () => {
  it('returns 20 entries with exactly one player entry', () => {
    const board = generateWeeklyLeaderboard(lbParams());
    expect(board).toHaveLength(20);
    expect(board.filter(e => e.isPlayer)).toHaveLength(1);
  });

  it('assigns contiguous ranks 1..20 sorted by descending score', () => {
    const board = generateWeeklyLeaderboard(lbParams());
    expect(board.map(e => e.rank)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (let i = 1; i < board.length; i++) {
      expect(board[i - 1].score).toBeGreaterThanOrEqual(board[i].score);
    }
  });

  it('is deterministic for the same weekSeed', () => {
    const a = generateWeeklyLeaderboard(lbParams());
    const b = generateWeeklyLeaderboard(lbParams());
    expect(a).toEqual(b);
  });

  it('different weekSeeds produce different boards', () => {
    const a = generateWeeklyLeaderboard(lbParams({ weekSeed: 1 }));
    const b = generateWeeklyLeaderboard(lbParams({ weekSeed: 2 }));
    expect(a).not.toEqual(b);
  });

  it('a score of 0 lands the player last (bots floor to >= 1)', () => {
    const board = generateWeeklyLeaderboard(lbParams({ playerScore: 0 }));
    const player = board.find(e => e.isPlayer)!;
    expect(player.rank).toBe(20);
    expect(board.every(e => e.score >= (e.isPlayer ? 0 : 1))).toBe(true);
  });
});

describe('Leaderboards medals + rewards', () => {
  it('getCurrentWeekSeed returns a stable positive integer across immediate calls', () => {
    const a = getCurrentWeekSeed();
    const b = getCurrentWeekSeed();
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThan(0);
    expect(a).toBe(b);
  });

  it('getRankMedal labels the podium and ranges', () => {
    expect(getRankMedal(1).label).toBe('1st');
    expect(getRankMedal(2).label).toBe('2nd');
    expect(getRankMedal(3).label).toBe('3rd');
    expect(getRankMedal(4).label).toBe('4th');
    expect(getRankMedal(20).label).toBe('20th');
    // distinct podium colors
    const colors = [1, 2, 3].map(r => getRankMedal(r).color);
    expect(new Set(colors).size).toBe(3);
  });

  it('getLeaderboardRewards is monotonically non-increasing as rank worsens', () => {
    const ranks = [1, 2, 3, 5, 10, 20, 50];
    const coins = ranks.map(r => getLeaderboardRewards(r).coins);
    for (let i = 1; i < coins.length; i++) {
      expect(coins[i]).toBeLessThanOrEqual(coins[i - 1]);
    }
    expect(getLeaderboardRewards(1).coins).toBe(1000);
    expect(getLeaderboardRewards(999).coins).toBe(25); // participation floor
  });
});

describe('BlockMastery tiers', () => {
  it('maps XP to the highest tier whose threshold is met', () => {
    expect(getMasteryTier(0).label).toBe('Novice');
    expect(getMasteryTier(99).label).toBe('Novice');
    expect(getMasteryTier(100).label).toBe('Apprentice');
    expect(getMasteryTier(2999).label).toBe('Master');
    expect(getMasteryTier(3000).label).toBe('Grandmaster');
    expect(getMasteryTier(999999).label).toBe('Grandmaster');
  });

  it('getNextMasteryTier advances one tier, null at max', () => {
    expect(getNextMasteryTier(0)?.label).toBe('Apprentice');
    expect(getNextMasteryTier(3000)).toBeNull();
  });

  it('getMasteryProgress stays within [0,1] and hits 1 at max', () => {
    expect(getMasteryProgress(0)).toBe(0);            // exactly at tier start
    expect(getMasteryProgress(3000)).toBe(1);         // maxed
    for (const xp of [0, 50, 100, 250, 700, 1499, 2999, 3000, 5000]) {
      const p = getMasteryProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('getTotalMasteryBonus sums per-color and caps at 50', () => {
    const allZero = Object.fromEntries(BLOCK_COLORS.map(c => [c, 0])) as Record<BlockColor, number>;
    expect(getTotalMasteryBonus(allZero)).toBe(0);
    const allMax = Object.fromEntries(BLOCK_COLORS.map(c => [c, 3000])) as Record<BlockColor, number>;
    // 7 colors x 12% = 84, capped at 50.
    expect(getTotalMasteryBonus(allMax)).toBe(50);
  });

  it('getMasteryCoinMultiplier converts the bonus to a multiplier', () => {
    const allZero = Object.fromEntries(BLOCK_COLORS.map(c => [c, 0])) as Record<BlockColor, number>;
    expect(getMasteryCoinMultiplier(allZero)).toBe(1);
    const allMax = Object.fromEntries(BLOCK_COLORS.map(c => [c, 3000])) as Record<BlockColor, number>;
    expect(getMasteryCoinMultiplier(allMax)).toBeCloseTo(1.5); // +50% cap
  });

  it('tier levels match their array index (the assumption getNextMasteryTier relies on)', () => {
    MASTERY_TIERS.forEach((t, i) => expect(t.level).toBe(i));
  });
});
