/**
 * Variable celebration tiers — the "reward prediction error" engine.
 *
 * Per the dopamine neuroscience research: dopamine fires for *better-than-
 * expected* outcomes, not rewards themselves. If every chromatic clear
 * celebrates the same way, the player learns the ceiling and dopamine
 * flatlines. The fix is a tier ladder where most chromatic clears feel
 * (correctly) huge, but a small slice fire a *bigger* surprise the player
 * didn't see coming. Royal Match, Block Blast, and Balatro all converge on
 * this pattern.
 *
 * v1 ships COSMETIC-ONLY tiers — the roll amplifies visual + haptic + hype
 * text per tier but does NOT modify the score. This keeps level/star balance
 * untouched while still delivering the surprise-tier dopamine spike.
 * (Score-affecting "+200" / "+500" payouts are a v2 follow-up.)
 *
 * RNG is injectable for tests; defaults to Math.random in production.
 */

/** Celebration tier — picked once per chromatic clear, drives the feedback amplitude. */
export type CelebrationTier = 'mini' | 'normal' | 'big' | 'jackpot';

export interface TierConfig {
  /** Base probabilities — must sum to 1.0. Order: jackpot, big, normal, mini. */
  readonly jackpotWeight: number; // ~3%
  readonly bigWeight: number;     // ~7%
  readonly normalWeight: number;  // ~30%
  readonly miniWeight: number;    // ~60%
  /**
   * Pity threshold — if `clearsSincePremium` reaches this without firing a
   * Big or Jackpot, the next chromatic clear is forced to Big. Prevents the
   * unlucky decile of players from never seeing a premium tier and churning.
   * Per the design research, N=22 gives ~10% natural-no-premium chance which
   * the pity catches; lower would feel deterministic, higher would lose the
   * unlucky tail.
   */
  readonly pityThreshold: number;
}

export const DEFAULT_TIER_CONFIG: TierConfig = {
  jackpotWeight: 0.03,
  bigWeight: 0.07,
  normalWeight: 0.30,
  miniWeight: 0.60,
  pityThreshold: 22,
};

export interface TierRollResult {
  /** Which tier the celebration uses. */
  tier: CelebrationTier;
  /** Whether this fire was forced by the pity timer (for telemetry/debug). */
  forcedByPity: boolean;
  /** The new value of `clearsSincePremium` after this roll — the caller persists it. */
  nextClearsSincePremium: number;
}

/**
 * Roll a celebration tier for a chromatic clear.
 *
 * @param clearsSincePremium  How many chromatic clears since the last Big or
 *                            Jackpot fired. Increments naturally; resets to 0
 *                            when a Big or Jackpot rolls (or is pity-forced).
 * @param rng                 Injectable RNG returning [0, 1). Defaults to
 *                            Math.random; tests pass a seeded function.
 * @param config              Tier weights + pity threshold. Defaults to the
 *                            tuned constants above.
 */
export function rollTier(
  clearsSincePremium: number,
  rng: () => number = Math.random,
  config: TierConfig = DEFAULT_TIER_CONFIG,
): TierRollResult {
  // Pity timer: force a Big if we've gone too long without a premium fire.
  if (clearsSincePremium >= config.pityThreshold) {
    return {
      tier: 'big',
      forcedByPity: true,
      nextClearsSincePremium: 0,
    };
  }

  const r = rng();
  let tier: CelebrationTier;
  // Walk the probability ladder from rarest to most common — rarest first so a
  // small r value lands in the rare bucket (most intuitive).
  if (r < config.jackpotWeight) {
    tier = 'jackpot';
  } else if (r < config.jackpotWeight + config.bigWeight) {
    tier = 'big';
  } else if (r < config.jackpotWeight + config.bigWeight + config.normalWeight) {
    tier = 'normal';
  } else {
    tier = 'mini';
  }

  const isPremium = tier === 'big' || tier === 'jackpot';
  return {
    tier,
    forcedByPity: false,
    nextClearsSincePremium: isPremium ? 0 : clearsSincePremium + 1,
  };
}
