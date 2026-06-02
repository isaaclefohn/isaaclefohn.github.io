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

import {
  getActiveEvent,
  getEventInstanceId,
  getEventDaysRemaining,
  isMilestoneReached,
  getNextMilestoneIndex,
  SEASONAL_EVENTS,
} from '../game/events/SeasonalEvent';

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

describe('getEventInstanceId', () => {
  it('namespaces the event id by calendar year (for per-year reset tracking)', () => {
    const fall = SEASONAL_EVENTS.find(e => e.id === 'fall')!;
    expect(getEventInstanceId(fall, new Date(2026, 8, 15))).toBe('fall_2026');
    expect(getEventInstanceId(fall, new Date(2027, 8, 15))).toBe('fall_2027');
  });
});

describe('getEventDaysRemaining', () => {
  it('counts inclusive days to the end of the event\'s last month', () => {
    const fall = SEASONAL_EVENTS.find(e => e.id === 'fall')!; // ends month 9 (Oct) -> Oct 31
    // From Oct 1 there are 30 days left until Oct 31 (ceil over the partial day).
    const d = getEventDaysRemaining(fall, new Date(2026, 9, 1, 12, 0, 0));
    expect(d).toBeGreaterThanOrEqual(30);
    expect(d).toBeLessThanOrEqual(31);
  });

  it('never returns negative once the event window has passed', () => {
    const newyear = SEASONAL_EVENTS.find(e => e.id === 'newyear')!; // Jan only
    // Query in December: the Jan-of-this-year window is long gone -> clamp at 0.
    expect(getEventDaysRemaining(newyear, new Date(2026, 11, 15))).toBe(0);
  });
});

describe('milestone helpers', () => {
  const fall = SEASONAL_EVENTS.find(e => e.id === 'fall')!;

  it('isMilestoneReached is an inclusive >= threshold check', () => {
    const m = fall.milestones[0]; // 50 points
    expect(isMilestoneReached(m, 49)).toBe(false);
    expect(isMilestoneReached(m, 50)).toBe(true); // exact boundary counts
    expect(isMilestoneReached(m, 51)).toBe(true);
  });

  it('getNextMilestoneIndex returns the first unreached index, or length when all done', () => {
    expect(getNextMilestoneIndex(fall, 0)).toBe(0);              // none reached
    expect(getNextMilestoneIndex(fall, fall.milestones[0].points)).toBe(1); // first exactly reached
    const beyondAll = fall.milestones[fall.milestones.length - 1].points + 1;
    expect(getNextMilestoneIndex(fall, beyondAll)).toBe(fall.milestones.length);
  });
});
