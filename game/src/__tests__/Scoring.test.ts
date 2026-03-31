import {
  scorePlacement,
  scoreClear,
  calculateStars,
  calculateCoinReward,
} from '../game/engine/Scoring';

describe('Scoring', () => {
  describe('scorePlacement', () => {
    it('gives placement bonus based on cell count', () => {
      const event = scorePlacement(4);
      expect(event.points).toBe(20); // 4 * 5
      expect(event.combo).toBe(0);
    });

    it('gives 5 points for a single cell', () => {
      const event = scorePlacement(1);
      expect(event.points).toBe(5);
    });
  });

  describe('scoreClear', () => {
    it('scores a single line clear with no prior combo', () => {
      const event = scoreClear(1, 8, 0);
      // 8 cells * 10 base * 1.0 line bonus * 1.0 combo = 80
      expect(event.points).toBe(80);
      expect(event.combo).toBe(1);
      expect(event.multiplier).toBe(1);
    });

    it('applies line bonus for multiple lines', () => {
      const event = scoreClear(2, 16, 0);
      // 16 * 10 * 1.5 (2 lines) * 1.0 (combo 1) = 240
      expect(event.points).toBe(240);
      expect(event.combo).toBe(1);
    });

    it('applies combo multiplier for consecutive clears', () => {
      const event = scoreClear(1, 8, 1);
      // 8 * 10 * 1.0 * 1.5 (combo 2) = 120
      expect(event.points).toBe(120);
      expect(event.combo).toBe(2);
      expect(event.multiplier).toBe(1.5);
    });

    it('caps combo multiplier at max', () => {
      const event = scoreClear(1, 8, 10);
      // combo 11, but max index is 6 -> multiplier 5
      expect(event.multiplier).toBe(5);
      expect(event.combo).toBe(11);
    });
  });

  describe('calculateStars', () => {
    const thresholds: [number, number, number] = [100, 200, 300];

    it('returns 0 stars below threshold', () => {
      expect(calculateStars(50, thresholds)).toBe(0);
    });

    it('returns 1 star at first threshold', () => {
      expect(calculateStars(100, thresholds)).toBe(1);
      expect(calculateStars(150, thresholds)).toBe(1);
    });

    it('returns 2 stars at second threshold', () => {
      expect(calculateStars(200, thresholds)).toBe(2);
    });

    it('returns 3 stars at third threshold', () => {
      expect(calculateStars(300, thresholds)).toBe(3);
      expect(calculateStars(500, thresholds)).toBe(3);
    });
  });

  describe('calculateCoinReward', () => {
    it('returns correct rewards', () => {
      expect(calculateCoinReward(0)).toBe(0);
      expect(calculateCoinReward(1)).toBe(10);
      expect(calculateCoinReward(2)).toBe(25);
      expect(calculateCoinReward(3)).toBe(50);
    });
  });
});
