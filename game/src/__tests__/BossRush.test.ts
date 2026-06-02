/**
 * Characterization tests for src/game/modes/BossRush.ts
 *
 * Pure, no React, no storage. Locks the gauntlet state machine,
 * reward accrual + completion bonus, and medal thresholds.
 */

import {
  BOSS_RUSH_CONFIG,
  BossRushState,
  createBossRushState,
  getCurrentBossLevel,
  advanceBossRush,
  calculateBossRushRewards,
  getBossRushMedal,
  isBossRushUnlocked,
} from '../game/modes/BossRush';

describe('BOSS_RUSH_CONFIG', () => {
  it('has 20 boss levels in ascending multiples of 25', () => {
    expect(BOSS_RUSH_CONFIG.bossLevels).toHaveLength(20);
    expect(BOSS_RUSH_CONFIG.bossLevels[0]).toBe(25);
    expect(BOSS_RUSH_CONFIG.bossLevels[19]).toBe(500);
    BOSS_RUSH_CONFIG.bossLevels.forEach((lvl, i) => {
      expect(lvl).toBe(25 * (i + 1));
    });
  });
});

describe('createBossRushState', () => {
  it('starts at index 0 with zeroed progress', () => {
    const s = createBossRushState();
    expect(s.currentBossIndex).toBe(0);
    expect(s.totalScore).toBe(0);
    expect(s.bossesDefeated).toBe(0);
    expect(s.completed).toBe(false);
  });

  it('copies starting power-ups (not a shared reference)', () => {
    const s = createBossRushState();
    expect(s.powerUps).toEqual(BOSS_RUSH_CONFIG.startingPowerUps);
    expect(s.powerUps).not.toBe(BOSS_RUSH_CONFIG.startingPowerUps);
    s.powerUps.bomb = 999;
    expect(BOSS_RUSH_CONFIG.startingPowerUps.bomb).toBe(3);
  });

  it('stamps startedAt with the current time', () => {
    const before = Date.now();
    const s = createBossRushState();
    expect(s.startedAt).toBeGreaterThanOrEqual(before);
    expect(s.startedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('getCurrentBossLevel', () => {
  const base = createBossRushState();

  it('returns the first boss level at index 0', () => {
    expect(getCurrentBossLevel({ ...base, currentBossIndex: 0 })).toBe(25);
  });

  it('returns the matching level for a mid index', () => {
    expect(getCurrentBossLevel({ ...base, currentBossIndex: 3 })).toBe(100);
  });

  it('returns the last level at index 19', () => {
    expect(getCurrentBossLevel({ ...base, currentBossIndex: 19 })).toBe(500);
  });

  it('returns null once the gauntlet is finished (index past the end)', () => {
    expect(getCurrentBossLevel({ ...base, currentBossIndex: 20 })).toBeNull();
    expect(getCurrentBossLevel({ ...base, currentBossIndex: 99 })).toBeNull();
  });
});

describe('advanceBossRush', () => {
  it('advances the index, adds score, and counts a defeat', () => {
    const s = createBossRushState();
    const next = advanceBossRush(s, 500);
    expect(next.currentBossIndex).toBe(1);
    expect(next.totalScore).toBe(500);
    expect(next.bossesDefeated).toBe(1);
    expect(next.completed).toBe(false);
  });

  it('does not mutate the input state (returns a new object)', () => {
    const s = createBossRushState();
    advanceBossRush(s, 123);
    expect(s.currentBossIndex).toBe(0);
    expect(s.totalScore).toBe(0);
  });

  it('accumulates score across multiple advances', () => {
    let s = createBossRushState();
    s = advanceBossRush(s, 100);
    s = advanceBossRush(s, 250);
    expect(s.totalScore).toBe(350);
    expect(s.bossesDefeated).toBe(2);
    expect(s.currentBossIndex).toBe(2);
  });

  it('marks completed when the last boss (index 19 -> 20) is cleared', () => {
    const s: BossRushState = { ...createBossRushState(), currentBossIndex: 19, bossesDefeated: 19 };
    const next = advanceBossRush(s, 1000);
    expect(next.currentBossIndex).toBe(20);
    expect(next.bossesDefeated).toBe(20);
    expect(next.completed).toBe(true);
  });

  it('handles a zero-score clear', () => {
    const next = advanceBossRush(createBossRushState(), 0);
    expect(next.totalScore).toBe(0);
    expect(next.bossesDefeated).toBe(1);
  });
});

describe('calculateBossRushRewards', () => {
  it('is zero with no bosses defeated', () => {
    const s = createBossRushState();
    expect(calculateBossRushRewards(s)).toEqual({ coins: 0, gems: 0 });
  });

  it('scales linearly per boss defeated', () => {
    const s: BossRushState = { ...createBossRushState(), bossesDefeated: 5 };
    expect(calculateBossRushRewards(s)).toEqual({ coins: 500, gems: 10 });
  });

  it('adds the completion bonus (+2000 coins, +50 gems) when completed', () => {
    const s: BossRushState = { ...createBossRushState(), bossesDefeated: 20, completed: true };
    // 20*100 + 2000 = 4000 coins, 20*2 + 50 = 90 gems
    expect(calculateBossRushRewards(s)).toEqual({ coins: 4000, gems: 90 });
  });

  it('does NOT add the completion bonus if completed flag is false', () => {
    const s: BossRushState = { ...createBossRushState(), bossesDefeated: 20, completed: false };
    expect(calculateBossRushRewards(s)).toEqual({ coins: 2000, gems: 40 });
  });
});

describe('getBossRushMedal', () => {
  it('none below 5', () => {
    expect(getBossRushMedal(0)).toBe('none');
    expect(getBossRushMedal(4)).toBe('none');
  });
  it('bronze at 5..9', () => {
    expect(getBossRushMedal(5)).toBe('bronze');
    expect(getBossRushMedal(9)).toBe('bronze');
  });
  it('silver at 10..14', () => {
    expect(getBossRushMedal(10)).toBe('silver');
    expect(getBossRushMedal(14)).toBe('silver');
  });
  it('gold at 15..19', () => {
    expect(getBossRushMedal(15)).toBe('gold');
    expect(getBossRushMedal(19)).toBe('gold');
  });
  it('platinum at 20+', () => {
    expect(getBossRushMedal(20)).toBe('platinum');
    expect(getBossRushMedal(50)).toBe('platinum');
  });
});

describe('isBossRushUnlocked', () => {
  it('false below unlock level (50)', () => {
    expect(isBossRushUnlocked(49)).toBe(false);
    expect(isBossRushUnlocked(0)).toBe(false);
  });
  it('true at exactly the unlock level (boundary)', () => {
    expect(isBossRushUnlocked(50)).toBe(true);
  });
  it('true above the unlock level', () => {
    expect(isBossRushUnlocked(500)).toBe(true);
  });
});
