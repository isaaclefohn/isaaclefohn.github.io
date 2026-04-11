/**
 * Zustand store for persistent player data.
 * Persisted to AsyncStorage, synced to Supabase when available.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Daily reward amounts — day 7 is more valuable than days 1-6 combined */
export const DAILY_REWARDS = [
  { coins: 10 },
  { coins: 15 },
  { coins: 20 },
  { coins: 30 },
  { coins: 40, powerUp: 'bomb' as const },
  { coins: 50 },
  { coins: 100, gems: 5 },
];

/** Achievement definitions */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: { coins?: number; gems?: number };
  check: (state: PlayerStoreState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_clear', name: 'First Clear', description: 'Clear your first line', icon: 'star', reward: { coins: 10 }, check: (s) => s.totalLinesCleared >= 1 },
  { id: 'clear_100', name: 'Line Master', description: 'Clear 100 lines', icon: 'lightning', reward: { coins: 50 }, check: (s) => s.totalLinesCleared >= 100 },
  { id: 'clear_500', name: 'Line Legend', description: 'Clear 500 lines', icon: 'crown', reward: { coins: 200, gems: 5 }, check: (s) => s.totalLinesCleared >= 500 },
  { id: 'level_10', name: 'Getting Started', description: 'Reach level 10', icon: 'map', reward: { coins: 25 }, check: (s) => s.highestLevel >= 10 },
  { id: 'level_50', name: 'Halfway There', description: 'Reach level 50', icon: 'trophy', reward: { coins: 100, gems: 3 }, check: (s) => s.highestLevel >= 50 },
  { id: 'level_100', name: 'Century', description: 'Reach level 100', icon: 'crown', reward: { coins: 500, gems: 10 }, check: (s) => s.highestLevel >= 100 },
  { id: 'score_10k', name: 'Score Chaser', description: 'Earn 10,000 total score', icon: 'target', reward: { coins: 30 }, check: (s) => s.totalScore >= 10000 },
  { id: 'score_100k', name: 'High Roller', description: 'Earn 100,000 total score', icon: 'gem', reward: { coins: 100, gems: 5 }, check: (s) => s.totalScore >= 100000 },
  { id: 'streak_3', name: 'Consistent', description: 'Play 3 days in a row', icon: 'fire', reward: { coins: 20 }, check: (s) => s.longestStreak >= 3 },
  { id: 'streak_7', name: 'Dedicated', description: 'Play 7 days in a row', icon: 'fire', reward: { coins: 75, gems: 3 }, check: (s) => s.longestStreak >= 7 },
  { id: 'streak_30', name: 'Unstoppable', description: '30-day streak', icon: 'fire', reward: { coins: 300, gems: 10 }, check: (s) => s.longestStreak >= 30 },
  { id: 'stars_50', name: 'Star Collector', description: 'Earn 50 stars', icon: 'star', reward: { coins: 50 }, check: (s) => Object.values(s.levelStars).reduce((a, b) => a + b, 0) >= 50 },
  { id: 'perfect_3star', name: 'Perfectionist', description: 'Get 3 stars on 10 levels', icon: 'sparkle', reward: { coins: 100, gems: 5 }, check: (s) => Object.values(s.levelStars).filter(v => v >= 3).length >= 10 },
  { id: 'coins_1000', name: 'Coin Hoarder', description: 'Hold 1,000 coins', icon: 'coin', reward: { gems: 3 }, check: (s) => s.coins >= 1000 },
  { id: 'first_powerup', name: 'Power User', description: 'Use a power-up', icon: 'bomb', reward: { coins: 15 }, check: (s) => s.totalPowerUpsUsed >= 1 },
];

interface PlayerStoreState {
  displayName: string;
  coins: number;
  gems: number;
  adFree: boolean;
  highestLevel: number;
  levelStars: Record<number, number>;
  levelHighScores: Record<number, number>;
  totalScore: number;
  totalLinesCleared: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string | null;
  equippedTheme: string;
  equippedBlockSkin: string;
  powerUps: { bomb: number; rowClear: number; colorClear: number };
  // Daily rewards
  dailyRewardDay: number;
  dailyRewardLastClaimed: string | null;
  // Achievements
  unlockedAchievements: string[];
  // Stats
  totalGamesPlayed: number;
  totalPowerUpsUsed: number;
  bestCombo: number;
  // Zen mode
  zenHighScore: number;
  zenGamesPlayed: number;
  zenBestLinesCleared: number;
  // Lucky Spin
  lastSpinDate: string | null;
  // Adaptive difficulty
  consecutiveFailures: number;
  lastFailedLevel: number;
  // Piggy Bank
  piggyBankCoins: number;
  piggyBankLastBroken: string | null;
  // Battle Pass
  battlePassXP: number;
  battlePassPremium: boolean;
  battlePassClaimedTiers: number[];
  battlePassSeason: number;
  // Weekly Challenge
  weeklyBestScore: number;
  weeklyBestStars: number;
  weeklyLastWeekId: string | null;
  // Gift Box
  lastGiftDate: string | null;
  gamesPlayedToday: number;
  gamesPlayedDate: string | null;
  // Streak Freeze
  streakFreezes: number;
  // Energy / Lives
  lives: number;
  lastLifeLostAt: number | null;
  infiniteLivesUntil: number | null;
  // Daily Quests
  dailyQuestProgress: Record<string, number>;
  dailyQuestsClaimed: string[];
  dailyQuestsDate: string | null;
  // Sticker Album
  collectedStickers: string[];
  claimedAlbumPages: string[];
  // Star Chests
  claimedStarChests: string[];
  // Skill Rating
  skillRating: number;
}

