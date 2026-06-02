/**
 * Characterization tests for src/game/monetization/LimitedOffers.ts
 *
 * Pure. Locks the 4-hour flash-offer bucket rotation (same offer for
 * everyone in a window), the expiry countdown, and the offer catalog
 * shape.
 */

import {
  FLASH_OFFERS,
  FLASH_BUCKET_MS,
  getCurrentFlashOffer,
  getFlashOfferCountdown,
  getCurrentFlashBucket,
} from '../game/monetization/LimitedOffers';

describe('FLASH_OFFERS catalog', () => {
  it('has 6 offers', () => {
    expect(FLASH_OFFERS).toHaveLength(6);
  });

  it('each offer has a discounted price below its original price', () => {
    FLASH_OFFERS.forEach((o) => {
      expect(o.priceGems).toBeLessThan(o.originalPriceGems);
      expect(o.discount).toBeGreaterThan(0);
      expect(o.durationMs).toBeGreaterThan(0);
      expect(o.reward).toBeDefined();
    });
  });

  it('has unique ids', () => {
    const ids = FLASH_OFFERS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('FLASH_BUCKET_MS', () => {
  it('is 4 hours', () => {
    expect(FLASH_BUCKET_MS).toBe(4 * 60 * 60 * 1000);
  });
});

describe('getCurrentFlashBucket', () => {
  it('is the floor of now / 4h', () => {
    expect(getCurrentFlashBucket(0)).toBe(0);
    expect(getCurrentFlashBucket(FLASH_BUCKET_MS - 1)).toBe(0);
    expect(getCurrentFlashBucket(FLASH_BUCKET_MS)).toBe(1);
    expect(getCurrentFlashBucket(FLASH_BUCKET_MS * 5 + 1)).toBe(5);
  });
});

describe('getCurrentFlashOffer', () => {
  it('returns an offer from the catalog', () => {
    expect(FLASH_OFFERS).toContainEqual(getCurrentFlashOffer(0));
  });

  it('is identical for any two times in the same bucket', () => {
    const a = getCurrentFlashOffer(0);
    const b = getCurrentFlashOffer(FLASH_BUCKET_MS - 1);
    expect(a).toBe(b);
  });

  it('produces the locked offer for bucket 0 and bucket 1', () => {
    expect(getCurrentFlashOffer(0).id).toBe('gem_rush');
    expect(getCurrentFlashOffer(FLASH_BUCKET_MS).id).toBe('lifesaver');
  });

  it('rotates across buckets and can reach every offer', () => {
    const seen = new Set<string>();
    for (let b = 0; b < 200; b++) {
      seen.add(getCurrentFlashOffer(b * FLASH_BUCKET_MS).id);
    }
    // All 6 offers should eventually appear in the rotation.
    expect(seen.size).toBe(FLASH_OFFERS.length);
  });
});

describe('getFlashOfferCountdown', () => {
  it('is the full bucket length at the start of a window', () => {
    expect(getFlashOfferCountdown(0)).toBe(FLASH_BUCKET_MS);
  });

  it('is 1ms at the very end of a window', () => {
    expect(getFlashOfferCountdown(FLASH_BUCKET_MS - 1)).toBe(1);
  });

  it('counts down within a window', () => {
    const twoHoursIn = 2 * 60 * 60 * 1000;
    expect(getFlashOfferCountdown(twoHoursIn)).toBe(FLASH_BUCKET_MS - twoHoursIn);
  });

  it('never returns negative', () => {
    expect(getFlashOfferCountdown(FLASH_BUCKET_MS * 3.99)).toBeGreaterThanOrEqual(0);
  });
});
