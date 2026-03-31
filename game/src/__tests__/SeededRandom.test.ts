import { SeededRandom, hashSeed } from '../utils/seededRandom';

describe('SeededRandom', () => {
  it('produces deterministic sequences', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(43);

    const val1 = rng1.next();
    const val2 = rng2.next();

    expect(val1).not.toBe(val2);
  });

  it('produces values in [0, 1)', () => {
    const rng = new SeededRandom(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  describe('nextInt', () => {
    it('produces values in [min, max]', () => {
      const rng = new SeededRandom(99);
      for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('pick', () => {
    it('picks an element from the array', () => {
      const rng = new SeededRandom(42);
      const arr = ['a', 'b', 'c'];
      const picked = rng.pick(arr);
      expect(arr).toContain(picked);
    });
  });

  describe('shuffle', () => {
    it('maintains all elements', () => {
      const rng = new SeededRandom(42);
      const arr = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle([...arr]);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('is deterministic', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      const s1 = rng1.shuffle([...arr]);
      const s2 = rng2.shuffle([...arr]);
      expect(s1).toEqual(s2);
    });
  });

  describe('hashSeed', () => {
    it('produces different hashes for different level numbers', () => {
      const h1 = hashSeed(1);
      const h2 = hashSeed(2);
      expect(h1).not.toBe(h2);
    });

    it('produces consistent hashes', () => {
      expect(hashSeed(42)).toBe(hashSeed(42));
    });

    it('produces non-negative values', () => {
      for (let i = 0; i < 100; i++) {
        expect(hashSeed(i)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
