/**
 * Coverage for playerStore's economy + progression actions (the store was
 * 43% covered; these target the untested currency / upgrade / claim / streak
 * paths). Locks the atomic-spend and idempotent-claim guards from earlier
 * defensive audits.
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

const ps = () => usePlayerStore.getState();

describe('playerStore currency', () => {
  beforeEach(() => {
    usePlayerStore.setState({ coins: 100, gems: 10, activeBoostUntil: {} });
  });

  it('addCoins adds (no-boost path is exact)', () => {
    ps().addCoins(50);
    expect(ps().coins).toBe(150);
    ps().addCoins(25, { boostable: true }); // no active boost => exact
    expect(ps().coins).toBe(175);
  });

  it('spendCoins succeeds when affordable and fails (without deducting) when not', () => {
    expect(ps().spendCoins(60)).toBe(true);
    expect(ps().coins).toBe(40);
    expect(ps().spendCoins(100)).toBe(false);
    expect(ps().coins).toBe(40); // untouched on failure
  });

  it('addGems / spendGems mirror the coin semantics', () => {
    ps().addGems(5);
    expect(ps().gems).toBe(15);
    expect(ps().spendGems(15)).toBe(true);
    expect(ps().gems).toBe(0);
    expect(ps().spendGems(1)).toBe(false);
    expect(ps().gems).toBe(0);
  });

  it('spendCoins allows spending the exact balance (boundary)', () => {
    expect(ps().spendCoins(100)).toBe(true);
    expect(ps().coins).toBe(0);
  });
});

describe('playerStore.addPowerUp', () => {
  beforeEach(() => usePlayerStore.setState({ powerUps: { bomb: 1, rowClear: 0, colorClear: 0 } }));

  it('adds to the matching slot only', () => {
    ps().addPowerUp('bomb', 2);
    ps().addPowerUp('colorClear', 1);
    expect(ps().powerUps).toEqual({ bomb: 3, rowClear: 0, colorClear: 1 });
  });
});

describe('playerStore.completeLevel', () => {
  beforeEach(() => usePlayerStore.setState({
    highestLevel: 5, levelStars: {}, levelHighScores: {}, totalScore: 0, totalLinesCleared: 0,
  }));

  it('records highest level, max stars/score, and accumulates totals', () => {
    ps().completeLevel(6, 2, 800, 12);
    expect(ps().highestLevel).toBe(6);
    expect(ps().levelStars[6]).toBe(2);
    expect(ps().levelHighScores[6]).toBe(800);
    expect(ps().totalScore).toBe(800);
    expect(ps().totalLinesCleared).toBe(12);
  });

  it('keeps the better stars/score on replay and never lowers highestLevel', () => {
    ps().completeLevel(6, 3, 1500, 20); // first: 3 stars
    ps().completeLevel(6, 1, 400, 5);   // replay worse
    expect(ps().levelStars[6]).toBe(3);       // kept the max
    expect(ps().levelHighScores[6]).toBe(1500);
    expect(ps().highestLevel).toBe(6);        // not lowered
    // totals still accumulate every play
    expect(ps().totalScore).toBe(1900);
    expect(ps().totalLinesCleared).toBe(25);
  });
});

describe('playerStore.purchasePowerUpUpgrade (atomic)', () => {
  beforeEach(() => usePlayerStore.setState({
    coins: 500, gems: 20, powerUpLevels: { bomb: 1, rowClear: 1, colorClear: 1 },
  }));

  it('spends coins+gems and bumps the level in one atomic write', () => {
    const ok = ps().purchasePowerUpUpgrade('bomb', 100, 5);
    expect(ok).toBe(true);
    expect(ps().coins).toBe(400);
    expect(ps().gems).toBe(15);
    expect(ps().powerUpLevels.bomb).toBe(2);
  });

  it('refuses (and spends nothing) when coins OR gems are insufficient', () => {
    expect(ps().purchasePowerUpUpgrade('bomb', 600, 5)).toBe(false); // coins short
    expect(ps().purchasePowerUpUpgrade('bomb', 100, 50)).toBe(false); // gems short
    expect(ps().coins).toBe(500);
    expect(ps().gems).toBe(20);
    expect(ps().powerUpLevels.bomb).toBe(1);
  });

  it('refuses to upgrade past level 5', () => {
    usePlayerStore.setState({ powerUpLevels: { bomb: 5, rowClear: 1, colorClear: 1 } });
    expect(ps().purchasePowerUpUpgrade('bomb', 100, 5)).toBe(false);
    expect(ps().coins).toBe(500); // nothing spent
  });
});

describe('playerStore world-claim idempotency', () => {
  beforeEach(() => usePlayerStore.setState({ claimedWorldClears: [], claimedWorldPerfects: [] }));

  it('claimWorldClear records once, no duplicates on repeat', () => {
    ps().claimWorldClear(1);
    ps().claimWorldClear(1);
    ps().claimWorldClear(2);
    expect(ps().claimedWorldClears).toEqual([1, 2]);
  });

  it('claimWorldPerfect records once, no duplicates on repeat', () => {
    ps().claimWorldPerfect(3);
    ps().claimWorldPerfect(3);
    expect(ps().claimedWorldPerfects).toEqual([3]);
  });
});

describe('playerStore.updateStreak wiring', () => {
  beforeEach(() => usePlayerStore.setState({
    lastPlayDate: null, currentStreak: 0, streakShields: 0, longestStreak: 0,
  }));

  it('first play of the day starts a streak of 1 and stamps today', () => {
    const result = ps().updateStreak();
    expect(result.newStreak).toBe(1);
    expect(ps().currentStreak).toBe(1);
    expect(ps().lastPlayDate).not.toBeNull();
    expect(ps().longestStreak).toBe(1);
  });

  it('a second call the same day is a no-op (streak unchanged)', () => {
    ps().updateStreak();           // streak -> 1, lastPlayDate -> today
    const stampedDate = ps().lastPlayDate;
    ps().updateStreak();           // same day
    expect(ps().currentStreak).toBe(1);
    expect(ps().lastPlayDate).toBe(stampedDate);
  });
});

describe('playerStore misc setters', () => {
  it('setDisplayName + setAdFree persist', () => {
    ps().setDisplayName('Isaac');
    expect(ps().displayName).toBe('Isaac');
    ps().setAdFree(true);
    expect(ps().adFree).toBe(true);
  });
});
