/**
 * Theme manager for cosmetic customization.
 * Controls block colors, backgrounds, and visual style.
 * Expanded with premium themes and block skin support.
 */

export interface GameTheme {
  id: string;
  name: string;
  emoji: string;
  blockColors: string[];
  blockColorsLight: string[];
  blockColorsDark: string[];
  background: string;
  surface: string;
  gridEmpty: string;
  accent: string;
  price: number; // In gems, 0 = free/default
  category: 'free' | 'premium' | 'seasonal' | 'exclusive';
}

export interface BlockSkin {
  id: string;
  name: string;
  emoji: string;
  style: 'flat' | 'glossy' | 'matte' | 'pixel' | 'glass' | 'neon-glow' | 'wooden';
  borderWidth: number;
  borderRadius: number;
  highlightOpacity: number;
  innerGlowOpacity: number;
  price: number; // In gems
}

export const THEMES: Record<string, GameTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    emoji: '🎮',
    blockColors: ['#FF3B5C', '#00D4AA', '#3B82F6', '#22C55E', '#FACC15', '#A855F7', '#FF6B2B'],
    blockColorsLight: ['#FF7A93', '#5AEBD0', '#7CB3FF', '#6EE7A0', '#FDE68A', '#C999FB', '#FF9F6B'],
    blockColorsDark: ['#CC1A3A', '#009E7E', '#1D5DC4', '#15803D', '#CA9A06', '#7C2ED6', '#CC4A10'],
    background: '#0F0E1A',
    surface: '#1C1B2E',
    gridEmpty: '#1E1D33',
    accent: '#FF3B5C',
    price: 0,
    category: 'free',
  },
  neon: {
    id: 'neon',
    name: 'Neon Nights',
    emoji: '💡',
    blockColors: ['#FF0080', '#00FF80', '#0080FF', '#FF8000', '#8000FF', '#00FFFF', '#FFFF00'],
    blockColorsLight: ['#FF4DA6', '#4DFF9F', '#4DA6FF', '#FFA64D', '#A64DFF', '#4DFFFF', '#FFFF4D'],
    blockColorsDark: ['#CC0066', '#00CC66', '#0066CC', '#CC6600', '#6600CC', '#00CCCC', '#CCCC00'],
    background: '#0a0a1a',
    surface: '#0d0d2b',
    gridEmpty: '#1a1a3a',
    accent: '#FF0080',
    price: 150,
    category: 'premium',
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',
    emoji: '🌊',
    blockColors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#22D3EE', '#38BDF8', '#7DD3FC', '#67E8F9'],
    blockColorsLight: ['#5CC8F0', '#4DD4E0', '#5CD4CA', '#5CE0F0', '#6DD4F9', '#A3E2FD', '#93EFFA'],
    blockColorsDark: ['#0977AD', '#0490A8', '#0E9082', '#18A8BF', '#2A97C9', '#5EAACC', '#4DBDCA'],
    background: '#0A1628',
    surface: '#0F2035',
    gridEmpty: '#152A42',
    accent: '#0EA5E9',
    price: 150,
    category: 'premium',
  },
  sunset: {
    id: 'sunset',
    name: 'Golden Sunset',
    emoji: '🌅',
    blockColors: ['#F97316', '#EF4444', '#EC4899', '#F59E0B', '#FB923C', '#FBBF24', '#F43F5E'],
    blockColorsLight: ['#FB9A55', '#F37979', '#F17DB8', '#F7B84D', '#FCB06B', '#FCD15C', '#F77088'],
    blockColorsDark: ['#C95B0E', '#C03636', '#BD3A7A', '#C47E09', '#C97430', '#C9981C', '#C3324C'],
    background: '#1A0F0A',
    surface: '#2E1A10',
    gridEmpty: '#3A2218',
    accent: '#F97316',
    price: 150,
    category: 'premium',
  },
  nature: {
    id: 'nature',
    name: 'Forest',
    emoji: '🌿',
    blockColors: ['#22C55E', '#16A34A', '#4ADE80', '#86EFAC', '#A3E635', '#84CC16', '#10B981'],
    blockColorsLight: ['#5CD882', '#4DB870', '#74E89F', '#A8F3C3', '#BDEF6B', '#A0D84D', '#4DD3A0'],
    blockColorsDark: ['#179E4B', '#11823B', '#39B266', '#6BC08A', '#82B82A', '#699F12', '#0D9468'],
    background: '#0A1A10',
    surface: '#102E1A',
    gridEmpty: '#163A22',
    accent: '#22C55E',
    price: 150,
    category: 'premium',
  },
  space: {
    id: 'space',
    name: 'Cosmic',
    emoji: '🚀',
    blockColors: ['#C084FC', '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#FB923C'],
    blockColorsLight: ['#D4A6FD', '#8CBDFC', '#6DE2B8', '#F79DCE', '#FCD15C', '#C0ABFB', '#FCB06B'],
    blockColorsDark: ['#9A6ACA', '#4C84C8', '#2AA87A', '#C35B92', '#C9981C', '#8670C8', '#C97430'],
    background: '#0C0A1D',
    surface: '#1A1535',
    gridEmpty: '#251F4A',
    accent: '#C084FC',
    price: 150,
    category: 'premium',
  },
  candy: {
    id: 'candy',
    name: 'Candy Pop',
    emoji: '🍬',
    blockColors: ['#FF69B4', '#FF1493', '#FFB6C1', '#FF6EC7', '#DA70D6', '#BA55D3', '#FF82AB'],
    blockColorsLight: ['#FF8FCA', '#FF4DAE', '#FFCDD6', '#FF90D5', '#E394E0', '#CA7BDE', '#FF9FBE'],
    blockColorsDark: ['#CC5490', '#CC1076', '#CC929A', '#CC589F', '#AE5AAB', '#954498', '#CC6889'],
    background: '#1A0A18',
    surface: '#2E1530',
    gridEmpty: '#3A1E3D',
    accent: '#FF69B4',
    price: 200,
    category: 'premium',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    blockColors: ['#6366F1', '#818CF8', '#A5B4FC', '#4F46E5', '#7C3AED', '#8B5CF6', '#C4B5FD'],
    blockColorsLight: ['#8688F4', '#9DAAF9', '#BDC9FD', '#756EEA', '#9A68F2', '#A580F8', '#D4C9FE'],
    blockColorsDark: ['#4F52C1', '#6770C6', '#8490CA', '#3F38B8', '#6330BD', '#704AC5', '#9D90CA'],
    background: '#0A0A1E',
    surface: '#141432',
    gridEmpty: '#1E1E46',
    accent: '#6366F1',
    price: 200,
    category: 'premium',
  },
  cherry: {
    id: 'cherry',
    name: 'Cherry Blossom',
    emoji: '🌸',
    blockColors: ['#F9A8D4', '#F472B6', '#EC4899', '#DB2777', '#BE185D', '#FB7185', '#FDA4AF'],
    blockColorsLight: ['#FBC4E1', '#F795CA', '#F074AF', '#E25898', '#CF4D82', '#FC969E', '#FDB8C1'],
    blockColorsDark: ['#C786AA', '#C35B92', '#BD3A7A', '#AF1F5F', '#98134A', '#C95A6A', '#CA838C'],
    background: '#1A0E14',
    surface: '#2E1824',
    gridEmpty: '#3A2030',
    accent: '#EC4899',
    price: 250,
    category: 'seasonal',
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Frost',
    emoji: '❄️',
    blockColors: ['#E0F2FE', '#BAE6FD', '#7DD3FC', '#38BDF8', '#0EA5E9', '#A5F3FC', '#CFFAFE'],
    blockColorsLight: ['#EBF6FF', '#CCF0FE', '#99DFFD', '#66CFF9', '#44B8EE', '#BEF6FD', '#DDFCFF'],
    blockColorsDark: ['#B4C2CB', '#95B9CA', '#64A9CA', '#2D97C5', '#0B84BA', '#85C3CA', '#A5C8CC'],
    background: '#0A1620',
    surface: '#10203A',
    gridEmpty: '#182A48',
    accent: '#38BDF8',
    price: 250,
    category: 'seasonal',
  },
};

