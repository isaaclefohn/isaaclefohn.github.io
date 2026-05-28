/**
 * Coverage for the atomic purchase actions that replaced non-atomic
 * spend sequences in the shop (audit findings, conf 95 + 90):
 *
 *   - purchasePowerUpUpgrade  (was: spendCoins + spendGems + upgrade,
 *     where spendGems's return was ignored and the upgrade applied
 *     regardless — a partial-spend / free-upgrade bug)
 *   - purchaseAndEquipTheme / purchaseAndEquipBlockSkin (was: check-
 *     then-spendGems with no ownership ledger — re-equipping a
 *     purchased cosmetic double-charged)
 *
 * The shared property under test: each is all-or-nothing within one
 * `set()`. A failed affordability check changes NOTHING; a success
 * changes everything together.
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

describe('purchasePowerUpUpgrade (atomic)', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      coins: 1000,
      gems: 50,
      powerUpLevels: { bomb: 1, rowClear: 1, colorClear: 1 },
    });
  });

  it('deducts BOTH currencies and bumps level on success', () => {
    const ok = usePlayerStore.getState().purchasePowerUpUpgrade('bomb', 500, 5);
    expect(ok).toBe(true);
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(500);
    expect(s.gems).toBe(45);
    expect(s.powerUpLevels.bomb).toBe(2);
  });

  it('changes NOTHING when coins are insufficient', () => {
    usePlayerStore.setState({ coins: 100 });
    const ok = usePlayerStore.getState().purchasePowerUpUpgrade('bomb', 500, 5);
    expect(ok).toBe(false);
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(100); // untouched
    expect(s.gems).toBe(50); // untouched — THE BUG: old code deducted coins anyway
    expect(s.powerUpLevels.bomb).toBe(1); // not upgraded
  });

  it('changes NOTHING when gems are insufficient (the conf-95 bug case)', () => {
    // This is the exact scenario the audit flagged: coins are
    // affordable but gems are not. The old code deducted coins,
    // silently skipped gems, and STILL applied the upgrade. The
    // atomic version must leave all three fields untouched.
    usePlayerStore.setState({ coins: 1000, gems: 2 });
    const ok = usePlayerStore.getState().purchasePowerUpUpgrade('bomb', 500, 5);
    expect(ok).toBe(false);
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(1000); // NOT deducted
    expect(s.gems).toBe(2);
    expect(s.powerUpLevels.bomb).toBe(1); // NOT upgraded
  });

  it('refuses to upgrade past max level (5)', () => {
    usePlayerStore.setState({ powerUpLevels: { bomb: 5, rowClear: 1, colorClear: 1 } });
    const ok = usePlayerStore.getState().purchasePowerUpUpgrade('bomb', 500, 5);
    expect(ok).toBe(false);
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(1000); // no charge for a maxed power-up
    expect(s.powerUpLevels.bomb).toBe(5);
  });
});

describe('purchaseAndEquipTheme / BlockSkin (atomic, ownership-gated)', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      gems: 100,
      equippedTheme: 'classic',
      equippedBlockSkin: 'default',
      ownedThemes: [],
      ownedBlockSkins: [],
    });
  });

  it('equips a free theme without charging', () => {
    const ok = usePlayerStore.getState().purchaseAndEquipTheme('classic', 0);
    expect(ok).toBe(true);
    expect(usePlayerStore.getState().gems).toBe(100); // no charge
    expect(usePlayerStore.getState().equippedTheme).toBe('classic');
  });

  it('charges gems + records ownership on first purchase of a paid theme', () => {
    const ok = usePlayerStore.getState().purchaseAndEquipTheme('neon', 40);
    expect(ok).toBe(true);
    const s = usePlayerStore.getState();
    expect(s.gems).toBe(60);
    expect(s.ownedThemes).toContain('neon');
    expect(s.equippedTheme).toBe('neon');
  });

  it('does NOT re-charge when re-equipping an already-owned theme (the conf-90 bug)', () => {
    // Buy it once.
    usePlayerStore.getState().purchaseAndEquipTheme('neon', 40);
    expect(usePlayerStore.getState().gems).toBe(60);
    // Switch away to a free theme.
    usePlayerStore.getState().purchaseAndEquipTheme('classic', 0);
    // Switch BACK to the paid theme — must be free now.
    const ok = usePlayerStore.getState().purchaseAndEquipTheme('neon', 40);
    expect(ok).toBe(true);
    expect(usePlayerStore.getState().gems).toBe(60); // NOT 20 — no double charge
    expect(usePlayerStore.getState().equippedTheme).toBe('neon');
  });

  it('changes nothing when the player cannot afford an un-owned paid theme', () => {
    usePlayerStore.setState({ gems: 10 });
    const ok = usePlayerStore.getState().purchaseAndEquipTheme('neon', 40);
    expect(ok).toBe(false);
    const s = usePlayerStore.getState();
    expect(s.gems).toBe(10); // untouched
    expect(s.ownedThemes).not.toContain('neon');
    expect(s.equippedTheme).toBe('classic'); // not switched
  });

  it('block skins follow the same ownership rules', () => {
    // First purchase charges.
    expect(usePlayerStore.getState().purchaseAndEquipBlockSkin('glow', 30)).toBe(true);
    expect(usePlayerStore.getState().gems).toBe(70);
    expect(usePlayerStore.getState().ownedBlockSkins).toContain('glow');
    // Re-equip after switching away is free.
    usePlayerStore.getState().purchaseAndEquipBlockSkin('default', 0);
    usePlayerStore.getState().purchaseAndEquipBlockSkin('glow', 30);
    expect(usePlayerStore.getState().gems).toBe(70); // no double charge
  });
});
