/**
 * Premium piece tray with glow selection, idle shimmer, animated slots, and drag-to-place.
 * Pieces have a gentle breathing pulse when idle, and a shimmer sweep on selection.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  GestureResponderEvent,
  PanResponderGestureState,
  Easing,
} from 'react-native';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { Piece } from '../game/engine/Piece';
import { GameIcon } from './GameIcon';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';

export interface DragEvent {
  pieceIndex: number;
  /** Absolute screen position */
  x: number;
  y: number;
}

interface PieceTrayProps {
  pieces: (Piece | null)[];
  selectedIndex: number | null;
  onSelectPiece: (index: number) => void;
  onDragStart?: (event: DragEvent) => void;
  onDragMove?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
}

const DRAG_THRESHOLD = 8;

const PieceSlot: React.FC<{
  piece: Piece | null;
  isSelected: boolean;
  onPress: () => void;
  index: number;
  onDragStart?: (event: DragEvent) => void;
  onDragMove?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
}> = ({ piece, isSelected, onPress, index, onDragStart, onDragMove, onDragEnd }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const idlePulse = useRef(new Animated.Value(1)).current;
  const shimmerX = useRef(new Animated.Value(-1)).current;
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Entrance bounce with stagger
  useEffect(() => {
    scaleAnim.setValue(0.3);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 6,
      delay: index * 120,
    }).start();
  }, [piece]);

  // Idle breathing pulse for available pieces
  useEffect(() => {
    if (!piece) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1.03,
          duration: 1500 + index * 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 1,
          duration: 1500 + index * 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [piece, index]);

  // Selection glow and shimmer
  useEffect(() => {
    Animated.timing(glowOpacity, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (isSelected) {
      // Shimmer sweep across the piece
      shimmerX.setValue(-1);
      Animated.loop(
        Animated.timing(shimmerX, {
          toValue: 2,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isSelected, glowOpacity, shimmerX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!piece,
      onMoveShouldSetPanResponder: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (!piece) return false;
        return (
          Math.abs(gestureState.dx) > DRAG_THRESHOLD ||
          Math.abs(gestureState.dy) > DRAG_THRESHOLD
        );
      },
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        isDraggingRef.current = false;
        startPosRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (!piece) return;
        const movedEnough =
          Math.abs(gestureState.dx) > DRAG_THRESHOLD ||
          Math.abs(gestureState.dy) > DRAG_THRESHOLD;

        if (!isDraggingRef.current && movedEnough) {
          isDraggingRef.current = true;
          onDragStart?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
        }

        if (isDraggingRef.current) {
          onDragMove?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        if (isDraggingRef.current) {
          onDragEnd?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
          isDraggingRef.current = false;
        } else {
          if (piece) {
            onPress();
          }
        }
      },
      onPanResponderTerminate: (evt: GestureResponderEvent) => {
        if (isDraggingRef.current) {
          onDragEnd?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
          isDraggingRef.current = false;
        }
      },
    })
  ).current;

  return (
    <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, idlePulse) }] }}>
      <View
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={piece ? `Piece ${index + 1}${isSelected ? ', selected' : ''}. Tap to select, drag to place.` : `Piece ${index + 1}, already placed`}
        style={[
          styles.pieceSlot,
          isSelected && styles.selectedSlot,
          !piece && styles.emptySlot,
        ]}
      >
        {/* Selection glow border */}
        {isSelected && (
          <Animated.View
            style={[
              styles.selectionGlow,
              { opacity: glowOpacity },
            ]}
          />
        )}
        {/* Shimmer overlay when selected */}
        {isSelected && piece && (
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [
                  {
                    translateX: shimmerX.interpolate({
                      inputRange: [-1, 2],
                      outputRange: [-100, 100],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        {piece ? (
          <PieceRenderer
            piece={piece}
            selected={isSelected}
            disabled={false}
          />
        ) : (
          <View style={styles.placedIndicator}>
            <GameIcon name="check" size={16} color={COLORS.success} />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  selectedIndex,
  onSelectPiece,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.trayInner}>
        {pieces.map((piece, index) => (
          <PieceSlot
            key={index}
            piece={piece}
            isSelected={selectedIndex === index}
            onPress={() => onSelectPiece(index)}
            index={index}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  trayInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    backgroundColor: `${COLORS.surface}80`,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  pieceSlot: {
    minWidth: 84,
    minHeight: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: 10,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  selectedSlot: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}10`,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  selectionGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: RADII.md + 1,
    borderWidth: 2,
    borderColor: COLORS.accentGold,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-15deg' }],
    zIndex: 10,
  },
  emptySlot: {
    opacity: 0.35,
    backgroundColor: COLORS.gridEmpty,
  },
  placedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.success}15`,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
