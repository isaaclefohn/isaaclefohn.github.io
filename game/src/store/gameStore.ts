/**
 * Zustand store for active game session state.
 * This is ephemeral — not persisted. Resets on each new game.
 */

import { create } from 'zustand';
import {
  GameState,
  GameStatus,
  LevelConfig,
  initGame,
  processTurn,
  generatePieceSet,
  getCurrentStars,
  maybeRollGoldenPieceIndex,
} from '../game/engine/GameLoop';
import { Piece, rotatePiece } from '../game/engine/Piece';
import { SeededRandom } from '../utils/seededRandom';
import { ScoreEvent, scorePlacement, scoreClear } from '../game/engine/Scoring';
import { PowerUpType, applyBomb, applyRowClear, applyColorClear } from '../game/powerups/PowerUpManager';
import { resolveBoardCascade } from '../game/engine/Board';
import { checkObjective } from '../game/engine/GameLoop';
import { isGameOver } from '../game/engine/GameOver';
import { usePlayerStore } from './playerStore';
import { trackGameEvent } from '../services/analytics';

interface GameStore {
  // State
  gameState: GameState | null;
  levelConfig: LevelConfig | null;
  rng: SeededRandom | null;
  selectedPieceIndex: number | null;
  /** Snapshot of state before last placement (board/pieces + hold slot + RNG cursor) */
  undoSnapshot: { gameState: GameState; heldPiece: Piece | null; rngState: number } | null;
  /** Whether undo has been used this level */
  undoUsed: boolean;
  /** Piece stashed in the hold slot for later use */
  heldPiece: Piece | null;

  // Actions
  startLevel: (config: LevelConfig) => void;
  selectPiece: (index: number | null) => void;
  placePiece: (pieceIndex: number, row: number, col: number) => boolean;
  rotatePiece: (pieceIndex: number) => boolean;
  swapPieces: () => boolean;
  /** Swap a tray piece with the hold slot. Used to save a piece for later. */
  holdPiece: (pieceIndex: number) => boolean;
  /** Retrieve the held piece into the first empty tray slot. */
  retrieveHeldPiece: () => boolean;
  applyPowerUp: (type: PowerUpType, row: number, col: number, colorIndex?: number) => { cellsCleared: number } | null;
  pauseGame: () => void;
  resumeGame: () => void;
  resetLevel: () => void;
  /** Undo the last placement (one free per level) */
  undoLastMove: () => boolean;
  canUndo: () => boolean;
  /** Continue from game over — gives fresh pieces and resumes play */
  continueGame: () => boolean;

  /** Peek at what pieces come next (without advancing the RNG) */
  peekNextPieces: () => Piece[];

  // Derived getters
  getAvailablePieces: () => (Piece | null)[];
  getScore: () => number;
  getStatus: () => GameStatus | null;
  getCombo: () => number;
  getStars: () => 0 | 1 | 2 | 3;
  getLastScoreEvent: () => ScoreEvent | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  levelConfig: null,
  rng: null,
  selectedPieceIndex: null,
  undoSnapshot: null,
  undoUsed: false,
  heldPiece: null,

  startLevel: (config: LevelConfig) => {
    const rng = new SeededRandom(config.seed);
    const gameState = initGame(config);
    set({ gameState, levelConfig: config, rng, selectedPieceIndex: null, undoSnapshot: null, undoUsed: false, heldPiece: null });
    trackGameEvent({ type: 'level_start', level: config.levelNumber });
  },

  selectPiece: (index: number | null) => {
    set({ selectedPieceIndex: index });
  },

  placePiece: (pieceIndex: number, row: number, col: number): boolean => {
    const { gameState, rng, levelConfig, heldPiece } = get();
    if (!gameState || !rng || !levelConfig) return false;
    if (gameState.status !== 'playing') return false;

    try {
      // Snapshot current state for undo: board/pieces + hold slot + RNG cursor,
      // so re-placing after an undo reproduces the same future (not a fresh draw).
      const snapshot = {
        gameState: { ...gameState, grid: gameState.grid.map(r => [...r]), availablePieces: [...gameState.availablePieces] },
        heldPiece,
        rngState: rng.getState(),
      };
      const newState = processTurn(
        gameState,
        pieceIndex,
        row,
        col,
        rng,
        levelConfig.piecePool,
        heldPiece,
      );
      set({ gameState: newState, selectedPieceIndex: null, undoSnapshot: snapshot });
      return true;
    } catch {
      return false;
    }
  },

