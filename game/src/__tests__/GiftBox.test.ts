/**
 * Characterization tests for src/game/rewards/GiftBox.ts
 *
 * Pure logic over a seeded RNG. `shouldShowGift` reads getLocalToday()
 * (`new Date()`), so the clock is frozen for those tests. `generateGiftBox`
 * is seed-deterministic for its rewards/rarity/label, but its `id` embeds
 * `Date.now()` and a trailing RNG draw, so assertions target the
 * seed-stable fields (rewards/rarity/label), never the whole object.
 * Testability note (id is wall-clock dependent) recorded in the report.
 */

import {
  GIFT_RARITIES,
  GiftReward,
  shouldShowGift,
  generateGiftBox,
  formatGiftReward,
} from '../game/rewards/GiftBox';

describe('GIFT_RARITIES', () => {
  it('weights sum to 100', () => {
    const total =
      GIFT_RARITIES.common.weight + GIFT_RARITIES.rare.weight + GIFT_RARITIES.epic.weight;
    expect(total).toBe(100);
  });

  it('common is the most likely, epic the least', () => {
    expect(GIFT_RARITIES.common.weight).toBeGreaterThan(GIFT_RARITIES.rare.weight);
    expect(GIFT_RARITIES.rare.weight).toBeGreaterThan(GIFT_RARITIES.epic.weight);
  });
});

describe('shouldShowGift', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 2, 12, 0, 0)); // local June 2 2026
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides the gift for brand-new players below level 3 (boundary)', () => {
    expect(shouldShowGift(2, 5, null)).toBe(false);
  });

  it('shows for an eligible level-3 player who has played 2+ games today', () => {
    expect(shouldShowGift(3, 2, null)).toBe(true);
  });

  it('requires at least 2 games played today (1 game is not enough)', () => {
    expect(shouldShowGift(3, 1, null)).toBe(false);
  });

  it('hides when 0 games have been played today', () => {
    expect(shouldShowGift(3, 0, null)).toBe(false);
  });

  it('allows more than 2 games', () => {
    expect(shouldShowGift(10, 5, null)).toBe(true);
  });

  it('enforces one gift per day (already shown today => hidden)', () => {
    expect(shouldShowGift(3, 2, '2026-06-02')).toBe(false);
  });

  it('allows a gift again on a new day (last gift was yesterday)', () => {
    expect(shouldShowGift(3, 2, '2026-06-01')).toBe(true);
  });
});

describe('generateGiftBox', () => {
  it('is deterministic (rewards/rarity/label) for a fixed (level, seed)', () => {
    const a = generateGiftBox(50, 12345);
    const b = generateGiftBox(50, 12345);
    expect(a.rewards).toEqual(b.rewards);
    expect(a.rarity).toBe(b.rarity);
    expect(a.label).toBe(b.label);
  });

  it('always includes at least one reward and a coin reward', () => {
    for (let seed = 0; seed < 200; seed++) {
      const box = generateGiftBox(10, seed);
      expect(box.rewards.length).toBeGreaterThan(0);
      expect(box.rewards.some((r) => r.type === 'coins')).toBe(true);
    }
  });

  it('label matches the rolled rarity', () => {
    for (let seed = 0; seed < 200; seed++) {
      const box = generateGiftBox(10, seed);
      expect(box.label).toBe(GIFT_RARITIES[box.rarity].label);
    }
  });

  it('produces the locked common reward for level 10, seed 1', () => {
    const box = generateGiftBox(10, 1);
    expect(box.rarity).toBe('common');
    expect(box.rewards).toEqual([{ type: 'coins', amount: 16 }]);
  });

  it('produces the locked rare reward for level 10, seed 0', () => {
    const box = generateGiftBox(10, 0);
    expect(box.rarity).toBe('rare');
    expect(box.rewards).toEqual([
      { type: 'coins', amount: 32 },
      { type: 'powerup', amount: 1, itemId: 'bomb' },
    ]);
  });

  it('produces the locked epic reward for level 10, seed 7 (coins + gems + power-up)', () => {
    const box = generateGiftBox(10, 7);
    expect(box.rarity).toBe('epic');
    expect(box.rewards).toEqual([
      { type: 'coins', amount: 83 },
      { type: 'gems', amount: 8 },
      { type: 'powerup', amount: 2, itemId: 'rowClear' },
    ]);
  });

  it('reaches all three rarities across a seed sweep, roughly weighted', () => {
    const dist: Record<string, number> = {};
    const N = 10000;
    for (let seed = 0; seed < N; seed++) {
      const box = generateGiftBox(10, seed);
      dist[box.rarity] = (dist[box.rarity] ?? 0) + 1;
    }
    expect(dist.common).toBeGreaterThan(dist.rare);
    expect(dist.rare).toBeGreaterThan(dist.epic);
    // epic is ~5% — should be present but uncommon.
    expect(dist.epic).toBeGreaterThan(0);
  });

  it('scales coin rewards up with player level (progress multiplier)', () => {
    // Same seed, different level: level 200 gives the +50% cap vs level 0.
    const low = generateGiftBox(0, 3).rewards.find((r) => r.type === 'coins')!.amount;
    const high = generateGiftBox(200, 3).rewards.find((r) => r.type === 'coins')!.amount;
    expect(high).toBeGreaterThan(low);
    expect(high).toBe(Math.round(low * 1.5)); // multiplier caps at 1.5 (level >= 100)
  });

  it('coin amounts are always positive integers', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const r of generateGiftBox(50, seed).rewards) {
        if (r.type === 'coins') {
          expect(Number.isInteger(r.amount)).toBe(true);
          expect(r.amount).toBeGreaterThan(0);
        }
      }
    }
  });

  it('only ever rolls the three documented power-up item ids', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 500; seed++) {
      for (const r of generateGiftBox(50, seed).rewards) {
        if (r.type === 'powerup' && r.itemId) seen.add(r.itemId);
      }
    }
    seen.forEach((id) => expect(['bomb', 'rowClear', 'colorClear']).toContain(id));
    expect(seen.size).toBeGreaterThan(0);
  });
});

describe('formatGiftReward', () => {
  it('formats a coin reward', () => {
    expect(formatGiftReward({ type: 'coins', amount: 40 })).toBe('40 Coins');
  });

  it('formats a gem reward', () => {
    expect(formatGiftReward({ type: 'gems', amount: 3 })).toBe('3 Gems');
  });

  it('formats a power-up reward with its display name and count', () => {
    expect(formatGiftReward({ type: 'powerup', amount: 2, itemId: 'rowClear' })).toBe(
      '2x Row Clear',
    );
    expect(formatGiftReward({ type: 'powerup', amount: 1, itemId: 'bomb' })).toBe('1x Bomb');
    expect(formatGiftReward({ type: 'powerup', amount: 1, itemId: 'colorClear' })).toBe(
      '1x Color Clear',
    );
  });

  it('falls back to a generic label for an unknown / missing power-up id', () => {
    expect(formatGiftReward({ type: 'powerup', amount: 1, itemId: 'mystery' })).toBe(
      '1x Power-Up',
    );
    const noId: GiftReward = { type: 'powerup', amount: 3 };
    expect(formatGiftReward(noId)).toBe('3x Power-Up');
  });
});
