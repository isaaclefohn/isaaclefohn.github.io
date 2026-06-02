/**
 * Date helpers used by daily/streak/spin systems.
 *
 * Why this exists: `new Date().toISOString().split('T')[0]` returns the
 * UTC date, but the daily-puzzle, login calendar, daily spin wheel, and
 * comeback bonus all want the player's LOCAL date. Mixing the two leads
 * to subtle, hard-to-repro bugs — a PDT player sees the daily reward
 * modal re-eligible at 5pm local, the spin wheel resets mid-afternoon,
 * `dailyPuzzleLastPlayedId` (local) doesn't match `lastSpinDate` (UTC),
 * and a 3pm-PDT puzzle play stamps `lastPlayDate` as tomorrow's UTC date.
 *
 * Always use `getLocalToday()` for any user-facing "today" comparison.
 * Use the raw ISO format only for cross-device leaderboard windows or
 * server-side accounting where UTC is the right answer.
 */
export function getLocalToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
