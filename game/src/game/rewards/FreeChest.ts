/**
 * Free Chest timer — recurring no-cost reward every 4 hours.
 *
 * Creates a "come back to claim" loop that drives daily active users
 * and session frequency without any monetization friction. The chest
 * scales mildly with highest level to stay relevant for progressing
 * players. Works just like the Clash Royale silver chest.
 */

export interface FreeChestReward {
  coins: number;
  gems: number;
  powerUp?: { type: 'bomb' | 'rowClear' | 'colorClear'; count: number };
}

/** How often a free chest refills */
export const FREE_CHEST_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4h

/** Returns ms until the next chest is claimable, or 0 if claimable now */
export function getFreeChestTimeRemaining(
  lastClaimedAt: number | null,
  now: number = Date.now(),
): number {
  if (lastClaimedAt === null) return 0;
  const elapsed = now - lastClaimedAt;
  return Math.max(0, FREE_CHEST_INTERVAL_MS - elapsed);
}

/** True if the player can claim a free chest right now */
export function isFreeChestReady(
  lastClaimedAt: number | null,
  now: number = Date.now(),
): boolean {
  return getFreeChestTimeRemaining(lastClaimedAt, now) === 0;
}

/** Roll a chest reward scaled by the player's highest level */
export function rollFreeChest(highestLevel: number, seed: number = Date.now()): FreeChestReward {
  const baseCoin = 40 + Math.min(highestLevel, 100) * 2;
  // Mild randomness using the seed so every claim feels different
  const rand = (n: number) => {
    let a = seed ^ n;
    a = (a + 0x6d2b79f5) | 0;
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };

  const coinRoll = rand(1);
  const coins = Math.round(baseCoin * (0.8 + coinRoll * 0.5));

  const gems = rand(2) < 0.25 ? 1 + Math.floor(rand(3) * 3) : 0;

  let powerUp: FreeChestReward['powerUp'];
  const powerRoll = rand(4);
  if (powerRoll < 0.35) {
    powerUp = { type: 'bomb', count: 1 };
  } else if (powerRoll < 0.55) {
    powerUp = { type: 'rowClear', count: 1 };
  } else if (powerRoll < 0.65) {
    powerUp = { type: 'colorClear', count: 1 };
  }

  return { coins, gems, powerUp };
}
