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
  const size = getGridSize(grid);
  // Defense-in-depth: bounds-check `row` the same way applyBomb bounds-checks
  // its 3x3 sweep. Without this, an out-of-range row throws "Cannot read
  // properties of undefined" on `newGrid[row][c]`. No live caller passes a bad
  // row today (taps come from rendered cells), but keeping the engine API safe
  // regardless of caller behavior matches applyColorClear's guard philosophy
  // and lets a no-op return null upstream (so no power-up is consumed).
  if (row < 0 || row >= size) return { grid, cellsCleared: 0 };

  const newGrid = cloneGrid(grid);
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
  // Defensive guard: `0` is the empty-cell sentinel on the grid. If a
  // caller ever passes 0 (the GameScreen path defaults to the tapped
  // cell's value via `colorIndex ?? gameState.grid[row][col]`, so tapping
  // an empty cell could reach here), we'd "clear" every empty cell —
  // counting cellsCleared as the number of empty cells and looking like
  // a successful power-up firing on a board that wasn't actually changed.
  // GameScreen has its own guard at the call site (treats colorIdx > 0
  // before showing preview) but a defense-in-depth check here makes the
  // engine API safe regardless of caller behavior.
  if (colorIndex <= 0) return { grid, cellsCleared: 0 };

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
