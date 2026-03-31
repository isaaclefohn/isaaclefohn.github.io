import { createGrid } from '../game/engine/Board';
import {
  applyBomb,
  applyRowClear,
  applyColorClear,
  getPowerUpCost,
} from '../game/powerups/PowerUpManager';

describe('PowerUpManager', () => {
  describe('applyBomb', () => {
    it('clears a 3x3 area', () => {
      const grid = createGrid(8);
      // Fill a 5x5 area
      for (let r = 1; r <= 5; r++) {
        for (let c = 1; c <= 5; c++) {
          grid[r][c] = 1;
        }
      }

      const { grid: newGrid, cellsCleared } = applyBomb(grid, 3, 3);
      expect(cellsCleared).toBe(9); // 3x3 area all filled
      // Center and surroundings should be cleared
      for (let r = 2; r <= 4; r++) {
        for (let c = 2; c <= 4; c++) {
          expect(newGrid[r][c]).toBe(0);
        }
      }
      // Edges of the 5x5 should remain
      expect(newGrid[1][1]).toBe(1);
      expect(newGrid[5][5]).toBe(1);
    });

    it('handles edge of grid (no out of bounds)', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      grid[0][1] = 2;
      grid[1][0] = 3;
      grid[1][1] = 4;

      const { grid: newGrid, cellsCleared } = applyBomb(grid, 0, 0);
      expect(cellsCleared).toBe(4);
      expect(newGrid[0][0]).toBe(0);
      expect(newGrid[0][1]).toBe(0);
      expect(newGrid[1][0]).toBe(0);
      expect(newGrid[1][1]).toBe(0);
    });

    it('returns 0 cells cleared on empty area', () => {
      const grid = createGrid(8);
      const { cellsCleared } = applyBomb(grid, 4, 4);
      expect(cellsCleared).toBe(0);
    });
  });

  describe('applyRowClear', () => {
    it('clears an entire row', () => {
      const grid = createGrid(8);
      for (let c = 0; c < 8; c++) {
        grid[3][c] = (c % 7) + 1;
      }

      const { grid: newGrid, cellsCleared } = applyRowClear(grid, 3);
      expect(cellsCleared).toBe(8);
      expect(newGrid[3].every((c) => c === 0)).toBe(true);
    });

    it('only clears filled cells', () => {
      const grid = createGrid(8);
      grid[2][0] = 1;
      grid[2][3] = 2;
      grid[2][7] = 3;

      const { cellsCleared } = applyRowClear(grid, 2);
      expect(cellsCleared).toBe(3);
    });
  });

  describe('applyColorClear', () => {
    it('clears all blocks of one color', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      grid[2][3] = 1;
      grid[5][7] = 1;
      grid[1][1] = 2;
      grid[3][3] = 3;

      const { grid: newGrid, cellsCleared } = applyColorClear(grid, 1);
      expect(cellsCleared).toBe(3);
      expect(newGrid[0][0]).toBe(0);
      expect(newGrid[2][3]).toBe(0);
      expect(newGrid[5][7]).toBe(0);
      // Other colors untouched
      expect(newGrid[1][1]).toBe(2);
      expect(newGrid[3][3]).toBe(3);
    });

    it('returns 0 for nonexistent color', () => {
      const grid = createGrid(8);
      grid[0][0] = 1;
      const { cellsCleared } = applyColorClear(grid, 5);
      expect(cellsCleared).toBe(0);
    });
  });

  describe('getPowerUpCost', () => {
    it('returns correct costs', () => {
      expect(getPowerUpCost('bomb')).toBe(50);
      expect(getPowerUpCost('rowClear')).toBe(75);
      expect(getPowerUpCost('colorClear')).toBe(100);
    });
  });
});
