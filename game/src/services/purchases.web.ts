/**
 * Web stub for the purchases service.
 * The real native implementation in purchases.ts imports react-native-iap,
 * which is native-only. Metro picks `.web.ts` first for the web export, so
 * this file short-circuits IAP init and purchase flows in the static preview.
 *
 * The product catalog is duplicated here (rather than re-exported) to avoid
 * a circular `./purchases` resolution when running under Metro's web target.
 *
 * Crediting parity: `creditFromProduct` mirrors the native variant so the
 * web preview (used as the public portfolio demo) lets visitors experience
 * the shop end-to-end. No real money changes hands; credit is persisted
 * to local storage only. The function shape matches the native variant
 * exactly so jest tests against purchases.web cover both paths.
 */
import { usePlayerStore } from '../store/playerStore';

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
  { id: 'com.isaaclefohn.chromadrop.coins500', title: 'Coin Pouch', description: '500 coins', price: '$0.99', type: 'consumable', reward: { type: 'coins', amount: 500 } },
  { id: 'com.isaaclefohn.chromadrop.coins2500', title: 'Coin Chest', description: '2,500 coins + 10 gems bonus', price: '$3.99', type: 'consumable', reward: { type: 'coins', amount: 2500, bonus: { gems: 10 } }, badge: 'best_value' },
  { id: 'com.isaaclefohn.chromadrop.coins10000', title: 'Coin Vault', description: '10,000 coins + 50 gems bonus', price: '$9.99', type: 'consumable', reward: { type: 'coins', amount: 10000, bonus: { gems: 50 } } },
  { id: 'com.isaaclefohn.chromadrop.coins50000', title: 'Coin Treasury', description: '50,000 coins + 200 gems bonus', price: '$39.99', type: 'consumable', reward: { type: 'coins', amount: 50000, bonus: { gems: 200 } } },
  { id: 'com.isaaclefohn.chromadrop.gems100', title: 'Gem Shard', description: '100 gems', price: '$1.99', type: 'consumable', reward: { type: 'gems', amount: 100 } },
  { id: 'com.isaaclefohn.chromadrop.gems500', title: 'Gem Trove', description: '500 gems + 1,000 coins bonus', price: '$7.99', type: 'consumable', reward: { type: 'gems', amount: 500, bonus: { coins: 1000 } }, badge: 'popular' },
  { id: 'com.isaaclefohn.chromadrop.gems1500', title: 'Gem Hoard', description: '1,500 gems + 5,000 coins bonus', price: '$19.99', type: 'consumable', reward: { type: 'gems', amount: 1500, bonus: { coins: 5000 } }, badge: 'best_value' },
  { id: 'com.isaaclefohn.chromadrop.starter_pack', title: 'Starter Pack', description: 'No ads + 2,000 coins, 200 gems, 3x each power-up', price: '$4.99', type: 'non_consumable', reward: { type: 'bundle', amount: 1, bonus: { coins: 2000, gems: 200, bomb: 3, rowClear: 3, colorClear: 3, adFree: 1 } }, badge: 'starter' },
  { id: 'com.isaaclefohn.chromadrop.power_bundle', title: 'Power Bundle', description: '10x Bomb, 10x Row Clear, 10x Color Clear', price: '$6.99', type: 'consumable', reward: { type: 'bundle', amount: 1, bonus: { bomb: 10, rowClear: 10, colorClear: 10 } } },
  { id: 'com.isaaclefohn.chromadrop.mega_bundle', title: 'Mega Bundle', description: '25,000 coins, 1,000 gems, 15x each power-up', price: '$24.99', type: 'consumable', reward: { type: 'bundle', amount: 1, bonus: { coins: 25000, gems: 1000, bomb: 15, rowClear: 15, colorClear: 15 } }, badge: 'best_value' },
  { id: 'com.isaaclefohn.chromadrop.remove_ads', title: 'Remove Ads', description: 'Permanently remove all ads', price: '$2.99', type: 'non_consumable', reward: { type: 'ad_free', amount: 1 } },
  { id: 'com.isaaclefohn.chromadrop.vip_pass', title: 'VIP Pass', description: 'No ads + 2x daily rewards + exclusive VIP theme', price: '$9.99', type: 'non_consumable', reward: { type: 'vip', amount: 1, bonus: { coins: 5000, gems: 500 } }, badge: 'popular' },
];

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === productId);
}

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

export function getPurchaseReward(productId: string): { type: string; amount: number } | null {
  const product = getProduct(productId);
  return product ? (product.reward as { type: string; amount: number }) : null;
}

/**
 * Web mirror of the native `creditFromProduct`. Same dispatch shape so
 * unit tests written against this file cover the credit logic for both
 * the real native implementation and the web demo path.
 */
export function creditFromProduct(productId: string): boolean {
  const product = getProduct(productId);
  if (!product) return false;
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
 * Web mirror of the native `applyEntitlementOnly`. Restore is a no-op on
 * web (the demo doesn't expose a Restore button surface), but keeping the
 * function present lets unit tests cover the entitlement-only branch
 * shape across both purchase variants.
 */
export function applyEntitlementOnly(productId: string): boolean {
  const product = getProduct(productId);
  if (!product) return false;
  if (product.type !== 'non_consumable') return false;
  const store = usePlayerStore.getState();
  const { reward } = product;

  if (reward.type === 'ad_free') {
    store.setAdFree(true);
    return true;
  }
  if (reward.type === 'vip') {
    store.setAdFree(true);
    return true;
  }
  if (reward.type === 'bundle') {
    if (reward.bonus?.adFree) {
      store.setAdFree(true);
    }
    return true;
  }
  return false;
}

export async function initializePurchases(): Promise<void> {
  return;
}

export async function teardownPurchases(): Promise<void> {
  return;
}

/**
 * Best-effort funnel event for the web demo. Lazy-required so tests
 * against this module (IapCrediting.test.ts) don't pull the analytics
 * → expo-crypto chain at import time. See native purchases.ts for the
 * full rationale.
 */
function track(name: string, data: Record<string, unknown>): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { trackEvent } = require('./analytics');
    trackEvent(name, data);
  } catch {
    /* best-effort */
  }
}

/**
 * Web preview "demo purchase" — no real money, no platform. Credits
 * immediately so the portfolio demo lets visitors experience the shop UX.
 * Local-storage persistence means the credit only affects the visitor's
 * own session, never the production iOS player base.
 */
export async function requestPurchase(productId: string): Promise<boolean> {
  console.warn('[IAP] web preview demo crediting', productId);
  const product = getProduct(productId);
  const price = product?.price;
  track('iap.purchase_initiated', { productId, price, source: 'web_demo' });
  const credited = creditFromProduct(productId);
  track(credited ? 'iap.purchase_credited' : 'iap.purchase_failed', {
    productId,
    price,
    source: 'web_demo',
    ...(credited ? {} : { reason: 'unknown_product' }),
  });
  return credited;
}

export async function restorePurchases(): Promise<string[]> {
  // Web preview has no platform-level purchases to restore.
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchStoreProducts(): Promise<any[]> {
  return [];
}

export async function validateReceipt(
  _jws: string,
  _productId: string,
  _transactionId?: string
): Promise<{ valid: boolean; credits?: { type: string; amount: number } }> {
  return { valid: false };
}
