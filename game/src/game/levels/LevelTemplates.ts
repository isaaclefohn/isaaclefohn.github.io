/**
 * Hand-crafted boss levels that appear every 25 levels.
 * These serve as milestone challenges with higher difficulty
 * and more interesting objectives than procedural levels.
 */

import { LevelConfig } from '../engine/GameLoop';
import { PIECE_POOLS } from '../engine/Piece';
import { hashSeed } from '../../utils/seededRandom';

export const BOSS_LEVELS: Record<number, LevelConfig> = {
  25: {
    levelNumber: 25,
    gridSize: 8,
    objective: { type: 'score', target: 1200 },
    piecePool: PIECE_POOLS.medium,
    starThresholds: [1000, 1500, 2200],
    seed: hashSeed(25),
  },
  50: {
    levelNumber: 50,
    gridSize: 8,
    objective: { type: 'score', target: 2000 },
    piecePool: PIECE_POOLS.hard,
    starThresholds: [1600, 2500, 3500],
    seed: hashSeed(50),
  },
  75: {
    levelNumber: 75,
    gridSize: 8,
    objective: { type: 'score', target: 2800 },
    piecePool: PIECE_POOLS.hard,
    starThresholds: [2200, 3500, 5000],
    seed: hashSeed(75),
  },
  100: {
    levelNumber: 100,
    gridSize: 10,
    objective: { type: 'score', target: 4000 },
    piecePool: PIECE_POOLS.extreme,
    starThresholds: [3000, 5000, 7000],
    seed: hashSeed(100),
  },
  125: {
    levelNumber: 125,
    gridSize: 10,
    objective: { type: 'score', target: 4500 },
    piecePool: PIECE_POOLS.extreme,
    starThresholds: [3500, 5500, 8000],
    seed: hashSeed(125),
  },
  150: {
    levelNumber: 150,
    gridSize: 10,
    objective: { type: 'score', target: 5000 },
    piecePool: PIECE_POOLS.extreme,
    starThresholds: [4000, 6500, 9000],
    seed: hashSeed(150),
  },
  175: {
    levelNumber: 175,
    gridSize: 10,
    objective: { type: 'score', target: 5500 },
    piecePool: PIECE_POOLS.extreme,
    starThresholds: [4500, 7000, 10000],
    seed: hashSeed(175),
  },
  200: {
    levelNumber: 200,
    gridSize: 10,
    objective: { type: 'score', target: 6000 },
    piecePool: PIECE_POOLS.extreme,
    starThresholds: [5000, 8000, 12000],
    seed: hashSeed(200),
  },
  225: {
    levelNumber: 225,
    gridSize: 10,
    objective: { type: 'score', target: 6500 },
    piecePool: PIECE_POOLS.extreme,
    starThresholds: [5500, 8500, 13000],
    seed: hashSeed(225),
  },
  250: {
    levelNumber: 250,
    gridSize: 10,
    objective: { type: 'score', target: 7500 },
    piecePool: PIECE_POOLS.extreme,
    starThresholds: [6000, 9500, 14000],
    seed: hashSeed(250),
  },
};
