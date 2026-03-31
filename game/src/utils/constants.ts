// Grid dimensions
export const DEFAULT_GRID_SIZE = 8;
export const LARGE_GRID_SIZE = 10;
export const CELL_SIZE = 40;
export const CELL_GAP = 2;
export const CELL_RADIUS = 6;

// Colors
export const COLORS = {
  // Block colors (index 1-7)
  blocks: [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Purple
    '#FF8C42', // Orange
  ],
  // UI colors
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceLight: '#0f3460',
  accent: '#e94560',
  accentGold: '#f5c842',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  gridEmpty: '#2a2a4a',
  gridLine: '#3a3a5a',
  ghost: 'rgba(255, 255, 255, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

// Scoring
export const BASE_POINTS_PER_CELL = 10;
export const COMBO_MULTIPLIERS = [1, 1.5, 2, 2.5, 3, 4, 5];
export const PLACEMENT_BONUS = 5;

// Animation durations (ms)
export const ANIM = {
  clearDuration: 300,
  comboDuration: 500,
  placeDuration: 150,
  scoreFlyDuration: 800,
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
