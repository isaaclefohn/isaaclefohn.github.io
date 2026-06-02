/**
 * Coverage for playerStore's power-up fusion economy (fusePowerUp / tradePowerUp
 * were LIVE — wired to PowerUpFusionModal — but untested). These spend/grant
 * power-ups, so the affordability guard, atomicity, and the from===to safety
 * matter. The from===to case is the duplicate-object-key footgun: a naive
 * `{ [from]: x-cost, [to]: y+amt }` drops the deduction (last key wins) and
 * hands out a free grant.
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

describe('playerStore.fusePowerUp', () => {
  beforeEach(() =>
    usePlayerStore.setState({
      powerUps: { bomb: 5, rowClear: 0, colorClear: 0 },
      megaPowerUps: { megabomb: 0, megaRow: 0, megaColor: 0 },
    })
  );

  it('spends sourceCost of the source and grants one mega (atomic)', () => {
    expect(ps().fusePowerUp('bomb', 3, 'megabomb')).toBe(true);
    expect(ps().powerUps.bomb).toBe(2);
    expect(ps().megaPowerUps.megabomb).toBe(1);
  });

  it('refuses (spending nothing) when the source is insufficient', () => {
    expect(ps().fusePowerUp('bomb', 6, 'megabomb')).toBe(false);
    expect(ps().powerUps.bomb).toBe(5);
    expect(ps().megaPowerUps.megabomb).toBe(0);
  });

  it('allows spending the exact balance (boundary)', () => {
    expect(ps().fusePowerUp('bomb', 5, 'megabomb')).toBe(true);
    expect(ps().powerUps.bomb).toBe(0);
    expect(ps().megaPowerUps.megabomb).toBe(1);
  });
});

describe('playerStore.tradePowerUp', () => {
  beforeEach(() =>
    usePlayerStore.setState({ powerUps: { bomb: 10, rowClear: 0, colorClear: 0 } })
  );

  it('deducts fromCost of `from` and grants toAmount of `to` (distinct types)', () => {
    expect(ps().tradePowerUp('bomb', 5, 'rowClear', 1)).toBe(true);
    expect(ps().powerUps.bomb).toBe(5);
    expect(ps().powerUps.rowClear).toBe(1);
  });

  it('refuses (spending nothing) when `from` is insufficient', () => {
    expect(ps().tradePowerUp('bomb', 11, 'rowClear', 1)).toBe(false);
    expect(ps().powerUps.bomb).toBe(10);
    expect(ps().powerUps.rowClear).toBe(0);
  });

  it('is safe when from === to: net is -fromCost + toAmount, never a free grant', () => {
    // Duplicate-key footgun guard: net must be 10 - 3 + 1 = 8, NOT 10 + 1.
    expect(ps().tradePowerUp('bomb', 3, 'bomb', 1)).toBe(true);
    expect(ps().powerUps.bomb).toBe(8);
  });

  it('allows trading the exact balance (boundary)', () => {
    expect(ps().tradePowerUp('bomb', 10, 'colorClear', 1)).toBe(true);
    expect(ps().powerUps.bomb).toBe(0);
    expect(ps().powerUps.colorClear).toBe(1);
  });
});
