/**
 * Skill Rating (SR) system.
 * Tracks player skill over time using a simplified Elo-inspired formula.
 * SR increases on wins and decreases on losses, scaled by level difficulty.
 * Displayed as a ranked tier for social motivation.
 *
 * Tiers: Iron → Bronze → Silver → Gold → Platinum → Diamond → Champion
 */

export interface SkillTier {
  name: string;
  minSR: number;
  color: string;
  icon: string;
}

export const SKILL_TIERS: SkillTier[] = [
  { name: 'Iron', minSR: 0, color: '#78716C', icon: 'shield' },
  { name: 'Bronze', minSR: 200, color: '#CD7F32', icon: 'shield' },
  { name: 'Silver', minSR: 400, color: '#C0C0C0', icon: 'medal-silver' },
  { name: 'Gold', minSR: 600, color: '#FFD700', icon: 'medal-gold' },
  { name: 'Platinum', minSR: 850, color: '#E5E4E2', icon: 'trophy' },
  { name: 'Diamond', minSR: 1100, color: '#B9F2FF', icon: 'trophy' },
  { name: 'Champion', minSR: 1400, color: '#FF4500', icon: 'crown' },
];

/** Starting SR for new players */
export const INITIAL_SR = 100;

/** Get current skill tier based on SR */
export function getSkillTier(sr: number): SkillTier {
  for (let i = SKILL_TIERS.length - 1; i >= 0; i--) {
    if (sr >= SKILL_TIERS[i].minSR) return SKILL_TIERS[i];
  }
  return SKILL_TIERS[0];
}

/** Get progress toward next tier */
export function getTierProgress(sr: number): { current: SkillTier; next: SkillTier | null; progress: number } {
  const current = getSkillTier(sr);
  const currentIdx = SKILL_TIERS.indexOf(current);
  const next = currentIdx < SKILL_TIERS.length - 1 ? SKILL_TIERS[currentIdx + 1] : null;

  if (!next) return { current, next: null, progress: 1 };

  const range = next.minSR - current.minSR;
  const progress = Math.min((sr - current.minSR) / range, 1);
  return { current, next, progress };
}

/**
 * Calculate SR change after a game.
 * Win: +15 to +30 based on level difficulty and stars.
 * Loss: -5 to -15 based on how close the game was.
 */
export function calculateSRChange(params: {
  won: boolean;
  level: number;
  stars: number;
  scorePercent: number; // score / target * 100
  currentSR: number;
}): number {
  const { won, level, stars, scorePercent, currentSR } = params;

  // Difficulty scaling: harder levels give more SR
  const difficultyBonus = Math.min(level / 50, 2); // 0 to 2 extra

  if (won) {
    // Base gain: 15 + stars bonus + difficulty bonus
    const baseGain = 15 + stars * 3 + Math.round(difficultyBonus * 5);

    // Diminishing returns at high SR (slower climb)
    const srPenalty = Math.max(0, (currentSR - 800) * 0.01);
    return Math.max(5, Math.round(baseGain - srPenalty));
  }

  // Loss: -5 base, less penalty if close to winning
  const baseLoss = -10;
  const closeBonus = scorePercent >= 70 ? 4 : scorePercent >= 50 ? 2 : 0;

  // Floor protection: lose less at low SR
  const floorProtection = currentSR < 100 ? 5 : 0;

  return Math.max(-15, baseLoss + closeBonus + floorProtection);
}
