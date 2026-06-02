/**
 * Characterization tests for src/game/systems/DailyQuests.ts
 *
 * Pure logic, but getDailyQuests() derives its seed from getLocalToday()
 * (which reads `new Date()`) with no injection point, so we freeze the
 * system clock to make the day-seeded selection deterministic. The
 * completion/progress helpers take explicit params and are fully pure.
 * Testability gap (no injectable date/seed) noted in the report.
 */

import {
  getDailyQuests,
  Quest,
  QuestTrackingKey,
  isQuestComplete,
  getQuestProgress,
} from '../game/systems/DailyQuests';

describe('getDailyQuests', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns exactly 3 quests', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    expect(getDailyQuests()).toHaveLength(3);
  });

  it('selects 3 distinct tracking keys (no duplicate objective types)', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    const keys = getDailyQuests().map((q) => q.trackingKey);
    expect(new Set(keys).size).toBe(3);
  });

  it('is deterministic for a fixed local day', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    const a = getDailyQuests();
    const b = getDailyQuests();
    expect(a).toEqual(b);
  });

  it('produces the locked selection for a fixed day (regression snapshot)', () => {
    // Local June 2, 2026. Verified deterministically against the day-seed.
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    const quests = getDailyQuests();
    expect(quests.map((q) => q.trackingKey)).toEqual([
      'stars_earned',
      'lines_cleared',
      'combos_achieved',
    ]);
    expect(quests.map((q) => q.title)).toEqual(['Star Hunter', 'Line Legend', 'Combo King']);
  });

  it('ids embed the local date and the tracking key', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    const quests = getDailyQuests();
    for (const q of quests) {
      expect(q.id).toBe(`2026-06-02-${q.trackingKey}`);
    }
  });

  it('interpolates the {target} placeholder into the description', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    for (const q of getDailyQuests()) {
      expect(q.description).not.toContain('{target}');
      expect(q.description).toContain(String(q.target));
    }
  });

  it('produces a different selection on a different day (not a constant)', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    const june2 = getDailyQuests()
      .map((q) => q.trackingKey)
      .join(',');
    jest.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    const jan1 = getDailyQuests()
      .map((q) => q.trackingKey)
      .join(',');
    expect(jan1).not.toBe(june2);
  });

  it('every selected quest carries a positive target and a reward payload', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0));
    for (const q of getDailyQuests()) {
      expect(q.target).toBeGreaterThan(0);
      const totalReward = (q.reward.coins ?? 0) + (q.reward.gems ?? 0) + (q.reward.xp ?? 0);
      expect(totalReward).toBeGreaterThan(0);
    }
  });

  it('stays stable across the same day at different clock times (seed is day-based)', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 0, 1, 0));
    const earlyKeys = getDailyQuests().map((q) => q.trackingKey);
    jest.setSystemTime(new Date(2026, 5, 2, 23, 59, 0));
    const lateKeys = getDailyQuests().map((q) => q.trackingKey);
    expect(lateKeys).toEqual(earlyKeys);
  });
});

describe('isQuestComplete', () => {
  const quest = (target: number): Quest => ({
    id: 'q',
    title: 't',
    description: 'd',
    icon: 'i',
    target,
    trackingKey: 'score_earned' as QuestTrackingKey,
    reward: { coins: 1 },
  });

  it('is incomplete below the target', () => {
    expect(isQuestComplete(quest(100), 99)).toBe(false);
  });

  it('is complete exactly at the target (boundary, >=)', () => {
    expect(isQuestComplete(quest(100), 100)).toBe(true);
  });

  it('is complete above the target', () => {
    expect(isQuestComplete(quest(100), 250)).toBe(true);
  });

  it('treats 0 progress against a positive target as incomplete', () => {
    expect(isQuestComplete(quest(5), 0)).toBe(false);
  });

  it('a 0-target quest is complete at 0 progress', () => {
    expect(isQuestComplete(quest(0), 0)).toBe(true);
  });
});

describe('getQuestProgress', () => {
  const quest = (target: number): Quest => ({
    id: 'q',
    title: 't',
    description: 'd',
    icon: 'i',
    target,
    trackingKey: 'score_earned' as QuestTrackingKey,
    reward: { coins: 1 },
  });

  it('returns a 0..1 fraction below the target', () => {
    expect(getQuestProgress(quest(100), 25)).toBeCloseTo(0.25, 10);
  });

  it('returns 0 at no progress', () => {
    expect(getQuestProgress(quest(100), 0)).toBe(0);
  });

  it('clamps to 1 at the target (boundary)', () => {
    expect(getQuestProgress(quest(100), 100)).toBe(1);
  });

  it('clamps to 1 above the target (never overshoots)', () => {
    expect(getQuestProgress(quest(100), 500)).toBe(1);
  });
});
