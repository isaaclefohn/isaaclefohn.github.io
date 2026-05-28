/**
 * Coverage for the achievement progress computation.
 *
 * The headline test is the CROSS-VALIDATION loop: for a spread of stat
 * snapshots straddling every threshold, `getAchievementProgress().complete`
 * must equal the store's own `achievement.check()` predicate. That pins the
 * progress table to the live predicates — if anyone bumps a threshold in
 * playerStore.ts without updating ACHIEVEMENT_PROGRESS (or vice versa), this
 * suite fails loudly instead of shipping a bar that lies.
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
  ACHIEVEMENT_PROGRESS,
  getAchievementProgress,
  getNearestMilestone,
  getRunAchievementBeat,
  formatProgress,
  AchievementStatsSnapshot,
} from '../game/progression/AchievementProgress';

// Derive the check() parameter type straight off the store array so we
// don't need PlayerStoreState exported. A snapshot is a structural subset,
// so this cast is safe — check() only reads the fields the snapshot carries.
type CheckParam = Parameters<(typeof ACHIEVEMENTS)[number]['check']>[0];
const asState = (snap: AchievementStatsSnapshot): CheckParam => snap as unknown as CheckParam;

const ZERO: AchievementStatsSnapshot = {
  totalLinesCleared: 0,
  highestLevel: 0,
  totalScore: 0,
  longestStreak: 0,
  levelStars: {},
  coins: 0,
  totalPowerUpsUsed: 0,
  totalChromaticClears: 0,
  bestWaveReached: 0,
  bestCombo: 0,
};
const snap = (o: Partial<AchievementStatsSnapshot>): AchievementStatsSnapshot => ({ ...ZERO, ...o });

// level index -> star count, from a flat list of star values.
const starsMap = (vals: number[]): Record<number, number> =>
  vals.reduce<Record<number, number>>((m, v, i) => {
    m[i] = v;
    return m;
  }, {});

describe('getAchievementProgress — computation', () => {
  it('reports current/target/pct/complete for an in-progress brand achievement', () => {
    const p = getAchievementProgress('chromatic_100', snap({ totalChromaticClears: 92 }))!;
    expect(p).toEqual({ current: 92, rawCurrent: 92, target: 100, pct: 0.92, complete: false });
  });

  it('is complete exactly at the threshold', () => {
    expect(getAchievementProgress('wave_20', snap({ bestWaveReached: 20 }))!.complete).toBe(true);
    expect(getAchievementProgress('wave_20', snap({ bestWaveReached: 19 }))!.complete).toBe(false);
    expect(getAchievementProgress('combo_godlike', snap({ bestCombo: 7 }))!.complete).toBe(true);
  });

  it('clamps current and pct when the raw value overshoots the target', () => {
    const p = getAchievementProgress('chromatic_100', snap({ totalChromaticClears: 150 }))!;
    expect(p.rawCurrent).toBe(150); // raw is preserved
    expect(p.current).toBe(100); // but the label value is clamped
    expect(p.pct).toBe(1); // and the bar never overfills
    expect(p.complete).toBe(true);
  });

  it('returns null for an unknown achievement id (caller falls back to binary)', () => {
    expect(getAchievementProgress('not_a_real_achievement', ZERO)).toBeNull();
  });

  it('handles the two levelStars-derived selectors', () => {
    // stars_50 sums every level's stars.
    expect(getAchievementProgress('stars_50', snap({ levelStars: { 0: 49 } }))!.complete).toBe(false);
    expect(getAchievementProgress('stars_50', snap({ levelStars: { 0: 50 } }))!.complete).toBe(true);
    // perfect_3star counts levels with >= 3 stars (independent of the sum).
    expect(getAchievementProgress('perfect_3star', snap({ levelStars: starsMap(Array(9).fill(3)) }))!.complete).toBe(false);
    expect(getAchievementProgress('perfect_3star', snap({ levelStars: starsMap(Array(10).fill(3)) }))!.current).toBe(10);
    expect(getAchievementProgress('perfect_3star', snap({ levelStars: starsMap(Array(10).fill(3)) }))!.complete).toBe(true);
  });
});

describe('formatProgress', () => {
  it('renders a "current / target" label', () => {
    const p = getAchievementProgress('chromatic_100', snap({ totalChromaticClears: 92 }))!;
    expect(formatProgress(p)).toBe('92 / 100');
  });
});

describe('table integrity', () => {
  it('has a progress spec for every achievement (and no orphans)', () => {
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_PROGRESS[a.id]).toBeDefined();
    }
    for (const id of Object.keys(ACHIEVEMENT_PROGRESS)) {
      expect(ACHIEVEMENTS.find((a) => a.id === id)).toBeDefined();
    }
  });
});

describe('getNearestMilestone', () => {
  it('returns null when every trackable achievement is already unlocked', () => {
    const allIds = ACHIEVEMENTS.map((a) => a.id);
    expect(getNearestMilestone(allIds, ZERO)).toBeNull();
  });

  it('picks the locked achievement with the highest completion ratio', () => {
    // 92/100 chromatic (0.92) beats 1/5 wave (0.2); the lower chromatic
    // tiers (first_chromatic, chromatic_25) are already complete and skipped.
    const s = snap({ totalChromaticClears: 92, bestWaveReached: 1 });
    const nearest = getNearestMilestone([], s)!;
    expect(nearest.achievementId).toBe('chromatic_100');
    expect(nearest.progress.current).toBe(92);
  });

  it('skips achievements that are complete but not yet stamped as unlocked', () => {
    // totalLinesCleared 5 → first_clear (target 1) is complete; it must NOT
    // be offered. clear_100 (5/100) is the closest still-incomplete one.
    const nearest = getNearestMilestone([], snap({ totalLinesCleared: 5 }))!;
    expect(nearest.achievementId).toBe('clear_100');
  });

  it('breaks ties at 0% by smallest remaining (cheapest next goal)', () => {
    // A brand-new player: everything at 0%. The single-step goals
    // (target 1) win the tie; first_clear is first in table order.
    const nearest = getNearestMilestone([], ZERO)!;
    expect(nearest.progress.target).toBe(1);
    expect(nearest.achievementId).toBe('first_clear');
  });

  it('excludes ids passed in the unlocked list even when in-progress', () => {
    const s = snap({ totalChromaticClears: 92 });
    const nearest = getNearestMilestone(['chromatic_100'], s);
    expect(nearest?.achievementId).not.toBe('chromatic_100');
  });
});

describe('getRunAchievementBeat', () => {
  it('celebrates a threshold crossed this run but not yet stamped', () => {
    // bestWaveReached 10 makes wave_5 + wave_10 complete; wave_5 is already
    // stamped, so the un-stamped wave_10 is the beat.
    const beat = getRunAchievementBeat(['wave_5'], snap({ bestWaveReached: 10 }))!;
    expect(beat.kind).toBe('unlocked');
    expect(beat.achievementId).toBe('wave_10');
  });

  it('celebrates the most prestigious unlock when several crossed at once', () => {
    // 100 chromatic clears crosses first_chromatic, chromatic_25, chromatic_100
    // all at once; the highest target (chromatic_100) wins.
    const beat = getRunAchievementBeat([], snap({ totalChromaticClears: 100 }))!;
    expect(beat.kind).toBe('unlocked');
    expect(beat.achievementId).toBe('chromatic_100');
  });

  it('falls back to the nearest carrot when nothing crossed this run', () => {
    const beat = getRunAchievementBeat([], ZERO)!;
    expect(beat.kind).toBe('nearest');
    expect(beat.achievementId).toBe('first_clear');
  });

  it('returns null when everything is already unlocked', () => {
    const allIds = ACHIEVEMENTS.map((a) => a.id);
    expect(getRunAchievementBeat(allIds, snap({ totalChromaticClears: 100, bestWaveReached: 20 }))).toBeNull();
  });

  it('does not re-celebrate an achievement already shown this session', () => {
    // bestWaveReached 10 makes wave_10 complete-but-unstamped; if it was
    // already celebrated, fall through to the nearest carrot instead of
    // re-firing "unlocked" on the next game-over.
    const s = snap({ bestWaveReached: 10 });
    expect(getRunAchievementBeat(['wave_5'], s)!.kind).toBe('unlocked');
    expect(getRunAchievementBeat(['wave_5'], s, ['wave_10'])!.kind).toBe('nearest');
  });

  it('breaks an equal-target tie deterministically by table order', () => {
    // first_clear and first_powerup both have target 1; when both cross on
    // the same run, the earlier-defined one (first_clear) is celebrated.
    const beat = getRunAchievementBeat([], snap({ totalLinesCleared: 1, totalPowerUpsUsed: 1 }))!;
    expect(beat.kind).toBe('unlocked');
    expect(beat.achievementId).toBe('first_clear');
  });
});

describe('cross-validation against store check() predicates', () => {
  // One snapshot per (stat axis, boundary value). Every other stat stays 0,
  // so only the achievements on that axis are exercised; the rest are
  // trivially incomplete and agree. Values straddle each real threshold.
  const axisSnapshots: AchievementStatsSnapshot[] = [
    ...[0, 1, 99, 100, 499, 500].map((v) => snap({ totalLinesCleared: v })),
    ...[0, 9, 10, 49, 50, 99, 100].map((v) => snap({ highestLevel: v })),
    ...[0, 9999, 10000, 99999, 100000].map((v) => snap({ totalScore: v })),
    ...[0, 2, 3, 6, 7, 29, 30].map((v) => snap({ longestStreak: v })),
    ...[0, 999, 1000].map((v) => snap({ coins: v })),
    ...[0, 1].map((v) => snap({ totalPowerUpsUsed: v })),
    ...[0, 1, 24, 25, 99, 100].map((v) => snap({ totalChromaticClears: v })),
    ...[0, 4, 5, 9, 10, 19, 20].map((v) => snap({ bestWaveReached: v })),
    ...[0, 4, 5, 6, 7].map((v) => snap({ bestCombo: v })),
  ];

  const starSnapshots: AchievementStatsSnapshot[] = [
    snap({ levelStars: { 0: 49 } }),
    snap({ levelStars: { 0: 50 } }),
    snap({ levelStars: starsMap(Array(9).fill(3)) }),
    snap({ levelStars: starsMap(Array(10).fill(3)) }),
    snap({ levelStars: starsMap(Array(17).fill(3)) }),
  ];

  const all = [...axisSnapshots, ...starSnapshots];

  it('agrees with check() for every achievement across every snapshot', () => {
    for (const s of all) {
      for (const a of ACHIEVEMENTS) {
        const progress = getAchievementProgress(a.id, s);
        expect(progress).not.toBeNull();
        expect(progress!.complete).toBe(a.check(asState(s)));
      }
    }
  });
});
