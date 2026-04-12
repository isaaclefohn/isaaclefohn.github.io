/**
 * Avatar customization system.
 * Players unlock avatar frames as they progress and can equip them
 * to show off on their profile and in leaderboards.
 */

export type AvatarUnlockType = 'default' | 'level' | 'stars' | 'achievement' | 'streak' | 'purchase';

export interface AvatarFrame {
  id: string;
  name: string;
  description: string;
  /** Icon name shown inside the frame */
  icon: string;
  /** Primary color of the frame */
  color: string;
  /** Border width in pixels */
  borderWidth: number;
  /** Rarity tier affecting visual effects */
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** How this avatar is unlocked */
  unlockType: AvatarUnlockType;
  /** Unlock value depending on type (level num, stars count, etc.) */
  unlockValue?: number;
  /** Cost to buy (if purchasable) */
  costGems?: number;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: 'default',
    name: 'Rookie',
    description: 'Your starting avatar',
    icon: 'star',
    color: '#94A3B8',
    borderWidth: 2,
    rarity: 'common',
    unlockType: 'default',
  },
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Reach level 5',
    icon: 'play',
    color: '#60A5FA',
    borderWidth: 2,
    rarity: 'common',
    unlockType: 'level',
    unlockValue: 5,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Reach level 25',
    icon: 'map',
    color: '#4ADE80',
    borderWidth: 2,
    rarity: 'common',
    unlockType: 'level',
    unlockValue: 25,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Reach level 50',
    icon: 'shield',
    color: '#C084FC',
    borderWidth: 3,
    rarity: 'rare',
    unlockType: 'level',
    unlockValue: 50,
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Reach level 100',
    icon: 'trophy',
    color: '#FACC15',
    borderWidth: 3,
    rarity: 'epic',
    unlockType: 'level',
    unlockValue: 100,
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Reach level 200',
    icon: 'crown',
    color: '#F59E0B',
    borderWidth: 4,
    rarity: 'legendary',
    unlockType: 'level',
    unlockValue: 200,
  },
  {
    id: 'star_collector',
    name: 'Star Collector',
    description: 'Earn 100 stars',
    icon: 'star',
    color: '#FACC15',
    borderWidth: 3,
    rarity: 'rare',
    unlockType: 'stars',
    unlockValue: 100,
  },
  {
    id: 'star_master',
    name: 'Star Master',
    description: 'Earn 300 stars',
    icon: 'sparkle',
    color: '#F87171',
    borderWidth: 3,
    rarity: 'epic',
    unlockType: 'stars',
    unlockValue: 300,
  },
  {
    id: 'streak_warrior',
    name: 'Streak Warrior',
    description: '7-day streak',
    icon: 'fire',
    color: '#F87171',
    borderWidth: 3,
    rarity: 'rare',
    unlockType: 'streak',
    unlockValue: 7,
  },
  {
    id: 'diamond',
    name: 'Diamond Elite',
    description: 'Premium purchase',
    icon: 'gem',
    color: '#22D3EE',
    borderWidth: 4,
    rarity: 'legendary',
    unlockType: 'purchase',
    costGems: 100,
  },
];

/** Check if an avatar is unlocked for a given player state */
export function isAvatarUnlocked(
  frame: AvatarFrame,
  state: {
    highestLevel: number;
    totalStars: number;
    longestStreak: number;
    ownedAvatars: string[];
  },
): boolean {
  if (frame.unlockType === 'default') return true;
  if (state.ownedAvatars.includes(frame.id)) return true;

  switch (frame.unlockType) {
    case 'level':
      return state.highestLevel >= (frame.unlockValue ?? 0);
    case 'stars':
      return state.totalStars >= (frame.unlockValue ?? 0);
    case 'streak':
      return state.longestStreak >= (frame.unlockValue ?? 0);
    default:
      return false;
  }
}

/** Get avatar frame by ID, falling back to default if not found */
export function getAvatarFrame(id: string): AvatarFrame {
  return AVATAR_FRAMES.find((a) => a.id === id) ?? AVATAR_FRAMES[0];
}

/** Get all avatars that are newly unlocked based on progress */
export function getNewlyUnlockedAvatars(
  previousState: {
    highestLevel: number;
    totalStars: number;
    longestStreak: number;
    ownedAvatars: string[];
  },
  currentState: {
    highestLevel: number;
    totalStars: number;
    longestStreak: number;
    ownedAvatars: string[];
  },
): AvatarFrame[] {
  return AVATAR_FRAMES.filter((frame) => {
    if (frame.unlockType === 'purchase' || frame.unlockType === 'default') return false;
    return (
      !isAvatarUnlocked(frame, previousState) &&
      isAvatarUnlocked(frame, currentState)
    );
  });
}
