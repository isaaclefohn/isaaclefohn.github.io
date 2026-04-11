/**
 * Energy / Lives system.
 * Players have limited lives that regenerate over time.
 * Losing a level costs 1 life; winning doesn't.
 * Free-to-play standard monetization mechanic — speeds up monetization
 * by creating natural "wait or pay" friction points.
 *
 * Design: Generous enough to not frustrate (5 lives, 20min regen),
 * but creates urgency that motivates purchases.
 */

export const MAX_LIVES = 5;
export const LIFE_REGEN_MINUTES = 20;
export const LIFE_REGEN_MS = LIFE_REGEN_MINUTES * 60 * 1000;
export const INFINITE_LIVES_DURATION_MS = 60 * 60 * 1000; // 1 hour boost

/**
 * Calculate current lives based on stored state.
 * Lives regenerate passively over time, up to MAX_LIVES.
 */
export function calculateLives(
  storedLives: number,
  lastLifeLostAt: number | null,
  infiniteLivesUntil: number | null,
): { lives: number; nextLifeIn: number | null; isInfinite: boolean } {
  const now = Date.now();

  // Check infinite lives boost
  if (infiniteLivesUntil && now < infiniteLivesUntil) {
    return { lives: MAX_LIVES, nextLifeIn: null, isInfinite: true };
  }

  if (storedLives >= MAX_LIVES || !lastLifeLostAt) {
    return { lives: Math.min(storedLives, MAX_LIVES), nextLifeIn: null, isInfinite: false };
  }

  // Calculate passive regeneration
  const elapsed = now - lastLifeLostAt;
  const livesRegened = Math.floor(elapsed / LIFE_REGEN_MS);
  const currentLives = Math.min(storedLives + livesRegened, MAX_LIVES);

  // Time until next life
  let nextLifeIn: number | null = null;
  if (currentLives < MAX_LIVES) {
    const elapsedSinceLastRegen = elapsed % LIFE_REGEN_MS;
    nextLifeIn = LIFE_REGEN_MS - elapsedSinceLastRegen;
  }

  return { lives: currentLives, nextLifeIn, isInfinite: false };
}

/** Format remaining time as "Xm Xs" */
export function formatLifeTimer(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Cost to refill all lives with gems */
export const REFILL_GEM_COST = 5;

/** Cost for 1-hour infinite lives boost */
export const INFINITE_LIVES_GEM_COST = 15;
