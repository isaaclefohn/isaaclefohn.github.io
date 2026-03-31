import { getLevel, isBossLevel, getTotalLevels } from '../game/levels/LevelGenerator';
import { getDifficultyParams, generateLevelConfig } from '../game/levels/DifficultyScaler';

describe('LevelGenerator', () => {
  describe('getLevel', () => {
    it('returns a config for level 1', () => {
      const config = getLevel(1);
      expect(config.levelNumber).toBe(1);
      expect(config.gridSize).toBe(8);
      expect(config.objective.type).toBe('score');
      expect(config.objective.target).toBeGreaterThan(0);
      expect(config.piecePool.length).toBeGreaterThan(0);
    });

    it('returns boss level config for level 25', () => {
      const config = getLevel(25);
      expect(config.levelNumber).toBe(25);
      expect(config.objective.target).toBe(1200);
    });

    it('returns procedural config for non-boss levels', () => {
      const config = getLevel(26);
      expect(config.levelNumber).toBe(26);
    });

    it('produces deterministic configs', () => {
      const config1 = getLevel(42);
      const config2 = getLevel(42);
      expect(config1).toEqual(config2);
    });
  });

  describe('getDifficultyParams', () => {
    it('increases score targets with level', () => {
      const easy = getDifficultyParams(1);
      const medium = getDifficultyParams(30);
      const hard = getDifficultyParams(80);
      expect(medium.scoreTarget).toBeGreaterThan(easy.scoreTarget);
      expect(hard.scoreTarget).toBeGreaterThan(medium.scoreTarget);
    });

    it('uses 8x8 grid for early levels', () => {
      const params = getDifficultyParams(10);
      expect(params.gridSize).toBe(8);
    });

    it('uses 10x10 grid for high levels', () => {
      const params = getDifficultyParams(250);
      expect(params.gridSize).toBe(10);
    });
  });

  describe('isBossLevel', () => {
    it('returns true for multiples of 25', () => {
      expect(isBossLevel(25)).toBe(true);
      expect(isBossLevel(50)).toBe(true);
      expect(isBossLevel(100)).toBe(true);
    });

    it('returns false for non-multiples', () => {
      expect(isBossLevel(1)).toBe(false);
      expect(isBossLevel(26)).toBe(false);
    });

    it('returns false for 0', () => {
      expect(isBossLevel(0)).toBe(false);
    });
  });

  describe('getTotalLevels', () => {
    it('returns 500', () => {
      expect(getTotalLevels()).toBe(500);
    });
  });

  describe('generateLevelConfig', () => {
    it('generates valid config for any level', () => {
      for (const level of [1, 10, 50, 100, 200, 500]) {
        const config = generateLevelConfig(level);
        expect(config.levelNumber).toBe(level);
        expect(config.gridSize).toBeGreaterThanOrEqual(8);
        expect(config.gridSize).toBeLessThanOrEqual(10);
        expect(config.objective.target).toBeGreaterThan(0);
        expect(config.starThresholds[0]).toBeLessThan(config.starThresholds[1]);
        expect(config.starThresholds[1]).toBeLessThan(config.starThresholds[2]);
      }
    });
  });
});
