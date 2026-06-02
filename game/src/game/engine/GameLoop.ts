/**
 * Game loop / turn manager for Chroma Drop.
 * Manages the state machine for a single game session.
 */

import { Grid, createGrid, executePlacement, canPlace, placePiece, findFullLines, getGridSize } from './Board';
import { getWaveForPieces } from '../levels/EndlessWaves';
import { Piece, PieceType, createPiece, getPieceCells, PIECE_POOLS, rotatePiece } from './Piece';
import { ScoreEvent, scorePlacement, scoreClear, calculateStars } from './Scoring';
import { isGameOver } from './GameOver';
import { SeededRandom } from '../../utils/seededRandom';
import { PIECES_PER_TURN, COLORS } from '../../utils/constants';

export type GameStatus = 'playing' | 'won' | 'lost' | 'paused';

/**
 * Win-condition for a level. Discriminated union so new objective types
 * can be added without touching every consumer.
 *
 *   - `score`: reach N total points (the original, most common type).
 *   - `chromatic`: clear N same-color lines (the brand-signature variant —
 *     turns the chromatic mechanic from a bonus that *happens* into the
 *     thing the player is *actually trying to do*). Stars still come off
 *     `starThresholds` against score so existing 1-/2-/3-star economy
 *     keeps working — only the WIN line changes.
 */
export type LevelObjective =
  | { type: 'score'; target: number }
  | { type: 'chromatic'; target: number };

export interface GameState {
  grid: Grid;
  gridSize: number;
  score: number;
  combo: number;
  piecesPlaced: number;
  linesCleared: number;
  availablePieces: (Piece | null)[];
  status: GameStatus;
  level: number;
  objective: LevelObjective;
  starThresholds: [number, number, number];
  lastScoreEvent: ScoreEvent | null;
  /** Rows cleared in the last turn (for sweep animation) */
  lastClearedRows: number[];
  /** Columns cleared in the last turn (for sweep animation) */
  lastClearedCols: number[];
  /** Cells placed in the last turn (for squish animation) */
  lastPlacedCells: { row: number; col: number }[];
  /** Number of piece swaps used this game */
  swapsUsed: number;
  /** Distinct block colors in play this level (drives chromatic achievability) */
  paletteSize: number;
  /** Running count of single-color (chromatic) line clears this game */
  chromaticClears: number;
  /**
   * Peak combo value reached during THIS run. Distinct from
   * `state.combo` which is the *active* chain (resets to 0 on any
   * placement that doesn't clear). Surfaces in the game-over modal
   * as "Peak combo: N" so the player sees their personal best of
   * the session even after a final no-clear placement zeroed the
   * live counter. Pairs naturally with the run-trace share card.
   */
  maxComboThisRun: number;
  /**
   * Index (0-2) of the "golden" piece in the current `availablePieces`
   * tray, or null when no piece is golden. Endless-only — randomized
   * (~10% per fresh tray) and reset on each new piece set. When the
   * golden piece is placed AND its placement creates a line clear,
   * the score from that turn is doubled via `goldenBonus` on the
   * resulting ScoreEvent. The variable-reward "mid-run" lever per
   * the Block Blast research wave.
   */
  goldenPieceIndex: number | null;
}

export interface LevelConfig {
  levelNumber: number;
  gridSize: number;
  objective: LevelObjective;
  piecePool: PieceType[];
  starThresholds: [number, number, number];
  seed: number;
  /** Distinct block colors this level (<= 7). Fewer = chromatic clears achievable. */
  paletteSize?: number;
}

/** Initialize a new game state for a given level configuration */
export function initGame(config: LevelConfig): GameState {
  const rng = new SeededRandom(config.seed);
  const grid = createGrid(config.gridSize);
  const availablePieces = generatePieceSet(rng, config.piecePool, config.paletteSize);

  // Golden-piece roll is endless-only (level === 0). Other modes rely
  // on deterministic seeding for shared leaderboards; the gold roll
  // consumes RNG and varies per session, so non-endless modes stay null.
  const goldenPieceIndex =
    config.levelNumber === 0 ? maybeRollGoldenPieceIndex(rng) : null;

  return {
    grid,
    gridSize: config.gridSize,
    score: 0,
    combo: 0,
    piecesPlaced: 0,
    linesCleared: 0,
    availablePieces,
    status: 'playing',
    level: config.levelNumber,
    objective: config.objective,
    starThresholds: config.starThresholds,
    lastScoreEvent: null,
    lastClearedRows: [],
    lastClearedCols: [],
    lastPlacedCells: [],
    swapsUsed: 0,
    paletteSize: config.paletteSize ?? COLORS.blocks.length,
    chromaticClears: 0,
    maxComboThisRun: 0,
    goldenPieceIndex,
  };
}

