/**
 * Ad management service for Chroma Drop.
 * Handles frequency capping, ad-free detection, and real AdMob delivery.
 *
 * In Expo Go (development), ads are simulated because the native module
 * is not bundled. Production/preview builds use react-native-google-mobile-ads.
 */

import { usePlayerStore } from '../store/playerStore';
import Constants from 'expo-constants';
import { trackGameEvent } from './analytics';

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

// Remote kill switch (launch-readiness item: disable ads without an app
// update if AdMob misbehaves during the v1 limited-serving window). A static
// JSON on the website — no server logic. FAIL-OPEN by design: a 404 (file
// not yet merged to main), network error, or malformed body leaves ads
// enabled; only an explicit {"adsEnabled": false} disables them.
const REMOTE_ADS_CONFIG_URL = 'https://isaaclefohn.com/chroma/config.json';
let remoteAdsEnabled = true;

/**
 * Best-effort fetch of the remote ads config. Called fire-and-forget from
 * initializeAds so a slow fetch never delays ad SDK init. Exported (with an
 * injectable URL) so the fail-open semantics are unit-testable.
 */
export async function refreshRemoteAdsConfig(
  url: string = REMOTE_ADS_CONFIG_URL,
  timeoutMs: number = 4000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const json = await res.json();
        // Only an explicit false flips the switch — absent key stays open.
        remoteAdsEnabled = json?.adsEnabled !== false;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    remoteAdsEnabled = true; // fail-open
  }
  return remoteAdsEnabled;
}

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

  // Fire-and-forget: never let a slow config fetch delay SDK init.
  void refreshRemoteAdsConfig();

  try {
    // Age-rating consistency (launch-readiness item 5): the game answers the
    // ASC questionnaire as 4+, so ad CONTENT must stay 4+-appropriate too.
    // G = general audiences. Set before initialize per AdMob docs.
    try {
      await AdsModule.default().setRequestConfiguration({
        maxAdContentRating: AdsModule.MaxAdContentRating?.G ?? 'G',
      });
    } catch (err) {
      console.warn('[Ads] setRequestConfiguration failed', err);
    }
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

/** Check if ads should be shown (respects ad-free purchase + remote kill switch) */
export function shouldShowAds(): boolean {
  return remoteAdsEnabled && !usePlayerStore.getState().adFree;
}

/**
 * Tick the interstitial-cap counter and return whether an ad should
 * show on THIS event. Called from the lose-modal dismiss path (and
 * historically from the win path, but per the 2026-06 monetization
 * audit we moved it off the win path — Block Blast Classical shows
 * interstitials on lose, not win, and punishing success is the wrong
 * dopamine arc for a puzzle game).
 *
 * The counter is named for level-completion for legacy reasons; what
 * it really tracks is "events since the last interstitial." Keeping
 * the name to avoid churning the public API of this module.
 */
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
  trackGameEvent({ type: 'ad_watched', adType: 'rewarded' });
}

/**
 * Show a rewarded ad. Returns true if the user earned the reward.
 * In Expo Go or when the SDK failed to load, simulates a successful view.
 */
export async function showRewardedAd(): Promise<boolean> {
  // Expo Go (dev) has no native ad module — simulate a successful view.
  if (isExpoGo) {
    onRewardedShown();
    return true;
  }
  // Production: if the SDK is unavailable, DENY the reward. Granting it here
  // would let a player earn rewards simply by blocking the ad network.
  if (!loadAdsModule() || !AdsModule) {
    console.warn('[Ads] rewarded unavailable (SDK not loaded) — denying reward');
    return false;
  }

  return new Promise<boolean>((resolve) => {
    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = AdsModule;
      const ad = RewardedAd.createForAdRequest(REWARDED_AD_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      let earned = false;
      let settled = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        // Clear the 30s safety timeout on natural settle paths (ad
        // closed normally, ad errored, show failed). Otherwise the
        // timeout closure pinned `ad`, `earned`, and `settled` for the
        // full 30s past every successful ad watch, delaying GC of the
        // ad instance and its 4 listeners.
        if (timeoutHandle) clearTimeout(timeoutHandle);
        timeoutHandle = null;
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

      // Safety timeout: don't hang forever. Captured into `timeoutHandle`
      // so the natural settle paths above can cancel it.
      timeoutHandle = setTimeout(() => settle(earned), 30_000);
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
      trackGameEvent({ type: 'ad_watched', adType: 'interstitial' });
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
