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

/**
 * Perform a full placement turn: place piece, find and clear lines.
 * Returns the resulting grid, lines cleared, and cells cleared.
 */
export function executePlacement(
  grid: Grid,
  piece: Piece,
  row: number,
  col: number
): { grid: Grid; linesCleared: number; cellsCleared: number; clearedRows: number[]; clearedCols: number[] } {
  const afterPlace = placePiece(grid, piece, row, col);
  const { rows, cols } = findFullLines(afterPlace);

  if (rows.length === 0 && cols.length === 0) {
    return {
      grid: afterPlace,
      linesCleared: 0,
      cellsCleared: 0,
      clearedRows: [],
      clearedCols: [],
    };
  }

  const result = clearLines(afterPlace, rows, cols);
  return {
    grid: result.newGrid,
    linesCleared: rows.length + cols.length,
    cellsCleared: result.cellsCleared,
    clearedRows: rows,
    clearedCols: cols,
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
