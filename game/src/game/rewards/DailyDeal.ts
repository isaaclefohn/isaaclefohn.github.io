/**
 * Daily rotating shop deal system.
 * Each day offers one special discounted bundle, rotating through a pool.
 * Deals reset at midnight local time and encourage daily shop visits.
 */

export type DailyDealType = 'coin_pack' | 'gem_pack' | 'power_bundle' | 'mega_bundle' | 'starter_boost';

export interface DailyDeal {
  id: string;
  type: DailyDealType;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Cost in coins (or 0 if paid in gems) */
  costCoins: number;
  /** Cost in gems (or 0 if paid in coins) */
  costGems: number;
  /** Coins granted */
  coins: number;
  /** Gems granted */
  gems: number;
  /** Power-ups granted */
  powerUps: { bomb: number; rowClear: number; colorClear: number };
  /** Display discount percentage */
  discountPercent: number;
}

const DEAL_POOL: DailyDeal[] = [
  {
    id: 'coin_mega',
    type: 'coin_pack',
    name: 'Coin Mega Pack',
    description: 'Stock up on coins at a deep discount',
    icon: 'coin',
    color: '#FACC15',
    costCoins: 0,
    costGems: 15,
    coins: 1500,
    gems: 0,
    powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },
    discountPercent: 40,
  },
  {
    id: 'gem_mini',
    type: 'gem_pack',
    name: 'Gem Starter',
    description: 'Essential gems for a great price',
    icon: 'gem',
    color: '#60A5FA',
    costCoins: 800,
    costGems: 0,
    coins: 0,
    gems: 10,
    powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },
    discountPercent: 35,
  },
  {
    id: 'power_bomb',
    type: 'power_bundle',
    name: 'Bomb Squad',
    description: '5 bombs for the price of 3',
    icon: 'bomb',
    color: '#F87171',
    costCoins: 450,
    costGems: 0,
    coins: 0,
    gems: 0,
    powerUps: { bomb: 5, rowClear: 0, colorClear: 0 },
    discountPercent: 40,
  },
  {
    id: 'power_row',
    type: 'power_bundle',
    name: 'Row Clear Bundle',
    description: '4 row clears + bonus coins',
    icon: 'lightning',
    color: '#60A5FA',
    costCoins: 500,
    costGems: 0,
    coins: 200,
    gems: 0,
    powerUps: { bomb: 0, rowClear: 4, colorClear: 0 },
    discountPercent: 45,
  },
  {
    id: 'power_color',
    type: 'power_bundle',
    name: 'Color Bomb Pack',
    description: '3 color clears at half price',
    icon: 'palette',
    color: '#C084FC',
    costCoins: 0,
    costGems: 10,
    coins: 0,
    gems: 0,
    powerUps: { bomb: 0, rowClear: 0, colorClear: 3 },
    discountPercent: 50,
  },
  {
    id: 'mega_bundle',
    type: 'mega_bundle',
    name: 'Mega Bundle',
    description: 'Everything you need in one bundle',
    icon: 'gift',
    color: '#FACC15',
    costCoins: 0,
    costGems: 25,
    coins: 500,
    gems: 0,
    powerUps: { bomb: 2, rowClear: 2, colorClear: 2 },
    discountPercent: 55,
  },
  {
    id: 'starter_boost',
    type: 'starter_boost',
    name: 'Fresh Start',
    description: 'Coins, gems, and one of each power-up',
    icon: 'sparkle',
    color: '#4ADE80',
    costCoins: 600,
    costGems: 0,
    coins: 300,
    gems: 3,
    powerUps: { bomb: 1, rowClear: 1, colorClear: 1 },
    discountPercent: 30,
  },
];

/** Get today's date string as YYYY-MM-DD */
export function getTodayDealKey(): string {
  return new Date().toISOString().split('T')[0];
}

/** Compute a simple integer hash from a date string */
function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Get today's deal (deterministic rotation by date) */
export function getTodaysDeal(dateStr: string = getTodayDealKey()): DailyDeal {
  const hash = hashDate(dateStr);
  const index = hash % DEAL_POOL.length;
  return DEAL_POOL[index];
}

/** Check whether player has already claimed today's deal */
export function isDealClaimed(claimedDate: string | null, today: string = getTodayDealKey()): boolean {
  return claimedDate === today;
}

/** Format the remaining time until next deal refresh as HH:MM */
export function getDealCountdown(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diffMs = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}
