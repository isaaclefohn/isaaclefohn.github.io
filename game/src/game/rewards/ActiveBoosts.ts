/**
 * Time-windowed 2x multipliers granted by the Daily Roulette
 * (Double Time → coins, XP Surge → battle-pass XP).
 *
 * Kept as a pure module (no Zustand, no React) so the lifecycle
 * is unit-testable without the AsyncStorage harness — same pattern
 * as `game/engine/streakShield.ts`.
 *
 * The store (`playerStore.activeBoostUntil`) persists a `{ coins?, xp? }`
 * map of unix-ms expiration timestamps. A field is "active" when its
 * timestamp is in the future relative to `Date.now()`. Absent / past
 * timestamps mean no boost.
 */

export type BoostKind = 'coins' | 'xp';

export interface ActiveBoostUntil {
  coins?: number;
  xp?: number;
}

export const BOOST_MULTIPLIER = 2;

/** True if `kind` is currently active (expiration is in the future). */
export function isBoostActive(
  state: ActiveBoostUntil,
  kind: BoostKind,
  now: number,
): boolean {
  const until = state[kind];
  return until !== undefined && until > now;
}

/**
 * Apply the boost to a credit amount.
 *
 * Pure: doesn't mutate or read time itself — caller passes `now`.
 * `Math.round` lives here because some callers pass fractional amounts
 * (e.g. `xpMult * 75` in useGameEngine), and a half-XP credit would
 * surprise the player and the integer tier math downstream.
 */
export function applyBoost(
  amount: number,
  state: ActiveBoostUntil,
  kind: BoostKind,
  now: number,
): number {
  if (!isBoostActive(state, kind, now)) return amount;
  return Math.round(amount * BOOST_MULTIPLIER);
}

/**
 * Compute the next `activeBoostUntil` value when a new boost of length
 * `durationMs` is granted for `kind`.
 *
 * --- POLICY DECISION (chained-spin behavior) ---
 *
 * What should happen if the player wins Double Time today, then wins
 * Double Time again tomorrow while the first 30-minute window is still
 * counting down? Three options:
 *
 *   (a) EXTEND  — `max(currentUntil, now) + durationMs`. Time never
 *       lost; consecutive wins compound. Most player-friendly.
 *   (b) OVERWRITE — `now + durationMs`. Fresh 30-min window each spin.
 *       Could *shorten* an active boost if it had more than 30m left,
 *       which feels like a downgrade.
 *   (c) MAX     — `max(currentUntil ?? 0, now + durationMs)`. At least
 *       30 minutes, but no compounding.
 *
 * Spins are 1/day (deterministically seeded), so the realistic upper
 * bound on compounding is ~tiny: even back-to-back daily wins of the
 * same boost only stack to ~1 hour. No need to cap.
 *
 * Isaac to confirm — see the AskUserQuestion below. Default in the
 * implementation is EXTEND.
 */
export function extendBoost(
  currentUntil: number | undefined,
  durationMs: number,
  now: number,
): number {
  const base = currentUntil !== undefined && currentUntil > now ? currentUntil : now;
  return base + durationMs;
}

/**
 * Compute remaining milliseconds for a given kind. Returns 0 if expired
 * or absent. Used by the HomeScreen boost pill for the mm:ss countdown.
 */
export function boostRemainingMs(
  state: ActiveBoostUntil,
  kind: BoostKind,
  now: number,
): number {
  const until = state[kind];
  if (until === undefined) return 0;
  return Math.max(0, until - now);
}

/** Format remaining ms as "mm:ss" for the boost pill. */
export function formatBoostRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