/** Probability that a fresh piece tray contains a golden piece. */
export const GOLDEN_PIECE_SPAWN_RATE = 0.1;

/** Bonus multiplier applied to the line-clear score when the golden
 *  piece is the one that triggered the clear. */
export const GOLDEN_PIECE_MULTIPLIER = 2;

/**
 * 10% chance to mark one of the 3 pieces as golden. Returns the index
 * (0/1/2) or null. Designed for endless-mode use only — consumes RNG
 * draws so it cannot be on the deterministic seed path.
 *
 * The 10% rate is the load-bearing constant: too high and golden
 * pieces become routine (lose specialness); too low and players
 * never see them. 10% means ~1 golden every 3 piece-sets, frequent
 * enough to be a learnable pattern, rare enough to feel like an
 * event when it appears.
 */
export function maybeRollGoldenPieceIndex(rng: SeededRandom): number | null {
  if (rng.next() >= GOLDEN_PIECE_SPAWN_RATE) return null;
  return rng.nextInt(0, PIECES_PER_TURN - 1);
}

/** Generate a set of 3 random pieces from the pool */
export function generatePieceSet(rng: SeededRandom, pool: PieceType[], paletteSize?: number): Piece[] {
  // Limiting the per-level palette is what makes a single-color ("chromatic")
  // line achievable by planning instead of luck — the core Chroma Drop hook.
  // nextInt consumes one RNG draw regardless of range, so piece types/positions
  // stay identical seed-for-seed; only the color values compress.
  const maxColor = Math.min(paletteSize ?? COLORS.blocks.length, COLORS.blocks.length);
  const pieces: Piece[] = [];
  for (let i = 0; i < PIECES_PER_TURN; i++) {
    const type = rng.pick(pool);
    const colorIndex = rng.nextInt(1, maxColor);
    pieces.push(createPiece(type, colorIndex));
  }
  return pieces;
}

/**
 * Does at least one of `pieces` have a placement on `grid` that creates
 * a line clear (row or column)? Used by the smart-generation variant
 * to decide whether to accept a random set or retry.
 *
 * Search complexity: O(pieces × grid² × line-check). For 3 pieces on
 * an 8x8 board that's ~3 * 64 * O(1) line-find — a few thousand cheap
 * operations per call. Worth it: a single avoided "dead-set" run is
 * worth orders of magnitude more in retained engagement than the
 * compute cost.
 */
export function hasClearableMove(grid: Grid, pieces: (Piece | null)[]): boolean {
  const size = getGridSize(grid);
  for (const piece of pieces) {
    if (!piece) continue;
    // Tap-to-rotate is free and unlimited, so a piece can clear a line in any
    // of its up-to-4 orientations. Checking only the current orientation made
    // the "always-solvable" generator wrongly reject sets the player could
    // clear after a rotation (e.g. a domino_h that becomes domino_v to finish
    // a column) — the same rotation-blind assumption fixed in game-over
    // detection. Four 90° turns return to the original; we bail on the first
    // clearing placement found.
    let oriented = piece;
    for (let turn = 0; turn < 4; turn++) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!canPlace(grid, oriented, r, c)) continue;
          const placed = placePiece(grid, oriented, r, c);
          const { rows, cols } = findFullLines(placed);
          if (rows.length > 0 || cols.length > 0) return true;
        }
      }
      oriented = rotatePiece(oriented);
    }
  }
  return false;
}

/**
 * Smart-generation variant — returns a piece set that has at least
 * one placement creating a line clear on the current board, by retrying
 * up to `maxAttempts` times.
 *
 * This is the single biggest gameplay-feel upgrade from the Block Blast
 * teardown research: players never get into a "I literally cannot
 * clear anything" frustration spiral. Even when the board state is
 * tight, the RNG draws are biased (via retry) toward pieces that DO
 * fit a clear, so the experience stays consistently "I can do this."
 *
 * IMPORTANT: only call this for endless / non-deterministic modes.
 * For daily-puzzle and level modes, the seed is load-bearing — the
 * SAME seed must always produce the same piece sequence so daily
 * leaderboards and level-replay are comparable across players. The
 * retry loop consumes a variable number of RNG draws depending on
 * board state, which breaks reproducibility. `processTurn` gates
 * on `state.level === 0` (the endless-mode sentinel) before calling
 * this variant.
 *
 * Falls back to a regular random set after `maxAttempts` exhausted —
 * if no clearable set exists in 5 tries, board state probably has
 * no clear path forward anyway and game-over detection will fire
 * on the next turn.
 */
