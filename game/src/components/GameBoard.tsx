/**
 * Main game board component.
 * Composes the board renderer with gesture handling, plus animated effects overlay.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { BoardRenderer } from '../game/rendering/BoardRenderer';
import { BoardEffects } from './BoardEffects';
import { Grid, canPlace, countFilledCells, getNearClearLines, getNearChromaticLines } from '../game/engine/Board';
import { Piece, getPieceCentroid } from '../game/engine/Piece';
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

  // Find near-clear lines, and the subset that are near-CHROMATIC (one matching
  // color from a single-color clear). A near-chromatic line is shown in its own
  // color; we exclude it from the generic gold hint so each line reads as one
  // thing: gold = "almost a clear", colored = "almost a chromatic clear".
  const nearClear = useMemo(() => getNearClearLines(grid), [grid]);
  const nearChromatic = useMemo(() => getNearChromaticLines(grid), [grid]);
  const genericNearClear = useMemo(() => {
    const chromaRows = new Set(nearChromatic.rows.map((r) => r.index));
    const chromaCols = new Set(nearChromatic.cols.map((c) => c.index));
    return {
      rows: nearClear.rows.filter((r) => !chromaRows.has(r)),
      cols: nearClear.cols.filter((c) => !chromaCols.has(c)),
    };
  }, [nearClear, nearChromatic]);

  const handleLayout = useCallback((_event: LayoutChangeEvent) => {
    boardRef.current?.measureInWindow((px, py, width, height) => {
      onBoardLayout(px, py, width, height);
    });
  }, [onBoardLayout]);

  // Tap gesture for placing pieces. We anchor the piece on the filled-cell
  // CENTROID (not the middle index of the cell list or the bbox corner) so
  // unorthodox shapes — S/Z/L/T tetrominoes, pentominoes — land centred on
  // the tapped cell the way the user expects.
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (!selectedPiece) return;

      const cellTotal = CELL_SIZE + CELL_GAP;
      const col = Math.floor((event.x - CELL_GAP) / cellTotal);
      const row = Math.floor((event.y - CELL_GAP) / cellTotal);

      const centroid = getPieceCentroid(selectedPiece);
      const adjustedRow = row - Math.round(centroid.row);
      const adjustedCol = col - Math.round(centroid.col);

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
            nearClearRows={genericNearClear.rows}
            nearClearCols={genericNearClear.cols}
            nearChromaticRows={nearChromatic.rows}
            nearChromaticCols={nearChromatic.cols}
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
