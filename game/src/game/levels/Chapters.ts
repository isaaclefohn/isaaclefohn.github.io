/**
 * Themed chapter metadata for the chromatic-objective boss arc.
 *
 * The actual level configs live in `LevelTemplates.ts` (their
 * paletteSize / starThresholds / piecePool are the gameplay shape).
 * This file is the BRAND layer on top: the named-chapter arc that
 * editorial-friendly content needs per the 2026-06 competitive intel.
 *
 * Used by:
 *   - `components/LevelPreview` → headline when picking a chromatic level
 *   - `screens/GameScreen` win modal → headline when CLEARING a chromatic level
 *   - any future "Chapter X — N of M cleared" surfaces (home, share card)
 *
 * Single source of truth: if you add a chromatic chapter level to
 * BOSS_LEVELS, also add the chapter name + index here.
 */

/** Ordered list of the chromatic chapter level numbers. Used to
 *  compute "chapter progress" — i.e., levels-cleared-so-far. */
export const CHROMATIC_CHAPTER_LEVELS: ReadonlyArray<number> = [
  30, 60, 90, 120, 155, 180, 210,
];

/** Themed name for each chromatic chapter level. Keep in lockstep with
 *  CHROMATIC_CHAPTER_LEVELS above — if the map is missing an entry for
 *  a level in the array, that level still renders as "Level N." */
export const CHROMATIC_CHAPTER_NAMES: Record<number, string> = {
  30:  'Chromatic: Ignition',
  60:  'Chromatic: Cascade',
  90:  'Chromatic: Resonance',
  120: 'Chromatic: Convergence',
  155: 'Chromatic: Saturation',
  180: 'Chromatic: Spectrum',
  210: 'Chromatic: Singularity',
};

/** Look up the themed name for a level number, or null if it is not
 *  a chromatic chapter level. */
export function getChapterName(levelNumber: number): string | null {
  return CHROMATIC_CHAPTER_NAMES[levelNumber] ?? null;
}

/**
 * Compute "N of M cleared" chapter progress for a player who has
 * reached `highestLevel`. Counts a chapter level as cleared if
 * `highestLevel > level` (i.e., they made it past it).
 *
 * Used by the win modal to display "Chapter 1 · 3 of 7 cleared"
 * after a chromatic-objective level win.
 */
export function getChapterProgress(highestLevel: number): {
  cleared: number;
  total: number;
} {
  const total = CHROMATIC_CHAPTER_LEVELS.length;
  // "highestLevel" represents the highest level the player has reached
  // (== highest completed + 1, in this codebase). A chapter level is
  // "cleared" when the player has moved past it.
  const cleared = CHROMATIC_CHAPTER_LEVELS.filter((l) => highestLevel > l).length;
  return { cleared, total };
}
