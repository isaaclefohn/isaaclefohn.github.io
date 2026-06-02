/**
 * Coverage for two previously-0%-covered logic modules surfaced by the
 * coverage pass:
 *
 *  - FeatureGating: progressive unlock gates. Locks the unlock levels and
 *    the "just crossed this level" window so a future edit can't silently
 *    shift when a feature appears.
 *
 *  - LiveEvents: recurring weekend / midweek multiplier events. Includes a
 *    YEAR-LONG INVARIANT guarding the weekend-straddle fix — the weekend
 *    event type used to flip mid-weekend when Fri/Sat/Sun crossed a
 *    date-divisible-by-7 boundary (getWeekOfMonth keyed off the current
 *    day). It now anchors to the weekend's Friday.
 */

import {
  isFeatureUnlocked,
  getUnlockLevel,
  getNewlyUnlockedFeatures,
  getNextUnlock,
  FEATURE_GATES,
} from '../game/progression/FeatureGating';
import {
  getActiveEvents,
  getScoreMultiplier,
  getXPMultiplier,
  getCoinMultiplier,
  hasActiveEvent,
} from '../game/events/LiveEvents';

describe('FeatureGating', () => {
  it('locks features below their unlock level and unlocks at/above', () => {
    expect(isFeatureUnlocked('power_ups', 4)).toBe(false);
    expect(isFeatureUnlocked('power_ups', 5)).toBe(true);
    expect(isFeatureUnlocked('power_ups', 6)).toBe(true);
  });

  it('defaults unknown features to unlocked', () => {
    expect(isFeatureUnlocked('does_not_exist', 0)).toBe(true);
  });

  it('getUnlockLevel returns the gate level, or 0 for unknown', () => {
    expect(getUnlockLevel('battle_pass')).toBe(12);
    expect(getUnlockLevel('nope')).toBe(0);
  });

  it('getNewlyUnlockedFeatures returns only gates crossed in (prev, new]', () => {
    // Crossing 4 -> 5 unlocks exactly power_ups (level 5), not lucky_spin (4, already had).
    const crossed = getNewlyUnlockedFeatures(4, 5).map(g => g.id);
    expect(crossed).toEqual(['power_ups']);
  });

  it('getNewlyUnlockedFeatures is exclusive of prev and inclusive of new', () => {
    // 0 -> 3 should include zen_mode (3) but nothing at level > 3.
    const crossed = getNewlyUnlockedFeatures(0, 3).map(g => g.id);
    expect(crossed).toContain('zen_mode');
    expect(crossed.every(id => getUnlockLevel(id) <= 3)).toBe(true);
  });

  it('getNextUnlock returns the nearest higher gate, null past the last', () => {
    expect(getNextUnlock(0)?.id).toBe('zen_mode'); // lowest gate is level 3
    const maxLevel = Math.max(...FEATURE_GATES.map(g => g.unlockLevel));
    expect(getNextUnlock(maxLevel)).toBeNull();
  });
});

// ── LiveEvents ──────────────────────────────────────────────────────────
// Helper: a Date at a fixed local time on a given Y/M/D.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h, 0, 0);

describe('LiveEvents schedule', () => {
  it('weekend event active Friday 6pm+, not before', () => {
    // Find a Friday in 2026.
    let friday = at(2026, 0, 1);
    for (let d = 1; d <= 14; d++) { const t = at(2026, 0, d); if (t.getDay() === 5) { friday = t; break; } }
    expect(getActiveEvents(new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 17)).length).toBe(0);
    expect(getActiveEvents(new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 18)).length).toBe(1);
  });

  it('Wednesday yields the XP boost (1.5x) and no weekend event', () => {
    let wed = at(2026, 0, 1);
    for (let d = 1; d <= 14; d++) { const t = at(2026, 0, d); if (t.getDay() === 3) { wed = t; break; } }
    expect(getXPMultiplier(wed)).toBeCloseTo(1.5);
    expect(getScoreMultiplier(wed)).toBe(1);
    expect(getCoinMultiplier(wed)).toBe(1);
  });

  it('a plain weekday (Tuesday) has no active event', () => {
    let tue = at(2026, 0, 1);
    for (let d = 1; d <= 14; d++) { const t = at(2026, 0, d); if (t.getDay() === 2) { tue = t; break; } }
    expect(hasActiveEvent(tue)).toBe(false);
  });

  it('a weekend yields exactly one of score-2x OR coin-2x (never both)', () => {
    let sat = at(2026, 0, 1);
    for (let d = 1; d <= 14; d++) { const t = at(2026, 0, d); if (t.getDay() === 6) { sat = t; break; } }
    const score = getScoreMultiplier(sat);
    const coin = getCoinMultiplier(sat);
    // Exactly one of them is 2x, the other 1x.
    expect((score === 2 && coin === 1) || (score === 1 && coin === 2)).toBe(true);
  });

  it('INVARIANT: the weekend event type is identical across every Fri/Sat/Sun in 2026', () => {
    // Directly guards the straddle bug: walk all of 2026, and for each
    // Saturday compare the active weekend event id against the preceding
    // Friday (7pm) and the following Sunday. They must all match — a flip
    // means the week-anchor regressed.
    const weekendId = (dt: Date) => {
      const ev = getActiveEvents(dt);
      const w = ev.find(e => e.type === 'score_multiplier' || e.type === 'coin_rush');
      return w?.id ?? null;
    };
    let checkedWeekends = 0;
    const cursor = new Date(2026, 0, 1, 12);
    while (cursor.getFullYear() === 2026) {
      if (cursor.getDay() === 6) { // Saturday
        const sat = new Date(cursor);
        const fri = new Date(sat); fri.setDate(sat.getDate() - 1); fri.setHours(19);
        const sun = new Date(sat); sun.setDate(sat.getDate() + 1); sun.setHours(12);
        const ids = [weekendId(fri), weekendId(sat), weekendId(sun)];
        // All three must be a non-null, identical event id.
        expect(ids[0]).not.toBeNull();
        expect(ids[1]).toBe(ids[0]);
        expect(ids[2]).toBe(ids[0]);
        checkedWeekends++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    expect(checkedWeekends).toBeGreaterThanOrEqual(50); // ~52 weekends in a year
  });
});
