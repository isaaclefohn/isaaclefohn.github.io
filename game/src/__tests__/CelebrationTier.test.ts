import { rollTier, DEFAULT_TIER_CONFIG } from '../game/engine/celebrationTier';

describe('celebration tier — variable-jackpot dopamine engine', () => {
  // Inject a deterministic RNG so the rolls are reproducible. The default
  // weights are [jackpot 3%, big 7%, normal 30%, mini 60%], so each band:
  //   r < 0.03           → jackpot
  //   0.03 <= r < 0.10   → big
  //   0.10 <= r < 0.40   → normal
  //   r >= 0.40          → mini

  it('rolls jackpot when r lands in the rarest band', () => {
    const result = rollTier(5, () => 0.01);
    expect(result.tier).toBe('jackpot');
    // Premium tier (big or jackpot) resets the pity counter.
    expect(result.nextClearsSincePremium).toBe(0);
    expect(result.forcedByPity).toBe(false);
  });

  it('rolls big when r lands in the big band', () => {
    const result = rollTier(5, () => 0.05);
    expect(result.tier).toBe('big');
    expect(result.nextClearsSincePremium).toBe(0);
    expect(result.forcedByPity).toBe(false);
  });

  it('rolls normal when r lands mid-range', () => {
    const result = rollTier(5, () => 0.25);
    expect(result.tier).toBe('normal');
    // Non-premium tiers INCREMENT the pity counter toward the threshold.
    expect(result.nextClearsSincePremium).toBe(6);
  });

  it('rolls mini when r lands in the most common band', () => {
    const result = rollTier(5, () => 0.9);
    expect(result.tier).toBe('mini');
    expect(result.nextClearsSincePremium).toBe(6);
  });

  it('FORCES big via the pity timer at the threshold, regardless of RNG', () => {
    // RNG would otherwise produce mini (the most common tier). Pity overrides.
    const result = rollTier(DEFAULT_TIER_CONFIG.pityThreshold, () => 0.99);
    expect(result.tier).toBe('big');
    expect(result.forcedByPity).toBe(true);
    expect(result.nextClearsSincePremium).toBe(0);
  });

  it('also forces big when clearsSincePremium exceeds the threshold', () => {
    const result = rollTier(DEFAULT_TIER_CONFIG.pityThreshold + 5, () => 0.9);
    expect(result.tier).toBe('big');
    expect(result.forcedByPity).toBe(true);
  });

  it('does not double-count: a forced-pity big still resets the counter to 0', () => {
    const result = rollTier(50, () => 0.9);
    expect(result.nextClearsSincePremium).toBe(0);
  });

  it('long-run distribution approximates the configured weights', () => {
    // 5000 rolls with a "deterministic" RNG (linear sweep) should land
    // close to the configured probabilities. This guards against off-by-one
    // band-boundary bugs.
    const N = 5000;
    const counts = { mini: 0, normal: 0, big: 0, jackpot: 0 };
    let counter = 0;
    for (let i = 0; i < N; i++) {
      const r = i / N; // 0.0000 .. 0.9998
      const result = rollTier(counter, () => r);
      counts[result.tier]++;
      counter = result.nextClearsSincePremium;
    }
    // Mini ~60%, Normal ~30%, Big >= 7% (pity adds a small surplus), Jackpot ~3%.
    expect(counts.mini / N).toBeCloseTo(0.6, 1);
    expect(counts.normal / N).toBeCloseTo(0.3, 1);
    expect(counts.jackpot / N).toBeCloseTo(0.03, 1);
    // Big is at least the base rate but can be higher when pity fires.
    expect(counts.big / N).toBeGreaterThanOrEqual(0.07);
  });
});