  rotatePiece: (pieceIndex: number): boolean => {
    const { gameState } = get();
    if (!gameState || gameState.status !== 'playing') return false;

    const piece = gameState.availablePieces[pieceIndex];
    if (!piece) return false;

    const rotated = rotatePiece(piece);
    const newAvailable = [...gameState.availablePieces];
    newAvailable[pieceIndex] = rotated;

    set({
      gameState: {
        ...gameState,
        availablePieces: newAvailable,
      },
    });
    return true;
  },

  swapPieces: (): boolean => {
    const { gameState, rng, levelConfig } = get();
    if (!gameState || !rng || !levelConfig) return false;
    if (gameState.status !== 'playing') return false;

    // First swap is free, subsequent swaps cost SWAP_COST coins. Previously
    // both the gate and the spend were dead code — players could swap an
    // unlimited number of times for free, which broke level pacing and
    // turned chromatic-objective levels into "Swap until you get the right
    // colors" trivially.
    const FREE_SWAPS = 1;
    const SWAP_COST = 25;
    if (gameState.swapsUsed >= FREE_SWAPS) {
      const spent = usePlayerStore.getState().spendCoins(SWAP_COST);
      if (!spent) return false;
    }

    // Honour the CURRENT palette — `gameState.paletteSize` tracks the live
    // palette (set by processTurn for endless waves, fixed for levels), so
    // a Swap in Zen wave 1 (4 colors) MUST give 4-color pieces, not the
    // default 7. Without this, Swap effectively skips past the chromatic
    // teaching ramp the wave palette was designed around.
    const newPieces = generatePieceSet(rng, levelConfig.piecePool, gameState.paletteSize);

    // A reroll can hand back a tray that fits nowhere (even in any rotation) on
    // a near-full board. Game-over status is otherwise only recomputed in
    // processTurn/applyPowerUp, so without this the run would soft-lock:
    // status stays 'playing', no game-over modal, and there's no piece to
    // consume to ever trigger the check. Surface the honest game-over instead
    // (the game-over modal still offers the Continue path). Held piece counts.
    const { heldPiece } = get();
    const swapPool = heldPiece ? [...newPieces, heldPiece] : newPieces;
    const swapDead = isGameOver(gameState.grid, swapPool);

    set({
      gameState: {
        ...gameState,
        availablePieces: newPieces,
        status: swapDead ? 'lost' : gameState.status,
        swapsUsed: gameState.swapsUsed + 1,
        // The golden piece index referred to a position in the OLD tray —
        // after a full reroll, it would point at an arbitrary unrelated
        // piece. Re-roll it for endless (where goldens exist) and clear it
        // everywhere else, matching processTurn's policy when a fresh set
        // spawns naturally.
        goldenPieceIndex: gameState.level === 0 ? maybeRollGoldenPieceIndex(rng) : null,
      },
      selectedPieceIndex: null,
    });
    return true;
  },

  holdPiece: (pieceIndex: number): boolean => {
    const { gameState, heldPiece } = get();
    if (!gameState || gameState.status !== 'playing') return false;
    const piece = gameState.availablePieces[pieceIndex];
    if (!piece) return false;
    // Swap tray slot with hold slot. If hold was empty, the tray slot becomes null.
    const newAvailable = [...gameState.availablePieces];
    newAvailable[pieceIndex] = heldPiece;
    set({
      gameState: { ...gameState, availablePieces: newAvailable },
      heldPiece: piece,
      selectedPieceIndex: null,
      // Invalidate the undo snapshot. The snapshot captured the PRE-HOLD
      // heldPiece (whatever was in the slot before this hold action); if
      // we left it intact, a subsequent Undo would silently restore the
      // pre-hold hold-slot — which means the piece the user JUST held
      // disappears. Block undo after hold instead of trying to merge the
      // two state mutations; either action by itself is reversible, but
      // the composition is not.
      undoSnapshot: null,
    });
    return true;
  },

  retrieveHeldPiece: (): boolean => {
    const { gameState, heldPiece } = get();
    if (!gameState || gameState.status !== 'playing' || !heldPiece) return false;
    const emptyIdx = gameState.availablePieces.findIndex((p) => p === null);
    if (emptyIdx === -1) return false;
    const newAvailable = [...gameState.availablePieces];
    newAvailable[emptyIdx] = heldPiece;
    set({
      gameState: { ...gameState, availablePieces: newAvailable },
      heldPiece: null,
      selectedPieceIndex: emptyIdx,
    });
    return true;
  },

