/**
 * Collectible sticker/badge album system.
 * Players earn stickers from gameplay milestones, boss completions,
 * seasonal events, and rare achievements.
 * Completing album pages earns bonus rewards.
 * Inspired by Panini sticker collections and Pokemon card games.
 */

export interface Sticker {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  /** How to earn this sticker */
  source: string;
  /** Album page this belongs to */
  page: string;
}

export interface AlbumPage {
  id: string;
  name: string;
  icon: string;
  color: string;
  stickerIds: string[];
  /** Reward for completing the page */
  reward: { coins: number; gems: number };
}

export const RARITY_COLORS = {
  common: '#94A3B8',
  uncommon: '#4ADE80',
  rare: '#60A5FA',
  epic: '#C084FC',
  legendary: '#FACC15',
} as const;

/** All stickers in the game */
export const STICKERS: Sticker[] = [
  // Page: Getting Started
  { id: 'first_clear', name: 'First Clear', description: 'Clear your first line', icon: 'star', rarity: 'common', source: 'Clear 1 line', page: 'getting_started' },
  { id: 'first_combo', name: 'First Combo', description: 'Get your first combo', icon: 'fire', rarity: 'common', source: 'Get a 2x combo', page: 'getting_started' },
  { id: 'level_5', name: 'Level 5', description: 'Complete level 5', icon: 'map', rarity: 'common', source: 'Reach level 5', page: 'getting_started' },
  { id: 'first_3star', name: 'Perfect Start', description: 'Get 3 stars on any level', icon: 'sparkle', rarity: 'uncommon', source: '3-star any level', page: 'getting_started' },

  // Page: Combos
  { id: 'combo_3x', name: 'Combo x3', description: 'Get a 3x combo', icon: 'fire', rarity: 'uncommon', source: 'Get a 3x combo', page: 'combos' },
  { id: 'combo_5x', name: 'Combo x5', description: 'Get a 5x combo', icon: 'fire', rarity: 'rare', source: 'Get a 5x combo', page: 'combos' },
  { id: 'combo_7x', name: 'Combo Master', description: 'Get a 7x combo', icon: 'fire', rarity: 'epic', source: 'Get a 7x combo', page: 'combos' },
  { id: 'combo_10x', name: 'Combo God', description: 'Get a 10x combo', icon: 'crown', rarity: 'legendary', source: 'Get a 10x combo', page: 'combos' },

  // Page: Explorer
  { id: 'world_2', name: 'Crystal Caves', description: 'Reach World 2', icon: 'gem', rarity: 'uncommon', source: 'Complete level 50', page: 'explorer' },
  { id: 'world_3', name: 'Neon City', description: 'Reach World 3', icon: 'lightning', rarity: 'uncommon', source: 'Complete level 100', page: 'explorer' },
  { id: 'world_5', name: 'Halfway', description: 'Reach World 5', icon: 'trophy', rarity: 'rare', source: 'Complete level 200', page: 'explorer' },
  { id: 'world_10', name: 'Final World', description: 'Reach World 10', icon: 'crown', rarity: 'legendary', source: 'Complete level 450', page: 'explorer' },

  // Page: Boss Hunter
  { id: 'boss_1', name: 'First Boss', description: 'Defeat boss at level 25', icon: 'bomb', rarity: 'uncommon', source: 'Beat level 25', page: 'boss_hunter' },
  { id: 'boss_4', name: 'Boss Slayer', description: 'Defeat 4 bosses', icon: 'bomb', rarity: 'rare', source: 'Beat 4 boss levels', page: 'boss_hunter' },
  { id: 'boss_10', name: 'Boss Master', description: 'Defeat 10 bosses', icon: 'crown', rarity: 'epic', source: 'Beat 10 boss levels', page: 'boss_hunter' },
  { id: 'boss_20', name: 'Boss Legend', description: 'Defeat all 20 bosses', icon: 'crown', rarity: 'legendary', source: 'Beat all boss levels', page: 'boss_hunter' },

  // Page: Dedication
  { id: 'streak_7', name: 'Week Warrior', description: '7-day streak', icon: 'fire', rarity: 'uncommon', source: '7 consecutive days', page: 'dedication' },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day streak', icon: 'fire', rarity: 'rare', source: '30 consecutive days', page: 'dedication' },
  { id: 'games_100', name: 'Centurion', description: 'Play 100 games', icon: 'gamepad', rarity: 'rare', source: 'Play 100 total games', page: 'dedication' },
  { id: 'score_1m', name: 'Millionaire', description: 'Earn 1 million total score', icon: 'star', rarity: 'epic', source: '1M lifetime score', page: 'dedication' },

  // Page: Seasonal
  { id: 'holiday_player', name: 'Holiday Spirit', description: 'Play during holiday season', icon: 'star', rarity: 'rare', source: 'Play Dec 1 - Jan 5', page: 'seasonal' },
  { id: 'halloween_player', name: 'Spooky Season', description: 'Play during Halloween', icon: 'sparkle', rarity: 'rare', source: 'Play Oct 15 - Nov 2', page: 'seasonal' },
  { id: 'valentine_player', name: 'Love Blast', description: "Play on Valentine's Day", icon: 'sparkle', rarity: 'rare', source: 'Play Feb 14', page: 'seasonal' },
  { id: 'all_seasons', name: 'All Seasons', description: 'Play during every seasonal event', icon: 'crown', rarity: 'legendary', source: 'Collect all seasonal stickers', page: 'seasonal' },
];

