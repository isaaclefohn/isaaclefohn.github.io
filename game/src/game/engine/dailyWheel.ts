/**
 * Daily reward wheel — the variance layer on top of the deterministic 7-day
 * calendar. Players see 4 tiles BEFORE the spin (3 common + 1 rare jackpot)
 * so anticipation builds — they don't know which they'll land on, but they
 * can SEE the jackpot exists. Per the dopamine research, the visible-before-
 * tap structure is what makes the variance feel "lucky" rather than random.
 *
 * Layered on top of (not replacing) the calendar `DAILY_REWARDS`. Players
 * claim → calendar reward credited immediately → wheel spins for the bonus.
 *
 * Tunable constants:
 *   - `RARE_TILE_INDEX`: which slot holds the jackpot. Fixed at 3 so players
 *     LEARN "I want to land there"; the variance is in the roll, not the
 *     layout — keeps the anticipation focused.
 *   - `RARE_WEIGHT`: probability of hitting the jackpot. 10% gives the player
 *     a "jackpot day" roughly weekly — frequent enough to anticipate, rare
 *     enough to surprise.
 */

export interface WheelTile {
  /** Stable identifier for the tile's reward shape. */
  readonly kind: 'coins' | 'gems' | 'powerup' | 'jackpot';
  /** Display label (short — fits in a small tile). */
  readonly label: string;
  /** Coin payout. */
  readonly coins: number;
  /** Gem payout (0 if none). */
  readonly gems: number;
  /** Power-up granted (null if none). */
  readonly powerUp: 'bomb' | 'rowClear' | 'colorClear' | null;
  /** Rarity tier — drives visual styling (rare tile glows gold etc). */
  readonly rarity: 'common' | 'rare';
}

/** Wheel always has 4 tiles. The rare jackpot sits at this fixed position so
 *  players visually anchor "that's the one I want." Variance comes from the
 *  roll, not the layout. */
export const RARE_TILE_INDEX = 3;

/** Jackpot probability — 1-in-10 = roughly weekly jackpot for a daily player. */
export const RARE_WEIGHT = 0.10;

/** A small power-up rotation so the "power-up" tile is not always the same. */
const POWERUP_ROTATION: Array<'bomb' | 'rowClear' | 'colorClear'> = [
  'bomb',
  'rowClear',
  'colorClear',
];

/**
 * Build today's 4-tile wheel layout. Deterministic per day number so the
 * player sees the SAME tiles before and after spinning — only the LANDING
 * position is random.
 *
 * Tile 0: coins (common)
 * Tile 1: gems (common)
 * Tile 2: power-up (common, rotates by day)
 * Tile 3: JACKPOT (rare) — big coins + gems + power-up
 */
export function getDailyTiles(dayNumber: number): WheelTile[] {
  const powerUp = POWERUP_ROTATION[dayNumber % POWERUP_ROTATION.length];
  return [
    { kind: 'coins',   label: '+15',    coins: 15,  gems: 0, powerUp: null,    rarity: 'common' },
    { kind: 'gems',    label: '+3 💎',  coins: 0,   gems: 3, powerUp: null,    rarity: 'common' },
    { kind: 'powerup', label: '+1 ⚡',  coins: 0,   gems: 0, powerUp,          rarity: 'common' },
    { kind: 'jackpot', label: 'JACKPOT', coins: 100, gems: 5, powerUp,          rarity: 'rare' },
  ];
}

export interface WheelRollResult {
  /** Index in the tile array (0-3) the wheel landed on. */
  index: number;
  /** The tile itself — the actual reward payload. */
  tile: WheelTile;
}

/**
 * Roll the wheel — picks one of the 4 tiles weighted by rarity. The rare
 * tile takes `RARE_WEIGHT` probability; the rest is split equally across the
 * 3 common tiles.
 *
 * @param tiles  The 4 wheel tiles (typically from getDailyTiles).
 * @param rng    Injectable RNG returning [0, 1). Defaults to Math.random;
 *               tests pass a deterministic function.
 */
export function rollWheel(
  tiles: WheelTile[],
  rng: () => number = Math.random,
): WheelRollResult {
  const r = rng();
  // The rare bucket is the first slice of [0, 1); common is the remaining.
  if (r < RARE_WEIGHT) {
    return { index: RARE_TILE_INDEX, tile: tiles[RARE_TILE_INDEX] };
  }
  // Map the remaining range across the 3 common tiles uniformly.
  const commonR = (r - RARE_WEIGHT) / (1 - RARE_WEIGHT);
  const commonIndex = Math.min(2, Math.floor(commonR * 3));
  return { index: commonIndex, tile: tiles[commonIndex] };
}
