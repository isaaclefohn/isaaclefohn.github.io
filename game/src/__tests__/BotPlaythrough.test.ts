/**
 * Property-based "bot" playthroughs. A seeded bot plays full games of random
 * VALID moves through the real gameStore pipeline (placePiece -> processTurn ->
 * line-clear/cascade/gravity -> refill -> game-over), asserting engine
 * invariants on every single turn. This is the fuzzing layer that example-based
 * tests can't reach.
 *
 * The keystone invariant cross-checks two independent rotation-aware
 * implementations against each other on every turn:
 *   bot-can-still-move (its own rotation-aware search)  ⟺  status === 'playing'
 * A divergence is exactly the false-loss / missed-game-over class fixed this
 * session (rotation-blind game-over). Deterministic: fixed seeds, no Math.random.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    getAllKeys: () => Promise.resolve([] as string[]),
    multiGet: () => Promise.resolve([]),
    multiSet: () => Promise.resolve(),
    multiRemove: () => Promise.resolve(),
  },
}));

jest.mock('../services/analytics', () => ({
  trackGameEvent: () => {},
  track: () => {},
  initSentry: () => {},
  initAnalytics: () => {},
}));

import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { getLevel } from '../game/levels/LevelGenerator';
import { canPlace } from '../game/engine/Board';
import { rotatePiece, type Piece } from '../game/engine/Piece';
import { SeededRandom } from '../utils/seededRandom';
import type { LevelConfig } from '../game/engine/GameLoop';

const gs = () => useGameStore.getState();

/** A normal level with an unreachable score target so the bot plays until it
 *  is genuinely STUCK (exercising the lose / game-over path with the standard,
 *  NON-always-solvable generator) rather than winning on score. */
const stuckConfig = (seed: number): LevelConfig => ({
  ...getLevel(6),
  objective: { type: 'score', target: 1_000_000_000 },
  paletteSize: 4,
  seed,
});

interface Move {
  index: number;
  rotations: number;
  row: number;
  col: number;
}

/** Find EVERY legal move across all tray pieces and all <=4 rotations
 *  (rotation-aware, mirroring how the engine's game-over check reasons). */
function findAllMoves(grid: number[][], pieces: (Piece | null)[]): Move[] {
  const size = grid.length;
  const moves: Move[] = [];
  for (let index = 0; index < pieces.length; index++) {
    const piece = pieces[index];
    if (!piece) continue;
    let oriented = piece;
    const seenShapes = new Set<string>();
    for (let rotations = 0; rotations < 4; rotations++) {
      const key = oriented.shape.map((r) => r.map((b) => (b ? '1' : '0')).join('')).join('/');
      if (!seenShapes.has(key)) {
        seenShapes.add(key);
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            if (canPlace(grid, oriented, row, col)) moves.push({ index, rotations, row, col });
          }
        }
      }
      oriented = rotatePiece(oriented);
    }
  }
  return moves;
}

/** Assert the per-turn engine invariants on the current gameState. */
function assertInvariants(prevScore: number, paletteMax: number) {
  const s = gs().gameState!;
  expect(s).not.toBeNull();
  // status is always one of the three legal terminal/active states
  expect(['playing', 'lost', 'won', 'paused']).toContain(s.status);
  // score is a finite, non-negative, monotonically non-decreasing number
  expect(Number.isFinite(s.score)).toBe(true);
  expect(s.score).toBeGreaterThanOrEqual(0);
  expect(s.score).toBeGreaterThanOrEqual(prevScore);
  // bookkeeping counters stay finite & non-negative
  expect(Number.isFinite(s.piecesPlaced)).toBe(true);
  expect(Number.isFinite(s.combo)).toBe(true);
  expect(s.combo).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(s.maxComboThisRun ?? 0)).toBe(true);
  expect(Number.isFinite(s.linesCleared)).toBe(true);
  // the tray always has exactly 3 slots; filled slots carry a legal color
  expect(s.availablePieces).toHaveLength(3);
  for (const p of s.availablePieces) {
    if (p) {
      expect(p.colorIndex).toBeGreaterThanOrEqual(1);
      expect(p.colorIndex).toBeLessThanOrEqual(7);
    }
  }
  // every board cell is empty (0) or a legal color (1..7); palette never
  // exceeds the engine max even after wave escalation
  for (const rowArr of s.grid) {
    for (const cell of rowArr) {
      expect(Number.isInteger(cell)).toBe(true);
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThanOrEqual(7);
    }
  }
  // (paletteMax is informational; a freshly-spawned piece on a level honors it)
  void paletteMax;
}

/** Play one full game to its terminal state (or the move cap). */
function playToEnd(config: LevelConfig, maxMoves: number) {
  gs().startLevel(config);
  usePlayerStore.setState({ coins: 0 }); // no paid swaps; force honest play
  const chooser = new SeededRandom(config.seed ^ 0x9e3779b9);

  let prevScore = 0;
  let moveCount = 0;

  for (; moveCount < maxMoves; moveCount++) {
    const state = gs().gameState!;
    const status = state.status;
    const moves = findAllMoves(state.grid, state.availablePieces);

    // KEYSTONE: the bot can still move IFF the engine considers the run live.
    // (true xor — a missed game-over OR a false loss both fail here.)
    expect(moves.length > 0).toBe(status === 'playing');

    if (status !== 'playing') break; // terminal (lost/won) — game correctly ended

    // pick a legal move deterministically and play it (rotate-to-orientation
    // first, exactly as a real player would via tap-to-rotate)
    const move = moves[Math.floor(chooser.next() * moves.length)];
    for (let t = 0; t < move.rotations; t++) {
      expect(gs().rotatePiece(move.index)).toBe(true);
    }
    const placed = gs().placePiece(move.index, move.row, move.col);
    expect(placed).toBe(true); // the bot only ever submits legal placements

    assertInvariants(prevScore, config.paletteSize ?? 7);
    prevScore = gs().gameState!.score;
  }

  return { moveCount, finalStatus: gs().gameState!.status };
}

describe('bot playthrough — engine invariants hold across full games', () => {
  // A handful of fixed seeds. Each plays a complete game (hundreds of turns)
  // asserting every invariant per move; the run ends only when the engine
  // declares game-over AND the rotation-aware bot agrees no move remains.
  for (const seed of [1, 7, 42, 1337, 90210]) {
    it(`seed ${seed}: plays to a clean terminal state with all invariants intact`, () => {
      const { moveCount, finalStatus } = playToEnd(stuckConfig(seed), 600);
      // The bot should make real progress (not stall immediately on move 0).
      expect(moveCount).toBeGreaterThan(3);
      // With an unreachable target it can only END by getting stuck -> 'lost'
      // (or hit the 600-move cap still 'playing'); never a corrupt state.
      expect(['lost', 'playing']).toContain(finalStatus);
    });
  }
});
