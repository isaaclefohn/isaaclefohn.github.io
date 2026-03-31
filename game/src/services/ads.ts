/**
 * Ad management service.
 * Wraps AdMob with frequency capping, ad-free status, and preloading.
 * Falls back gracefully when AdMob is not installed/configured.
 */

import { usePlayerStore } from '../store/playerStore';

// AdMob IDs (use test IDs during development)
const REWARDED_AD_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? 'ca-app-pub-3940256099942544/5224354917';
const INTERSTITIAL_AD_ID = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? 'ca-app-pub-3940256099942544/1033173712';

// Frequency caps
const MAX_REWARDED_PER_HOUR = 5;
const INTERSTITIAL_EVERY_N_LEVELS = 3;
const MIN_INTERSTITIAL_INTERVAL_MS = 120_000; // 2 minutes

let rewardedCount = 0;
let rewardedResetTime = Date.now() + 3600_000;
let lastInterstitialTime = 0;
let levelsCompletedSinceAd = 0;

/** Check if ads should be shown (respects ad-free purchase) */
export function shouldShowAds(): boolean {
  return !usePlayerStore.getState().adFree;
}

/** Track level completion for interstitial pacing */
export function onLevelCompleted(): boolean {
  if (!shouldShowAds()) return false;

  levelsCompletedSinceAd++;
  const now = Date.now();

  if (
    levelsCompletedSinceAd >= INTERSTITIAL_EVERY_N_LEVELS &&
    now - lastInterstitialTime >= MIN_INTERSTITIAL_INTERVAL_MS
  ) {
    levelsCompletedSinceAd = 0;
    lastInterstitialTime = now;
    return true; // Show interstitial
  }

  return false;
}

/** Check if a rewarded ad can be shown (frequency cap) */
export function canShowRewarded(): boolean {
  if (!shouldShowAds()) return false;

  const now = Date.now();
  if (now > rewardedResetTime) {
    rewardedCount = 0;
    rewardedResetTime = now + 3600_000;
  }

  return rewardedCount < MAX_REWARDED_PER_HOUR;
}

/** Record that a rewarded ad was shown */
export function onRewardedShown(): void {
  rewardedCount++;
}

/** Get ad unit IDs */
export function getAdIds() {
  return {
    rewarded: REWARDED_AD_ID,
    interstitial: INTERSTITIAL_AD_ID,
  };
}

/**
 * Reward types that can be granted from watching an ad.
 */
export type AdRewardType = 'coins' | 'extraLife' | 'powerup';

export interface AdReward {
  type: AdRewardType;
  amount: number;
}

/** Standard ad rewards */
export const AD_REWARDS: Record<string, AdReward> = {
  coins: { type: 'coins', amount: 25 },
  extraLife: { type: 'extraLife', amount: 1 },
  powerup: { type: 'powerup', amount: 1 },
};
