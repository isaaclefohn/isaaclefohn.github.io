/**
 * Web stub for the analytics service.
 * The real native implementation imports @sentry/react-native, which is
 * native-only. Metro picks `.web.ts` first for the web export, so this
 * file short-circuits Sentry calls in the static preview.
 */

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
    trackEvent('user_identified', { userId });
  }
}