export function generatePieceSetSmart(
  rng: SeededRandom,
  pool: PieceType[],
  paletteSize: number | undefined,
  grid: Grid,
  maxAttempts: number = 5,
): Piece[] {
  let lastCandidate: Piece[] = generatePieceSet(rng, pool, paletteSize);
  if (hasClearableMove(grid, lastCandidate)) return lastCandidate;
  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    lastCandidate = generatePieceSet(rng, pool, paletteSize);
    if (hasClearableMove(grid, lastCandidate)) return lastCandidate;
  }
  return lastCandidate;
}

/**
 * Process a piece placement. Returns the new game state.
 * This is the core turn function — handles placement, clearing, scoring,
 * piece regeneration, and win/loss detection.
 */
export function processTurn(
  state: GameState,
  pieceIndex: number,
  row: number,
  col: number,
  rng: SeededRandom,
  piecePool: PieceType[],
  /** Optional held piece — if present, its placeability is considered
   *  during game-over detection so a held piece can't be stranded. */
  heldPiece: Piece | null = null,
): GameState {
  const piece = state.availablePieces[pieceIndex];
  if (!piece) throw new Error(`No piece at index ${pieceIndex}`);

  // Compute placed cell positions for animation
  const pieceCells = getPieceCells(piece);
  const placedCellPositions = pieceCells.map(c => ({ row: row + c.row, col: col + c.col }));

  // Execute the placement
  const result = executePlacement(state.grid, piece, row, col);

  // Calculate score
  let scoreEvent: ScoreEvent;
  let newCombo: number;

  if (result.linesCleared > 0) {
    scoreEvent = scoreClear(
      result.linesCleared,
      result.cellsCleared,
      state.combo,
      result.perfectClear,
      result.chromaticClears,
      result.chromaticColors,
      result.cascadeCellsCleared,
    );
    newCombo = scoreEvent.combo;

    // Golden-piece bonus: if the placed piece was the golden one AND
    // it triggered a clear, double the points for this turn. The
    // bonus is the *extra* portion (post-multiplied - base) so the UI
    // can surface "+N GOLDEN" as a distinct callout. Golden state
    // never persists across piece sets — bonus fires once or is lost.
    //
    // NOTE: `breakdown` is component DETAIL for display (the clearBonus
    // / chromaticBonus / etc. lines), NOT a partition that sums to
    // `points`. It intentionally keeps the PRE-golden component values —
    // `points` is the headline total and already includes goldenBonus,
    // and `goldenBonus` is surfaced as its own field for the "+N GOLDEN"
    // callout. Do not assume `sum(breakdown) === points`; the only live
    // consumers read individual breakdown fields (e.g. clearBonus > 0),
    // never the sum.
    if (pieceIndex === state.goldenPieceIndex) {
      const basePoints = scoreEvent.points;
      const goldenBonus = basePoints * (GOLDEN_PIECE_MULTIPLIER - 1);
      scoreEvent = {
        ...scoreEvent,
        points: basePoints + goldenBonus,
        goldenBonus,
      };
    }
  } else {
    scoreEvent = scorePlacement(piece.cellCount);
    newCombo = 0; // Reset combo when no lines cleared
  }

  const newScore = state.score + scoreEvent.points;
  const newPiecesPlaced = state.piecesPlaced + 1;
  const newLinesCleared = state.linesCleared + result.linesCleared;
  // Track the peak combo reached this run. `newCombo` is the active
  // chain after this turn — zero on a no-clear placement, otherwise
  // the prior chain + 1. Math.max means the per-run peak only ever
  // grows, never decays mid-run, regardless of how the live counter
  // resets.
  const newMaxCombo = Math.max(state.maxComboThisRun, newCombo);

  // Remove the placed piece from available pieces
  const newAvailable = [...state.availablePieces];
  newAvailable[pieceIndex] = null;

  // Check if all 3 pieces have been placed — generate new set
  const remainingPieces = newAvailable.filter((p): p is Piece => p !== null);
  if (remainingPieces.length === 0) {
    // Endless mode (level === 0): use the smart generator that retries
    // until at least one piece has a clearable placement. This is the
    // Block Blast "always solvable" mechanic — players never end a
    // session on a dead-set frustration spiral. Daily-puzzle and level
    // modes stay on the deterministic path so seeds remain reproducible
    // for shared leaderboards. See `generatePieceSetSmart` doc comment
    // for the full rationale.
    // Endless mode (level 0): recompute the active palette from the
    // wave system before generating the next set. Crossing a wave
    // boundary expands the palette (4 → 5 → 6 → 7), which makes
    // chromatic clears progressively harder and gives the player a
    // visible "I'm advancing" arc beyond just score. Non-endless
    // modes keep their fixed paletteSize.
    const nextPaletteSize = state.level === 0
      ? getWaveForPieces(newPiecesPlaced).paletteSize
      : state.paletteSize;
    const newSet = state.level === 0
      ? generatePieceSetSmart(rng, piecePool, nextPaletteSize, result.grid)
      : generatePieceSet(rng, piecePool, state.paletteSize);
    // Roll a fresh golden index for the new set (endless-only). Daily-
    // puzzle / level modes stay null so seeds remain deterministic.
    const newGoldenPieceIndex =
      state.level === 0 ? maybeRollGoldenPieceIndex(rng) : null;
    // Check for game over with the new set (plus any held piece)
    const gameOverPool = heldPiece ? [...newSet, heldPiece] : newSet;
    const gameOver = isGameOver(result.grid, gameOverPool);
    // Check for win
    const won = checkObjective(state.objective, newScore, state.chromaticClears + scoreEvent.chromaticClears);

    return {
      ...state,
      grid: result.grid,
      score: newScore,
      combo: newCombo,
      maxComboThisRun: newMaxCombo,
      piecesPlaced: newPiecesPlaced,
      linesCleared: newLinesCleared,
      availablePieces: newSet,
      chromaticClears: state.chromaticClears + scoreEvent.chromaticClears,
      status: won ? 'won' : gameOver ? 'lost' : 'playing',
      lastScoreEvent: scoreEvent,
      lastClearedRows: result.clearedRows,
      lastClearedCols: result.clearedCols,
      lastPlacedCells: placedCellPositions,
      goldenPieceIndex: newGoldenPieceIndex,
      paletteSize: nextPaletteSize,
    };
  }

  // Check for game over with remaining pieces (plus any held piece)
  const gameOverPool = heldPiece ? [...remainingPieces, heldPiece] : remainingPieces;
  const gameOver = isGameOver(result.grid, gameOverPool);
  const won = checkObjective(state.objective, newScore, state.chromaticClears + scoreEvent.chromaticClears);

  return {
    ...state,
    grid: result.grid,
    score: newScore,
    combo: newCombo,
    maxComboThisRun: newMaxCombo,
    piecesPlaced: newPiecesPlaced,
    linesCleared: newLinesCleared,
    availablePieces: newAvailable,
    chromaticClears: state.chromaticClears + scoreEvent.chromaticClears,
    status: won ? 'won' : gameOver ? 'lost' : 'playing',
    lastScoreEvent: scoreEvent,
    lastClearedRows: result.clearedRows,
    lastClearedCols: result.clearedCols,
    lastPlacedCells: placedCellPositions,
    // If the placed piece WAS the golden one, clear the index. The
    // other-tray-spread `...state` carries forward the prior value
    // by default, which would leave the index pointing at a now-null
    // slot — and PieceTray would render the gold ring on an empty
    // slot. The full-tray-exhausted branch above rolls a fresh
    // index on every new set, so this only matters when 1-2 pieces
    // remain in the tray after the golden placement.
    goldenPieceIndex:
      pieceIndex === state.goldenPieceIndex ? null : state.goldenPieceIndex,
  };
}

/** Check if the level objective has been met. Pass the current score AND
 *  chromatic-clear count so the function can route to whichever the
 *  active objective cares about.
 *
 *  Exported because the level-objective rule is the kind of thing that
 *  needs unit tests separate from the full processTurn flow — a
 *  one-line discriminated-union branch is too small to be tested only
 *  indirectly through a 200-line game-state pipeline. */
export function checkObjective(
  objective: LevelObjective,
  score: number,
  chromaticClears: number,
): boolean {
  switch (objective.type) {
    case 'score':
      return score >= objective.target;
    case 'chromatic':
      return chromaticClears >= objective.target;
  }
}

/** Get the current star rating for the game state */
export function getCurrentStars(state: GameState): 0 | 1 | 2 | 3 {
  return calculateStars(state.score, state.starThresholds);
}
