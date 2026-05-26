/**
 * Hand-crafted boss levels with higher difficulty + more interesting
 * objectives than the procedural campaign. Historically every 25
 * levels, but the schema is a sparse dictionary keyed by level number
 * so chromatic-objective milestones can interleave on off-25 slots.
 *
 * Boss types:
 *   - **Score bosses** (25/50/75/...) — reach N points before running
 *     out of moves. The classic mode.
 *   - **Chromatic challenges** (30/60/90) — clear N same-color lines.
 *     The brand-signature mode. Stars still come off score so the
 *     1-/2-/3-star economy is preserved; only the WIN line changes.
 *     Placed right after each score boss so the player carries the
 *     "milestone moment" feeling into a new mechanic.
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

  // ── Chromatic: Ignition ──────────────────────────────────────────
  // First chromatic challenge — right after the level-25 score boss.
  // Target 2 clears is gentle: at this stage the palette is already
  // small enough that 2 chromatic clears in a single run is reachable
  // with intentional play, not a fluke. Stars still based on score so
  // the player isn't punished if they hit the chromatic target with a
  // low score.
  30: {
    levelNumber: 30,
    gridSize: 8,
    objective: { type: 'chromatic', target: 2 },
    piecePool: PIECE_POOLS.medium,
    starThresholds: [600, 1000, 1500],
    paletteSize: 4,
    seed: hashSeed(30),
  },

  // ── Chromatic: Cascade ───────────────────────────────────────────
  // Mid-chapter milestone after the level-50 score boss.
  // Target 3 clears + slightly smaller palette to make chromatic
  // line completion more frequent.
  60: {
    levelNumber: 60,
    gridSize: 8,
    objective: { type: 'chromatic', target: 3 },
    piecePool: PIECE_POOLS.hard,
    starThresholds: [1000, 1800, 2800],
    paletteSize: 4,
    seed: hashSeed(60),
  },

  // ── Chromatic: Resonance ─────────────────────────────────────────
  // Late-chapter chromatic milestone after the level-75 score boss.
  // Target 4 with palette 3 — at this density, near-chromatic hints
  // fire constantly and chromatic clears chain into each other.
  90: {
    levelNumber: 90,
    gridSize: 8,
    objective: { type: 'chromatic', target: 4 },
    piecePool: PIECE_POOLS.hard,
    starThresholds: [1500, 2500, 4000],
    paletteSize: 3,
    seed: hashSeed(90),
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
