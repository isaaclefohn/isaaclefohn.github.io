/**
 * In-app purchase service.
 * Handles Apple IAP product definitions, purchase flow, and receipt validation.
 * Falls back gracefully when IAP is not available (e.g., Expo Go, simulator).
 *
 * Crediting policy (single source of truth):
 *   Two purchase paths both converge on creditFromProduct(productId):
 *     1. Real iOS — `purchaseUpdatedListener` fires after Apple confirms the
 *        transaction. The receipt is validated server-side. Only valid
 *        receipts credit the player.
 *     2. Expo Go / no native IAP — `requestPurchase` short-circuits and
 *        credits immediately so the shop UI is usable in development.
 *   The eventual real-payment switchover (when Apple Developer enrollment
 *   completes) is a config-level change, not an architectural one, because
 *   the crediting function is shared.
 */

import Constants from 'expo-constants';
import { usePlayerStore } from '../store/playerStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-loaded native module. Stays null in Expo Go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let IAP: any = null;
let iapInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let purchaseUpdateSubscription: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let purchaseErrorSubscription: any = null;

function loadIAP(): boolean {
  if (IAP || isExpoGo) return Boolean(IAP);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    IAP = require('react-native-iap');
    return true;
  } catch {
    IAP = null;
    return false;
  }
}

/** Initialize the IAP connection and fetch the product catalog. */
export async function initializePurchases(): Promise<void> {
  if (isExpoGo) return;
  if (iapInitialized) return;
  if (!loadIAP() || !IAP) return;

  try {
    await IAP.initConnection();
    iapInitialized = true;

    // Subscribe to purchase events so interrupted/background purchases still resolve.
    purchaseUpdateSubscription = IAP.purchaseUpdatedListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (purchase: any) => {
        const receipt = purchase?.transactionReceipt;
        if (!receipt) return;
        // Look up the product once so we know how to finish the transaction
        // (consumables and non-consumables use different finish semantics —
        // getting this wrong causes Apple to redeliver the transaction
        // forever, which would silently double-credit on every restart).
        const product = getProduct(purchase.productId);
        const isConsumable = product?.type === 'consumable';
        try {
          const result = await validateReceipt(receipt, purchase.productId);
          if (result.valid) {
            // Source of truth for crediting lives client-side via the
            // product catalog. Server only confirms the receipt is real —
            // it does NOT decide reward amounts. See creditFromProduct
            // notes for why we deliberately ignore `result.credits`.
            creditFromProduct(purchase.productId);
          } else {
            console.warn(
              '[IAP] receipt validation failed — NOT crediting',
              purchase.productId,
            );
          }
        } finally {
          try {
            await IAP.finishTransaction({ purchase, isConsumable });
          } catch {
            /* ignore */
          }
        }
      }
    );

    purchaseErrorSubscription = IAP.purchaseErrorListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => {
        console.warn('[IAP] purchase error', error?.code, error?.message);
      }
    );

    // Warm up the product catalog so the store screen renders fast.
    try {
      await IAP.getProducts({ skus: PRODUCTS.map((p) => p.id) });
    } catch (err) {
      console.warn('[IAP] getProducts failed', err);
    }
  } catch (err) {
    console.warn('[IAP] initConnection failed', err);
  }
}

/** Tear down IAP listeners. Normally not called — kept for testability. */
export async function teardownPurchases(): Promise<void> {
  try {
    purchaseUpdateSubscription?.remove?.();
    purchaseErrorSubscription?.remove?.();
  } catch {
    /* ignore */
  }
  if (IAP && iapInitialized) {
    try {
      await IAP.endConnection();
    } catch {
      /* ignore */
    }
    iapInitialized = false;
  }
}

/**
 * Kick off a purchase flow for the given product ID.
 *
 *   - Real iOS: triggers Apple's StoreKit payment sheet. Returns true once
 *     the request has been handed off to the platform — the actual credit
 *     happens later inside `purchaseUpdatedListener` after receipt
 *     validation succeeds.
 *   - Expo Go / no native IAP: short-circuits the platform layer and
 *     credits the player directly via `creditFromProduct`. This is the
 *     DEV STUB path that keeps the shop usable pre-Apple-enrollment.
 *
 * Returns true on success (request initiated OR DEV STUB credit applied),
 * false if neither path could run.
 */
export async function requestPurchase(productId: string): Promise<boolean> {
  if (isExpoGo || !loadIAP() || !IAP) {
    // DEV STUB. Without the platform IAP module we have no way to charge
    // the user, so we just hand them the goods. This branch ONLY runs in
    // Expo Go / simulator / non-EAS builds — production iOS builds bundle
    // react-native-iap, so this fallback won't be reachable from a paying
    // user. The credit goes through the same function as the real path
    // so swapping in real StoreKit is a one-line change at the listener.
    console.warn('[IAP] dev stub: crediting without StoreKit charge', productId);
    return creditFromProduct(productId);
  }
  if (!iapInitialized) await initializePurchases();
  try {
    await IAP.requestPurchase({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false });
    return true;
  } catch (err) {
    console.warn('[IAP] requestPurchase failed', err);
    return false;
  }
}

