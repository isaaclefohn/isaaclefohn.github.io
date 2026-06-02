/**
 * Characterization tests for src/game/customization/Avatars.ts
 *
 * Pure, no React, no storage, no imports. Locks the avatar-frame catalog
 * invariants, the unlock predicate (level/stars/streak/owned/default), the
 * id->frame lookup with default fallback, and the "newly unlocked" diff.
 */

import {
  AVATAR_FRAMES,
  AvatarFrame,
  isAvatarUnlocked,
  getAvatarFrame,
  getNewlyUnlockedAvatars,
} from '../game/customization/Avatars';

/** Convenience state builder so each test only sets what it cares about. */
function state(over: Partial<{
  highestLevel: number;
  totalStars: number;
  longestStreak: number;
  ownedAvatars: string[];
}> = {}) {
  return {
    highestLevel: 0,
    totalStars: 0,
    longestStreak: 0,
    ownedAvatars: [] as string[],
    ...over,
  };
}

describe('AVATAR_FRAMES catalog', () => {
  it('has a unique id for every frame', () => {
    const ids = AVATAR_FRAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts with the default "Rookie" frame and it is the array head', () => {
    expect(AVATAR_FRAMES[0].id).toBe('default');
    expect(AVATAR_FRAMES[0].unlockType).toBe('default');
  });

  it('every non-default / non-purchase frame carries an unlockValue', () => {
    for (const f of AVATAR_FRAMES) {
      if (f.unlockType === 'level' || f.unlockType === 'stars' || f.unlockType === 'streak') {
        expect(typeof f.unlockValue).toBe('number');
        expect(f.unlockValue).toBeGreaterThan(0);
      }
    }
  });

  it('every purchase frame carries a positive gem cost', () => {
    for (const f of AVATAR_FRAMES) {
      if (f.unlockType === 'purchase') {
        expect(typeof f.costGems).toBe('number');
        expect(f.costGems).toBeGreaterThan(0);
      }
    }
  });

  it('every frame has a known rarity tier', () => {
    const tiers = ['common', 'rare', 'epic', 'legendary'];
    for (const f of AVATAR_FRAMES) {
      expect(tiers).toContain(f.rarity);
    }
  });
});

describe('isAvatarUnlocked', () => {
  it('default frame is always unlocked, even with empty progress', () => {
    const def = getAvatarFrame('default');
    expect(isAvatarUnlocked(def, state())).toBe(true);
  });

  it('an owned avatar is unlocked regardless of progress (owned short-circuits)', () => {
    const legend = getAvatarFrame('legend'); // normally needs level 200
    expect(isAvatarUnlocked(legend, state({ highestLevel: 1, ownedAvatars: ['legend'] }))).toBe(true);
  });

  describe('level unlocks', () => {
    const beginner = getAvatarFrame('beginner'); // unlockValue 5

    it('is locked one level below the threshold', () => {
      expect(isAvatarUnlocked(beginner, state({ highestLevel: 4 }))).toBe(false);
    });

    it('is unlocked exactly at the threshold (boundary, >=)', () => {
      expect(isAvatarUnlocked(beginner, state({ highestLevel: 5 }))).toBe(true);
    });

    it('is unlocked above the threshold', () => {
      expect(isAvatarUnlocked(beginner, state({ highestLevel: 999 }))).toBe(true);
    });
  });

  describe('stars unlocks', () => {
    const collector = getAvatarFrame('star_collector'); // unlockValue 100

    it('is locked just under the threshold', () => {
      expect(isAvatarUnlocked(collector, state({ totalStars: 99 }))).toBe(false);
    });

    it('is unlocked exactly at the threshold', () => {
      expect(isAvatarUnlocked(collector, state({ totalStars: 100 }))).toBe(true);
    });
  });

  describe('streak unlocks', () => {
    const warrior = getAvatarFrame('streak_warrior'); // unlockValue 7

    it('is locked just under the threshold', () => {
      expect(isAvatarUnlocked(warrior, state({ longestStreak: 6 }))).toBe(false);
    });

    it('is unlocked exactly at the threshold', () => {
      expect(isAvatarUnlocked(warrior, state({ longestStreak: 7 }))).toBe(true);
    });
  });

  it('a purchase frame is never auto-unlocked by progress (only by ownership)', () => {
    const diamond = getAvatarFrame('diamond'); // unlockType 'purchase'
    expect(
      isAvatarUnlocked(diamond, state({ highestLevel: 9999, totalStars: 9999, longestStreak: 9999 })),
    ).toBe(false);
    // ...but owning it unlocks it.
    expect(isAvatarUnlocked(diamond, state({ ownedAvatars: ['diamond'] }))).toBe(true);
  });

  it('treats a missing unlockValue as 0 (so any non-negative progress unlocks)', () => {
    const synthetic: AvatarFrame = {
      id: 'synthetic_level',
      name: 'Synthetic',
      description: 'no unlockValue set',
      icon: 'star',
      color: '#000000',
      borderWidth: 2,
      rarity: 'common',
      unlockType: 'level',
      // unlockValue intentionally omitted -> defaults to 0 via (?? 0)
    };
    expect(isAvatarUnlocked(synthetic, state({ highestLevel: 0 }))).toBe(true);
  });
});

