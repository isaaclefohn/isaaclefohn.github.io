import {
  CHROMATIC_CHAPTER_LEVELS,
  CHROMATIC_CHAPTER_NAMES,
  getChapterName,
  getChapterProgress,
} from '../game/levels/Chapters';

describe('chromatic chapter metadata', () => {
  it('every level in the array has a matching themed name', () => {
    // The two structures must stay in lockstep — a level in the array
    // without a name would render as "Level N" in surfaces that look
    // it up, defeating the whole point.
    for (const level of CHROMATIC_CHAPTER_LEVELS) {
      expect(CHROMATIC_CHAPTER_NAMES[level]).toBeDefined();
    }
  });

  it('chapter names follow the "Chromatic: X" pattern', () => {
    // Brand convention. If a name slips that does not start with the
    // canonical prefix, the level select / win modal heading reads
    // inconsistently across the chapter arc.
    for (const name of Object.values(CHROMATIC_CHAPTER_NAMES)) {
      expect(name).toMatch(/^Chromatic: /);
    }
  });

  it('getChapterName returns null for non-chapter levels', () => {
    expect(getChapterName(1)).toBeNull();
    expect(getChapterName(25)).toBeNull(); // existing score boss
    expect(getChapterName(50)).toBeNull(); // existing score boss
    expect(getChapterName(31)).toBeNull(); // mid-chapter procedural
  });

  it('getChapterName returns the themed name for chromatic levels', () => {
    expect(getChapterName(30)).toBe('Chromatic: Ignition');
    expect(getChapterName(60)).toBe('Chromatic: Cascade');
    expect(getChapterName(210)).toBe('Chromatic: Singularity');
  });

  describe('getChapterProgress', () => {
    it('reports 0 cleared for a brand-new player', () => {
      expect(getChapterProgress(0)).toEqual({ cleared: 0, total: 7 });
      expect(getChapterProgress(1)).toEqual({ cleared: 0, total: 7 });
    });

    it('counts a chapter level as cleared once the player passes it', () => {
      // After clearing level 30, `highestLevel` becomes 31. Chapter 1
      // (30) is now cleared; chapters 2-7 are not.
      expect(getChapterProgress(31)).toEqual({ cleared: 1, total: 7 });
    });

    it('counts all 7 chapters once the player passes Singularity', () => {
      // Singularity is at level 210; player has cleared it when
      // highestLevel > 210 (== 211 minimum).
      expect(getChapterProgress(211)).toEqual({ cleared: 7, total: 7 });
      expect(getChapterProgress(500)).toEqual({ cleared: 7, total: 7 });
    });

    it('does not count partial progress mid-chapter', () => {
      // Mid-chapter procedural levels do not bump cleared count;
      // only crossing a chapter boundary does.
      expect(getChapterProgress(45)).toEqual({ cleared: 1, total: 7 });
      expect(getChapterProgress(75)).toEqual({ cleared: 2, total: 7 });
      expect(getChapterProgress(125)).toEqual({ cleared: 4, total: 7 });
    });
  });
});
