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
import { getLevel, getEndlessConfig } from '../game/levels/LevelGenerator';
import { getDailyPuzzleConfig } from '../game/challenges/DailyPuzzle';
import { getWeeklyChallengeConfig } from '../game/challenges/WeeklyChallenge';
import { canPlace, placePiece as simulatePlace, findFullLines } from '../game/engine/Board';
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
  piece: Piece; // the oriented piece, for clear-simulation
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
            if (canPlace(grid, oriented, row, col)) moves.push({ index, rotations, row, col, piece: oriented });
          }
        }
      }
      oriented = rotatePiece(oriented);
    }
  }
  return moves;
}

/** How many lines a move would clear (for the greedy survival strategy). */
function linesClearedBy(grid: number[][], move: Move): number {
  const placed = simulatePlace(grid, move.piece, move.row, move.col);
  const { rows, cols } = findFullLines(placed);
  return rows.length + cols.length;
}

/** Greedy chooser: take the move clearing the most lines; among non-clearing
 *  moves, keep the board low (prefer the highest row index). This survives FAR
 *  longer than random play, pushing endless into deep waves (palette 5-7) the
 *  random bot never reaches. Ties broken by the seeded RNG for variety. */
function chooseGreedy(grid: number[][], moves: Move[], rng: SeededRandom): Move {
  let best = moves[0];
  let bestKey = -Infinity;
  for (const m of moves) {
    const cleared = linesClearedBy(grid, m);
    // weight clears heavily, then prefer lower placements, then jitter
    const key = cleared * 1000 + m.row + rng.next();
    if (key > bestKey) {
      bestKey = key;
      best = m;
    }
  }
  return best;
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

/** First filled (non-empty) cell on the board, or null. */
function firstFilledCell(grid: number[][]): { r: number; c: number } | null {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== 0) return { r, c };
    }
  }
  return null;
}

/** Play one full game to its terminal state (or the move cap). When
 *  firePowerups is set, the bot periodically detonates a random power-up at a
 *  live target, fuzzing the applyPowerUp -> cascade-resolve -> game-over-recheck
 *  integration path mid-game. */