  applyPowerUp: (type: PowerUpType, row: number, col: number, colorIndex?: number) => {
    const { gameState } = get();
    if (!gameState || gameState.status !== 'playing') return null;

    let result: { grid: number[][]; cellsCleared: number };

    switch (type) {
      case 'bomb':
        result = applyBomb(gameState.grid, row, col);
        break;
      case 'rowClear':
        result = applyRowClear(gameState.grid, row);
        break;
      case 'colorClear':
        // Optional-chain the default color read so an out-of-range row can't
        // throw before applyColorClear's own `<= 0` guard runs (the preview
        // path at the GameScreen call site already reads grid[row]?.[col]).
        result = applyColorClear(gameState.grid, colorIndex ?? (gameState.grid[row]?.[col] ?? 0));
        break;
      default:
        return null;
    }

    if (result.cellsCleared === 0) return null;

    // After the power-up zeros its cells, the resulting grid may have newly
    // full rows/cols (e.g. a Row Clear that completed a partially-full
    // column). Previously power-ups stopped at zero-out and left those
    // lines full until the next manual placement — visibly broken: row 6 is
    // full, no clear animation, no chromatic cascade, no score for it.
    // Hand the grid to the shared resolver so the line-clear + gravity +
    // chromatic-detonation loop runs identically to a placement turn.
    const cascade = resolveBoardCascade(result.grid);

    const directScore = scorePlacement(result.cellsCleared);
    const cascadeScore = cascade.linesCleared > 0
      ? scoreClear(
          cascade.linesCleared,
          cascade.cellsCleared,
          gameState.combo,
          cascade.perfectClear,
          cascade.chromaticClears,
          cascade.chromaticColors,
          cascade.cascadeCellsCleared,
        )
      : null;

    const totalPoints = directScore.points + (cascadeScore?.points ?? 0);
    const newScore = gameState.score + totalPoints;
    // Bias the surfaced score event toward the more "interesting" one —
    // cascade events have chromatic / multi-line info the UI wants to
    // celebrate; direct power-up clears are flat.
    const surfacedEvent: ScoreEvent = cascadeScore ?? directScore;
    const finalGrid = cascade.grid;

    const { heldPiece } = get();
    const remainingPieces = gameState.availablePieces.filter((p): p is Piece => p !== null);
    const gameOverPool = heldPiece ? [...remainingPieces, heldPiece] : remainingPieces;
    const gameOver = gameOverPool.length > 0 && isGameOver(finalGrid, gameOverPool);

    // Match processTurn's "what changed this turn" bookkeeping. The
    // previous version omitted both fields, so a power-up that triggered
    // a chromatic cascade (a) didn't credit the chromatic clear toward
    // the run counter or chromatic-objective levels, and (b) never set
    // status: 'won' even on score-objective levels — the player had to
    // place a piece afterward to make the win register. Mirror what
    // processTurn does at the end of a placement so a power-up that
    // happens to complete the objective wins the level.
    const newChromaticClears =
      gameState.chromaticClears + (cascadeScore?.chromaticClears ?? 0);
    const won = checkObjective(gameState.objective, newScore, newChromaticClears);
    const nextStatus = won ? 'won' : gameOver ? 'lost' : gameState.status;

    // Mirror the rest of processTurn's per-turn accumulators. `applyPowerUp`
    // historically copied SOME of processTurn's final write (score, combo,
    // chromaticClears, status) but silently dropped `linesCleared` and
    // `maxComboThisRun`. That under-credited every downstream consumer of
    // those two run totals when a clear came from a power-up cascade
    // instead of a placement: Battle Pass XP / Seasonal points / block-
    // mastery XP / lines_cleared quest progress / persisted totalLinesCleared
    // (all keyed on gameState.linesCleared at win/lose), and the combo-tier
    // achievements + "Peak combo" lose-modal stat (keyed on maxComboThisRun).
    const newCombo = cascade.linesCleared > 0 ? gameState.combo + 1 : 0;
    const newLinesCleared = gameState.linesCleared + cascade.linesCleared;
    const newMaxCombo = Math.max(gameState.maxComboThisRun, newCombo);

    set({
      gameState: {
        ...gameState,
        grid: finalGrid,
        score: newScore,
        combo: newCombo,
        maxComboThisRun: newMaxCombo,
        linesCleared: newLinesCleared,
        chromaticClears: newChromaticClears,
        status: nextStatus,
        lastScoreEvent: surfacedEvent,
        // Reset turn-scoped animation fields so BoardEffects' sweep/squish
        // play the power-up's cascade, not a stale replay from the prior
        // placement. lastPlacedCells stays empty — the power-up didn't add
        // a piece, so the squish is meaningless here.
        lastPlacedCells: [],
        lastClearedRows: cascade.clearedRows,
        lastClearedCols: cascade.clearedCols,
      },
    });

    return { cellsCleared: result.cellsCleared + cascade.cellsCleared };
  },

