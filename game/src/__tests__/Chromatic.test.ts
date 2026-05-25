import { getChromaticColors, countChromaticClears, getNearChromaticLines, type Grid } from '../game/engine/Board';

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
