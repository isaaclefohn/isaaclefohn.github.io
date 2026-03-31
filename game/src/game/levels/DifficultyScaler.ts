/**
 * Maps level numbers to difficulty parameters.
 * Controls piece pools, grid size, score targets, and star thresholds.
 */

import { PieceType, PIECE_POOLS } from '../engine/Piece';
import { LevelConfig } from '../engine/GameLoop';
import { hashSeed } from '../../utils/seededRandom';

export interface DifficultyParams {
  gridSize: number;
  piecePool: PieceType[];
  scoreTarget: number;
  starThresholds: [number, number, number];
}

/** Get difficulty parameters for a given level number */
export function getDifficultyParams(levelNumber: number): DifficultyParams {
  if (levelNumber <= 5) {
    // Tutorial: very easy
    return {
      gridSize: 8,
      piecePool: PIECE_POOLS.easy,
      scoreTarget: 200 + levelNumber * 50,
      starThresholds: [
        150 + levelNumber * 30,
        250 + levelNumber * 50,
        400 + levelNumber * 60,
      ],
    };
  }

  if (levelNumber <= 20) {
    // Easy: learn the basics
    return {
      gridSize: 8,
      piecePool: PIECE_POOLS.easy,
      scoreTarget: 400 + (levelNumber - 5) * 40,
      starThresholds: [
        300 + (levelNumber - 5) * 30,
        500 + (levelNumber - 5) * 50,
        750 + (levelNumber - 5) * 60,
      ],
    };
  }

  if (levelNumber <= 50) {
    // Medium: more complex pieces
    return {
      gridSize: 8,
      piecePool: PIECE_POOLS.medium,
      scoreTarget: 800 + (levelNumber - 20) * 30,
      starThresholds: [
        600 + (levelNumber - 20) * 25,
        1000 + (levelNumber - 20) * 40,
        1500 + (levelNumber - 20) * 50,
      ],
    };
  }

  if (levelNumber <= 100) {
    // Hard: full tetromino set
    return {
      gridSize: 8,
      piecePool: PIECE_POOLS.hard,
      scoreTarget: 1500 + (levelNumber - 50) * 25,
      starThresholds: [
        1200 + (levelNumber - 50) * 20,
        2000 + (levelNumber - 50) * 35,
        3000 + (levelNumber - 50) * 45,
      ],
    };
  }

  if (levelNumber <= 200) {
    // Expert: larger grid, all pieces
    return {
      gridSize: levelNumber > 150 ? 10 : 8,
      piecePool: PIECE_POOLS.hard,
      scoreTarget: 2500 + (levelNumber - 100) * 20,
      starThresholds: [
        2000 + (levelNumber - 100) * 18,
        3500 + (levelNumber - 100) * 30,
        5000 + (levelNumber - 100) * 40,
      ],
    };
  }

  // Extreme: 200+
  return {
    gridSize: 10,
    piecePool: PIECE_POOLS.extreme,
    scoreTarget: 4000 + (levelNumber - 200) * 15,
    starThresholds: [
      3500 + (levelNumber - 200) * 12,
      5500 + (levelNumber - 200) * 25,
      8000 + (levelNumber - 200) * 35,
    ],
  };
}

/** Generate a complete LevelConfig from a level number */
export function generateLevelConfig(levelNumber: number): LevelConfig {
  const params = getDifficultyParams(levelNumber);
  const seed = hashSeed(levelNumber);

  return {
    levelNumber,
    gridSize: params.gridSize,
    objective: { type: 'score', target: params.scoreTarget },
    piecePool: params.piecePool,
    starThresholds: params.starThresholds,
    seed,
  };
}
