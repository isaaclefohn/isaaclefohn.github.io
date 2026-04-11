/**
 * Streak reward and streak freeze system.
 * Players earn escalating daily rewards for consecutive play days.
 * Streak freeze items protect against a missed day.
 * Inspired by Duolingo's streak system — proven to boost retention 2-3x.
 */

export interface StreakMilestone {
  days: number;
  coins: number;
  gems: number;
  streakFreezes: number;
  label: string;
}

/** Milestone rewards at streak thresholds */
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, coins: 30, gems: 0, streakFreezes: 0, label: '3-Day Streak!' },
  { days: 5, coins: 50, gems: 2, streakFreezes: 0, label: '5-Day Streak!' },
  { days: 7, coins: 100, gems: 5, streakFreezes: 1, label: 'Week Warrior!' },
  { days: 14, coins: 200, gems: 10, streakFreezes: 1, label: 'Two-Week Titan!' },
  { days: 21, coins: 300, gems: 10, streakFreezes: 1, label: '3-Week Legend!' },
  { days: 30, coins: 500, gems: 20, streakFreezes: 2, label: 'Monthly Master!' },
  { days: 60, coins: 1000, gems: 30, streakFreezes: 2, label: '60-Day Phenomenon!' },
  { days: 100, coins: 2000, gems: 50, streakFreezes: 3, label: 'Century Champion!' },
];

/** Check if a streak milestone was just hit */
export function getStreakMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find(m => m.days === streak) ?? null;
}

/** Get next milestone to work toward */
export function getNextStreakMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find(m => m.days > streak) ?? null;
}

/** Daily streak bonus (small coin reward every day, scales with streak) */
export function getDailyStreakBonus(streak: number): number {
  if (streak <= 0) return 0;
  // Base 5 coins + 1 per day, capped at 25
  return Math.min(5 + streak, 25);
}

/**
 * Streak freeze logic.
 * When a player misses a day, a streak freeze is consumed instead of resetting.
 * Returns true if freeze was used, false if streak should reset.
 */
export function shouldUseStreakFreeze(
  lastPlayDate: string | null,
  streakFreezes: number
): { useFreeze: boolean; daysGap: number } {
  if (!lastPlayDate || streakFreezes <= 0) return { useFreeze: false, daysGap: 0 };

  const now = new Date();
  const last = new Date(lastPlayDate);
  const diffMs = now.getTime() - last.getTime();
  const daysGap = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Only use freeze for 1-day gap (missed exactly one day)
  if (daysGap === 2) {
    return { useFreeze: true, daysGap: 2 };
  }

  return { useFreeze: false, daysGap };
}
