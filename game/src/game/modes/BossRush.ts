/**
 * Boss Rush mode.
 * Sequential boss gauntlet: beat all 20 bosses (levels 25, 50, 75...500)
 * back-to-back with a shared score pool and limited power-ups.
 * High-score leaderboard ranks players by total score.
 */

export interface BossRushConfig {
  /** Boss level numbers included in the gauntlet */
  bossLevels: number[];
  /** Starting power-up allotment */
  startingPowerUps: { bomb: number; rowClear: number; colorClear: number };
  /** Minimum level required to unlock boss rush */
  unlockLevel: number;
  /** Base reward multiplier per boss defeated */
  rewardPerBoss: { coins: number; gems: number };
}

export const BOSS_RUSH_CONFIG: BossRushConfig = {
  bossLevels: [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500],
  startingPowerUps: { bomb: 3, rowClear: 3, colorClear: 2 },
  unlockLevel: 50,
  rewardPerBoss: { coins: 100, gems: 2 },
};

export interface BossRushState {
  currentBossIndex: number;
  totalScore: number;
  bossesDefeated: number;
  powerUps: { bomb: number; rowClear: number; colorClear: number };
  startedAt: number;
  completed: boolean;
}

/** Create a fresh boss rush state */
export function createBossRushState(): BossRushState {
  return {
    currentBossIndex: 0,
    totalScore: 0,
    bossesDefeated: 0,
    powerUps: { ...BOSS_RUSH_CONFIG.startingPowerUps },
    startedAt: Date.now(),
    completed: false,
  };
}

/** Get the level number for the current boss */
export function getCurrentBossLevel(state: BossRushState): number | null {
  if (state.currentBossIndex >= BOSS_RUSH_CONFIG.bossLevels.length) return null;
  return BOSS_RUSH_CONFIG.bossLevels[state.currentBossIndex];
}

/** Advance to the next boss after a successful clear */
export function advanceBossRush(state: BossRushState, scoreEarned: number): BossRushState {
  const nextIndex = state.currentBossIndex + 1;
  const completed = nextIndex >= BOSS_RUSH_CONFIG.bossLevels.length;
  return {
    ...state,
    currentBossIndex: nextIndex,
    totalScore: state.totalScore + scoreEarned,
    bossesDefeated: state.bossesDefeated + 1,
    completed,
  };
}

/** Calculate rewards earned so far in a boss rush run */
export function calculateBossRushRewards(state: BossRushState): { coins: number; gems: number } {
  const base = {
    coins: state.bossesDefeated * BOSS_RUSH_CONFIG.rewardPerBoss.coins,
    gems: state.bossesDefeated * BOSS_RUSH_CONFIG.rewardPerBoss.gems,
  };
  // Completion bonus
  if (state.completed) {
    base.coins += 2000;
    base.gems += 50;
  }
  return base;
}

/** Get medal tier based on number of bosses defeated */
export function getBossRushMedal(bossesDefeated: number): 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (bossesDefeated >= 20) return 'platinum';
  if (bossesDefeated >= 15) return 'gold';
  if (bossesDefeated >= 10) return 'silver';
  if (bossesDefeated >= 5) return 'bronze';
  return 'none';
}

/** Check if boss rush mode is unlocked */
export function isBossRushUnlocked(highestLevel: number): boolean {
  return highestLevel >= BOSS_RUSH_CONFIG.unlockLevel;
}
