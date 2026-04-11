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
import { getWeeklyChallengeConfig, getCurrentWeekId, WEEKLY_COIN_REWARDS, WEEKLY_GEM_BONUS } from '../game/challenges/WeeklyChallenge';
import { calculateSRChange } from '../game/systems/SkillRating';

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

  const { completeLevel, addCoins, addGems, updateStreak, checkAchievements, recordGamePlayed, recordZenGame, recordFailure, resetFailures, addPiggyBankCoins, addBattlePassXP, completeWeeklyChallenge, incrementGamesPlayedToday, updateQuestProgress, updateSkillRating, skillRating } = usePlayerStore();

  // Start a level by number (negative = weekly challenge)
  const loadLevel = useCallback((levelNumber: number) => {
    if (levelNumber === -1) {
      const config = getWeeklyChallengeConfig();
      startLevel(config);
    } else {
      const config = getLevel(levelNumber);
      startLevel(config);
    }
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
    const isWeekly = levelConfig.levelNumber === -1;

    if (gameState.status === 'won') {
      const stars = getStars();
      const coinMult = getCoinMultiplier();
      const xpMult = getXPMultiplier();

      if (isWeekly) {
        // Weekly challenge completion
        const weekId = getCurrentWeekId();
        completeWeeklyChallenge(weekId, stars, gameState.score);
        const weeklyCoins = WEEKLY_COIN_REWARDS[stars as 1 | 2 | 3] ?? 0;
        if (weeklyCoins > 0) {
          addCoins(Math.round(weeklyCoins * coinMult));
        }
        if (stars === 3) {
          addGems(WEEKLY_GEM_BONUS);
        }
        addBattlePassXP(Math.round(75 * xpMult)); // Weekly challenge XP bonus
      } else {
        // Normal level completion
        const coinReward = calculateCoinReward(stars);
        completeLevel(
          levelConfig.levelNumber,
          stars,
          gameState.score,
          gameState.linesCleared
        );

        if (coinReward > 0) {
          const boostedCoins = Math.round(coinReward * coinMult);
          addCoins(boostedCoins);
          const piggyBonus = Math.max(1, Math.round(boostedCoins * (0.1 + stars * 0.03)));
          addPiggyBankCoins(piggyBonus);
        }

        // Battle Pass XP: 50 base + 15 per star + 5 per line cleared (with event boost)
        const bpXP = Math.round((50 + stars * 15 + Math.min(gameState.linesCleared * 5, 100)) * xpMult);
        addBattlePassXP(bpXP);
      }

      recordGamePlayed(gameState.combo ?? 0);
      incrementGamesPlayedToday();
      resetFailures();
      checkAchievements();

      // Update daily quest progress
      updateQuestProgress('score_earned', gameState.score);
      updateQuestProgress('lines_cleared', gameState.linesCleared);
      updateQuestProgress('pieces_placed', gameState.piecesPlaced);
      updateQuestProgress('stars_earned', stars);
      if (gameState.combo > 1) {
        updateQuestProgress('combos_achieved', gameState.combo - 1);
      }
      if (!isWeekly) {
        updateQuestProgress('levels_completed', 1);
      }

      // Update Skill Rating on win
      if (!isZen) {
        const srChange = calculateSRChange({
          won: true,
          level: Math.abs(levelConfig.levelNumber),
          stars,
          scorePercent: levelConfig.objective.target > 0
            ? (gameState.score / levelConfig.objective.target) * 100
            : 100,
          currentSR: skillRating,
        });
        updateSkillRating(srChange);
      }

      // Track for app rating prompt — prompt after 3-star wins
      recordCompletionForRating().catch(() => {});
      if (stars === 3 && !isWeekly) {
        setTimeout(() => {
          maybePromptRating(levelConfig.levelNumber).catch(() => {});
        }, 2000);
      }
    } else if (gameState.status === 'lost') {
      if (isZen) {
        recordZenGame(gameState.score, gameState.linesCleared, gameState.combo ?? 0);
        const zenXpMult = getXPMultiplier();
        addBattlePassXP(Math.round((20 + Math.min(gameState.linesCleared * 3, 60)) * zenXpMult));
      } else if (isWeekly) {
        // Weekly challenge loss still records score
        const weekId = getCurrentWeekId();
        completeWeeklyChallenge(weekId, 0, gameState.score);
        recordGamePlayed(gameState.combo ?? 0);
      } else {
        recordGamePlayed(gameState.combo ?? 0);
        recordFailure(levelConfig.levelNumber);
        // Update Skill Rating on loss
        const srChange = calculateSRChange({
          won: false,
          level: levelConfig.levelNumber,
          stars: 0,
          scorePercent: levelConfig.objective.target > 0
            ? (gameState.score / levelConfig.objective.target) * 100
            : 0,
          currentSR: skillRating,
        });
        updateSkillRating(srChange);
      }
      incrementGamesPlayedToday();
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
