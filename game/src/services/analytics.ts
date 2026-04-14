/**
 * Analytics and event tracking service.
 * Wraps Sentry for error tracking and custom event logging.
 * Falls back to console logging when Sentry is not configured or
 * the native module is unavailable (e.g., Expo Go).
 */

import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const isExpoGo = Constants.appOwnership === 'expo';

// Lazily load Sentry to avoid crashing Expo Go (native module not bundled).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;
let sentryReady = false;

function loadSentry(): void {
  if (sentryReady || isExpoGo || !SENTRY_DSN) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Sentry = require('@sentry/react-native');
    sentryReady = true;
  } catch {
    Sentry = null;
  }
}

/** Initialize Sentry. Safe to call multiple times; no-op in Expo Go. */
export function initSentry(): void {
  if (isExpoGo || !SENTRY_DSN) return;
  loadSentry();
  if (!Sentry) return;
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      enableAutoSessionTracking: true,
      tracesSampleRate: 0.2,
      debug: false,
    });
  } catch (err) {
    console.warn('[Sentry] init failed', err);
  }
}

/** Whether Sentry is configured */
export function isSentryConfigured(): boolean {
  return Boolean(SENTRY_DSN) && !isExpoGo;
}

/** Track a custom analytics event */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log(`[Analytics] ${name}`, data ?? '');
  }
  loadSentry();
  if (Sentry) {
    try {
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: name,
        data,
        level: 'info',
      });
    } catch {
      // swallow
    }
  }
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
  loadSentry();
  if (Sentry) {
    try {
      Sentry.captureException(error, { extra: context });
    } catch {
      // swallow
    }
  }
}

/** Set user context for error tracking */
export function setUser(userId: string | null): void {
  if (userId) {
    trackEvent('user_identified', { userId });
  }
  loadSentry();
  if (Sentry) {
    try {
      Sentry.setUser(userId ? { id: userId } : null);
    } catch {
      // swallow
    }
  }
}
