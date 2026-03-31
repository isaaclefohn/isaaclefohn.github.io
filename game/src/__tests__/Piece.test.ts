import { createPiece, getPieceSize, getPieceCells } from '../game/engine/Piece';

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
});
