/**
 * Coverage for the atomic reward-claim actions (5th-audit findings):
 *   - claimGiftAtomic
 *   - claimFreeChestAtomic
 *   - openTreasureChestAtomic
 *   - claimCalendarDayAtomic
 *   - claimComebackBonusAtomic
 *
 * Each replaced a credit-before-stamp sequence (or, for GiftBox, a
 * never-stamped claim) that left a re-claimable window. The shared
 * property under test: the claim GUARD and the reward CREDIT land in
 * one `set()`, so there's no observable state where the reward was
 * granted but the guard wasn't stamped (the re-claim exploit) or vice
 * versa. Coin rewards stay boost-eligible.
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

function resetClaimFields() {
  usePlayerStore.setState({
    coins: 0,
    gems: 0,
    powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },
    activeBoostUntil: {},
    lastGiftDate: null,
    freeChestLastClaimedAt: null,
    calendarLastDay: 0,
    calendarMonth: '',
    lastComebackClaimedDate: null,
    treasureMapPieces: 5,
    treasureChestsOpened: 0,
  });
}

describe('claimGiftAtomic', () => {
  beforeEach(resetClaimFields);

  it('stamps lastGiftDate AND credits the bundle in one operation', () => {
    usePlayerStore.getState().claimGiftAtomic({ coins: 100, gems: 5, bomb: 2 });
    const s = usePlayerStore.getState();
    expect(s.lastGiftDate).not.toBeNull(); // stamped — the bug was this never happened
    expect(s.coins).toBe(100);
    expect(s.gems).toBe(5);
    expect(s.powerUps.bomb).toBe(2);
  });

  it('applies the active coin boost (gameplay reward, boost-eligible)', () => {
    usePlayerStore.setState({ activeBoostUntil: { coins: Date.now() + 60_000 } });
    usePlayerStore.getState().claimGiftAtomic({ coins: 100 });
    expect(usePlayerStore.getState().coins).toBe(200); // 2x boost
  });
});

describe('claimFreeChestAtomic', () => {
  beforeEach(resetClaimFields);

  it('stamps the timestamp AND credits together', () => {
    usePlayerStore.getState().claimFreeChestAtomic({ coins: 250, gems: 3 });
    const s = usePlayerStore.getState();
    expect(s.freeChestLastClaimedAt).not.toBeNull();
    expect(s.coins).toBe(250);
    expect(s.gems).toBe(3);
  });

  it('handles a power-up-only bundle', () => {
    usePlayerStore.getState().claimFreeChestAtomic({ rowClear: 1 });
    const s = usePlayerStore.getState();
    expect(s.freeChestLastClaimedAt).not.toBeNull();
    expect(s.powerUps.rowClear).toBe(1);
    expect(s.coins).toBe(0);
  });
});

describe('openTreasureChestAtomic', () => {
  beforeEach(resetClaimFields);

  it('deducts 5 pieces AND credits together', () => {
    usePlayerStore.setState({ treasureMapPieces: 7 });
    usePlayerStore.getState().openTreasureChestAtomic({ coins: 500, gems: 10 });
    const s = usePlayerStore.getState();
    expect(s.treasureMapPieces).toBe(2); // 7 - 5
    expect(s.treasureChestsOpened).toBe(1);
    expect(s.coins).toBe(500);
    expect(s.gems).toBe(10);
  });

  it('clamps pieces at 0 (never negative)', () => {
    usePlayerStore.setState({ treasureMapPieces: 3 });
    usePlayerStore.getState().openTreasureChestAtomic({ coins: 100 });
    expect(usePlayerStore.getState().treasureMapPieces).toBe(0);
  });
});

describe('claimCalendarDayAtomic', () => {
  beforeEach(resetClaimFields);

  it('stamps day + month AND credits together', () => {
    usePlayerStore.getState().claimCalendarDayAtomic(3, '2026-05', { coins: 30, gems: 1 });
    const s = usePlayerStore.getState();
    expect(s.calendarLastDay).toBe(3);
    expect(s.calendarMonth).toBe('2026-05');
    expect(s.coins).toBe(30);
    expect(s.gems).toBe(1);
  });
});

describe('claimComebackBonusAtomic', () => {
  beforeEach(resetClaimFields);

  it('stamps the date AND credits on first claim, returns true', () => {
    const ok = usePlayerStore.getState().claimComebackBonusAtomic({ coins: 200, gems: 5 });
    expect(ok).toBe(true);
    const s = usePlayerStore.getState();
    expect(s.lastComebackClaimedDate).not.toBeNull();
    expect(s.coins).toBe(200);
    expect(s.gems).toBe(5);
  });

  it('refuses a SECOND claim on the same day (persistent guard)', () => {
    // THE conf-82 bug case: the modal's only guard was local React
    // state which resets on remount. This persistent guard ensures a
    // remount-then-tap cannot double-credit.
    const claim = usePlayerStore.getState().claimComebackBonusAtomic;
    expect(claim({ coins: 200 })).toBe(true);
    expect(claim({ coins: 200 })).toBe(false); // refused
    expect(usePlayerStore.getState().coins).toBe(200); // NOT 400
  });
});
