/**
 * In-app purchase service.
 * Handles Apple IAP product definitions, purchase flow, and receipt validation.
 * Falls back gracefully when IAP is not available (e.g., simulator).
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

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
    description: '2,000 coins, 200 gems, 3x each power-up',
    price: '$4.99',
    type: 'non_consumable',
    reward: {
      type: 'bundle',
      amount: 1,
      bonus: { coins: 2000, gems: 200, bomb: 3, rowClear: 3, colorClear: 3 },
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
