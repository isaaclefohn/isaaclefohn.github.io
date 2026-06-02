/**
 * Treasure Hunt event.
 * A limited-time scratch-card style reveal game.
 * Each level completion earns one "map piece"; collect 5 pieces to
 * unlock a treasure chest with randomized rewards.
 */

export type TreasureTier = 'common' | 'rare' | 'epic' | 'legendary';

export interface TreasureReward {
  tier: TreasureTier;
  coins: number;
  gems: number;
  powerUps: { bomb: number; rowClear: number; colorClear: number };
  weight: number;
}

export const TREASURE_REWARDS: TreasureReward[] = [
  {
    tier: 'common',
    coins: 100,
    gems: 0,
    powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },
    weight: 50,
  },
  {
    tier: 'common',
    coins: 150,
    gems: 0,
    powerUps: { bomb: 1, rowClear: 0, colorClear: 0 },
    weight: 30,
  },
  {
    tier: 'rare',
    coins: 200,
    gems: 3,
    powerUps: { bomb: 0, rowClear: 1, colorClear: 0 },
    weight: 15,
  },
  {
    tier: 'rare',
    coins: 250,
    gems: 5,
    powerUps: { bomb: 1, rowClear: 1, colorClear: 0 },
    weight: 10,
  },
  {
    tier: 'epic',
    coins: 400,
    gems: 10,
    powerUps: { bomb: 2, rowClear: 1, colorClear: 1 },
    weight: 5,
  },
  {
    tier: 'legendary',
    coins: 750,
    gems: 25,
    powerUps: { bomb: 3, rowClear: 2, colorClear: 2 },
    weight: 2,
  },
];

export const PIECES_REQUIRED = 5;

/** Roll a random treasure reward using weighted selection.
 *
 * The only live caller passes `Date.now()` (always large-positive), so a
 * negative seed isn't reachable today — but JS's `%` keeps the dividend's
 * sign, so a negative seed would make `rand` negative, `target` negative,
 * and the first loop iteration always return TREASURE_REWARDS[0] (common):
 * rare/epic/legendary would be unreachable. Normalize to a non-negative
 * modulo so the weighted roll is correct for ANY seed (defensive — the
 * `+ 233280) % 233280` is a no-op for the positive seeds we actually pass). */
export function rollTreasure(seed: number): TreasureReward {
  const total = TREASURE_REWARDS.reduce((sum, r) => sum + r.weight, 0);
  const rand = ((((seed * 9301 + 49297) % 233280) + 233280) % 233280) / 233280;
  let target = rand * total;
  for (const reward of TREASURE_REWARDS) {
    target -= reward.weight;
    if (target <= 0) return reward;
  }
  return TREASURE_REWARDS[0];
}

/** Tier color for display */
export function getTreasureTierColor(tier: TreasureTier): string {
  switch (tier) {
    case 'common':
      return '#94A3B8';
    case 'rare':
      return '#60A5FA';
    case 'epic':
      return '#C084FC';
    case 'legendary':
      return '#FACC15';
  }
}