function playToEnd(
  config: LevelConfig,
  maxMoves: number,
  strategy: 'random' | 'greedy' = 'random',
  firePowerups = false,
  useHold = false
) {
  gs().startLevel(config);
  usePlayerStore.setState({ coins: 0 }); // no paid swaps; force honest play
  const chooser = new SeededRandom((config.seed ?? 0) ^ 0x9e3779b9);

  let prevScore = 0;
  let moveCount = 0;
  let heldThisRun = false; // hold once per run to occupy the hold slot

  for (; moveCount < maxMoves; moveCount++) {
    const state = gs().gameState!;
    const status = state.status;
    const trayMoves = findAllMoves(state.grid, state.availablePieces);

    // A held piece is a REACHABLE move only when the tray has an empty slot to
    // retrieve it into (retrieveHeldPiece needs one) — mirrors the engine's
    // GameOver.gameOverPieces rule exactly. This is what makes the keystone a
    // regression guard for the unretrievable-held soft-lock: if the engine ever
    // counts a held piece on a FULL tray again, it would say 'playing' while
    // this (correct) check finds no move -> keystone fails.
    const held = gs().heldPiece;
    const trayHasEmptySlot = state.availablePieces.some((p) => p === null);
    const heldMoves = held && trayHasEmptySlot ? findAllMoves(state.grid, [held]) : [];
    const canMove = trayMoves.length > 0 || heldMoves.length > 0;

    // KEYSTONE (rotation- AND hold-aware game-over correctness):
    //   playing ⇒ a move exists (tray, or a retrievable held piece)
    //   lost    ⇒ NO move exists (genuinely stuck)
    // A WIN is asymmetric — it can fire with the board half-empty.
    if (status === 'playing') expect(canMove).toBe(true);
    if (status === 'lost') expect(canMove).toBe(false);

    if (status !== 'playing') break; // terminal (lost/won) — game correctly ended

    // Occupy the hold slot once early so later refills produce the
    // full-tray-while-holding state the soft-lock fix guards against.
    if (useHold && !heldThisRun) {
      const holdIdx = state.availablePieces.findIndex((p) => p !== null);
      if (holdIdx !== -1) {
        expect(gs().holdPiece(holdIdx)).toBe(true);
        heldThisRun = true;
        assertInvariants(prevScore, config.paletteSize ?? 7);
        prevScore = gs().gameState!.score;
        continue;
      }
    }

    // Periodically detonate a power-up at a live target (no inventory gate at
    // the store layer). Exercises applyPowerUp's cascade + game-over recheck.
    const target = firstFilledCell(state.grid);
    if (firePowerups && moveCount % 6 === 5 && target) {
      const kind = (['bomb', 'rowClear', 'colorClear'] as const)[Math.floor(chooser.next() * 3)];
      gs().applyPowerUp(kind, target.r, target.c); // colorIndex defaults to grid[r][c]
      assertInvariants(prevScore, config.paletteSize ?? 7);
      prevScore = gs().gameState!.score;
      continue; // power-ups don't consume a tray slot; place on the next turn
    }

    if (trayMoves.length > 0) {
      // Place a tray move (rotate-to-orientation first, as a real player would).
      const move = strategy === 'greedy'
        ? chooseGreedy(state.grid, trayMoves, chooser)
        : trayMoves[Math.floor(chooser.next() * trayMoves.length)];
      for (let t = 0; t < move.rotations; t++) {
        expect(gs().rotatePiece(move.index)).toBe(true);
      }
      expect(gs().placePiece(move.index, move.row, move.col)).toBe(true);
    } else {
      // No tray move, but the held piece is reachable (empty slot) and fits:
      // retrieve it into that slot, rotate, place — exercising the hold path.
      const emptyIdx = state.availablePieces.findIndex((p) => p === null);
      const heldMove = heldMoves[Math.floor(chooser.next() * heldMoves.length)];
      expect(gs().retrieveHeldPiece()).toBe(true);
      for (let t = 0; t < heldMove.rotations; t++) {
        expect(gs().rotatePiece(emptyIdx)).toBe(true);
      }
      expect(gs().placePiece(emptyIdx, heldMove.row, heldMove.col)).toBe(true);
    }

    assertInvariants(prevScore, config.paletteSize ?? 7);
    prevScore = gs().gameState!.score;
  }

  return { moveCount, finalStatus: gs().gameState!.status, piecesPlaced: gs().gameState!.piecesPlaced };
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

describe('bot playthrough — endless/zen mode (always-solvable, golden, wave palette)', () => {
  // Endless exercises a DIFFERENT pipeline than levels: generatePieceSetSmart
  // (always-solvable, now rotation-aware), golden-piece rolls, and wave-based
  // palette escalation (4 -> 7 every 50 pieces). The same per-turn invariants
  // and the move ⟺ playing keystone must still hold; the cell<=7 assertion
  // covers the palette growth. Fixed seed makes it deterministic.
  const endlessConfig = (seed: number): LevelConfig => ({ ...getEndlessConfig(), seed });

  for (const seed of [3, 99, 2024]) {
    it(`seed ${seed}: endless invariants hold across a long always-solvable run`, () => {
      const { moveCount } = playToEnd(endlessConfig(seed), 300);
      // A RANDOM bot can still corner itself even in always-solvable endless
      // (smart-gen only guarantees a clearing move EXISTS at refill, not that a
      // careless player takes it) — so the run length varies by seed. We only
      // require real progress; the value is the per-turn invariants + the
      // move ⟺ playing keystone holding the whole way, including at game-over.
      expect(moveCount).toBeGreaterThan(3);
    });
  }
});

describe('bot playthrough — greedy bot reaches DEEP endless waves (palette 5-7)', () => {
  const endlessConfig = (seed: number): LevelConfig => ({ ...getEndlessConfig(), seed });

  // A line-clearing greedy bot survives far longer than random play, pushing
  // past the piece-50/100/150 wave boundaries into palette 5-7 territory — the
  // late-game integration (wave escalation + high-palette chromatic + golden at
  // depth) the random bot never reaches. Invariants are asserted at every turn
  // at those depths.
  for (const seed of [11, 808]) {
    it(`seed ${seed}: greedy survives deep, invariants intact through wave escalation`, () => {
      const { piecesPlaced } = playToEnd(endlessConfig(seed), 600, 'greedy');
      // Crossed at least the first wave boundary (piece 50 -> palette 5).
      expect(piecesPlaced).toBeGreaterThan(50);
    });
  }
});

describe('bot playthrough — daily puzzle (palette 5, REACHABLE 8000 target -> can WIN)', () => {
  // The daily is a distinct config (paletteSize 5, medium+hard pool) AND its
  // 8000 target is reachable, so a greedy bot can actually WIN — exercising the
  // status->'won' terminal transition the unreachable-target level/endless runs
  // never hit. Fixed calendar dates make the shared daily seed deterministic.
  for (const [y, m, d] of [[2026, 5, 15], [2026, 8, 1], [2027, 0, 20]] as const) {
    it(`daily ${y}-${m + 1}-${d}: invariants + keystone hold to a clean win-or-stuck`, () => {
      const cfg = getDailyPuzzleConfig(new Date(y, m, d));
      const { moveCount, finalStatus } = playToEnd(cfg, 500, 'greedy');
      expect(moveCount).toBeGreaterThan(3);
      expect(['won', 'lost', 'playing']).toContain(finalStatus);
    });
  }
});

describe('bot playthrough — weekly challenge (distinct config, levelNumber -1)', () => {
  // The weekly challenge is its own config (levelNumber -1, week-seeded). Fuzz
  // it for completeness across every gameplay mode the engine drives. Fixed
  // dates make the week seed deterministic.
  for (const [y, m, d] of [[2026, 5, 15], [2026, 10, 3], [2027, 2, 9]] as const) {
    it(`weekly ${y}-${m + 1}-${d}: invariants + keystone hold to a clean terminal`, () => {
      const cfg = getWeeklyChallengeConfig(new Date(y, m, d));
      const { moveCount, finalStatus } = playToEnd(cfg, 500, 'greedy');
      expect(moveCount).toBeGreaterThan(3);
      expect(['won', 'lost', 'playing']).toContain(finalStatus);
    });
  }
});

describe('bot playthrough — power-ups fired mid-game (applyPowerUp integration)', () => {
  for (const seed of [5, 271]) {
    it(`seed ${seed}: periodic bomb/row/color detonation never corrupts state`, () => {
      // Greedy + periodic power-up detonation: fuzzes applyPowerUp's cascade
      // resolution and post-power-up game-over recheck against a live, evolving
      // board, with the per-turn invariants + move ⟺ playing keystone holding.
      const { moveCount } = playToEnd(stuckConfig(seed), 400, 'greedy', true);
      expect(moveCount).toBeGreaterThan(3);
    });
  }
});

describe('bot playthrough — HOLD enabled (regression guard for the unretrievable-held soft-lock)', () => {
  // The bot occupies the hold slot early, so later refills produce the
  // full-tray-WHILE-holding state. The keystone is hold-aware (a held piece
  // counts as a move ONLY when the tray has an empty slot to retrieve it into),
  // mirroring GameOver.gameOverPieces — so it directly guards that fix at the
  // integration level and exercises holdPiece/retrieveHeldPiece across a full
  // game. Before the fix the engine counted an unretrievable held piece as a
  // move (status 'playing') while this check found none -> the keystone fails.
  for (const seed of [4, 17, 256, 9001]) {
    it(`seed ${seed}: hold-aware invariants + keystone hold to a clean terminal`, () => {
      const { moveCount, finalStatus } = playToEnd(stuckConfig(seed), 500, 'greedy', false, true);
      expect(moveCount).toBeGreaterThan(3);
      expect(['lost', 'playing']).toContain(finalStatus); // unreachable target -> never 'won'
    });
  }
});
