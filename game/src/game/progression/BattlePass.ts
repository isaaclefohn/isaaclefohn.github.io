/**
 * Battle Pass (Season Pass) system.
 * 30-day season with XP milestones and tiered rewards.
 * Free tier gives coins; premium tier adds exclusive skins, gems, and power-ups.
 * XP earned through gameplay actions (levels completed, lines cleared, daily login).
 */

export interface PassReward {
  type: 'coins' | 'gems' | 'powerup' | 'theme' | 'skin';
  amount: number;
  itemId?: string;
  label?: string;
}

export interface BattlePassReward {
  tier: number;
  xpRequired: number;
  freeReward: PassReward | null;
  premiumReward: PassReward;
}

/** 20-tier battle pass rewards */
export const BATTLE_PASS_TIERS: BattlePassReward[] = [
  { tier: 1, xpRequired: 100, freeReward: { type: 'coins', amount: 25 }, premiumReward: { type: 'coins', amount: 50 } },
  { tier: 2, xpRequired: 250, freeReward: null, premiumReward: { type: 'gems', amount: 2 } },
  { tier: 3, xpRequired: 450, freeReward: { type: 'coins', amount: 50 }, premiumReward: { type: 'powerup', amount: 1, itemId: 'bomb' } },
  { tier: 4, xpRequired: 700, freeReward: null, premiumReward: { type: 'coins', amount: 100 } },
  { tier: 5, xpRequired: 1000, freeReward: { type: 'coins', amount: 75 }, premiumReward: { type: 'gems', amount: 5 } },
  { tier: 6, xpRequired: 1400, freeReward: null, premiumReward: { type: 'powerup', amount: 2, itemId: 'rowClear' } },
  { tier: 7, xpRequired: 1850, freeReward: { type: 'coins', amount: 100 }, premiumReward: { type: 'coins', amount: 200 } },
  { tier: 8, xpRequired: 2350, freeReward: null, premiumReward: { type: 'gems', amount: 5 } },
  { tier: 9, xpRequired: 2900, freeReward: { type: 'powerup', amount: 1, itemId: 'bomb' }, premiumReward: { type: 'powerup', amount: 2, itemId: 'colorClear' } },
  { tier: 10, xpRequired: 3500, freeReward: { type: 'gems', amount: 3 }, premiumReward: { type: 'theme', amount: 1, itemId: 'candy', label: 'Candy Pop Theme' } },
  { tier: 11, xpRequired: 4200, freeReward: { type: 'coins', amount: 100 }, premiumReward: { type: 'coins', amount: 250 } },
  { tier: 12, xpRequired: 5000, freeReward: null, premiumReward: { type: 'gems', amount: 8 } },
  { tier: 13, xpRequired: 5900, freeReward: { type: 'coins', amount: 125 }, premiumReward: { type: 'powerup', amount: 3, itemId: 'bomb' } },
  { tier: 14, xpRequired: 6900, freeReward: null, premiumReward: { type: 'coins', amount: 300 } },
  { tier: 15, xpRequired: 8000, freeReward: { type: 'gems', amount: 5 }, premiumReward: { type: 'skin', amount: 1, itemId: 'neonGlow', label: 'Neon Glow Skin' } },
  { tier: 16, xpRequired: 9200, freeReward: { type: 'coins', amount: 150 }, premiumReward: { type: 'gems', amount: 10 } },
  { tier: 17, xpRequired: 10500, freeReward: null, premiumReward: { type: 'powerup', amount: 3, itemId: 'rowClear' } },
  { tier: 18, xpRequired: 12000, freeReward: { type: 'coins', amount: 200 }, premiumReward: { type: 'coins', amount: 500 } },
  { tier: 19, xpRequired: 13700, freeReward: null, premiumReward: { type: 'gems', amount: 15 } },
  { tier: 20, xpRequired: 15500, freeReward: { type: 'gems', amount: 10 }, premiumReward: { type: 'theme', amount: 1, itemId: 'midnight', label: 'Midnight Theme' } },
];

/** XP values for various gameplay actions */
export const XP_VALUES = {
  levelComplete: 50,
  levelCompletePerStar: 15,
  dailyLogin: 25,
  lineCleared: 5,
  comboBonus: 10,
  zenGameOver: 20,
  dailyChallengeComplete: 75,
  piggyBankBroken: 10,
} as const;

/** Get the current tier based on total XP */
export function getCurrentTier(xp: number): number {
  for (let i = BATTLE_PASS_TIERS.length - 1; i >= 0; i--) {
    if (xp >= BATTLE_PASS_TIERS[i].xpRequired) return BATTLE_PASS_TIERS[i].tier;
  }
  return 0;
}

/** Get XP needed for next tier */
export function getNextTierXP(xp: number): { current: number; next: number; progress: number } {
  const currentTier = getCurrentTier(xp);
  if (currentTier >= BATTLE_PASS_TIERS.length) {
    return { current: xp, next: xp, progress: 1 };
  }
  const nextTierData = BATTLE_PASS_TIERS[currentTier]; // tier index = currentTier since tier 1 is index 0
  const prevXP = currentTier > 0 ? BATTLE_PASS_TIERS[currentTier - 1].xpRequired : 0;
  const nextXP = nextTierData.xpRequired;
  const progress = Math.min((xp - prevXP) / (nextXP - prevXP), 1);
  return { current: xp, next: nextXP, progress };
}

/** Get unclaimed rewards up to current tier */
export function getUnclaimedRewards(
  xp: number,
  claimedTiers: number[],
  hasPremium: boolean
): BattlePassReward[] {
  const currentTier = getCurrentTier(xp);
  return BATTLE_PASS_TIERS.filter(
    (t) => t.tier <= currentTier && !claimedTiers.includes(t.tier) && (t.freeReward !== null || hasPremium)
  );
}
