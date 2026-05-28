/**
 * Achievement "collections" — the 24 achievements grouped into themed
 * tracks (Chromatic, Waves, Combos, ...). Surfaces set-completion dopamine
 * ("finish the Chromatic set") and, for the three skill tracks, frames the
 * track as the path to its prestige cosmetic.
 *
 * Key invariant this relies on: each prestige cosmetic gates on the TOP
 * tier of a track (chromatic_100 / wave_20 / combo_godlike), and the lower
 * tiers are mathematically implied (you can't hit 100 chromatic clears
 * without passing 25, and checkAchievements() stamps every met threshold
 * at once). So "track complete" ⟺ "top tier earned" ⟺ "prestige cosmetic
 * unlocked" — no extra state needed; this just reads `unlockedAchievements`
 * a different way.
 *
 * Pure module — no React, no store imports — mirroring the rest of
 * src/game/progression/*. The track list is pinned to the full achievement
 * set by a partition test (every achievement in exactly one track).
 */

export interface AchievementTrack {
  id: string;
  label: string;
  /** Member achievement ids, ordered easiest → hardest. */
  achievementIds: string[];
  /**
   * Present on the three skill tracks: the prestige cosmetic earned by
   * completing the track (i.e. unlocking its top tier). Display-only.
   */
  prestige?: { cosmetic: string; kind: 'theme' | 'skin' };
}

export const ACHIEVEMENT_TRACKS: AchievementTrack[] = [
  {
    id: 'chromatic',
    label: 'Chromatic',
    achievementIds: ['first_chromatic', 'chromatic_25', 'chromatic_100'],
    prestige: { cosmetic: 'Chromatic Overflow', kind: 'theme' },
  },
  {
    id: 'waves',
    label: 'Waves',
    achievementIds: ['wave_5', 'wave_10', 'wave_20'],
    prestige: { cosmetic: 'Holo', kind: 'skin' },
  },
  {
    id: 'combos',
    label: 'Combos',
    achievementIds: ['combo_fever', 'combo_unstoppable', 'combo_godlike'],
    prestige: { cosmetic: 'Godlike', kind: 'theme' },
  },
  {
    id: 'lines',
    label: 'Lines',
    achievementIds: ['first_clear', 'clear_100', 'clear_500'],
  },
  {
    id: 'levels',
    label: 'Levels',
    achievementIds: ['level_10', 'level_50', 'level_100'],
  },
  {
    id: 'score',
    label: 'Score',
    achievementIds: ['score_10k', 'score_100k'],
  },
  {
    id: 'streaks',
    label: 'Streaks',
    achievementIds: ['streak_3', 'streak_7', 'streak_30'],
  },
  {
    id: 'mastery',
    label: 'Mastery',
    achievementIds: ['stars_50', 'perfect_3star', 'first_powerup', 'coins_1000'],
  },
];

export interface TrackProgress {
  unlocked: number;
  total: number;
  complete: boolean;
}

/** Count how many of a track's achievements the player has unlocked. */
export function getTrackProgress(track: AchievementTrack, unlockedAchievementIds: string[]): TrackProgress {
  const unlockedSet = new Set(unlockedAchievementIds);
  const unlocked = track.achievementIds.filter((id) => unlockedSet.has(id)).length;
  const total = track.achievementIds.length;
  return { unlocked, total, complete: total > 0 && unlocked === total };
}
