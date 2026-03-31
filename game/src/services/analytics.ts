/**
 * Analytics and event tracking service.
 * Wraps Sentry for error tracking and custom event logging.
 * Falls back to console logging when Sentry is not configured.
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** Whether Sentry is configured */
export function isSentryConfigured(): boolean {
  return Boolean(SENTRY_DSN);
}

/** Track a custom analytics event */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log(`[Analytics] ${name}`, data ?? '');
  }
  // TODO: Send to Sentry as breadcrumb when configured
  // Sentry.addBreadcrumb({ category: 'analytics', message: name, data });
}

/** Track a game event */
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

/** Track a screen view */
export function trackScreen(screenName: string): void {
  trackEvent('screen_view', { screen: screenName });
}

/** Report an error */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  console.error('[Error]', error.message, context ?? '');
  // TODO: Sentry.captureException(error, { extra: context });
}

/** Set user context for error tracking */
export function setUser(userId: string | null): void {
  if (userId) {
    trackEvent('user_identified', { userId });
    // TODO: Sentry.setUser({ id: userId });
  } else {
    // TODO: Sentry.setUser(null);
  }
}
