/**
 * Regression coverage for `claimDailyRouletteAtomic`.
 *
 * Why this matters: the daily roulette previously credited the reward
 * inside the spin animation's `.start()` callback as a sequence of
 * separate addCoins / addGems / addPowerUp / refillLives calls followed
 * by claimDailyRoulette to stamp the date. If the app force-closed
 * during the 1,400 ms spin animation (iOS backgrounding, crash, force-
 * quit) between the first credit and the final stamp, the date never
 * persisted and the player could re-spin on next launch for a double
 * payout. The atomic variant collapses all of these into a single
 * `set()` call AND adds an idempotency guard, so neither the race
 * nor a double-fire of the callback can double-credit.
 */

// AsyncStorage stub — same pattern as IapCrediting.test.ts. Required
// because the playerStore's persist middleware reaches into
// window.localStorage which doesn't exist in jest's node environment.
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

function resetRouletteFields() {
  usePlayerStore.setState({
    coins: 0,
    gems: 0,
    lives: 5,
    lastLifeLostAt: null,
    powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },
    rouletteLastDate: null,
  });
}

describe('claimDailyRouletteAtomic', () => {
  beforeEach(() => {
    resetRouletteFields();
  });

  it('credits coins and stamps the date in one atomic operation', () => {
    const { claimDailyRouletteAtomic } = usePlayerStore.getState();
    claimDailyRouletteAtomic('2026-05-27', { coins: 250 });
    const s = usePlayerStore.getState();
    expect(s.rouletteLastDate).toBe('2026-05-27');
    expect(s.coins).toBe(250);
  });

  it('credits gems', () => {
    usePlayerStore.getState().claimDailyRouletteAtomic('2026-05-27', { gems: 10 });
    expect(usePlayerStore.getState().gems).toBe(10);
  });

  it('credits power-ups (bomb / rowClear / colorClear)', () => {
    usePlayerStore.getState().claimDailyRouletteAtomic('2026-05-27', {
      bomb: 2, rowClear: 1, colorClear: 1,
    });
    const s = usePlayerStore.getState();
    expect(s.powerUps).toEqual({ bomb: 2, rowClear: 1, colorClear: 1 });
  });

  it('refills lives when the lives payload is truthy', () => {
    // Simulate a player who lost lives before spinning
    usePlayerStore.setState({ lives: 2, lastLifeLostAt: Date.now() });
    usePlayerStore.getState().claimDailyRouletteAtomic('2026-05-27', { lives: 1 });
    const s = usePlayerStore.getState();
    expect(s.lives).toBe(5);
    expect(s.lastLifeLostAt).toBeNull();
  });

  it('is idempotent — second claim on the same date is a no-op', () => {
    // THIS IS THE SECURITY-CRITICAL CASE. The audit found that the
    // pre-atomic sequence could double-pay if the animation callback
    // ever re-fired (race / replay / rapid re-mount). With the atomic
    // guard, a duplicate claim on the same date credits nothing.
    const claim = usePlayerStore.getState().claimDailyRouletteAtomic;
    claim('2026-05-27', { coins: 250 });
    claim('2026-05-27', { coins: 250 });
    claim('2026-05-27', { coins: 250 });
    expect(usePlayerStore.getState().coins).toBe(250); // NOT 750
  });

  it('does allow a different date to credit again (next-day rollover)', () => {
    const claim = usePlayerStore.getState().claimDailyRouletteAtomic;
    claim('2026-05-27', { coins: 250 });
    claim('2026-05-28', { coins: 250 });
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(500);
    expect(s.rouletteLastDate).toBe('2026-05-28');
  });

  it('credits coins + gems + power-ups all in one set() call (jackpot case)', () => {
    // The "jackpot" tile from the roulette pool combines multiple reward
    // types. Validate the atomic action handles compound payloads.
    usePlayerStore.getState().claimDailyRouletteAtomic('2026-05-27', {
      coins: 250,
      gems: 10,
      bomb: 1,
      lives: 1,
    });
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(250);
    expect(s.gems).toBe(10);
    expect(s.powerUps.bomb).toBe(1);
    expect(s.lives).toBe(5);
    expect(s.rouletteLastDate).toBe('2026-05-27');
  });

  it('ignores boostDurationMs (flagged for follow-up — see spawn-task)', () => {
    // boostDurationMs is in the payload type for parity with
    // DailyRoulette.ts but is currently unhandled — the "Double Time"
    // and "XP Surge" rewards land in the action with no effect. A
    // separate spawn-task tracks wiring this through an active-boost
    // system. This test pins the current behavior so a future change
    // is intentional, not accidental.
    usePlayerStore.getState().claimDailyRouletteAtomic('2026-05-27', {
      boostDurationMs: 30 * 60 * 1000,
    });
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(0);
    expect(s.gems).toBe(0);
    expect(s.rouletteLastDate).toBe('2026-05-27');
  });
});

describe('claimDailyQuest idempotency', () => {
  beforeEach(() => {
    usePlayerStore.setState({ dailyQuestsClaimed: [] });
  });

  it('records the claim once', () => {
    usePlayerStore.getState().claimDailyQuest('quest-a');
    expect(usePlayerStore.getState().dailyQuestsClaimed).toEqual(['quest-a']);
  });

  it('does NOT re-append on duplicate claims', () => {
    // The audit caught the original implementation pushing
    // unconditionally — a rapid double-tap or stale-state re-render
    // could push a duplicate entry, and any future code using
    // `.includes()` to gate re-credits would silently break.
    const claim = usePlayerStore.getState().claimDailyQuest;
    claim('quest-a');
    claim('quest-a');
    claim('quest-a');
    expect(usePlayerStore.getState().dailyQuestsClaimed).toEqual(['quest-a']);
  });

  it('allows distinct quest IDs to accumulate', () => {
    const claim = usePlayerStore.getState().claimDailyQuest;
    claim('quest-a');
    claim('quest-b');
    claim('quest-c');
    expect(usePlayerStore.getState().dailyQuestsClaimed).toEqual([
      'quest-a',
      'quest-b',
      'quest-c',
    ]);
  });
});
