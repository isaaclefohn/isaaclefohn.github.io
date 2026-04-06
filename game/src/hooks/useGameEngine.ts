/**
 * Hook that orchestrates the game loop.
 * Connects the game store to the UI, handles level completion and rewards.
 */

import { useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { getLevel } from '../game/levels/LevelGenerator';
import { calculateCoinReward } from '../game/engine/Scoring';

export function useGameEngine() {
  const {
    gameState,
    levelConfig,
    selectedPieceIndex,
    startLevel,
    selectPiece,
    placePiece,
    rotatePiece,
    swapPieces,
    applyPowerUp,
    pauseGame,
    resumeGame,
    resetLevel,
    getStars,
  } = useGameStore();

  const { completeLevel, addCoins, updateStreak } = usePlayerStore();

  // Start a level by number
  const loadLevel = useCallback((levelNumber: number) => {
    const config = getLevel(levelNumber);
    startLevel(config);
    updateStreak();
  }, [startLevel, updateStreak]);

  // Handle level completion
  useEffect(() => {
    if (gameState?.status === 'won' && levelConfig) {
      const stars = getStars();
      const coinReward = calculateCoinReward(stars);

      completeLevel(
        levelConfig.levelNumber,
        stars,
        gameState.score,
        gameState.linesCleared
      );

      if (coinReward > 0) {
        addCoins(coinReward);
      }
    }
  }, [gameState?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    gameState,
    levelConfig,
    selectedPieceIndex,
    stars: getStars(),

    // Actions
    loadLevel,
    selectPiece,
    placePiece,
    rotatePiece,
    swapPieces,
    applyPowerUp,
    pauseGame,
    resumeGame,
    resetLevel,
  };
}
