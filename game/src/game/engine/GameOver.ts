/**
 * Game-over detection for Chroma Drop.
 * The game ends when none of the available pieces can be placed anywhere on the board.
 */

import { Grid, canPlace, getGridSize } from './Board';
import { Piece, rotatePiece } from './Piece';

/** Check if a single piece can be placed anywhere on the grid in its CURRENT
 *  orientation (no rotation). The primitive used by the rotation-aware check
 *  below; also exported for callers that genuinely mean "as-is". */
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

/** Check if a piece fits anywhere in ANY of its rotations.
 *
 *  Tap-to-rotate is a FREE, UNLIMITED player action — `gameStore.rotatePiece`
 *  has no coin cost or use limit (unlike swap), and GameScreen rotates a piece
 *  on re-tap. So a piece is only truly unplaceable when none of its up-to-four
 *  90° orientations fit. Game-over detection MUST use this, not the
 *  single-orientation check: otherwise a run is declared lost while the player
 *  could rotate a tray piece into a legal spot (e.g. a horizontal domino over
 *  a vertical 2-cell gap) — a false loss that also fires recordFailure and a
 *  skill-rating penalty. Four 90° turns return to the original orientation, so
 *  iterating 4× enumerates every distinct orientation; we short-circuit on the
 *  first that fits, so symmetric pieces (single/square) cost nothing extra. */
export function canPlaceAnywhereWithRotation(grid: Grid, piece: Piece): boolean {
  let oriented = piece;
  for (let turn = 0; turn < 4; turn++) {
    if (canPlaceAnywhere(grid, oriented)) return true;
    oriented = rotatePiece(oriented);
  }
  return false;
}

/** Check if ANY of the available pieces can be placed on the grid, considering
 *  free rotation. */
export function hasValidMove(grid: Grid, pieces: Piece[]): boolean {
  for (const piece of pieces) {
    if (canPlaceAnywhereWithRotation(grid, piece)) {
      return true;
    }
  }
  return false;
}

/** Check if the game is over: no remaining piece can be placed in ANY rotation. */
export function isGameOver(grid: Grid, remainingPieces: Piece[]): boolean {
  if (remainingPieces.length === 0) return false; // All pieces placed, new set coming
  return !hasValidMove(grid, remainingPieces);
}

/**
 * The pieces that count toward "a legal move exists" for the game-over check.
 *
 * The tray pieces always count. The HELD piece counts ONLY when the tray has an
 * empty slot — `retrieveHeldPiece` moves the held piece into an empty slot, so
 * on a FULL tray the held piece is UNREACHABLE. Including an unreachable held
 * piece would treat a phantom move as real: a full tray of all-unplaceable
 * pieces plus a placeable-but-unretrievable held piece is a genuine game over,
 * not a "keep playing" state — counting the held piece there soft-locks the run
 * (status stays 'playing', no legal move, no game-over modal). This bites right
 * after a refill / swap / continue, when the tray is freshly full while a piece
 * is still held.
 *
 * Pass the POST-turn tray (the `(Piece|null)[]` with empty slots as null).
 */
export function gameOverPieces(tray: (Piece | null)[], heldPiece: Piece | null): Piece[] {
  const pieces = tray.filter((p): p is Piece => p !== null);
  const trayHasEmptySlot = tray.some((p) => p === null);
  return heldPiece && trayHasEmptySlot ? [...pieces, heldPiece] : pieces;
}
