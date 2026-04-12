/**
 * Hint system for helping stuck players.
 * Analyzes the current grid state and available pieces to suggest
 * an optimal placement that could clear a line or set up a combo.
 */

import { Grid, canPlace, placePiece, findFullLines, getGridSize } from '../engine/Board';
import { Piece, getPieceCells } from '../engine/Piece';

export interface HintSuggestion {
  /** Index into current tray of the piece to place */
  pieceIndex: number;
  /** Board row to place the piece at */
  row: number;
  /** Board column to place the piece at */
  col: number;
  /** How many cells this placement would clear */
  estimatedClears: number;
  /** Ranked score for this placement (higher is better) */
  score: number;
}

/** Simulate placing the piece and count cells cleared by full lines */
function simulateClears(grid: Grid, piece: Piece, row: number, col: number): number {
  const placed = placePiece(grid, piece, row, col);
  const { rows, cols } = findFullLines(placed);
  const size = getGridSize(placed);
  // Count distinct cleared cells (union of rows and columns)
  const set = new Set<string>();
  for (const r of rows) for (let c = 0; c < size; c++) set.add(`${r},${c}`);
  for (const c of cols) for (let r = 0; r < size; r++) set.add(`${r},${c}`);
  return set.size;
}

/** Score a placement heuristically: favor line clears, then edge proximity */
function scorePlacement(
  grid: Grid,
  piece: Piece,
  row: number,
  col: number,
  clears: number,
): number {
  const size = getGridSize(grid);
  let score = clears * 100;

  // Bonus for contact with edges and existing blocks (avoid fragmentation)
  const cells = getPieceCells(piece);
  for (const cell of cells) {
    const r = row + cell.row;
    const c = col + cell.col;
    if (r === 0 || r === size - 1) score += 2;
    if (c === 0 || c === size - 1) score += 2;
    if (r > 0 && grid[r - 1][c] !== 0) score += 1;
    if (r < size - 1 && grid[r + 1][c] !== 0) score += 1;
    if (c > 0 && grid[r][c - 1] !== 0) score += 1;
    if (c < size - 1 && grid[r][c + 1] !== 0) score += 1;
  }

  return score;
}

/** Find the best placement across all pieces in the tray */
export function findBestHint(grid: Grid, pieces: (Piece | null)[]): HintSuggestion | null {
  const size = getGridSize(grid);
  let best: HintSuggestion | null = null;

  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (!piece) continue;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!canPlace(grid, piece, r, c)) continue;
        const clears = simulateClears(grid, piece, r, c);
        const score = scorePlacement(grid, piece, r, c, clears);

        if (!best || score > best.score) {
          best = {
            pieceIndex: i,
            row: r,
            col: c,
            estimatedClears: clears,
            score,
          };
        }
      }
    }
  }

  return best;
}

/** Cost for a hint, scaling slightly with level (10 coins base) */
export function getHintCost(level: number): number {
  return 10 + Math.floor(level / 10) * 5;
}
