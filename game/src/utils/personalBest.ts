/**
 * Pure-function gate + delta math for the "NEW PERSONAL BEST!"
 * celebration. Mirror to `nearMiss.ts` — the near-miss callout fires
 * when you almost made it; this one fires when you exceeded it.
 *
 * The two states are mutually exclusive by construction (one checks
 * score < best, the other score > best), so a game-over modal can
 * render both unconditionally and exactly one (or neither) shows.
 */

/**
 * Returns true iff the player BEAT their previous best (strict >).
 * A tie (score === best) is not a new best — they matched but didn't
 * exceed, and a celebration there would feel hollow.
 *
 * `best` of 0 / undefined / null is treated as "no prior record."
 * The first time the player ever sets a score it's an automatic
 * personal best, BUT firing the celebration on the very first run
 * would feel weird (they have nothing to beat). Returns false in
 * that case so the existing "Best: X" UI flips to "New best!"
 * silently on run 1, and the full celebration only fires when there
 * was a real bar to clear.
 */
export function isNewPersonalBest(score: number, best: number): boolean {
  return best > 0 && score > best;
}

/**
 * How many points above the prior best the player landed.
 * Returns 0 if not a personal best (defensive default — callers
 * should gate on `isNewPersonalBest` first).
 */
export function personalBestDelta(score: number, best: number): number {
  if (!isNewPersonalBest(score, best)) return 0;
  return score - best;
}
