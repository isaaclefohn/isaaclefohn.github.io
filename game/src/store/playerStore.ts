/**
 * Zustand store for persistent player data.
 * Persisted to AsyncStorage, synced to Supabase when available.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlayerStore {
  // Profile
  displayName: string;
  coins: number;
  gems: number;
  adFree: boolean;

  // Progress
  highestLevel: number;
  levelStars: Record<number, number>;
  levelHighScores: Record<number, number>;
  totalScore: number;
  totalLinesCleared: number;

  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string | null;

  // Inventory
  equippedTheme: string;
  equippedBlockSkin: string;
  powerUps: {
    bomb: number;
    rowClear: number;
    colorClear: number;
  };

  // Actions
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  completeLevel: (level: number, stars: number, score: number, linesCleared: number) => void;
  setAdFree: (adFree: boolean) => void;
  addPowerUp: (type: 'bomb' | 'rowClear' | 'colorClear', count: number) => void;
  usePowerUp: (type: 'bomb' | 'rowClear' | 'colorClear') => boolean;
  equipTheme: (themeId: string) => void;
  equipBlockSkin: (skinId: string) => void;
  updateStreak: () => void;
  setDisplayName: (name: string) => void;
}

const getToday = () => new Date().toISOString().split('T')[0];

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // Defaults
      displayName: 'Player',
      coins: 0,
      gems: 0,
      adFree: false,
      highestLevel: 0,
      levelStars: {},
      levelHighScores: {},
      totalScore: 0,
      totalLinesCleared: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayDate: null,
      equippedTheme: 'classic',
      equippedBlockSkin: 'default',
      powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },

      addCoins: (amount) =>
        set((s) => ({ coins: s.coins + amount })),

      spendCoins: (amount) => {
        const { coins } = get();
        if (coins < amount) return false;
        set({ coins: coins - amount });
        return true;
      },

      addGems: (amount) =>
        set((s) => ({ gems: s.gems + amount })),

      spendGems: (amount) => {
        const { gems } = get();
        if (gems < amount) return false;
        set({ gems: gems - amount });
        return true;
      },

      completeLevel: (level, stars, score, linesCleared) =>
        set((s) => {
          const prevStars = s.levelStars[level] ?? 0;
          const prevScore = s.levelHighScores[level] ?? 0;
          return {
            highestLevel: Math.max(s.highestLevel, level),
            levelStars: {
              ...s.levelStars,
              [level]: Math.max(prevStars, stars),
            },
            levelHighScores: {
              ...s.levelHighScores,
              [level]: Math.max(prevScore, score),
            },
            totalScore: s.totalScore + score,
            totalLinesCleared: s.totalLinesCleared + linesCleared,
          };
        }),

      setAdFree: (adFree) => set({ adFree }),

      addPowerUp: (type, count) =>
        set((s) => ({
          powerUps: {
            ...s.powerUps,
            [type]: s.powerUps[type] + count,
          },
        })),

      usePowerUp: (type) => {
        const { powerUps } = get();
        if (powerUps[type] <= 0) return false;
        set({
          powerUps: {
            ...powerUps,
            [type]: powerUps[type] - 1,
          },
        });
        return true;
      },

      equipTheme: (themeId) => set({ equippedTheme: themeId }),
      equipBlockSkin: (skinId) => set({ equippedBlockSkin: skinId }),

      updateStreak: () => {
        const today = getToday();
        const { lastPlayDate, currentStreak, longestStreak } = get();

        if (lastPlayDate === today) return; // Already played today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const newStreak = lastPlayDate === yesterdayStr ? currentStreak + 1 : 1;

        set({
          lastPlayDate: today,
          currentStreak: newStreak,
          longestStreak: Math.max(longestStreak, newStreak),
        });
      },

      setDisplayName: (name) => set({ displayName: name }),
    }),
    {
      name: 'color-block-blast-player',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
