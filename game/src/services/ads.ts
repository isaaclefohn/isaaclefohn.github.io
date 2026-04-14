/**
 * Ad management service for Color Block Blast.
 * Handles frequency capping, ad-free detection, and real AdMob delivery.
 *
 * In Expo Go (development), ads are simulated because the native module
 * is not bundled. Production/preview builds use react-native-google-mobile-ads.
 */

import { usePlayerStore } from '../store/playerStore';
import Constants from 'expo-constants';

// Detect if running in Expo Go (no native ad support)
const isExpoGo = Constants.appOwnership === 'expo';

// Ad unit IDs (env vars with Google test-ID fallbacks)
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

// Lazy-loaded native module. Stays null in Expo Go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AdsModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let preloadedInterstitial: any = null;
let adsInitialized = false;

function loadAdsModule(): boolean {
  if (AdsModule || isExpoGo) return Boolean(AdsModule);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AdsModule = require('react-native-google-mobile-ads');
    return true;
  } catch {
    AdsModule = null;
    return false;
  }
}

/** Initialize the Mobile Ads SDK. Call once at app startup. */
export async function initializeAds(): Promise<void> {
  if (isExpoGo) return; // Ads not available in Expo Go
  if (adsInitialized) return;
  if (!loadAdsModule() || !AdsModule) return;

  try {
    await AdsModule.default().initialize();
    adsInitialized = true;
    preloadInterstitial();
  } catch (err) {
    console.warn('[Ads] initialize failed', err);
  }
}

function preloadInterstitial(): void {
  if (!AdsModule) return;
  try {
    const { InterstitialAd, AdEventType } = AdsModule;
    preloadedInterstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    preloadedInterstitial.addAdEventListener(AdEventType.LOADED, () => {});
    preloadedInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // Immediately queue the next one for low-latency delivery
      try {
        preloadedInterstitial?.load();
      } catch {
        /* ignore */
      }
    });
    preloadedInterstitial.load();
  } catch (err) {
    console.warn('[Ads] preload interstitial failed', err);
  }
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
 * In Expo Go or when the SDK failed to load, simulates a successful view.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (isExpoGo || !loadAdsModule() || !AdsModule) {
    onRewardedShown();
    return true;
  }

  return new Promise<boolean>((resolve) => {
    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = AdsModule;
      const ad = RewardedAd.createForAdRequest(REWARDED_AD_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      let earned = false;
      let settled = false;
      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        try {
          ad.show();
        } catch (err) {
          console.warn('[Ads] rewarded show failed', err);
          settle(false);
        }
      });
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
        onRewardedShown();
      });
      ad.addAdEventListener(AdEventType.CLOSED, () => settle(earned));
      ad.addAdEventListener(AdEventType.ERROR, (err: unknown) => {
        console.warn('[Ads] rewarded error', err);
        settle(false);
      });
      ad.load();

      // Safety timeout: don't hang forever
      setTimeout(() => settle(earned), 30_000);
    } catch (err) {
      console.warn('[Ads] rewarded threw', err);
      resolve(false);
    }
  });
}

/**
 * Show an interstitial ad. Returns true if shown successfully.
 * In Expo Go, returns immediately.
 */
export async function showInterstitialAd(): Promise<boolean> {
  if (isExpoGo || !loadAdsModule() || !AdsModule) return true;
  if (!preloadedInterstitial) {
    preloadInterstitial();
    return false;
  }
  try {
    if (preloadedInterstitial.loaded) {
      preloadedInterstitial.show();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Ads] interstitial show failed', err);
    return false;
  }
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
