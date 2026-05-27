/**
 * Unit coverage for the shared `creditFromProduct` dispatch function.
 *
 * Why this matters: `creditFromProduct` is the single funnel both the real
 * iOS IAP path (purchases.ts → purchaseUpdatedListener) and the DEV STUB
 * (Expo Go / web preview) use to grant rewards. A regression here would
 * either silently under-grant a paying user (e.g., missing the bundle's
 * power-ups) or over-grant (e.g., crediting both the listener's path AND
 * the stub's path). The function is pure dispatch + side effect on the
 * Zustand store, so a small table of asserts pins the contract cleanly.
 *
 * We test against `purchases.web.ts` because the native `purchases.ts`
 * requires `react-native-iap` (native module, jest can't load). The web
 * variant intentionally mirrors the native crediting logic byte-for-byte
 * so coverage here pins both.
 */

// AsyncStorage's default implementation reaches into `window.localStorage`,
// which doesn't exist in jest's node environment. Stub it before any
// import resolves the playerStore (which configures zustand persist).
// This stub keeps the persist middleware quiet — get returns null so
// nothing rehydrates, set is a no-op so test mutations don't try to
// serialize across `window`.
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

import { creditFromProduct, getProduct } from '../services/purchases.web';
import { usePlayerStore } from '../store/playerStore';

/** Reset just the fields creditFromProduct touches. The rest of the
 *  store carries persisted defaults across tests, which we don't care
 *  about — only coins/gems/adFree/powerUps are in scope. */
function resetCreditFields() {
  usePlayerStore.setState({
    coins: 0,
    gems: 0,
    adFree: false,
    powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },
  });
}