/**
 * Restore non-consumable purchases the user already owns on a fresh
 * install / new device. Apple REJECTS apps with non-consumable IAPs
 * (Remove Ads, Starter Pack, VIP Pass) that have no restore path —
 * this is Guideline 3.1.1. Even though the actual purchase wiring is
 * a DEV STUB until Apple Developer enrollment, the function + UI
 * surface ship now so the eventual real-payment switchover is one
 * code change instead of an architecture change.
 *
 * Returns the list of product IDs successfully restored, or empty if
 * none / IAP is not available / the call fails. The UI uses the count
 * for the "restored N purchases" confirmation message.
 */
export async function restorePurchases(): Promise<string[]> {
  if (isExpoGo || !loadIAP() || !IAP) {
    console.warn('[IAP] not available, cannot restore');
    return [];
  }
  if (!iapInitialized) await initializePurchases();
  try {
    // react-native-iap's `getAvailablePurchases` returns the user's
    // restorable transactions on iOS. Each non-consumable they own
    // shows up exactly once.
    const purchases = await IAP.getAvailablePurchases();
    const ids: string[] = [];
    for (const purchase of purchases) {
      const sku = (purchase as { productId?: string }).productId;
      if (!sku) continue;
      const product = PRODUCTS.find((p) => p.id === sku);
      // Only non-consumables are restorable — consumables (coins, gems,
      // power bundles) cannot and should not be re-granted on restore.
      if (!product || product.type !== 'non_consumable') continue;

      // Apply the entitlement ourselves. `getAvailablePurchases` does
      // NOT fire `purchaseUpdatedListener` — that listener only fires
      // for queue-state transitions (new purchases and interrupted
      // transactions). Restore needs explicit crediting, otherwise the
      // user sees "Restored N purchases" but ad-free / VIP state is
      // never re-applied. Using `applyEntitlementOnly` (not
      // `creditFromProduct`) ensures the bundle's one-time consumable
      // bonus content is NOT re-granted on restore.
      applyEntitlementOnly(sku);
      ids.push(sku);
    }
    return ids;
  } catch (err) {
    console.warn('[IAP] restorePurchases failed', err);
    return [];
  }
}

/** Fetch the live product catalog from the store. Returns empty array on failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchStoreProducts(): Promise<any[]> {
  if (isExpoGo || !loadIAP() || !IAP) return [];
  if (!iapInitialized) await initializePurchases();
  try {
    return await IAP.getProducts({ skus: PRODUCTS.map((p) => p.id) });
  } catch (err) {
    console.warn('[IAP] fetchStoreProducts failed', err);
    return [];
  }
}

/** Product catalog */
export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  type: 'consumable' | 'non_consumable' | 'subscription';
  reward: {
    type: 'coins' | 'gems' | 'ad_free' | 'bundle' | 'vip';
    amount: number;
    bonus?: Record<string, number>;
  };
  badge?: 'best_value' | 'popular' | 'limited' | 'starter';
}