  pauseGame: () => {
    const { gameState } = get();
    if (gameState && gameState.status === 'playing') {
      set({ gameState: { ...gameState, status: 'paused' } });
    }
  },

  resumeGame: () => {
    const { gameState } = get();
    if (gameState && gameState.status === 'paused') {
      set({ gameState: { ...gameState, status: 'playing' } });
    }
  },

  resetLevel: () => {
    const { levelConfig } = get();
    if (levelConfig) {
      get().startLevel(levelConfig);
    }
  },

  undoLastMove: (): boolean => {
    const { undoSnapshot, undoUsed, rng } = get();
    if (!undoSnapshot || undoUsed) return false;
    // Restore the RNG cursor and hold slot too, not just the board.
    if (rng) rng.setState(undoSnapshot.rngState);
    set({
      gameState: undoSnapshot.gameState,
      heldPiece: undoSnapshot.heldPiece,
      undoSnapshot: null,
      undoUsed: true,
      selectedPieceIndex: null,
    });
    return true;
  },


  canUndo: () => {
    const { undoSnapshot, undoUsed } = get();
    return undoSnapshot !== null && !undoUsed;
  },

  continueGame: (): boolean => {
    const { gameState, levelConfig, rng, heldPiece } = get();
    if (!gameState || gameState.status !== 'lost' || !rng || !levelConfig) return false;

    // Generate fresh pieces respecting the active palette — same fix as
    // swapPieces / peekNextPieces. Continue is currently reachable from
    // level mode only, but wiring it to Zen later without this guard
    // would silently hand the player a 7-color tray in a 4-color wave.
    //
    // Continue is a PAID second chance (10 gems) that keeps the same near-full
    // board. A random set could fit nowhere (even rotated), which would either
    // soft-lock or instantly re-lose — wasting the player's gems. Retry a few
    // times to hand back a tray that's actually playable (rotation-aware); only
    // if the board is genuinely too full for any pooled piece in any rotation
    // do we honestly fall back to game-over.
    const poolOf = (candidate: Piece[]) => (heldPiece ? [...candidate, heldPiece] : candidate);
    let newPieces = generatePieceSet(rng, levelConfig.piecePool, gameState.paletteSize);
    for (let attempt = 0; attempt < 8 && isGameOver(gameState.grid, poolOf(newPieces)); attempt++) {
      newPieces = generatePieceSet(rng, levelConfig.piecePool, gameState.paletteSize);
    }
    const stillDead = isGameOver(gameState.grid, poolOf(newPieces));
    set({
      gameState: {
        ...gameState,
        status: stillDead ? 'lost' : 'playing',
        availablePieces: newPieces,
      },
      selectedPieceIndex: null,
    });
    return true;
  },

  peekNextPieces: () => {
    const { rng, levelConfig, gameState } = get();
    if (!rng || !levelConfig) return [];
    const peekRng = rng.clone();
    // Match the LIVE palette so the "NEXT" preview shows colors that will
    // actually appear. Without this, in Zen wave 1 (4 colors) the preview
    // misleadingly displays pieces in 7 colors, then the real spawn comes
    // out in 4 — a UX trust break and a chromatic-strategy spoiler.
    return generatePieceSet(peekRng, levelConfig.piecePool, gameState?.paletteSize);
  },

  getAvailablePieces: () => get().gameState?.availablePieces ?? [],
  getScore: () => get().gameState?.score ?? 0,
  getStatus: () => get().gameState?.status ?? null,
  getCombo: () => get().gameState?.combo ?? 0,
  getStars: () => {
    const state = get().gameState;
    return state ? getCurrentStars(state) : 0;
  },
  getLastScoreEvent: () => get().gameState?.lastScoreEvent ?? null,
}));
