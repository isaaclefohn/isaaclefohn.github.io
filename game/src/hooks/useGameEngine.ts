/**
 * Hook that orchestrates the game loop.
 * Connects the game store to the UI, handles level completion and rewards.
 */

import { useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { getLevel, getEndlessConfig } from '../game/levels/LevelGenerator';
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
    undoLastMove,
    canUndo,
  } = useGameStore();

  const { completeLevel, addCoins, updateStreak, checkAchievements, recordGamePlayed } = usePlayerStore();

  // Start a level by number
  const loadLevel = useCallback((levelNumber: number) => {
    const config = getLevel(levelNumber);
    startLevel(config);
    updateStreak();
  }, [startLevel, updateStreak]);

  // Start endless/zen mode
  const loadEndless = useCallback(() => {
    const config = getEndlessConfig();
    startLevel(config);
    updateStreak();
  }, [startLevel, updateStreak]);

  // Handle level completion and game over
  useEffect(() => {
    if (!gameState || !levelConfig) return;

    if (gameState.status === 'won') {
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

      recordGamePlayed(gameState.combo ?? 0);
      checkAchievements();
    } else if (gameState.status === 'lost') {
      recordGamePlayed(gameState.combo ?? 0);
      checkAchievements();
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
    loadEndless,
    selectPiece,
    placePiece,
    rotatePiece,
    swapPieces,
    applyPowerUp,
    pauseGame,
    resumeGame,
    resetLevel,
    undoLastMove,
    canUndo,
  };
}
