/**
 * Scoring system for Chroma Drop.
 * Points are earned from:
 *  - Placing pieces (small bonus per cell)
 *  - Clearing lines (main scoring)
 *  - Combos (clearing lines on consecutive placements)
 *  - Multi-line clears (clearing 2+ lines at once)
 *  - Perfect clears (emptying the entire board)
 */

import { BASE_POINTS_PER_CELL, COMBO_MULTIPLIERS, PLACEMENT_BONUS } from '../../utils/constants';

export interface ScoreEvent {
  /** Points earned from this action */
  points: number;
  /** Current combo streak */
  combo: number;
  /** Multiplier applied */
  multiplier: number;
  /** Whether this was a perfect clear (board empty) */
  perfectClear: boolean;
  /** Number of lines cleared simultaneously */
  linesCleared: number;
  /** Number of chromatic (single-color) lines included in this clear */
  chromaticClears: number;
  /** Color index (1-7) of each chromatic line, so the UI can celebrate in-hue */
  chromaticColors: number[];
  /** Cells cleared by the board-wide chromatic cascade (the "somatic detonation"
   *  — every remaining same-color cell explodes with a chromatic line). Drives
   *  haptic intensity and score-tail length. */
  cascadeCellsCleared: number;
  /**
   * Extra points applied because the golden piece (a rare ~10% mid-run
   * variable reward in endless mode) was the placed piece AND it
   * triggered a clear. Already factored into `points`; surfaced
   * separately so the UI can show a "+GOLDEN!" floating callout.
   * Always 0 outside endless mode.
   */
  goldenBonus: number;
  /** Breakdown of how points were earned */
  breakdown: {
    placementBonus: number;
    clearBonus: number;
    comboMultiplier: number;
    perfectClearBonus: number;
    multiLineBonus: number;
    chromaticBonus: number;
    /** Modest per-cell bonus for cells removed by the chromatic cascade. */
    cascadeBonus: number;
  };
}

/** Bonus points per chromatic (same-color) clear. Unique to Chroma Drop. */
export const CHROMATIC_BONUS_PER_LINE = 120;

/** Bonus points per cell removed by the board-wide chromatic cascade. Modest
 *  enough not to break level/star balance, visible enough to drive the score
 *  count-up tail that extends the dopamine plateau past the action. */
export const CASCADE_BONUS_PER_CELL = 5;

/** Perfect clear bonus: clearing the entire board */
const PERFECT_CLEAR_BONUS = 500;

/** Multi-line bonus multiplier thresholds */
const MULTI_LINE_BONUSES: Record<number, number> = {
  2: 50,   // 2 lines at once
  3: 150,  // 3 lines at once
  4: 300,  // 4+ lines at once
};

function getMultiLineBonus(linesCleared: number): number {
  if (linesCleared >= 4) return MULTI_LINE_BONUSES[4];
  return MULTI_LINE_BONUSES[linesCleared] ?? 0;
}

/** Calculate points for placing a piece (no line clears) */
export function scorePlacement(cellCount: number): ScoreEvent {
  const placementBonus = cellCount * PLACEMENT_BONUS;
  return {
    points: placementBonus,
    combo: 0,
    multiplier: 1,
    perfectClear: false,
    linesCleared: 0,
    chromaticClears: 0,
    chromaticColors: [],
    cascadeCellsCleared: 0,
    goldenBonus: 0,
    breakdown: {
      placementBonus,
      clearBonus: 0,
      comboMultiplier: 1,
      perfectClearBonus: 0,
      multiLineBonus: 0,
      chromaticBonus: 0,
      cascadeBonus: 0,
    },
  };
}

/** Calculate points for clearing lines */
export function scoreClear(
  linesCleared: number,
  cellsCleared: number,
  currentCombo: number,
  isPerfectClear: boolean = false,
  chromaticClears: number = 0,
  chromaticColors: number[] = [],
  cascadeCellsCleared: number = 0,
): ScoreEvent {
  const newCombo = currentCombo + 1;
  const multiplierIndex = Math.min(newCombo - 1, COMBO_MULTIPLIERS.length - 1);
  const multiplier = COMBO_MULTIPLIERS[multiplierIndex];

  // Base clear points: cells * base points * lines bonus
  const lineBonus = 1 + (linesCleared - 1) * 0.5;
  const clearBonus = Math.round(cellsCleared * BASE_POINTS_PER_CELL * lineBonus);

  // Multi-line bonus
  const multiLineBonus = getMultiLineBonus(linesCleared);

  // Perfect clear bonus
  const perfectClearBonus = isPerfectClear ? PERFECT_CLEAR_BONUS : 0;

  // Chromatic bonus (single-color lines) — unique mechanic
  const chromaticBonus = chromaticClears * CHROMATIC_BONUS_PER_LINE;

  // Cascade bonus — every cell the chromatic detonation swept off the board
  // pays a modest amount, score-counts-up visibly without breaking balance.
  const cascadeBonus = cascadeCellsCleared * CASCADE_BONUS_PER_CELL;

  // Apply combo multiplier to base + multi-line + chromatic + cascade, then add flat perfect bonus
  const totalPoints =
    Math.round((clearBonus + multiLineBonus + chromaticBonus + cascadeBonus) * multiplier) + perfectClearBonus;

  return {
    points: totalPoints,
    combo: newCombo,
    multiplier,
    perfectClear: isPerfectClear,
    linesCleared,
    chromaticClears,
    chromaticColors,
    cascadeCellsCleared,
    goldenBonus: 0, // populated downstream by processTurn when golden piece triggers the clear
    breakdown: {
      placementBonus: 0,
      clearBonus,
      comboMultiplier: multiplier,
      perfectClearBonus,
      multiLineBonus,
      chromaticBonus,
      cascadeBonus,
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
