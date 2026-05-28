/**
 * Coverage for achievement Collections (tracks).
 *
 * The headline test is the PARTITION check: the track definitions must
 * cover the store's ACHIEVEMENTS exactly — every achievement in exactly one
 * track, no orphans, no duplicates, no unknown ids. If an achievement is
 * added to the store without being placed in a track (or a typo'd id sneaks
 * into a track), this fails loudly instead of silently dropping it from the
 * Collections UI.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    getAllKeys: () => Promise.resolve([] as string[]),
    multiGet: () => Promise.resolve([]),
    multiSet: () => Promise.resolve(),
    multiRemove: () => Promise.resolve(),
  },
}));

import { ACHIEVEMENTS } from '../store/playerStore';
import {
  ACHIEVEMENT_TRACKS,
  getTrackProgress,
  AchievementTrack,
} from '../game/progression/AchievementTracks';

const track = (id: string): AchievementTrack => ACHIEVEMENT_TRACKS.find((t) => t.id === id)!;

describe('ACHIEVEMENT_TRACKS partition', () => {
  it('places every achievement in exactly one track (no orphans, no dupes, no unknowns)', () => {
    const allTrackIds = ACHIEVEMENT_TRACKS.flatMap((t) => t.achievementIds);
    const trackSet = new Set(allTrackIds);
    const achievementSet = new Set(ACHIEVEMENTS.map((a) => a.id));

    // No duplicates across tracks.
    expect(allTrackIds.length).toBe(trackSet.size);
    // Same membership both directions.
    expect(trackSet.size).toBe(achievementSet.size);
    for (const id of achievementSet) expect(trackSet.has(id)).toBe(true);
    for (const id of trackSet) expect(achievementSet.has(id)).toBe(true);
  });
});

describe('getTrackProgress', () => {
  it('counts unlocked members and flags completion', () => {
    const chromatic = track('chromatic'); // 3 members
    expect(getTrackProgress(chromatic, [])).toEqual({ unlocked: 0, total: 3, complete: false });
    expect(getTrackProgress(chromatic, ['first_chromatic', 'chromatic_25'])).toEqual({
      unlocked: 2,
      total: 3,
      complete: false,
    });
    expect(
      getTrackProgress(chromatic, ['first_chromatic', 'chromatic_25', 'chromatic_100']),
    ).toEqual({ unlocked: 3, total: 3, complete: true });
  });

  it('ignores unlocked ids that belong to other tracks', () => {
    const waves = track('waves');
    // Holding chromatic achievements does not advance the Waves track.
    expect(getTrackProgress(waves, ['first_chromatic', 'chromatic_100']).unlocked).toBe(0);
  });
});

describe('prestige tracks', () => {
  it('flags exactly the three skill tracks with a prestige cosmetic', () => {
    const withPrestige = ACHIEVEMENT_TRACKS.filter((t) => t.prestige);
    expect(withPrestige.map((t) => t.id).sort()).toEqual(['chromatic', 'combos', 'waves']);
    for (const t of withPrestige) {
      expect(t.prestige!.cosmetic.length).toBeGreaterThan(0);
      expect(['theme', 'skin']).toContain(t.prestige!.kind);
    }
  });
});
