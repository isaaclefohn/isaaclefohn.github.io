/**
 * Theme manager for cosmetic customization.
 * Controls block colors, backgrounds, and visual style.
 */

export interface GameTheme {
  id: string;
  name: string;
  blockColors: string[];
  background: string;
  surface: string;
  gridEmpty: string;
  accent: string;
  price: number; // In gems, 0 = free/default
}

export const THEMES: Record<string, GameTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    blockColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C42'],
    background: '#1a1a2e',
    surface: '#16213e',
    gridEmpty: '#2a2a4a',
    accent: '#e94560',
    price: 0,
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    blockColors: ['#FF0080', '#00FF80', '#0080FF', '#FF8000', '#8000FF', '#00FFFF', '#FFFF00'],
    background: '#0a0a1a',
    surface: '#0d0d2b',
    gridEmpty: '#1a1a3a',
    accent: '#FF0080',
    price: 100,
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    blockColors: ['#E07A5F', '#81B29A', '#3D405B', '#F2CC8F', '#588157', '#BC6C25', '#DDA15E'],
    background: '#1B2D2A',
    surface: '#243B36',
    gridEmpty: '#2D4A44',
    accent: '#E07A5F',
    price: 100,
  },
  space: {
    id: 'space',
    name: 'Space',
    blockColors: ['#C084FC', '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#FB923C'],
    background: '#0C0A1D',
    surface: '#1A1535',
    gridEmpty: '#251F4A',
    accent: '#C084FC',
    price: 100,
  },
};

export function getTheme(themeId: string): GameTheme {
  return THEMES[themeId] || THEMES.classic;
}
