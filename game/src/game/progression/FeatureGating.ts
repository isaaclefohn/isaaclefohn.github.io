/**
 * Progressive feature disclosure.
 * Top puzzle games never show the full UI on day one.
 * Features unlock at specific level milestones to avoid overwhelming new players.
 */

export interface FeatureGate {
  id: string;
  name: string;
  /** Level at which this feature unlocks */
  unlockLevel: number;
  /** Short message shown when unlocked */
  unlockMessage: string;
}

export const FEATURE_GATES: FeatureGate[] = [
  { id: 'power_ups', name: 'Power-Ups', unlockLevel: 5, unlockMessage: 'Power-Ups unlocked! Use Bombs and more to clear tough boards.' },
  { id: 'daily_challenge', name: 'Daily Challenge', unlockLevel: 8, unlockMessage: 'Daily Challenges unlocked! Complete one each day for bonus rewards.' },
  { id: 'battle_pass', name: 'Season Pass', unlockLevel: 12, unlockMessage: 'Season Pass unlocked! Earn XP to claim exclusive rewards.' },
  { id: 'zen_mode', name: 'Zen Mode', unlockLevel: 3, unlockMessage: 'Zen Mode unlocked! Play at your own pace with no time pressure.' },
  { id: 'shop', name: 'Shop', unlockLevel: 6, unlockMessage: 'Shop unlocked! Buy power-ups and customize your board.' },
  { id: 'lucky_spin', name: 'Lucky Spin', unlockLevel: 4, unlockMessage: 'Lucky Spin unlocked! Spin the wheel daily for free rewards.' },
  { id: 'piggy_bank', name: 'Piggy Bank', unlockLevel: 10, unlockMessage: 'Piggy Bank unlocked! Earn bonus savings from every level.' },
  { id: 'friend_challenge', name: 'Friend Challenge', unlockLevel: 15, unlockMessage: 'Friend Challenges unlocked! Challenge friends to beat your score.' },
  { id: 'achievements', name: 'Achievements', unlockLevel: 7, unlockMessage: 'Achievements unlocked! Complete goals to earn rewards.' },
];

/** Check if a feature is unlocked based on the player's highest completed level */
export function isFeatureUnlocked(featureId: string, highestLevel: number): boolean {
  const gate = FEATURE_GATES.find(g => g.id === featureId);
  if (!gate) return true; // Unknown features default to unlocked
  return highestLevel >= gate.unlockLevel;
}

/** Get unlock level for a feature */
export function getUnlockLevel(featureId: string): number {
  const gate = FEATURE_GATES.find(g => g.id === featureId);
  return gate?.unlockLevel ?? 0;
}

/** Get all features that were just unlocked by reaching a new level */
export function getNewlyUnlockedFeatures(previousLevel: number, newLevel: number): FeatureGate[] {
  return FEATURE_GATES.filter(g => g.unlockLevel > previousLevel && g.unlockLevel <= newLevel);
}

/** Get next feature to unlock (for showing progress hints) */
export function getNextUnlock(highestLevel: number): FeatureGate | null {
  const locked = FEATURE_GATES
    .filter(g => g.unlockLevel > highestLevel)
    .sort((a, b) => a.unlockLevel - b.unlockLevel);
  return locked[0] ?? null;
}
