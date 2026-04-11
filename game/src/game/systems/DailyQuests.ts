/**
 * Daily quest system.
 * 3 rotating objectives each day that give bonus coins/gems/XP when completed.
 * Uses day-based seeded selection for determinism.
 * Inspired by Fortnite/Brawl Stars daily quest rotation.
 */

import { SeededRandom, hashSeed } from '../../utils/seededRandom';

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Threshold to complete (e.g., score 5000 points) */
  target: number;
  /** What to track */
  trackingKey: QuestTrackingKey;
  reward: { coins?: number; gems?: number; xp?: number };
}

export type QuestTrackingKey =
  | 'score_earned'
  | 'lines_cleared'
  | 'levels_completed'
  | 'combos_achieved'
  | 'power_ups_used'
  | 'pieces_placed'
  | 'stars_earned';

/** Quest templates — pool of possible daily quests */
const QUEST_TEMPLATES: Omit<Quest, 'id'>[] = [
  { title: 'Score Chaser', description: 'Earn {target} points', icon: 'target', target: 3000, trackingKey: 'score_earned', reward: { coins: 30, xp: 25 } },
  { title: 'Score Master', description: 'Earn {target} points', icon: 'target', target: 8000, trackingKey: 'score_earned', reward: { coins: 60, gems: 2, xp: 50 } },
  { title: 'Line Buster', description: 'Clear {target} lines', icon: 'lightning', target: 10, trackingKey: 'lines_cleared', reward: { coins: 25, xp: 20 } },
  { title: 'Line Legend', description: 'Clear {target} lines', icon: 'lightning', target: 25, trackingKey: 'lines_cleared', reward: { coins: 50, gems: 2, xp: 40 } },
  { title: 'Level Rush', description: 'Complete {target} levels', icon: 'map', target: 3, trackingKey: 'levels_completed', reward: { coins: 40, xp: 30 } },
  { title: 'Marathon', description: 'Complete {target} levels', icon: 'map', target: 5, trackingKey: 'levels_completed', reward: { coins: 75, gems: 3, xp: 60 } },
  { title: 'Combo King', description: 'Get {target} combos', icon: 'fire', target: 5, trackingKey: 'combos_achieved', reward: { coins: 35, xp: 25 } },
  { title: 'Combo Madness', description: 'Get {target} combos', icon: 'fire', target: 12, trackingKey: 'combos_achieved', reward: { coins: 60, gems: 2, xp: 45 } },
  { title: 'Power Play', description: 'Use {target} power-ups', icon: 'bomb', target: 3, trackingKey: 'power_ups_used', reward: { coins: 30, xp: 20 } },
  { title: 'Builder', description: 'Place {target} pieces', icon: 'gamepad', target: 30, trackingKey: 'pieces_placed', reward: { coins: 25, xp: 20 } },
  { title: 'Architect', description: 'Place {target} pieces', icon: 'gamepad', target: 60, trackingKey: 'pieces_placed', reward: { coins: 50, gems: 1, xp: 35 } },
  { title: 'Star Collector', description: 'Earn {target} stars', icon: 'star', target: 5, trackingKey: 'stars_earned', reward: { coins: 40, xp: 30 } },
  { title: 'Star Hunter', description: 'Earn {target} stars', icon: 'star', target: 9, trackingKey: 'stars_earned', reward: { coins: 75, gems: 3, xp: 55 } },
];

/** Get today's date string */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get a day-based seed */
function getDaySeed(): number {
  const today = getToday();
  // Simple string hash for the date
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  return hashSeed(Math.abs(hash), 9973);
}

/** Generate today's 3 daily quests */
export function getDailyQuests(): Quest[] {
  const rng = new SeededRandom(getDaySeed());

  // Shuffle templates and pick 3, ensuring no duplicate tracking keys
  const shuffled = rng.shuffle([...QUEST_TEMPLATES]);
  const selected: Quest[] = [];
  const usedKeys = new Set<QuestTrackingKey>();

  for (const template of shuffled) {
    if (usedKeys.has(template.trackingKey)) continue;
    usedKeys.add(template.trackingKey);
    selected.push({
      ...template,
      id: `${getToday()}-${template.trackingKey}`,
      description: template.description.replace('{target}', template.target.toString()),
    });
    if (selected.length >= 3) break;
  }

  return selected;
}

/** Check if a quest is complete */
export function isQuestComplete(quest: Quest, progress: number): boolean {
  return progress >= quest.target;
}

/** Get progress percentage */
export function getQuestProgress(quest: Quest, progress: number): number {
  return Math.min(progress / quest.target, 1);
}
