/**
 * End-of-run accounting for a LOST game.
 *
 * Extracted out of `useGameEngine`'s game-over effect so the once-per-run
 * invariant is unit-testable without rendering a React hook (the test suite
 * runs in a plain node/ts-jest environment with no hook-testing harness).
 *
 * THE BUG THIS GUARDS AGAINST
 * ---------------------------
 * The game-over effect is keyed on `gameState.status`. A paid Continue takes
 * status `lost -> playing -> lost` on the SAME run, so the effect re-enters
 * the lost branch a second time. Before this split, that double-applied the
 * run's accounting: +2 games played, a doubled skill-rating penalty, a doubled
 * failure count, and (in modes that grant it) doubled XP.
 *
 * THE FIX
 * -------
 * Accounting splits into two classes:
 *
 *   1. Idempotent "run-bests" (Math.max stats) + achievement checks. These
 *      fire on EVERY loss. Re-firing is harmless (max is monotonic) and is in
 *      fact REQUIRED for correctness: after a Continue the player may reach a
 *      higher wave / score / combo, and that higher final peak only lands
 *      because these re-run on the second loss.
 *
 *   2. Non-idempotent accounting (`+1` counters, the SR penalty, failure
 *      count, XP). These must net to exactly ONCE per run, so they are gated
 *      on `gameStore.lastAccountedRunId === gameState.runId`. The first loss
 *      finalizes the run (and stamps the runId); the post-continue loss finds
 *      the gate closed and skips them.
 *
 * Why first-loss stats are the right stats for the gated half:
 *   - Counters (`+1`) and `recordFailure` are stats-independent — the level
 *     number and "this run happened" don't change after a Continue.
 *   - The SR loss penalty (`calculateSRChange`) only varies with `scorePercent`
 *     across a 70% threshold, but the Continue button is only offered at
 *     >= 70% of target, so `closeBonus` is already saturated at the first loss
 *     — first-loss and final-loss penalties are identical.
 *   - XP-on-loss exists only in zen/daily, neither of which can Continue today,
 *     so the gate is purely future-proofing there.
 */

import type { GameState, LevelConfig } from '../engine/GameLoop';
import { getCurrentStars } from '../engine/GameLoop';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { getWaveForPieces } from '../levels/EndlessWaves';
import { calculateSRChange } from './SkillRating';
import { getXPMultiplier, getCoinMultiplier } from '../events/LiveEvents';
import { getCurrentWeekId } from '../challenges/WeeklyChallenge';
import {
  getDailyPuzzleId,
  DAILY_PUZZLE_LEVEL_NUMBER,
  DAILY_COIN_REWARDS,
  DAILY_GEM_REWARD_3_STAR,
} from '../challenges/DailyPuzzle';

/**
 * Apply all stats/economy effects of a lost run. Safe to call on every
 * game-over transition (including a post-continue re-loss): the idempotent
 * half re-runs to capture the final peak, the non-idempotent half is gated to
 * once per `runId`.
 *
 * Reads live store state via `getState()` rather than closures so it always
 * sees the latest values (matching the pattern the win path already uses).
 */
export function applyLoseAccounting(gameState: GameState, levelConfig: LevelConfig): void {
  const player = usePlayerStore.getState();
  const game = useGameStore.getState();

  const isZen = levelConfig.levelNumber === 0;
  const isWeekly = levelConfig.levelNumber === -1;
  const isDaily = levelConfig.levelNumber === DAILY_PUZZLE_LEVEL_NUMBER;
  const maxCombo = gameState.maxComboThisRun ?? 0;

  // --- (1) Idempotent run-bests + achievement check: EVERY loss. ---
  // Math.max means a post-continue re-loss correctly records the higher final
  // wave/score/combo, and the game-over modal (which reads these from the
  // store) sees fresh values. `checkAchievements` is idempotent via its
  // unlocked-set guard.
  if (isZen) {
    player.recordRunBests({ combo: maxCombo, zenScore: gameState.score, zenLines: gameState.linesCleared });
    player.recordBestWave(getWaveForPieces(gameState.piecesPlaced).wave);
  } else {
    player.recordRunBests({ combo: maxCombo });
  }
  player.checkAchievements();

  // --- (2) Non-idempotent accounting: ONCE per run. ---
  // continueGame() preserves runId across lost->playing->lost, so once the
  // first loss stamps this runId the second loss short-circuits here.
  if (game.lastAccountedRunId === gameState.runId) return;
  game.markRunAccounted(gameState.runId);

  if (isZen) {
    // recordZenGame bumps the +1 counters (zenGamesPlayed, totalGamesPlayed);
    // its Math.max fields overlap harmlessly with recordRunBests above.
    player.recordZenGame(gameState.score, gameState.linesCleared, maxCombo);
    const zenXpMult = getXPMultiplier();
    player.addBattlePassXP(Math.round((20 + Math.min(gameState.linesCleared * 3, 60)) * zenXpMult), { boostable: true });
  } else if (isWeekly) {
    const weekId = getCurrentWeekId();
    player.completeWeeklyChallenge(weekId, 0, gameState.score);
    player.recordGamePlayed(maxCombo);
  } else if (isDaily) {
    // Daily "loss" = run ended. recordDailyPuzzleResult is itself idempotent
    // per puzzle (isFirstCompletion), and now also runId-gated so a Continue
    // path could never re-count the daily play.
    const puzzleId = getDailyPuzzleId();
    const stars = getCurrentStars(gameState);
    const result = player.recordDailyPuzzleResult(puzzleId, gameState.score, stars);
    if (result.isFirstCompletion) {
      const coinMult = getCoinMultiplier();
      const reward = DAILY_COIN_REWARDS[stars as 0 | 1 | 2 | 3] ?? 0;
      if (reward > 0) player.addCoins(Math.round(reward * coinMult), { boostable: true });
      if (stars === 3) player.addGems(DAILY_GEM_REWARD_3_STAR);
      const xpMult = getXPMultiplier();
      player.addBattlePassXP(Math.round((30 + stars * 15) * xpMult), { boostable: true });
    }
    // bestCombo for daily is covered by recordRunBests({ combo }) above.
  } else {
    // Normal level loss.
    player.recordGamePlayed(maxCombo);
    player.recordFailure(levelConfig.levelNumber);
    const srChange = calculateSRChange({
      won: false,
      level: levelConfig.levelNumber,
      stars: 0,
      scorePercent: levelConfig.objective.target > 0
        ? (gameState.score / levelConfig.objective.target) * 100
        : 0,
      currentSR: player.skillRating,
    });
    player.updateSkillRating(srChange);
  }

  player.incrementGamesPlayedToday();
}
