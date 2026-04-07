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
  // Difficulty spike levels — harder piece pools and higher targets
  const isSpikeLevel = [15, 35, 65, 90, 130, 175].includes(levelNumber);
  const spikeMultiplier = isSpikeLevel ? 1.3 : 1;

  if (levelNumber <= 5) {
    // Tutorial: very easy
    return {
      gridSize: 8,
      piecePool: PIECE_POOLS.easy,
      scoreTarget: Math.round((200 + levelNumber * 50) * spikeMultiplier),
      starThresholds: [
        Math.round((150 + levelNumber * 30) * spikeMultiplier),
        Math.round((250 + levelNumber * 50) * spikeMultiplier),
        Math.round((400 + levelNumber * 60) * spikeMultiplier),
      ],
    };
  }

  if (levelNumber <= 20) {
    // Easy: learn the basics — spike levels get medium pieces early
    return {
      gridSize: 8,
      piecePool: isSpikeLevel ? PIECE_POOLS.medium : PIECE_POOLS.easy,
      scoreTarget: Math.round((400 + (levelNumber - 5) * 40) * spikeMultiplier),
      starThresholds: [
        Math.round((300 + (levelNumber - 5) * 30) * spikeMultiplier),
        Math.round((500 + (levelNumber - 5) * 50) * spikeMultiplier),
        Math.round((750 + (levelNumber - 5) * 60) * spikeMultiplier),
      ],
    };
  }

  if (levelNumber <= 50) {
    // Medium: more complex pieces — spike levels get hard pieces
    return {
      gridSize: 8,
      piecePool: isSpikeLevel ? PIECE_POOLS.hard : PIECE_POOLS.medium,
      scoreTarget: Math.round((800 + (levelNumber - 20) * 30) * spikeMultiplier),
      starThresholds: [
        Math.round((600 + (levelNumber - 20) * 25) * spikeMultiplier),
        Math.round((1000 + (levelNumber - 20) * 40) * spikeMultiplier),
        Math.round((1500 + (levelNumber - 20) * 50) * spikeMultiplier),
      ],
    };
  }

  if (levelNumber <= 100) {
    // Hard: full tetromino set
    return {
      gridSize: 8,
      piecePool: PIECE_POOLS.hard,
      scoreTarget: Math.round((1500 + (levelNumber - 50) * 25) * spikeMultiplier),
      starThresholds: [
        Math.round((1200 + (levelNumber - 50) * 20) * spikeMultiplier),
        Math.round((2000 + (levelNumber - 50) * 35) * spikeMultiplier),
        Math.round((3000 + (levelNumber - 50) * 45) * spikeMultiplier),
      ],
    };
  }

  if (levelNumber <= 200) {
    // Expert: larger grid, all pieces
    return {
      gridSize: levelNumber > 150 ? 10 : 8,
      piecePool: PIECE_POOLS.hard,
      scoreTarget: Math.round((2500 + (levelNumber - 100) * 20) * spikeMultiplier),
      starThresholds: [
        Math.round((2000 + (levelNumber - 100) * 18) * spikeMultiplier),
        Math.round((3500 + (levelNumber - 100) * 30) * spikeMultiplier),
        Math.round((5000 + (levelNumber - 100) * 40) * spikeMultiplier),
      ],
    };
  }

  // Extreme: 200+
  return {
    gridSize: 10,
    piecePool: PIECE_POOLS.extreme,
    scoreTarget: Math.round((4000 + (levelNumber - 200) * 15) * spikeMultiplier),
    starThresholds: [
      Math.round((3500 + (levelNumber - 200) * 12) * spikeMultiplier),
      Math.round((5500 + (levelNumber - 200) * 25) * spikeMultiplier),
      Math.round((8000 + (levelNumber - 200) * 35) * spikeMultiplier),
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
