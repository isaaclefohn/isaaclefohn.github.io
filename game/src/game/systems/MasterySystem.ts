/**
 * Level Mastery system.
 * Adds replay value by giving bonus rewards for replaying levels
 * and achieving higher scores. Each level has a "mastery rank" based
 * on score relative to par.
 *
 * Mastery ranks: Bronze → Silver → Gold → Diamond → Master
 * Higher mastery = more bonus coins from replays.
 */

export type MasteryRank = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'master';

export interface MasteryInfo {
  rank: MasteryRank;
  label: string;
  color: string;
  nextRank: MasteryRank | null;
  nextThreshold: number | null;
  bonusCoins: number;
}

const MASTERY_COLORS: Record<MasteryRank, string> = {
  none: '#64748B',
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  diamond: '#B9F2FF',
  master: '#FF4500',
};

const MASTERY_LABELS: Record<MasteryRank, string> = {
  none: 'Unranked',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
  master: 'Master',
};

/** Mastery thresholds as multiplier of the 3-star score threshold */
const MASTERY_MULTIPLIERS: Array<{ rank: MasteryRank; multiplier: number; bonus: number }> = [
  { rank: 'bronze', multiplier: 1.0, bonus: 5 },   // Meet 3-star threshold
  { rank: 'silver', multiplier: 1.2, bonus: 10 },   // 20% above 3-star
  { rank: 'gold', multiplier: 1.5, bonus: 20 },     // 50% above 3-star
  { rank: 'diamond', multiplier: 2.0, bonus: 35 },  // Double 3-star
  { rank: 'master', multiplier: 3.0, bonus: 50 },   // Triple 3-star
];

/** Calculate mastery rank based on best score vs star threshold */
export function getMasteryRank(
  bestScore: number,
  threeStarThreshold: number,
): MasteryRank {
  if (threeStarThreshold <= 0) return 'none';

  for (let i = MASTERY_MULTIPLIERS.length - 1; i >= 0; i--) {
    if (bestScore >= threeStarThreshold * MASTERY_MULTIPLIERS[i].multiplier) {
      return MASTERY_MULTIPLIERS[i].rank;
    }
  }
  return 'none';
}

/** Get full mastery info for display */
export function getMasteryInfo(
  bestScore: number,
  threeStarThreshold: number,
): MasteryInfo {
  const rank = getMasteryRank(bestScore, threeStarThreshold);
  const currentIdx = MASTERY_MULTIPLIERS.findIndex(m => m.rank === rank);

  let nextRank: MasteryRank | null = null;
  let nextThreshold: number | null = null;
  let bonusCoins = 0;

  if (currentIdx >= 0) {
    bonusCoins = MASTERY_MULTIPLIERS[currentIdx].bonus;
    if (currentIdx < MASTERY_MULTIPLIERS.length - 1) {
      nextRank = MASTERY_MULTIPLIERS[currentIdx + 1].rank;
      nextThreshold = Math.ceil(threeStarThreshold * MASTERY_MULTIPLIERS[currentIdx + 1].multiplier);
    }
  } else if (threeStarThreshold > 0) {
    nextRank = 'bronze';
    nextThreshold = threeStarThreshold;
  }

  return {
    rank,
    label: MASTERY_LABELS[rank],
    color: MASTERY_COLORS[rank],
    nextRank,
    nextThreshold,
    bonusCoins,
  };
}

/** Count total mastery ranks across all levels */
export function countMasteryRanks(
  levelHighScores: Record<number, number>,
  levelStarThresholds: Record<number, number>,
): Record<MasteryRank, number> {
  const counts: Record<MasteryRank, number> = {
    none: 0, bronze: 0, silver: 0, gold: 0, diamond: 0, master: 0,
  };

  for (const [lvl, score] of Object.entries(levelHighScores)) {
    const threshold = levelStarThresholds[Number(lvl)] ?? 0;
    if (threshold > 0) {
      const rank = getMasteryRank(score, threshold);
      counts[rank]++;
    }
  }

  return counts;
}
