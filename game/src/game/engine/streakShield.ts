/**
 * Streak shield logic — the "loss-aversion clamp" that catches the unlucky
 * one-miss churn cliff (per the 7-day-addiction research).
 *
 * Streaks alone are fragile: one missed day and the player is gone. Duolingo
 * solved this with streak freezes; we copy that pattern. Earn a free shield
 * every Nth streak day; consume it on a single-day miss to keep the streak
 * alive. The shield is intentionally FREE and FINITE — never monetized,
 * never FOMO-triggered. The compulsion loop is fine; weaponizing the panic
 * of losing it is not (per the neuroscience-of-dopamine research's ethical
 * line).
 *
 * Pure function: given today + lastPlayDate + currentStreak + shields,
 * returns the new values. Tested via direct input/output; no store mocking.
 */

/** Max shields a player can hold at any time. Intentionally low so each one
 *  feels precious; a stockpile would dull the loss-aversion lever. */
export const MAX_STREAK_SHIELDS = 1;

/** Grant a shield each time the streak hits a multiple of this number,
 *  provided the player has no shield already. At 5 the cadence aligns with
 *  the addiction-research recommendation (D5 grant) and gives ~one shield
 *  per workweek of consistent play. */
export const SHIELD_GRANT_INTERVAL = 5;

export interface StreakShieldInput {
  /** Today's date in YYYY-MM-DD (local). */
  today: string;
  /** Last date the player played, or null on first ever play. */
  lastPlayDate: string | null;
  /** Current streak count (days). */
  currentStreak: number;
  /** Current shields held (0 or 1). */
  streakShields: number;
}

export interface StreakShieldResult {
  newStreak: number;
  newShields: number;
  /** True if a held shield was just consumed to save a 1-day miss. UI shows
   *  a "🛡️ Streak Saved!" toast when this is true. */
  shieldConsumed: boolean;
  /** True if a new shield was just granted (multiple-of-5 streak milestone).
   *  UI shows a "🛡️ Streak Shield earned!" toast. */
  shieldGranted: boolean;
}

/** Number of days between two YYYY-MM-DD dates (local midnight basis). */
function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00');
  const b = new Date(toIso + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function applyStreakShield(input: StreakShieldInput): StreakShieldResult {
  const { today, lastPlayDate, currentStreak, streakShields } = input;

  // Already played today — no streak change.
  if (lastPlayDate === today) {
    return {
      newStreak: currentStreak,
      newShields: streakShields,
      shieldConsumed: false,
      shieldGranted: false,
    };
  }

  // First play ever — start the streak at 1.
  if (!lastPlayDate) {
    return {
      newStreak: 1,
      newShields: streakShields,
      shieldConsumed: false,
      shieldGranted: false,
    };
  }

  const diffDays = daysBetween(lastPlayDate, today);

  let newStreak: number;
  let shieldConsumed = false;

  if (diffDays === 1) {
    // Played yesterday — natural continuation.
    newStreak = currentStreak + 1;
  } else if (diffDays === 2 && streakShields > 0 && currentStreak >= 1) {
    // Single-day miss with a shield available — save the streak. Shields do
    // NOT cover multi-day absences (gap >= 3) — those are real churn, not
    // bad luck, and saving them would devalue the shield's meaning.
    newStreak = currentStreak + 1;
    shieldConsumed = true;
  } else {
    // Streak broken — reset to 1 (today still counts as a play).
    newStreak = 1;
  }

  // Grant a fresh shield each time the streak crosses a multiple of the
  // grant interval, provided the slot is empty AND the streak actually
  // changed this turn (so we never double-grant on a no-op call).
  let newShields = streakShields - (shieldConsumed ? 1 : 0);
  let shieldGranted = false;
  if (
    newShields < MAX_STREAK_SHIELDS &&
    newStreak !== currentStreak &&
    newStreak % SHIELD_GRANT_INTERVAL === 0
  ) {
    newShields = MAX_STREAK_SHIELDS;
    shieldGranted = true;
  }

  return { newStreak, newShields, shieldConsumed, shieldGranted };
}
