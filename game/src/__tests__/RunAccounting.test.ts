/**
 * Regression coverage for the Continue double-count finding.
 *
 * The game-over handler is keyed on gameState.status. A paid Continue takes
 * status lost -> playing -> lost on the SAME run, re-entering the lost branch.
 * Before the fix this double-applied the run's accounting: +2 games played, a
 * doubled skill-rating penalty, a doubled failure count, doubled XP.
 *
 * The fix (RunAccounting.applyLoseAccounting) splits accounting in two:
 *   - idempotent run-bests (Math.max) re-run on EVERY loss, so the higher
 *     post-continue peak is the value that lands;
 *   - non-idempotent counters / SR penalty / failure / XP are gated to once
 *     per runId, so the second game-over of the same run does not re-count.
 *
 * These tests reproduce the exact lose -> Continue -> lose-again sequence and
 * lock the CORRECT behavior: the run is counted once, with its final stats.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    getAllKeys: () => Promise.resolve([] as string[]),
    multiGet: () => Promise.resolve([]),
    multiSet: () => Promise.resolve(),
    multiRemove: () => Promise.resolve(),
  },
}));

// RunAccounting imports gameStore, which imports services/analytics (expo-
// constants, ESM-only and unparseable under ts-jest/node). Stub it — same
// reason GameStore.test.ts does.
jest.mock('../services/analytics', () => ({
  trackGameEvent: () => {},
  track: () => {},
  initSentry: () => {},
  initAnalytics: () => {},
}));

import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { applyLoseAccounting, applyWinGamesPlayed } from '../game/systems/RunAccounting';
import { getLevel, getEndlessConfig } from '../game/levels/LevelGenerator';
import { getWaveForPieces } from '../game/levels/EndlessWaves';
import type { GameState, LevelConfig } from '../game/engine/GameLoop';

const gs = () => useGameStore.getState();
const ps = () => usePlayerStore.getState();

/** A normal campaign level with a 1000-point target so a ~80% score sits in
 *  the >=70% band the Continue button requires (and where the SR closeBonus
 *  is saturated, making first-loss and final-loss penalties identical). */
const campaignConfig = (): LevelConfig => ({
  ...getLevel(6),
  objective: { type: 'score', target: 1000 },
  paletteSize: 4,
  seed: 12345,
});

/** Force the live run into a lost state with the given run-stats, preserving
 *  runId (the spread keeps it). Mirrors what a real game-over does. */
const forceLost = (stats: Partial<GameState>) => {
  useGameStore.setState({ gameState: { ...gs().gameState!, status: 'lost', ...stats } });
};

describe('applyLoseAccounting — non-idempotent accounting fires once per run', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      totalGamesPlayed: 0,
      gamesPlayedToday: 0,
      gamesPlayedDate: '',
      skillRating: 500,
      bestCombo: 0,
      consecutiveFailures: 0,
      lastFailedLevel: 0,
      unlockedAchievements: [],
    });
    gs().startLevel(campaignConfig());
  });

  it('a single loss applies the run accounting exactly once', () => {
    forceLost({ score: 800, maxComboThisRun: 4 });
    applyLoseAccounting(gs().gameState!, gs().levelConfig!);

    expect(ps().totalGamesPlayed).toBe(1);
    expect(ps().gamesPlayedToday).toBe(1);
    expect(ps().consecutiveFailures).toBe(1);
    expect(ps().bestCombo).toBe(4);
    expect(ps().skillRating).toBeLessThan(500); // a loss penalty landed
  });

  it('re-firing on the SAME lost run (effect re-run) does not double-count', () => {
    forceLost({ score: 800, maxComboThisRun: 4 });
    applyLoseAccounting(gs().gameState!, gs().levelConfig!);
    const snap = {
      games: ps().totalGamesPlayed,
      today: ps().gamesPlayedToday,
      fails: ps().consecutiveFailures,
      sr: ps().skillRating,
    };

    applyLoseAccounting(gs().gameState!, gs().levelConfig!); // status effect re-fires

    expect(ps().totalGamesPlayed).toBe(snap.games); // still 1
    expect(ps().gamesPlayedToday).toBe(snap.today); // still 1
    expect(ps().consecutiveFailures).toBe(snap.fails); // still 1
    expect(ps().skillRating).toBe(snap.sr); // no second penalty
  });

  it('Continue then a SECOND loss: counts the run once, records the FINAL peak combo', () => {
    // First loss at peak combo 3.
    forceLost({ score: 800, maxComboThisRun: 3 });
    applyLoseAccounting(gs().gameState!, gs().levelConfig!);
    expect(ps().totalGamesPlayed).toBe(1);
    expect(ps().bestCombo).toBe(3);
    const srAfterFirst = ps().skillRating;
    expect(srAfterFirst).toBeLessThan(500);

    // Pay to Continue — real store action. Preserves runId, status -> playing.
    expect(gs().continueGame()).toBe(true);
    expect(gs().gameState!.status).toBe('playing');

    // Player does better on the extended run, then loses again at combo 7.
    forceLost({ score: 950, maxComboThisRun: 7 });
    applyLoseAccounting(gs().gameState!, gs().levelConfig!);

    // Non-idempotent accounting is NOT doubled by the second game-over.
    expect(ps().totalGamesPlayed).toBe(1); // the bug produced 2
    expect(ps().gamesPlayedToday).toBe(1); // the bug produced 2
    expect(ps().consecutiveFailures).toBe(1); // the bug produced 2
    expect(ps().skillRating).toBe(srAfterFirst); // the bug applied the penalty twice

    // Idempotent best DID advance to the higher post-continue peak — naively
    // "skipping the second firing" would have frozen this at 3.
    expect(ps().bestCombo).toBe(7);
  });

  it('zen Continue-style re-loss: counts once but captures the higher final score/wave', () => {
    gs().startLevel(getEndlessConfig());
    usePlayerStore.setState({
      zenGamesPlayed: 0,
      totalGamesPlayed: 0,
      zenHighScore: 0,
      zenBestLinesCleared: 0,
      bestWaveReached: 0,
      bestCombo: 0,
    });

    // First zen loss: modest score, early wave.
    forceLost({ score: 1000, linesCleared: 5, maxComboThisRun: 2, piecesPlaced: 30 });
    applyLoseAccounting(gs().gameState!, gs().levelConfig!);
    expect(ps().zenGamesPlayed).toBe(1);
    expect(ps().totalGamesPlayed).toBe(1);

    // Re-enter the same run (runId preserved) at a higher score / later wave.
    forceLost({ score: 5000, linesCleared: 20, maxComboThisRun: 6, piecesPlaced: 120 });
    applyLoseAccounting(gs().gameState!, gs().levelConfig!);

    expect(ps().zenGamesPlayed).toBe(1); // counted once, not twice
    expect(ps().totalGamesPlayed).toBe(1);
    expect(ps().zenHighScore).toBe(5000); // final peak score
    expect(ps().zenBestLinesCleared).toBe(20);
    expect(ps().bestCombo).toBe(6);
    expect(ps().bestWaveReached).toBe(getWaveForPieces(120).wave); // later wave landed
  });
});

