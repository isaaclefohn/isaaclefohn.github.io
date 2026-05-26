/**
 * Wordle-style shareable result cards for the non-daily run modes.
 * The daily puzzle already has its own card in `DailyPuzzle.ts`; this
 * file does the same for STANDARD (level mode) and ENDLESS (zen mode)
 * so every game-end has a share-worthy artifact.
 *
 * Why these matter: the Wordle template is the cheapest viral channel
 * a puzzle game can ship — a short, spoiler-safe, fixed-width grid
 * that pastes cleanly into iMessage / WhatsApp / X / Discord and
 * carries the brand mark. Every share is a free impression.
 *
 * Design constraints (mirroring the daily card):
 *   - Fixed-width visuals so the card renders predictably in every
 *     chat app — Wordle's grid is 5×6 every day for a reason.
 *   - Spoiler-safe: share the RESULT, never the input. Recipients can
 *     still attempt their own run without seeing the player's path.
 *   - Brand mark (CHROMA + chroma.game URL) on every card.
 *   - Plain text only — emoji + linebreaks. No images, no rich markup.
 */

const FOOTER_URL = 'chroma.game';

/** Map star count to the bar's filled-square color so a glance at the
 *  card communicates how well the player did. Matches the daily card. */
function barFill(stars: 0 | 1 | 2 | 3): string {
  return stars >= 3 ? '🟩' : stars === 2 ? '🟨' : stars === 1 ? '🟧' : '🟥';
}

const EMPTY = '⬜';

/** Render a 10-square progress bar filled proportional to `fraction` ∈ [0, 1].
 *  Fixed-width keeps the card consistent across all chat apps. */
function bar(fraction: number, filledGlyph: string): string {
  const filled = Math.min(10, Math.max(0, Math.round(fraction * 10)));
  return filledGlyph.repeat(filled) + EMPTY.repeat(10 - filled);
}

/** Format stat row segments (only include non-empty ones to avoid
 *  awkward leading separators). */
function statRow(parts: Array<string | null | false>): string {
  return parts.filter((p): p is string => Boolean(p)).join(' · ');
}

// ── Standard (level mode) ──────────────────────────────────────────

export interface LevelRunShareInput {
  /** Level number shown in the title. */
  levelNumber: number;
  /** World name (optional — some worlds aren't formally named). */
  worldName?: string;
  /** Earned stars (0–3). */
  stars: 0 | 1 | 2 | 3;
  /** Final score. */
  score: number;
  /** Score progress as a fraction of the 3-star threshold (capped at 1). */
  scoreFraction: number;
  /** Lines cleared in the run. */
  linesCleared: number;
  /** Best combo multiplier in the run. */
  bestCombo: number;
  /** Chromatic (single-color) clears — the brand-signature mechanic. */
  chromaticClears: number;
}

/**
 * Build a shareable card for a standard level run.
 *
 * Example output:
 *
 *   CHROMA — Level 24
 *   ⭐⭐⭐  8,420 pts
 *   🟩🟩🟩🟩🟩🟩🟩🟩🟨⬜
 *   World: Spectrum · 12 lines · 🌈 4 chromatic · x6 combo
 *   chroma.game
 */
export function buildLevelRunShareCard(input: LevelRunShareInput): string {
  const stars = Math.max(0, Math.min(3, input.stars)) as 0 | 1 | 2 | 3;
  const starBar = stars > 0 ? '⭐'.repeat(stars) : '☆';

  const lines: string[] = [];
  lines.push(`CHROMA — Level ${input.levelNumber}`);
  lines.push(`${starBar}  ${input.score.toLocaleString()} pts`);
  lines.push(bar(input.scoreFraction, barFill(stars)));

  lines.push(
    statRow([
      input.worldName ? `World: ${input.worldName}` : null,
      `${input.linesCleared} lines`,
      input.chromaticClears > 0 ? `🌈 ${input.chromaticClears} chromatic` : null,
      input.bestCombo > 1 ? `x${input.bestCombo} combo` : null,
    ]),
  );

  lines.push(FOOTER_URL);
  return lines.join('\n');
}

// ── Endless (zen mode) ─────────────────────────────────────────────

export interface EndlessRunShareInput {
  /** Final score. */
  score: number;
  /** Player's previous best score in this mode (0 if no prior runs). */
  personalBest: number;
  /** Lines cleared in the run. */
  linesCleared: number;
  /** Pieces placed in the run. */
  piecesPlaced: number;
  /** Best combo multiplier in the run. */
  bestCombo: number;
  /** Chromatic clears in the run. */
  chromaticClears: number;
}

/**
 * Build a shareable card for an endless (zen) run.
 *
 * The bar represents the player's score relative to their OWN personal
 * best — so the share becomes a self-comparison ("look how close I got"
 * or "I beat my best") rather than an arbitrary number. When the player
 * sets a new high, the bar is fully filled and the title carries 🏆 NEW BEST.
 *
 * Example outputs:
 *
 *   CHROMA — Zen Mode  🏆 NEW BEST
 *   12,450 pts
 *   🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
 *   124 lines · 🌈 8 chromatic · x9 combo
 *   chroma.game
 *
 *   CHROMA — Zen Mode
 *   3,200 / 8,100 pts
 *   🟦🟦🟦🟦⬜⬜⬜⬜⬜⬜
 *   42 lines · 🌈 2 chromatic · x4 combo
 *   chroma.game
 */
export function buildEndlessShareCard(input: EndlessRunShareInput): string {
  const isNewBest = input.score >= input.personalBest && input.score > 0;
  // First-ever run has personalBest = 0; treat that score as the new best.
  // Otherwise progress fraction is score / prevBest, capped at 1.
  const fraction = input.personalBest > 0 ? input.score / input.personalBest : 1;

  // Color choice: gold bar on a new best (achievement); blue bar otherwise
  // (zen mode = calmer palette than the level-mode star colors).
  const fill = isNewBest ? '🟨' : '🟦';

  const lines: string[] = [];
  lines.push(`CHROMA — Zen Mode${isNewBest ? '  🏆 NEW BEST' : ''}`);

  const scoreLine = isNewBest || input.personalBest === 0
    ? `${input.score.toLocaleString()} pts`
    : `${input.score.toLocaleString()} / ${input.personalBest.toLocaleString()} pts`;
  lines.push(scoreLine);

  lines.push(bar(fraction, fill));

  lines.push(
    statRow([
      `${input.linesCleared} lines`,
      input.chromaticClears > 0 ? `🌈 ${input.chromaticClears} chromatic` : null,
      input.bestCombo > 1 ? `x${input.bestCombo} combo` : null,
    ]),
  );

  lines.push(FOOTER_URL);
  return lines.join('\n');
}
