/**
 * Hook that orchestrates the game loop.
 * Connects the game store to the UI, handles level completion and rewards.
 */

import { useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { getLevel, getEndlessConfig } from '../game/levels/LevelGenerator';
import { calculateCoinReward } from '../game/engine/Scoring';
import { getScoreMultiplier, getXPMultiplier, getCoinMultiplier } from '../game/events/LiveEvents';
import { recordCompletionForRating, maybePromptRating } from '../services/appRating';

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
    continueGame,
  } = useGameStore();

  const { completeLevel, addCoins, updateStreak, checkAchievements, recordGamePlayed, recordZenGame, recordFailure, resetFailures, addPiggyBankCoins, addBattlePassXP } = usePlayerStore();

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

    const isZen = levelConfig.levelNumber === 0;

    if (gameState.status === 'won') {
      const stars = getStars();
      const coinReward = calculateCoinReward(stars);

      completeLevel(
        levelConfig.levelNumber,
        stars,
        gameState.score,
        gameState.linesCleared
      );

      // Apply live event multipliers
      const coinMult = getCoinMultiplier();
      const xpMult = getXPMultiplier();

      if (coinReward > 0) {
        const boostedCoins = Math.round(coinReward * coinMult);
        addCoins(boostedCoins);
        // Piggy bank gets 10-20% of coin reward as bonus savings
        const piggyBonus = Math.max(1, Math.round(boostedCoins * (0.1 + stars * 0.03)));
        addPiggyBankCoins(piggyBonus);
      }

      recordGamePlayed(gameState.combo ?? 0);
      resetFailures();

      // Battle Pass XP: 50 base + 15 per star + 5 per line cleared (with event boost)
      const bpXP = Math.round((50 + stars * 15 + Math.min(gameState.linesCleared * 5, 100)) * xpMult);
      addBattlePassXP(bpXP);

      checkAchievements();

      // Track for app rating prompt — prompt after 3-star wins
      recordCompletionForRating().catch(() => {});
      if (stars === 3) {
        setTimeout(() => {
          maybePromptRating(levelConfig.levelNumber).catch(() => {});
        }, 2000);
      }
    } else if (gameState.status === 'lost') {
      if (isZen) {
        recordZenGame(gameState.score, gameState.linesCleared, gameState.combo ?? 0);
        // Zen mode XP: 20 base + lines bonus (with event boost)
        const zenXpMult = getXPMultiplier();
        addBattlePassXP(Math.round((20 + Math.min(gameState.linesCleared * 3, 60)) * zenXpMult));
      } else {
        recordGamePlayed(gameState.combo ?? 0);
        recordFailure(levelConfig.levelNumber);
      }
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
    continueGame,
  };
}
