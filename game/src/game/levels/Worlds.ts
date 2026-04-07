/**
 * World definitions for themed level zones.
 * 10 worlds of 50 levels each, with unique names, colors, and icons.
 * Each world introduces a thematic visual identity and difficulty tier.
 */

import { COLORS } from '../../utils/constants';

export interface World {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  colorLight: string;
  levelStart: number;
  levelEnd: number;
}

export const WORLDS: World[] = [
  {
    id: 1,
    name: 'Sunrise Meadow',
    subtitle: 'Learn the basics',
    icon: 'star',
    color: COLORS.blocks[3],  // Green
    colorLight: '#D1FAE5',
    levelStart: 1,
    levelEnd: 50,
  },
  {
    id: 2,
    name: 'Crystal Caves',
    subtitle: 'Things get tricky',
    icon: 'gem',
    color: COLORS.blocks[2],  // Blue
    colorLight: '#DBEAFE',
    levelStart: 51,
    levelEnd: 100,
  },
  {
    id: 3,
    name: 'Ember Peaks',
    subtitle: 'Heat up the challenge',
    icon: 'fire',
    color: COLORS.blocks[0],  // Red
    colorLight: '#FFE4E6',
    levelStart: 101,
    levelEnd: 150,
  },
  {
    id: 4,
    name: 'Mystic Forest',
    subtitle: 'Deep in the woods',
    icon: 'map',
    color: COLORS.blocks[5],  // Purple
    colorLight: '#F3E8FF',
    levelStart: 151,
    levelEnd: 200,
  },
  {
    id: 5,
    name: 'Golden Temple',
    subtitle: 'Ancient puzzles await',
    icon: 'crown',
    color: COLORS.blocks[4],  // Yellow
    colorLight: '#FEF3C7',
    levelStart: 201,
    levelEnd: 250,
  },
  {
    id: 6,
    name: 'Frost Summit',
    subtitle: 'The cold never bothered you',
    icon: 'sparkle',
    color: COLORS.blocks[1],  // Teal
    colorLight: '#CCFBF1',
    levelStart: 251,
    levelEnd: 300,
  },
  {
    id: 7,
    name: 'Volcanic Core',
    subtitle: 'Intensity rises',
    icon: 'bomb',
    color: COLORS.blocks[6],  // Orange
    colorLight: '#FFEDD5',
    levelStart: 301,
    levelEnd: 350,
  },
  {
    id: 8,
    name: 'Celestial Tower',
    subtitle: 'Reaching for the stars',
    icon: 'lightning',
    color: COLORS.blocks[2],  // Blue
    colorLight: '#E0E7FF',
    levelStart: 351,
    levelEnd: 400,
  },
  {
    id: 9,
    name: 'Shadow Realm',
    subtitle: 'Only the best survive',
    icon: 'target',
    color: COLORS.blocks[5],  // Purple
    colorLight: '#EDE9FE',
    levelStart: 401,
    levelEnd: 450,
  },
  {
    id: 10,
    name: 'Infinity Spire',
    subtitle: 'The ultimate challenge',
    icon: 'trophy',
    color: COLORS.accentGold,
    colorLight: '#FEF9C3',
    levelStart: 451,
    levelEnd: 500,
  },
];

/** Get the world a level belongs to */
export function getWorldForLevel(level: number): World {
  const index = Math.min(Math.floor((level - 1) / 50), WORLDS.length - 1);
  return WORLDS[index];
}

/** Get all worlds */
export function getAllWorlds(): World[] {
  return WORLDS;
}

/** Check if a world is unlocked based on highest level reached */
export function isWorldUnlocked(world: World, highestLevel: number): boolean {
  return highestLevel >= world.levelStart - 1;
}
