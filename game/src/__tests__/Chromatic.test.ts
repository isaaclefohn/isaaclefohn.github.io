import { getChromaticColors, countChromaticClears, getNearChromaticLines, executePlacement, type Grid } from '../game/engine/Board';
import { createPiece } from '../game/engine/Piece';

describe('chromatic color capture (signature mechanic)', () => {
  it('returns the color index of a single-color full row', () => {
    const grid: Grid = [
      [3, 3, 3, 3],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(getChromaticColors(grid, [0], [])).toEqual([3]);
    expect(countChromaticClears(grid, [0], [])).toBe(1);
  });

  it('does not count a mixed-color full line as chromatic', () => {
    const grid: Grid = [
      [3, 3, 5, 3],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(getChromaticColors(grid, [0], [])).toEqual([]);
    expect(countChromaticClears(grid, [0], [])).toBe(0);
  });

  it('captures one color per chromatic line across rows and cols', () => {
    const grid: Grid = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 2, 2, 2],
    ];
    expect(getChromaticColors(grid, [3], [0]).sort()).toEqual([2, 2]);
  });

  it('reports distinct colors when different single-color rows clear together', () => {
    // row 0 all red(1), row 1 all purple(6) — non-intersecting, so both chromatic
    const grid: Grid = [
      [1, 1, 1, 1],
      [6, 6, 6, 6],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const colors = getChromaticColors(grid, [0, 1], []);
    expect(new Set(colors)).toEqual(new Set([1, 6]));
  });
});

describe('near-chromatic detection (teaching cue)', () => {
  it('flags a row that is one matching-color piece from a chromatic clear', () => {
    const grid: Grid = [
      [4, 4, 4, 0], // one empty, all green(4) -> near-chromatic
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { rows, cols } = getNearChromaticLines(grid);
    expect(rows).toEqual([{ index: 0, color: 4 }]);
    expect(cols).toEqual([]);
  });

  it('does not flag a one-empty row whose filled cells are mixed colors', () => {
    const grid: Grid = [
      [4, 4, 5, 0], // one empty but mixed -> not near-chromatic
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(getNearChromaticLines(grid).rows).toEqual([]);
  });

  it('does not flag an already-full line (that is a clear, not a near)', () => {
    const grid: Grid = [
      [4, 4, 4, 4], // full -> already a chromatic clear, not "near"
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(getNearChromaticLines(grid).rows).toEqual([]);
  });

  it('flags a near-chromatic column with its color', () => {
    const grid: Grid = [
      [6, 0, 0, 0],
      [6, 0, 0, 0],
      [6, 0, 0, 0],
      [0, 0, 0, 0], // col 0 has one empty, all purple(6)
    ];
    expect(getNearChromaticLines(grid).cols).toEqual([{ index: 0, color: 6 }]);
  });
});

describe('board-wide chromatic cascade (somatic detonation)', () => {
  it('detonates same-color cells across the board when a chromatic line clears', () => {
    // Row 0 is one green(3) short of a chromatic clear; an extra green sits at
    // (3,0) and should be swept off the board by the cascade when row 0 fires.
    const grid: Grid = [
      [3, 3, 3, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [3, 0, 0, 0],
    ];
    const piece = createPiece('single', 3);
    const result = executePlacement(grid, piece, 0, 3);
    expect(result.chromaticClears).toBe(1);
    expect(result.chromaticColors).toEqual([3]);
    expect(result.cascadeCellsCleared).toBe(1);
    // The lone green at (3,0) was detonated by the cascade.
    expect(result.grid[3][0]).toBe(0);
  });

  it('does NOT cascade when the cleared line is mixed-color (not chromatic)', () => {
    // Row 0 fills but contains two colors — not chromatic, so no cascade.
    // A green elsewhere should remain on the board.
    const grid: Grid = [
      [3, 5, 3, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [3, 0, 0, 0],
    ];
    const piece = createPiece('single', 3);
    const result = executePlacement(grid, piece, 0, 3);
    expect(result.linesCleared).toBe(1);
    expect(result.chromaticClears).toBe(0);
    expect(result.cascadeCellsCleared).toBe(0);
    // The green at (3,0) is untouched.
    expect(result.grid[3][0]).toBe(3);
  });

  it('cascades both colors when a single move clears two chromatic lines', () => {
    // Place a green(3) at (0,3) that completes BOTH row 0 (all green) and
    // col 3 (all green). Extra greens elsewhere all detonate.
    const grid: Grid = [
      [3, 3, 3, 0],
      [0, 0, 0, 3],
      [0, 0, 0, 3],
      [3, 0, 3, 3],
    ];
    const piece = createPiece('single', 3);
    const result = executePlacement(grid, piece, 0, 3);
    // Two chromatic lines (row 0 + col 3) both fire.
    expect(result.chromaticClears).toBe(2);
    expect(result.chromaticColors.sort()).toEqual([3, 3]);
    // The remaining greens at (3,0) and (3,2) both cascade away.
    expect(result.cascadeCellsCleared).toBeGreaterThanOrEqual(2);
    expect(result.grid[3][0]).toBe(0);
    expect(result.grid[3][2]).toBe(0);
  });
});