/** Album pages */
export const ALBUM_PAGES: AlbumPage[] = [
  { id: 'getting_started', name: 'Getting Started', icon: 'star', color: '#4ADE80', stickerIds: ['first_clear', 'first_combo', 'level_5', 'first_3star'], reward: { coins: 50, gems: 3 } },
  { id: 'combos', name: 'Combo Collection', icon: 'fire', color: '#FF3B5C', stickerIds: ['combo_3x', 'combo_5x', 'combo_7x', 'combo_10x'], reward: { coins: 200, gems: 10 } },
  { id: 'explorer', name: 'World Explorer', icon: 'map', color: '#3B82F6', stickerIds: ['world_2', 'world_3', 'world_5', 'world_10'], reward: { coins: 300, gems: 15 } },
  { id: 'boss_hunter', name: 'Boss Hunter', icon: 'bomb', color: '#FACC15', stickerIds: ['boss_1', 'boss_4', 'boss_10', 'boss_20'], reward: { coins: 500, gems: 25 } },
  { id: 'dedication', name: 'Dedication', icon: 'trophy', color: '#A855F7', stickerIds: ['streak_7', 'streak_30', 'games_100', 'score_1m'], reward: { coins: 400, gems: 20 } },
  { id: 'seasonal', name: 'Seasonal', icon: 'sparkle', color: '#FF6B2B', stickerIds: ['holiday_player', 'halloween_player', 'valentine_player', 'all_seasons'], reward: { coins: 300, gems: 15 } },
];

/** Check sticker unlock conditions based on player state */
export function checkStickerUnlocks(state: {
  highestLevel: number;
  totalLinesCleared: number;
  bestCombo: number;
  totalGamesPlayed: number;
  longestStreak: number;
  totalScore: number;
  collectedStickers: string[];
}): string[] {
  const newStickers: string[] = [];
  const has = (id: string) => state.collectedStickers.includes(id);

  if (!has('first_clear') && state.totalLinesCleared >= 1) newStickers.push('first_clear');
  if (!has('first_combo') && state.bestCombo >= 2) newStickers.push('first_combo');
  if (!has('level_5') && state.highestLevel >= 5) newStickers.push('level_5');
  if (!has('combo_3x') && state.bestCombo >= 3) newStickers.push('combo_3x');
  if (!has('combo_5x') && state.bestCombo >= 5) newStickers.push('combo_5x');
  if (!has('combo_7x') && state.bestCombo >= 7) newStickers.push('combo_7x');
  if (!has('combo_10x') && state.bestCombo >= 10) newStickers.push('combo_10x');
  if (!has('world_2') && state.highestLevel >= 50) newStickers.push('world_2');
  if (!has('world_3') && state.highestLevel >= 100) newStickers.push('world_3');
  if (!has('world_5') && state.highestLevel >= 200) newStickers.push('world_5');
  if (!has('world_10') && state.highestLevel >= 450) newStickers.push('world_10');
  if (!has('boss_1') && state.highestLevel >= 25) newStickers.push('boss_1');
  if (!has('boss_4') && state.highestLevel >= 100) newStickers.push('boss_4');
  if (!has('boss_10') && state.highestLevel >= 250) newStickers.push('boss_10');
  if (!has('boss_20') && state.highestLevel >= 500) newStickers.push('boss_20');
  if (!has('streak_7') && state.longestStreak >= 7) newStickers.push('streak_7');
  if (!has('streak_30') && state.longestStreak >= 30) newStickers.push('streak_30');
  if (!has('games_100') && state.totalGamesPlayed >= 100) newStickers.push('games_100');
  if (!has('score_1m') && state.totalScore >= 1000000) newStickers.push('score_1m');

  return newStickers;
}

/** Check if an album page is complete */
export function isPageComplete(pageId: string, collectedStickers: string[]): boolean {
  const page = ALBUM_PAGES.find(p => p.id === pageId);
  if (!page) return false;
  return page.stickerIds.every(id => collectedStickers.includes(id));
}

/** Get collection stats */
export function getCollectionStats(collectedStickers: string[]): {
  total: number;
  collected: number;
  pagesComplete: number;
  totalPages: number;
} {
  return {
    total: STICKERS.length,
    collected: collectedStickers.length,
    pagesComplete: ALBUM_PAGES.filter(p => isPageComplete(p.id, collectedStickers)).length,
    totalPages: ALBUM_PAGES.length,
  };
}
