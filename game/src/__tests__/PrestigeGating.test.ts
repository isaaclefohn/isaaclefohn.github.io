/**
 * Coverage for the prestige-cosmetic unlock gate.
 *
 * Prestige themes / block skins are earned by achievement, not bought
 * with gems. `checkPrestigeUnlock` is the pure gate the shop uses to
 * decide locked vs unlocked vs (for non-prestige items) not-applicable.
 * Pure function, no store/React — trivially testable.
 */

import { checkPrestigeUnlock, isPrestigeCosmetic } from '../game/progression/PrestigeGating';

describe('checkPrestigeUnlock', () => {
  it('is never locked for a non-prestige cosmetic (no unlockAchievementId)', () => {
    // Gem-priced / free cosmetics pass undefined — they are never
    // achievement-gated, so locked is always false regardless of
    // what achievements the player holds.
    expect(checkPrestigeUnlock(undefined, [])).toEqual({ locked: false });
    expect(checkPrestigeUnlock(undefined, ['combo_godlike'])).toEqual({ locked: false });
  });

  it('is LOCKED when the gating achievement is not yet earned', () => {
    const r = checkPrestigeUnlock('combo_godlike', []);
    expect(r.locked).toBe(true);
    expect(r.requirementAchievementId).toBe('combo_godlike');
  });

  it('is UNLOCKED (no requirement label) once the achievement is earned', () => {
    const r = checkPrestigeUnlock('combo_godlike', ['combo_godlike']);
    expect(r.locked).toBe(false);
    expect(r.requirementAchievementId).toBeUndefined();
  });

  it('stays locked when the player holds a DIFFERENT achievement', () => {
    // Holding wave_20 doesn't unlock the combo_godlike-gated theme.
    const r = checkPrestigeUnlock('combo_godlike', ['wave_20', 'chromatic_100']);
    expect(r.locked).toBe(true);
    expect(r.requirementAchievementId).toBe('combo_godlike');
  });

  it('evaluates each prestige cosmetic independently', () => {
    // A player who has earned chromatic_100 but not combo_godlike:
    // the Chromatic Overflow theme unlocks, the Godlike theme stays
    // locked. Pins that the three prestige gates don't co-trigger.
    const earned = ['chromatic_100'];
    expect(checkPrestigeUnlock('chromatic_100', earned).locked).toBe(false);
    expect(checkPrestigeUnlock('combo_godlike', earned).locked).toBe(true);
    expect(checkPrestigeUnlock('wave_20', earned).locked).toBe(true);
  });
});

describe('isPrestigeCosmetic', () => {
  it('is true only when an unlockAchievementId is present', () => {
    expect(isPrestigeCosmetic('combo_godlike')).toBe(true);
    expect(isPrestigeCosmetic(undefined)).toBe(false);
  });
});
