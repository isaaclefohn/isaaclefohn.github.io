/**
 * Coverage for the "always-solvable" piece generator.
 *
 * The Block Blast secret-sauce mechanic. When the next set of 3
 * pieces is generated for endless mode, at least one placement must
 * exist that creates a line clear — players never get stuck in a
 * "I can't clear anything" frustration spiral.
 *
 * Tests cover:
 *   - hasClearableMove correctness (does at least one piece have a
 *     line-creating placement on this board state?)
 *   - generatePieceSetSmart retries until a clearable set is found
 *   - fallback to dumb generation after maxAttempts
 *   - deterministic-mode contract: the smart function is not called
 *     for non-endless modes (test by directly using generatePieceSet
 *     to confirm same-seed reproducibility)
 */

import {
  generatePieceSet,
  generatePieceSetSmart,
  hasClearableMove,
} from '../game/engine/GameLoop';
import { createGrid, placePiece } from '../game/engine/Board';
import { createPiece, PIECE_POOLS } from '../game/engine/Piece';
import { SeededRandom } from '../utils/seededRandom';

const POOL = PIECE_POOLS.easy;

describe('hasClearableMove', () => {
  it('returns false on an empty board (no clears possible with 3 pieces)', () => {
    const grid = createGrid(8);
    const pieces = [createPiece('single', 1), createPiece('single', 2), createPiece('single', 3)];
    expect(hasClearableMove(grid, pieces)).toBe(false);
  });

  it('returns true when a piece would complete a nearly-full row', () => {
    // Build a board where row 0 has cells 0-6 filled with color 1.
    // A single-cell piece placed at (0, 7) would complete the row.
    let grid = createGrid(8);
    for (let c = 0; c < 7; c++) {
      grid = placePiece(grid, createPiece('single', 1), 0, c);
    }
    const pieces = [createPiece('single', 1)];
    expect(hasClearableMove(grid, pieces)).toBe(true);
  });

  it('returns false when pieces could fit but none complete a line', () => {
    // Build a board with row 0 cells 0-3 filled (half full). Any single
    // placement here can't clear a row because too many cells remain.
    let grid = createGrid(8);
    for (let c = 0; c < 4; c++) {
      grid = placePiece(grid, createPiece('single', 1), 0, c);
    }
    const pieces = [createPiece('single', 1)]; // a single-cell piece can only fill 1 cell
    expect(hasClearableMove(grid, pieces)).toBe(false);
  });

  it('considers ROTATION: a horizontal domino can complete a column when rotated vertical', () => {
    // Column 3 filled rows 2..7 (6 cells); (0,3),(1,3) empty. A horizontal
    // domino cannot complete the column, but rotated to vertical it drops into
    // (0,3)+(1,3) and clears it. Tap-to-rotate is free, so this is a real
    // clearable move — pre-fix (current-orientation only) this was false.
    const grid = createGrid(8);
    for (let r = 2; r < 8; r++) grid[r][3] = 1;
    expect(hasClearableMove(grid, [createPiece('domino_h', 1)])).toBe(true);
  });

  it('handles a null piece slot (already-placed pieces in the tray)', () => {
    // After a player places one of their 3 pieces, the tray has a null
    // slot. hasClearableMove should skip null cleanly, not crash.
    let grid = createGrid(8);
    for (let c = 0; c < 7; c++) {
      grid = placePiece(grid, createPiece('single', 1), 0, c);
    }
    const piecesWithNull = [null, createPiece('single', 1), null];
    expect(hasClearableMove(grid, piecesWithNull)).toBe(true);
  });

  it('counts column completions, not just rows', () => {
    // Fill column 0 from row 0 to row 6. A single-cell piece at (7, 0)
    // would complete the column.
    let grid = createGrid(8);
    for (let r = 0; r < 7; r++) {
      grid = placePiece(grid, createPiece('single', 1), r, 0);
    }
    const pieces = [createPiece('single', 1)];
    expect(hasClearableMove(grid, pieces)).toBe(true);
  });
});

describe('generatePieceSetSmart', () => {
  it('returns a normal set on an empty board (no clears possible, fallback exhausts)', () => {
    // On an empty board, hasClearableMove returns false for any set
    // (single-cell pieces can't fill a whole line). So the smart
    // generator falls back to the last attempted set after maxAttempts.
    const grid = createGrid(8);
    const rng = new SeededRandom(42);
    const pieces = generatePieceSetSmart(rng, POOL, undefined, grid, 3);
    expect(pieces).toHaveLength(3);
    expect(pieces.every((p) => p !== null)).toBe(true);
  });

  it('returns a clearable set when the board has a near-complete line', () => {
    // Build a board with row 0 nearly full (7 of 8 cells). Many random
    // piece-color combinations could complete this row. The smart
    // generator should land on one within a few attempts.
    let grid = createGrid(8);
    for (let c = 0; c < 7; c++) {
      grid = placePiece(grid, createPiece('single', 1), 0, c);
    }
    const rng = new SeededRandom(12345);
    const pieces = generatePieceSetSmart(rng, POOL, 7, grid, 20);
    // Verify the returned set DOES have a clearable move (the smart
    // generator's contract).
    expect(hasClearableMove(grid, pieces)).toBe(true);
  });

  it('returns the LAST attempted set when maxAttempts exhaust without a clearable set', () => {
    // Force the case: empty board, single-cell-only pool would never
    // create a line. The smart generator should exhaust attempts and
    // return the last set anyway (not loop forever, not throw).
    const grid = createGrid(8);
    const rng = new SeededRandom(7);
    const pieces = generatePieceSetSmart(rng, POOL, undefined, grid, 3);
    expect(pieces).toHaveLength(3);
    // The set is what the dumb generator would have produced on its
    // last attempt — we don't pin the exact pieces because the smart
    // generator advances the RNG through multiple attempts. Just pin
    // the shape.
  });
});

describe('generatePieceSet — deterministic-mode contract preserved', () => {
  it('produces the same sequence twice from the same seed', () => {
    // The whole reason the smart variant is gated to endless mode:
    // deterministic seeds must reproduce the same piece sequence so
    // daily-puzzle and level mode replays are comparable across
    // players and sessions. This test pins that the BASE generator
    // is deterministic — the smart variant builds on it but is not
    // used in deterministic modes.
    const rngA = new SeededRandom(987);
    const rngB = new SeededRandom(987);
    const a = generatePieceSet(rngA, POOL, 5);
    const b = generatePieceSet(rngB, POOL, 5);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].id).toBe(b[i].id);
      expect(a[i].colorIndex).toBe(b[i].colorIndex);
    }
  });
});
