/**
 * Zustand store for persistent player data.
 * Persisted to AsyncStorage, synced to Supabase when available.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InboxMessage } from '../game/systems/Inbox';
import {
  applyStreakShield,
  canClaimRewardedShield,
  MAX_STREAK_SHIELDS,
  type StreakShieldResult,
} from '../game/engine/streakShield';
import { getDailyTiles, rollWheel, type WheelTile } from '../game/engine/dailyWheel';
import {
  applyBoost,
  extendBoost,
  type ActiveBoostUntil,
  type BoostKind,
} from '../game/rewards/ActiveBoosts';
import { getLocalToday } from '../utils/dates';

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
  // Chromatic mechanic — three tiers that ladder up the signature
  // brand identity. Pairs with the `first_chromatic` teach tip
  // (which fires on the same in-game event the achievement unlocks
  // on) so the player's first chromatic clear becomes a triple-
  // attribution moment: cascade + label + achievement.
  { id: 'first_chromatic', name: 'First Spark', description: 'Trigger your first chromatic clear', icon: 'sparkle', reward: { coins: 25 }, check: (s) => s.totalChromaticClears >= 1 },
  { id: 'chromatic_25', name: 'Chromatic Adept', description: 'Trigger 25 chromatic clears', icon: 'palette', reward: { coins: 100, gems: 3 }, check: (s) => s.totalChromaticClears >= 25 },
  { id: 'chromatic_100', name: 'Color Master', description: 'Trigger 100 chromatic clears', icon: 'crown', reward: { coins: 400, gems: 15 }, check: (s) => s.totalChromaticClears >= 100 },
  // Endless wave milestones — tie the wave system shipped in 711a0fa
  // into the achievement framework. Each tier maps to a meaningful
  // moment: wave 5 = "I left the early waves behind" (palette is
  // already maxed); wave 10 = "I'm grinding endlessly"; wave 20 =
  // "this is my game now." Rewards scale to match the chromatic
  // tier rewards roughly — wave 20 is comparable to chromatic_100
  // in commitment.
  { id: 'wave_5', name: 'Surge Survivor', description: 'Reach wave 5 in endless mode', icon: 'lightning', reward: { coins: 50 }, check: (s) => s.bestWaveReached >= 5 },
  { id: 'wave_10', name: 'Wave Rider', description: 'Reach wave 10 in endless mode', icon: 'fire', reward: { coins: 150, gems: 5 }, check: (s) => s.bestWaveReached >= 10 },
  { id: 'wave_20', name: 'Wave Master', description: 'Reach wave 20 in endless mode', icon: 'crown', reward: { coins: 500, gems: 20 }, check: (s) => s.bestWaveReached >= 20 },
  // Combo-tier milestones — mirror to wave tiers, tied to the
  // ComboChain ladder shipped in fd133be (and the GODLIKE top tier
  // added in 4632210). Each maps to crossing a verbal threshold:
  // FEVER (chain 5) is the "this game is on fire" moment;
  // UNSTOPPABLE (chain 6) is the rare planned-and-executed moment;
  // GODLIKE (chain 7+) is the screenshot-worthy peak. The persisted
  // `bestCombo` stat (now correctly tracking peaks per b13581f) is
  // the basis. Three parallel achievement tracks: chromatic / wave
  // / combo, all reachable through different play styles.
  { id: 'combo_fever', name: 'Caught Fire', description: 'Land a FEVER combo (5-chain)', icon: 'fire', reward: { coins: 50 }, check: (s) => s.bestCombo >= 5 },
  { id: 'combo_unstoppable', name: 'Unstoppable', description: 'Land an UNSTOPPABLE combo (6-chain)', icon: 'lightning', reward: { coins: 150, gems: 5 }, check: (s) => s.bestCombo >= 6 },
  { id: 'combo_godlike', name: 'Godlike', description: 'Land a GODLIKE combo (7-chain)', icon: 'crown', reward: { coins: 500, gems: 20 }, check: (s) => s.bestCombo >= 7 },
];

/**
 * A normalized reward payload shared by the "atomic claim" actions
 * (free chest, gift box, treasure, login calendar). Lets each claim
 * stamp its guard AND credit rewards inside a single `set()` so a
 * crash between the two can't leave a re-claimable state. coins are
 * boost-eligible (gameplay rewards), matching the prior addCoins
 * `{ boostable: true }` calls these atomic actions replaced.
 */
export interface RewardBundle {
  coins?: number;
  gems?: number;
  bomb?: number;
  rowClear?: number;
  colorClear?: number;
}

/**
 * Compute the coins/gems/powerUps portion of a state delta for a
 * reward bundle. Pure — takes the current state slice + the clock so
 * callers can fold it into one `set()`. Applies the active coin boost
 * (Double Time) so atomic claims stay boostable just like the
 * addCoins({ boostable: true }) path they replaced.
 */
