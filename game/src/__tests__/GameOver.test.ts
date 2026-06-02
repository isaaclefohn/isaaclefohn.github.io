import { createGrid } from '../game/engine/Board';
import { createPiece } from '../game/engine/Piece';
import {
  isGameOver,
  canPlaceAnywhere,
  canPlaceAnywhereWithRotation,
  hasValidMove,
  gameOverPieces,
} from '../game/engine/GameOver';

describe('GameOver', () => {
  describe('canPlaceAnywhere', () => {
    it('returns true for single piece on empty grid', () => {
      const grid = createGrid(8);
      const piece = createPiece('single', 1);
      expect(canPlaceAnywhere(grid, piece)).toBe(true);
    });

    it('returns false when grid is completely full', () => {
      const grid = createGrid(8);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          grid[r][c] = 1;
        }
      }
      const piece = createPiece('single', 2);
      expect(canPlaceAnywhere(grid, piece)).toBe(false);
    });

    it('returns false when only spaces too small for piece exist', () => {
      const grid = createGrid(8);
      // Fill entire grid except one cell
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          grid[r][c] = 1;
        }
      }
      grid[4][4] = 0; // One empty cell
      const piece = createPiece('domino_h', 2); // Needs 2 cells
      expect(canPlaceAnywhere(grid, piece)).toBe(false);
    });

    it('finds a valid spot in a tight grid', () => {
      const grid = createGrid(8);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          grid[r][c] = 1;
        }
      }
      grid[4][4] = 0;
      grid[4][5] = 0;
      const piece = createPiece('domino_h', 2);
      expect(canPlaceAnywhere(grid, piece)).toBe(true);
    });
  });

  describe('hasValidMove', () => {
    it('returns true if any piece fits', () => {
      const grid = createGrid(8);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          grid[r][c] = 1;
        }
      }
      grid[0][0] = 0;
      const pieces = [
        createPiece('domino_h', 1), // Can't fit
        createPiece('single', 2),   // Can fit!
      ];
      expect(hasValidMove(grid, pieces)).toBe(true);
    });

    it('returns false if no piece fits', () => {
      const grid = createGrid(8);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          grid[r][c] = 1;
        }
      }
      grid[0][0] = 0;
      const pieces = [
        createPiece('domino_h', 1),
        createPiece('tri_h', 2),
      ];
      expect(hasValidMove(grid, pieces)).toBe(false);
    });
  });

  describe('isGameOver', () => {
    it('returns false when pieces array is empty (new set coming)', () => {
      const grid = createGrid(8);
      expect(isGameOver(grid, [])).toBe(false);
    });

    it('returns false on empty grid with any pieces', () => {
      const grid = createGrid(8);
      const pieces = [createPiece('big_sq', 1)];
      expect(isGameOver(grid, pieces)).toBe(false);
    });

    it('returns true on full grid', () => {
      const grid = createGrid(8);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          grid[r][c] = 1;
        }
      }
      const pieces = [createPiece('single', 2)];
      expect(isGameOver(grid, pieces)).toBe(true);
    });
  });

  describe('rotation-aware game-over (the fix)', () => {
    // Tap-to-rotate is free and unlimited, so a piece is only truly stuck when
    // NO rotation fits. Before the fix, game-over was declared on the current
    // orientation alone — ending runs a player could continue by rotating.

    /** Fill the whole board, then punch out the given empty cells. */
    const fullGridExcept = (empties: [number, number][]) => {
      const grid = createGrid(8);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) grid[r][c] = 1;
      for (const [r, c] of empties) grid[r][c] = 0;
      return grid;
    };

    it('a horizontal domino over a VERTICAL gap fits only after rotation', () => {
      const grid = fullGridExcept([[4, 4], [5, 4]]); // vertical 2-cell gap
      const dominoH = createPiece('domino_h', 1);
      // As-is it cannot fit (no free horizontal pair)...
      expect(canPlaceAnywhere(grid, dominoH)).toBe(false);
      // ...but one 90° turn (vertical domino) drops straight in.
      expect(canPlaceAnywhereWithRotation(grid, dominoH)).toBe(true);
    });

    it('does NOT declare game-over when a rotation of a tray piece fits', () => {
      const grid = fullGridExcept([[4, 4], [5, 4]]);
      const pieces = [createPiece('domino_h', 1)];
      expect(hasValidMove(grid, pieces)).toBe(true);   // was false pre-fix
      expect(isGameOver(grid, pieces)).toBe(false);    // the false-loss bug
    });

    it('an L-tromino fits an L-notch only in a specific rotation', () => {
      // Notch cells (0,0),(1,0),(1,1) — an L that tri_l matches only at 270°.
      const grid = fullGridExcept([[0, 0], [1, 0], [1, 1]]);
      const triL = createPiece('tri_l', 3);
      expect(canPlaceAnywhere(grid, triL)).toBe(false);            // not as-is
      expect(canPlaceAnywhereWithRotation(grid, triL)).toBe(true); // a rotation fits
      expect(isGameOver(grid, [triL])).toBe(false);
    });

    it('still declares game-over when NO rotation of any piece fits', () => {
      // One isolated free cell: nothing 2+ cells fits in any orientation.
      const grid = fullGridExcept([[4, 4]]);
      const pieces = [createPiece('domino_h', 1), createPiece('tri_l', 2)];
      expect(canPlaceAnywhereWithRotation(grid, pieces[0])).toBe(false);
      expect(canPlaceAnywhereWithRotation(grid, pieces[1])).toBe(false);
      expect(isGameOver(grid, pieces)).toBe(true);
    });
  });

  describe('gameOverPieces — a held piece only counts when retrievable', () => {
    const A = createPiece('domino_h', 1);
    const B = createPiece('tri_l', 2);
    const C = createPiece('single', 3);
    const held = createPiece('tetra_sq', 4);

    it('FULL tray excludes the held piece (it cannot be retrieved into a full tray)', () => {
      // The soft-lock guard: after a refill/swap/continue the tray is full, so a
      // held piece is unreachable and must NOT count as a move.
      const pool = gameOverPieces([A, B, C], held);
      expect(pool).toEqual([A, B, C]); // held dropped
      expect(pool).not.toContain(held);
    });

    it('tray with an empty slot INCLUDES the held piece (retrievable)', () => {
      const pool = gameOverPieces([A, null, C], held);
      expect(pool).toContain(held);
      expect(pool).toHaveLength(3); // A, C, held
    });

    it('no held piece returns just the non-null tray pieces', () => {
      expect(gameOverPieces([A, null, C], null)).toEqual([A, C]);
      expect(gameOverPieces([A, B, C], null)).toEqual([A, B, C]);
    });

    it('an empty tray with a held piece counts the held piece (slots are free)', () => {
      expect(gameOverPieces([null, null, null], held)).toEqual([held]);
    });
  });
});
