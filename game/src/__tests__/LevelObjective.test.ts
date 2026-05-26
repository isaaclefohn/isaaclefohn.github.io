import { checkObjective, type LevelObjective } from '../game/engine/GameLoop';

describe('checkObjective — discriminated union routing', () => {
  describe('score objective (existing behavior)', () => {
    const obj: LevelObjective = { type: 'score', target: 1000 };

    it('wins when score reaches the target', () => {
      expect(checkObjective(obj, 1000, 0)).toBe(true);
    });

    it('wins when score is above the target', () => {
      expect(checkObjective(obj, 1500, 0)).toBe(true);
    });

    it('does NOT win when score is below the target', () => {
      expect(checkObjective(obj, 999, 0)).toBe(false);
    });

    it('does NOT consider chromatic count for score objectives', () => {
      // Even with 100 chromatic clears, if the score is below target, no win.
      // This is the regression guard that proves the branches are isolated.
      expect(checkObjective(obj, 500, 100)).toBe(false);
    });
  });

  describe('chromatic objective (the brand-signature variant)', () => {
    const obj: LevelObjective = { type: 'chromatic', target: 3 };

    it('wins when chromatic-clear count reaches the target', () => {
      expect(checkObjective(obj, 0, 3)).toBe(true);
    });

    it('wins when chromatic count exceeds the target', () => {
      expect(checkObjective(obj, 0, 7)).toBe(true);
    });

    it('does NOT win when chromatic count is below the target', () => {
      expect(checkObjective(obj, 999999, 2)).toBe(false);
    });

    it('ignores score for chromatic objectives', () => {
      // Score doesn't matter — only chromatic count drives the win line.
      // (Stars still come off score via starThresholds, but that's a
      // separate computation downstream of the win check.)
      expect(checkObjective(obj, 0, 3)).toBe(true);
      expect(checkObjective(obj, 999999, 0)).toBe(false);
    });
  });

  describe('zero-target edge cases', () => {
    it('a chromatic objective with target 0 wins immediately', () => {
      // Not something a real level would ship, but the math should be
      // monotonic — guards against off-by-one regressions.
      expect(checkObjective({ type: 'chromatic', target: 0 }, 0, 0)).toBe(true);
    });

    it('a score objective with target 0 wins immediately', () => {
      expect(checkObjective({ type: 'score', target: 0 }, 0, 0)).toBe(true);
    });
  });
});
