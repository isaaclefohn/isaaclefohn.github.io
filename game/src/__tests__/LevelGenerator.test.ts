import { getLevel, isBossLevel, getTotalLevels, getLevelRange, getEndlessConfig } from '../game/levels/LevelGenerator';
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

    it('level 1 is the hand-crafted tutorial with a 2-color palette', () => {
      // The FTUE audit binary: procedural level 1 means ~75% of first-
      // time players never see the chromatic clear, ~25% see it without
      // attribution. Hand-crafted level 1 forces the teach by shrinking
      // the palette to 2 — at palette 2 every line clear is chromatic
      // by definition. This test fails if someone reverts to procedural.
      const config = getLevel(1);
      expect(config.paletteSize).toBe(2);
    });

    it('level 1 is NOT flagged as a boss level', () => {
      // The override lives outside BOSS_LEVELS so the player does not
      // see the BOSS badge or trigger boss-completion reward paths on
      // their first level. Pin both branches: getLevel returns the
      // tutorial config, isBossLevel still says false.
      expect(isBossLevel(1)).toBe(false);
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

    it('returns chromatic-objective config for the full Chapter 1 arc', () => {
      // Regression guard: a refactor that flattens the LevelObjective
      // discriminated union back to "always score" would silently turn
      // these into broken score levels (target=2..8 points = instant
      // win at level start). Pin the contract for all 7 chapter slots.
      const chapter: ReadonlyArray<readonly [number, number]> = [
        [30, 2],  // Ignition
        [60, 3],  // Cascade
        [90, 4],  // Resonance
        [120, 5], // Convergence
        [155, 6], // Saturation (155 not 150 — 150 is a score boss)
        [180, 7], // Spectrum
        [210, 8], // Singularity
      ];
      for (const [level, target] of chapter) {
        const config = getLevel(level);
        expect(config.objective.type).toBe('chromatic');
        expect(config.objective.target).toBe(target);
      }
    });

    it('Chapter 1 targets escalate monotonically', () => {
      // The chapter is a difficulty staircase — each level's chromatic
      // target must be ≥ the previous one so the curve never dips.
      const levels = [30, 60, 90, 120, 155, 180, 210];
      const targets = levels.map((l) => {
        const obj = getLevel(l).objective;
        return obj.type === 'chromatic' ? obj.target : -Infinity;
      });
      for (let i = 1; i < targets.length; i++) {
        expect(targets[i]).toBeGreaterThanOrEqual(targets[i - 1]);
      }
    });

    it('chromatic boss levels still have score-based star thresholds', () => {
      // Stars are off score even on chromatic levels — the win is N
      // chromatic clears, but how-well-you-did is still measured in
      // score so the 1/2/3-star economy is preserved untouched.
      const config = getLevel(30);
      expect(config.starThresholds[0]).toBeGreaterThan(2); // not a chromatic count
      expect(config.starThresholds[0]).toBeLessThan(config.starThresholds[1]);
      expect(config.starThresholds[1]).toBeLessThan(config.starThresholds[2]);
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

  describe('getLevelRange', () => {
    it('returns one config per level in [start, end], in order', () => {
      const range = getLevelRange(24, 27);
      expect(range.map((c) => c.levelNumber)).toEqual([24, 25, 26, 27]);
      // The range dispatches through getLevel, so the boss in it is the boss config.
      expect(range[1].objective.target).toBe(getLevel(25).objective.target);
    });

    it('returns an empty array when start > end', () => {
      expect(getLevelRange(10, 5)).toEqual([]);
    });

    it('returns a single config for a one-level range', () => {
      expect(getLevelRange(7, 7).map((c) => c.levelNumber)).toEqual([7]);
    });
  });

  describe('getEndlessConfig', () => {
    it('is a zero-level, run-until-stuck config starting at the wave-1 palette', () => {
      const cfg = getEndlessConfig();
      expect(cfg.levelNumber).toBe(0);          // endless/zen sentinel
      expect(cfg.objective.type).toBe('score');
      expect(cfg.objective.target).toBeGreaterThan(1_000_000); // effectively unreachable
      expect(cfg.paletteSize).toBe(4);          // STARTING_PALETTE (wave 1)
      expect(cfg.gridSize).toBe(8);
      expect(cfg.piecePool.length).toBeGreaterThan(0);
      expect(cfg.starThresholds[0]).toBeLessThan(cfg.starThresholds[2]);
    });
  });
});
