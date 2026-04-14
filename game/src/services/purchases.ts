/**
 * In-app purchase service.
 * Handles Apple IAP product definitions, purchase flow, and receipt validation.
 * Falls back gracefully when IAP is not available (e.g., Expo Go, simulator).
 */

import Constants from 'expo-constants';

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
        try {
          await validateReceipt(receipt, purchase.productId);
        } finally {
          try {
            await IAP.finishTransaction({ purchase, isConsumable: true });
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
 * Kick off a purchase flow for the given product ID. Resolves when the
 * platform has received the request — the actual credit happens inside
 * the purchaseUpdatedListener after successful receipt validation.
 */
export async function requestPurchase(productId: string): Promise<boolean> {
  if (isExpoGo || !loadIAP() || !IAP) {
    console.warn('[IAP] not available, cannot purchase', productId);
    return false;
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
    id: 'com.isaaclefohn.colorblockblast.coins500',
    title: 'Coin Pouch',
    description: '500 coins',
    price: '$0.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 500 },
  },
  {
    id: 'com.isaaclefohn.colorblockblast.coins2500',
    title: 'Coin Chest',
    description: '2,500 coins + 10 gems bonus',
    price: '$3.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 2500, bonus: { gems: 10 } },
    badge: 'best_value',
  },
  {
    id: 'com.isaaclefohn.colorblockblast.coins10000',
    title: 'Coin Vault',
    description: '10,000 coins + 50 gems bonus',
    price: '$9.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 10000, bonus: { gems: 50 } },
  },
  {
    id: 'com.isaaclefohn.colorblockblast.coins50000',
    title: 'Coin Treasury',
    description: '50,000 coins + 200 gems bonus',
    price: '$39.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 50000, bonus: { gems: 200 } },
  },

  // ─── Gem Packs ─────────────────────────────────────────────────
  {
    id: 'com.isaaclefohn.colorblockblast.gems100',
    title: 'Gem Shard',
    description: '100 gems',
    price: '$1.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 100 },
  },
  {
    id: 'com.isaaclefohn.colorblockblast.gems500',
    title: 'Gem Trove',
    description: '500 gems + 1,000 coins bonus',
    price: '$7.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 500, bonus: { coins: 1000 } },
    badge: 'popular',
  },
  {
    id: 'com.isaaclefohn.colorblockblast.gems1500',
    title: 'Gem Hoard',
    description: '1,500 gems + 5,000 coins bonus',
    price: '$19.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 1500, bonus: { coins: 5000 } },
    badge: 'best_value',
  },

  // ─── Bundles ───────────────────────────────────────────────────
  {
    id: 'com.isaaclefohn.colorblockblast.starter_pack',
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
    id: 'com.isaaclefohn.colorblockblast.power_bundle',
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
    id: 'com.isaaclefohn.colorblockblast.mega_bundle',
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
  {
    id: 'com.isaaclefohn.colorblockblast.adfree',
    title: 'Remove Ads',
    description: 'Permanently remove all ads',
    price: '$3.99',
    type: 'non_consumable',
    reward: { type: 'ad_free', amount: 1 },
  },
  {
    id: 'com.isaaclefohn.colorblockblast.vip_pass',
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
