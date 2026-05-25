/**
 * Web facade for the analytics service.
 * The native implementation imports @sentry/react-native (native-only), so
 * Metro picks this `.web.ts` for the web export to short-circuit Sentry.
 * PostHog product analytics DOES work on web (plain HTTP capture), routed
 * through the shared analyticsPostHog module so this stays in lockstep with
 * analytics.ts — keep the public API identical across both files.
 */

import { initPostHog, capturePostHog, setPostHogUser } from './analyticsPostHog';

export async function initAnalytics(): Promise<void> {
  await initPostHog();
}

export function initSentry(): void {
  // no-op on web
}

export function isSentryConfigured(): boolean {
  return false;
}

export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log(`[Analytics] ${name}`, data ?? '');
  }
  capturePostHog(name, data);
}

export function trackGameEvent(event: {
  type: 'level_start' | 'level_complete' | 'level_fail' | 'purchase' | 'ad_watched' | 'powerup_used';
  level?: number;
  score?: number;
  stars?: number;
  productId?: string;
  adType?: string;
  powerupType?: string;
}): void {
  trackEvent(`game.${event.type}`, event as Record<string, unknown>);
}

export function trackScreen(screenName: string): void {
  trackEvent('screen_view', { screen: screenName });
}

export function reportError(error: Error, context?: Record<string, unknown>): void {
  console.error('[Error]', error.message, context ?? '');
}

export function setUser(userId: string | null): void {
  if (userId) {
    setPostHogUser(userId);
    trackEvent('user_identified', { userId });
  }
}
