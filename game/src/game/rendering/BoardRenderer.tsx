/**
 * Skia-based board renderer for Block Blitz.
 * Renders the game grid with blocks, empty cells, and ghost previews.
 */

import React, { useMemo } from 'react';
import { Canvas, RoundedRect, Group, LinearGradient, vec } from '@shopify/react-native-skia';
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

export const BoardRenderer: React.FC<BoardRendererProps> = ({
  grid,
  gridSize,
  ghostCells = [],
  showGridLines = true,
}) => {
  const totalSize = gridSize * (CELL_SIZE + CELL_GAP) + CELL_GAP;

  // Build ghost cell lookup
  const ghostLookup = useMemo(() => {
    const lookup = new Map<string, number>();
    for (const cell of ghostCells) {
      lookup.set(`${cell.row},${cell.col}`, cell.colorIndex);
    }
    return lookup;
  }, [ghostCells]);

  return (
    <Canvas style={{ width: totalSize, height: totalSize }}>
      {/* Background */}
      <RoundedRect
        x={0}
        y={0}
        width={totalSize}
        height={totalSize}
        r={12}
        color={COLORS.surface}
      />

      {/* Grid cells */}
      {Array.from({ length: gridSize }, (_, row) =>
        Array.from({ length: gridSize }, (_, col) => {
          const x = CELL_GAP + col * (CELL_SIZE + CELL_GAP);
          const y = CELL_GAP + row * (CELL_SIZE + CELL_GAP);
          const cellValue = grid[row][col];
          const ghostColor = ghostLookup.get(`${row},${col}`);

          if (cellValue !== 0) {
            // Filled cell with gradient
            const baseColor = BLOCK_COLORS[cellValue - 1] || BLOCK_COLORS[0];
            return (
              <Group key={`${row}-${col}`}>
                <RoundedRect
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  r={CELL_RADIUS}
                >
                  <LinearGradient
                    start={vec(x, y)}
                    end={vec(x + CELL_SIZE, y + CELL_SIZE)}
                    colors={[lighten(baseColor, 0.2), baseColor, darken(baseColor, 0.2)]}
                  />
                </RoundedRect>
                {/* Inner highlight */}
                <RoundedRect
                  x={x + 2}
                  y={y + 2}
                  width={CELL_SIZE - 4}
                  height={CELL_SIZE / 3}
                  r={CELL_RADIUS - 1}
                  color="rgba(255, 255, 255, 0.15)"
                />
              </Group>
            );
          }

          if (ghostColor !== undefined) {
            // Ghost preview
            const ghostBaseColor = BLOCK_COLORS[ghostColor - 1] || BLOCK_COLORS[0];
            return (
              <RoundedRect
                key={`${row}-${col}`}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                r={CELL_RADIUS}
                color={`${ghostBaseColor}40`}
              />
            );
          }

          // Empty cell
          return (
            <RoundedRect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              r={CELL_RADIUS}
              color={showGridLines ? COLORS.gridEmpty : COLORS.surface}
            />
          );
        })
      )}
    </Canvas>
  );
};

// Color utility helpers
function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, rgb.r + 255 * amount),
    Math.min(255, rgb.g + 255 * amount),
    Math.min(255, rgb.b + 255 * amount)
  );
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    Math.max(0, rgb.r - 255 * amount),
    Math.max(0, rgb.g - 255 * amount),
    Math.max(0, rgb.b - 255 * amount)
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}
