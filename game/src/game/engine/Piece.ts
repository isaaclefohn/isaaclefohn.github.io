/**
 * Piece definitions for Block Blitz.
 * Each piece is a 2D boolean matrix representing its shape.
 * The colorIndex determines the block color (1-7, maps to COLORS.blocks).
 */

export interface Piece {
  /** Unique identifier for this piece type */
  id: string;
  /** 2D shape matrix (true = filled cell) */
  shape: boolean[][];
  /** Color index (1-7) */
  colorIndex: number;
  /** Number of filled cells */
  cellCount: number;
}

export type PieceType =
  | 'single'
  | 'domino_h' | 'domino_v'
  | 'tri_h' | 'tri_v' | 'tri_l' | 'tri_l2' | 'tri_l3' | 'tri_l4'
  | 'tetra_h' | 'tetra_v' | 'tetra_s' | 'tetra_s2' | 'tetra_z' | 'tetra_z2'
  | 'tetra_t' | 'tetra_t2' | 'tetra_t3' | 'tetra_t4'
  | 'tetra_l' | 'tetra_l2' | 'tetra_l3' | 'tetra_l4'
  | 'tetra_j' | 'tetra_j2' | 'tetra_j3' | 'tetra_j4'
  | 'tetra_sq'
  | 'penta_h' | 'penta_v'
  | 'penta_plus'
  | 'big_sq'
  | 'big_l' | 'big_l2' | 'big_l3' | 'big_l4';

// Shape definitions as boolean matrices
const SHAPES: Record<string, boolean[][]> = {
  // 1-cell
  single: [[true]],

  // 2-cell (dominos)
  domino_h: [[true, true]],
  domino_v: [[true], [true]],

  // 3-cell (tris)
  tri_h: [[true, true, true]],
  tri_v: [[true], [true], [true]],
  tri_l: [[true, true], [true, false]],
  tri_l2: [[true, false], [true, true]],
  tri_l3: [[false, true], [true, true]],
  tri_l4: [[true, true], [false, true]],

  // 4-cell (tetrominos)
  tetra_h: [[true, true, true, true]],
  tetra_v: [[true], [true], [true], [true]],
  tetra_sq: [[true, true], [true, true]],
  tetra_s: [[false, true, true], [true, true, false]],
  tetra_s2: [[true, false], [true, true], [false, true]],
  tetra_z: [[true, true, false], [false, true, true]],
  tetra_z2: [[false, true], [true, true], [true, false]],
  tetra_t: [[true, true, true], [false, true, false]],
  tetra_t2: [[false, true], [true, true], [false, true]],
  tetra_t3: [[false, true, false], [true, true, true]],
  tetra_t4: [[true, false], [true, true], [true, false]],
  tetra_l: [[true, false], [true, false], [true, true]],
  tetra_l2: [[true, true, true], [true, false, false]],
  tetra_l3: [[true, true], [false, true], [false, true]],
  tetra_l4: [[false, false, true], [true, true, true]],
  tetra_j: [[false, true], [false, true], [true, true]],
  tetra_j2: [[true, false, false], [true, true, true]],
  tetra_j3: [[true, true], [true, false], [true, false]],
  tetra_j4: [[true, true, true], [false, false, true]],

  // 5-cell (pentominos)
  penta_h: [[true, true, true, true, true]],
  penta_v: [[true], [true], [true], [true], [true]],
  penta_plus: [[false, true, false], [true, true, true], [false, true, false]],

  // Big shapes
  big_sq: [[true, true, true], [true, true, true], [true, true, true]],
  big_l: [[true, false, false], [true, false, false], [true, true, true]],
  big_l2: [[true, true, true], [true, false, false], [true, false, false]],
  big_l3: [[true, true, true], [false, false, true], [false, false, true]],
  big_l4: [[false, false, true], [false, false, true], [true, true, true]],
};

/** Difficulty tiers controlling which pieces appear at each level range */
export const PIECE_POOLS: Record<string, PieceType[]> = {
  easy: ['single', 'domino_h', 'domino_v', 'tri_h', 'tri_v', 'tri_l', 'tri_l3', 'tetra_sq'],
  medium: [
    'domino_h', 'domino_v', 'tri_h', 'tri_v', 'tri_l', 'tri_l2', 'tri_l3', 'tri_l4',
    'tetra_sq', 'tetra_l', 'tetra_l2', 'tetra_j', 'tetra_j2', 'tetra_t', 'tetra_t3',
  ],
  hard: [
    'tri_l', 'tri_l2', 'tri_l3', 'tri_l4',
    'tetra_h', 'tetra_v', 'tetra_sq', 'tetra_s', 'tetra_z',
    'tetra_t', 'tetra_t2', 'tetra_t3', 'tetra_t4',
    'tetra_l', 'tetra_l2', 'tetra_l3', 'tetra_l4',
    'tetra_j', 'tetra_j2', 'tetra_j3', 'tetra_j4',
  ],
  extreme: [
    'tetra_h', 'tetra_v', 'tetra_s', 'tetra_s2', 'tetra_z', 'tetra_z2',
    'tetra_t', 'tetra_t2', 'tetra_t3', 'tetra_t4',
    'tetra_l', 'tetra_l2', 'tetra_l3', 'tetra_l4',
    'tetra_j', 'tetra_j2', 'tetra_j3', 'tetra_j4',
    'penta_h', 'penta_v', 'penta_plus',
    'big_sq', 'big_l', 'big_l2', 'big_l3', 'big_l4',
  ],
};

/** Create a Piece instance from a type and color */
export function createPiece(type: PieceType, colorIndex: number): Piece {
  const shape = SHAPES[type];
  if (!shape) throw new Error(`Unknown piece type: ${type}`);

  let cellCount = 0;
  for (const row of shape) {
    for (const cell of row) {
      if (cell) cellCount++;
    }
  }

  return {
    id: `${type}_${colorIndex}`,
    shape,
    colorIndex,
    cellCount,
  };
}

/** Get the width and height of a piece shape */
export function getPieceSize(piece: Piece): { width: number; height: number } {
  return {
    height: piece.shape.length,
    width: piece.shape[0].length,
  };
}

/** Get all filled cell positions of a piece (relative to top-left) */
export function getPieceCells(piece: Piece): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}
