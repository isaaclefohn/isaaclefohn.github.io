/**
 * Pure-function gate for the near-miss "SO CLOSE!" callout.
 *
 * Extracted to a .ts file (separate from `NearMissCallout.tsx`) so
 * jest's plain-TypeScript transformer can pick it up — testing a
 * helper from inside a .tsx component requires React Native
 * Testing Library setup which we don't currently have. Putting the
 * logic in a pure module keeps coverage cheap.
 */

/** Below this fraction of best, no callout — the player wasn't close enough. */
export const NEAR_MISS_THRESHOLD = 0.85;

/**
 * Returns true iff the player has a best on record, did NOT beat it
 * this run (that's a celebration, different emotion), and got at
 * least NEAR_MISS_THRESHOLD of it. The 85% floor keeps the callout
 * from firing on every run — only genuine near-misses trigger it,
 * so the emotional weight stays.
 */
export function isNearMiss(score: number, best: number): boolean {
  return best > 0 && score < best && score >= best * NEAR_MISS_THRESHOLD;
}
