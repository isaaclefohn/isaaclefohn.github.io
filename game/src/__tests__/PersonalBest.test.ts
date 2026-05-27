/**
 * Pure-function coverage for the personal-best detection.
 *
 * The new-best celebration is the dopamine peak that mirrors the
 * near-miss callout's dopamine valley. Both gates need clear,
 * test-pinned boundaries because both shape the player's emotional
 * response at the exact moment of game-over.
 */

import { isNewPersonalBest, personalBestDelta } from '../utils/personalBest';

describe('isNewPersonalBest', () => {
  it('is true when score strictly exceeds best', () => {
    expect(isNewPersonalBest(1001, 1000)).toBe(true);
    expect(isNewPersonalBest(5000, 100)).toBe(true);
  });

  it('is false on tie (no celebration for matching but not beating)', () => {
    // A tie feels hollow — they matched but didn't exceed. The
    // celebration would land as off-by-one.
    expect(isNewPersonalBest(1000, 1000)).toBe(false);
  });

  it('is false when score is less than best (handled by near-miss)', () => {
    expect(isNewPersonalBest(999, 1000)).toBe(false);
    expect(isNewPersonalBest(0, 1000)).toBe(false);
  });

  it('is false when there is no prior best (first run special-case)', () => {
    // The first time the player sets ANY score it's a personal best
    // in a technical sense, but firing the full celebration there
    // would feel weird (they had nothing to beat). The existing
    // "New best!" stat text affordance still shows for this case;
    // only the big celebration is gated off.
    expect(isNewPersonalBest(1500, 0)).toBe(false);
  });

  it('symmetric exclusion with near-miss — no score state fires both', () => {
    // Construction guarantee: isNewPersonalBest requires score > best,
    // isNearMiss (in nearMiss.ts) requires score < best. They cannot
    // both be true for the same input. This test pins the mutual
    // exclusion so a future refactor (e.g. changing > to >=) is
    // intentional.
    const { isNearMiss } = require('../utils/nearMiss');
    for (const [score, best] of [
      [500, 1000],
      [1000, 1000],
      [1001, 1000],
      [1500, 1000],
      [0, 0],
      [100, 0],
    ]) {
      const a = isNearMiss(score, best);
      const b = isNewPersonalBest(score, best);
      expect(a && b).toBe(false); // never both true
    }
  });
});

describe('personalBestDelta', () => {
  it('returns the exact gap above the prior best', () => {
    expect(personalBestDelta(1047, 1000)).toBe(47);
    expect(personalBestDelta(2500, 1000)).toBe(1500);
  });

  it('returns 0 when not a personal best (defensive default)', () => {
    expect(personalBestDelta(999, 1000)).toBe(0);
    expect(personalBestDelta(1000, 1000)).toBe(0);
    expect(personalBestDelta(500, 0)).toBe(0);
  });
});
