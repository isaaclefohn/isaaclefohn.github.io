import { getChromaticColors, countChromaticClears, type Grid } from '../game/engine/Board';

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
