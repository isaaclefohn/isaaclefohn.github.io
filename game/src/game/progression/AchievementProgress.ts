/**
 * Achievement progress computation.
 *
 * The store's ACHIEVEMENTS array holds a boolean `check(state)` predicate
 * per achievement — enough to decide locked vs unlocked, but NOT enough
 * to render a progress bar ("92 / 100"). This module supplies the missing
 * numeric dimension: for every achievement id, how to read the current
 * value and the target threshold.
 *
 * Source-of-truth discipline: each entry here mirrors exactly one `check`
 * predicate in playerStore.ts. They MUST agree — a target here that
 * disagrees with its predicate would render a bar that fills to 100% while
 * the achievement stays locked (or vice versa). AchievementProgress.test.ts
 * cross-validates every entry against the live `check` predicate across a
 * spread of snapshots, so drift is caught at test time, never shipped.
 *
 * Pure module — no React, no store imports — mirroring FeatureGating.ts
 * and PrestigeGating.ts so it is trivially unit-testable.
 */

/**
 * The subset of persisted player stats that drive achievement progress.
 * Structurally a slice of PlayerStoreState (identical field names), so a
 * full store state can be passed anywhere a snapshot is expected.
 */
export interface AchievementStatsSnapshot {
  totalLinesCleared: number;
  highestLevel: number;
  totalScore: number;
  longestStreak: number;
  levelStars: Record<string | number, number>;
  coins: number;
  totalPowerUpsUsed: number;
  totalChromaticClears: number;
  bestWaveReached: number;
  bestCombo: number;
}

export interface AchievementProgress {
  /** Current value clamped to [0, target] — safe for "X / Y" labels. */
  current: number;
  /** Raw value before clamping (e.g. 127 when target is 100). */
  rawCurrent: number;
  target: number;
  /** rawCurrent / target, clamped to [0, 1]. */
  pct: number;
  /** True once the threshold is met — mirrors the store `check` predicate. */
  complete: boolean;
}

type Selector = (s: AchievementStatsSnapshot) => number;

interface ProgressSpec {
  current: Selector;
  target: number;
}

// The two non-trivial selectors. `stars_50` sums every level's star count;
// `perfect_3star` counts how many levels are fully 3-starred. Both mirror
// the corresponding `Object.values(s.levelStars)...` predicates verbatim.
const sumStars: Selector = (s) => Object.values(s.levelStars).reduce((a, b) => a + b, 0);
const perfectLevels: Selector = (s) => Object.values(s.levelStars).filter((v) => v >= 3).length;

/**
 * achievement id → { how to read the current value, target threshold }.
 * Mirrors the `check` predicates in playerStore.ts ACHIEVEMENTS 1:1.
 */
export const ACHIEVEMENT_PROGRESS: Record<string, ProgressSpec> = {
  first_clear: { current: (s) => s.totalLinesCleared, target: 1 },
  clear_100: { current: (s) => s.totalLinesCleared, target: 100 },
  clear_500: { current: (s) => s.totalLinesCleared, target: 500 },
  level_10: { current: (s) => s.highestLevel, target: 10 },
  level_50: { current: (s) => s.highestLevel, target: 50 },
  level_100: { current: (s) => s.highestLevel, target: 100 },
  score_10k: { current: (s) => s.totalScore, target: 10000 },
  score_100k: { current: (s) => s.totalScore, target: 100000 },
  streak_3: { current: (s) => s.longestStreak, target: 3 },
  streak_7: { current: (s) => s.longestStreak, target: 7 },
  streak_30: { current: (s) => s.longestStreak, target: 30 },
  stars_50: { current: sumStars, target: 50 },
  perfect_3star: { current: perfectLevels, target: 10 },
  coins_1000: { current: (s) => s.coins, target: 1000 },
  first_powerup: { current: (s) => s.totalPowerUpsUsed, target: 1 },
  first_chromatic: { current: (s) => s.totalChromaticClears, target: 1 },
  chromatic_25: { current: (s) => s.totalChromaticClears, target: 25 },
  chromatic_100: { current: (s) => s.totalChromaticClears, target: 100 },
  wave_5: { current: (s) => s.bestWaveReached, target: 5 },
  wave_10: { current: (s) => s.bestWaveReached, target: 10 },
  wave_20: { current: (s) => s.bestWaveReached, target: 20 },
  combo_fever: { current: (s) => s.bestCombo, target: 5 },
  combo_unstoppable: { current: (s) => s.bestCombo, target: 6 },
  combo_godlike: { current: (s) => s.bestCombo, target: 7 },
};

/**
 * Compute progress for one achievement id against a stats snapshot.
 * Returns null for unknown ids (no spec) — the caller should fall back to
 * the binary unlocked flag rather than render a bar.
 */
export function getAchievementProgress(
  achievementId: string,
  snapshot: AchievementStatsSnapshot,
): AchievementProgress | null {
  const spec = ACHIEVEMENT_PROGRESS[achievementId];
  if (!spec) return null;
  const rawCurrent = spec.current(snapshot);
  const { target } = spec;
  const complete = rawCurrent >= target;
  const current = Math.max(0, Math.min(rawCurrent, target));
  const pct = target <= 0 ? 1 : Math.max(0, Math.min(1, rawCurrent / target));
  return { current, rawCurrent, target, pct, complete };
}

/** "92 / 100" style label, with locale grouping for big targets (100,000). */
export function formatProgress(p: AchievementProgress): string {
  return `${p.current.toLocaleString()} / ${p.target.toLocaleString()}`;
}
