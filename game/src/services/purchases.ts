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
  type: 'consumable' | 'non_consumable';
  reward: {
    type: 'coins' | 'gems' | 'ad_free';
    amount: number;
  };
}

export const PRODUCTS: Product[] = [
  {
    id: 'com.blockblitz.coins500',
    title: 'Coin Pouch',
    description: '500 coins',
    price: '$0.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 500 },
  },
  {
    id: 'com.blockblitz.coins2000',
    title: 'Coin Chest',
    description: '2,000 coins',
    price: '$3.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 2000 },
  },
  {
    id: 'com.blockblitz.coins5000',
    title: 'Coin Vault',
    description: '5,000 coins',
    price: '$7.99',
    type: 'consumable',
    reward: { type: 'coins', amount: 5000 },
  },
  {
    id: 'com.blockblitz.gems50',
    title: 'Gem Shard',
    description: '50 gems',
    price: '$1.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 50 },
  },
  {
    id: 'com.blockblitz.gems200',
    title: 'Gem Cluster',
    description: '200 gems',
    price: '$6.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 200 },
  },
  {
    id: 'com.blockblitz.gems500',
    title: 'Gem Trove',
    description: '500 gems',
    price: '$14.99',
    type: 'consumable',
    reward: { type: 'gems', amount: 500 },
  },
  {
    id: 'com.blockblitz.adfree',
    title: 'Remove Ads',
    description: 'Permanently remove all ads',
    price: '$3.99',
    type: 'non_consumable',
    reward: { type: 'ad_free', amount: 1 },
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
