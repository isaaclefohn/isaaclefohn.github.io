import { createGrid } from '../game/engine/Board';
import { createPiece } from '../game/engine/Piece';
import { isGameOver, canPlaceAnywhere, hasValidMove } from '../game/engine/GameOver';

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
});
