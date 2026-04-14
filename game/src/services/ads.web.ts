/**
 * Web stub for the ads service.
 * The real native implementation in ads.ts imports react-native-google-mobile-ads,
 * which is native-only. Metro resolves `.web.ts` first on web, so this file
 * short-circuits the entire ads flow for the static preview/export build.
 */

import { usePlayerStore } from '../store/playerStore';

const INTERSTITIAL_EVERY_N_LEVELS = 3;
let levelsCompletedSinceAd = 0;

export async function initializeAds(): Promise<void> {
  return;
}

export function shouldShowAds(): boolean {
  return !usePlayerStore.getState().adFree;
}

export function onLevelCompleted(): boolean {
  if (!shouldShowAds()) return false;
  levelsCompletedSinceAd++;
  if (levelsCompletedSinceAd >= INTERSTITIAL_EVERY_N_LEVELS) {
    levelsCompletedSinceAd = 0;
    return true;
  }
  return false;
}

export function canShowRewarded(): boolean {
  return shouldShowAds();
}

export function onRewardedShown(): void {
  // no-op
}

export async function showRewardedAd(): Promise<boolean> {
  // Simulate ad in the web preview so the reward path still exercises.
  return true;
}

export async function showInterstitialAd(): Promise<boolean> {
  return true;
}

export function getAdIds() {
  return { rewarded: '', interstitial: '' };
}

export type AdRewardType = 'coins' | 'extraLife' | 'powerup';

export interface AdReward {
  type: AdRewardType;
  amount: number;
}

export const AD_REWARDS: Record<string, AdReward> = {
  coins: { type: 'coins', amount: 25 },
  extraLife: { type: 'extraLife', amount: 1 },
  powerup: { type: 'powerup', amount: 1 },
};
