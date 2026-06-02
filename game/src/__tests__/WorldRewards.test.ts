/**
 * Coverage for world-completion rewards (WorldRewards was 78% stmt / 25% func).
 * These gate real coin/gem/power-up payouts, so the clear-vs-perfect counting
 * and the index clamp matter. Locks the 0-star-win-counts-as-cleared semantic
 * (chromatic-objective levels can be won below the 1-star score cutoff).
 */

import {
  getWorldReward,
  getWorldCompletionStatus,
  getAllWorldStatuses,
} from '../game/rewards/WorldRewards';
import { WORLDS } from '../game/levels/Worlds';

describe('getWorldReward', () => {
  it('returns a reward bundle for each of the 10 worlds with matching identity', () => {
    for (let i = 1; i <= 10; i++) {
      const r = getWorldReward(i);
      expect(r.worldId).toBe(WORLDS[i - 1].id);
      expect(r.worldName).toBe(WORLDS[i - 1].name);
      expect(r.clearReward.coins).toBeGreaterThan(0);
      // The perfect bundle is always strictly better than the clear bundle.
      expect(r.perfectReward.coins).toBeGreaterThan(r.clearReward.coins);
      expect(r.perfectReward.powerUps.bomb).toBeGreaterThanOrEqual(1);
    }
  });

  it('rewards scale up with world difficulty (world 10 > world 1)', () => {
    expect(getWorldReward(10).clearReward.coins).toBeGreaterThan(getWorldReward(1).clearReward.coins);
    expect(getWorldReward(10).perfectReward.gems).toBeGreaterThan(getWorldReward(1).perfectReward.gems);
  });

  it('clamps an out-of-range index instead of returning undefined fields', () => {
    expect(getWorldReward(0)).toBeDefined();
    expect(getWorldReward(0).worldId).toBe(WORLDS[0].id);   // -> world 1
    expect(getWorldReward(99).worldId).toBe(WORLDS[9].id);  // -> world 10
  });
});

describe('getWorldCompletionStatus', () => {
  /** levelStars for world `w` (levels (w-1)*50+1 .. w*50) all set to `stars`. */
  const starsForWorld = (w: number, stars: number): Record<number, number> => {
    const ls: Record<number, number> = {};
    for (let lvl = (w - 1) * 50 + 1; lvl <= w * 50; lvl++) ls[lvl] = stars;
    return ls;
  };

  it('reports not cleared on an empty record', () => {
    const s = getWorldCompletionStatus(1, {});
    expect(s.cleared).toBe(false);
    expect(s.perfected).toBe(false);
    expect(s.levelsCleared).toBe(0);
    expect(s.totalLevels).toBe(50);
  });

  it('cleared (not perfected) when all 50 levels are won at 1 star', () => {
    const s = getWorldCompletionStatus(2, starsForWorld(2, 1));
    expect(s.levelsCleared).toBe(50);
    expect(s.cleared).toBe(true);
    expect(s.perfected).toBe(false);
  });

  it('perfected when all 50 levels are 3-starred', () => {
    const s = getWorldCompletionStatus(3, starsForWorld(3, 3));
    expect(s.cleared).toBe(true);
    expect(s.perfected).toBe(true);
    expect(s.levelsPerfected).toBe(50);
  });

  it('counts a 0-star WIN as cleared (chromatic-objective levels) but never as perfected', () => {
    const ls = starsForWorld(1, 0); // every level present, all at 0 stars
    const s = getWorldCompletionStatus(1, ls);
    expect(s.levelsCleared).toBe(50); // entry-presence, NOT stars > 0
    expect(s.cleared).toBe(true);
    expect(s.levelsPerfected).toBe(0);
    expect(s.perfected).toBe(false);
  });

  it('a single missing level keeps the world un-cleared', () => {
    const ls = starsForWorld(1, 2);
    delete ls[25];
    const s = getWorldCompletionStatus(1, ls);
    expect(s.levelsCleared).toBe(49);
    expect(s.cleared).toBe(false);
  });

  it('scopes to the correct level range per world (no bleed across worlds)', () => {
    const ls = starsForWorld(1, 3); // fill ONLY world 1
    expect(getWorldCompletionStatus(1, ls).cleared).toBe(true);
    expect(getWorldCompletionStatus(2, ls).levelsCleared).toBe(0);
  });
});

describe('getAllWorldStatuses', () => {
  it('returns one entry per world with its reward and status', () => {
    const all = getAllWorldStatuses({});
    expect(all).toHaveLength(10);
    expect(all[0].worldIndex).toBe(1);
    expect(all[9].worldIndex).toBe(10);
    expect(all[0].reward.worldId).toBe(WORLDS[0].id);
    expect(all.every((e) => e.status.totalLevels === 50)).toBe(true);
  });
});
