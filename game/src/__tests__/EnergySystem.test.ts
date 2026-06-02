/**
 * Characterization tests for src/game/systems/EnergySystem.ts
 *
 * Pure logic, but `calculateLives` reads `Date.now()` internally with no
 * injection point, so we freeze Date.now() per test to make it
 * deterministic. (Testability note in the final report.)
 */

import {
  MAX_LIVES,
  LIFE_REGEN_MS,
  LIFE_REGEN_MINUTES,
  INFINITE_LIVES_DURATION_MS,
  REFILL_GEM_COST,
  INFINITE_LIVES_GEM_COST,
  calculateLives,
  formatLifeTimer,
} from '../game/systems/EnergySystem';

const NOW = 1_700_000_000_000; // fixed reference epoch ms

describe('EnergySystem constants', () => {
  it('exposes the documented tuning values', () => {
    expect(MAX_LIVES).toBe(5);
    expect(LIFE_REGEN_MINUTES).toBe(20);
    expect(LIFE_REGEN_MS).toBe(20 * 60 * 1000);
    expect(INFINITE_LIVES_DURATION_MS).toBe(60 * 60 * 1000);
    expect(REFILL_GEM_COST).toBe(5);
    expect(INFINITE_LIVES_GEM_COST).toBe(15);
  });
});

describe('calculateLives', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('returns full lives and isInfinite while the infinite boost is active', () => {
    const result = calculateLives(0, NOW - 1000, NOW + 60_000);
    expect(result).toEqual({ lives: MAX_LIVES, nextLifeIn: null, isInfinite: true });
  });

  it('does NOT treat an expired infinite boost as active', () => {
    const result = calculateLives(MAX_LIVES, null, NOW - 1);
    expect(result.isInfinite).toBe(false);
  });

  it('returns full lives with no timer when at MAX', () => {
    const result = calculateLives(MAX_LIVES, NOW - LIFE_REGEN_MS, null);
    expect(result).toEqual({ lives: MAX_LIVES, nextLifeIn: null, isInfinite: false });
  });

  it('clamps stored lives above MAX down to MAX', () => {
    const result = calculateLives(99, null, null);
    expect(result.lives).toBe(MAX_LIVES);
    expect(result.nextLifeIn).toBeNull();
  });

  it('returns stored lives unchanged when lastLifeLostAt is null', () => {
    const result = calculateLives(2, null, null);
    expect(result).toEqual({ lives: 2, nextLifeIn: null, isInfinite: false });
  });

  it('regenerates no lives before a full interval elapses, and reports countdown', () => {
    // 5 minutes since losing a life, regen interval is 20 minutes.
    const result = calculateLives(2, NOW - 5 * 60 * 1000, null);
    expect(result.lives).toBe(2);
    expect(result.isInfinite).toBe(false);
    // 15 minutes remain on the next life.
    expect(result.nextLifeIn).toBe(15 * 60 * 1000);
  });

  it('regenerates exactly one life after one interval', () => {
    const result = calculateLives(2, NOW - LIFE_REGEN_MS, null);
    expect(result.lives).toBe(3);
    // Immediately after a regen tick, the full interval is left for the next.
    expect(result.nextLifeIn).toBe(LIFE_REGEN_MS);
  });

  it('regenerates multiple lives across multiple intervals', () => {
    const result = calculateLives(1, NOW - 2 * LIFE_REGEN_MS - 5 * 60 * 1000, null);
    // 2 full intervals -> +2 lives -> 3 lives.
    expect(result.lives).toBe(3);
    // 5 minutes into the 3rd interval -> 15 minutes remain.
    expect(result.nextLifeIn).toBe(15 * 60 * 1000);
  });

  it('caps regenerated lives at MAX and stops the countdown once full', () => {
    const result = calculateLives(1, NOW - 100 * LIFE_REGEN_MS, null);
    expect(result.lives).toBe(MAX_LIVES);
    expect(result.nextLifeIn).toBeNull();
  });
});

describe('formatLifeTimer', () => {
  it('formats whole minutes and zero-pads seconds', () => {
    expect(formatLifeTimer(125_000)).toBe('2:05'); // 2m 5s
  });

  it('formats sub-minute durations', () => {
    expect(formatLifeTimer(9_000)).toBe('0:09');
  });

  it('rounds partial seconds up (ceil)', () => {
    // 1_500 ms -> ceil to 2s
    expect(formatLifeTimer(1_500)).toBe('0:02');
  });

  it('handles zero', () => {
    expect(formatLifeTimer(0)).toBe('0:00');
  });

  it('formats durations over an hour as raw minutes:seconds', () => {
    // 1h 1m 1s = 3_661_000 ms -> 61:01 (no hour rollover in this format)
    expect(formatLifeTimer(3_661_000)).toBe('61:01');
  });
});
