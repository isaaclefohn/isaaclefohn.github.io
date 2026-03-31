/**
 * Level generation system.
 * Generates level configs for all 500+ levels using the difficulty scaler.
 * Boss levels (every 25th) use hand-crafted templates.
 */

import { LevelConfig } from '../engine/GameLoop';
import { generateLevelConfig } from './DifficultyScaler';
import { BOSS_LEVELS } from './LevelTemplates';

/** Get the config for a specific level */
export function getLevel(levelNumber: number): LevelConfig {
  // Check for hand-crafted boss level
  const bossLevel = BOSS_LEVELS[levelNumber];
  if (bossLevel) {
    return bossLevel;
  }

  // Generate procedural level
  return generateLevelConfig(levelNumber);
}

/** Get configs for a range of levels (for level select screen) */
export function getLevelRange(start: number, end: number): LevelConfig[] {
  const levels: LevelConfig[] = [];
  for (let i = start; i <= end; i++) {
    levels.push(getLevel(i));
  }
  return levels;
}

/** Check if a level is a boss level */
export function isBossLevel(levelNumber: number): boolean {
  return levelNumber % 25 === 0 && levelNumber > 0;
}

/** Get the total number of available levels */
export function getTotalLevels(): number {
  return 500;
}
