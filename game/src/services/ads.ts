/**
 * Ad management service for Color Block Blast.
 * Handles frequency capping and ad-free detection.
 *
 * In Expo Go (development), ads are simulated.
 * In production builds, wire in react-native-google-mobile-ads.
 */

import { usePlayerStore } from '../store/playerStore';
import Constants from 'expo-constants';

// Detect if running in Expo Go (no native ad support)
const isExpoGo = Constants.appOwnership === 'expo';

// Ad unit IDs (env vars with test ID fallbacks)
const REWARDED_AD_ID =
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? 'ca-app-pub-3940256099942544/5224354917';
const INTERSTITIAL_AD_ID =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? 'ca-app-pub-3940256099942544/1033173712';

// Frequency caps
const MAX_REWARDED_PER_HOUR = 5;
const INTERSTITIAL_EVERY_N_LEVELS = 3;
const MIN_INTERSTITIAL_INTERVAL_MS = 120_000; // 2 minutes

let rewardedCount = 0;
let rewardedResetTime = Date.now() + 3600_000;
let lastInterstitialTime = 0;
let levelsCompletedSinceAd = 0;

/** Initialize the Mobile Ads SDK. Call once at app startup. */
export async function initializeAds(): Promise<void> {
  if (isExpoGo) return; // Ads not available in Expo Go
  // In production builds, initialize the ads SDK here
}

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
    return true;
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

/**
 * Show a rewarded ad. Returns true if the user earned the reward.
 * In Expo Go, simulates a successful ad view.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (isExpoGo) {
    // Simulate ad in development
    onRewardedShown();
    return true;
  }
  // Production: wire in react-native-google-mobile-ads here
  return false;
}

/**
 * Show an interstitial ad. Returns true if shown successfully.
 * In Expo Go, returns immediately.
 */
export async function showInterstitialAd(): Promise<boolean> {
  if (isExpoGo) return true;
  // Production: wire in react-native-google-mobile-ads here
  return false;
}

/** Get ad unit IDs */
export function getAdIds() {
  return {
    rewarded: REWARDED_AD_ID,
    interstitial: INTERSTITIAL_AD_ID,
  };
}

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
