/**
 * Pure-function gate logic for the App Store rating prompt. Kept in
 * a separate module from `appRating.ts` so unit tests can import
 * without pulling in `expo-store-review` (Metro-only ES module that
 * crashes Jest's node runtime).
 *
 * Same separation-of-concerns pattern as `streakShield.ts`: the I/O
 * wrapper is the thinnest possible layer; the policy lives here.
 */

/** Minimum days between any two prompt fires — keeps users from
 *  getting all three in one busy launch week. Well inside Apple's
 *  365-day cap; this is a politeness cap, not a regulatory one. */
export const MIN_DAYS_BETWEEN_PROMPTS = 30;

/** A specific in-game event that can spend one of the three system
 *  prompt slots. Naming is event-shaped (what happened) rather than
 *  count-shaped (1/2/3) so we can reason about idempotency. */
export type RatingSlot =
  | 'chapter_one_boss'
  | 'streak_day_7'
  | 'perfect_cascade';

export interface RatingState {
  slotsFired: RatingSlot[];
  lastPromptDate: string | null;
  sessionCount: number;
}

export const DEFAULT_RATING_STATE: RatingState = {
  slotsFired: [],
  lastPromptDate: null,
  sessionCount: 0,
};

/**
 * Pure-function gate. Given current state + today, decide whether
 * `slot` is eligible to fire. Three checks, in order:
 *   1. Slot hasn't already been spent (idempotency).
 *   2. We haven't already spent all 3 slots total (Apple cap respect).
 *   3. The 30-day cooldown since the last prompt has elapsed.
 *
 * Per-slot conditions (level, streak count, etc.) are caller-evaluated
 * before this function — keeps the gate logic small and the policy
 * obvious.
 */
export function canFireSlot(
  slot: RatingSlot,
  state: RatingState,
  today: string,
): boolean {
  if (state.slotsFired.includes(slot)) return false;
  if (state.slotsFired.length >= 3) return false;
  if (state.lastPromptDate) {
    const diff = Math.floor(
      (new Date(today).getTime() - new Date(state.lastPromptDate).getTime()) /
        86_400_000,
    );
    if (diff < MIN_DAYS_BETWEEN_PROMPTS) return false;
  }
  return true;
}
