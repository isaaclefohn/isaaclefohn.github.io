/**
 * Star Chest system.
 * Players accumulate stars across levels; when they hit thresholds,
 * they can open progressively better chests.
 * Creates an additional meta-progression loop beyond level completion.
 * Inspired by Clash Royale chest slots and Brawl Stars star token road.
 */

export interface StarChest {
  id: string;
  name: string;
  starsRequired: number;
  icon: string;
  color: string;
  rewards: {
    coins: number;
    gems: number;
    powerUp?: { type: 'bomb' | 'rowClear' | 'colorClear'; count: number };
  };
}

/** Progressive star chest thresholds */
export const STAR_CHESTS: StarChest[] = [
  { id: 'wooden', name: 'Wooden Chest', starsRequired: 15, icon: 'gift', color: '#A1887F',
    rewards: { coins: 30, gems: 1 } },
  { id: 'bronze', name: 'Bronze Chest', starsRequired: 45, icon: 'gift', color: '#CD7F32',
    rewards: { coins: 75, gems: 3, powerUp: { type: 'bomb', count: 1 } } },
  { id: 'silver', name: 'Silver Chest', starsRequired: 100, icon: 'gift', color: '#C0C0C0',
    rewards: { coins: 150, gems: 5, powerUp: { type: 'rowClear', count: 2 } } },
  { id: 'gold', name: 'Gold Chest', starsRequired: 200, icon: 'trophy', color: '#FFD700',
    rewards: { coins: 300, gems: 10, powerUp: { type: 'bomb', count: 3 } } },
  { id: 'platinum', name: 'Platinum Chest', starsRequired: 400, icon: 'trophy', color: '#E5E4E2',
    rewards: { coins: 500, gems: 15, powerUp: { type: 'colorClear', count: 2 } } },
  { id: 'diamond', name: 'Diamond Chest', starsRequired: 750, icon: 'crown', color: '#B9F2FF',
    rewards: { coins: 1000, gems: 30, powerUp: { type: 'bomb', count: 5 } } },
  { id: 'legendary', name: 'Legendary Chest', starsRequired: 1200, icon: 'crown', color: '#FF6B2B',
    rewards: { coins: 2000, gems: 50, powerUp: { type: 'colorClear', count: 5 } } },
];

/** Get the next unclaimed star chest */
export function getNextStarChest(
  totalStars: number,
  claimedChestIds: string[],
): StarChest | null {
  return STAR_CHESTS.find(
    c => totalStars >= c.starsRequired && !claimedChestIds.includes(c.id)
  ) ?? null;
}

/** Get progress toward the next locked chest */
export function getStarChestProgress(
  totalStars: number,
  claimedChestIds: string[],
): { current: number; next: number; chest: StarChest } | null {
  const nextLocked = STAR_CHESTS.find(
    c => totalStars < c.starsRequired && !claimedChestIds.includes(c.id)
  );
  if (!nextLocked) return null;

  // Find previous threshold
  const prevIdx = STAR_CHESTS.indexOf(nextLocked) - 1;
  const prevStars = prevIdx >= 0 ? STAR_CHESTS[prevIdx].starsRequired : 0;

  return {
    current: totalStars - prevStars,
    next: nextLocked.starsRequired - prevStars,
    chest: nextLocked,
  };
}

/** Get all chests with their status */
export function getAllChestStatuses(totalStars: number, claimedChestIds: string[]): Array<{
  chest: StarChest;
  status: 'locked' | 'ready' | 'claimed';
}> {
  return STAR_CHESTS.map(chest => ({
    chest,
    status: claimedChestIds.includes(chest.id)
      ? 'claimed'
      : totalStars >= chest.starsRequired
      ? 'ready'
      : 'locked',
  }));
}
