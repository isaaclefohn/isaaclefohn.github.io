/**
 * Characterization tests for src/game/challenges/DailyRoulette.ts
 *
 * Pure, no React, no storage. Locks the date-seeded weighted reward
 * selection, the reward pool shape, and the "already spun today" guard.
 */

import {
  ROULETTE_REWARDS,
  RouletteReward,
  getTodaysRouletteReward,
  hasSpunToday,
} from '../game/challenges/DailyRoulette';

describe('ROULETTE_REWARDS pool', () => {
  it('contains 7 rewards', () => {
    expect(ROULETTE_REWARDS).toHaveLength(7);
  });

  it('weights sum to 100', () => {
    const total = ROULETTE_REWARDS.reduce((s, r) => s + r.weight, 0);
    expect(total).toBe(100);
  });

  it('every reward has a positive weight and a payload object', () => {
    for (const r of ROULETTE_REWARDS) {
      expect(r.weight).toBeGreaterThan(0);
      expect(typeof r.name).toBe('string');
      expect(typeof r.icon).toBe('string');
      expect(r.payload).toBeDefined();
    }
  });

  it('exposes the documented reward kinds', () => {
    const kinds = ROULETTE_REWARDS.map((r) => r.kind).sort();
    expect(kinds).toEqual(
      [
        'bonus_coins',
        'bonus_gems',
        'double_coins',
        'power_bomb',
        'power_color',
        'power_row',
        'xp_boost',
      ].sort(),
    );
  });
});

describe('getTodaysRouletteReward', () => {
  it('returns a reward drawn from the pool', () => {
    const reward = getTodaysRouletteReward('2026-06-01');
    expect(ROULETTE_REWARDS).toContainEqual(reward);
  });

  it('is deterministic for the same date string', () => {
    const a = getTodaysRouletteReward('2026-06-01');
    const b = getTodaysRouletteReward('2026-06-01');
    expect(a).toBe(b); // same object reference from the pool
  });

  it('produces stable results for fixed dates (regression snapshot)', () => {
    // These lock the CURRENT seeded output. If the hash or pool order
    // changes, these will trip and force a deliberate review.
    expect(getTodaysRouletteReward('2026-06-01').kind).toBe('bonus_coins');
    expect(getTodaysRouletteReward('2026-06-02').kind).toBe('double_coins');
    expect(getTodaysRouletteReward('2026-06-03').kind).toBe('power_bomb');
    expect(getTodaysRouletteReward('2026-01-01').kind).toBe('bonus_gems');
  });

  it('can vary across different dates (not a constant)', () => {
    const sampled = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const day = String(d).padStart(2, '0');
      sampled.add(getTodaysRouletteReward(`2026-06-${day}`).kind);
    }
    // Over a month we expect more than one distinct reward kind.
    expect(sampled.size).toBeGreaterThan(1);
  });

  it('always returns a defined reward even for an empty date string', () => {
    const reward = getTodaysRouletteReward('');
    expect(reward).toBeDefined();
    expect(ROULETTE_REWARDS).toContainEqual(reward);
  });
});

describe('hasSpunToday', () => {
  it('is true when lastSpin equals today', () => {
    expect(hasSpunToday('2026-06-01', '2026-06-01')).toBe(true);
  });

  it('is false when lastSpin is a different day', () => {
    expect(hasSpunToday('2026-05-31', '2026-06-01')).toBe(false);
  });

  it('is false when the player has never spun (null)', () => {
    expect(hasSpunToday(null, '2026-06-01')).toBe(false);
  });
});
