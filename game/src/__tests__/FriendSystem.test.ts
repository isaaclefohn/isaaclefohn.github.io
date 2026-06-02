/**
 * Characterization tests for src/game/social/FriendSystem.ts
 *
 * Pure, no React, no storage, no imports. Locks the seeded friend-code
 * generator (determinism + charset), the share-message formatter, the
 * dash-formatting helper, and the score-comparison result.
 *
 * SUSPECTED BUG (doc/code contradiction): the generateFriendCode doc comment
 * says "Format: 4 alphanumeric characters (e.g., \"A7K2\")" but the loop runs
 * `for (i=0; i<6; i++)` and emits a 6-character code. The function is
 * internally consistent at 6 chars (formatFriendCode splits 3-3), so the doc
 * comment is the stale part. Tests below lock the actual 6-char behavior and
 * the contradiction is flagged in the final report.
 */

import {
  generateFriendCode,
  createChallengeMessage,
  formatFriendCode,
  getChallengeResult,
} from '../game/social/FriendSystem';

const CODE_CHARSET = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;

describe('generateFriendCode', () => {
  it('produces a 6-character code (NOTE: doc comment claims 4 — see report)', () => {
    expect(generateFriendCode('Isaac', 0)).toHaveLength(6);
  });

  it('is deterministic for the same (name, seed)', () => {
    expect(generateFriendCode('Alice', 12345)).toBe(generateFriendCode('Alice', 12345));
  });

  it('produces the locked code for a fixed (name, seed)', () => {
    // Regression snapshot of the current hash. If the hash or charset
    // changes, this trips and forces a deliberate review.
    expect(generateFriendCode('Isaac', 0)).toBe('3K2YV9');
  });

  it('only ever uses the non-ambiguous charset (no 0/O/1/I)', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(generateFriendCode('Player' + seed, seed)).toMatch(CODE_CHARSET);
    }
  });

  it('still returns a full 6-char code for an empty display name', () => {
    const code = generateFriendCode('', 0);
    expect(code).toHaveLength(6);
    expect(code).toMatch(CODE_CHARSET);
  });

  it('different seeds generally yield different codes for the same name', () => {
    expect(generateFriendCode('Bob', 1)).not.toBe(generateFriendCode('Bob', 2));
  });

  it('different names generally yield different codes for the same seed', () => {
    expect(generateFriendCode('Bob', 7)).not.toBe(generateFriendCode('Sue', 7));
  });

  it('handles a negative seed without throwing and stays in charset', () => {
    const code = generateFriendCode('Neg', -123);
    expect(code).toHaveLength(6);
    expect(code).toMatch(CODE_CHARSET);
  });

  it('handles a large seed deterministically', () => {
    expect(generateFriendCode('Big', 2_000_000_000)).toBe(
      generateFriendCode('Big', 2_000_000_000),
    );
  });
});

describe('createChallengeMessage', () => {
  const base = { fromName: 'Isaac', fromCode: 'ABC-DEF', level: 12, score: 12345, stars: 3 };

  it('includes the challenger name, level, formatted score, and friend code', () => {
    const msg = createChallengeMessage(base);
    expect(msg).toContain('Isaac challenges you!');
    expect(msg).toContain('Level 12');
    expect(msg).toContain('12,345 points'); // toLocaleString thousands separator
    expect(msg).toContain('Friend code: ABC-DEF');
  });

  it('renders one star emoji per star', () => {
    const msg = createChallengeMessage({ ...base, stars: 3 });
    const starCount = (msg.match(/⭐/g) ?? []).length;
    expect(starCount).toBe(3);
  });

  it('renders no star emoji when stars is 0 (boundary)', () => {
    const msg = createChallengeMessage({ ...base, stars: 0 });
    expect(msg).not.toContain('⭐');
  });

  it('is a multi-line string', () => {
    expect(createChallengeMessage(base).split('\n').length).toBeGreaterThan(1);
  });
});

describe('formatFriendCode', () => {
  it('inserts a dash after the third character for a 6-char code', () => {
    expect(formatFriendCode('ABCDEF')).toBe('ABC-DEF');
  });

  it('returns a 3-char code unchanged (boundary, length <= 3)', () => {
    expect(formatFriendCode('ABC')).toBe('ABC');
  });

  it('returns a 2-char code unchanged', () => {
    expect(formatFriendCode('AB')).toBe('AB');
  });

  it('returns an empty string unchanged', () => {
    expect(formatFriendCode('')).toBe('');
  });

  it('splits a 4-char code as 3 + 1', () => {
    expect(formatFriendCode('ABCD')).toBe('ABC-D');
  });
});

describe('getChallengeResult', () => {
  it('returns "win" when my score is higher', () => {
    expect(getChallengeResult(100, 50)).toBe('win');
  });

  it('returns "lose" when my score is lower', () => {
    expect(getChallengeResult(50, 100)).toBe('lose');
  });

  it('returns "tie" when scores are equal (boundary)', () => {
    expect(getChallengeResult(100, 100)).toBe('tie');
  });

  it('returns "tie" when both are 0', () => {
    expect(getChallengeResult(0, 0)).toBe('tie');
  });

  it('handles negative scores by ordinary numeric comparison', () => {
    expect(getChallengeResult(-5, -10)).toBe('win');
    expect(getChallengeResult(-10, -5)).toBe('lose');
  });
});
