// Import from the pure-gate module to avoid pulling in expo-store-review
// (Metro-only ES module that Jest's node runtime can't load). The
// public surface in appRating.ts re-exports these same symbols for
// non-test consumers.
import {
  canFireSlot,
  MIN_DAYS_BETWEEN_PROMPTS,
  type RatingSlot,
  type RatingState,
} from '../services/appRating.gates';

const TODAY = '2026-07-15';

function daysBefore(today: string, n: number): string {
  const d = new Date(today + 'T00:00:00');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const empty: RatingState = {
  slotsFired: [],
  lastPromptDate: null,
  sessionCount: 0,
};

describe('canFireSlot — rating-prompt gate', () => {
  it('allows the first prompt of each slot on a fresh state', () => {
    expect(canFireSlot('chapter_one_boss', empty, TODAY)).toBe(true);
    expect(canFireSlot('streak_day_7', empty, TODAY)).toBe(true);
    expect(canFireSlot('perfect_cascade', empty, TODAY)).toBe(true);
  });

  it('rejects a slot that has already been fired (idempotency)', () => {
    // Replaying level 30 should NOT re-fire `chapter_one_boss`, even
    // if the trigger condition reoccurs. This is the slot pattern's
    // whole reason for existing — count-based tracking would let this
    // through.
    const state: RatingState = {
      slotsFired: ['chapter_one_boss'],
      lastPromptDate: daysBefore(TODAY, 365),
      sessionCount: 50,
    };
    expect(canFireSlot('chapter_one_boss', state, TODAY)).toBe(false);
    // Other slots are unaffected.
    expect(canFireSlot('streak_day_7', state, TODAY)).toBe(true);
  });

  it('rejects any slot once 3 have been fired', () => {
    const state: RatingState = {
      slotsFired: ['chapter_one_boss', 'streak_day_7', 'perfect_cascade'],
      lastPromptDate: daysBefore(TODAY, 365),
      sessionCount: 200,
    };
    // Even though all 3 listed AND the cooldown is long elapsed,
    // we cannot fire again — Apple caps SKStoreReviewController at
    // 3 per 365 days. (And a 4th slot doesn't exist.)
    for (const slot of ['chapter_one_boss', 'streak_day_7', 'perfect_cascade'] as RatingSlot[]) {
      expect(canFireSlot(slot, state, TODAY)).toBe(false);
    }
  });

  it('respects the 30-day cooldown between prompts', () => {
    const state: RatingState = {
      slotsFired: ['chapter_one_boss'],
      lastPromptDate: daysBefore(TODAY, MIN_DAYS_BETWEEN_PROMPTS - 1),
      sessionCount: 5,
    };
    expect(canFireSlot('streak_day_7', state, TODAY)).toBe(false);
  });

  it('allows a new slot the day the cooldown elapses', () => {
    const state: RatingState = {
      slotsFired: ['chapter_one_boss'],
      lastPromptDate: daysBefore(TODAY, MIN_DAYS_BETWEEN_PROMPTS),
      sessionCount: 5,
    };
    expect(canFireSlot('streak_day_7', state, TODAY)).toBe(true);
  });

  it('does not consider sessionCount in the gate (caller does that)', () => {
    // The chapter-1 gate's ≥2 sessions requirement lives in
    // maybePromptForChapterOneBoss, NOT in canFireSlot. canFireSlot
    // only cares about slot/cooldown/cap. Document via test.
    const state: RatingState = { ...empty, sessionCount: 0 };
    expect(canFireSlot('chapter_one_boss', state, TODAY)).toBe(true);
  });

  it('handles missing lastPromptDate (first-ever prompt)', () => {
    expect(canFireSlot('chapter_one_boss', { ...empty, lastPromptDate: null }, TODAY)).toBe(true);
  });
});
