import {
  getDailyTiles,
  rollWheel,
  RARE_TILE_INDEX,
  RARE_WEIGHT,
} from '../game/engine/dailyWheel';

describe('daily reward wheel', () => {
  describe('tile layout', () => {
    it('always returns exactly 4 tiles', () => {
      for (let day = 0; day < 30; day++) {
        expect(getDailyTiles(day)).toHaveLength(4);
      }
    });

    it('places the rare jackpot at the fixed slot', () => {
      const tiles = getDailyTiles(0);
      expect(tiles[RARE_TILE_INDEX].rarity).toBe('rare');
      expect(tiles[RARE_TILE_INDEX].kind).toBe('jackpot');
    });

    it('rotates the power-up across days deterministically', () => {
      // Same day → same power-up; consecutive days → cycle through the rotation.
      expect(getDailyTiles(0)[2].powerUp).toBe('bomb');
      expect(getDailyTiles(1)[2].powerUp).toBe('rowClear');
      expect(getDailyTiles(2)[2].powerUp).toBe('colorClear');
      expect(getDailyTiles(3)[2].powerUp).toBe('bomb'); // cycle wraps
    });

    it('returns the same tiles for the same day number (deterministic)', () => {
      const a = getDailyTiles(7);
      const b = getDailyTiles(7);
      expect(a).toEqual(b);
    });
  });

  describe('roll', () => {
    const tiles = getDailyTiles(0);

    it('lands on the jackpot when r is below the rare weight', () => {
      // r = 0 → smallest value → in the rare bucket.
      const result = rollWheel(tiles, () => 0);
      expect(result.index).toBe(RARE_TILE_INDEX);
      expect(result.tile.rarity).toBe('rare');
    });

    it('lands on a common tile when r is above the rare weight', () => {
      // r = 0.5 → middle → common bucket.
      const result = rollWheel(tiles, () => 0.5);
      expect(result.index).toBeLessThan(RARE_TILE_INDEX);
      expect(result.tile.rarity).toBe('common');
    });

    it('distributes the 3 common tiles roughly evenly', () => {
      // Sweep r across the common range — should hit each of the 3 common tiles.
      const seen = new Set<number>();
      // Step through values just past the rare boundary.
      for (let r = RARE_WEIGHT + 0.01; r < 0.99; r += 0.05) {
        seen.add(rollWheel(tiles, () => r).index);
      }
      // All 3 common indices (0, 1, 2) should appear.
      expect(seen.has(0)).toBe(true);
      expect(seen.has(1)).toBe(true);
      expect(seen.has(2)).toBe(true);
      // Should NEVER land on the rare slot from common range.
      expect(seen.has(RARE_TILE_INDEX)).toBe(false);
    });

    it('over 10000 rolls, jackpot rate approximates RARE_WEIGHT', () => {
      let jackpots = 0;
      const N = 10000;
      for (let i = 0; i < N; i++) {
        const r = i / N;
        if (rollWheel(tiles, () => r).tile.rarity === 'rare') jackpots++;
      }
      expect(jackpots / N).toBeCloseTo(RARE_WEIGHT, 2);
    });
  });
});
