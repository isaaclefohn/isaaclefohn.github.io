/**
 * Coverage for the endless-mode wave system.
 *
 * Big swing F: difficulty escalation tied to pieces-placed. Every 50
 * pieces, the player advances to a new wave with a +1 palette
 * (capped at 7). Adds a "how far can I go?" arc beyond raw score.
 *
 * The wave math is pure and lookup-table-like, so coverage is cheap
 * and worth pinning — wave/palette mappings are the kind of constant
 * that gets tweaked carelessly during balance passes.
 */

import {
  didCrossWaveBoundary,
  getWaveForPieces,
  MAX_PALETTE,
  PIECES_PER_WAVE,
  STARTING_PALETTE,
} from '../game/levels/EndlessWaves';

describe('getWaveForPieces', () => {
  it('returns wave 1 / starting palette at 0 pieces (fresh game)', () => {
    expect(getWaveForPieces(0)).toEqual({
      wave: 1,
      paletteSize: STARTING_PALETTE,
    });
  });

  it('stays on wave 1 throughout the first 49 pieces', () => {
    expect(getWaveForPieces(1).wave).toBe(1);
    expect(getWaveForPieces(25).wave).toBe(1);
    expect(getWaveForPieces(49).wave).toBe(1);
  });

  it('advances to wave 2 exactly at piece 50', () => {
    // The boundary case. Piece 50 is the FIRST piece of wave 2 —
    // pin that off-by-one decision so a future "let's start at 51"
    // refactor is intentional.
    expect(getWaveForPieces(50).wave).toBe(2);
    expect(getWaveForPieces(50).paletteSize).toBe(STARTING_PALETTE + 1);
  });

  it('palette grows +1 per wave up to MAX_PALETTE', () => {
    expect(getWaveForPieces(0).paletteSize).toBe(4); // wave 1
    expect(getWaveForPieces(50).paletteSize).toBe(5); // wave 2
    expect(getWaveForPieces(100).paletteSize).toBe(6); // wave 3
    expect(getWaveForPieces(150).paletteSize).toBe(7); // wave 4 — max
  });

  it('palette caps at MAX_PALETTE for higher waves', () => {
    // Wave numbers keep advancing for the leaderboard flex, but the
    // palette saturates at the max color count. Wave 10 plays the
    // same difficulty as wave 4, just with a higher number visible.
    expect(getWaveForPieces(200).wave).toBe(5);
    expect(getWaveForPieces(200).paletteSize).toBe(MAX_PALETTE);
    expect(getWaveForPieces(1000).paletteSize).toBe(MAX_PALETTE);
  });

  it('treats negative input defensively (clamps to wave 1)', () => {
    // Pieces-placed shouldn't ever go negative in practice, but the
    // pure function shouldn't crash if it did.
    expect(getWaveForPieces(-10).wave).toBe(1);
    expect(getWaveForPieces(-1000).paletteSize).toBe(STARTING_PALETTE);
  });

  it('exposes PIECES_PER_WAVE as a tweakable constant', () => {
    expect(PIECES_PER_WAVE).toBe(50);
  });
});

describe('didCrossWaveBoundary', () => {
  it('returns false when piecesPlaced did not change', () => {
    expect(didCrossWaveBoundary(0, 0)).toBe(false);
    expect(didCrossWaveBoundary(75, 75)).toBe(false);
  });

  it('returns false when piecesPlaced changed but stayed in the same wave', () => {
    expect(didCrossWaveBoundary(10, 11)).toBe(false); // both wave 1
    expect(didCrossWaveBoundary(75, 99)).toBe(false); // both wave 2
  });

  it('returns true exactly when the new wave is strictly greater', () => {
    expect(didCrossWaveBoundary(49, 50)).toBe(true); // wave 1 -> 2
    expect(didCrossWaveBoundary(99, 100)).toBe(true); // wave 2 -> 3
    expect(didCrossWaveBoundary(149, 150)).toBe(true); // wave 3 -> 4
  });

  it('returns false on backwards motion (defensive)', () => {
    // piecesPlaced shouldn't decrease in practice (only on reset),
    // but the pure function should refuse to fire a "you advanced"
    // toast on a regression.
    expect(didCrossWaveBoundary(100, 50)).toBe(false);
    expect(didCrossWaveBoundary(50, 49)).toBe(false);
  });

  it('handles crossing multiple wave boundaries (defensive)', () => {
    // In normal play the player advances one piece at a time, so
    // multi-wave skips don't naturally happen. But if some future
    // power-up "skips you ahead 100 pieces" gets added, the wave
    // detection still fires (one toast for the multi-skip).
    expect(didCrossWaveBoundary(10, 200)).toBe(true);
  });
});
