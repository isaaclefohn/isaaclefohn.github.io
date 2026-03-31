/**
 * Scoring system for Block Blitz.
 * Points are earned from:
 *  - Placing pieces (small bonus per cell)
 *  - Clearing lines (main scoring)
 *  - Combos (clearing lines on consecutive placements)
 */

import { BASE_POINTS_PER_CELL, COMBO_MULTIPLIERS, PLACEMENT_BONUS } from '../../utils/constants';

export interface ScoreEvent {
  /** Points earned from this action */
  points: number;
  /** Current combo streak */
  combo: number;
  /** Multiplier applied */
  multiplier: number;
  /** Breakdown of how points were earned */
  breakdown: {
    placementBonus: number;
    clearBonus: number;
    comboMultiplier: number;
  };
}

/** Calculate points for placing a piece (no line clears) */
export function scorePlacement(cellCount: number): ScoreEvent {
  const placementBonus = cellCount * PLACEMENT_BONUS;
  return {
    points: placementBonus,
    combo: 0,
    multiplier: 1,
    breakdown: {
      placementBonus,
      clearBonus: 0,
      comboMultiplier: 1,
    },
  };
}

/** Calculate points for clearing lines */
export function scoreClear(
  linesCleared: number,
  cellsCleared: number,
  currentCombo: number
): ScoreEvent {
  const newCombo = currentCombo + 1;
  const multiplierIndex = Math.min(newCombo - 1, COMBO_MULTIPLIERS.length - 1);
  const multiplier = COMBO_MULTIPLIERS[multiplierIndex];

  // Base clear points: cells * base points * lines bonus
  const lineBonus = 1 + (linesCleared - 1) * 0.5; // 1x for 1 line, 1.5x for 2, 2x for 3, etc.
  const clearBonus = Math.round(cellsCleared * BASE_POINTS_PER_CELL * lineBonus);

  // Apply combo multiplier
  const totalPoints = Math.round(clearBonus * multiplier);

  return {
    points: totalPoints,
    combo: newCombo,
    multiplier,
    breakdown: {
      placementBonus: 0,
      clearBonus,
      comboMultiplier: multiplier,
    },
  };
}

/** Calculate star rating based on score and thresholds */
export function calculateStars(
  score: number,
  thresholds: [number, number, number]
): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

/** Calculate coin reward based on star rating */
export function calculateCoinReward(stars: 0 | 1 | 2 | 3): number {
  switch (stars) {
    case 3: return 50;
    case 2: return 25;
    case 1: return 10;
    default: return 0;
  }
}
