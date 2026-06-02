import { createPiece, getPieceSize, getPieceCells, rotatePiece, getPieceCentroid } from '../game/engine/Piece';

describe('Piece', () => {
  describe('createPiece', () => {
    it('creates a single piece', () => {
      const piece = createPiece('single', 1);
      expect(piece.cellCount).toBe(1);
      expect(piece.colorIndex).toBe(1);
      expect(piece.shape).toEqual([[true]]);
    });

    it('creates a domino', () => {
      const piece = createPiece('domino_h', 3);
      expect(piece.cellCount).toBe(2);
      expect(piece.shape).toEqual([[true, true]]);
    });

    it('creates a tetromino', () => {
      const piece = createPiece('tetra_sq', 5);
      expect(piece.cellCount).toBe(4);
      expect(piece.shape).toEqual([[true, true], [true, true]]);
    });

    it('throws for unknown piece type', () => {
      expect(() => createPiece('nonexistent' as any, 1)).toThrow('Unknown piece type');
    });
  });

  describe('getPieceSize', () => {
    it('returns correct size for domino_h', () => {
      const piece = createPiece('domino_h', 1);
      const size = getPieceSize(piece);
      expect(size).toEqual({ width: 2, height: 1 });
    });

    it('returns correct size for domino_v', () => {
      const piece = createPiece('domino_v', 1);
      const size = getPieceSize(piece);
      expect(size).toEqual({ width: 1, height: 2 });
    });

    it('returns correct size for tetra_sq', () => {
      const piece = createPiece('tetra_sq', 1);
      const size = getPieceSize(piece);
      expect(size).toEqual({ width: 2, height: 2 });
    });

    it('returns correct size for big_sq', () => {
      const piece = createPiece('big_sq', 1);
      const size = getPieceSize(piece);
      expect(size).toEqual({ width: 3, height: 3 });
    });
  });

  describe('getPieceCells', () => {
    it('returns cells for single', () => {
      const piece = createPiece('single', 1);
      const cells = getPieceCells(piece);
      expect(cells).toEqual([{ row: 0, col: 0 }]);
    });

    it('returns cells for tri_l', () => {
      // tri_l: [[true, true], [true, false]]
      const piece = createPiece('tri_l', 1);
      const cells = getPieceCells(piece);
      expect(cells).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ]);
      expect(cells).toHaveLength(3);
    });

    it('returns cells for tetra_t', () => {
      // tetra_t: [[true, true, true], [false, true, false]]
      const piece = createPiece('tetra_t', 1);
      const cells = getPieceCells(piece);
      expect(cells).toHaveLength(4);
      expect(cells).toContainEqual({ row: 0, col: 0 });
      expect(cells).toContainEqual({ row: 0, col: 1 });
      expect(cells).toContainEqual({ row: 0, col: 2 });
      expect(cells).toContainEqual({ row: 1, col: 1 });
    });
  });

  // rotatePiece is now load-bearing: game-over detection, the Hint button, and
  // the always-solvable generator all enumerate a piece's orientations by
  // calling it in a 4-iteration loop. These lock its correctness + the
  // four-turns-return-to-origin identity those loops depend on.
  describe('rotatePiece', () => {
    it('rotates a horizontal domino 90° CW into a vertical domino (color + count preserved)', () => {
      const r = rotatePiece(createPiece('domino_h', 2));
      expect(r.shape).toEqual([[true], [true]]);
      expect(r.colorIndex).toBe(2);
      expect(r.cellCount).toBe(2);
    });

    it('rotates tri_l 90° CW correctly', () => {
      // tri_l [[T,T],[T,F]] --90CW--> [[T,T],[F,T]]
      const r = rotatePiece(createPiece('tri_l', 1));
      expect(r.shape).toEqual([[true, true], [false, true]]);
    });

    it('two rotations equal a 180° flip (tri_l)', () => {
      // [[T,T],[F,T]] --90CW--> [[F,T],[T,T]]
      const r2 = rotatePiece(rotatePiece(createPiece('tri_l', 1)));
      expect(r2.shape).toEqual([[false, true], [true, true]]);
    });

    it('four 90° rotations return to the original shape (identity the engine relies on)', () => {
      const types = ['domino_h', 'tri_l', 'tetra_t', 'tetra_s', 'tetra_l', 'penta_plus', 'big_l'] as const;
      for (const type of types) {
        const p = createPiece(type, 1);
        let r = p;
        for (let i = 0; i < 4; i++) r = rotatePiece(r);
        expect(r.shape).toEqual(p.shape);
      }
    });

    it('preserves cell count across every rotation (cellCount matches actual filled cells)', () => {
      const p = createPiece('tetra_l', 3);
      let r = p;
      for (let i = 0; i < 4; i++) {
        r = rotatePiece(r);
        expect(r.cellCount).toBe(p.cellCount);
        expect(getPieceCells(r)).toHaveLength(p.cellCount);
      }
    });

    it('a square is unchanged by rotation (rotationally symmetric)', () => {
      const sq = createPiece('tetra_sq', 1);
      expect(rotatePiece(sq).shape).toEqual(sq.shape);
    });
  });

  describe('getPieceCentroid', () => {
    it('single-cell centroid is (0,0)', () => {
      expect(getPieceCentroid(createPiece('single', 1))).toEqual({ row: 0, col: 0 });
    });

    it('domino_h centroid is the midpoint of its two cells', () => {
      expect(getPieceCentroid(createPiece('domino_h', 1))).toEqual({ row: 0, col: 0.5 });
    });

    it('tri_l centroid is the average of its 3 cells', () => {
      // cells (0,0),(0,1),(1,0) -> (1/3, 1/3)
      const c = getPieceCentroid(createPiece('tri_l', 1));
      expect(c.row).toBeCloseTo(1 / 3);
      expect(c.col).toBeCloseTo(1 / 3);
    });

    it('square centroid is the geometric center (0.5, 0.5)', () => {
      expect(getPieceCentroid(createPiece('tetra_sq', 1))).toEqual({ row: 0.5, col: 0.5 });
    });
  });
});