export const PRODUCTS: Product[] = [
  // ─── Coin Packs ────────────────────────────────────────────────
  {
    id: 'com.isaaclefohn.chromadrop.coins500',
    title: 'Coin Pouch',
    description: '500 coins',
    price: '$0.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 500 },
  },
  {
    id: 'com.isaaclefohn.chromadrop.coins2500',
    title: 'Coin Chest',
    description: '2,500 coins + 10 gems bonus',
    price: '$3.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 2500, bonus: { gems: 10 } },
    badge: 'best_value',
  },
  {
    id: 'com.isaaclefohn.chromadrop.coins10000',
    title: 'Coin Vault',
    description: '10,000 coins + 50 gems bonus',
    price: '$9.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 10000, bonus: { gems: 50 } },
  },
  {
    id: 'com.isaaclefohn.chromadrop.coins50000',
    title: 'Coin Treasury',
    description: '50,000 coins + 200 gems bonus',
    price: '$39.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 50000, bonus: { gems: 200 } },
  },

  // ─── Gem Packs ─────────────────────────────────────────────────
  {
    id: 'com.isaaclefohn.chromadrop.gems100',
    title: 'Gem Shard',
    description: '100 gems',
    price: '$1.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 100 },
  },
  {
    id: 'com.isaaclefohn.chromadrop.gems500',
    title: 'Gem Trove',
    description: '500 gems + 1,000 coins bonus',
    price: '$7.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 500, bonus: { coins: 1000 } },
    badge: 'popular',
  },
  {
    id: 'com.isaaclefohn.chromadrop.gems1500',
    title: 'Gem Hoard',
    description: '1,500 gems + 5,000 coins bonus',
    price: '$19.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 1500, bonus: { coins: 5000 } },
    badge: 'best_value',
  },

  // ─── Bundles ───────────────────────────────────────────────────
  {
    id: 'com.isaaclefohn.chromadrop.starter_pack',
    title: 'Starter Pack',
    description: 'No ads + 2,000 coins, 200 gems, 3x each power-up',
    price: '$4.99',
    type: 'non_consumable',
    reward: {
      type: 'bundle',
      amount: 1,
      bonus: { coins: 2000, gems: 200, bomb: 3, rowClear: 3, colorClear: 3, adFree: 1 },
    },
    badge: 'starter',
  },
  {
    id: 'com.isaaclefohn.chromadrop.power_bundle',
    title: 'Power Bundle',
    description: '10x Bomb, 10x Row Clear, 10x Color Swap',
    price: '$6.99',
    type: 'consumable',
    reward: {
      type: 'bundle',
      amount: 1,
      bonus: { bomb: 10, rowClear: 10, colorClear: 10 },
    },
  },
  {
    id: 'com.isaaclefohn.chromadrop.mega_bundle',
    title: 'Mega Bundle',
    description: '25,000 coins, 1,000 gems, 15x each power-up',
    price: '$24.99',
    type: 'consumable',
    reward: {
      type: 'bundle',
      amount: 1,
      bonus: { coins: 25000, gems: 1000, bomb: 15, rowClear: 15, colorClear: 15 },
    },
    badge: 'best_value',
  },

  // ─── Premium ───────────────────────────────────────────────────
  // Price drop from $3.99 → $2.99 per the 2026-06 monetization audit:
  // casual-puzzle ad-removals convert best at $1.99–$2.99 (~1-3% of
  // DAU); $3.99 prices like a premium-casual title (Toon Blast tier)
  // without the brand to back it. Volume from the lower anchor more
  // than offsets per-unit revenue at our audience scale.
  {
    // Product ID must match what the server expects (see
    // `api/src/validate-receipt.ts`) and what App Store Connect will
    // accept once Apple Developer enrollment lands. Server + metadata
    // both use `remove_ads`, so the client matches.
    id: 'com.isaaclefohn.chromadrop.remove_ads',
    title: 'Remove Ads',
    description: 'Permanently remove all ads',
    price: '$2.99',
    type: 'non_consumable',
    reward: { type: 'ad_free', amount: 1 },
  },
  {
    id: 'com.isaaclefohn.chromadrop.vip_pass',
    title: 'VIP Pass',
    description: 'No ads + 2x daily rewards + exclusive VIP theme',
    price: '$9.99',
    type: 'non_consumable',
    reward: {
      type: 'vip',
      amount: 1,
      bonus: { coins: 5000, gems: 500 },
    },
    badge: 'popular',
  },
];

/** Get a product by ID */
export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === productId);
}

/** Get products by category */
export function getCoinProducts(): Product[] {
  return PRODUCTS.filter((p) => p.reward.type === 'coins');
}

export function getGemProducts(): Product[] {
  return PRODUCTS.filter((p) => p.reward.type === 'gems');
}

export function getBundleProducts(): Product[] {
  return PRODUCTS.filter((p) => p.reward.type === 'bundle');
}

export function getPremiumProducts(): Product[] {
  return PRODUCTS.filter((p) => p.reward.type === 'ad_free' || p.reward.type === 'vip');
}

/**
 * Validate a purchase receipt with the server.
 * Returns true if valid, false otherwise.
 */
