/**
 * Coverage for the world-zone helpers (Worlds.ts was 0% function-covered).
 * Locks the getWorldForLevel clamping contract: the function is typed
 * `: World` and must honor that for EVERY input — including the non-positive
 * level numbers used by endless (0), weekly (-1) and daily (-2), which
 * previously produced WORLDS[-1] === undefined and crashed callers at `.id`.
 */

import {
  WORLDS,
  getWorldForLevel,
  getAllWorlds,
  isWorldUnlocked,
} from '../game/levels/Worlds';

describe('getWorldForLevel — campaign range', () => {
  it('maps the first and last level of each 50-level world correctly', () => {
    expect(getWorldForLevel(1).id).toBe(1);
    expect(getWorldForLevel(50).id).toBe(1);
    expect(getWorldForLevel(51).id).toBe(2);
    expect(getWorldForLevel(100).id).toBe(2);
    expect(getWorldForLevel(451).id).toBe(10);
    expect(getWorldForLevel(500).id).toBe(10);
  });

  it('every campaign level 1..500 resolves to a World whose range contains it', () => {
    for (let lvl = 1; lvl <= 500; lvl++) {
      const w = getWorldForLevel(lvl);
      expect(lvl).toBeGreaterThanOrEqual(w.levelStart);
      expect(lvl).toBeLessThanOrEqual(w.levelEnd);
    }
  });
});

describe('getWorldForLevel — clamp contract (never returns undefined)', () => {
  it('clamps levels past the final world to the last world', () => {
    expect(getWorldForLevel(501).id).toBe(10);
    expect(getWorldForLevel(99999).id).toBe(10);
  });

  it('clamps non-positive levels (endless 0, weekly -1, daily -2) to the first world', () => {
    // The bug: these produced WORLDS[-1] === undefined and crashed at `.id`.
    for (const lvl of [0, -1, -2, -50]) {
      const w = getWorldForLevel(lvl);
      expect(w).toBeDefined();
      expect(w.id).toBe(1);
    }
  });

  it('returns a valid World for non-finite input (NaN) rather than undefined', () => {
    const w = getWorldForLevel(NaN);
    expect(w).toBeDefined();
    expect(w.id).toBe(1);
  });

  it('NEVER returns undefined across a wide sweep of inputs', () => {
    for (let lvl = -10; lvl <= 600; lvl++) {
      expect(getWorldForLevel(lvl)).toBeDefined();
    }
  });
});

describe('getAllWorlds', () => {
  it('returns all 10 worlds with contiguous, non-overlapping 50-level ranges', () => {
    const worlds = getAllWorlds();
    expect(worlds).toHaveLength(10);
    expect(worlds).toBe(WORLDS);
    for (let i = 1; i < worlds.length; i++) {
      // each world starts exactly where the previous ended + 1
      expect(worlds[i].levelStart).toBe(worlds[i - 1].levelEnd + 1);
    }
    expect(worlds[0].levelStart).toBe(1);
    expect(worlds[worlds.length - 1].levelEnd).toBe(500);
  });
});

describe('isWorldUnlocked', () => {
  const world2 = WORLDS[1]; // levels 51-100

  it('unlocks world 1 from the very start', () => {
    expect(isWorldUnlocked(WORLDS[0], 0)).toBe(true);
    expect(isWorldUnlocked(WORLDS[0], 1)).toBe(true);
  });

  it('unlocks a later world once highestLevel reaches its boundary (start - 1)', () => {
    expect(isWorldUnlocked(world2, 49)).toBe(false); // not yet
    expect(isWorldUnlocked(world2, 50)).toBe(true);  // boundary
    expect(isWorldUnlocked(world2, 80)).toBe(true);  // well into it
  });
});
