/**
 * Level generation system.
 * Generates level configs for all 500+ levels using the difficulty scaler.
 * Boss levels (every 25th) use hand-crafted templates.
 */

import { LevelConfig } from '../engine/GameLoop';
import { PIECE_POOLS } from '../engine/Piece';
import { generateLevelConfig } from './DifficultyScaler';
import { BOSS_LEVELS } from './LevelTemplates';
import { hashSeed } from '../../utils/seededRandom';

/**
 * Hand-crafted level 1. The procedural generator would give a new
 * player a 6-color board where chromatic clears are statistically
 * ~25% of first clears — meaning ~75% of first-time players never
 * see the signature mechanic in their first session and review the
 * game as "Block Blast with confetti" (per the 2026-06 FTUE audit).
 *
 * Hand-crafted level 1 forces the teach by shrinking the palette to
 * 2 colors. At palette 2, EVERY line clear is mathematically a
 * chromatic clear (a "single-color line" is satisfied by definition
 * when only 2 colors exist and one row fills with one of them).
 * The player's first ever line clear fires the cascade + first_chromatic
 * tip — guaranteed teach moment, not a coin-flip.
 *
 * Target stays 250 (matching procedural level-1 default) so the level
 * still feels like a "real" level, not a stripped-down tutorial. Easy
 * piece pool and 8x8 grid match the procedural shape.
 *
 * isBossLevel(1) still returns false (this is NOT in BOSS_LEVELS) so
 * the player does not see the BOSS badge or trigger boss-completion
 * reward paths on their first level — they see a normal level with a
 * mathematically-engineered first chromatic moment.
 */
const TUTORIAL_LEVEL_1: LevelConfig = {
  levelNumber: 1,
  gridSize: 8,
  objective: { type: 'score', target: 250 },
  piecePool: PIECE_POOLS.easy,
  starThresholds: [180, 280, 460],
  paletteSize: 2,
  seed: hashSeed(1),
};

/** Get the config for a specific level */
export function getLevel(levelNumber: number): LevelConfig {
  // Hand-crafted tutorial level 1 — see TUTORIAL_LEVEL_1 above for why.
  if (levelNumber === 1) {
    return TUTORIAL_LEVEL_1;
  }

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

/** Get an endless/zen mode config (no score target, play until stuck).
 *  Starts at the wave-1 palette so the wave system has somewhere to
 *  escalate from. See `game/levels/EndlessWaves.ts` for the wave
 *  progression — by default pieces 0-49 are wave 1 (palette 4), and
 *  each subsequent 50-piece block bumps the palette by 1 up to 7. */
export function getEndlessConfig(): LevelConfig {
  const seed = Date.now();
  return {
    levelNumber: 0,
    gridSize: 8,
    objective: { type: 'score' as const, target: 999999999 },
    starThresholds: [1000, 3000, 6000] as [number, number, number],
    piecePool: [...PIECE_POOLS.medium, ...PIECE_POOLS.hard],
    seed,
    paletteSize: 4, // STARTING_PALETTE from EndlessWaves.ts — wave 1
  };
}

/** Get the total number of available levels */
export function getTotalLevels(): number {
  return 500;
}
