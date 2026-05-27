/**
 * Endless-mode wave system.
 *
 * Block Blast / Royal Match teardown research highlighted "how far
 * can I go?" as the single strongest hook in puzzle games after the
 * core dopamine arc. Static-difficulty endless modes plateau —
 * after the player learns the optimal rhythm, the experience becomes
 * repetitive. Waves break that plateau by escalating one specific
 * difficulty axis: the color palette.
 *
 * Wave layout (palette-only escalation in V1):
 *
 *   Wave 1 (pieces 0-49):    palette 4 — gentle onboarding for new
 *                             players; chromatic clears very reachable.
 *   Wave 2 (pieces 50-99):   palette 5 — adds a fifth color; chromatic
 *                             clears now require slightly more planning.
 *   Wave 3 (pieces 100-149): palette 6 — full standard palette.
 *   Wave 4 (pieces 150-199): palette 7 — maximum palette.
 *   Wave 5+ (pieces 200+):   palette 7, saturated. The "how far can
 *                             you survive?" zone where the leaderboard
 *                             becomes the only progression metric.
 *
 * Why palette-only:
 *   - Palette is the load-bearing chromatic-clear constraint. Fewer
 *     colors = chromatic achievable; more colors = chromatic rare.
 *     Scaling palette directly scales the difficulty of the signature
 *     mechanic.
 *   - Piece pool, grid size, and pace are kept stable so the wave
 *     transitions don't feel like a different game — just a tighter
 *     version of the same game.
 *   - Pure-function design (no React, no Zustand). The whole module
 *     is one lookup table + one boundary check, trivially testable.
 */

/** Pieces between wave bumps. 50 is enough that each wave is a
 *  meaningful "chapter" but not so long the player forgets there's
 *  a progression at all. */
export const PIECES_PER_WAVE = 50;

/** Max palette size — matches COLORS.blocks.length. Hard-coded for
 *  pure-function predictability; we don't want this module to depend
 *  on the constants tree. */
export const MAX_PALETTE = 7;

/** Starting palette in wave 1. */
export const STARTING_PALETTE = 4;

export interface WaveConfig {
  /** 1-indexed wave number (wave 1 = pieces 0-49). */
  wave: number;
  /** Active palette size for this wave. */
  paletteSize: number;
}

/**
 * Compute the current wave + palette for the given piece-placed
 * count. Pure function — no time dependency, no RNG.
 *
 * Wave numbering is 1-indexed in the UI ("Wave 1", "Wave 2") so the
 * first 50 pieces are "Wave 1" not "Wave 0". The math gives wave =
 * floor(piecesPlaced / PIECES_PER_WAVE) + 1.
 *
 * Palette caps at MAX_PALETTE (no further escalation after wave 4),
 * so wave 10 plays the same difficulty as wave 4 but with the
 * higher wave number visible — a pure flex stat for the leaderboard.
 */
export function getWaveForPieces(piecesPlaced: number): WaveConfig {
  const safe = Math.max(0, piecesPlaced);
  const wave = Math.floor(safe / PIECES_PER_WAVE) + 1;
  const paletteSize = Math.min(
    STARTING_PALETTE + (wave - 1),
    MAX_PALETTE,
  );
  return { wave, paletteSize };
}

/**
 * Did we just cross a wave boundary on this turn? Used to trigger
 * the "WAVE 2 →" toast and the wave-up haptic. Boundaries fire on
 * the exact piece-count where the wave advances, so the player sees
 * the toast as they place the 50th / 100th / etc. piece.
 */
export function didCrossWaveBoundary(
  prevPiecesPlaced: number,
  newPiecesPlaced: number,
): boolean {
  if (newPiecesPlaced <= prevPiecesPlaced) return false;
  const prevWave = getWaveForPieces(prevPiecesPlaced).wave;
  const newWave = getWaveForPieces(newPiecesPlaced).wave;
  return newWave > prevWave;
}
