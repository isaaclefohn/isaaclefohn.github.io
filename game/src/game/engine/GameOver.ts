/**
 * Game-over detection for Block Blitz.
 * The game ends when none of the available pieces can be placed anywhere on the board.
 */

import { Grid, canPlace, getGridSize } from './Board';
import { Piece } from './Piece';

/** Check if a single piece can be placed anywhere on the grid */
export function canPlaceAnywhere(grid: Grid, piece: Piece): boolean {
  const size = getGridSize(grid);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (canPlace(grid, piece, r, c)) {
        return true;
      }
    }
  }
  return false;
}

/** Check if ANY of the available pieces can be placed on the grid */
export function hasValidMove(grid: Grid, pieces: Piece[]): boolean {
  for (const piece of pieces) {
    if (canPlaceAnywhere(grid, piece)) {
      return true;
    }
  }
  return false;
}

/** Check if the game is over (no valid moves for any remaining piece) */
export function isGameOver(grid: Grid, remainingPieces: Piece[]): boolean {
  if (remainingPieces.length === 0) return false; // All pieces placed, new set coming
  return !hasValidMove(grid, remainingPieces);
}
