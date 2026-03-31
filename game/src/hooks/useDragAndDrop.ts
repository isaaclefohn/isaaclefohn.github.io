/**
 * Hook for drag-and-drop piece placement.
 * Maps gesture coordinates to grid positions and provides ghost preview.
 */

import { useState, useCallback, useRef } from 'react';
import { Piece, getPieceCells } from '../game/engine/Piece';
import { canPlace, Grid } from '../game/engine/Board';
import { CELL_SIZE, CELL_GAP } from '../utils/constants';

interface DragState {
  isDragging: boolean;
  pieceIndex: number | null;
  gridRow: number | null;
  gridCol: number | null;
  isValid: boolean;
}

interface GhostCell {
  row: number;
  col: number;
  colorIndex: number;
}

export function useDragAndDrop(grid: Grid | null, gridSize: number) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    pieceIndex: null,
    gridRow: null,
    gridCol: null,
    isValid: false,
  });

  const boardLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Set the board's screen position (called from onLayout) */
  const setBoardLayout = useCallback((x: number, y: number) => {
    boardLayoutRef.current = { x, y };
  }, []);

  /** Convert screen coordinates to grid position */
  const screenToGrid = useCallback((screenX: number, screenY: number): { row: number; col: number } => {
    const cellTotal = CELL_SIZE + CELL_GAP;
    const relX = screenX - boardLayoutRef.current.x - CELL_GAP;
    const relY = screenY - boardLayoutRef.current.y - CELL_GAP;
    return {
      col: Math.floor(relX / cellTotal),
      row: Math.floor(relY / cellTotal),
    };
  }, []);

  /** Start dragging a piece */
  const startDrag = useCallback((pieceIndex: number) => {
    setDragState({
      isDragging: true,
      pieceIndex,
      gridRow: null,
      gridCol: null,
      isValid: false,
    });
  }, []);

  /** Update drag position */
  const updateDrag = useCallback((screenX: number, screenY: number, piece: Piece) => {
    if (!grid) return;

    const { row, col } = screenToGrid(screenX, screenY);

    // Offset to center the piece on the finger
    const cells = getPieceCells(piece);
    const midRow = Math.floor(cells.length > 0 ? cells[Math.floor(cells.length / 2)].row : 0);
    const midCol = Math.floor(cells.length > 0 ? cells[Math.floor(cells.length / 2)].col : 0);
    const adjustedRow = row - midRow;
    const adjustedCol = col - midCol;

    const valid = canPlace(grid, piece, adjustedRow, adjustedCol);

    setDragState(prev => ({
      ...prev,
      gridRow: adjustedRow,
      gridCol: adjustedCol,
      isValid: valid,
    }));
  }, [grid, screenToGrid]);

  /** End drag — returns placement info if valid */
  const endDrag = useCallback((): { pieceIndex: number; row: number; col: number } | null => {
    const { pieceIndex, gridRow, gridCol, isValid } = dragState;

    setDragState({
      isDragging: false,
      pieceIndex: null,
      gridRow: null,
      gridCol: null,
      isValid: false,
    });

    if (isValid && pieceIndex !== null && gridRow !== null && gridCol !== null) {
      return { pieceIndex, row: gridRow, col: gridCol };
    }
    return null;
  }, [dragState]);

  /** Cancel drag without placing */
  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      pieceIndex: null,
      gridRow: null,
      gridCol: null,
      isValid: false,
    });
  }, []);

  /** Get ghost cells for preview rendering */
  const getGhostCells = useCallback((piece: Piece | null): GhostCell[] => {
    if (!piece || !dragState.isValid || dragState.gridRow === null || dragState.gridCol === null) {
      return [];
    }

    const cells = getPieceCells(piece);
    return cells.map(cell => ({
      row: dragState.gridRow! + cell.row,
      col: dragState.gridCol! + cell.col,
      colorIndex: piece.colorIndex,
    }));
  }, [dragState]);

  return {
    dragState,
    setBoardLayout,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    getGhostCells,
  };
}