function rewardBundleDelta(
  s: { coins: number; gems: number; powerUps: { bomb: number; rowClear: number; colorClear: number }; activeBoostUntil: ActiveBoostUntil },
  b: RewardBundle,
  now: number,
): { coins?: number; gems?: number; powerUps?: { bomb: number; rowClear: number; colorClear: number } } {
  const delta: { coins?: number; gems?: number; powerUps?: { bomb: number; rowClear: number; colorClear: number } } = {};
  if (b.coins) delta.coins = s.coins + applyBoost(b.coins, s.activeBoostUntil, 'coins', now);
  if (b.gems) delta.gems = s.gems + b.gems;
  if (b.bomb || b.rowClear || b.colorClear) {
    delta.powerUps = {
      bomb: s.powerUps.bomb + (b.bomb ?? 0),
      rowClear: s.powerUps.rowClear + (b.rowClear ?? 0),
      colorClear: s.powerUps.colorClear + (b.colorClear ?? 0),
    };
  }
  return delta;
}

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
  /** Free "freeze" tokens that save the streak from a single-day miss.
   *  Earned every 5 streak days (max 1 held). Loss-aversion clamp. */
  streakShields: number;
  /** ISO date the player last claimed a rewarded-ad shield refill.
   *  Throttled to once per 7 days so the shield retains meaning —
   *  unlimited refills would let players ignore the streak rhythm
   *  the whole feature is meant to encourage. */
  streakShieldAdLastDate: string | null;
  lastPlayDate: string | null;
  equippedTheme: string;
  equippedBlockSkin: string;
  /**
   * Themes / block-skins the player has PURCHASED with gems. The
   * free defaults ('classic' / 'default') are not listed — they're
   * always available via the price===0 path. Once a paid cosmetic is
   * in this set, re-equipping it is free. Without this ledger, the
   * shop would re-charge gems every time a player switched away from
   * and back to a paid theme they already bought.
   */
  ownedThemes: string[];
  ownedBlockSkins: string[];
  powerUps: { bomb: number; rowClear: number; colorClear: number };
  // Daily rewards
  dailyRewardDay: number;
  dailyRewardLastClaimed: string | null;
  /** ISO date the player last used their rewarded-ad daily-wheel re-spin.
   *  Throttled to once per day so the variance moment retains meaning. */
  dailyWheelRespinDate: string | null;
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
  /**
   * Highest endless wave ever reached. Each block of 50 pieces in
   * endless mode is one wave; this is the lifetime max. Distinct
   * from zenHighScore so players have TWO progression dimensions to
   * chase in endless: raw score AND wave depth. A skillful player
   * who places efficiently might reach wave 5+ on lower scores than
   * a power-grinder who maxes wave 4 but scores higher within it.
   */
  bestWaveReached: number;
  // Daily Puzzle — one shared-seed run per calendar day
  dailyPuzzleLastPlayedId: string | null;
  dailyPuzzleLastPlayedScore: number;
  dailyPuzzleLastPlayedStars: number;
  dailyPuzzleBestScore: number;
  dailyPuzzleStreak: number;
  dailyPuzzlePlayCount: number;
  // Celebration tier pity counter — chromatic clears since last Big/Jackpot
  // (the variable-jackpot system's "drought protection" so an unlucky player
  // is guaranteed a premium-tier fire after N clears).
  chromaticClearsSincePremium: number;
  /** Lifetime chromatic-clear count. Drives the chromatic-tier
   *  achievements (first_chromatic / chromatic_25 / chromatic_100)
   *  and any future stats / leaderboard surfaces that want to
   *  celebrate the signature mechanic. Distinct from
   *  `chromaticClearsSincePremium` which is the pity counter. */
  totalChromaticClears: number;
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
  /** ISO date the comeback bonus was last claimed. Persistent
   *  idempotency guard — the modal previously relied only on local
   *  React state which resets on remount. */
  lastComebackClaimedDate: string | null;
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
  // Power-Up Upgrades
  powerUpLevels: { bomb: number; rowClear: number; colorClear: number };
  // World Completion
  claimedWorldClears: number[];
  claimedWorldPerfects: number[];
  // Login Calendar
  calendarLastDay: number;
  calendarMonth: string | null;
  // Daily Deal
  lastDealClaimed: string | null;
  // Avatars
  ownedAvatars: string[];
  equippedAvatar: string;
  // Boss Rush
  bossRushBestScore: number;
  bossRushBestBosses: number;
  bossRushRunsCompleted: number;
  // Treasure Hunt
  treasureMapPieces: number;
  treasureChestsOpened: number;
  // Tournaments
  activeTournament: {
    tier: 'bronze' | 'silver' | 'gold' | 'diamond';
    startedAt: number;
    endsAt: number;
    playerScore: number;
  } | null;
  tournamentBestScore: number;
  // Inbox
  inboxMessages: InboxMessage[];
  inboxClaimed: string[];
  inboxDismissed: string[];
  // VIP membership
  vipUntil: number | null;
  vipDailyClaimedDate: string | null;
  // Level skip tokens
  levelSkipTokens: number;
  // Quest chains
  claimedQuestChains: string[];
  // Mega power-ups (from fusion)
  megaPowerUps: { megabomb: number; megaRow: number; megaColor: number };
  // Seasonal events
  seasonalEventId: string | null;
  seasonalEventPoints: number;
  seasonalMilestonesClaimed: string[];
  // Mystery shop
  mysteryShopBucket: number;
  mysteryShopPurchases: string[];
  // Block mastery XP per color
  blockMastery: {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
    purple: number;
    pink: number;
  };
  // Daily Roulette
  rouletteLastDate: string | null;
  // Starter Pack monetization
  starterPackUnlockedAt: number | null;
  starterPackClaimed: boolean;
  // Flash offers — per-bucket purchase tracking
  flashOfferPurchases: string[];
  // Free chest — recurring reward timer
  freeChestLastClaimedAt: number | null;
  // Daily Roulette boost expirations (unix ms). Absent / past = no boost.
  // `coins` is set by the "Double Time" reward, `xp` by "XP Surge".
  activeBoostUntil: ActiveBoostUntil;
  /**
   * Cross-restart dedup for Apple IAP transactions. Each Apple
   * transactionId is recorded here AFTER `creditFromProduct` runs,
   * so a listener fire for the same transaction on a subsequent app
   * launch (which can happen if the app crashed before
   * `finishTransaction` acked Apple) sees the ID and skips re-credit.
   *
   * Replaces the previous in-memory Set which only covered same-
   * session dedup. The persisted list covers both — same-session
   * lookups read from this in-memory copy of the persisted array
   * (still O(n) but n is bounded by purchase volume per user, which
   * for a paying user maxes out around 50-100 entries).
   */
  creditedTransactionIds: string[];
}

