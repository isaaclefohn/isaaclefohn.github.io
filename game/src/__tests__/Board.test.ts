import {
  createGrid,
  canPlace,
  placePiece,
  findFullLines,
  clearLines,
  executePlacement,
  cloneGrid,
  countFilledCells,
  getEmptyCells,
} from '../game/engine/Board';
import { createPiece } from '../game/engine/Piece';

describe('Board', () => {
  describe('createGrid', () => {
    it('creates an empty 8x8 grid', () => {
      const grid = createGrid(8);
      expect(grid).toHaveLength(8);
      expect(grid[0]).toHaveLength(8);
      expect(grid.flat().every((cell) => cell === 0)).toBe(true);
    });

    it('creates an empty 10x10 grid', () => {
      const grid = createGrid(10);
      expect(grid).toHaveLength(10);
      expect(grid[0]).toHaveLength(10);
    });
  });

  describe('cloneGrid', () => {
    it('creates a deep copy', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      const clone = cloneGrid(grid);
      clone[0][0] = 2;
      expect(grid[0][0]).toBe(1);
      expect(clone[0][0]).toBe(2);
    });
  });

  describe('canPlace', () => {
    it('allows placement on empty grid', () => {
      const grid = createGrid(8);
      const piece = createPiece('domino_h', 1);
      expect(canPlace(grid, piece, 0, 0)).toBe(true);
    });

    it('rejects placement out of bounds', () => {
      const grid = createGrid(8);
      const piece = createPiece('domino_h', 1);
      expect(canPlace(grid, piece, 0, 7)).toBe(false); // extends past col 7
      expect(canPlace(grid, piece, -1, 0)).toBe(false);
    });

    it('rejects placement on occupied cells', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      const piece = createPiece('domino_h', 2);
      expect(canPlace(grid, piece, 0, 0)).toBe(false);
    });

    it('allows placement next to occupied cells', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      const piece = createPiece('domino_h', 2);
      expect(canPlace(grid, piece, 0, 1)).toBe(true);
    });

    it('handles L-shaped pieces', () => {
      const grid = createGrid(8);
      const piece = createPiece('tri_l', 1); // [[true, true], [true, false]]
      expect(canPlace(grid, piece, 0, 0)).toBe(true);
      expect(canPlace(grid, piece, 7, 0)).toBe(false); // row 7 + 1 = 8, out of bounds
    });
  });

  describe('placePiece', () => {
    it('places a piece on the grid', () => {
      const grid = createGrid(8);
      const piece = createPiece('domino_h', 3);
      const newGrid = placePiece(grid, piece, 2, 3);

      expect(newGrid[2][3]).toBe(3);
      expect(newGrid[2][4]).toBe(3);
      // Original grid unchanged
      expect(grid[2][3]).toBe(0);
    });

    it('throws when placement is invalid', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      const piece = createPiece('single', 2);
      expect(() => placePiece(grid, piece, 0, 0)).toThrow();
    });
  });

  describe('findFullLines', () => {
    it('finds a full row', () => {
      const grid = createGrid(8);
      for (let c = 0; c < 8; c++) {
        grid[3][c] = 1;
      }
      const { rows, cols } = findFullLines(grid);
      expect(rows).toEqual([3]);
      expect(cols).toEqual([]);
    });

    it('finds a full column', () => {
      const grid = createGrid(8);
      for (let r = 0; r < 8; r++) {
        grid[r][5] = 1;
      }
      const { rows, cols } = findFullLines(grid);
      expect(rows).toEqual([]);
      expect(cols).toEqual([5]);
    });

    it('finds multiple rows and columns', () => {
      const grid = createGrid(8);
      // Fill row 0 and row 3
      for (let c = 0; c < 8; c++) {
        grid[0][c] = 1;
        grid[3][c] = 2;
      }
      // Fill col 2
      for (let r = 0; r < 8; r++) {
        grid[r][2] = 3;
      }
      const { rows, cols } = findFullLines(grid);
      expect(rows).toEqual([0, 3]);
      expect(cols).toEqual([2]);
    });

    it('returns empty when no lines are full', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      const { rows, cols } = findFullLines(grid);
      expect(rows).toEqual([]);
      expect(cols).toEqual([]);
    });
  });

  describe('clearLines', () => {
    it('clears a row and counts cells', () => {
      const grid = createGrid(8);
      for (let c = 0; c < 8; c++) {
        grid[3][c] = 1;
      }
      const result = clearLines(grid, [3], []);
      expect(result.cellsCleared).toBe(8);
      expect(result.newGrid[3].every((c) => c === 0)).toBe(true);
    });

    it('handles row/column intersection without double counting', () => {
      const grid = createGrid(8);
      for (let c = 0; c < 8; c++) grid[0][c] = 1;
      for (let r = 0; r < 8; r++) grid[r][0] = 2;
      // Cell (0,0) is in both row 0 and col 0
      const result = clearLines(grid, [0], [0]);
      // 8 (row) + 8 (col) - 1 (intersection) = 15
      expect(result.cellsCleared).toBe(15);
    });
  });

  describe('executePlacement', () => {
    it('places piece and clears a full row', () => {
      const grid = createGrid(8);
      // Fill row 0 except col 7
      for (let c = 0; c < 7; c++) {
        grid[0][c] = 1;
      }
      const piece = createPiece('single', 2);
      const result = executePlacement(grid, piece, 0, 7);

      expect(result.linesCleared).toBe(1);
      expect(result.cellsCleared).toBe(8);
      // Row 0 should be cleared
      expect(result.grid[0].every((c) => c === 0)).toBe(true);
    });

    it('returns zero lines when no full lines', () => {
      const grid = createGrid(8);
      const piece = createPiece('single', 1);
      const result = executePlacement(grid, piece, 0, 0);
      expect(result.linesCleared).toBe(0);
      expect(result.cellsCleared).toBe(0);
      expect(result.grid[0][0]).toBe(1);
    });
  });

  describe('countFilledCells', () => {
    it('counts correctly', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      grid[1][1] = 2;
      grid[2][2] = 3;
      expect(countFilledCells(grid)).toBe(3);
    });
  });

  describe('getEmptyCells', () => {
    it('returns all cells for empty grid', () => {
      const grid = createGrid(8);
      expect(getEmptyCells(grid)).toHaveLength(64);
    });

    it('excludes filled cells', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      expect(getEmptyCells(grid)).toHaveLength(63);
    });
  });
});
