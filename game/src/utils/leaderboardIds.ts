/**
 * Canonical leaderboard board-id helpers.
 *
 * These MUST be the single source of truth for both reads (LeaderboardScreen)
 * and writes (GameScreen). The Redis sorted-set key is `lb:{type}:{id}`, so if
 * the read side and write side ever compute `id` differently, submitted scores
 * land in a key nobody queries. Keep all id formulas here.
 *
 * The WEEKLY id (getWeekId, below) is derived from the UTC date so every client
 * agrees on "this week" regardless of local timezone — the weekly board is a
 * shared global resource.
 *
 * The DAILY board id is intentionally NOT here and NOT UTC: it comes from
 * getDailyPuzzleId (game/challenges/DailyPuzzle.ts), which is LOCAL-timezone by
 * design so the daily puzzle refreshes at each player's local midnight. The
 * daily board key and the daily puzzle seed both derive from that same local
 * id, so read, write, and seed stay mutually consistent. Do not "fix" the daily
 * id to UTC — it would desync the board from the puzzle players are solving.
 */

/** ISO-ish year+week identifier, e.g. "2026-W21". */
export function getWeekId(date: Date = new Date()): string {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

// NOTE: the daily leaderboard board is keyed by the DAILY PUZZLE id
// (getDailyPuzzleId in game/challenges/DailyPuzzle), NOT a generic "today"
// string — so the board always matches the exact fixed-seed puzzle players
// ran. Don't reintroduce a separate today-id here; it would drift from the
// puzzle's local-midnight day boundary and make the board unfair.
