/**
 * Regression coverage for the stat-counter + world-completion findings
 * from the rigorous multi-audit pass:
 *
 *   #1  Daily-puzzle WIN double-counted totalGamesPlayed. The fix gates
 *       the shared recordGamePlayed to !isDaily (recordDailyPuzzleResult
 *       already counts the play). These tests lock the CONTRACT the fix
 *       relies on: recordDailyPuzzleResult bumps totalGamesPlayed by
 *       exactly 1, and recordGamePlayed bumps it by exactly 1 — so the
 *       win path must call only ONE of them per daily win.
 *
 *   #2  totalPowerUpsUsed never incremented — the "Power User" achievement
 *       was unobtainable and the Stats row always read 0. usePowerUp is
 *       the single consume site and must bump the lifetime counter.
 *
 *   #5  0-star WINS of chromatic-objective levels didn't count toward a
 *       world's "cleared" status (the win condition is N chromatic clears,
 *       decoupled from score, so a legitimate win can land below the
 *       1-star cutoff). getWorldCompletionStatus now counts a level as
 *       cleared if it has a levelStars ENTRY (completeLevel writes one on
 *       every win), not if stars > 0.
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

import { usePlayerStore } from '../store/playerStore';
import { getWorldCompletionStatus } from '../game/rewards/WorldRewards';

describe('#2 totalPowerUpsUsed counter', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      totalPowerUpsUsed: 0,
      powerUps: { bomb: 3, rowClear: 2, colorClear: 1 },
    });
  });

  it('starts at 0', () => {
    expect(usePlayerStore.getState().totalPowerUpsUsed).toBe(0);
  });

  it('increments on each successful usePowerUp', () => {
    const use = usePlayerStore.getState().usePowerUp;
    expect(use('bomb')).toBe(true);
    expect(usePlayerStore.getState().totalPowerUpsUsed).toBe(1);
    expect(use('rowClear')).toBe(true);
    expect(use('colorClear')).toBe(true);
    expect(usePlayerStore.getState().totalPowerUpsUsed).toBe(3);
  });

  it('does NOT increment when the inventory is empty (no-op use)', () => {
    usePlayerStore.setState({ powerUps: { bomb: 0, rowClear: 0, colorClear: 0 } });
    expect(usePlayerStore.getState().usePowerUp('bomb')).toBe(false);
    expect(usePlayerStore.getState().totalPowerUpsUsed).toBe(0);
  });

  it('decrements the matching inventory slot in the same write', () => {
    usePlayerStore.getState().usePowerUp('bomb');
    expect(usePlayerStore.getState().powerUps.bomb).toBe(2);
    expect(usePlayerStore.getState().powerUps.rowClear).toBe(2); // untouched
  });

  it('makes the first_powerup achievement obtainable', () => {
    usePlayerStore.getState().usePowerUp('bomb');
    const ach = usePlayerStore.getState();
    // The achievement check is `s.totalPowerUpsUsed >= 1`.
    expect(ach.totalPowerUpsUsed >= 1).toBe(true);
  });
});

describe('#1 daily-count contract — single increment per counter call', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      totalGamesPlayed: 0,
      dailyPuzzleLastPlayedId: null,
      dailyPuzzleBestScore: 0,
      dailyPuzzleStreak: 0,
      dailyPuzzlePlayCount: 0,
      bestCombo: 0,
    });
  });

  it('recordGamePlayed bumps totalGamesPlayed by exactly 1', () => {
    usePlayerStore.getState().recordGamePlayed(0);
    expect(usePlayerStore.getState().totalGamesPlayed).toBe(1);
  });

  it('recordDailyPuzzleResult bumps totalGamesPlayed by exactly 1 on first play', () => {
    usePlayerStore.getState().recordDailyPuzzleResult('2026-06-02', 500, 2);
    expect(usePlayerStore.getState().totalGamesPlayed).toBe(1);
  });

  it('a daily win that calls BOTH would double — proving the win path must call only one', () => {
    // This is the bug shape: calling both counters for a single daily win
    // lands totalGamesPlayed at 2 for one play. The win-path fix gates
    // recordGamePlayed to !isDaily so only recordDailyPuzzleResult runs.
    usePlayerStore.getState().recordDailyPuzzleResult('2026-06-02', 500, 2);
    usePlayerStore.getState().recordGamePlayed(0);
    expect(usePlayerStore.getState().totalGamesPlayed).toBe(2); // the WRONG total the gate prevents
  });
});

describe('#5 world cleared counts 0-star wins', () => {
  it('counts a level with a 0-star entry as cleared', () => {
    // World 1 = levels 1..50. Give every level a 1-star entry EXCEPT
    // level 30 (a chromatic boss) which was won at 0 stars.
    const levelStars: Record<number, number> = {};
    for (let lvl = 1; lvl <= 50; lvl++) levelStars[lvl] = lvl === 30 ? 0 : 1;

    const status = getWorldCompletionStatus(1, levelStars);
    expect(status.levelsCleared).toBe(50);
    expect(status.cleared).toBe(true); // previously false — the 0-star level was excluded
  });

  it('does NOT count a level with no entry (never won) as cleared', () => {
    const levelStars: Record<number, number> = {};
    for (let lvl = 1; lvl <= 49; lvl++) levelStars[lvl] = 1; // level 50 missing
    const status = getWorldCompletionStatus(1, levelStars);
    expect(status.levelsCleared).toBe(49);
    expect(status.cleared).toBe(false);
  });

  it('perfected still requires a true 3-star on every level', () => {
    const levelStars: Record<number, number> = {};
    for (let lvl = 1; lvl <= 50; lvl++) levelStars[lvl] = lvl === 30 ? 0 : 3;
    const status = getWorldCompletionStatus(1, levelStars);
    expect(status.cleared).toBe(true);       // all won
    expect(status.perfected).toBe(false);    // level 30 is only 0-star
    expect(status.levelsPerfected).toBe(49);
  });
});