describe('creditFromProduct', () => {
  beforeEach(() => {
    resetCreditFields();
  });

  it('returns false and credits nothing for unknown product IDs', () => {
    const before = usePlayerStore.getState();
    const ok = creditFromProduct('com.isaaclefohn.chromadrop.does_not_exist');
    expect(ok).toBe(false);
    const after = usePlayerStore.getState();
    expect(after.coins).toBe(before.coins);
    expect(after.gems).toBe(before.gems);
    expect(after.adFree).toBe(before.adFree);
  });

  // ── Coin packs ────────────────────────────────────────────────
  it('credits the base coin amount for a plain coin pack', () => {
    const ok = creditFromProduct('com.isaaclefohn.chromadrop.coins500');
    expect(ok).toBe(true);
    expect(usePlayerStore.getState().coins).toBe(500);
    expect(usePlayerStore.getState().gems).toBe(0);
  });

  it('credits coins plus bonus gems on coins-with-bonus packs', () => {
    // Coin Chest: 2500 coins + 10 bonus gems
    creditFromProduct('com.isaaclefohn.chromadrop.coins2500');
    expect(usePlayerStore.getState().coins).toBe(2500);
    expect(usePlayerStore.getState().gems).toBe(10);
  });

  it('credits the largest coin pack correctly', () => {
    // Coin Treasury: 50000 coins + 200 bonus gems — the SKU previously
    // missing from server PRODUCT_CREDITS map
    creditFromProduct('com.isaaclefohn.chromadrop.coins50000');
    expect(usePlayerStore.getState().coins).toBe(50000);
    expect(usePlayerStore.getState().gems).toBe(200);
  });

  // ── Gem packs ─────────────────────────────────────────────────
  it('credits the base gem amount for a plain gem pack', () => {
    creditFromProduct('com.isaaclefohn.chromadrop.gems100');
    expect(usePlayerStore.getState().gems).toBe(100);
    expect(usePlayerStore.getState().coins).toBe(0);
  });

  it('credits gems plus bonus coins on gems-with-bonus packs', () => {
    // Gem Trove: 500 gems + 1000 bonus coins
    creditFromProduct('com.isaaclefohn.chromadrop.gems500');
    expect(usePlayerStore.getState().gems).toBe(500);
    expect(usePlayerStore.getState().coins).toBe(1000);
  });

  it('credits the largest gem pack correctly', () => {
    // Gem Hoard: 1500 gems + 5000 bonus coins — the SKU previously
    // missing from server PRODUCT_CREDITS map
    creditFromProduct('com.isaaclefohn.chromadrop.gems1500');
    expect(usePlayerStore.getState().gems).toBe(1500);
    expect(usePlayerStore.getState().coins).toBe(5000);
  });

  // ── Premium (non-consumables) ─────────────────────────────────
  it('sets ad_free=true for Remove Ads (no currency side effect)', () => {
    creditFromProduct('com.isaaclefohn.chromadrop.remove_ads');
    const s = usePlayerStore.getState();
    expect(s.adFree).toBe(true);
    expect(s.coins).toBe(0);
    expect(s.gems).toBe(0);
  });

  it('credits VIP Pass: ad_free + bonus coins + bonus gems', () => {
    // VIP Pass: type vip, amount 1, bonus { coins 5000, gems 500 }
    creditFromProduct('com.isaaclefohn.chromadrop.vip_pass');
    const s = usePlayerStore.getState();
    expect(s.adFree).toBe(true);
    expect(s.coins).toBe(5000);
    expect(s.gems).toBe(500);
  });

  // ── Bundles ───────────────────────────────────────────────────
  it('credits the Starter Pack: coins, gems, power-ups, and ad-free', () => {
    // Starter Pack: 2000 coins, 200 gems, 3 of each power-up, ad-free
    creditFromProduct('com.isaaclefohn.chromadrop.starter_pack');
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(2000);
    expect(s.gems).toBe(200);
    expect(s.powerUps.bomb).toBe(3);
    expect(s.powerUps.rowClear).toBe(3);
    expect(s.powerUps.colorClear).toBe(3);
    expect(s.adFree).toBe(true);
  });

  it('credits the Power Bundle: 10 of each power-up, no currency', () => {
    creditFromProduct('com.isaaclefohn.chromadrop.power_bundle');
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(0);
    expect(s.gems).toBe(0);
    expect(s.powerUps.bomb).toBe(10);
    expect(s.powerUps.rowClear).toBe(10);
    expect(s.powerUps.colorClear).toBe(10);
    expect(s.adFree).toBe(false); // no adFree in this bundle
  });

  it('credits the Mega Bundle: 25k coins, 1k gems, 15 of each power-up', () => {
    creditFromProduct('com.isaaclefohn.chromadrop.mega_bundle');
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(25000);
    expect(s.gems).toBe(1000);
    expect(s.powerUps.bomb).toBe(15);
    expect(s.powerUps.rowClear).toBe(15);
    expect(s.powerUps.colorClear).toBe(15);
  });

  // ── Catalog parity ────────────────────────────────────────────
  it('credits accumulate when the same SKU is purchased twice', () => {
    // Consumables are intentionally re-creditable. (Non-consumable
    // restore handling is a separate concern flagged in
    // creditFromProduct's doc comment.)
    creditFromProduct('com.isaaclefohn.chromadrop.coins500');
    creditFromProduct('com.isaaclefohn.chromadrop.coins500');
    expect(usePlayerStore.getState().coins).toBe(1000);
  });

  it('every product in the catalog credits successfully', () => {
    // Guard against future SKUs being added without a creditFromProduct
    // branch. If somebody adds a new reward.type that creditFromProduct
    // doesn't handle, this test still returns `true` (the function
    // doesn't throw on unknown reward types) but state would be
    // unchanged — so we also assert at least ONE of (coins, gems,
    // adFree, powerUp counts) changed for each SKU.
    const ids = [
      'com.isaaclefohn.chromadrop.coins500',
      'com.isaaclefohn.chromadrop.coins2500',
      'com.isaaclefohn.chromadrop.coins10000',
      'com.isaaclefohn.chromadrop.coins50000',
      'com.isaaclefohn.chromadrop.gems100',
      'com.isaaclefohn.chromadrop.gems500',
      'com.isaaclefohn.chromadrop.gems1500',
      'com.isaaclefohn.chromadrop.starter_pack',
      'com.isaaclefohn.chromadrop.power_bundle',
      'com.isaaclefohn.chromadrop.mega_bundle',
      'com.isaaclefohn.chromadrop.remove_ads',
      'com.isaaclefohn.chromadrop.vip_pass',
    ];
    for (const id of ids) {
      resetCreditFields();
      expect(getProduct(id)).toBeDefined();
      const ok = creditFromProduct(id);
      expect(ok).toBe(true);
      const s = usePlayerStore.getState();
      const totalPowerUps = s.powerUps.bomb + s.powerUps.rowClear + s.powerUps.colorClear;
      const credited = s.coins > 0 || s.gems > 0 || s.adFree || totalPowerUps > 0;
      // Helpful failure message when somebody adds a SKU but forgets to
      // teach creditFromProduct how to credit it.
      expect(credited).toBe(true);
    }
  });
});
