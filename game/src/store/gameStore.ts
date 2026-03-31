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
  getCurrentStars,
} from '../game/engine/GameLoop';
import { Piece } from '../game/engine/Piece';
import { SeededRandom } from '../utils/seededRandom';
import { ScoreEvent } from '../game/engine/Scoring';

interface GameStore {
  // State
  gameState: GameState | null;
  levelConfig: LevelConfig | null;
  rng: SeededRandom | null;
  selectedPieceIndex: number | null;

  // Actions
  startLevel: (config: LevelConfig) => void;
  selectPiece: (index: number | null) => void;
  placePiece: (pieceIndex: number, row: number, col: number) => boolean;
  pauseGame: () => void;
  resumeGame: () => void;
  resetLevel: () => void;

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

  startLevel: (config: LevelConfig) => {
    const rng = new SeededRandom(config.seed);
    const gameState = initGame(config);
    set({ gameState, levelConfig: config, rng, selectedPieceIndex: null });
  },

  selectPiece: (index: number | null) => {
    set({ selectedPieceIndex: index });
  },

  placePiece: (pieceIndex: number, row: number, col: number): boolean => {
    const { gameState, rng, levelConfig } = get();
    if (!gameState || !rng || !levelConfig) return false;
    if (gameState.status !== 'playing') return false;

    try {
      const newState = processTurn(
        gameState,
        pieceIndex,
        row,
        col,
        rng,
        levelConfig.piecePool
      );
      set({ gameState: newState, selectedPieceIndex: null });
      return true;
    } catch {
      return false;
    }
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
