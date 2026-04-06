/**
 * Core board logic for Block Blitz.
 * Pure functions operating on immutable grid state.
 * Grid values: 0 = empty, 1-7 = block color index.
 */

import { Piece, getPieceCells } from './Piece';

export type Grid = number[][];

export interface ClearResult {
  newGrid: Grid;
  clearedRows: number[];
  clearedCols: number[];
  cellsCleared: number;
}

/** Create an empty grid of the given size */
export function createGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

/** Deep clone a grid */
export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

/** Get grid size (assumes square grid) */
export function getGridSize(grid: Grid): number {
  return grid.length;
}

/** Check if a position is within grid bounds */
export function isInBounds(grid: Grid, row: number, col: number): boolean {
  const size = grid.length;
  return row >= 0 && row < size && col >= 0 && col < size;
}

/** Check if a piece can be placed at the given position */
export function canPlace(grid: Grid, piece: Piece, row: number, col: number): boolean {
  const cells = getPieceCells(piece);
  for (const cell of cells) {
    const r = row + cell.row;
    const c = col + cell.col;
    if (!isInBounds(grid, r, c)) return false;
    if (grid[r][c] !== 0) return false;
  }
  return true;
}

/** Place a piece on the grid, returning a new grid (immutable) */
export function placePiece(grid: Grid, piece: Piece, row: number, col: number): Grid {
  if (!canPlace(grid, piece, row, col)) {
    throw new Error(`Cannot place piece ${piece.id} at (${row}, ${col})`);
  }

  const newGrid = cloneGrid(grid);
  const cells = getPieceCells(piece);
  for (const cell of cells) {
    newGrid[row + cell.row][col + cell.col] = piece.colorIndex;
  }
  return newGrid;
}

/** Find all complete (fully filled) rows and columns */
export function findFullLines(grid: Grid): { rows: number[]; cols: number[] } {
  const size = grid.length;
  const rows: number[] = [];
  const cols: number[] = [];

  // Check rows
  for (let r = 0; r < size; r++) {
    let full = true;
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(r);
  }

  // Check columns
  for (let c = 0; c < size; c++) {
    let full = true;
    for (let r = 0; r < size; r++) {
      if (grid[r][c] === 0) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }

  return { rows, cols };
}

/** Clear the given rows and columns, returning the new grid and count of cells cleared */
export function clearLines(grid: Grid, rows: number[], cols: number[]): ClearResult {
  const size = grid.length;
  const newGrid = cloneGrid(grid);
  const clearedCells = new Set<string>();

  // Mark cells to clear (use set to avoid double-counting intersections)
  for (const r of rows) {
    for (let c = 0; c < size; c++) {
      if (newGrid[r][c] !== 0) {
        clearedCells.add(`${r},${c}`);
      }
    }
  }
  for (const c of cols) {
    for (let r = 0; r < size; r++) {
      if (newGrid[r][c] !== 0) {
        clearedCells.add(`${r},${c}`);
      }
    }
  }

  // Clear the cells
  for (const key of clearedCells) {
    const [r, c] = key.split(',').map(Number);
    newGrid[r][c] = 0;
  }

  return {
    newGrid,
    clearedRows: rows,
    clearedCols: cols,
    cellsCleared: clearedCells.size,
  };
}

/** Apply gravity — drop all blocks downward to fill empty gaps */
export function applyGravity(grid: Grid): Grid {
  const size = grid.length;
  const newGrid = cloneGrid(grid);

  // Process each column independently
  for (let c = 0; c < size; c++) {
    // Collect all non-zero values from bottom to top
    let writeRow = size - 1;
    for (let r = size - 1; r >= 0; r--) {
      if (newGrid[r][c] !== 0) {
        if (writeRow !== r) {
          newGrid[writeRow][c] = newGrid[r][c];
          newGrid[r][c] = 0;
        }
        writeRow--;
      }
    }
  }

  return newGrid;
}

/**
 * Perform a full placement turn: place piece, find and clear lines.
 * Now includes gravity cascades — after clearing, blocks fall down
 * and may trigger additional clears in a chain reaction.
 */
export interface PlacementResult {
  grid: Grid;
  linesCleared: number;
  cellsCleared: number;
  clearedRows: number[];
  clearedCols: number[];
  perfectClear: boolean;
  /** Number of cascade chain reactions (0 = no cascades) */
  cascadeCount: number;
}

export function executePlacement(
  grid: Grid,
  piece: Piece,
  row: number,
  col: number
): PlacementResult {
  const afterPlace = placePiece(grid, piece, row, col);

  let currentGrid = afterPlace;
  let totalLinesCleared = 0;
  let totalCellsCleared = 0;
  let allClearedRows: number[] = [];
  let allClearedCols: number[] = [];
  let cascadeCount = 0;

  // Clear + gravity cascade loop
  while (true) {
    const { rows, cols } = findFullLines(currentGrid);
    if (rows.length === 0 && cols.length === 0) break;

    const result = clearLines(currentGrid, rows, cols);
    totalLinesCleared += rows.length + cols.length;
    totalCellsCleared += result.cellsCleared;
    allClearedRows = [...allClearedRows, ...rows];
    allClearedCols = [...allClearedCols, ...cols];

    // Apply gravity after clearing
    currentGrid = applyGravity(result.newGrid);

    if (cascadeCount > 0) {
      // This was a cascade (not the first clear)
    }
    cascadeCount++;
  }

  // cascadeCount is total clear rounds; cascades = rounds - 1
  const actualCascades = Math.max(0, cascadeCount - 1);

  if (totalLinesCleared === 0) {
    return {
      grid: currentGrid,
      linesCleared: 0,
      cellsCleared: 0,
      clearedRows: [],
      clearedCols: [],
      perfectClear: false,
      cascadeCount: 0,
    };
  }

  const isPerfectClear = countFilledCells(currentGrid) === 0;

  return {
    grid: currentGrid,
    linesCleared: totalLinesCleared,
    cellsCleared: totalCellsCleared,
    clearedRows: allClearedRows,
    clearedCols: allClearedCols,
    perfectClear: isPerfectClear,
    cascadeCount: actualCascades,
  };
}

/** Count total filled cells on the grid */
export function countFilledCells(grid: Grid): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== 0) count++;
    }
  }
  return count;
}

