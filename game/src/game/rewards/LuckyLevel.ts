/**
 * Lucky level bonus system.
 * Special rewards at milestone level completions (10, 25, 50, 100, etc.)
 * Creates "wow" moments that feel special and unexpected.
 * Similar to Candy Crush's "Sugar Stars" and Royal Match's "King's Vault".
 */

export interface LuckyLevelReward {
  coins: number;
  gems: number;
  powerUp?: { type: 'bomb' | 'rowClear' | 'colorClear'; count: number };
  message: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
}

const LUCKY_LEVEL_CONFIG: Record<string, LuckyLevelReward> = {
  // Every 10th level — bronze
  '10': { coins: 50, gems: 2, message: 'Level 10 Milestone!', tier: 'bronze' },
  '20': { coins: 60, gems: 2, powerUp: { type: 'bomb', count: 1 }, message: 'Level 20 Milestone!', tier: 'bronze' },
  '30': { coins: 70, gems: 3, message: 'Level 30 Milestone!', tier: 'bronze' },
  '40': { coins: 80, gems: 3, powerUp: { type: 'rowClear', count: 1 }, message: 'Level 40 Milestone!', tier: 'bronze' },
  // Every 25th (boss) — silver
  '25': { coins: 100, gems: 5, powerUp: { type: 'bomb', count: 2 }, message: 'Boss Defeated!', tier: 'silver' },
  '75': { coins: 150, gems: 8, powerUp: { type: 'bomb', count: 2 }, message: 'Boss Defeated!', tier: 'silver' },
  // Every 50th — gold
  '50': { coins: 200, gems: 10, powerUp: { type: 'bomb', count: 3 }, message: 'Halfway through World 1!', tier: 'gold' },
  '100': { coins: 500, gems: 20, powerUp: { type: 'colorClear', count: 2 }, message: 'Century! 100 Levels Complete!', tier: 'gold' },
  '150': { coins: 300, gems: 15, powerUp: { type: 'rowClear', count: 3 }, message: '150 Levels Complete!', tier: 'gold' },
  '200': { coins: 500, gems: 25, powerUp: { type: 'bomb', count: 5 }, message: '200 Levels! You are incredible!', tier: 'gold' },
  // Mega milestones — diamond
  '250': { coins: 1000, gems: 30, powerUp: { type: 'colorClear', count: 3 }, message: 'Diamond Milestone!', tier: 'diamond' },
  '300': { coins: 1000, gems: 40, powerUp: { type: 'bomb', count: 5 }, message: '300 Levels! Truly legendary!', tier: 'diamond' },
  '400': { coins: 1500, gems: 50, powerUp: { type: 'rowClear', count: 5 }, message: '400 Levels! Grandmaster!', tier: 'diamond' },
  '500': { coins: 3000, gems: 100, powerUp: { type: 'colorClear', count: 5 }, message: 'ALL 500 LEVELS COMPLETE!', tier: 'diamond' },
};

/** Colors for each tier */
export const LUCKY_TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  diamond: '#B9F2FF',
} as const;

/** Check if a level grants a lucky bonus */
export function getLuckyLevelReward(level: number): LuckyLevelReward | null {
  const specific = LUCKY_LEVEL_CONFIG[level.toString()];
  if (specific) return specific;

  // Generic milestone for every 10th not explicitly listed
  if (level % 10 === 0 && level > 0) {
    const baseCoins = 40 + Math.floor(level / 10) * 5;
    return {
      coins: Math.min(baseCoins, 200),
      gems: Math.min(1 + Math.floor(level / 50), 10),
      message: `Level ${level} Milestone!`,
      tier: 'bronze',
    };
  }

  return null;
}
