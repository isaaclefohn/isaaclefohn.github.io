/**
 * Characterization tests for src/game/rewards/DailyDeal.ts
 *
 * Pure (the only import, getLocalToday, is a pure date helper). Locks the
 * date-hash rotation through the 7-deal pool, the claimed-today guard, and
 * the local-midnight countdown.
 *
 * `getTodaysDeal(dateStr)` and `isDealClaimed(claimedDate, today)` take an
 * injectable date param, so they are fully deterministic. The no-arg
 * defaults read the local date (getLocalToday) — that path is a testability
 * gap noted in the final report, but the documented "local midnight" reset
 * is correct (it uses getDate()/setHours local methods).
 */

import {
  getTodaysDeal,
  isDealClaimed,
  getDealCountdown,
} from '../game/rewards/DailyDeal';

describe('getTodaysDeal', () => {
  it('returns a deal for an injected date string', () => {
    const deal = getTodaysDeal('2026-06-01');
    expect(deal).toBeDefined();
    expect(typeof deal.id).toBe('string');
    expect(deal.discountPercent).toBeGreaterThan(0);
  });

  it('is deterministic for the same date', () => {
    expect(getTodaysDeal('2026-06-01')).toBe(getTodaysDeal('2026-06-01'));
  });

  it('rotates by date hash through the pool (locked mapping)', () => {
    // Verified against the module's hashDate % poolLength rotation.
    expect(getTodaysDeal('2026-06-01').id).toBe('power_row');
    expect(getTodaysDeal('2026-06-02').id).toBe('power_color');
    expect(getTodaysDeal('2026-06-03').id).toBe('mega_bundle');
    expect(getTodaysDeal('2026-01-01').id).toBe('gem_mini');
  });

  it('changes the deal across consecutive days (not constant)', () => {
    const ids = new Set<string>();
    for (let d = 1; d <= 14; d++) {
      const day = String(d).padStart(2, '0');
      ids.add(getTodaysDeal(`2026-06-${day}`).id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it('every deal in the rotation is internally consistent (cost in exactly one currency)', () => {
    // Sample a year of dates so we exercise the whole pool.
    for (let d = 0; d < 366; d++) {
      const base = new Date(2026, 0, 1).getTime();
      const dt = new Date(base + d * 86400000);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate(),
      ).padStart(2, '0')}`;
      const deal = getTodaysDeal(key);
      // A deal is paid in coins OR gems, never both, never neither.
      const paysCoins = deal.costCoins > 0;
      const paysGems = deal.costGems > 0;
      expect(paysCoins !== paysGems).toBe(true);
    }
  });
});

describe('isDealClaimed', () => {
  it('is true when the claimed date matches today', () => {
    expect(isDealClaimed('2026-06-01', '2026-06-01')).toBe(true);
  });

  it('is false on a new day', () => {
    expect(isDealClaimed('2026-05-31', '2026-06-01')).toBe(false);
  });

  it('is false when never claimed (null)', () => {
    expect(isDealClaimed(null, '2026-06-01')).toBe(false);
  });
});

describe('getDealCountdown', () => {
  it('counts down to local midnight', () => {
    // 10:00:00 local -> 14h 0m until next local midnight.
    const at10am = new Date(2026, 5, 1, 10, 0, 0, 0);
    expect(getDealCountdown(at10am)).toBe('14h 0m');
  });

  it('reports just under 24h right after midnight', () => {
    const justAfterMidnight = new Date(2026, 5, 1, 0, 0, 30, 0); // 30s past midnight
    // 23h 59m remain (seconds truncated).
    expect(getDealCountdown(justAfterMidnight)).toBe('23h 59m');
  });

  it('reports a small remainder late at night', () => {
    const at2330 = new Date(2026, 5, 1, 23, 30, 0, 0);
    expect(getDealCountdown(at2330)).toBe('0h 30m');
  });
});
