/**
 * Tracks board fill percentage and returns a tension level (0-1).
 * Higher tension triggers more intense visual effects and haptics.
 * - 0-40% fill: calm (0.0)
 * - 40-60%: building (0.0-0.5)
 * - 60-80%: intense (0.5-0.8)
 * - 80%+: critical (0.8-1.0)
 */

import { useMemo } from 'react';
import { Grid } from '../game/engine/Board';

export interface TensionState {
  /** 0-1 tension value */
  tension: number;
  /** Fill percentage 0-100 */
  fillPercent: number;
  /** Human-readable level */
  level: 'calm' | 'building' | 'intense' | 'critical';
}

export function useBoardTension(grid: Grid | undefined): TensionState {
  return useMemo(() => {
    if (!grid || grid.length === 0) {
      return { tension: 0, fillPercent: 0, level: 'calm' as const };
    }

    const size = grid.length;
    let filledCells = 0;
    const totalCells = size * size;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== 0) filledCells++;
      }
    }

    const fillPercent = (filledCells / totalCells) * 100;

    let tension: number;
    let level: TensionState['level'];

    if (fillPercent < 40) {
      tension = 0;
      level = 'calm';
    } else if (fillPercent < 60) {
      tension = (fillPercent - 40) / 40; // 0 to 0.5
      level = 'building';
    } else if (fillPercent < 80) {
      tension = 0.5 + (fillPercent - 60) / 66.7; // 0.5 to 0.8
      level = 'intense';
    } else {
      tension = 0.8 + (fillPercent - 80) / 100; // 0.8 to 1.0
      level = 'critical';
    }

    tension = Math.min(1, Math.max(0, tension));

    return { tension, fillPercent, level };
  }, [grid]);
}