interface PlayerStore extends PlayerStoreState {
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
  claimDailyReward: () => { coins: number; gems?: number; powerUp?: string } | null;
  checkAchievements: () => Achievement[];
  recordGamePlayed: (combo: number) => void;
  recordZenGame: (score: number, linesCleared: number, combo: number) => void;
  recordSpin: () => void;
  recordFailure: (level: number) => void;
  resetFailures: () => void;
  addPiggyBankCoins: (amount: number) => void;
  breakPiggyBank: () => number;
  addBattlePassXP: (amount: number) => void;
  claimBattlePassTier: (tier: number) => void;
  upgradeBattlePass: () => void;
  // Weekly Challenge
  completeWeeklyChallenge: (weekId: string, stars: number, score: number) => void;
  // Gift Box
  claimGift: () => void;
  incrementGamesPlayedToday: () => void;
  // Streak Freeze
  addStreakFreezes: (count: number) => void;
  useStreakFreeze: () => boolean;
  // Energy / Lives
  loseLife: () => void;
  refillLives: () => void;
  activateInfiniteLives: (durationMs: number) => void;
  // Daily Quests
  updateQuestProgress: (key: string, amount: number) => void;
  claimDailyQuest: (questId: string) => void;
  // Sticker Album
  collectSticker: (stickerId: string) => void;
  claimAlbumPage: (pageId: string) => void;
  // Star Chests
  claimStarChest: (chestId: string) => void;
  // Skill Rating
  updateSkillRating: (change: number) => void;
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
      dailyRewardDay: 0,
      dailyRewardLastClaimed: null,
      unlockedAchievements: [],
      totalGamesPlayed: 0,
      totalPowerUpsUsed: 0,
      bestCombo: 0,
      zenHighScore: 0,
      zenGamesPlayed: 0,
      zenBestLinesCleared: 0,
      lastSpinDate: null,
      consecutiveFailures: 0,
      lastFailedLevel: 0,
      piggyBankCoins: 0,
      piggyBankLastBroken: null,
      battlePassXP: 0,
      battlePassPremium: false,
      battlePassClaimedTiers: [],
      battlePassSeason: 1,
      weeklyBestScore: 0,
      weeklyBestStars: 0,
      weeklyLastWeekId: null,
      lastGiftDate: null,
      gamesPlayedToday: 0,
      gamesPlayedDate: null,
      streakFreezes: 0,
      lives: 5,
      lastLifeLostAt: null,
      infiniteLivesUntil: null,
      dailyQuestProgress: {},
      dailyQuestsClaimed: [],
      dailyQuestsDate: null,
      collectedStickers: [],
      claimedAlbumPages: [],
      claimedStarChests: [],
      skillRating: 100,

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

      claimDailyReward: () => {
        const today = getToday();
        const { dailyRewardLastClaimed, dailyRewardDay } = get();

        if (dailyRewardLastClaimed === today) return null;

        const rewardIndex = dailyRewardDay % DAILY_REWARDS.length;
        const reward = DAILY_REWARDS[rewardIndex];

        set((s) => ({
          coins: s.coins + reward.coins,
          gems: s.gems + (reward.gems ?? 0),
          dailyRewardDay: s.dailyRewardDay + 1,
          dailyRewardLastClaimed: today,
          ...(reward.powerUp ? {
            powerUps: {
              ...s.powerUps,
              [reward.powerUp]: s.powerUps[reward.powerUp] + 1,
            },
          } : {}),
        }));

        return { coins: reward.coins, gems: reward.gems, powerUp: reward.powerUp };
      },

      checkAchievements: () => {
        const state = get();
        const newlyUnlocked: Achievement[] = [];

        for (const achievement of ACHIEVEMENTS) {
          if (state.unlockedAchievements.includes(achievement.id)) continue;
          if (achievement.check(state)) {
            newlyUnlocked.push(achievement);
          }
        }

        if (newlyUnlocked.length > 0) {
          const newIds = newlyUnlocked.map(a => a.id);
          let totalCoins = 0;
          let totalGems = 0;
          for (const a of newlyUnlocked) {
            totalCoins += a.reward.coins ?? 0;
            totalGems += a.reward.gems ?? 0;
          }

          set((s) => ({
            unlockedAchievements: [...s.unlockedAchievements, ...newIds],
            coins: s.coins + totalCoins,
            gems: s.gems + totalGems,
          }));
        }

        return newlyUnlocked;
      },

