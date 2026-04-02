/**
 * Premium board renderer with 3D block effects, inner glow, and depth.
 * Uses standard React Native Views (Expo Go compatible).
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Grid } from '../engine/Board';
import { COLORS, CELL_SIZE, CELL_GAP, CELL_RADIUS } from '../../utils/constants';

interface BoardRendererProps {
  grid: Grid;
  gridSize: number;
  ghostCells?: { row: number; col: number; colorIndex: number }[];
  clearedCells?: { row: number; col: number }[];
  showGridLines?: boolean;
}

const BLOCK_COLORS = COLORS.blocks;
const BLOCK_LIGHT = COLORS.blocksLight;
const BLOCK_DARK = COLORS.blocksDark;

export const BoardRenderer: React.FC<BoardRendererProps> = ({
  grid,
  gridSize,
  ghostCells = [],
  showGridLines = true,
}) => {
  const totalSize = gridSize * (CELL_SIZE + CELL_GAP) + CELL_GAP;

  const ghostLookup = useMemo(() => {
    const lookup = new Map<string, number>();
    for (const cell of ghostCells) {
      lookup.set(`${cell.row},${cell.col}`, cell.colorIndex);
    }
    return lookup;
  }, [ghostCells]);

  return (
    <View style={[styles.board, { width: totalSize, height: totalSize }]}>
      {Array.from({ length: gridSize }, (_, row) =>
        Array.from({ length: gridSize }, (_, col) => {
          const cellValue = grid[row][col];
          const ghostColor = ghostLookup.get(`${row},${col}`);

          if (cellValue !== 0) {
            const colorIdx = cellValue - 1;
            const baseColor = BLOCK_COLORS[colorIdx] || BLOCK_COLORS[0];
            const lightColor = BLOCK_LIGHT[colorIdx] || BLOCK_LIGHT[0];
            const darkColor = BLOCK_DARK[colorIdx] || BLOCK_DARK[0];

            return (
              <View
                key={`${row}-${col}`}
                style={[
                  styles.cell,
                  {
                    left: CELL_GAP + col * (CELL_SIZE + CELL_GAP),
                    top: CELL_GAP + row * (CELL_SIZE + CELL_GAP),
                    backgroundColor: baseColor,
                    borderTopColor: lightColor,
                    borderLeftColor: lightColor,
                    borderBottomColor: darkColor,
                    borderRightColor: darkColor,
                    borderTopWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 2,
                    borderRightWidth: 2,
                    shadowColor: baseColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 4,
                  },
                ]}
              >
                {/* Top highlight shine */}
                <View style={[styles.highlight, { backgroundColor: `${lightColor}40` }]} />
                {/* Inner glow dot */}
                <View style={[styles.innerGlow, { backgroundColor: `${lightColor}30` }]} />
              </View>
            );
          }

          if (ghostColor !== undefined) {
            const ghostBase = BLOCK_COLORS[ghostColor - 1] || BLOCK_COLORS[0];
            return (
              <View
                key={`${row}-${col}`}
                style={[
                  styles.cell,
                  styles.ghostCell,
                  {
                    left: CELL_GAP + col * (CELL_SIZE + CELL_GAP),
                    top: CELL_GAP + row * (CELL_SIZE + CELL_GAP),
                    backgroundColor: `${ghostBase}25`,
                    borderColor: `${ghostBase}50`,
                    borderWidth: 1.5,
                  },
                ]}
              />
            );
          }

          // Empty cell
          return (
            <View
              key={`${row}-${col}`}
              style={[
                styles.cell,
                styles.emptyCell,
                {
                  left: CELL_GAP + col * (CELL_SIZE + CELL_GAP),
                  top: CELL_GAP + row * (CELL_SIZE + CELL_GAP),
                  backgroundColor: showGridLines ? COLORS.gridEmpty : COLORS.surface,
                },
              ]}
            />
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_RADIUS,
    overflow: 'hidden',
  },
  ghostCell: {
    borderStyle: 'dashed' as any,
  },
  emptyCell: {
    borderWidth: 0.5,
    borderColor: COLORS.gridLine,
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: 2,
    right: 2,
    height: CELL_SIZE * 0.35,
    borderTopLeftRadius: CELL_RADIUS - 2,
    borderTopRightRadius: CELL_RADIUS - 2,
    borderBottomLeftRadius: CELL_SIZE * 0.5,
    borderBottomRightRadius: CELL_SIZE * 0.5,
  },
  innerGlow: {
    position: 'absolute',
    top: CELL_SIZE * 0.2,
    left: CELL_SIZE * 0.2,
    width: CELL_SIZE * 0.6,
    height: CELL_SIZE * 0.6,
    borderRadius: CELL_SIZE * 0.3,
  },
});
