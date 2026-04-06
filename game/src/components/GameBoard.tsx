/**
 * Main game board component.
 * Composes the board renderer with gesture handling, plus animated effects overlay.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { BoardRenderer } from '../game/rendering/BoardRenderer';
import { BoardEffects } from './BoardEffects';
import { Grid, canPlace, countFilledCells, getNearClearLines } from '../game/engine/Board';
import { Piece, getPieceCells } from '../game/engine/Piece';
import { CELL_SIZE, CELL_GAP, COLORS } from '../utils/constants';
import { useSettingsStore } from '../store/settingsStore';

interface GameBoardProps {
  grid: Grid;
  gridSize: number;
  selectedPiece: Piece | null;
  ghostCells: { row: number; col: number; colorIndex: number }[];
  onCellTap: (row: number, col: number) => void;
  onBoardLayout: (x: number, y: number, width: number, height: number) => void;
  /** Cells placed this turn (for squish effect) */
  placedCells?: { row: number; col: number }[];
  /** Rows cleared this turn (for sweep effect) */
  clearedRows?: number[];
  /** Columns cleared this turn (for sweep effect) */
  clearedCols?: number[];
  /** Current combo level */
  combo?: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  gridSize,
  selectedPiece,
  ghostCells,
  onCellTap,
  onBoardLayout,
  placedCells = [],
  clearedRows = [],
  clearedCols = [],
  combo = 0,
}) => {
  const boardRef = useRef<View>(null);
  const { showGridLines } = useSettingsStore();

  const totalSize = gridSize * (CELL_SIZE + CELL_GAP) + CELL_GAP;

  // Calculate fill ratio for danger state
  const totalCells = gridSize * gridSize;
  const filledCells = countFilledCells(grid);
  const fillRatio = filledCells / totalCells;

  // Find near-clear lines
  const nearClear = useMemo(() => getNearClearLines(grid), [grid]);

  const handleLayout = useCallback((_event: LayoutChangeEvent) => {
    boardRef.current?.measureInWindow((px, py, width, height) => {
      onBoardLayout(px, py, width, height);
    });
  }, [onBoardLayout]);

  // Tap gesture for placing pieces
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (!selectedPiece) return;

      const cellTotal = CELL_SIZE + CELL_GAP;
      const col = Math.floor((event.x - CELL_GAP) / cellTotal);
      const row = Math.floor((event.y - CELL_GAP) / cellTotal);

      // Center the piece on the tapped cell
      const cells = getPieceCells(selectedPiece);
      const midRow = Math.floor(cells.length > 0 ? cells[Math.floor(cells.length / 2)].row : 0);
      const midCol = Math.floor(cells.length > 0 ? cells[Math.floor(cells.length / 2)].col : 0);
      const adjustedRow = row - midRow;
      const adjustedCol = col - midCol;

      if (canPlace(grid, selectedPiece, adjustedRow, adjustedCol)) {
        onCellTap(adjustedRow, adjustedCol);
      }
    });

  return (
    <View ref={boardRef} onLayout={handleLayout} style={styles.container}>
      {/* Outer glow frame */}
      <View style={[styles.boardGlow, { width: totalSize + 8, height: totalSize + 8 }]} />
      <GestureDetector gesture={tapGesture}>
        <View style={[styles.board, { width: totalSize, height: totalSize }]}>
          <BoardRenderer
            grid={grid}
            gridSize={gridSize}
            ghostCells={ghostCells}
            showGridLines={showGridLines}
          />
          {/* Animated effects overlay */}
          <BoardEffects
            gridSize={gridSize}
            placedCells={placedCells}
            clearedRows={clearedRows}
            clearedCols={clearedCols}
            fillRatio={fillRatio}
            combo={combo}
            nearClearRows={nearClear.rows}
            nearClearCols={nearClear.cols}
          />
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardGlow: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.accent}20`,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  board: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
});