interface PlayerStore extends PlayerStoreState {
  // Actions
  /**
   * Credit coins. Pass `{ boostable: true }` for gameplay rewards
   * (level rewards, quests, etc.) — that opts the credit into the
   * Daily Roulette "Double Time" 2x multiplier when one is active.
   * IAP/shop grants OMIT the flag so real-money purchases are never
   * doubled (revenue-safety default).
   */
  addCoins: (amount: number, opts?: { boostable?: boolean }) => void;
  spendCoins: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  completeLevel: (level: number, stars: number, score: number, linesCleared: number) => void;
  setAdFree: (adFree: boolean) => void;
  addPowerUp: (type: 'bomb' | 'rowClear' | 'colorClear', count: number) => void;
  usePowerUp: (type: 'bomb' | 'rowClear' | 'colorClear') => boolean;
  equipTheme: (themeId: string) => void;
  equipBlockSkin: (skinId: string) => void;
  /**
   * Atomic purchase-and-equip for cosmetics. If the cosmetic is free
   * (price 0) or already owned, just equips it (no charge). Otherwise
   * checks gem affordability against live state, then deducts gems +
   * records ownership + equips in one `set()`. Returns false (no
   * change) if the player can't afford an un-owned paid cosmetic.
   * Prevents the double-charge bug where re-equipping a previously-
   * purchased theme would call spendGems again.
   */
  purchaseAndEquipTheme: (themeId: string, price: number) => boolean;
  purchaseAndEquipBlockSkin: (skinId: string, price: number) => boolean;
  /** Update the daily play streak. Returns the streak-shield result so the
   *  UI can show a "Streak Saved!" toast (shield consumed) or "Shield Earned!"
   *  toast (shield granted at a milestone). */
  updateStreak: () => StreakShieldResult;
  /** Whether the player currently qualifies for a rewarded-ad shield
   *  refill. True when: (a) they have a streak worth protecting, (b)
   *  no shield held, (c) ≥7 days since their last refill (or never).
   *  Used to gate the in-UI offer; the action itself re-checks. */
  canClaimStreakShieldAd: () => boolean;
  /** Grant a streak shield in exchange for a watched rewarded ad. The
   *  ad result is the caller's responsibility — this just credits the
   *  shield and stamps the throttle. Returns true on success, false if
   *  the throttle blocks it (shouldn't normally happen if caller
   *  gated on `canClaimStreakShieldAd` first, but defense in depth). */
  addStreakShieldFromAd: () => boolean;
  setDisplayName: (name: string) => void;
  /** Claim today's daily reward — credits BOTH the calendar payout (existing
   *  fixed-escalating track) AND a wheel-spin bonus (variable surprise). The
   *  wheel result includes the rolled tile + its index so the UI can animate
   *  the spin landing on the correct slot. Returns null if already claimed. */
  claimDailyReward: () => {
    calendar: { coins: number; gems?: number; powerUp?: string };
    wheel: { tiles: WheelTile[]; index: number; tile: WheelTile };
  } | null;
  /** Whether the player can use their rewarded-ad daily-wheel re-spin
   *  right now. True when (a) they've already claimed today (so the
   *  re-spin is bonus, not a way to skip the natural reward) AND (b)
   *  they haven't already used their re-spin today. */
  canClaimDailyWheelRespin: () => boolean;
  /** Re-spin the daily wheel after watching a rewarded ad. Credits the
   *  rolled tile's reward, stamps the date so it can't be repeated, and
   *  returns the wheel result for animation. Returns null if the gate
   *  fails (re-validates internally for defense in depth). */
  rewardDailyWheelRespin: () => { tiles: WheelTile[]; index: number; tile: WheelTile } | null;
  checkAchievements: () => Achievement[];
  recordGamePlayed: (combo: number) => void;
  recordZenGame: (score: number, linesCleared: number, combo: number) => void;
  /** Idempotent lifetime-max bump for endless wave reached. */
  recordBestWave: (wave: number) => void;
  recordDailyPuzzleResult: (puzzleId: string, score: number, stars: number) => { isFirstCompletion: boolean; isNewBest: boolean };
  /** Persist the new pity counter value after a celebration-tier roll. */
  setChromaticClearsSincePremium: (n: number) => void;
  /** Increment the lifetime chromatic-clear counter. Called from
   *  GameScreen when a chromatic line clears, alongside the pity-
   *  counter setter. Drives chromatic-tier achievements. */
  incrementTotalChromaticClears: (n: number) => void;
  recordSpin: () => void;
  recordFailure: (level: number) => void;
  resetFailures: () => void;
  addPiggyBankCoins: (amount: number) => void;
  breakPiggyBank: () => number;
  /**
   * Credit Battle Pass XP. Pass `{ boostable: true }` for gameplay
   * rewards so the Daily Roulette "XP Surge" 2x multiplier applies
   * when active. Default omits to be conservative.
   */
  addBattlePassXP: (amount: number, opts?: { boostable?: boolean }) => void;
  /**
   * Activate (or extend) a Daily Roulette boost — used by
   * `claimDailyRouletteAtomic` and exposed for tests. See
   * `extendBoost` in `game/rewards/ActiveBoosts.ts` for the
   * chained-spin policy.
   */
  activateBoost: (kind: BoostKind, durationMs: number) => void;
  /**
   * Record an Apple IAP transactionId as credited. Idempotent via
   * `includes` guard. Called from `purchaseUpdatedListener` AFTER
   * `creditFromProduct` succeeds so a subsequent listener fire for
   * the same transaction (cross-restart or in-session redelivery)
   * sees the ID and skips re-credit.
   */
  recordCreditedTransaction: (txnId: string) => void;
  claimBattlePassTier: (tier: number) => void;
  upgradeBattlePass: () => void;
  /**
   * Roll the Battle Pass to a new season. Increments `battlePassSeason`,
   * resets XP to 0, and clears the claimed-tier list so the player
   * starts the new season at tier 0 with everything unclaimed.
   *
   * Premium status (`battlePassPremium`) is preserved — that's a
   * persistent entitlement that should carry across seasons unless
   * explicitly revoked.
   *
   * The audit caught the absence of this: without a season-rollover
   * action, incrementing `battlePassSeason` anywhere else would leave
   * the old `battlePassClaimedTiers` in place, and every tier in the
   * new season would render as already-claimed (because the
   * `claimedTiers.includes(tier)` check in the UI doesn't know about
   * season identity). The player would never claim anything in
   * season 2+.
   */
  startNewBattlePassSeason: (newSeason: number) => void;
  // Weekly Challenge
  completeWeeklyChallenge: (weekId: string, stars: number, score: number) => void;
  // Gift Box
  claimGift: () => void;
  /** Atomic gift claim — stamps lastGiftDate AND credits the bundle
   *  in one set(). The non-atomic claimGift was never even called by
   *  GiftBoxModal, leaving the gift re-openable; this fixes both the
   *  missing-stamp and the credit-before-stamp race. */
  claimGiftAtomic: (bundle: RewardBundle) => void;
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
  // Power-Up Upgrades
  upgradePowerUp: (type: 'bomb' | 'rowClear' | 'colorClear') => void;
  /**
   * Atomically purchase a power-up upgrade: checks affordability AND
   * not-already-maxed, then deducts BOTH currencies and bumps the
   * level in a single `set()`. Returns false (no state change) if the
   * player can't afford it or is already at max level.
   *
   * Replaces the old ShopScreen pattern of three separate calls
   * (spendCoins / spendGems / upgradePowerUp) which could partial-fail:
   * spendCoins ran unconditionally, spendGems's return was ignored, and
   * upgradePowerUp ran regardless — so a stale-affordability race could
   * deduct coins, silently skip the gem deduction, and STILL grant the
   * upgrade. Reading and writing inside one `set()` makes that
   * impossible.
   */
  purchasePowerUpUpgrade: (
    type: 'bomb' | 'rowClear' | 'colorClear',
    coinCost: number,
    gemCost: number,
  ) => boolean;
  // World Completion
  claimWorldClear: (worldId: number) => void;
  claimWorldPerfect: (worldId: number) => void;
  // Login Calendar
  claimCalendarDay: (day: number, month: string) => void;
  /** Atomic login-calendar claim — stamps the day/month guard AND
   *  credits the bundle in one set(). */
  claimCalendarDayAtomic: (day: number, month: string, bundle: RewardBundle) => void;
  // Daily Deal
  claimDailyDeal: (date: string) => void;
  // Avatars
  equipAvatar: (id: string) => void;
  purchaseAvatar: (id: string) => void;
  // Boss Rush
  recordBossRushResult: (bosses: number, score: number) => void;
  // Treasure Hunt
  addTreasureMapPiece: () => void;
  openTreasureChest: () => void;
  /** Atomic treasure-chest open — deducts the 5 map pieces AND
   *  credits the bundle in one set(), so a crash can't leave the
   *  pieces intact at threshold (re-openable for a free re-grant). */
  openTreasureChestAtomic: (bundle: RewardBundle) => void;
  // Tournaments
  enterTournament: (tier: 'bronze' | 'silver' | 'gold' | 'diamond', playerScore: number) => void;
  finishTournament: (finalRank: number) => void;
  // Inbox
  addInboxMessage: (message: InboxMessage) => void;
  claimInboxReward: (messageId: string) => void;
  dismissInboxMessage: (messageId: string) => void;
  // VIP membership
  activateVIP: (durationMs: number) => void;
  claimVIPDaily: (date: string) => void;
  // Level skip tokens
  addLevelSkipTokens: (count: number) => void;
  useLevelSkipToken: () => boolean;
  // Quest chains
  claimQuestChain: (chainId: string) => void;
  // Fusion & trade
  fusePowerUp: (source: 'bomb' | 'rowClear' | 'colorClear', sourceCost: number, result: 'megabomb' | 'megaRow' | 'megaColor') => boolean;
  tradePowerUp: (from: 'bomb' | 'rowClear' | 'colorClear', fromCost: number, to: 'bomb' | 'rowClear' | 'colorClear', toAmount: number) => boolean;
  // Seasonal events
  addSeasonalPoints: (instanceId: string, points: number) => void;
  claimSeasonalMilestone: (key: string) => void;
  // Mystery shop
  recordMysteryPurchase: (bucket: number, itemId: string) => void;
  // Block mastery
  addBlockMasteryXP: (color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink', xp: number) => void;
  // Daily Roulette
  claimDailyRoulette: (date: string) => void;
  /**
   * Atomic single-action variant: stamp the date AND apply the reward
   * payload in one `set()` call. Prevents the race where a player
   * force-closes the app during the spin animation between the reward
   * credit and the date stamp — that race let them re-spin on next
   * launch (double payout). With this atomic variant, either both
   * happen or neither.
   *
   * Also idempotent: re-claiming the same date is a no-op (so a stray
   * double-fire or replay never double-credits).
   */
  claimDailyRouletteAtomic: (
    date: string,
    // Shape mirrors `RouletteReward['payload']` in DailyRoulette.ts.
    payload: {
      coins?: number;
      gems?: number;
      bomb?: number;
      rowClear?: number;
      colorClear?: number;
      lives?: number;
      boostDurationMs?: number;
    },
    // The reward `kind` disambiguates `boostDurationMs` — without it,
    // the store can't tell whether Double Time (`double_coins`) or XP
    // Surge (`xp_boost`) was rolled, since both ship the same shape.
    kind?: import('../game/challenges/DailyRoulette').RouletteRewardKind,
  ) => void;
  // Starter Pack
  unlockStarterPack: () => void;
  claimStarterPack: () => void;
  // Flash offers
  recordFlashOfferPurchase: (key: string) => void;
  // Free chest
  claimFreeChest: () => void;
  /** Atomic free-chest claim — stamps freeChestLastClaimedAt AND
   *  credits the bundle in one set(). */
  claimFreeChestAtomic: (bundle: RewardBundle) => void;
  /** Atomic comeback-bonus claim — stamps lastComebackClaimedDate
   *  (persistent guard) AND credits the bundle in one set(). Returns
   *  false if already claimed today. */
  claimComebackBonusAtomic: (bundle: RewardBundle) => boolean;
  loadDemoState: () => void;
}

// LOCAL-timezone "today" — see src/utils/dates.ts for the full rationale.
// All daily/streak/spin systems agreed on UTC before this change, which
// silently shifted resets to UTC midnight (5pm PDT, 7pm EST, etc.) and
// broke daily-puzzle ID matching across the store. Now all routes through
// this single helper.
const getToday = () => getLocalToday();

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
      streakShields: 0,
      streakShieldAdLastDate: null,
      lastPlayDate: null,
      equippedTheme: 'classic',
      equippedBlockSkin: 'default',
      ownedThemes: [],
      ownedBlockSkins: [],
      powerUps: { bomb: 0, rowClear: 0, colorClear: 0 },
      dailyRewardDay: 0,
      dailyRewardLastClaimed: null,
      dailyWheelRespinDate: null,
      unlockedAchievements: [],
      totalGamesPlayed: 0,
      totalPowerUpsUsed: 0,
      bestCombo: 0,
      zenHighScore: 0,
      bestWaveReached: 0,
      zenGamesPlayed: 0,
      zenBestLinesCleared: 0,
      dailyPuzzleLastPlayedId: null,
      dailyPuzzleLastPlayedScore: 0,
      dailyPuzzleLastPlayedStars: 0,
      dailyPuzzleBestScore: 0,
      dailyPuzzleStreak: 0,
      dailyPuzzlePlayCount: 0,
      chromaticClearsSincePremium: 0,
      totalChromaticClears: 0,
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
      lastComebackClaimedDate: null,
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
      powerUpLevels: { bomb: 1, rowClear: 1, colorClear: 1 },
      claimedWorldClears: [],
      claimedWorldPerfects: [],
      calendarLastDay: 0,
      calendarMonth: null,
      lastDealClaimed: null,
      ownedAvatars: ['default'],
      equippedAvatar: 'default',
      bossRushBestScore: 0,
      bossRushBestBosses: 0,
      bossRushRunsCompleted: 0,
      treasureMapPieces: 0,
      treasureChestsOpened: 0,
      activeTournament: null,
      tournamentBestScore: 0,
      inboxMessages: [],
      inboxClaimed: [],
      inboxDismissed: [],
      vipUntil: null,
      vipDailyClaimedDate: null,
      levelSkipTokens: 0,
      claimedQuestChains: [],
      megaPowerUps: { megabomb: 0, megaRow: 0, megaColor: 0 },
      seasonalEventId: null,
      seasonalEventPoints: 0,
      seasonalMilestonesClaimed: [],
      mysteryShopBucket: 0,
      mysteryShopPurchases: [],
      blockMastery: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0, pink: 0 },
      rouletteLastDate: null,
      starterPackUnlockedAt: null,
      starterPackClaimed: false,
      flashOfferPurchases: [],
      freeChestLastClaimedAt: null,
      activeBoostUntil: {},
      creditedTransactionIds: [],

      addCoins: (amount, opts) =>
        set((s) => ({
          coins:
            s.coins +
            (opts?.boostable
              ? applyBoost(amount, s.activeBoostUntil, 'coins', Date.now())
              : amount),
        })),

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

      purchaseAndEquipTheme: (themeId, price) => {
        const s = get();
        if (price === 0 || s.ownedThemes.includes(themeId)) {
          set({ equippedTheme: themeId });
          return true;
        }
        if (s.gems < price) return false;
        set({
          gems: s.gems - price,
          ownedThemes: [...s.ownedThemes, themeId],
          equippedTheme: themeId,
        });
        return true;
      },

      purchaseAndEquipBlockSkin: (skinId, price) => {
        const s = get();
        if (price === 0 || s.ownedBlockSkins.includes(skinId)) {
          set({ equippedBlockSkin: skinId });
          return true;
        }
        if (s.gems < price) return false;
        set({
          gems: s.gems - price,
          ownedBlockSkins: [...s.ownedBlockSkins, skinId],
          equippedBlockSkin: skinId,
        });
        return true;
      },

      updateStreak: (): StreakShieldResult => {
        const today = getToday();
        const state = get();
        const result = applyStreakShield({
          today,
          lastPlayDate: state.lastPlayDate,
          currentStreak: state.currentStreak,
          streakShields: state.streakShields,
        });

        // Only mutate state on a genuine date change (already played today =
        // no-op). Shield grant/consumption only happens when we cross a day.
        if (state.lastPlayDate !== today) {
          set({
            lastPlayDate: today,
            currentStreak: result.newStreak,
            streakShields: result.newShields,
            longestStreak: Math.max(state.longestStreak, result.newStreak),
          });
        }
        return result;
      },

      canClaimStreakShieldAd: () => {
        const state = get();
        return canClaimRewardedShield({
          today: getToday(),
          currentStreak: state.currentStreak,
          streakShields: state.streakShields,
          streakShieldAdLastDate: state.streakShieldAdLastDate,
        });
      },

      addStreakShieldFromAd: () => {
        const state = get();
        const today = getToday();
        // Re-validate the same way the gate does. Defense in depth: a
        // caller that bypassed `canClaimStreakShieldAd` (mock, race,
        // future refactor) still cannot grant out-of-throttle.
        if (!canClaimRewardedShield({
          today,
          currentStreak: state.currentStreak,
          streakShields: state.streakShields,
          streakShieldAdLastDate: state.streakShieldAdLastDate,
        })) {
          return false;
        }
        set({
          streakShields: MAX_STREAK_SHIELDS,
          streakShieldAdLastDate: today,
        });
        return true;
      },

      setDisplayName: (name) => set({ displayName: name }),

      claimDailyReward: () => {
        const today = getToday();
        const { dailyRewardLastClaimed, dailyRewardDay } = get();

        if (dailyRewardLastClaimed === today) return null;

        // Calendar reward (existing deterministic 7-day track).
        const rewardIndex = dailyRewardDay % DAILY_REWARDS.length;
        const reward = DAILY_REWARDS[rewardIndex];

        // Wheel bonus — variable surprise on top of the calendar. The tile
        // layout is deterministic per day (so the player sees the same tiles
        // both before and after the spin); only the LANDING slot is random.
        const tiles = getDailyTiles(dailyRewardDay);
        const wheelResult = rollWheel(tiles);
        const wheelTile = wheelResult.tile;

        set((s) => {
          // Merge BOTH rewards into a single state update.
          const totalCoins = (reward.coins ?? 0) + wheelTile.coins;
          const totalGems = (reward.gems ?? 0) + wheelTile.gems;
          // Calendar power-up (if any) AND wheel power-up (if any) both apply.
          const nextPowerUps = { ...s.powerUps };
          if (reward.powerUp) nextPowerUps[reward.powerUp] = nextPowerUps[reward.powerUp] + 1;
          if (wheelTile.powerUp) nextPowerUps[wheelTile.powerUp] = nextPowerUps[wheelTile.powerUp] + 1;
          return {
            coins: s.coins + totalCoins,
            gems: s.gems + totalGems,
            dailyRewardDay: s.dailyRewardDay + 1,
            dailyRewardLastClaimed: today,
            powerUps: nextPowerUps,
          };
        });

        return {
          calendar: { coins: reward.coins, gems: reward.gems, powerUp: reward.powerUp },
          wheel: { tiles, index: wheelResult.index, tile: wheelTile },
        };
      },

      canClaimDailyWheelRespin: () => {
        const state = get();
        const today = getToday();
        // (a) Must have already claimed today's calendar reward —
        // the re-spin is a BONUS on top of the natural arc, not a
        // way to skip it. (b) Must not have already re-spun today.
        return (
          state.dailyRewardLastClaimed === today &&
          state.dailyWheelRespinDate !== today
        );
      },

      rewardDailyWheelRespin: () => {
        const state = get();
        const today = getToday();
        // Re-validate the gate (same logic as canClaim) so a caller
        // that bypassed the UI offer cannot mutate state out of band.
        if (state.dailyRewardLastClaimed !== today) return null;
        if (state.dailyWheelRespinDate === today) return null;

        // Use the same wheel layout the player saw on their claim,
        // so the re-spin lands on the same 4 tiles they remember.
        const tiles = getDailyTiles(state.dailyRewardDay - 1);
        const wheelResult = rollWheel(tiles);
        const wheelTile = wheelResult.tile;

        set((s) => {
          const nextPowerUps = { ...s.powerUps };
          if (wheelTile.powerUp) {
            nextPowerUps[wheelTile.powerUp] = nextPowerUps[wheelTile.powerUp] + 1;
          }
          return {
            coins: s.coins + wheelTile.coins,
            gems: s.gems + wheelTile.gems,
            powerUps: nextPowerUps,
            dailyWheelRespinDate: today,
          };
        });

        return { tiles, index: wheelResult.index, tile: wheelTile };
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

          // Achievement rewards are gameplay-earned, so the coin
          // multiplier applies (same class as quest rewards, daily
          // puzzle payouts, etc.). Previously this bypassed
          // `applyBoost` by mutating `s.coins` directly, which
          // meant a player on an active "Double Time" boost got
          // single coins on achievement unlock instead of doubled
          // — a silent gap in the boost feature contract.
          set((s) => ({
            unlockedAchievements: [...s.unlockedAchievements, ...newIds],
            coins: s.coins + applyBoost(totalCoins, s.activeBoostUntil, 'coins', Date.now()),
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

      /**
       * Update lifetime best wave reached. Idempotent (Math.max) so
       * calling this on a non-improving run is a no-op. Called from
       * the endless game-over path in useGameEngine.
       */
      recordBestWave: (wave: number) => {
        set((s) => ({ bestWaveReached: Math.max(s.bestWaveReached, wave) }));
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

      recordDailyPuzzleResult: (puzzleId, score, stars) => {
        // Only the FIRST attempt on a given puzzle counts — this is the
        // whole "one shot, share the seed" promise of a daily. Subsequent
        // replays are allowed (for fun / practice) but don't overwrite
        // the locked-in score or advance the streak.
        const s = get();
        const isFirstCompletion = s.dailyPuzzleLastPlayedId !== puzzleId;
        if (!isFirstCompletion) {
          return { isFirstCompletion: false, isNewBest: false };
        }
        const isNewBest = score > s.dailyPuzzleBestScore;

        // Streak bookkeeping: if the previous puzzle id was yesterday,
        // extend the streak; otherwise reset to 1. Compared by date
        // arithmetic on the id strings (YYYY-MM-DD).
        let newStreak = 1;
        if (s.dailyPuzzleLastPlayedId) {
          const prev = new Date(s.dailyPuzzleLastPlayedId + 'T00:00:00');
          const curr = new Date(puzzleId + 'T00:00:00');
          const dayMs = 24 * 60 * 60 * 1000;
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / dayMs);
          if (diffDays === 1) newStreak = s.dailyPuzzleStreak + 1;
        }

        set({
          dailyPuzzleLastPlayedId: puzzleId,
          dailyPuzzleLastPlayedScore: score,
          dailyPuzzleLastPlayedStars: stars,
          dailyPuzzleBestScore: Math.max(s.dailyPuzzleBestScore, score),
          dailyPuzzleStreak: newStreak,
          dailyPuzzlePlayCount: s.dailyPuzzlePlayCount + 1,
          totalGamesPlayed: s.totalGamesPlayed + 1,
        });
        return { isFirstCompletion: true, isNewBest };
      },

      setChromaticClearsSincePremium: (n: number) => {
        set({ chromaticClearsSincePremium: Math.max(0, n) });
      },

      incrementTotalChromaticClears: (n: number) => {
        // Guard against accidental decrement / NaN — chromaticClears
        // from the engine is always a non-negative integer, but
        // callers can change. State stays monotonic.
        if (!Number.isFinite(n) || n <= 0) return;
        set((s) => ({ totalChromaticClears: s.totalChromaticClears + Math.floor(n) }));
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

      addBattlePassXP: (amount: number, opts) => {
        set((s) => ({
          battlePassXP:
            s.battlePassXP +
            (opts?.boostable
              ? applyBoost(amount, s.activeBoostUntil, 'xp', Date.now())
              : amount),
        }));
      },

      activateBoost: (kind, durationMs) => {
        set((s) => ({
          activeBoostUntil: {
            ...s.activeBoostUntil,
            [kind]: extendBoost(s.activeBoostUntil[kind], durationMs, Date.now()),
          },
        }));
      },

      recordCreditedTransaction: (txnId: string) => {
        // Idempotent via includes-guard. The dedup check in
        // purchaseUpdatedListener also reads this list, so calling
        // record twice for the same id is a no-op rather than a
        // duplicate entry that would bloat the persisted state.
        set((s) => ({
          creditedTransactionIds: s.creditedTransactionIds.includes(txnId)
            ? s.creditedTransactionIds
            : [...s.creditedTransactionIds, txnId],
        }));
      },

      claimBattlePassTier: (tier: number) => {
        // Idempotency guard matching the pattern used by every other
        // claim action in this store. The audit caught this as the
        // only Battle Pass action without the guard — a rapid double-
        // tap on the Claim button (or a re-render that calls
        // handleClaim twice before state settles) could push the
        // same tier number twice and let a downstream consumer that
        // reads `claimedTiers.includes(tier)` silently double-credit.
        set((s) => ({
          battlePassClaimedTiers: s.battlePassClaimedTiers.includes(tier)
            ? s.battlePassClaimedTiers
            : [...s.battlePassClaimedTiers, tier],
        }));
      },

      upgradeBattlePass: () => {
        set({ battlePassPremium: true });
      },

      startNewBattlePassSeason: (newSeason) => {
        // Reset XP + claimed-tier ledger; PRESERVE premium status
        // (a persistent entitlement that carries across seasons).
        // Idempotent: setting to the same season twice produces the
        // same end state (XP 0, no claims). Going BACKWARDS in season
        // number is allowed but probably never wanted — no guard
        // here because it would just complicate testing.
        set({
          battlePassSeason: newSeason,
          battlePassXP: 0,
          battlePassClaimedTiers: [],
        });
      },

      completeWeeklyChallenge: (weekId: string, stars: number, score: number) => {
        set((s) => ({
          weeklyBestScore: s.weeklyLastWeekId === weekId ? Math.max(s.weeklyBestScore, score) : score,
          weeklyBestStars: s.weeklyLastWeekId === weekId ? Math.max(s.weeklyBestStars, stars) : stars,
          weeklyLastWeekId: weekId,
        }));
      },

      claimGiftAtomic: (bundle) => {
        set((s) => ({
          lastGiftDate: getToday(),
          ...rewardBundleDelta(s, bundle, Date.now()),
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
        // Idempotency guard matches the pattern used by every other
        // claim action in this store (claimStarChest, claimAlbumPage,
        // claimQuestChain, claimInboxReward, etc.). Without this, a
        // rapid double-tap or a stale-state re-render could push a
        // duplicate entry — currently harmless because coin granting
        // happens elsewhere, but the asymmetry is fragile and any
        // future refactor that uses `dailyQuestsClaimed.includes()` to
        // gate re-credits would silently break.
        set((s) => ({
          dailyQuestsClaimed: s.dailyQuestsClaimed.includes(questId)
            ? s.dailyQuestsClaimed
            : [...s.dailyQuestsClaimed, questId],
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

      upgradePowerUp: (type) => {
        set((s) => ({
          powerUpLevels: {
            ...s.powerUpLevels,
            [type]: Math.min(s.powerUpLevels[type] + 1, 5),
          },
        }));
      },

      purchasePowerUpUpgrade: (type, coinCost, gemCost) => {
        const s = get();
        // Affordability + max-level guard read from CURRENT state, not
        // a stale render-time closure. Both checks must pass before
        // any deduction happens.
        if (s.coins < coinCost || s.gems < gemCost) return false;
        if (s.powerUpLevels[type] >= 5) return false;
        set({
          coins: s.coins - coinCost,
          gems: s.gems - gemCost,
          powerUpLevels: {
            ...s.powerUpLevels,
            [type]: Math.min(s.powerUpLevels[type] + 1, 5),
          },
        });
        return true;
      },

      claimWorldClear: (worldId: number) => {
        set((s) => ({
          claimedWorldClears: s.claimedWorldClears.includes(worldId)
            ? s.claimedWorldClears
            : [...s.claimedWorldClears, worldId],
        }));
      },

      claimWorldPerfect: (worldId: number) => {
        set((s) => ({
          claimedWorldPerfects: s.claimedWorldPerfects.includes(worldId)
            ? s.claimedWorldPerfects
            : [...s.claimedWorldPerfects, worldId],
        }));
      },

      claimCalendarDay: (day: number, month: string) => {
        set({ calendarLastDay: day, calendarMonth: month });
      },

      claimCalendarDayAtomic: (day, month, bundle) => {
        set((s) => ({
          calendarLastDay: day,
          calendarMonth: month,
          ...rewardBundleDelta(s, bundle, Date.now()),
        }));
      },

      claimDailyDeal: (date: string) => {
        set({ lastDealClaimed: date });
      },

      equipAvatar: (id: string) => {
        set({ equippedAvatar: id });
      },

      purchaseAvatar: (id: string) => {
        set((s) => ({
          ownedAvatars: s.ownedAvatars.includes(id) ? s.ownedAvatars : [...s.ownedAvatars, id],
        }));
      },

      recordBossRushResult: (bosses: number, score: number) => {
        set((s) => ({
          bossRushBestScore: Math.max(s.bossRushBestScore, score),
          bossRushBestBosses: Math.max(s.bossRushBestBosses, bosses),
          bossRushRunsCompleted: s.bossRushRunsCompleted + 1,
        }));
      },

      addTreasureMapPiece: () => {
        set((s) => ({ treasureMapPieces: s.treasureMapPieces + 1 }));
      },

      openTreasureChest: () => {
        set((s) => ({
          treasureMapPieces: Math.max(0, s.treasureMapPieces - 5),
          treasureChestsOpened: s.treasureChestsOpened + 1,
        }));
      },

      openTreasureChestAtomic: (bundle) => {
        set((s) => ({
          treasureMapPieces: Math.max(0, s.treasureMapPieces - 5),
          treasureChestsOpened: s.treasureChestsOpened + 1,
          ...rewardBundleDelta(s, bundle, Date.now()),
        }));
      },

      enterTournament: (tier, playerScore) => {
        const now = Date.now();
        set({
          activeTournament: {
            tier,
            startedAt: now,
            endsAt: now + 24 * 60 * 60 * 1000,
            playerScore,
          },
        });
      },

      finishTournament: (finalRank: number) => {
        set((s) => ({
          activeTournament: null,
          // Previously `=== 0` was the "never finished a tournament"
          // sentinel — which collides with rank 0 (the top of the
          // leaderboard, if the ranks are 0-indexed) AND silently drops
          // an actual top finish if the value ever stays at 0 forever.
          // A genuine first-ever record passes the !== 0 check on the
          // SECOND run too, so the old code already had the right
          // intent — preserve a real best. The fix: keep the lowest
          // non-zero rank seen so far, but treat rank 0 as a valid
          // top-tier finish rather than the absence-of-record sentinel.
          tournamentBestScore:
            s.tournamentBestScore <= 0
              ? finalRank
              : finalRank <= 0
                ? s.tournamentBestScore
                : Math.min(s.tournamentBestScore, finalRank),
        }));
      },

      addInboxMessage: (message: InboxMessage) => {
        set((s) => ({
          inboxMessages: s.inboxMessages.some((m) => m.id === message.id)
            ? s.inboxMessages
            : [message, ...s.inboxMessages],
        }));
      },

      claimInboxReward: (messageId: string) => {
        set((s) => ({
          inboxClaimed: s.inboxClaimed.includes(messageId)
            ? s.inboxClaimed
            : [...s.inboxClaimed, messageId],
        }));
      },

      dismissInboxMessage: (messageId: string) => {
        set((s) => ({
          inboxDismissed: s.inboxDismissed.includes(messageId)
            ? s.inboxDismissed
            : [...s.inboxDismissed, messageId],
        }));
      },

      activateVIP: (durationMs: number) => {
        set((s) => {
          const baseline = s.vipUntil && s.vipUntil > Date.now() ? s.vipUntil : Date.now();
          return { vipUntil: baseline + durationMs };
        });
      },

      claimVIPDaily: (date: string) => {
        set({ vipDailyClaimedDate: date });
      },

      addLevelSkipTokens: (count: number) => {
        set((s) => ({ levelSkipTokens: s.levelSkipTokens + count }));
      },

      useLevelSkipToken: () => {
        const { levelSkipTokens } = get();
        if (levelSkipTokens <= 0) return false;
        set({ levelSkipTokens: levelSkipTokens - 1 });
        return true;
      },

      claimQuestChain: (chainId: string) => {
        set((s) => ({
          claimedQuestChains: s.claimedQuestChains.includes(chainId)
            ? s.claimedQuestChains
            : [...s.claimedQuestChains, chainId],
        }));
      },

      fusePowerUp: (source, sourceCost, result) => {
        const { powerUps } = get();
        if (powerUps[source] < sourceCost) return false;
        set((s) => ({
          powerUps: { ...s.powerUps, [source]: s.powerUps[source] - sourceCost },
          megaPowerUps: { ...s.megaPowerUps, [result]: s.megaPowerUps[result] + 1 },
        }));
        return true;
      },

      tradePowerUp: (from, fromCost, to, toAmount) => {
        const { powerUps } = get();
        if (powerUps[from] < fromCost) return false;
        set((s) => ({
          powerUps: {
            ...s.powerUps,
            [from]: s.powerUps[from] - fromCost,
            [to]: s.powerUps[to] + toAmount,
          },
        }));
        return true;
      },

      addSeasonalPoints: (instanceId: string, points: number) => {
        set((s) => {
          // Reset on new instance
          if (s.seasonalEventId !== instanceId) {
            return {
              seasonalEventId: instanceId,
              seasonalEventPoints: points,
              seasonalMilestonesClaimed: [],
            };
          }
          return { seasonalEventPoints: s.seasonalEventPoints + points };
        });
      },

      claimSeasonalMilestone: (key: string) => {
        set((s) => ({
          seasonalMilestonesClaimed: s.seasonalMilestonesClaimed.includes(key)
            ? s.seasonalMilestonesClaimed
            : [...s.seasonalMilestonesClaimed, key],
        }));
      },

      recordMysteryPurchase: (bucket: number, itemId: string) => {
        set((s) => {
          if (s.mysteryShopBucket !== bucket) {
            return { mysteryShopBucket: bucket, mysteryShopPurchases: [itemId] };
          }
          if (s.mysteryShopPurchases.includes(itemId)) return s;
          return { mysteryShopPurchases: [...s.mysteryShopPurchases, itemId] };
        });
      },

      addBlockMasteryXP: (color, xp) => {
        set((s) => ({
          blockMastery: {
            ...s.blockMastery,
            [color]: (s.blockMastery[color] ?? 0) + xp,
          },
        }));
      },

      claimDailyRoulette: (date: string) => {
        set({ rouletteLastDate: date });
      },

      /**
       * Atomic claim — see type doc. Idempotent: if rouletteLastDate
       * already equals `date`, the function is a no-op so a duplicate
       * fire (animation callback racing with a re-mount, replay, etc.)
       * never double-credits.
       */
      claimDailyRouletteAtomic: (date, payload, kind) => {
        set((s) => {
          if (s.rouletteLastDate === date) return s;
          const next: Partial<typeof s> = { rouletteLastDate: date };
          if (payload.coins) next.coins = s.coins + payload.coins;
          if (payload.gems) next.gems = s.gems + payload.gems;
          if (payload.bomb || payload.rowClear || payload.colorClear) {
            next.powerUps = {
              bomb: s.powerUps.bomb + (payload.bomb ?? 0),
              rowClear: s.powerUps.rowClear + (payload.rowClear ?? 0),
              colorClear: s.powerUps.colorClear + (payload.colorClear ?? 0),
            };
          }
          if (payload.lives) {
            next.lives = 5;
            next.lastLifeLostAt = null;
          }
          // Wire boost rewards. The `kind` arg disambiguates which boost
          // axis the duration belongs to. If a future reward adds a new
          // boost kind without updating this switch, the boost silently
          // does nothing — same failure mode as before this fix, but
          // now scoped to a clearly-marked branch.
          if (payload.boostDurationMs && kind) {
            const boostKind: BoostKind | null =
              kind === 'double_coins' ? 'coins' : kind === 'xp_boost' ? 'xp' : null;
            if (boostKind) {
              next.activeBoostUntil = {
                ...s.activeBoostUntil,
                [boostKind]: extendBoost(
                  s.activeBoostUntil[boostKind],
                  payload.boostDurationMs,
                  Date.now(),
                ),
              };
            }
          }
          return next;
        });
      },

      unlockStarterPack: () => {
        set((s) => {
          if (s.starterPackUnlockedAt !== null || s.starterPackClaimed) return s;
          return { starterPackUnlockedAt: Date.now() };
        });
      },

      claimStarterPack: () => {
        set({ starterPackClaimed: true });
      },

      recordFlashOfferPurchase: (key: string) => {
        set((s) => ({
          flashOfferPurchases: s.flashOfferPurchases.includes(key)
            ? s.flashOfferPurchases
            : [...s.flashOfferPurchases, key],
        }));
      },

      claimFreeChestAtomic: (bundle) => {
        set((s) => ({
          freeChestLastClaimedAt: Date.now(),
          ...rewardBundleDelta(s, bundle, Date.now()),
        }));
      },

      claimComebackBonusAtomic: (bundle) => {
        const today = getToday();
        // Persistent idempotency guard — refuse a second claim on the
        // same day regardless of component-local state resets.
        if (get().lastComebackClaimedDate === today) return false;
        set((s) => ({
          lastComebackClaimedDate: today,
          ...rewardBundleDelta(s, bundle, Date.now()),
        }));
        return true;
      },

      claimFreeChest: () => {
        set({ freeChestLastClaimedAt: Date.now() });
      },

      loadDemoState: () => {
        set({
          highestLevel: 20,
          coins: 2500,
          gems: 150,
          totalScore: 45000,
          totalLinesCleared: 380,
          currentStreak: 5,
          longestStreak: 5,
          totalGamesPlayed: 40,
          bestCombo: 6,
          powerUps: { bomb: 3, rowClear: 2, colorClear: 2 },
          piggyBankCoins: 85,
          treasureMapPieces: 2,
          lives: 5,
          skillRating: 450,
          dailyRewardDay: 4,
          battlePassXP: 300,
        });
      },
    }),
    {
      name: 'chroma-drop-player',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Existing installs saved state with no version (treated as v0). Return it
      // as-is so the player's economy/progress survives the upgrade; the merge
      // function below back-fills any newly added fields. Without a migrate,
      // Zustand discards the old save on a version bump.
      migrate: (persisted) => persisted as PlayerStore,
      // Zustand's default merge is SHALLOW — it overrides top-level keys with
      // persisted values, but anything nested (`powerUpLevels.colorClear`,
      // `blockMastery.pink`, …) comes through wholesale from the old save and
      // newly-added subkeys are missing. The Power-Up Upgrades screen would
      // then read `undefined`, compute `Math.min(undefined + 1, 5) === NaN`,
      // persist NaN, and corrupt every future upgrade. Deep-merge each known
      // nested object against the current defaults so legacy saves pick up
      // every newly-added field on rehydrate.
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        const p = persisted as Partial<PlayerStore>;
        const merged: PlayerStore = { ...current, ...p };
        if (current.powerUps) merged.powerUps = { ...current.powerUps, ...(p.powerUps ?? {}) };
        if (current.powerUpLevels) merged.powerUpLevels = { ...current.powerUpLevels, ...(p.powerUpLevels ?? {}) };
        if (current.megaPowerUps) merged.megaPowerUps = { ...current.megaPowerUps, ...(p.megaPowerUps ?? {}) };
        if (current.blockMastery) merged.blockMastery = { ...current.blockMastery, ...(p.blockMastery ?? {}) };
        if (current.activeBoostUntil) merged.activeBoostUntil = { ...current.activeBoostUntil, ...(p.activeBoostUntil ?? {}) };
        return merged;
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('[playerStore] rehydrate failed', error);
      },
    }
  )
);
