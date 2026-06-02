/**
 * Gift Box surprise reward system.
 * Gift boxes randomly appear on the home screen and after level completions.
 * Contains randomized rewards: coins, gems, power-ups.
 * Uses seeded RNG per day so gift timing is deterministic.
 */

import { SeededRandom, hashSeed } from '../../utils/seededRandom';
import { getLocalToday } from '../../utils/dates';

export interface GiftReward {
  type: 'coins' | 'gems' | 'powerup';
  amount: number;
  itemId?: string;
}

export interface GiftBox {
  id: string;
  rewards: GiftReward[];
  label: string;
  rarity: 'common' | 'rare' | 'epic';
}

/** Rarity weights and colors */
export const GIFT_RARITIES = {
  common: { weight: 70, color: '#4ADE80', label: 'Gift Box' },
  rare: { weight: 25, color: '#60A5FA', label: 'Rare Gift' },
  epic: { weight: 5, color: '#C084FC', label: 'Epic Gift' },
} as const;

/** Check if a gift box should appear today based on player level and day seed */
export function shouldShowGift(highestLevel: number, gamesPlayedToday: number, lastGiftDate: string | null): boolean {
  if (highestLevel < 3) return false; // Don't overwhelm new players

  const today = getLocalToday();
  if (lastGiftDate === today) return false; // One gift per day max

  // Gift appears after 2+ games played today
  return gamesPlayedToday >= 2;
}

/** Generate a gift box with random rewards */
export function generateGiftBox(highestLevel: number, seed?: number): GiftBox {
  const rng = new SeededRandom(seed ?? Date.now());

  // Determine rarity
  const roll = rng.nextInt(1, 100);
  let rarity: 'common' | 'rare' | 'epic';
  if (roll <= GIFT_RARITIES.epic.weight) {
    rarity = 'epic';
  } else if (roll <= GIFT_RARITIES.epic.weight + GIFT_RARITIES.rare.weight) {
    rarity = 'rare';
  } else {
    rarity = 'common';
  }

  const rewards: GiftReward[] = [];
  const info = GIFT_RARITIES[rarity];

  switch (rarity) {
    case 'common':
      rewards.push({ type: 'coins', amount: rng.nextInt(15, 40) });
      break;
    case 'rare':
      rewards.push({ type: 'coins', amount: rng.nextInt(30, 80) });
      if (rng.next() > 0.5) {
        rewards.push({ type: 'gems', amount: rng.nextInt(1, 3) });
      } else {
        const powerups = ['bomb', 'rowClear', 'colorClear'];
        rewards.push({ type: 'powerup', amount: 1, itemId: rng.pick(powerups) });
      }
      break;
    case 'epic':
      rewards.push({ type: 'coins', amount: rng.nextInt(75, 150) });
      rewards.push({ type: 'gems', amount: rng.nextInt(3, 8) });
      if (rng.next() > 0.4) {
        const powerups = ['bomb', 'rowClear', 'colorClear'];
        rewards.push({ type: 'powerup', amount: rng.nextInt(1, 2), itemId: rng.pick(powerups) });
      }
      break;
  }

  // Scale rewards slightly with player progress
  const progressMultiplier = 1 + Math.min(highestLevel / 200, 0.5);
  for (const r of rewards) {
    if (r.type === 'coins') {
      r.amount = Math.round(r.amount * progressMultiplier);
    }
  }

  return {
    id: `gift-${Date.now()}-${rng.nextInt(1000, 9999)}`,
    rewards,
    label: info.label,
    rarity,
  };
}

/** Format gift reward for display */
export function formatGiftReward(reward: GiftReward): string {
  switch (reward.type) {
    case 'coins':
      return `${reward.amount} Coins`;
    case 'gems':
      return `${reward.amount} Gems`;
    case 'powerup': {
      const names: Record<string, string> = {
        bomb: 'Bomb',
        rowClear: 'Row Clear',
        colorClear: 'Color Clear',
      };
      return `${reward.amount}x ${names[reward.itemId ?? ''] ?? 'Power-Up'}`;
    }
  }
}