describe('applyWinGamesPlayed — a WON run counts once, even across Continue', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      totalGamesPlayed: 0,
      gamesPlayedToday: 0,
      gamesPlayedDate: '',
      bestCombo: 0,
    });
    gs().startLevel(campaignConfig());
  });

  it('a fresh win counts the run once and folds the run combo', () => {
    useGameStore.setState({ gameState: { ...gs().gameState!, status: 'won', maxComboThisRun: 4 } });
    applyWinGamesPlayed(gs().gameState!, false);
    expect(ps().totalGamesPlayed).toBe(1);
    expect(ps().gamesPlayedToday).toBe(1);
    expect(ps().bestCombo).toBe(4);
  });

  it('re-firing on the same won run (status effect re-run) does not double-count', () => {
    useGameStore.setState({ gameState: { ...gs().gameState!, status: 'won', maxComboThisRun: 4 } });
    applyWinGamesPlayed(gs().gameState!, false);
    applyWinGamesPlayed(gs().gameState!, false);
    expect(ps().totalGamesPlayed).toBe(1);
    expect(ps().gamesPlayedToday).toBe(1);
  });

  it('lose -> Continue -> WIN counts the run ONCE (the bug) and records the FINAL combo', () => {
    // First loss at combo 3 accounts the run + stamps its runId.
    useGameStore.setState({ gameState: { ...gs().gameState!, status: 'lost', maxComboThisRun: 3 } });
    applyLoseAccounting(gs().gameState!, gs().levelConfig!);
    expect(ps().totalGamesPlayed).toBe(1);
    expect(ps().bestCombo).toBe(3);

    // Pay to Continue (preserves runId), then recover and WIN at a higher combo.
    expect(gs().continueGame()).toBe(true);
    useGameStore.setState({ gameState: { ...gs().gameState!, status: 'won', maxComboThisRun: 7 } });
    applyWinGamesPlayed(gs().gameState!, false);

    expect(ps().totalGamesPlayed).toBe(1); // the bug produced 2
    expect(ps().gamesPlayedToday).toBe(1); // the bug produced 2
    expect(ps().bestCombo).toBe(7);        // recordRunBests still folded the final peak
  });

  it('a daily win skips the lifetime counter (recordDailyPuzzleResult owns it) but bumps daily', () => {
    useGameStore.setState({ gameState: { ...gs().gameState!, status: 'won', maxComboThisRun: 2 } });
    applyWinGamesPlayed(gs().gameState!, true); // isDaily
    expect(ps().totalGamesPlayed).toBe(0); // lifetime NOT bumped for daily
    expect(ps().gamesPlayedToday).toBe(1); // daily counter still bumps
  });
});
