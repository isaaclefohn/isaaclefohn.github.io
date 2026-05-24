import { generatePieceSet } from '../game/engine/GameLoop';
import { generateLevelConfig } from '../game/levels/DifficultyScaler';
import { PIECE_POOLS } from '../game/engine/Piece';
import { SeededRandom } from '../utils/seededRandom';
import { COLORS } from '../utils/constants';

describe('color palette control (chromatic achievability)', () => {
  it('limits generated piece colors to the requested palette size', () => {
    const rng = new SeededRandom(123);
    for (let i = 0; i < 100; i++) {
      for (const p of generatePieceSet(rng, PIECE_POOLS.easy, 4)) {
        expect(p.colorIndex).toBeGreaterThanOrEqual(1);
        expect(p.colorIndex).toBeLessThanOrEqual(4);
      }
    }
  });

  it('uses the full 7-color palette when no size is given', () => {
    const rng = new SeededRandom(7);
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      for (const p of generatePieceSet(rng, PIECE_POOLS.easy)) seen.add(p.colorIndex);
    }
    expect(Math.max(...seen)).toBe(COLORS.blocks.length);
  });

  it('gives early levels a small, learnable palette and scales it up', () => {
    expect(generateLevelConfig(1).paletteSize).toBe(4);
    expect(generateLevelConfig(15).paletteSize).toBe(4);
    expect(generateLevelConfig(60).paletteSize).toBe(5);
    expect(generateLevelConfig(250).paletteSize).toBe(6);
  });

  it('keeps piece shapes deterministic across palette sizes (only colors change)', () => {
    const a = generatePieceSet(new SeededRandom(999), PIECE_POOLS.medium, 3);
    const b = generatePieceSet(new SeededRandom(999), PIECE_POOLS.medium, 7);
    expect(a.map((p) => p.shape)).toEqual(b.map((p) => p.shape));
  });
});