      recordGamePlayed: (combo: number) => {
        set((s) => ({
          totalGamesPlayed: s.totalGamesPlayed + 1,
          bestCombo: Math.max(s.bestCombo, combo),
        }));
      },

      recordZenGame: (score: number, linesCleared: number, combo: number) => {
        set((s) => ({
          zenHighScore: Math.max(s.zenHighScore, score),
          zenGamesPlayed: s.zenGamesPlayed + 1,
          zenBestLinesCleared: Math.max(s.zenBestLinesCleared, linesCleared),
          totalGamesPlayed: s.totalGamesPlayed + 1,
          bestCombo: Math.max(s.bestCombo, combo),
        }));
      },

      recordSpin: () => {
        set({ lastSpinDate: getToday() });
      },

      recordFailure: (level: number) => {
        set((s) => ({
          consecutiveFailures: s.lastFailedLevel === level ? s.consecutiveFailures + 1 : 1,
          lastFailedLevel: level,
        }));
      },

      resetFailures: () => {
        set({ consecutiveFailures: 0, lastFailedLevel: 0 });
      },

      addPiggyBankCoins: (amount: number) => {
        set((s) => ({ piggyBankCoins: s.piggyBankCoins + amount }));
      },

      breakPiggyBank: () => {
        const { piggyBankCoins } = get();
        set({ piggyBankCoins: 0, piggyBankLastBroken: getToday() });
        return piggyBankCoins;
      },

      addBattlePassXP: (amount: number) => {
        set((s) => ({ battlePassXP: s.battlePassXP + amount }));
      },

      claimBattlePassTier: (tier: number) => {
        set((s) => ({
          battlePassClaimedTiers: [...s.battlePassClaimedTiers, tier],
        }));
      },

      upgradeBattlePass: () => {
        set({ battlePassPremium: true });
      },

      completeWeeklyChallenge: (weekId: string, stars: number, score: number) => {
        set((s) => ({
          weeklyBestScore: s.weeklyLastWeekId === weekId ? Math.max(s.weeklyBestScore, score) : score,
          weeklyBestStars: s.weeklyLastWeekId === weekId ? Math.max(s.weeklyBestStars, stars) : stars,
          weeklyLastWeekId: weekId,
        }));
      },

      claimGift: () => {
        set({ lastGiftDate: getToday() });
      },

      incrementGamesPlayedToday: () => {
        const today = getToday();
        set((s) => ({
          gamesPlayedToday: s.gamesPlayedDate === today ? s.gamesPlayedToday + 1 : 1,
          gamesPlayedDate: today,
        }));
      },

      addStreakFreezes: (count: number) => {
        set((s) => ({ streakFreezes: s.streakFreezes + count }));
      },

      useStreakFreeze: () => {
        const { streakFreezes } = get();
        if (streakFreezes <= 0) return false;
        set({ streakFreezes: streakFreezes - 1 });
        return true;
      },

      loseLife: () => {
        set((s) => ({
          lives: Math.max(0, s.lives - 1),
          lastLifeLostAt: Date.now(),
        }));
      },

      refillLives: () => {
        set({ lives: 5, lastLifeLostAt: null });
      },

      activateInfiniteLives: (durationMs: number) => {
        set({
          lives: 5,
          infiniteLivesUntil: Date.now() + durationMs,
        });
      },

      updateQuestProgress: (key: string, amount: number) => {
        const today = getToday();
        set((s) => {
          const isToday = s.dailyQuestsDate === today;
          const currentProgress = isToday ? (s.dailyQuestProgress[key] ?? 0) : 0;
          return {
            dailyQuestProgress: isToday
              ? { ...s.dailyQuestProgress, [key]: currentProgress + amount }
              : { [key]: amount },
            dailyQuestsDate: today,
          };
        });
      },

      claimDailyQuest: (questId: string) => {
        set((s) => ({
          dailyQuestsClaimed: [...s.dailyQuestsClaimed, questId],
        }));
      },

      collectSticker: (stickerId: string) => {
        set((s) => ({
          collectedStickers: s.collectedStickers.includes(stickerId)
            ? s.collectedStickers
            : [...s.collectedStickers, stickerId],
        }));
      },

      claimAlbumPage: (pageId: string) => {
        set((s) => ({
          claimedAlbumPages: s.claimedAlbumPages.includes(pageId)
            ? s.claimedAlbumPages
            : [...s.claimedAlbumPages, pageId],
        }));
      },

      claimStarChest: (chestId: string) => {
        set((s) => ({
          claimedStarChests: s.claimedStarChests.includes(chestId)
            ? s.claimedStarChests
            : [...s.claimedStarChests, chestId],
        }));
      },

      updateSkillRating: (change: number) => {
        set((s) => ({ skillRating: Math.max(0, s.skillRating + change) }));
      },
    }),
    {
      name: 'color-block-blast-player',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
