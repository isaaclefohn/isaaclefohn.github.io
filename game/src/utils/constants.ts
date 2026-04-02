// Grid dimensions
export const DEFAULT_GRID_SIZE = 8;
export const LARGE_GRID_SIZE = 10;
export const CELL_SIZE = 40;
export const CELL_GAP = 3;
export const CELL_RADIUS = 8;

// Colors — vibrant, saturated palette for a premium puzzle game feel
export const COLORS = {
  // Block colors (index 1-7) — rich, saturated, eye-catching
  blocks: [
    '#FF3B5C', // Vivid Red
    '#00D4AA', // Electric Teal
    '#3B82F6', // Bright Blue
    '#22C55E', // Vibrant Green
    '#FACC15', // Bold Yellow
    '#A855F7', // Rich Purple
    '#FF6B2B', // Hot Orange
  ],
  // Lighter tints for highlights/glow
  blocksLight: [
    '#FF7A93', // Light Red
    '#5AEBD0', // Light Teal
    '#7CB3FF', // Light Blue
    '#6EE7A0', // Light Green
    '#FDE68A', // Light Yellow
    '#C999FB', // Light Purple
    '#FF9F6B', // Light Orange
  ],
  // Darker shades for shadows/depth
  blocksDark: [
    '#CC1A3A', // Dark Red
    '#009E7E', // Dark Teal
    '#1D5DC4', // Dark Blue
    '#15803D', // Dark Green
    '#CA9A06', // Dark Yellow
    '#7C2ED6', // Dark Purple
    '#CC4A10', // Dark Orange
  ],
  // UI colors — deep, rich, premium dark theme
  background: '#0F0E1A',
  backgroundGradientEnd: '#1A1830',
  surface: '#1C1B2E',
  surfaceLight: '#2A2845',
  surfaceBorder: '#33305A',
  accent: '#FF3B5C',
  accentLight: '#FF6B83',
  accentDark: '#CC1A3A',
  accentGold: '#FACC15',
  accentGoldLight: '#FDE68A',
  accentGoldDark: '#CA9A06',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B89A6',
  textMuted: '#5C5A75',
  gridEmpty: '#1E1D33',
  gridLine: '#2A2845',
  ghost: 'rgba(255, 255, 255, 0.12)',
  overlay: 'rgba(8, 7, 16, 0.85)',
  // Semantic
  success: '#22C55E',
  warning: '#FACC15',
  danger: '#FF3B5C',
  info: '#3B82F6',
} as const;

// Shadows
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;

// Scoring
export const BASE_POINTS_PER_CELL = 10;
export const COMBO_MULTIPLIERS = [1, 1.5, 2, 2.5, 3, 4, 5];
export const PLACEMENT_BONUS = 5;

// Animation durations (ms)
export const ANIM = {
  clearDuration: 350,
  comboDuration: 600,
  placeDuration: 200,
  scoreFlyDuration: 900,
  buttonPress: 100,
  modalSlideUp: 300,
  pieceSelect: 150,
  boardShake: 400,
  confettiDuration: 2000,
  counterTick: 50,
} as const;

// Game
export const PIECES_PER_TURN = 3;
export const MAX_PIECE_SIZE = 5;

// Level rewards
export const COIN_REWARDS = {
  oneStar: 10,
  twoStar: 25,
  threeStar: 50,
} as const;

// Spacing system
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border radii
export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
} as const;