export const BLOCK_SKINS: Record<string, BlockSkin> = {
  default: {
    id: 'default',
    name: 'Classic',
    emoji: '🟦',
    style: 'glossy',
    borderWidth: 2,
    borderRadius: 8,
    highlightOpacity: 0.35,
    innerGlowOpacity: 0.15,
    price: 0,
  },
  flat: {
    id: 'flat',
    name: 'Flat',
    emoji: '⬜',
    style: 'flat',
    borderWidth: 0,
    borderRadius: 6,
    highlightOpacity: 0,
    innerGlowOpacity: 0,
    price: 50,
  },
  matte: {
    id: 'matte',
    name: 'Matte',
    emoji: '🧊',
    style: 'matte',
    borderWidth: 1,
    borderRadius: 6,
    highlightOpacity: 0.1,
    innerGlowOpacity: 0.05,
    price: 75,
  },
  pixel: {
    id: 'pixel',
    name: 'Pixel',
    emoji: '👾',
    style: 'pixel',
    borderWidth: 2,
    borderRadius: 2,
    highlightOpacity: 0.2,
    innerGlowOpacity: 0,
    price: 100,
  },
  glass: {
    id: 'glass',
    name: 'Glass',
    emoji: '💎',
    style: 'glass',
    borderWidth: 1,
    borderRadius: 10,
    highlightOpacity: 0.5,
    innerGlowOpacity: 0.25,
    price: 150,
  },
  neonGlow: {
    id: 'neonGlow',
    name: 'Neon Glow',
    emoji: '✨',
    style: 'neon-glow',
    borderWidth: 2,
    borderRadius: 8,
    highlightOpacity: 0.4,
    innerGlowOpacity: 0.3,
    price: 200,
  },
  wooden: {
    id: 'wooden',
    name: 'Wooden',
    emoji: '🪵',
    style: 'wooden',
    borderWidth: 2,
    borderRadius: 4,
    highlightOpacity: 0.15,
    innerGlowOpacity: 0.05,
    price: 100,
  },
};

export function getTheme(themeId: string): GameTheme {
  return THEMES[themeId] || THEMES.classic;
}

export function getBlockSkin(skinId: string): BlockSkin {
  return BLOCK_SKINS[skinId] || BLOCK_SKINS.default;
}

export function getThemesByCategory(category: GameTheme['category']): GameTheme[] {
  return Object.values(THEMES).filter((t) => t.category === category);
}
