/**
 * Daily Puzzle — one shared seed per calendar day.
 *
 * Every player in the world sees the exact same piece sequence, on the
 * exact same grid, targeting the same score. The run ends when the
 * player can't place any of their current pieces (classic "stuck"
 * failure), at which point their score is locked in and the next
 * attempt isn't available until midnight local time. Great for a daily
 * habit loop and a weekly leaderboard race.
 *
 * The config is marked levelNumber = -2 so the rest of the engine can
 * distinguish it from regular levels (positive), endless (0), and the
 * weekly challenge (-1).
 */

import { LevelConfig } from '../engine/GameLoop';
import { PIECE_POOLS } from '../engine/Piece';
import { hashSeed } from '../../utils/seededRandom';

export const DAILY_PUZZLE_LEVEL_NUMBER = -2;

/** Fixed epoch the daily puzzle numbering counts from. 2026-01-01 is the
 *  project's shipping reference date — every puzzle from here forward gets
 *  a stable incrementing integer, so "Chroma Drop #47" means the same thing
 *  for every player on the planet regardless of their local clock offset. */
const DAILY_PUZZLE_EPOCH_ISO = '2026-01-01';

/** Grid size for the daily puzzle — slightly larger than the 8x8 standard
 *  for more breathing room on a run-until-stuck format. */
const DAILY_GRID_SIZE = 8;

/** Hard-coded score targets for the three star tiers. Tuned to feel
 *  reachable but aspirational; a pro player can routinely 3-star,
 *  while a new player should land 1★ on their first few daily runs. */
const DAILY_STAR_THRESHOLDS: [number, number, number] = [1500, 4000, 8000];

/** Return today's daily puzzle id in YYYY-MM-DD form (local timezone).
 *  Two players in different timezones can legitimately see different
 *  puzzles on the same calendar moment — by design: the daily puzzle
 *  refreshes at local midnight so it fits into each player's routine. */
export function getDailyPuzzleId(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Turn a puzzle id into a stable 32-bit seed. */
export function getDailyPuzzleSeed(id: string): number {
  // Parse YYYY-MM-DD and fold into a single integer, then hash to
  // spread the bits so nearby days produce very different piece
  // sequences.
  const [y, m, d] = id.split('-').map(n => parseInt(n, 10));
  const folded = y * 10000 + m * 100 + d;
  return hashSeed(folded, 0xC0DE_D0D0 | 0);
}

/** Build a LevelConfig for today's daily puzzle. */
export function getDailyPuzzleConfig(date: Date = new Date()): LevelConfig {
  const id = getDailyPuzzleId(date);
  const seed = getDailyPuzzleSeed(id);
  return {
    levelNumber: DAILY_PUZZLE_LEVEL_NUMBER,
    gridSize: DAILY_GRID_SIZE,
    objective: { type: 'score', target: DAILY_STAR_THRESHOLDS[2] },
    starThresholds: DAILY_STAR_THRESHOLDS,
    // Use the "medium + hard" piece mix so every shape in the library
    // (including the unorthodox pentominoes) is in rotation.
    piecePool: [...PIECE_POOLS.medium, ...PIECE_POOLS.hard],
    seed,
    // Limit the palette so a single-color (chromatic) line is achievable — the
    // daily is the most-shared surface, so the signature hook should feature here.
    paletteSize: 5,
  };
}

/** Human-readable label for UI — "Daily Puzzle · Apr 15". */
export function getDailyPuzzleLabel(date: Date = new Date()): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/** Reward tuning for completing today's daily run (by star count). */
export const DAILY_COIN_REWARDS: Record<0 | 1 | 2 | 3, number> = {
  0: 25,   // just for showing up
  1: 75,
  2: 150,
  3: 300,
};
export const DAILY_GEM_REWARD_3_STAR = 3;

/** Return the stable puzzle number for a given date: days since the epoch,
 *  +1 so the first puzzle is #1 (nicer to read than #0). Shared by every
 *  player globally. */
export function getDailyPuzzleNumber(date: Date = new Date()): number {
  const epoch = new Date(DAILY_PUZZLE_EPOCH_ISO + 'T00:00:00');
  const dayMs = 24 * 60 * 60 * 1000;
  // Use the puzzle id (local YYYY-MM-DD) re-parsed as midnight so that
  // local timezone shifts don't accidentally shove us onto the wrong
  // integer. Result is the number of calendar days elapsed + 1.
  const id = getDailyPuzzleId(date);
  const local = new Date(id + 'T00:00:00');
  return Math.max(1, Math.floor((local.getTime() - epoch.getTime()) / dayMs) + 1);
}

/** Countdown (ms) until local midnight — the moment the next puzzle unlocks. */
export function getMsUntilNextPuzzle(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

/** Format a countdown duration as "Xh Ym" / "Xm Ys" / "Xs". */
export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export interface DailyShareCardInput {
  puzzleNumber: number;
  dateLabel: string; // "Apr 15"
  stars: number;     // 0-3
  score: number;
  linesCleared: number;
  bestCombo: number;
  piecesPlaced: number;
  streak: number;
  /** Single-color line clears this run — the signature Chroma move. */
  chromaticClears: number;
  /** Fraction of the 3-star threshold the player achieved, 0-1. */
  scoreFraction: number;
}

/** Build a Wordle-style shareable result card. Intentionally spoiler-free:
 *  we share the player's RESULT, never the puzzle's piece sequence, so
 *  recipients can still try today's puzzle fresh. Plain text so it pastes
 *  cleanly into iMessage, WhatsApp, X, Discord, etc. — the same pattern
 *  that turned Wordle into a social habit.
 *
 *  Example output:
 *
 *    Chroma Drop #47 — Apr 15
 *    ⭐⭐⭐  8,420 pts
 *    🟩🟩🟩🟩🟩🟩🟩🟩🟨⬜
 *    🔥 4-day streak · 12 lines · x6 combo
 *    chromadrop.app
 */
export function buildDailyShareCard(input: DailyShareCardInput): string {
  const starBar = input.stars > 0 ? '⭐'.repeat(input.stars) : '☆';
  // Score progress bar: 10 squares, filled proportional to scoreFraction
  // capped at 1.0. Uses colored squares so the glyph count stays fixed
  // regardless of stars — Wordle's grid has a consistent width for a
  // reason (it renders predictably in every chat app).
  const FILLED = input.stars >= 3 ? '🟩' : input.stars === 2 ? '🟨' : input.stars === 1 ? '🟧' : '🟥';
  const EMPTY = '⬜';
  const filled = Math.min(10, Math.max(0, Math.round(input.scoreFraction * 10)));
  const bar = FILLED.repeat(filled) + EMPTY.repeat(10 - filled);

  const lines: string[] = [];
  lines.push(`Chroma Drop #${input.puzzleNumber} — ${input.dateLabel}`);
  lines.push(`${starBar}  ${input.score.toLocaleString()} pts`);
  lines.push(bar);

  const stats: string[] = [];
  if (input.streak > 1) stats.push(`🔥 ${input.streak}-day streak`);
  stats.push(`${input.linesCleared} lines`);
  if (input.chromaticClears > 0) stats.push(`🌈 ${input.chromaticClears} chromatic`);
  if (input.bestCombo > 1) stats.push(`x${input.bestCombo} combo`);
  lines.push(stats.join(' · '));

  lines.push('chromadrop.app');
  return lines.join('\n');
}
