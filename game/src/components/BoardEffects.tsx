/**
 * Board overlay effects layer.
 * Renders animated overlays for:
 * - Placement squish (cells scale down then spring back)
 * - Line clear sweep (cells flash white sequentially)
 * - Danger border pulse (red glow when board is nearly full)
 *
 * Sits as an absolute overlay on top of the board.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { CELL_SIZE, CELL_GAP, CELL_RADIUS, COLORS } from '../utils/constants';

interface PlacedCell {
  row: number;
  col: number;
}

interface BoardEffectsProps {
  gridSize: number;
  /** Cells that were just placed this turn */
  placedCells: PlacedCell[];
  /** Rows that were just cleared */
  clearedRows: number[];
  /** Columns that were just cleared */
  clearedCols: number[];
  /** Board fill ratio (0-1) for danger state */
  fillRatio: number;
  /** Rows/cols one cell from clearing */
  nearClearRows?: number[];
  nearClearCols?: number[];
  /** Current combo level for edge glow */
  combo: number;
}

// Per-cell placement squish + settle bounce animation
const PlacementSquish: React.FC<{ cells: PlacedCell[] }> = ({ cells }) => {
  const squishAnims = useRef(cells.map(() => new Animated.Value(0))).current;
  const bounceAnims = useRef(cells.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (cells.length === 0) return;

    // Reset and stagger squish + bounce
    cells.forEach((_, i) => {
      if (squishAnims[i]) squishAnims[i].setValue(0);
      if (bounceAnims[i]) bounceAnims[i].setValue(-6); // Start slightly above

      Animated.sequence([
        Animated.delay(i * 25),
        Animated.parallel([
          // Squish: compress then spring back
          Animated.sequence([
            Animated.timing(squishAnims[i], {
              toValue: 1,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(squishAnims[i], {
              toValue: 2,
              tension: 180,
              friction: 6,
              useNativeDriver: true,
            }),
          ]),
          // Settle bounce: drop in with overshoot
          Animated.spring(bounceAnims[i], {
            toValue: 0,
            speed: 20,
            bounciness: 12,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, [cells]);

  if (cells.length === 0) return null;

  return (
    <>
      {cells.map((cell, i) => {
        const x = CELL_GAP + cell.col * (CELL_SIZE + CELL_GAP);
        const y = CELL_GAP + cell.row * (CELL_SIZE + CELL_GAP);

        const scaleY = squishAnims[i] ? squishAnims[i].interpolate({
          inputRange: [0, 1, 2],
          outputRange: [1, 0.7, 1],
        }) : 1;

        const scaleX = squishAnims[i] ? squishAnims[i].interpolate({
          inputRange: [0, 1, 2],
          outputRange: [1, 1.15, 1],
        }) : 1;

        const translateY = bounceAnims[i] ?? 0;

        return (
          <Animated.View
            key={`squish-${cell.row}-${cell.col}`}
            style={[
              styles.squishCell,
              {
                left: x,
                top: y,
                transform: [{ scaleX }, { scaleY }, { translateY }],
                backgroundColor: 'rgba(255,255,255,0.25)',
              },
            ]}
          />
        );
      })}
    </>
  );
};

// Line clear sweep: flash cells sequentially
const ClearSweep: React.FC<{ rows: number[]; cols: number[]; gridSize: number }> = ({
  rows,
  cols,
  gridSize,
}) => {
  const cellCount = rows.length * gridSize + cols.length * gridSize;
  const anims = useRef<Animated.Value[]>([]);

  // Build list of cells to animate
  const sweepCells = useMemo(() => {
    const cells: { row: number; col: number; delay: number }[] = [];
    // Row sweeps: left to right
    rows.forEach((r, ri) => {
      for (let c = 0; c < gridSize; c++) {
        cells.push({ row: r, col: c, delay: ri * 40 + c * 30 });
      }
    });
    // Column sweeps: top to bottom
    cols.forEach((c, ci) => {
      for (let r = 0; r < gridSize; r++) {
        // Only add if not already in a row sweep
        if (!rows.includes(r)) {
          cells.push({ row: r, col: c, delay: (rows.length + ci) * 40 + r * 30 });
        }
      }
    });
    return cells;
  }, [rows, cols, gridSize]);

  // Create anim values for each cell
  if (anims.current.length !== sweepCells.length) {
    anims.current = sweepCells.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    if (sweepCells.length === 0) return;

    const animations = sweepCells.map((cell, i) => {
      anims.current[i].setValue(0);
      return Animated.sequence([
        Animated.delay(cell.delay),
        Animated.timing(anims.current[i], {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(anims.current[i], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start();
  }, [rows, cols]);

  if (sweepCells.length === 0) return null;

  return (
    <>
      {sweepCells.map((cell, i) => {
        const x = CELL_GAP + cell.col * (CELL_SIZE + CELL_GAP);
        const y = CELL_GAP + cell.row * (CELL_SIZE + CELL_GAP);

        return (
          <Animated.View
            key={`sweep-${cell.row}-${cell.col}`}
            style={[
              styles.sweepCell,
              {
                left: x,
                top: y,
                opacity: anims.current[i],
              },
            ]}
          />
        );
      })}
    </>
  );
};

// Danger border pulse
const DangerBorder: React.FC<{ fillRatio: number; gridSize: number }> = ({
  fillRatio,
  gridSize,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const totalSize = gridSize * (CELL_SIZE + CELL_GAP) + CELL_GAP;
  const isDanger = fillRatio >= 0.7;
  const isCritical = fillRatio >= 0.85;

  useEffect(() => {
    if (!isDanger) {
      pulseAnim.setValue(0);
      return;
    }

    const speed = isCritical ? 400 : 800;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: speed,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: speed,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isDanger, isCritical]);

  if (!isDanger) return null;

  const maxOpacity = isCritical ? 0.6 : 0.3;

  return (
    <Animated.View
      style={[
        styles.dangerBorder,
        {
          width: totalSize + 6,
          height: totalSize + 6,
          borderColor: COLORS.danger,
          opacity: pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.15, maxOpacity],
          }),
        },
      ]}
    />
  );
};

// Combo edge glow
const ComboGlow: React.FC<{ combo: number; gridSize: number }> = ({ combo, gridSize }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const totalSize = gridSize * (CELL_SIZE + CELL_GAP) + CELL_GAP;

  useEffect(() => {
    if (combo < 2) {
      glowAnim.setValue(0);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [combo]);

  if (combo < 2) return null;

  const glowColor = combo >= 4 ? COLORS.accentGold : COLORS.accent;
  const intensity = Math.min(combo * 0.12, 0.6);

  return (
    <Animated.View
      style={[
        styles.comboGlow,
        {
          width: totalSize + 10,
          height: totalSize + 10,
          borderColor: glowColor,
          shadowColor: glowColor,
          opacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [intensity * 0.5, intensity],
          }),
        },
      ]}
    />
  );
};

/** Subtle pulsing highlight on rows/cols one cell from clearing */
const NearClearHint: React.FC<{ rows: number[]; cols: number[]; gridSize: number }> = ({ rows, cols, gridSize }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rows.length === 0 && cols.length === 0) {
      pulse.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [rows.length, cols.length, pulse]);

  if (rows.length === 0 && cols.length === 0) return null;

  const cellTotal = CELL_SIZE + CELL_GAP;
  const totalSize = gridSize * cellTotal + CELL_GAP;
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.2] });

  return (
    <>
      {rows.map((r) => (
        <Animated.View
          key={`nr-${r}`}
          style={{
            position: 'absolute',
            top: CELL_GAP + r * cellTotal - 1,
            left: CELL_GAP,
            width: totalSize - CELL_GAP * 2,
            height: CELL_SIZE + 2,
            borderRadius: CELL_RADIUS,
            backgroundColor: COLORS.accentGold,
            opacity,
          }}
        />
      ))}
      {cols.map((c) => (
        <Animated.View
          key={`nc-${c}`}
          style={{
            position: 'absolute',
            left: CELL_GAP + c * cellTotal - 1,
            top: CELL_GAP,
            height: totalSize - CELL_GAP * 2,
            width: CELL_SIZE + 2,
            borderRadius: CELL_RADIUS,
            backgroundColor: COLORS.accentGold,
            opacity,
          }}
        />
      ))}
    </>
  );
};

export const BoardEffects: React.FC<BoardEffectsProps> = ({
  gridSize,
  placedCells,
  clearedRows,
  clearedCols,
  fillRatio,
  combo,
  nearClearRows = [],
  nearClearCols = [],
}) => {
  const { reducedMotion } = useSettingsStore();
  const totalSize = gridSize * (CELL_SIZE + CELL_GAP) + CELL_GAP;

  if (reducedMotion) return null;

  return (
    <View style={[styles.container, { width: totalSize, height: totalSize }]} pointerEvents="none">
      <NearClearHint rows={nearClearRows} cols={nearClearCols} gridSize={gridSize} />
      <PlacementSquish cells={placedCells} />
      <ClearSweep rows={clearedRows} cols={clearedCols} gridSize={gridSize} />
      <DangerBorder fillRatio={fillRatio} gridSize={gridSize} />
      <ComboGlow combo={combo} gridSize={gridSize} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
  },
  squishCell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_RADIUS,
  },
  sweepCell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  dangerBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    borderRadius: 16,
    borderWidth: 2.5,
  },
  comboGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    borderRadius: 18,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
});
