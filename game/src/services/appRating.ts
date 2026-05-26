/**
 * App Store rating prompt service.
 *
 * Apple's SKStoreReviewController allows up to 3 prompts per user per
 * 365 days (silently capped, no error). Per the 2026-06 growth plan,
 * we spend all three slots in the first ~30 days at the highest local
 * satisfaction peaks:
 *
 *   Slot 1 — chapter_one_boss   → Chapter 1 boss win (level 30),
 *                                 crash-free session, ≥2 sessions
 *   Slot 2 — streak_day_7       → Daily streak hits 7 days,
 *                                 streak shield intact
 *   Slot 3 — perfect_cascade    → 3-star win at level ≥50 with at
 *                                 least one chromatic clear
 *
 * Each slot is single-fire (idempotent: replaying Level 30 does NOT
 * re-fire `chapter_one_boss`) and only one slot can fire in any
 * 30-day window — so users do not get all three prompts during a
 * single hot week, and never get pestered on a bad day.
 *
 * `canFireSlot` is a pure function exported for unit testing — the
 * I/O wrapper (`firePrompt`) reads / writes persistent state but
 * decides via this function so the policy is testable without an
 * AsyncStorage mock.
 */

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  canFireSlot,
  DEFAULT_RATING_STATE as DEFAULT_STATE,
  type RatingSlot,
  type RatingState,
} from './appRating.gates';

// Re-export the gate types + helpers so callers can import everything
// from a single module — the split is an internal jest-compat detail.
export {
  canFireSlot,
  MIN_DAYS_BETWEEN_PROMPTS,
  type RatingSlot,
  type RatingState,
} from './appRating.gates';

const RATING_STORAGE_KEY = 'app_rating_state_v2';

async function getState(): Promise<RatingState> {
  try {
    const data = await AsyncStorage.getItem(RATING_STORAGE_KEY);
    if (data) return { ...DEFAULT_STATE, ...JSON.parse(data) };
  } catch {}
  return { ...DEFAULT_STATE };
}

async function setState(state: RatingState): Promise<void> {
  try {
    await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Record an app-open session. Called from App.tsx on boot. The
 *  chapter-1 gate requires ≥2 sessions so a brand-new player never
 *  sees a prompt before their second visit. */
export async function recordSessionStart(): Promise<void> {
  const s = await getState();
  await setState({ ...s, sessionCount: s.sessionCount + 1 });
}

/** Internal: actually call the system prompt, with all gates. */
async function firePrompt(slot: RatingSlot): Promise<boolean> {
  const available = await StoreReview.isAvailableAsync();
  if (!available) return false;
  const today = new Date().toISOString().split('T')[0];
  const state = await getState();
  if (!canFireSlot(slot, state, today)) return false;
  try {
    await StoreReview.requestReview();
    await setState({
      ...state,
      slotsFired: [...state.slotsFired, slot],
      lastPromptDate: today,
    });
    return true;
  } catch {
    return false;
  }
}

// ── The three triggers from the 2026-06 growth plan ───────────────

/** Fire after the Chapter 1 boss (level 30) is cleared. Caller
 *  passes `crashFreeSession` so we don't prompt on a session that
 *  already had visible errors. */
export async function maybePromptForChapterOneBoss(opts: {
  crashFreeSession: boolean;
}): Promise<boolean> {
  if (!opts.crashFreeSession) return false;
  const state = await getState();
  // Require ≥2 sessions so a player who happens to clear L30 on their
  // very first sitting still doesn't get a prompt before they've come
  // back. "Did this app stick for me?" is the implicit question; one
  // session can't answer it.
  if (state.sessionCount < 2) return false;
  return firePrompt('chapter_one_boss');
}

/** Fire when the player's daily streak hits 7 days, on home open,
 *  with shield intact. Day-7 not day-5 — Day 5 hasn't survived the
 *  typical Day 6-7 churn cliff, so Day 7 is the stronger "this app
 *  stuck for me" signal per the growth plan. */
export async function maybePromptForStreakDay7(opts: {
  currentStreak: number;
  shieldIntact: boolean;
}): Promise<boolean> {
  if (opts.currentStreak < 7) return false;
  if (!opts.shieldIntact) return false;
  return firePrompt('streak_day_7');
}

/** Fire after a 3-star level win at L≥50 with at least one chromatic
 *  clear — the brand-signature satisfaction peak in the mid-campaign.
 *  Reserved for late-funnel "wow" moments rather than a fixed level. */
export async function maybePromptForPerfectCascade(opts: {
  level: number;
  stars: number;
  chromaticClears: number;
}): Promise<boolean> {
  if (opts.level < 50) return false;
  if (opts.stars < 3) return false;
  if (opts.chromaticClears < 1) return false;
  return firePrompt('perfect_cascade');
}

// ── Legacy API (kept as a no-op so existing callers don't break) ──

/** @deprecated Use the slot-specific maybePromptForX functions instead.
 *  Kept as a no-op shim so a stale import in useGameEngine doesn't crash
 *  before the migration is complete. Safe to delete once all callers are
 *  on the new API. */
export async function recordCompletionForRating(): Promise<void> {
  // no-op
}

/** @deprecated See `recordCompletionForRating` above. */
export async function maybePromptRating(_totalLevelsCompleted: number): Promise<boolean> {
  return false;
}
