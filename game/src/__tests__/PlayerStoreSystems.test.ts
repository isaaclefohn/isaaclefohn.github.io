/**
 * Coverage for playerStore's systems actions (lives, quests, piggy bank,
 * IAP dedup, skill rating, weekly challenge, collection claims). Targets
 * the guard / clamp / date-reset / idempotency logic — the same classes
 * where this session's bugs lived.
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
import { getLocalToday } from '../utils/dates';

const ps = () => usePlayerStore.getState();

describe('playerStore piggy bank', () => {
  beforeEach(() => usePlayerStore.setState({ piggyBankCoins: 0, piggyBankLastBroken: null }));

  it('accumulates then breaks (returns the total and resets to 0)', () => {
    ps().addPiggyBankCoins(40);
    ps().addPiggyBankCoins(60);
    expect(ps().piggyBankCoins).toBe(100);
    const got = ps().breakPiggyBank();
    expect(got).toBe(100);
    expect(ps().piggyBankCoins).toBe(0);
    expect(ps().piggyBankLastBroken).toBe(getLocalToday());
  });
});

describe('playerStore battle pass XP', () => {
  beforeEach(() => usePlayerStore.setState({ battlePassXP: 0, activeBoostUntil: {} }));

  it('adds XP (no-boost path is exact)', () => {
    ps().addBattlePassXP(75);
    ps().addBattlePassXP(25, { boostable: true }); // no active boost => exact
    expect(ps().battlePassXP).toBe(100);
  });
});

describe('playerStore IAP transaction dedup', () => {
  beforeEach(() => usePlayerStore.setState({ creditedTransactionIds: [] }));

  it('records a txn id once; repeats are no-ops (cross-restart idempotency)', () => {
    ps().recordCreditedTransaction('txn_A');
    ps().recordCreditedTransaction('txn_A');
    ps().recordCreditedTransaction('txn_B');
    expect(ps().creditedTransactionIds).toEqual(['txn_A', 'txn_B']);
  });
});

describe('playerStore games-played-today (date reset)', () => {
  it('increments within the same day, resets to 1 on a new day', () => {
    usePlayerStore.setState({ gamesPlayedToday: 0, gamesPlayedDate: null });
    ps().incrementGamesPlayedToday(); // day rolls from null -> today, count 1
    ps().incrementGamesPlayedToday(); // same day -> 2
    expect(ps().gamesPlayedToday).toBe(2);
    expect(ps().gamesPlayedDate).toBe(getLocalToday());

    // Simulate yesterday's stamp, then play again today.
    usePlayerStore.setState({ gamesPlayedToday: 9, gamesPlayedDate: '2000-01-01' });
    ps().incrementGamesPlayedToday();
    expect(ps().gamesPlayedToday).toBe(1); // reset, not 10
  });
});

describe('playerStore lives', () => {
  beforeEach(() => usePlayerStore.setState({ lives: 5, lastLifeLostAt: null, infiniteLivesUntil: null }));

  it('loseLife decrements and clamps at 0', () => {
    for (let i = 0; i < 7; i++) ps().loseLife();
    expect(ps().lives).toBe(0); // never negative
    expect(ps().lastLifeLostAt).not.toBeNull();
  });

  it('refillLives restores to 5 and clears the timer', () => {
    ps().loseLife();
    ps().refillLives();
    expect(ps().lives).toBe(5);
    expect(ps().lastLifeLostAt).toBeNull();
  });

  it('activateInfiniteLives tops up + sets an expiry in the future', () => {
    ps().loseLife();
    const before = Date.now();
    ps().activateInfiniteLives(60_000);
    expect(ps().lives).toBe(5);
    expect(ps().infiniteLivesUntil).toBeGreaterThanOrEqual(before + 60_000 - 50);
  });
});

describe('playerStore streak freezes', () => {
  beforeEach(() => usePlayerStore.setState({ streakFreezes: 0 }));

  it('add then use; use fails (no decrement) when empty', () => {
    ps().addStreakFreezes(2);
    expect(ps().useStreakFreeze()).toBe(true);
    expect(ps().streakFreezes).toBe(1);
    ps().useStreakFreeze();
    expect(ps().useStreakFreeze()).toBe(false); // empty
    expect(ps().streakFreezes).toBe(0);
  });
});

describe('playerStore daily quests (date reset + idempotent claim)', () => {
  it('accumulates progress within the day, resets on a new day', () => {
    usePlayerStore.setState({ dailyQuestProgress: {}, dailyQuestsDate: null, dailyQuestsClaimed: [] });
    ps().updateQuestProgress('clear_lines', 3);
    ps().updateQuestProgress('clear_lines', 2);
    expect(ps().dailyQuestProgress.clear_lines).toBe(5);

    usePlayerStore.setState({ dailyQuestsDate: '2000-01-01', dailyQuestProgress: { clear_lines: 99 } });
    ps().updateQuestProgress('clear_lines', 1);
    expect(ps().dailyQuestProgress.clear_lines).toBe(1); // reset for the new day
  });

  it('claimDailyQuest is idempotent', () => {
    usePlayerStore.setState({ dailyQuestsClaimed: [] });
    ps().claimDailyQuest('q1');
    ps().claimDailyQuest('q1');
    expect(ps().dailyQuestsClaimed).toEqual(['q1']);
  });
});

describe('playerStore collection claims (idempotent)', () => {
  it('collectSticker / claimAlbumPage / claimStarChest dedupe', () => {
    usePlayerStore.setState({ collectedStickers: [], claimedAlbumPages: [], claimedStarChests: [] });
    ps().collectSticker('s1'); ps().collectSticker('s1');
    ps().claimAlbumPage('p1'); ps().claimAlbumPage('p1');
    ps().claimStarChest('c1'); ps().claimStarChest('c1');
    expect(ps().collectedStickers).toEqual(['s1']);
    expect(ps().claimedAlbumPages).toEqual(['p1']);
    expect(ps().claimedStarChests).toEqual(['c1']);
  });
});

describe('playerStore skill rating + power-up upgrade', () => {
  it('updateSkillRating clamps at 0', () => {
    usePlayerStore.setState({ skillRating: 30 });
    ps().updateSkillRating(20);
    expect(ps().skillRating).toBe(50);
    ps().updateSkillRating(-100);
    expect(ps().skillRating).toBe(0); // never negative
  });

  it('upgradePowerUp caps at level 5', () => {
    usePlayerStore.setState({ powerUpLevels: { bomb: 4, rowClear: 1, colorClear: 1 } });
    ps().upgradePowerUp('bomb'); // 5
    ps().upgradePowerUp('bomb'); // stays 5
    expect(ps().powerUpLevels.bomb).toBe(5);
  });
});

describe('playerStore weekly challenge', () => {
  it('keeps the max within a week, resets on a new week', () => {
    usePlayerStore.setState({ weeklyBestScore: 0, weeklyBestStars: 0, weeklyLastWeekId: null });
    ps().completeWeeklyChallenge('2026-W10', 2, 800);
    ps().completeWeeklyChallenge('2026-W10', 1, 400); // same week, worse
    expect(ps().weeklyBestScore).toBe(800); // kept the max
    expect(ps().weeklyBestStars).toBe(2);
    ps().completeWeeklyChallenge('2026-W11', 1, 100); // new week
    expect(ps().weeklyBestScore).toBe(100); // reset to the new week's result
    expect(ps().weeklyLastWeekId).toBe('2026-W11');
  });
});
