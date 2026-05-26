import {
  buildLevelRunShareCard,
  buildEndlessShareCard,
} from '../game/social/shareCards';

describe('shareCards — level run', () => {
  const base = {
    levelNumber: 24,
    worldName: 'Spectrum',
    stars: 3 as const,
    score: 8420,
    scoreFraction: 1,
    linesCleared: 12,
    bestCombo: 6,
    chromaticClears: 4,
  };

  it('emits the canonical header + brand footer', () => {
    const card = buildLevelRunShareCard(base);
    expect(card.startsWith('CHROMA — Level 24')).toBe(true);
    expect(card.endsWith('chroma.game')).toBe(true);
  });

  it('renders the right number of stars', () => {
    expect(buildLevelRunShareCard({ ...base, stars: 0 })).toContain('☆');
    expect(buildLevelRunShareCard({ ...base, stars: 1 })).toContain('⭐  ');
    expect(buildLevelRunShareCard({ ...base, stars: 2 })).toContain('⭐⭐');
    expect(buildLevelRunShareCard({ ...base, stars: 3 })).toContain('⭐⭐⭐');
  });

  it('progress bar is exactly 10 squares regardless of fraction', () => {
    const onlyBar = (out: string) => out.split('\n')[2];
    // Each emoji is two UTF-16 code units, so use Array.from to count glyphs.
    expect(Array.from(onlyBar(buildLevelRunShareCard({ ...base, scoreFraction: 0 }))).length).toBe(10);
    expect(Array.from(onlyBar(buildLevelRunShareCard({ ...base, scoreFraction: 0.5 }))).length).toBe(10);
    expect(Array.from(onlyBar(buildLevelRunShareCard({ ...base, scoreFraction: 1 }))).length).toBe(10);
    expect(Array.from(onlyBar(buildLevelRunShareCard({ ...base, scoreFraction: 99 }))).length).toBe(10);
  });

  it('includes the chromatic count when present', () => {
    const withChroma = buildLevelRunShareCard({ ...base, chromaticClears: 4 });
    expect(withChroma).toContain('🌈 4 chromatic');
    const withoutChroma = buildLevelRunShareCard({ ...base, chromaticClears: 0 });
    expect(withoutChroma).not.toContain('chromatic');
  });

  it('omits the world line when world name is undefined', () => {
    const noWorld = buildLevelRunShareCard({ ...base, worldName: undefined });
    expect(noWorld).not.toContain('World:');
  });

  it('omits the combo segment when combo is 1 or lower (no combo earned)', () => {
    const noCombo = buildLevelRunShareCard({ ...base, bestCombo: 1 });
    expect(noCombo).not.toContain('combo');
    const withCombo = buildLevelRunShareCard({ ...base, bestCombo: 5 });
    expect(withCombo).toContain('x5 combo');
  });

  it('formats large scores with thousands separators', () => {
    const card = buildLevelRunShareCard({ ...base, score: 1234567 });
    expect(card).toContain('1,234,567');
  });
});

describe('shareCards — endless run', () => {
  const base = {
    score: 3200,
    personalBest: 8100,
    linesCleared: 42,
    piecesPlaced: 120,
    bestCombo: 4,
    chromaticClears: 2,
  };

  it('reads as a comparison when score is below personal best', () => {
    const card = buildEndlessShareCard(base);
    expect(card).toContain('3,200 / 8,100 pts');
    expect(card).not.toContain('NEW BEST');
  });

  it('flags NEW BEST when the score matches or beats personal best', () => {
    const card = buildEndlessShareCard({ ...base, score: 8200 });
    expect(card).toContain('🏆 NEW BEST');
    // Score line is just the score, not a ratio, on a new best.
    expect(card).toContain('8,200 pts');
    expect(card).not.toContain('/ 8,100');
  });

  it('treats the very first run (personalBest = 0) as a new best', () => {
    const card = buildEndlessShareCard({ ...base, personalBest: 0 });
    expect(card).toContain('🏆 NEW BEST');
  });

  it('does NOT flag NEW BEST on a zero-score run with no prior best', () => {
    // Edge case: defensive — a 0/0 case should not celebrate as a record.
    const card = buildEndlessShareCard({ ...base, score: 0, personalBest: 0 });
    expect(card).not.toContain('NEW BEST');
  });

  it('progress bar is exactly 10 squares (caps overflow at 1.0)', () => {
    const onlyBar = (out: string) => out.split('\n')[2];
    expect(Array.from(onlyBar(buildEndlessShareCard(base))).length).toBe(10);
    expect(Array.from(onlyBar(buildEndlessShareCard({ ...base, score: 20000 }))).length).toBe(10);
  });

  it('always emits the brand footer', () => {
    expect(buildEndlessShareCard(base).endsWith('chroma.game')).toBe(true);
  });
});