/** Get all empty cell positions */
export function getEmptyCells(grid: Grid): { row: number; col: number }[] {
  const empty: { row: number; col: number }[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 0) {
        empty.push({ row: r, col: c });
      }
    }
  }
  return empty;
}

/** Find rows and columns that are one cell away from being full */
export function getNearClearLines(grid: Grid): { rows: number[]; cols: number[] } {
  const size = grid.length;
  const rows: number[] = [];
  const cols: number[] = [];

  for (let r = 0; r < size; r++) {
    let empty = 0;
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) empty++;
    }
    if (empty === 1) rows.push(r);
  }

  for (let c = 0; c < size; c++) {
    let empty = 0;
    for (let r = 0; r < size; r++) {
      if (grid[r][c] === 0) empty++;
    }
    if (empty === 1) cols.push(c);
  }

  return { rows, cols };
}

/** Find the best placement for a piece on the grid.
 *  Scores by: lines cleared > cells adjacent to filled > lower row (prefer bottom).
 *  Returns null if no placement exists. */
export function findBestPlacement(
  grid: Grid,
  piece: Piece
): { row: number; col: number } | null {
  const size = grid.length;
  let bestPos: { row: number; col: number } | null = null;
  let bestScore = -1;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!canPlace(grid, piece, r, c)) continue;

      // Simulate placement
      const placed = placePiece(grid, piece, r, c);
      const { rows, cols } = findFullLines(placed);
      const linesCleared = rows.length + cols.length;

      // Count adjacency to existing blocks
      const cells = getPieceCells(piece);
      let adjacency = 0;
      for (const cell of cells) {
        const pr = r + cell.row;
        const pc = c + cell.col;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          const nr = pr + dr;
          const nc = pc + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== 0) {
            adjacency++;
          }
        }
      }

      // Score: lines cleared (most important), then adjacency, then prefer lower placement
      const score = linesCleared * 10000 + adjacency * 100 + r;
      if (score > bestScore) {
        bestScore = score;
        bestPos = { row: r, col: c };
      }
    }
  }

  return bestPos;
}
