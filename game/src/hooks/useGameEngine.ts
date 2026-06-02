/**
 * Hook that orchestrates the game loop.
 * Connects the game store to the UI, handles level completion and rewards.
 */

import { useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { getLevel, getEndlessConfig } from '../game/levels/LevelGenerator';
import { getWaveForPieces } from '../game/levels/EndlessWaves';
import { calculateCoinReward } from '../game/engine/Scoring';
import { getScoreMultiplier, getXPMultiplier, getCoinMultiplier } from '../game/events/LiveEvents';
import {
  maybePromptForChapterOneBoss,
  maybePromptForPerfectCascade,
} from '../services/appRating';
import { getWeeklyChallengeConfig, getCurrentWeekId, WEEKLY_COIN_REWARDS, WEEKLY_GEM_BONUS } from '../game/challenges/WeeklyChallenge';
import { getDailyPuzzleConfig, getDailyPuzzleId, DAILY_PUZZLE_LEVEL_NUMBER, DAILY_COIN_REWARDS, DAILY_GEM_REWARD_3_STAR } from '../game/challenges/DailyPuzzle';
import { calculateSRChange } from '../game/systems/SkillRating';
import { calculateReplayReward } from '../game/rewards/ReplayRewards';
import { getActiveEvent, getEventInstanceId } from '../game/events/SeasonalEvent';
import { trackGameEvent } from '../services/analytics';

export function useGameEngine() {
  const {
    gameState,
    levelConfig,
    selectedPieceIndex,
    heldPiece,
    startLevel,
    selectPiece,
    placePiece,
    rotatePiece,
    swapPieces,
    holdPiece,
    retrieveHeldPiece,
    peekNextPieces,
    applyPowerUp,
    pauseGame,
    resumeGame,
    resetLevel,
    getStars,
    undoLastMove,
    canUndo,
    continueGame,
  } = useGameStore();

  const { completeLevel, addCoins, addGems, updateStreak, checkAchievements, recordGamePlayed, recordZenGame, recordBestWave, recordDailyPuzzleResult, recordFailure, resetFailures, addPiggyBankCoins, addBattlePassXP, completeWeeklyChallenge, incrementGamesPlayedToday, updateQuestProgress, updateSkillRating, skillRating, levelHighScores, levelStars, addTreasureMapPiece, addSeasonalPoints, addBlockMasteryXP } = usePlayerStore();

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

  // Start today's daily puzzle — shared seed, one-shot per day.
  const loadDailyPuzzle = useCallback(() => {
    const config = getDailyPuzzleConfig();
    startLevel(config);
    updateStreak();
  }, [startLevel, updateStreak]);

  // Handle level completion and game over
  useEffect(() => {
    if (!gameState || !levelConfig) return;

    const isZen = levelConfig.levelNumber === 0;
    const isWeekly = levelConfig.levelNumber === -1;
    const isDaily = levelConfig.levelNumber === DAILY_PUZZLE_LEVEL_NUMBER;

    if (gameState.status === 'won') {
      const stars = getStars();
      trackGameEvent({ type: 'level_complete', level: levelConfig.levelNumber, score: gameState.score, stars });
      const coinMult = getCoinMultiplier();
      const xpMult = getXPMultiplier();

      if (isWeekly) {
        // Weekly challenge completion
        const weekId = getCurrentWeekId();
        completeWeeklyChallenge(weekId, stars, gameState.score);
        const weeklyCoins = WEEKLY_COIN_REWARDS[stars as 1 | 2 | 3] ?? 0;
        if (weeklyCoins > 0) {
          addCoins(Math.round(weeklyCoins * coinMult), { boostable: true });
        }
        if (stars === 3) {
          addGems(WEEKLY_GEM_BONUS);
        }
        addBattlePassXP(Math.round(75 * xpMult), { boostable: true }); // Weekly challenge XP bonus
      } else if (isDaily) {
        // Daily puzzle completion — 3-star target reached (rare).
        // `recordDailyPuzzleResult` already does +1 totalGamesPlayed, so the
        // shared `recordGamePlayed` below is gated to !isDaily — otherwise a
        // daily WIN double-counted lifetime games (the daily LOSS branch was
        // fixed for the same reason; the win branch was missed). We still
        // fold the run's best combo in manually so daily-only players see
        // combo records.
        const puzzleId = getDailyPuzzleId();
        const result = recordDailyPuzzleResult(puzzleId, gameState.score, stars);
        if (result.isFirstCompletion) {
          const reward = DAILY_COIN_REWARDS[stars as 0 | 1 | 2 | 3] ?? 0;
          if (reward > 0) addCoins(Math.round(reward * coinMult), { boostable: true });
          if (stars === 3) addGems(DAILY_GEM_REWARD_3_STAR);
          addBattlePassXP(Math.round((40 + stars * 20) * xpMult), { boostable: true });
        }
        const combo = gameState.maxComboThisRun ?? 0;
        if (combo > 0) {
          usePlayerStore.setState((s) => ({ bestCombo: Math.max(s.bestCombo, combo) }));
        }
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
          addCoins(boostedCoins, { boostable: true });
          const piggyBonus = Math.max(1, Math.round(boostedCoins * (0.1 + stars * 0.03)));
          addPiggyBankCoins(piggyBonus);
        }

        // Battle Pass XP: 50 base + 15 per star + 5 per line cleared (with event boost)
        const bpXP = Math.round((50 + stars * 15 + Math.min(gameState.linesCleared * 5, 100)) * xpMult);
        addBattlePassXP(bpXP, { boostable: true });

        // Replay reward — bonus coins for improving on a previously completed level
        const prevBest = levelHighScores[levelConfig.levelNumber] ?? 0;
        const prevStars = levelStars[levelConfig.levelNumber] ?? 0;
        if (prevBest > 0) {
          const replayReward = calculateReplayReward({
            newScore: gameState.score,
            previousBestScore: prevBest,
            newStars: stars,
            previousBestStars: prevStars,
            threeStarThreshold: levelConfig.starThresholds?.[2] ?? 0,
          });
          if (replayReward) {
            addCoins(replayReward.coins, { boostable: true });
          }
        }
      }

      // Skip for daily — recordDailyPuzzleResult already counted this play
      // (and the daily branch folded in bestCombo). Calling recordGamePlayed
      // too would double-count the daily win in lifetime games.
      if (!isDaily) recordGamePlayed(gameState.maxComboThisRun ?? 0);
      incrementGamesPlayedToday();
      resetFailures();
      checkAchievements();

      // Treasure hunt: chance to earn a map piece on level clear (40% with 3 stars, 20% otherwise)
      if (!isZen && !isDaily) {
        const rand = Math.random();
        const threshold = stars >= 3 ? 0.4 : 0.2;
        if (rand < threshold) {
          addTreasureMapPiece();
        }
      }

      // Seasonal event points: earned per line + per level completion
      const activeSeasonalEvent = getActiveEvent();
      if (activeSeasonalEvent && !isZen) {
        const seasonalPoints =
          gameState.linesCleared * activeSeasonalEvent.pointsPerLine +
          activeSeasonalEvent.pointsPerLevel;
        addSeasonalPoints(getEventInstanceId(activeSeasonalEvent), seasonalPoints);
      }

      // Block mastery XP: distribute XP across all colors based on lines cleared
      // (simple fair distribution — more accurate per-color tracking could be added later)
      const masteryXP = Math.max(2, gameState.linesCleared * 3 + stars * 4);
      const masteryColors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const;
      for (const color of masteryColors) {
        addBlockMasteryXP(color, masteryXP);
      }

      // Update daily quest progress
      updateQuestProgress('score_earned', gameState.score);
      updateQuestProgress('lines_cleared', gameState.linesCleared);
      updateQuestProgress('pieces_placed', gameState.piecesPlaced);
      updateQuestProgress('stars_earned', stars);
      if (gameState.combo > 1) {
        updateQuestProgress('combos_achieved', gameState.combo - 1);
      }
      if (!isWeekly && !isDaily) {
        updateQuestProgress('levels_completed', 1);
      }

      // Update Skill Rating on win
      if (!isZen && !isDaily) {
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

      // Rating prompt triggers — per the 2026-06 growth plan. Two
      // separate slots can fire here, both gated to non-daily /
      // non-weekly campaign wins:
      //
      //   Slot 1 (chapter_one_boss) fires after the Chapter 1 boss
      //   at level 30 — the highest local satisfaction peak in the
      //   early campaign per the FTUE arc.
      //
      //   Slot 3 (perfect_cascade) fires after a 3-star win at L≥50
      //   with at least one chromatic clear — reserves the late-funnel
      //   slot for a brand-signature "wow" moment.
      //
      // Both maybePromptForX functions internally re-check the slot
      // gate, the 30-day cooldown, and the 3-prompt cap. They are
      // safe to call from both branches.
      if (!isWeekly && !isDaily) {
        if (levelConfig.levelNumber === 30) {
          setTimeout(() => {
            // crashFreeSession is true if Sentry didn't surface a
            // crash this session. We don't expose that flag directly
            // — assume true here since the player got far enough to
            // win a boss level.
            maybePromptForChapterOneBoss({ crashFreeSession: true }).catch(() => {});
          }, 2000);
        }
        if (stars === 3 && levelConfig.levelNumber >= 50) {
          setTimeout(() => {
            maybePromptForPerfectCascade({
              level: levelConfig.levelNumber,
              stars,
              chromaticClears: gameState.chromaticClears,
            }).catch(() => {});
          }, 2000);
        }
      }
    } else if (gameState.status === 'lost') {
      trackGameEvent({ type: 'level_fail', level: levelConfig.levelNumber, score: gameState.score });
      if (isZen) {
        // Use maxComboThisRun (per-run peak) not the live combo —
        // the live counter is almost always 0 at game-over because
        // game-over fires on a no-clear placement that reset the
        // chain. Pre-this-fix, lifetime bestCombo almost never
        // updated even when the player landed FEVER or GODLIKE
        // chains mid-run.
        recordZenGame(gameState.score, gameState.linesCleared, gameState.maxComboThisRun ?? 0);
        // Record lifetime best wave reached. Computed from the final
        // pieces-placed count using the wave system's own boundary
        // math, so this is the only place that needs to know about
        // wave progression — playerStore stays palette-agnostic.
        recordBestWave(getWaveForPieces(gameState.piecesPlaced).wave);
        const zenXpMult = getXPMultiplier();
        addBattlePassXP(Math.round((20 + Math.min(gameState.linesCleared * 3, 60)) * zenXpMult), { boostable: true });
      } else if (isWeekly) {
        // Weekly challenge loss still records score
        const weekId = getCurrentWeekId();
        completeWeeklyChallenge(weekId, 0, gameState.score);
        recordGamePlayed(gameState.maxComboThisRun ?? 0);
      } else if (isDaily) {
        // Daily puzzle "loss" = run ended (stuck). We still lock in the
        // score, award participation coins, and advance the streak.
        // `recordDailyPuzzleResult` already increments totalGamesPlayed
        // internally; we used to ALSO call `recordGamePlayed` here, which
        // double-counted every daily play in the lifetime stats and
        // inflated achievement progress (clear_500 etc.). Now we trust
        // `recordDailyPuzzleResult` for the +1, and only update bestCombo
        // separately so daily-only players still see combo records.
        const puzzleId = getDailyPuzzleId();
        const stars = getStars();
        const result = recordDailyPuzzleResult(puzzleId, gameState.score, stars);
        if (result.isFirstCompletion) {
          const coinMult = getCoinMultiplier();
          const reward = DAILY_COIN_REWARDS[stars as 0 | 1 | 2 | 3] ?? 0;
          if (reward > 0) addCoins(Math.round(reward * coinMult), { boostable: true });
          if (stars === 3) addGems(DAILY_GEM_REWARD_3_STAR);
          const xpMult = getXPMultiplier();
          addBattlePassXP(Math.round((30 + stars * 15) * xpMult), { boostable: true });
        }
        // Pick up best-combo from this run without re-incrementing games.
        const combo = gameState.maxComboThisRun ?? 0;
        if (combo > 0) {
          usePlayerStore.setState((s) => ({ bestCombo: Math.max(s.bestCombo, combo) }));
        }
      } else {
        recordGamePlayed(gameState.maxComboThisRun ?? 0);
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
    heldPiece,
    stars: getStars(),

    // Actions
    loadLevel,
    loadEndless,
    loadDailyPuzzle,
    selectPiece,
    placePiece,
    rotatePiece,
    swapPieces,
    holdPiece,
    retrieveHeldPiece,
    peekNextPieces,
    applyPowerUp,
    pauseGame,
    resumeGame,
    resetLevel,
    undoLastMove,
    canUndo,
    continueGame,
  };
}
