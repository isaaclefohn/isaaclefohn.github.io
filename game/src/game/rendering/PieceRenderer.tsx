/**
 * Renders a single piece in the piece tray.
 * Used for display only — drag interaction is handled by the GameBoard component.
 */

import React from 'react';
import { Canvas, RoundedRect, Group, LinearGradient, vec } from '@shopify/react-native-skia';
import { Piece, getPieceSize } from '../engine/Piece';
import { COLORS, CELL_RADIUS } from '../../utils/constants';

interface PieceRendererProps {
  piece: Piece | null;
  cellSize?: number;
  gap?: number;
  selected?: boolean;
  disabled?: boolean;
}

const BLOCK_COLORS = COLORS.blocks;
const TRAY_CELL_SIZE = 28;
const TRAY_GAP = 2;

export const PieceRenderer: React.FC<PieceRendererProps> = ({
  piece,
  cellSize = TRAY_CELL_SIZE,
  gap = TRAY_GAP,
  selected = false,
  disabled = false,
}) => {
  if (!piece) {
    return null;
  }

  const { width, height } = getPieceSize(piece);
  const totalWidth = width * (cellSize + gap) + gap;
  const totalHeight = height * (cellSize + gap) + gap;
  const baseColor = BLOCK_COLORS[piece.colorIndex - 1] || BLOCK_COLORS[0];

  return (
    <Canvas
      style={{
        width: totalWidth,
        height: totalHeight,
        opacity: disabled ? 0.3 : selected ? 1 : 0.85,
      }}
    >
      {piece.shape.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const x = gap + c * (cellSize + gap);
          const y = gap + r * (cellSize + gap);
          return (
            <Group key={`${r}-${c}`}>
              <RoundedRect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                r={CELL_RADIUS * (cellSize / 40)}
              >
                <LinearGradient
                  start={vec(x, y)}
                  end={vec(x + cellSize, y + cellSize)}
                  colors={[lighten(baseColor, 0.15), baseColor]}
                />
              </RoundedRect>
              {/* Inner highlight */}
              <RoundedRect
                x={x + 1.5}
                y={y + 1.5}
                width={cellSize - 3}
                height={cellSize / 3}
                r={Math.max(1, CELL_RADIUS * (cellSize / 40) - 1)}
                color="rgba(255, 255, 255, 0.2)"
              />
            </Group>
          );
        })
      )}
    </Canvas>
  );
};

function lighten(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.min(255, parseInt(result[1], 16) + 255 * amount);
  const g = Math.min(255, parseInt(result[2], 16) + 255 * amount);
  const b = Math.min(255, parseInt(result[3], 16) + 255 * amount);
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}
