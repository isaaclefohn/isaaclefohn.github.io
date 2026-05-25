/**
 * Platform-agnostic PostHog product analytics via the HTTP capture API.
 * Shared by analytics.ts (native) and analytics.web.ts so the two platform
 * facades can never drift on the analytics sink. No native SDK — a plain
 * fetch works identically on iOS, Android, and the web preview.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const ANON_ID_KEY = 'analytics_distinct_id';
let distinctId: string | null = null;

/** Load (or create) a stable anonymous id so PostHog can attribute events to a
 *  consistent user across sessions (required for retention/funnel). */
export async function initPostHog(): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    let id = await AsyncStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = Crypto.randomUUID();
      await AsyncStorage.setItem(ANON_ID_KEY, id);
    }
    distinctId = id;
  } catch {
    // best-effort — analytics must never break the app
  }
}

/** Attribute subsequent events to a known user id (after sign-in). */
export function setPostHogUser(userId: string): void {
  distinctId = userId;
}

/** Fire-and-forget event to PostHog's capture API. */
export function capturePostHog(event: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY || !distinctId) return;
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id: distinctId,
      properties: properties ?? {},
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}
