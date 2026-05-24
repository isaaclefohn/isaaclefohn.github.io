/**
 * Level generation system.
 * Generates level configs for all 500+ levels using the difficulty scaler.
 * Boss levels (every 25th) use hand-crafted templates.
 */

import { LevelConfig } from '../engine/GameLoop';
import { PIECE_POOLS } from '../engine/Piece';
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

/** Check if a level is a boss level (i.e. has a hand-crafted template). */
export function isBossLevel(levelNumber: number): boolean {
  // Derive from the actual template set so the flag never lies. Boss content
  // currently runs 25–250; levels past that are procedural until authored.
  return BOSS_LEVELS[levelNumber] !== undefined;
}

/** Get an endless/zen mode config (no score target, play until stuck) */
export function getEndlessConfig(): LevelConfig {
  const seed = Date.now();
  return {
    levelNumber: 0,
    gridSize: 8,
    objective: { type: 'score' as const, target: 999999999 },
    starThresholds: [1000, 3000, 6000] as [number, number, number],
    piecePool: [...PIECE_POOLS.medium, ...PIECE_POOLS.hard],
    seed,
  };
}

/** Get the total number of available levels */
export function getTotalLevels(): number {
  return 500;
}