export async function validateReceipt(
  receiptData: string,
  productId: string
): Promise<{ valid: boolean; credits?: { type: string; amount: number } }> {
  if (!API_URL) {
    console.warn('API_URL not configured, skipping receipt validation');
    return { valid: false };
  }

  try {
    const response = await fetch(`${API_URL}/api/validate-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'apple',
        receiptData,
        productId,
      }),
    });

    if (!response.ok) return { valid: false };
    return await response.json();
  } catch (error) {
    console.error('Receipt validation failed:', error);
    return { valid: false };
  }
}

/**
 * Process a purchase reward — credit the player's account.
 * Called after successful receipt validation.
 */
export function getPurchaseReward(productId: string): { type: string; amount: number } | null {
  const product = getProduct(productId);
  return product ? product.reward : null;
}

/**
 * Apply a product's reward to the player's account.
 *
 * Single source of truth for crediting — called from BOTH the real iOS
 * `purchaseUpdatedListener` (after receipt validation) and the Expo Go /
 * dev-stub `requestPurchase` short-circuit. Keeping both paths funneled
 * through one function is what makes the eventual real-payment switchover
 * a config change rather than an architecture change.
 *
 * Why we credit from the LOCAL catalog instead of the server-returned
 * `credits` field: the server-side validate-receipt endpoint only needs
 * to confirm "this receipt is from Apple and matches this productId" —
 * the reward shape (coins, bundles, VIP bonus) is product metadata that
 * already lives in `PRODUCTS` on both client and server. Trusting the
 * server's credit response would mean a backend bug could under-grant
 * a paying user; trusting the local catalog after server `valid:true`
 * is the more defensible posture. (The server still owns "is this
 * receipt real" — that's the part the client cannot self-verify.)
 *
 * Returns true if the product was found and credited, false on unknown id.
 *
 * KNOWN ISSUE (out of scope for the launch-blocker fix): restoring a
 * non-consumable bundle (Starter Pack, VIP Pass) on a new device will
 * re-credit the consumable contents (coins/gems/power-ups) on top of
 * re-granting the entitlement (ad-free). The clean fix is a server-side
 * "already granted" check or a client `ownedNonConsumables` ledger; for
 * the launch-blocker pass we accept the over-grant since it errs in the
 * user's favor and only triggers on legitimate restores.
 */
export function creditFromProduct(productId: string): boolean {
  const product = getProduct(productId);
  if (!product) {
    console.warn('[IAP] unknown productId, cannot credit', productId);
    return false;
  }
  // Zustand's getState() exposes the same action surface as the hook —
  // safe to call from non-React contexts like the IAP listener.
  const store = usePlayerStore.getState();
  const { reward } = product;

  if (reward.type === 'coins') {
    store.addCoins(reward.amount);
    if (reward.bonus?.gems) store.addGems(reward.bonus.gems);
  } else if (reward.type === 'gems') {
    store.addGems(reward.amount);
    if (reward.bonus?.coins) store.addCoins(reward.bonus.coins);
  } else if (reward.type === 'ad_free') {
    store.setAdFree(true);
  } else if (reward.type === 'vip') {
    store.setAdFree(true);
    if (reward.bonus?.coins) store.addCoins(reward.bonus.coins);
    if (reward.bonus?.gems) store.addGems(reward.bonus.gems);
  } else if (reward.type === 'bundle') {
    const b = reward.bonus;
    if (b) {
      if (b.coins) store.addCoins(b.coins);
      if (b.gems) store.addGems(b.gems);
      if (b.bomb) store.addPowerUp('bomb', b.bomb);
      if (b.rowClear) store.addPowerUp('rowClear', b.rowClear);
      if (b.colorClear) store.addPowerUp('colorClear', b.colorClear);
      if (b.adFree) store.setAdFree(true);
    }
  }
  return true;
}

/**
 * Restore-path companion to creditFromProduct: apply only the PERSISTENT
 * entitlement portion of a non-consumable purchase, skipping consumable
 * bonuses (coins/gems/power-ups) that were one-time grants at the
 * original purchase moment.
 *
 * Why this exists as a separate function: Apple's IAP model only restores
 * non-consumable purchases — consumables (coin packs, gem packs, power
 * bundles) are not restorable by design. For non-consumable BUNDLES like
 * Starter Pack and VIP Pass, the "non-consumable" wrapper grants the
 * entitlement (ad-free, VIP theme), but the bundle's consumable contents
 * (2,000 coins, 200 gems, etc.) were single-shot at purchase. Re-running
 * `creditFromProduct` on restore would silently re-credit those one-time
 * bonuses every time the user reinstalled the app — a meaningful
 * over-grant exploit.
 *
 * This function applies ONLY the entitlement. Bundle/VIP bonus content
 * is deliberately skipped.
 *
 * Returns true if an entitlement was applied, false if the product is
 * unknown, consumable (not restorable), or has no entitlement portion.
 */
export function applyEntitlementOnly(productId: string): boolean {
  const product = getProduct(productId);
  if (!product) return false;
  // Consumables are never restored — Apple's `getAvailablePurchases`
  // shouldn't even return them, but defending in depth here.
  if (product.type !== 'non_consumable') return false;

  const store = usePlayerStore.getState();
  const { reward } = product;

  if (reward.type === 'ad_free') {
    store.setAdFree(true);
    return true;
  }
  if (reward.type === 'vip') {
    store.setAdFree(true);
    // Bonus coins/gems were one-time at purchase. DO NOT restore them.
    return true;
  }
  if (reward.type === 'bundle') {
    if (reward.bonus?.adFree) {
      store.setAdFree(true);
    }
    // Bonus coins/gems/power-ups were one-time at purchase. DO NOT restore.
    return true;
  }
  return false;
}
