/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Produces deterministic sequences from a given seed,
 * ensuring the same level is generated every time.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a random element from an array */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /** Create a copy with the same internal state (for peeking without advancing) */
  clone(): SeededRandom {
    const copy = new SeededRandom(0);
    copy.state = this.state;
    return copy;
  }

  /** Shuffles an array in place (Fisher-Yates) */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

/** Simple hash for combining level number with a global seed */
export function hashSeed(levelNumber: number, globalSeed: number = 42): number {
  let h = globalSeed ^ levelNumber;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
