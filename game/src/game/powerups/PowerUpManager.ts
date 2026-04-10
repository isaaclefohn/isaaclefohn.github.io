/**
 * Power-up manager.
 * Handles activation and application of power-ups to the game board.
 */

import { Grid, cloneGrid, getGridSize } from '../engine/Board';

export type PowerUpType = 'bomb' | 'rowClear' | 'colorClear';

export interface PowerUpConfig {
  type: PowerUpType;
  name: string;
  description: string;
  coinCost: number;
  icon: string;
}

export const POWER_UP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  bomb: {
    type: 'bomb',
    name: 'Bomb',
    description: 'Clears a 3x3 area',
    coinCost: 50,
    icon: 'bomb',
  },
  rowClear: {
    type: 'rowClear',
    name: 'Row Clear',
    description: 'Clears an entire row',
    coinCost: 75,
    icon: 'arrow-right',
  },
  colorClear: {
    type: 'colorClear',
    name: 'Color Clear',
    description: 'Clears all blocks of one color',
    coinCost: 100,
    icon: 'paintbrush',
  },
};

/**
 * Apply bomb power-up: clears a 3x3 area centered on (row, col).
 * Returns new grid and number of cells cleared.
 */
export function applyBomb(
  grid: Grid,
  centerRow: number,
  centerCol: number
): { grid: Grid; cellsCleared: number } {
  const newGrid = cloneGrid(grid);
  const size = getGridSize(grid);
  let cleared = 0;

  for (let r = centerRow - 1; r <= centerRow + 1; r++) {
    for (let c = centerCol - 1; c <= centerCol + 1; c++) {
      if (r >= 0 && r < size && c >= 0 && c < size && newGrid[r][c] !== 0) {
        newGrid[r][c] = 0;
        cleared++;
      }
    }
  }

  return { grid: newGrid, cellsCleared: cleared };
}

/**
 * Apply row clear power-up: clears the entire specified row.
 * Returns new grid and number of cells cleared.
 */
export function applyRowClear(
  grid: Grid,
  row: number
): { grid: Grid; cellsCleared: number } {
  const newGrid = cloneGrid(grid);
  const size = getGridSize(grid);
  let cleared = 0;

  for (let c = 0; c < size; c++) {
    if (newGrid[row][c] !== 0) {
      newGrid[row][c] = 0;
      cleared++;
    }
  }

  return { grid: newGrid, cellsCleared: cleared };
}

/**
 * Apply color clear power-up: clears all blocks of the specified color.
 * Returns new grid and number of cells cleared.
 */
export function applyColorClear(
  grid: Grid,
  colorIndex: number
): { grid: Grid; cellsCleared: number } {
  const newGrid = cloneGrid(grid);
  const size = getGridSize(grid);
  let cleared = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (newGrid[r][c] === colorIndex) {
        newGrid[r][c] = 0;
        cleared++;
      }
    }
  }

  return { grid: newGrid, cellsCleared: cleared };
}

/** Get the cost of a power-up in coins */
export function getPowerUpCost(type: PowerUpType): number {
  return POWER_UP_CONFIGS[type].coinCost;
}

/** Preview which cells a bomb would clear (for targeting overlay) */
export function previewBomb(grid: Grid, centerRow: number, centerCol: number): { row: number; col: number }[] {
  const size = getGridSize(grid);
  const cells: { row: number; col: number }[] = [];
  for (let r = centerRow - 1; r <= centerRow + 1; r++) {
    for (let c = centerCol - 1; c <= centerCol + 1; c++) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

/** Preview which cells a row clear would affect */
export function previewRowClear(grid: Grid, row: number): { row: number; col: number }[] {
  const size = getGridSize(grid);
  const cells: { row: number; col: number }[] = [];
  for (let c = 0; c < size; c++) {
    cells.push({ row, col: c });
  }
  return cells;
}

/** Preview which cells a color clear would affect */
export function previewColorClear(grid: Grid, colorIndex: number): { row: number; col: number }[] {
  const size = getGridSize(grid);
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === colorIndex) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}
