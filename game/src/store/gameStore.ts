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
} from '../game/engine/GameLoop';
import { Piece, rotatePiece } from '../game/engine/Piece';
import { SeededRandom } from '../utils/seededRandom';
import { ScoreEvent, scorePlacement } from '../game/engine/Scoring';
import { PowerUpType, applyBomb, applyRowClear, applyColorClear } from '../game/powerups/PowerUpManager';
import { isGameOver } from '../game/engine/GameOver';

interface GameStore {
  // State
  gameState: GameState | null;
  levelConfig: LevelConfig | null;
  rng: SeededRandom | null;
  selectedPieceIndex: number | null;
  /** Snapshot of state before last placement (for undo) */
  undoSnapshot: GameState | null;
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
  },

  selectPiece: (index: number | null) => {
    set({ selectedPieceIndex: index });
  },

  placePiece: (pieceIndex: number, row: number, col: number): boolean => {
    const { gameState, rng, levelConfig, heldPiece } = get();
    if (!gameState || !rng || !levelConfig) return false;
    if (gameState.status !== 'playing') return false;

    try {
      // Snapshot current state for undo
      const snapshot = { ...gameState, grid: gameState.grid.map(r => [...r]), availablePieces: [...gameState.availablePieces] };
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

    // First swap is free, subsequent swaps cost 25 coins
    const FREE_SWAPS = 1;
    const SWAP_COST = 25;
    const needsCoins = gameState.swapsUsed >= FREE_SWAPS;

    // Generate fresh pieces
    const newPieces = generatePieceSet(rng, levelConfig.piecePool);

    set({
      gameState: {
        ...gameState,
        availablePieces: newPieces,
        swapsUsed: gameState.swapsUsed + 1,
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
        result = applyColorClear(gameState.grid, colorIndex ?? gameState.grid[row][col]);
        break;
      default:
        return null;
    }

    if (result.cellsCleared === 0) return null;

    const scoreEvent = scorePlacement(result.cellsCleared);
    const newScore = gameState.score + scoreEvent.points;

    // Re-check game state after power-up (held piece is considered too)
    const { heldPiece } = get();
    const remainingPieces = gameState.availablePieces.filter((p): p is Piece => p !== null);
    const gameOverPool = heldPiece ? [...remainingPieces, heldPiece] : remainingPieces;
    const gameOver = gameOverPool.length > 0 && isGameOver(result.grid, gameOverPool);

    set({
      gameState: {
        ...gameState,
        grid: result.grid,
        score: newScore,
        status: gameOver ? 'lost' : gameState.status,
        lastScoreEvent: scoreEvent,
      },
    });

    return { cellsCleared: result.cellsCleared };
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
    const { undoSnapshot, undoUsed } = get();
    if (!undoSnapshot || undoUsed) return false;
    set({ gameState: undoSnapshot, undoSnapshot: null, undoUsed: true, selectedPieceIndex: null });
    return true;
  },

  canUndo: () => {
    const { undoSnapshot, undoUsed } = get();
    return undoSnapshot !== null && !undoUsed;
  },

  continueGame: (): boolean => {
    const { gameState, levelConfig, rng } = get();
    if (!gameState || gameState.status !== 'lost' || !rng || !levelConfig) return false;

    // Generate fresh pieces from the level's piece pool and resume
    const newPieces = generatePieceSet(rng, levelConfig.piecePool);
    set({
      gameState: {
        ...gameState,
        status: 'playing',
        availablePieces: newPieces,
      },
      selectedPieceIndex: null,
    });
    return true;
  },

  peekNextPieces: () => {
    const { rng, levelConfig } = get();
    if (!rng || !levelConfig) return [];
    const peekRng = rng.clone();
    return generatePieceSet(peekRng, levelConfig.piecePool);
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
