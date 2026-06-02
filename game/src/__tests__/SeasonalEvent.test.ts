/**
 * Regression coverage for the seasonal-event resolution bug:
 *
 * Autumn Harvest (fall, Sep–Oct) appeared before Spooky Nights
 * (halloween, Oct only) in SEASONAL_EVENTS, and the old getActiveEvent
 * returned the FIRST month-range match — so all October it returned
 * Autumn and Halloween was dead code. getActiveEvent now prefers the
 * narrowest-span match, so the single-month special event wins over a
 * broader season covering the same month.
 */

import { getActiveEvent, SEASONAL_EVENTS } from '../game/events/SeasonalEvent';

/** Build a Date in the given 0-indexed month (mid-month, midday local to
 *  dodge any timezone edge). */
const dateInMonth = (month: number) => new Date(2026, month, 15, 12, 0, 0);

describe('getActiveEvent month resolution', () => {
  it('returns Halloween in October (was shadowed by Autumn)', () => {
    const e = getActiveEvent(dateInMonth(9)); // October
    expect(e?.id).toBe('halloween');
  });

  it('returns Autumn Harvest in September', () => {
    const e = getActiveEvent(dateInMonth(8)); // September
    expect(e?.id).toBe('fall');
  });

  it('maps each defined month to exactly one expected event', () => {
    const expected: Record<number, string> = {
      0: 'newyear',   // Jan
      2: 'spring',    // Mar
      3: 'spring',    // Apr
      4: 'spring',    // May
      5: 'summer',    // Jun
      6: 'summer',    // Jul
      7: 'summer',    // Aug
      8: 'fall',      // Sep
      9: 'halloween', // Oct — the fix
      10: 'winter',   // Nov
      11: 'winter',   // Dec
    };
    for (const [month, id] of Object.entries(expected)) {
      expect(getActiveEvent(dateInMonth(Number(month)))?.id).toBe(id);
    }
  });

  it('returns null for a month with no event (February)', () => {
    expect(getActiveEvent(dateInMonth(1))).toBeNull();
  });

  it('every event in the catalog is reachable from at least one month', () => {
    // The core guarantee: no event is permanently shadowed. For each
    // event, at least one month in its range must resolve back to it.
    for (const event of SEASONAL_EVENTS) {
      const reachable = [];
      for (let m = event.startMonth; m <= event.endMonth; m++) {
        if (getActiveEvent(dateInMonth(m))?.id === event.id) reachable.push(m);
      }
      expect(reachable.length).toBeGreaterThan(0);
    }
  });
});
