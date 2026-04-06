/**
 * Game loop / turn manager for Block Blitz.
 * Manages the state machine for a single game session.
 */

import { Grid, createGrid, executePlacement } from './Board';
import { Piece, PieceType, createPiece, getPieceCells, PIECE_POOLS } from './Piece';
import { ScoreEvent, scorePlacement, scoreClear, calculateStars } from './Scoring';
import { isGameOver } from './GameOver';
import { SeededRandom } from '../../utils/seededRandom';
import { PIECES_PER_TURN, COLORS } from '../../utils/constants';

export type GameStatus = 'playing' | 'won' | 'lost' | 'paused';

export interface LevelObjective {
  type: 'score';
  target: number;
}

export interface GameState {
  grid: Grid;
  gridSize: number;
  score: number;
  combo: number;
  piecesPlaced: number;
  linesCleared: number;
  availablePieces: (Piece | null)[];
  status: GameStatus;
  level: number;
  objective: LevelObjective;
  starThresholds: [number, number, number];
  lastScoreEvent: ScoreEvent | null;
  /** Rows cleared in the last turn (for sweep animation) */
  lastClearedRows: number[];
  /** Columns cleared in the last turn (for sweep animation) */
  lastClearedCols: number[];
  /** Cells placed in the last turn (for squish animation) */
  lastPlacedCells: { row: number; col: number }[];
}

export interface LevelConfig {
  levelNumber: number;
  gridSize: number;
  objective: LevelObjective;
  piecePool: PieceType[];
  starThresholds: [number, number, number];
  seed: number;
}

/** Initialize a new game state for a given level configuration */
export function initGame(config: LevelConfig): GameState {
  const rng = new SeededRandom(config.seed);
  const grid = createGrid(config.gridSize);
  const availablePieces = generatePieceSet(rng, config.piecePool);

  return {
    grid,
    gridSize: config.gridSize,
    score: 0,
    combo: 0,
    piecesPlaced: 0,
    linesCleared: 0,
    availablePieces,
    status: 'playing',
    level: config.levelNumber,
    objective: config.objective,
    starThresholds: config.starThresholds,
    lastScoreEvent: null,
    lastClearedRows: [],
    lastClearedCols: [],
    lastPlacedCells: [],
  };
}

/** Generate a set of 3 random pieces from the pool */
export function generatePieceSet(rng: SeededRandom, pool: PieceType[]): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < PIECES_PER_TURN; i++) {
    const type = rng.pick(pool);
    const colorIndex = rng.nextInt(1, COLORS.blocks.length);
    pieces.push(createPiece(type, colorIndex));
  }
  return pieces;
}

/**
 * Process a piece placement. Returns the new game state.
 * This is the core turn function — handles placement, clearing, scoring,
 * piece regeneration, and win/loss detection.
 */
export function processTurn(
  state: GameState,
  pieceIndex: number,
  row: number,
  col: number,
  rng: SeededRandom,
  piecePool: PieceType[]
): GameState {
  const piece = state.availablePieces[pieceIndex];
  if (!piece) throw new Error(`No piece at index ${pieceIndex}`);

  // Compute placed cell positions for animation
  const pieceCells = getPieceCells(piece);
  const placedCellPositions = pieceCells.map(c => ({ row: row + c.row, col: col + c.col }));

  // Execute the placement
  const result = executePlacement(state.grid, piece, row, col);

  // Calculate score
  let scoreEvent: ScoreEvent;
  let newCombo: number;

  if (result.linesCleared > 0) {
    scoreEvent = scoreClear(result.linesCleared, result.cellsCleared, state.combo, result.perfectClear);
    newCombo = scoreEvent.combo;
  } else {
    scoreEvent = scorePlacement(piece.cellCount);
    newCombo = 0; // Reset combo when no lines cleared
  }

  const newScore = state.score + scoreEvent.points;
  const newPiecesPlaced = state.piecesPlaced + 1;
  const newLinesCleared = state.linesCleared + result.linesCleared;

  // Remove the placed piece from available pieces
  const newAvailable = [...state.availablePieces];
  newAvailable[pieceIndex] = null;

  // Check if all 3 pieces have been placed — generate new set
  const remainingPieces = newAvailable.filter((p): p is Piece => p !== null);
  if (remainingPieces.length === 0) {
    const newSet = generatePieceSet(rng, piecePool);
    // Check for game over with the new set
    const gameOver = isGameOver(result.grid, newSet);
    // Check for win
    const won = checkObjective(state.objective, newScore);

    return {
      ...state,
      grid: result.grid,
      score: newScore,
      combo: newCombo,
      piecesPlaced: newPiecesPlaced,
      linesCleared: newLinesCleared,
      availablePieces: newSet,
      status: won ? 'won' : gameOver ? 'lost' : 'playing',
      lastScoreEvent: scoreEvent,
      lastClearedRows: result.clearedRows,
      lastClearedCols: result.clearedCols,
      lastPlacedCells: placedCellPositions,
    };
  }

  // Check for game over with remaining pieces
  const gameOver = isGameOver(result.grid, remainingPieces);
  const won = checkObjective(state.objective, newScore);

  return {
    ...state,
    grid: result.grid,
    score: newScore,
    combo: newCombo,
    piecesPlaced: newPiecesPlaced,
    linesCleared: newLinesCleared,
    availablePieces: newAvailable,
    status: won ? 'won' : gameOver ? 'lost' : 'playing',
    lastScoreEvent: scoreEvent,
    lastClearedRows: result.clearedRows,
    lastClearedCols: result.clearedCols,
    lastPlacedCells: placedCellPositions,
  };
}

/** Check if the level objective has been met */
function checkObjective(objective: LevelObjective, score: number): boolean {
  switch (objective.type) {
    case 'score':
      return score >= objective.target;
    default:
      return false;
  }
}

/** Get the current star rating for the game state */
export function getCurrentStars(state: GameState): 0 | 1 | 2 | 3 {
  return calculateStars(state.score, state.starThresholds);
}