describe('getAvatarFrame', () => {
  it('returns the matching frame by id', () => {
    expect(getAvatarFrame('champion').name).toBe('Champion');
  });

  it('falls back to the default frame for an unknown id', () => {
    expect(getAvatarFrame('does-not-exist')).toBe(AVATAR_FRAMES[0]);
  });

  it('falls back to default for an empty id', () => {
    expect(getAvatarFrame('')).toBe(AVATAR_FRAMES[0]);
  });
});

describe('getNewlyUnlockedAvatars', () => {
  it('returns nothing when progress did not change', () => {
    const s = state({ highestLevel: 10 });
    expect(getNewlyUnlockedAvatars(s, s)).toEqual([]);
  });

  it('returns a frame that crossed its level threshold between the two states', () => {
    const prev = state({ highestLevel: 4 });
    const curr = state({ highestLevel: 5 });
    const newly = getNewlyUnlockedAvatars(prev, curr).map((f) => f.id);
    expect(newly).toContain('beginner'); // unlockValue 5
    expect(newly).not.toContain('explorer'); // unlockValue 25
  });

  it('never reports purchase frames as newly unlocked (even if newly owned)', () => {
    const prev = state();
    const curr = state({ ownedAvatars: ['diamond'] });
    const newly = getNewlyUnlockedAvatars(prev, curr).map((f) => f.id);
    expect(newly).not.toContain('diamond');
  });

  it('never reports the default frame as newly unlocked', () => {
    const prev = state();
    const curr = state({ highestLevel: 1 });
    const newly = getNewlyUnlockedAvatars(prev, curr).map((f) => f.id);
    expect(newly).not.toContain('default');
  });

  it('reports multiple frames crossing thresholds in a single jump', () => {
    // 0 stars -> 300 stars crosses both star_collector (100) and star_master (300).
    const prev = state({ totalStars: 0 });
    const curr = state({ totalStars: 300 });
    const newly = getNewlyUnlockedAvatars(prev, curr).map((f) => f.id);
    expect(newly).toContain('star_collector');
    expect(newly).toContain('star_master');
  });

  it('does NOT re-report a frame that was already unlocked in the previous state', () => {
    const prev = state({ highestLevel: 5 }); // beginner already unlocked
    const curr = state({ highestLevel: 25 }); // explorer newly unlocked
    const newly = getNewlyUnlockedAvatars(prev, curr).map((f) => f.id);
    expect(newly).not.toContain('beginner');
    expect(newly).toContain('explorer');
  });
});
