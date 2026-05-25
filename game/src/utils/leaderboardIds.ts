/**
 * Canonical leaderboard board-id helpers.
 *
 * These MUST be the single source of truth for both reads (LeaderboardScreen)
 * and writes (GameScreen). The Redis sorted-set key is `lb:{type}:{id}`, so if
 * the read side and write side ever compute `id` differently, submitted scores
 * land in a key nobody queries. Keep all id formulas here.
 *
 * Ids are derived from the UTC date so every client agrees on "today"/"this
 * week" regardless of local timezone — the board is a shared global resource.
 */

/** ISO-ish year+week identifier, e.g. "2026-W21". */
export function getWeekId(date: Date = new Date()): string {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/** Calendar day identifier, e.g. "2026-05-24". */
export function getTodayId(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}
