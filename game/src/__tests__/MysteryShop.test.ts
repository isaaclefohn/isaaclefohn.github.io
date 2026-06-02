/**
 * Characterization tests for src/game/rewards/MysteryShop.ts
 *
 * Pure. Locks the 4-hour time-bucket seeding, the deterministic
 * shuffle (same offers for everyone in a bucket), the 4-item rotation
 * size, and the refresh countdown.
 */

import {
  MYSTERY_SHOP_REFRESH_MS,
  MysteryItem,
  getCurrentBucketSeed,
  getMysteryShopItems,
  getShopRefreshCountdown,
  formatCountdown,
} from '../game/rewards/MysteryShop';

describe('MYSTERY_SHOP_REFRESH_MS', () => {
  it('is 4 hours', () => {
    expect(MYSTERY_SHOP_REFRESH_MS).toBe(4 * 60 * 60 * 1000);
  });
});

describe('getCurrentBucketSeed', () => {
  it('is the floor of now / 4h', () => {
    expect(getCurrentBucketSeed(0)).toBe(0);
    expect(getCurrentBucketSeed(MYSTERY_SHOP_REFRESH_MS - 1)).toBe(0);
    expect(getCurrentBucketSeed(MYSTERY_SHOP_REFRESH_MS)).toBe(1);
    expect(getCurrentBucketSeed(MYSTERY_SHOP_REFRESH_MS * 3 + 500)).toBe(3);
  });
});

describe('getMysteryShopItems', () => {
  it('returns exactly 4 items', () => {
    expect(getMysteryShopItems(0)).toHaveLength(4);
  });

  it('returns valid items drawn from the pool with required fields', () => {
    const items = getMysteryShopItems(0);
    items.forEach((it: MysteryItem) => {
      expect(typeof it.id).toBe('string');
      expect(['coins', 'gems']).toContain(it.currency);
      expect(typeof it.cost).toBe('number');
      expect(it.reward).toBeDefined();
    });
  });

  it('returns no duplicate items within a single rotation', () => {
    const ids = getMysteryShopItems(MYSTERY_SHOP_REFRESH_MS * 10).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is identical for any two times in the same 4-hour bucket', () => {
    const a = getMysteryShopItems(0).map((i) => i.id);
    const b = getMysteryShopItems(MYSTERY_SHOP_REFRESH_MS - 1).map((i) => i.id);
    expect(a).toEqual(b);
  });

  it('produces the locked rotation for bucket 0', () => {
    expect(getMysteryShopItems(0).map((i) => i.id)).toEqual([
      'coin_large',
      'mystery_box_large',
      'power_trio',
      'bomb_stash',
    ]);
  });

  it('produces the locked rotation for bucket 1', () => {
    expect(getMysteryShopItems(MYSTERY_SHOP_REFRESH_MS).map((i) => i.id)).toEqual([
      'mystery_box_large',
      'gem_mini',
      'coin_large',
      'power_trio',
    ]);
  });

  it('changes the rotation across buckets (not constant)', () => {
    const seenFirsts = new Set<string>();
    for (let b = 0; b < 12; b++) {
      seenFirsts.add(getMysteryShopItems(b * MYSTERY_SHOP_REFRESH_MS)[0].id);
    }
    expect(seenFirsts.size).toBeGreaterThan(1);
  });
});

describe('getShopRefreshCountdown', () => {
  it('is the full interval at the start of a bucket', () => {
    expect(getShopRefreshCountdown(0)).toBe(MYSTERY_SHOP_REFRESH_MS);
  });

  it('is 1ms at the very end of a bucket', () => {
    expect(getShopRefreshCountdown(MYSTERY_SHOP_REFRESH_MS - 1)).toBe(1);
  });

  it('counts down within a bucket', () => {
    const oneHourIn = 60 * 60 * 1000;
    expect(getShopRefreshCountdown(oneHourIn)).toBe(MYSTERY_SHOP_REFRESH_MS - oneHourIn);
  });

  it('never returns negative', () => {
    expect(getShopRefreshCountdown(MYSTERY_SHOP_REFRESH_MS * 2.5)).toBeGreaterThanOrEqual(0);
  });
});

describe('formatCountdown', () => {
  it('formats hours and minutes', () => {
    const ms = (2 * 60 + 35) * 60 * 1000; // 2h35m
    expect(formatCountdown(ms)).toBe('2h 35m');
  });

  it('formats sub-hour durations', () => {
    expect(formatCountdown(45 * 60 * 1000)).toBe('0h 45m');
  });

  it('truncates partial minutes', () => {
    expect(formatCountdown(90 * 1000)).toBe('0h 1m'); // 1m30s
  });

  it('handles zero', () => {
    expect(formatCountdown(0)).toBe('0h 0m');
  });
});
